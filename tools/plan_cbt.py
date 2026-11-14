#!/usr/bin/env python3
"""Pick the questions for new CBT tests and write them into content/cbt-plans/<subject>.json.

  python3 tools/plan_cbt.py physics      # NEET PYQ chapter tests (chapters grouped to 30-45 questions)
  python3 tools/plan_cbt.py chemistry    # chemistry-bank chapter tests (physical: kept from its plan.json;
                                         #   organic + inorganic: new) and NEET PYQ chapter tests
  python3 tools/plan_cbt.py mock         # full NEET mocks: 180 Q (Physics 45, Chemistry 45, Biology 90), 180 min
  add --replan to throw away a plan file's tests and pick again (only while no test of it is deployed)

Once a test is in a plan its questions and their order never change (attempts refer to question numbers);
a run only adds tests that are missing. tools/make_cbt.py then turns the plans into test files.
Selection rules (owner, Nov 2026): ~1 min per question, +4/-1, first test of every chapter free; current NEET
syllabus only (no dropped_2024; old-NCERT topics such as p-Block are in the syllabus and are allowed); questions
spread over the chapter's NCERT paragraphs and over easy/medium/hard; mocks spread over chapters by NEET weightage
(share of NEET PYQs 2015-2026 per chapter in the bank) and over difficulties.
"""
import argparse, collections, hashlib, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_cbt as mk  # noqa: E402

ROOT = mk.ROOT
SIZE_MIN, SIZE_MAX, SIZE_AIM = 30, 45, 38
MOCKS = 5
MOCK_SPLIT = {"physics": 45, "chemistry": 45, "biology": 90}
MIX = {1: 0.35, 2: 0.45, 3: 0.20}          # target easy / medium / hard share in a mock section
PHY_ORDER = ["phy11-%02d" % i for i in range(1, 15)] + ["phy12-01", "phy12-02", "phy12-03", "phy12-lab-experimental-skills"] + \
            ["phy12-%02d" % i for i in range(4, 15)]
CHEM_PYQ_ORDER = ["chem11-01", "chem11-02", "chem11-03", "chem11-04", "chem11-thermodynamics", "chem11-06", "chem11-07",
                  "chem11-old-p-block", "chem11-08", "chem11-09",
                  "chem12-01", "chem12-02", "chem12-03", "chem12-04", "chem12-05", "chem12-old-p-block",
                  "chem12-06", "chem12-07", "chem12-08", "chem12-09", "chem12-10", "chem12-lab-practical-chemistry"]
BANK_CHAPTERS = {"organic": ["chem11-08", "chem11-09", "chem12-06", "chem12-07", "chem12-08", "chem12-09", "chem12-10"],
                 "inorganic": ["chem11-03", "chem11-04", "chem12-04", "chem12-05"]}
BANK_ORDER = ["chem11-01", "chem11-02", "chem11-03", "chem11-04", "chem11-05", "chem11-06", "chem11-07", "chem11-08", "chem11-09",
              "chem12-01", "chem12-02", "chem12-03", "chem12-04", "chem12-05", "chem12-06", "chem12-07", "chem12-08", "chem12-09", "chem12-10"]


def h(s):
    return hashlib.sha1(s.encode()).hexdigest()


def load(path, default):
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else default


def save(path, plan):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)
        f.write("\n")


def fake_test(allow_old=True):
    return {"allowOldNcert": allow_old}


def site_pool(site, chapters, exam="NEET", sources=("PYQ",)):
    """Usable neet-site questions per chapter (passes every make_cbt rule for a test that allows old-NCERT)."""
    pool = collections.defaultdict(list)
    for qid, (b, q) in site[0].items():
        if b["chapter"] not in chapters or q["source"]["kind"] not in sources:
            continue
        if q["source"]["kind"] == "PYQ" and q["source"].get("exam") != exam:
            continue
        if mk.site_problems(b, q, fake_test()):
            continue
        pool[b["chapter"]].append(q)
    return pool


def para_key(q):
    p = (q["ncert"]["paras"] or ["~"])[0]
    return tuple((0, int(x), "") if x.isdigit() else (1, 0, x) for x in p.replace("-", ".").split("."))


def deal(qs, k):
    """Split questions into k tests that each get every paragraph and difficulty in turn (like dealing cards)."""
    qs = sorted(qs, key=lambda q: (para_key(q), q["difficulty"], q["id"]))
    out = [[] for _ in range(k)]
    for i, q in enumerate(qs):
        out[i % k].append(q)
    return out


def group_chapters(order, counts):
    """Consecutive chapters of one class -> tests of 30-45 questions (DP, sizes closest to 38); a chapter over 45
    gets its own tests. If a class cannot be split that way the bounds widen a little (30-46, then 25-46, ...)."""
    out = []
    for cls in ("11", "12"):
        seq = [c for c in order if counts.get(c) and c.split("-")[0].endswith(cls)]
        if seq:
            out += _group(seq, counts)
    return out


