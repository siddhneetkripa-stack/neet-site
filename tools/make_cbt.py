#!/usr/bin/env python3
"""CBT test files from the question banks: content/cbt-plans/<subject>.json -> neet-sources/cbt/tests/<slug>.json.

  python3 tools/make_cbt.py                      # all plans; writes to ../neet-sources/cbt/tests
  python3 tools/make_cbt.py physics mock         # only these plan files
  python3 tools/make_cbt.py --check              # build and check everything, write nothing

A plan fixes WHICH questions are in each test and in what order (students' attempts refer to question numbers);
every run re-reads the banks, so a corrected stem, key, solution or Hindi line reaches the test files, and the
engine re-marks submitted attempts when a key changes. New tests are added to a plan by tools/plan_cbt.py.

Plan file:
  {"subject": "physics", "exam": "neet-phy", "product": "neet-phy-chapter",
   "tests": [{"slug", "kind": "chapter|pyq|mock", "chapter" (or "chapters": [...]), "title": {"en","hi"},
              "free": true, "durationMin": 45, "marking": {"right": 4, "wrong": -1},
              "ids": [...]                                    # or, for mocks:
              "sections": [{"id", "name": {"en","hi"}, "ids": [...]}],
              "allowOldNcert": false}]}
Question ids: a neet-site bank id (content/questions/*.json), or a chemistry-bank question as "<chapter>-<8 hex>"
(the neutral id the chemistry-bank CBT builder gives it: sha1 of its bank id). The chemistry bank is read from
../chemistry-bank (private, Musafir2507/chemistry-bank); --chem-bank sets another path.

Safety (same rules as build.py's build_test): a test may not contain a dropped_2024 question; old_ncert_only
questions only with "allowOldNcert": true. Also refused: diagram questions without a figure, questions without a
worked solution or without Hindi text, bonus questions (no single right answer), and student text with an
institute/teacher name or source tag.

Output files contain answer keys: they go only to the private neet-sources repo, never to this public repo.
"""
import argparse, collections, glob, hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANS = os.path.join(ROOT, "content", "cbt-plans")
SUBJ_HI = {"physics": "भौतिकी", "chemistry": "रसायन विज्ञान", "biology": "जीव विज्ञान", "full": "पूर्ण NEET"}
EXAM = {"physics": "neet-phy", "chemistry": "neet-chem", "biology": "neet-bio", "full": "neet-full"}
SORT_BASE = {"full": 0, "chemistry": 0, "physics": 2000, "biology": 4000}
SUBJ_EN = {"physics": "Physics", "chemistry": "Chemistry", "biology": "Biology", "full": "Full NEET"}
# chemistry-bank chapter ids that differ from the site's chapter ids
SITE_CHAPTER = {"chem11-05": "chem11-thermodynamics"}
BANNED = re.compile(r"\bGCI\b|Gurukripa|Bakliwal|Vimal|\bVKC\b|\bALLEN\b|Allen Career|Aakash|Resonance Edu|Motion Edu|"
                    r"Test[_ ]Paper|Physical_Chemistry|(?i:esaral|byju)")
ERRATA = re.compile(r"<p class=['\"]errata['\"]>.*?</p>", re.S)   # editorial notes on paper copies: site pages only
NUMERIC_OPTS = re.compile(r"\d")


def die(msg):
    sys.exit("make_cbt: " + msg)


# ---------- neet-site bank ----------
def load_site_bank():
    qs, chapters = {}, {}
    for f in sorted(glob.glob(os.path.join(ROOT, "content", "questions", "*.json"))):
        b = json.load(open(f, encoding="utf-8"))
        chapters[b["chapter"]] = b
        for q in b["questions"]:
            qs[q["id"]] = (b, q)
    return qs, chapters


def catalog_titles():
    cat = json.load(open(os.path.join(ROOT, "content", "catalog.json"), encoding="utf-8"))
    out = {}
    def walk(o):
        if isinstance(o, dict):
            if "id" in o and "title" in o and isinstance(o["title"], str):
                out[o["id"]] = {"en": o["title"], "hi": o.get("hi") or o["title"]}
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(cat)
    return out


def bonus(q):
    r = json.dumps(q.get("review", {}), ensure_ascii=False)
    return bool(re.search(r"\bbonus\b", r, re.I)) or len(set(q["answer"].get("alsoAccepted", [])) | {q["answer"].get("index")}) >= 4