def _group(seq, counts):
    for lo, hi in ((SIZE_MIN, SIZE_MAX), (SIZE_MIN, SIZE_MAX + 1), (25, SIZE_MAX + 1), (20, 50), (1, 99)):
        best = {0: (0, [])}
        for j in range(1, len(seq) + 1):
            cand = []
            for i in range(j):
                s = sum(counts[c] for c in seq[i:j])
                if i in best and (lo <= s <= hi or (j - i == 1 and s > hi)):
                    cand.append((best[i][0] + (s - SIZE_AIM) ** 2, best[i][1] + [seq[i:j]]))
            if cand:
                best[j] = min(cand)
        if len(seq) in best:
            return best[len(seq)][1]
    sys.exit("could not group chapters into tests")


def order_in_test(qs, order):
    return sorted(qs, key=lambda q: (q["difficulty"], order.index(q["ncert"]["chapter"]) if q["ncert"]["chapter"] in order else 99, para_key(q), q["id"]))


def title_of(chs, titles, word_en, word_hi):
    return {"en": " + ".join(titles[c]["en"] for c in chs) + " · " + word_en,
            "hi": " + ".join(titles[c]["hi"] for c in chs) + " · " + word_hi}


def per_chapter(order, counts, least=15):
    """One test per chapter; a chapter with fewer than `least` questions joins its neighbour in the same class."""
    groups = []
    for c in [c for c in order if counts.get(c)]:
        cls = c.split("-")[0][-2:]
        if groups and counts[c] < least and groups[-1][0].split("-")[0][-2:] == cls:
            groups[-1].append(c)
        elif groups and sum(counts[x] for x in groups[-1]) < least and groups[-1][0].split("-")[0][-2:] == cls:
            groups[-1].append(c)
        else:
            groups.append([c])
    return groups


def pyq_tests(pool, order, titles, prefix, subject_word, grouping=None):
    counts = {c: len(pool[c]) for c in order}
    tests = []
    for grp in (grouping or group_chapters)(order, counts):
        qs = [q for c in grp for q in pool[c]]
        k = 1 if len(qs) <= SIZE_MAX + 1 else -(-len(qs) // SIZE_MAX)
        for n, part in enumerate(deal(qs, k), 1):
            part = order_in_test(part, order)
            slug = (grp[0] if len(grp) == 1 else grp[0] + "-" + grp[-1].split("-", 1)[1]) + f"-pyq{n}"
            word_en, word_hi = ("NEET PYQ Test" + (f" {n}" if k > 1 else ""), "NEET PYQ परीक्षा" + (f" {n}" if k > 1 else ""))
            t = {"slug": slug, "kind": "pyq", "chapters": grp, "title": title_of(grp, titles, word_en, word_hi),
                 "free": n == 1, "durationMin": len(part), "marking": {"right": 4, "wrong": -1}, "ids": [q["id"] for q in part]}
            if any(q.get("ncert_status") == "old_ncert_only" for q in part):
                t["allowOldNcert"] = True
            tests.append(t)
    return tests


# ---------- physics ----------
def plan_physics(site, titles, replan):
    path = os.path.join(mk.PLANS, "physics.json")
    plan = load(path, None)
    if plan and not replan:
        print("physics.json exists: nothing to add (use --replan before deployment to pick again)"); return
    pool = site_pool(site, PHY_ORDER)
    tests = pyq_tests(pool, PHY_ORDER, titles, "phy", "Physics")
    plan = {"subject": "physics", "exam": "neet-phy", "product": "neet-phy-chapter", "sortBase": 2000,
            "note": "NEET PYQ chapter tests (chapters with few PYQs grouped to 30-45 questions). Built by tools/plan_cbt.py.",
            "tests": tests}
    save(path, plan)
    print(f"physics.json: {len(tests)} tests, {sum(len(t['ids']) for t in tests)} questions; sizes {[len(t['ids']) for t in tests]}")


# ---------- chemistry ----------
def plan_chemistry(site, chem, titles, replan):
    path = os.path.join(mk.PLANS, "chemistry.json")
    plan = load(path, None)
    if plan and not replan:
        print("chemistry.json exists: nothing to add (use --replan before deployment)"); return
    if not chem.ok:
        sys.exit("chemistry plan needs the chemistry bank (--chem-bank)")
    cb = chem.cb
    nid = lambda bank_id: chem.by_bank_id[bank_id]["chapter"] + "-" + h(bank_id)[:8]
    tests = []
    # 1. physical chemistry: the 27 tests already planned in chemistry-bank cbt/plan.json (same questions, same order)
    old = json.load(open(os.path.join(chem.dir, "cbt", "plan.json"), encoding="utf-8"))["tests"]
    used = set()
    for t in old:
        ch = t["chapter"]; c = chem.topic_hi["chapters"][ch]
        tests.append({"slug": t["slug"], "kind": "chapter", "branch": "physical", "chapter": mk.SITE_CHAPTER.get(ch, ch),
                      "title": {"en": f"{c['en']} · Chapter Test {t['n']}", "hi": f"{c['hi']} · अध्याय परीक्षा {t['n']}"},
                      "free": t["n"] == 1, "product": "neet-chem-physical", "durationMin": len(t["ids"]),
                      "marking": {"right": 4, "wrong": -1}, "sortOrder": cb.PHYSICAL.index(ch) * 100 + t["n"],
                      "ids": [nid(i) for i in t["ids"]]})
        used |= set(t["ids"])
    # 2. organic and inorganic: same splitting as the physical tests (chemistry-bank plan_chapter)
    for branch, chs in BANK_CHAPTERS.items():
        for ch in chs:
            pool = [b for b in chem.bank if b["chapter"] == ch and cb.usable(b) and b["id"] not in used]
            if len(pool) < cb.MIN_SIZE:
                print(f"{ch}: only {len(pool)} usable questions, no test"); continue
            for t in cb.plan_chapter(pool, chapter=ch):
                tt = titles[mk.SITE_CHAPTER.get(ch, ch)]
                tests.append({"slug": t["slug"], "kind": "chapter", "branch": branch, "chapter": ch,
                              "title": {"en": f"{tt['en']} · Chapter Test {t['n']}", "hi": f"{tt['hi']} · अध्याय परीक्षा {t['n']}"},
                              "free": t["n"] == 1, "product": f"neet-chem-{branch}", "durationMin": len(t["ids"]),
                              "marking": {"right": 4, "wrong": -1}, "sortOrder": 1000 + BANK_ORDER.index(ch) * 100 + t["n"],
                              "ids": [nid(i) for i in t["ids"]]})
                used |= set(t["ids"])
    # 3. NEET PYQ chapter tests from the neet-site bank
    pool = site_pool(site, CHEM_PYQ_ORDER)
    # one test per chapter (each chapter already has its bank chapter tests); tiny chapters join a neighbour
    for k, t in enumerate(pyq_tests(pool, CHEM_PYQ_ORDER, titles, "chem", "Chemistry", per_chapter)):
        t["sortOrder"] = 3000 + k
        tests.append(t)
    plan = {"subject": "chemistry", "exam": "neet-chem", "product": "neet-chem-pyq",
            "note": "Chapter tests from chemistry-bank (physical = its cbt/plan.json; organic, inorganic) and NEET PYQ chapter tests. Built by tools/plan_cbt.py.",
            "tests": tests}
    save(path, plan)
    kinds = collections.Counter((t["kind"], t.get("branch")) for t in tests)
    print(f"chemistry.json: {len(tests)} tests ({dict(kinds)}), {sum(len(t['ids']) for t in tests)} questions")


# ---------- mocks ----------
def weights(site, subject):
    """NEET weightage: each chapter's share of the bank's NEET PYQs 2015-2026 on the current syllabus."""
    w = collections.Counter()
    for qid, (b, q) in site[0].items():
        if b["subject"] == subject and q["source"].get("exam") == "NEET" and q.get("syllabus_status") != "dropped_2024":
            w[b["chapter"]] += 1
    return w


def quotas(w, total, avail, rot):
    tot = sum(w.values())
    raw = {c: total * w[c] / tot for c in w}
    q = {c: int(raw[c]) for c in w}
    rest = sorted(w, key=lambda c: (-(raw[c] - q[c]), h(c + str(rot))))
    for c in rest[: total - sum(q.values())]:
        q[c] += 1
    # a chapter without enough questions left hands its quota to the heaviest chapters that still have some
    short = 0
    for c in q:
        if q[c] > avail.get(c, 0):
            short += q[c] - avail.get(c, 0); q[c] = avail.get(c, 0)
    for c in sorted(w, key=lambda c: -w[c]) * 3:
        if not short:
            break
        if avail.get(c, 0) > q[c]:
            q[c] += 1; short -= 1
    return q


def pick(pool, n, need, rot, target):
    """n questions from a chapter pool, preferring the difficulty the section still needs most; spread over paragraphs."""
    out, seen_para = [], collections.Counter()
    cand = sorted(pool, key=lambda x: h(x["id"] + str(rot)))
    for _ in range(n):
        best = max(cand, key=lambda x: (need[x["d"]] / max(1, target[x["d"]]), -seen_para[x["p"]], h(x["id"] + str(rot))))
        cand.remove(best); out.append(best); need[best["d"]] -= 1; seen_para[best["p"]] += 1
    return out


def plan_mock(site, chem, titles, replan):
    path = os.path.join(mk.PLANS, "mock.json")
    plan = load(path, None)
    if plan and not replan:
        print("mock.json exists: nothing to add (use --replan before deployment)"); return
    cat_order = list(titles)                       # catalog order: Physics, Chemistry, Biology; Class 11 then 12
    pools = {}
    for subj in MOCK_SPLIT:
        chs = [c for c in cat_order if c.startswith({"physics": "phy", "chemistry": "chem", "biology": "bio"}[subj])]
        sp = site_pool(site, chs, sources=("PYQ", "NCERT Exercise", "NCERT Exemplar", "AI") if subj == "biology" else ("PYQ",))
        pool = collections.defaultdict(list)
        for c, qs in sp.items():
            for q in qs:
                pool[c].append({"id": q["id"], "d": mk.diff3(q["difficulty"]), "p": (q["ncert"]["paras"] or ["-"])[0], "c": c})
        if subj == "chemistry" and chem.ok:      # the owner's own questions join the PYQs
            for nid, x in chem.by_id.items():
                if chem.problems(x, fake_test()):
                    continue
                c = mk.SITE_CHAPTER.get(x["chapter"], x["chapter"])
                pool[c].append({"id": nid, "d": x["difficulty"], "p": (x.get("paras") or ["-"])[0], "c": c})
        pools[subj] = pool
    used = set()
    tests = []
    for m in range(1, MOCKS + 1):
        secs = []
        for subj, total in MOCK_SPLIT.items():
            w = weights(site, subj)
            w = collections.Counter({c: v for c, v in w.items() if pools[subj].get(c)})
            avail = {c: sum(1 for x in pools[subj][c] if x["id"] not in used) for c in w}
            q = quotas(w, total, avail, m)
            # aim at MIX, but never take more of a difficulty than its fair share of what is left for the
            # remaining mocks (physics has few hard PYQs: every mock gets some instead of the first ones all)
            left = collections.Counter(x["d"] for c in w for x in pools[subj][c] if x["id"] not in used)
            need = collections.Counter({d: min(round(total * s), left[d] // (MOCKS - m + 1)) for d, s in MIX.items()})
            need[2] += total - sum(need.values())
            target = collections.Counter(need)
            chosen = []
            for c in sorted(q, key=lambda c: cat_order.index(c)):
                if q[c]:
                    got = pick([x for x in pools[subj][c] if x["id"] not in used], q[c], need, m, target)
                    chosen += got; used |= {x["id"] for x in got}
            if len(chosen) != total:
                sys.exit(f"mock {m} {subj}: only {len(chosen)} of {total} questions")
            secs.append({"id": subj[:3], "name": {"en": mk.SUBJ_EN[subj], "hi": mk.SUBJ_HI[subj]}, "ids": [x["id"] for x in chosen]})
        tests.append({"slug": f"neet-mock-{m:02d}", "kind": "mock", "title": {"en": f"NEET Full Mock Test {m}", "hi": f"NEET पूर्ण मॉक टेस्ट {m}"},
                      "subtitle": {"en": "Physics 45 · Chemistry 45 · Biology 90 · 180 questions · 180 min · +4 / −1",
                                   "hi": "भौतिकी 45 · रसायन विज्ञान 45 · जीव विज्ञान 90 · 180 प्रश्न · 180 मिनट · +4 / −1"},
                      "free": m == 1, "durationMin": 180, "marking": {"right": 4, "wrong": -1}, "allowOldNcert": True,
                      "sortOrder": m, "sections": secs})
    plan = {"subject": "full", "exam": "neet-full", "product": "neet-full-mock",
            "note": "Full NEET mocks (180 Q, 180 min). Chapter shares follow NEET weightage (NEET PYQs 2015-2026 per chapter); "
                    "easy/medium/hard aimed at 35/45/20 %. No question repeats across mocks. Built by tools/plan_cbt.py.",
            "tests": tests}
    save(path, plan)
    print(f"mock.json: {len(tests)} mocks")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("what", nargs="+", choices=["physics", "chemistry", "mock"])
    ap.add_argument("--replan", action="store_true")
    ap.add_argument("--chem-bank", default=os.path.join(ROOT, "..", "chemistry-bank"))
    a = ap.parse_args()
    os.makedirs(mk.PLANS, exist_ok=True)
    site = mk.load_site_bank()
    titles = mk.catalog_titles()
    chem = mk.ChemBank(a.chem_bank)
    for w in a.what:
        {"physics": plan_physics, "chemistry": plan_chemistry, "mock": plan_mock}[w](
            site, *((chem,) if w != "physics" else ()), titles, a.replan)


if __name__ == "__main__":
    main()