def site_problems(b, q, test):
    """Reasons a neet-site bank question may not go into this test (empty list = fine)."""
    out = []
    if q.get("syllabus_status") == "dropped_2024":
        out.append("dropped_2024 (NEET removed this topic in 2024)")
    if q.get("ncert_status") == "old_ncert_only" and not test.get("allowOldNcert"):
        out.append('old_ncert_only (needs "allowOldNcert": true)')
    if q["type"] == "diagram" and not q.get("media"):
        out.append("needs a figure that is not drawn yet")
    if not q["text"]["en"].get("sol"):
        out.append("no worked solution")
    if q["text"]["hi"]["status"] in ("missing", "placeholder") or not q["text"]["hi"].get("q"):
        out.append("no Hindi text")
    if q["answer"]["kind"] == "single" and bonus(q):
        out.append("bonus question (no single right answer)")
    if q.get("status") == "flagged":
        out.append("flagged")
    for L in ("en", "hi"):
        t = q["text"][L]
        blob = " ".join([t.get("q", "")] + t.get("o", []) + [ERRATA.sub("", t.get(k, "")) for k in ("sol", "hint", "trap")])
        if BANNED.search(blob):
            out.append(f"source/copy name in the {L} text ({BANNED.search(blob).group(0)}); reword the solution first")
            break
    return out


def diff3(d):
    """Site scale (1-5, used 2/3/4) -> test files' 1 easy / 2 medium / 3 hard."""
    return 1 if d <= 2 else 2 if d == 3 else 3


def nature(q):
    if q["answer"]["kind"] == "numeric":
        return "numerical"
    opts = " ".join(re.sub(r"<[^>]+>", "", o) for o in q["text"]["en"].get("o", []))
    sol = q["text"]["en"].get("sol", "")
    return "numerical" if len(NUMERIC_OPTS.findall(opts)) >= 4 and sol.count("=") >= 2 else "conceptual"


FORMAT = {"single": "single_correct", "diagram": "single_correct", "numerical": "numerical", "statement": "statement",
          "assertion-reason": "assertion_reason", "match": "match_list"}


def src_label(q):
    s = q["source"]
    if s["kind"] == "PYQ":
        return {"en": f"{s['exam']} {s['year']}", "hi": f"{s['exam']} {s['year']}"}
    lab = {"NCERT Exercise": ("NCERT Exercise", "NCERT अभ्यास"), "NCERT Exemplar": ("NCERT Exemplar", "NCERT एग्ज़ेम्प्लर")}.get(s["kind"])
    return {"en": lab[0], "hi": lab[1]} if lab else None


def site_question(b, q):
    pt = {p["id"]: p for p in b["paragraphs"]}
    paras = q["ncert"]["paras"]
    titles = [{"en": pt[p]["title"] if p in pt else p, "hi": (pt[p].get("hi") or pt[p]["title"]) if p in pt else p} for p in paras]
    ch = b["chapter"]
    topic = titles[0] if titles else None
    if not topic:   # old-NCERT chapters: the chapter (or the old section) is the topic
        t = b["title"]
        topic = {"en": q["ncert"].get("oldRef") or t["en"], "hi": t.get("hi") or t["en"]}
    def lang(L):
        t = q["text"][L]
        o = {"status": t["status"], "q": t["q"]}
        if q["answer"]["kind"] == "single":
            o["o"] = list(t["o"])
        for k in ("sol", "hint", "trap"):
            v = ERRATA.sub("", t.get(k) or "").strip()
            if v:
                o[k] = v
        return o
    out = {
        "id": q["id"], "type": "numeric" if q["answer"]["kind"] == "numeric" else "single",
        "chapter": ch, "topic": topic, "paras": paras, "paraTitles": titles,
        "format": FORMAT[q["type"]], "nature": nature(q), "difficulty": diff3(q["difficulty"]),
        "text": {"en": lang("en"), "hi": lang("hi")},
        "answer": dict(q["answer"]),
    }
    if q.get("ncert_status") and q["ncert_status"] != "in_ncert":
        out["ncert_status"] = q["ncert_status"]
    s = src_label(q)
    if s:
        out["source"] = s
    return out


# ---------- chemistry bank (private) ----------
class ChemBank:
    def __init__(self, path):
        self.dir = os.path.join(path, "Question_Bank_Structured")
        if not os.path.exists(os.path.join(self.dir, "bank.jsonl")):
            self.ok = False
            return
        self.ok = True
        # chemistry-bank's own builder (cbt/make_cbt.py): same text clean-up, topics and option balancing.
        # Loaded under another name: this file is also called make_cbt.
        import importlib.util
        cbt_dir = os.path.join(self.dir, "cbt")
        sys.path.insert(0, cbt_dir)          # for its "from clean import ..."
        spec = importlib.util.spec_from_file_location("chembank_make_cbt", os.path.join(cbt_dir, "make_cbt.py"))
        cb = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cb)
        self.cb = cb
        self.bank = cb.load_bank()
        self.by_bank_id = {x["id"]: x for x in self.bank}
        self.by_id = {}
        for x in self.bank:
            nid = x["chapter"] + "-" + hashlib.sha1(x["id"].encode()).hexdigest()[:8]
            if nid in self.by_id:
                die(f"chemistry-bank id clash: {nid}")
            self.by_id[nid] = x
        tax = json.load(open(os.path.join(self.dir, "taxonomy", "chemistry.json"), encoding="utf-8"))
        neet_paras = json.load(open(os.path.join(ROOT, "content", "ncert", "chemistry-paragraphs.json"), encoding="utf-8"))
        self.topic_hi = json.load(open(os.path.join(self.dir, "cbt", "topic_hi.json"), encoding="utf-8"))
        self.titles = cb.para_titles((neet_paras, self.topic_hi, tax))

    def problems(self, x, test):
        out = []
        if not x["syllabus"].get("neet_2026") or x["chapter"].startswith("x-") or any(p.startswith("x-") for p in x.get("paras") or []):
            out.append("dropped_2024 / outside the NEET syllabus")
        if x.get("in_ncert") is False and not test.get("allowOldNcert"):
            out.append('old_ncert_only (needs "allowOldNcert": true)')
        if not self.cb.usable(x):
            out.append("not usable (status, figure or text problem in chemistry-bank)")
        return out

    def question(self, x):
        q = self.cb.question(x, self.titles, self.topic_hi["general"])
        ch = SITE_CHAPTER.get(x["chapter"], x["chapter"])
        tt = self.titles[x["chapter"]]
        q["chapter"] = ch
        q["paraTitles"] = [{"en": self.cb.short_en(tt[p]["en"]), "hi": tt[p]["hi"] or self.cb.short_en(tt[p]["en"])} if p in tt
                           else {"en": p, "hi": p} for p in q["paras"]]
        return q


# ---------- building ----------
def check_text(q, slug):
    for lang in ("en", "hi"):
        blob = json.dumps(q["text"][lang], ensure_ascii=False)
        m = BANNED.search(blob)
        if m:
            die(f"{slug} {q['id']}: source tag or name in student text ({lang}): {m.group(0)}")


def build(plan, test, site, chem, titles, order):
    slug = test["slug"]
    secs = test.get("sections") or [{"id": "A", "name": {"en": SUBJ_EN[plan["subject"]], "hi": SUBJ_HI[plan["subject"]]}, "ids": test["ids"]}]
    qs, errs, section_meta = [], [], []
    for sec in secs:
        sq, chem_part = [], []
        for i in sec["ids"]:
            if i in site[0]:
                b, q = site[0][i]
                bad = site_problems(b, q, test)
                if bad:
                    errs.append(f"{i}: {'; '.join(bad)}")
                    continue
                sq.append(site_question(b, q))
            elif chem and chem.ok and i in chem.by_id:
                x = chem.by_id[i]
                bad = chem.problems(x, test)
                if bad:
                    errs.append(f"{i}: {'; '.join(bad)}")
                    continue
                cq = chem.question(x)
                sq.append(cq); chem_part.append(cq)
            elif chem is None or not chem.ok:
                die(f"{slug}: {i} is not in the neet-site bank and the chemistry bank is not available (--chem-bank)")
            else:
                errs.append(f"{i}: not in any bank")
        if chem_part:   # spread the key over (1)-(4) where the options may move (chemistry-bank rule)
            chem.cb.balance(chem_part, chem.by_bank_id)
        for q in sq:
            q["section"] = sec["id"]
            check_text(q, slug)
        qs += sq
        section_meta.append({"id": sec["id"], "name": sec["name"], "count": len(sq)})
    if errs:
        die(f"{slug}: {len(errs)} question(s) may not be in this test:\n  " + "\n  ".join(errs[:20]))
    ids = [q["id"] for q in qs]
    dup = [i for i, n in collections.Counter(ids).items() if n > 1]
    if dup:
        die(f"{slug}: repeated questions {dup[:5]}")
    n = len(qs)
    m = test.get("marking", {"right": 4, "wrong": -1})
    dur = test.get("durationMin", n)
    free = bool(test.get("free"))
    subj = plan["subject"]
    chapters = test.get("chapters") or ([test["chapter"]] if test.get("chapter") else sorted({q["chapter"] for q in qs}))
    wrong = str(m["wrong"]).replace("-", "−")
    sub_en = test.get("subtitle", {}).get("en") or f"{SUBJ_EN[subj]} · NEET pattern · {n} questions · {dur} min · +{m['right']} / {wrong}"
    sub_hi = test.get("subtitle", {}).get("hi") or f"{SUBJ_HI[subj]} · NEET पैटर्न · {n} प्रश्न · {dur} मिनट · +{m['right']} / {wrong}"
    out = {
        "slug": slug, "exam": plan.get("exam") or EXAM[subj], "subject": subj, "kind": test.get("kind", "chapter"),
        "branch": test.get("branch"), "chapter": chapters[0] if len(chapters) == 1 else None, "chapters": chapters,
        "title": test["title"], "subtitle": {"en": sub_en, "hi": sub_hi},
        "access": "free" if free else "paid", "product": None if free else (test.get("product") or plan.get("product")),
        "status": "live" if free else "draft", "duration_min": dur,
        "marking": {"correct": m["right"], "wrong": m["wrong"], "blank": 0},
        "reveal": "submit", "rules": {"markNextSavesAnswer": True}, "sort_order": order,
        "sections": section_meta, "questions": qs,
    }
    if test.get("allowOldNcert"):
        out["allowOldNcert"] = True
    return out


def summary_row(t):
    qs = t["questions"]
    keys = collections.Counter("abcd"[q["answer"]["index"]] for q in qs if q["answer"]["kind"] == "single")
    d = collections.Counter(q["difficulty"] for q in qs)
    hi = sum(1 for q in qs if q["text"]["hi"]["status"] not in ("missing", "placeholder"))
    return (f"| {t['slug']} | {t['kind']} | {t['access']} | {len(qs)} | {t['duration_min']} | {len(t['chapters'])} | "
            f"{d[1]}/{d[2]}/{d[3]} | {' '.join(f'{k}{keys[k]}' for k in 'abcd')} | {hi} |")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plans", nargs="*", help="plan names (physics, chemistry, mock, …); default: all")
    ap.add_argument("--out", default=os.path.join(ROOT, "..", "neet-sources", "cbt", "tests"))
    ap.add_argument("--chem-bank", default=os.path.join(ROOT, "..", "chemistry-bank"))
    ap.add_argument("--check", action="store_true", help="build and check, write nothing")
    a = ap.parse_args()

    files = sorted(glob.glob(os.path.join(PLANS, "*.json")))
    if a.plans:
        files = [os.path.join(PLANS, p + ".json") for p in a.plans]
    site = load_site_bank()
    titles = catalog_titles()
    chem = ChemBank(a.chem_bank)
    if not chem.ok:
        print(f"  (chemistry bank not found at {a.chem_bank}: plans that use it will stop)")
    built, slugs = [], set()
    for f in files:
        plan = json.load(open(f, encoding="utf-8"))
        if not isinstance(plan, dict) or "tests" not in plan or "subject" not in plan:
            continue   # not a plan (e.g. biology-tags.json)
        for k, t in enumerate(plan["tests"]):
            if t["slug"] in slugs:
                die(f"slug used twice: {t['slug']}")
            slugs.add(t["slug"])
            order = t.get("sortOrder", plan.get("sortBase", SORT_BASE.get(plan["subject"], 0)) + k + 1)
            built.append(build(plan, t, site, chem, titles, order))
        print(f"{os.path.basename(f)}: {len(plan['tests'])} tests, {sum(len(t['questions']) for t in built[-len(plan['tests']):]) if plan['tests'] else 0} questions")
    if a.check:
        print(f"check passed: {len(built)} tests")
        return
    os.makedirs(a.out, exist_ok=True)
    for t in built:
        with open(os.path.join(a.out, t["slug"] + ".json"), "w", encoding="utf-8") as fh:
            json.dump(t, fh, ensure_ascii=False, indent=1)
    stale = sorted(set(os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(a.out, "*.json"))) - slugs)
    if stale and not a.plans:
        print(f"  note: {len(stale)} file(s) in {a.out} are in no plan: {', '.join(stale[:10])}")
    if not a.plans:
        rows = "\n".join(summary_row(t) for t in built)
        with open(os.path.join(a.out, "..", "TESTS.md"), "w", encoding="utf-8") as fh:
            fh.write("# CBT tests (built by neet-site tools/make_cbt.py from content/cbt-plans/)\n\n"
                     "Easy/Med/Hard: 1/2/3 scale. Key spread: how often (a)–(d) is the answer. Hindi: questions with Hindi text (draft).\n\n"
                     "| Test | Kind | Access | Qs | Min | Chapters | Easy/Med/Hard | Key spread | Hindi |\n|---|---|---|---|---|---|---|---|---|\n" + rows + "\n")
    print(f"wrote {len(built)} tests to {os.path.normpath(a.out)}")


if __name__ == "__main__":
    main()
