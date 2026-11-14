#!/usr/bin/env python3
"""Merge chapter section files from content/<chapter>/ into data/<chapter>.json.

Usage:  python3 tools/build.py
Checks: unique node ids, every question has 4 options and a valid answer index.
Also builds PYQ pages: content/pyq/<chapter>.json -> data/pyq/<chapter>.json
(checks options/answers, that every NCERT excerpt image exists, and sections are in NCERT order).
Question bank: content/questions/<chapter>.json is validated against docs/question-schema.json
(needs the `jsonschema` package; otherwise only the built-in checks run) and copied to data/questions/.
Tests: content/tests/<id>.json pick questions from the bank -> data/tests/<id>.json + data/tests/index.json.
"""
import json, os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content")
DATA = os.path.join(ROOT, "data")

# Questions adapted from NCERT exercises, matched by the start of the question text.
NCERT_SRC = {
    "A thermodynamic state function is a quantity": "NCERT Ex 5.1",
    "For a process to occur under adiabatic conditions": "NCERT Ex 5.2",
    "The enthalpies of all elements in their standard": "NCERT Ex 5.3",
    "For CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l), ΔU = −X": "NCERT Ex 5.4",
    "No work is done on a system but heat q is taken out": "NCERT Problem 5.1",
}

def walk(node, depth, seen, stats, chapter_id):
    nid = node.get("id")
    if not nid or nid in seen:
        sys.exit(f"Duplicate or missing id: {nid}")
    seen.add(nid)
    stats["nodes"] += 1
    for i, q in enumerate(node.get("questions", [])):
        if len(q["o"]) != 4 or not (0 <= q["a"] < 4):
            sys.exit(f"Bad question in {nid}: {q['q'][:50]}")
        q["id"] = f"{nid}-q{i+1}"
        for prefix, src in NCERT_SRC.items():
            if q["q"].startswith(prefix):
                q.setdefault("src", src)
        q.setdefault("src", "Practice")
        q.setdefault("pyq", [])  # fill with e.g. ["NEET 2021"] once verified
        stats["questions"] += 1
    for c in node.get("children", []):
        walk(c, depth + 1, seen, stats, chapter_id)

def build_chapter(folder):
    meta_path = os.path.join(folder, "chapter.json")
    meta = json.load(open(meta_path, encoding="utf-8"))
    sections = []
    for f in sorted(glob.glob(os.path.join(folder, "[0-9]*.json"))):
        sections.extend(json.load(open(f, encoding="utf-8")))
    root = dict(meta)
    root["children"] = sections
    seen, stats = set(), {"nodes": 0, "questions": 0}
    walk(root, 0, seen, stats, meta["id"])
    root["stats"] = stats
    out = os.path.join(DATA, meta["id"] + ".json")
    json.dump(root, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{meta['id']}: {stats['nodes']} nodes, {stats['questions']} questions -> {os.path.relpath(out, ROOT)}")
    return meta, stats

LATEST_NEET = 0  # latest NEET year found in the content; set in main()
RECENT_YEARS = 3  # "recent" flag = asked in the last 3 NEET papers


def para_trends(items):
    """items: (exam, year, paras) for previous-year questions only (NCERT Exercise/Exemplar/Practice are left out).
    Returns {paragraph id: {neet, jee, last, years, recent}} for the recent-trend markers on paragraph pages."""
    out = {}
    for exam, year, paras in items:
        if exam not in ("NEET", "JEE Main") or not year:
            continue
        for pid in dict.fromkeys(paras):
            t = out.setdefault(pid, {"neet": 0, "jee": 0, "years": set()})
            t["neet" if exam == "NEET" else "jee"] += 1
            if exam == "NEET":
                t["years"].add(int(year))
    for t in out.values():
        ys = sorted(t["years"], reverse=True)
        t["years"] = ys
        t["last"] = ys[0] if ys else None
        t["recent"] = bool(ys) and ys[0] > LATEST_NEET - RECENT_YEARS
    return out


def build_pyq(path):
    """content/pyq/<ch>.json has an ordered `paragraphs` list (NCERT order) and `questions`, each with
    `paras` (paragraph ids it tests). One paragraph -> that paragraph's section; two or more -> the
    'Multiple concepts' section at the end. MCQs have 4 options `o` + index `a`; numerical questions
    have `type: "num"`, a numeric `ans` and optional `tol`."""
    doc = json.load(open(path, encoding="utf-8"))
    ch = doc["chapter"]
    img_dir = os.path.join(ROOT, "assets", "ncert", ch)
    order = {p["id"]: i for i, p in enumerate(doc["paragraphs"])}
    exam_rank = {"NEET": 0, "JEE Main": 1, "NCERT Exercise": 2, "NCERT Exemplar": 3, "Practice": 4}
    groups = {p["id"]: [] for p in doc["paragraphs"]}
    multi = []
    for i, q in enumerate(doc["questions"]):
        tag = f"{ch} PYQ {q.get('exam')} {q.get('year')} {q.get('srcRef','')}"
        if q.get("exam") not in exam_rank:
            sys.exit(f"{tag}: exam must be one of {list(exam_rank)}")
        need = ("year",) if q["exam"] in ("NEET", "JEE Main") else ()
        for field in need + ("q", "sol", "hint", "ncert", "paras"):
            if not q.get(field):
                sys.exit(f"{tag}: missing {field}")
        if q.get("type") == "num":
            if not isinstance(q.get("ans"), (int, float)):
                sys.exit(f"{tag}: numerical question needs numeric ans")
        elif len(q.get("o", [])) != 4 or not (0 <= q.get("a", -1) < 4):
            sys.exit(f"{tag}: MCQ needs 4 options and a valid answer index")
        for pid in q["paras"]:
            if pid not in order:
                sys.exit(f"{tag}: unknown paragraph {pid}")
        q["paras"] = sorted(dict.fromkeys(q["paras"]), key=order.get)
        for x in q["ncert"]:
            if not os.path.exists(os.path.join(img_dir, x["img"] + ".webp")):
                sys.exit(f"{tag}: missing excerpt image {x['img']}.webp")
        (multi if len(q["paras"]) > 1 or q.get("otherChapters") else groups[q["paras"][0]]).append(q)
    sort_key = lambda q: (exam_rank[q["exam"]], str(q.get("date", q.get("year", ""))), q.get("srcRef", ""))
    sections = []
    for p in doc["paragraphs"]:
        if groups[p["id"]]:
            sections.append(dict(sec=p["id"], title=p["title"], pages=p["pages"], questions=sorted(groups[p["id"]], key=sort_key)))
    if multi:
        multi.sort(key=lambda q: ([order[x] for x in q["paras"]], sort_key(q)))
        sections.append(dict(sec="multi", title="Multiple concepts", pages=[], questions=multi))
    n = 0
    for s in sections:
        for q in s["questions"]:
            n += 1
            q["id"] = f"pyq-{ch}-{re.sub(r'[^a-z]+', '', q['exam'].lower())}-{q.get('year', 0)}-{n}"
    out = {k: v for k, v in doc.items() if k != "questions"}
    out["sections"] = sections
    out["counts"] = {e: sum(1 for q in doc["questions"] if q["exam"] == e) for e in exam_rank}
    out["empty"] = [p for p in doc["paragraphs"] if not groups[p["id"]] and not any(p["id"] in q["paras"] for q in multi)]
    out["trends"] = para_trends((q["exam"], q.get("year"), q["paras"]) for q in doc["questions"])
    out["latestNeet"], out["recentYears"] = LATEST_NEET, RECENT_YEARS
    os.makedirs(os.path.join(DATA, "pyq"), exist_ok=True)
    json.dump(out, open(os.path.join(DATA, "pyq", ch + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{ch}: {n} PYQs {out['counts']} in {len(sections)} sections ({len(multi)} multi-concept) -> data/pyq/{ch}.json")
    return ch, n

def check_bank(path):
    bank = json.load(open(path, encoding="utf-8"))
    ch = bank["chapter"]
    try:
        import jsonschema
        schema = json.load(open(os.path.join(ROOT, "docs", "question-schema.json"), encoding="utf-8"))
        errs = sorted(jsonschema.Draft202012Validator(schema).iter_errors(bank), key=lambda e: list(e.path))
        if errs:
            for e in errs[:10]:
                print(f"  {'/'.join(map(str, e.path))}: {e.message[:200]}")
            sys.exit(f"{os.path.relpath(path, ROOT)}: {len(errs)} schema errors")
    except ImportError:
        print("  (jsonschema not installed: schema check skipped; pip install jsonschema)")
    paras = {p["id"] for p in bank["paragraphs"]}
    seen = set()
    for q in bank["questions"]:
        tag = f"{ch} {q['id']}"
        if q["id"] in seen or not q["id"].startswith(ch + "-"):
            sys.exit(f"{tag}: duplicate id, or id does not start with the chapter id")
        seen.add(q["id"])
        if (q["type"] == "numerical") != (q["answer"]["kind"] == "numeric"):
            sys.exit(f"{tag}: type and answer kind disagree")
        for lang in ("en", "hi"):
            t = q["text"][lang]
            if t["status"] in ("draft", "checked", "proofread") and q["answer"]["kind"] == "single" and len(t.get("o", [])) != 4:
                sys.exit(f"{tag}: {lang} text needs 4 options")
        if q["status"] == "live" and q["text"]["en"]["status"] in ("missing", "placeholder"):
            sys.exit(f"{tag}: live question without English text")
        for pid in q["ncert"]["paras"]:
            if q["ncert"]["chapter"] == ch and pid not in paras:
                sys.exit(f"{tag}: unknown paragraph {pid}")
        for x in q["ncert"].get("lines", []):
            if x.get("img") and not os.path.exists(os.path.join(ROOT, "assets", "ncert", q["ncert"]["chapter"], x["img"] + ".webp")):
                sys.exit(f"{tag}: missing excerpt image {x['img']}.webp")
    os.makedirs(os.path.join(DATA, "questions"), exist_ok=True)
    bank = dict(bank)
    bank["paraTrends"] = para_trends((q["source"].get("exam"), q["source"].get("year"), q["ncert"]["paras"])
                                     for q in bank["questions"] if q["source"]["kind"] == "PYQ" and q["ncert"]["chapter"] == ch)
    bank["latestNeet"], bank["recentYears"] = LATEST_NEET, RECENT_YEARS
    json.dump(bank, open(os.path.join(DATA, "questions", ch + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    hi = sum(1 for q in bank["questions"] if q["text"]["hi"]["status"] not in ("missing", "placeholder"))
    print(f"{ch}: bank OK, {len(bank['questions'])} questions ({hi} with Hindi) -> data/questions/{ch}.json")
    return ch, bank


PAGE_EXAM = {"NCERT Exercise": "NCERT Exercise", "NCERT Exemplar": "NCERT Exemplar", "AI": "Practice", "Own": "Practice"}
HI_READY = ("draft", "checked", "proofread")


def page_question(q):
    """One bank question -> the PYQ page's question format (English fields + Hindi fields when Hindi exists)."""
    en, hi, src, ans = q["text"]["en"], q["text"]["hi"], q["source"], q["answer"]
    exam = src.get("exam") if src["kind"] == "PYQ" else PAGE_EXAM.get(src["kind"], "Practice")
    p = {"id": q["id"], "exam": exam, "q": en["q"], "sol": en["sol"], "hint": en.get("hint", ""),
         "paras": list(q["ncert"].get("paras", [])), "status": q["status"]}
    if src["kind"] == "PYQ":
        p["year"] = src.get("year")
        p["srcRef"] = src.get("paper", "")
        if exam == "JEE Main":
            p["when"] = src.get("session") or src.get("paper", "")
            p["date"] = src.get("date", "")
    else:
        p["srcRef"] = src.get("ref") or src.get("paper") or ""
    if en.get("trap"):
        p["trap"] = en["trap"]
    if ans["kind"] == "numeric":
        p["type"] = "num"; p["ans"] = ans["value"]
        if ans.get("tol") is not None:
            p["tol"] = ans["tol"]
        if ans.get("unit"):
            p["unit"] = ans["unit"]
    else:
        p["o"] = en["o"]; p["a"] = ans["index"]
        if ans.get("alsoAccepted"):
            p["alsoA"] = ans["alsoAccepted"]
    if hi.get("status") in HI_READY and hi.get("q"):
        p["hi"] = {k: hi[k] for k in ("q", "o", "sol", "hint", "trap") if hi.get(k)}
        p["hiStatus"] = hi["status"]
    if q["ncert"].get("otherChapters"):
        p["otherChapters"] = q["ncert"]["otherChapters"]
    if q["ncert"].get("oldRef"):
        p["oldRef"] = q["ncert"]["oldRef"]
    lines = [dict(img=x["img"], page=x.get("page"), label=x.get("label", "")) for x in q["ncert"].get("lines", []) if x.get("img")]
    if lines:
        p["ncert"] = lines
        p["ncertChapter"] = q["ncert"]["chapter"]
    kc = (q.get("review") or {}).get("keyCheck", "")
    if kc.startswith("Matches the official key"):
        p["check"] = kc
    if q.get("syllabus_status") == "dropped_2024":
        p["dropped"] = True
    return p


def build_bank_page(bank, cat_entry):
    """data/questions/<ch>.json bank -> data/pyq/<ch>.json, the chapter's "NCERT + PYQ" page.
    Shown: questions with English text and a worked solution (JEE PYQs without solutions wait).
    Grouping as build_pyq: one paragraph -> its section, two or more (or another chapter) -> 'Multiple concepts'.
    Questions on topics NEET dropped in 2024 go to their own section at the end and never count in trends.
    Banks without NCERT paragraphs (old-NCERT and lab banks) are grouped by their `oldRef` topic."""
    ch = bank["chapter"]
    shown = [q for q in bank["questions"] if q["text"]["en"]["status"] not in ("missing", "placeholder") and q["text"]["en"].get("sol")]
    if not shown:
        return None
    qs = [page_question(q) for q in shown]
    paragraphs = [dict(id=p["id"], title=p["title"], hi=p.get("hi"), pages=p.get("pages", []), pdfPage=p.get("pdfPage"))
                  for p in bank["paragraphs"]]
    by_topic = not paragraphs
    if by_topic:  # old-NCERT / lab bank: no NCERT paragraphs; one list, newest paper first, topic shown on each card
        paragraphs = [dict(id="all", title="All questions, newest paper first", hi="सभी प्रश्न, नया पेपर पहले", pages=[], pdfPage=None)]
        for q in qs:
            q["topic"] = (q.get("oldRef") or "").split("·")[-1].strip()
            q["paras"] = ["all"]
    order = {p["id"]: i for i, p in enumerate(paragraphs)}
    exam_rank = {"NEET": 0, "JEE Main": 1, "NCERT Exercise": 2, "NCERT Exemplar": 3, "Practice": 4}
    groups = {p["id"]: [] for p in paragraphs}
    multi, dropped = [], []
    for q in qs:
        q["paras"] = sorted(dict.fromkeys(x for x in q["paras"] if x in order), key=order.get)
        if q.get("dropped"):
            dropped.append(q)
        elif len(q["paras"]) != 1 or (q.get("otherChapters") and not by_topic):
            multi.append(q)
        else:
            groups[q["paras"][0]].append(q)
    sort_key = lambda q: (exam_rank.get(q["exam"], 9), str(q.get("date") or q.get("year") or ""), q.get("srcRef", ""))
    if by_topic:
        sort_key = lambda q: (-int(q.get("year") or 0), exam_rank.get(q["exam"], 9), q.get("srcRef", ""))
    sections = [dict(sec=p["id"], title=p["title"], hi=p["hi"], pages=p["pages"], pdfPage=p["pdfPage"],
                     questions=sorted(groups[p["id"]], key=sort_key)) for p in paragraphs if groups[p["id"]]]
    if multi:
        multi.sort(key=lambda q: ([order[x] for x in q["paras"]] or [999], sort_key(q)))
        sections.append(dict(sec="multi", title="Multiple concepts", hi="एक से अधिक अवधारणाएँ", pages=[], questions=multi))
    if dropped:
        dropped.sort(key=sort_key)
        sections.append(dict(sec="dropped", title="Topics removed from the NEET syllabus in 2024", hi="NEET 2024 पाठ्यक्रम से हटाए गए विषय", pages=[], questions=dropped))
    live = [q for q in qs if not q.get("dropped")]
    in_multi = {x for q in multi for x in q["paras"]}
    exams = [e for e in exam_rank if any(q["exam"] == e for q in qs)]
    yr = lambda e: sorted({int(q["year"]) for q in qs if q["exam"] == e and q.get("year")})
    years = " · ".join(f"{e} {ys[0]}–{ys[-1]}" if len(ys) > 1 else f"{e} {ys[0]}" for e in ("NEET", "JEE Main") for ys in [yr(e)] if ys)
    title_en = bank["title"]["en"]
    out = {
        "chapter": ch, "source": "bank", "subject": bank["subject"], "class": bank["class"], "unit": bank.get("unit"),
        "title": title_en, "titleHi": (cat_entry or {}).get("hi") or bank["title"].get("hi"),
        "ref": f"NCERT {bank['subject'].capitalize()} Class {bank['class']} · " + (f"Unit {bank['unit']}" if not bank.get("oldNcert") else bank["oldNcert"]),
        "years": years, "ncertPdf": bank.get("ncertPdf"), "pdfPageOffset": bank.get("pdfPageOffset", 0),
        "oldNcert": bank.get("oldNcert"), "byTopic": by_topic,
        "paragraphs": paragraphs, "sections": sections,
        "counts": {e: sum(1 for q in qs if q["exam"] == e) for e in exams},
        "empty": [] if by_topic else [p for p in paragraphs if not groups[p["id"]] and p["id"] not in in_multi],
        "trends": {} if by_topic else para_trends((q["exam"], q.get("year"), q["paras"]) for q in live),
        "latestNeet": LATEST_NEET, "recentYears": RECENT_YEARS,
        "multiRule": "Questions that need two or more NCERT paragraphs, or another chapter too.",
        "note": bank.get("note", ""),
        "waiting": len(bank["questions"]) - len(shown),
    }
    os.makedirs(os.path.join(DATA, "pyq"), exist_ok=True)
    json.dump(out, open(os.path.join(DATA, "pyq", ch + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{ch}: page {len(qs)} questions ({len(dropped)} dropped-topic, {out['waiting']} waiting for a solution) in {len(sections)} sections, "
          f"{len(out['empty'])} paragraphs not asked -> data/pyq/{ch}.json")
    return len(qs)


def build_test(path, banks):
    """A test lists sections; each section selects questions from a bank (by source kind and answer kind)
    or lists question ids. Output embeds the questions so the exam screen needs one file.
    NOTE: the prototype has no backend, so answers ship with the test; the real engine must keep keys on the server."""
    t = json.load(open(path, encoding="utf-8"))
    out = {k: v for k, v in t.items() if k != "sections"}
    out["sections"] = []
    total = 0
    for sec in t["sections"]:
        if "ids" in sec:
            byid = {q["id"]: (b, q) for b in banks.values() for q in b["questions"]}
            picked = [byid[i] for i in sec["ids"]]
        else:
            sel = sec["select"]
            b = banks[sel["bank"]]
            picked = [(b, q) for q in b["questions"]
                      if (not sel.get("sourceKind") or q["source"]["kind"] == sel["sourceKind"])
                      and (not sel.get("answerKind") or q["answer"]["kind"] == sel["answerKind"])
                      and q["status"] == "live" and q.get("syllabus_status") != "dropped_2024"]
            order = sec.get("order", [])
            rank = lambda q: (order.index(q["source"].get("exam")) if q["source"].get("exam") in order else 9,
                              str(q["source"].get("date", q["source"].get("year", ""))), q["id"])
            picked.sort(key=lambda bq: rank(bq[1]))
        qs = []
        for b, q in picked:
            q = dict(q)
            pt = {p["id"]: p["title"] for p in b["paragraphs"]}
            q["paraTitles"] = [pt.get(p, p) for p in q["ncert"]["paras"]]
            q["pdf"] = {"url": b.get("ncertPdf"), "offset": b.get("pdfPageOffset", 0)}
            qs.append(q)
        if not qs:
            sys.exit(f"{t['id']}: section {sec['id']} selects no questions")
        # Mock safety: topics NEET dropped in 2024 never enter a test. Old-NCERT-only topics (still in the NEET
        # syllabus, e.g. p-Block) need the test to opt in with "allowOldNcert": true.
        bad = [q["id"] for q in qs if q.get("syllabus_status") == "dropped_2024"
               or (q.get("ncert_status") == "old_ncert_only" and not t.get("allowOldNcert"))]
        if bad:
            sys.exit(f"{t['id']}: section {sec['id']} includes dropped-2024 or old-NCERT questions "
                     f"(old-NCERT needs \"allowOldNcert\": true): {bad[:8]}{' …' if len(bad) > 8 else ''}")
        s = {k: v for k, v in sec.items() if k not in ("select", "order", "ids")}
        s["questions"] = qs
        out["sections"].append(s)
        total += len(qs)
    out["count"] = total
    os.makedirs(os.path.join(DATA, "tests"), exist_ok=True)
    json.dump(out, open(os.path.join(DATA, "tests", t["id"] + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"test {t['id']}: {total} questions in {len(out['sections'])} sections, {t['durationMin']} min -> data/tests/{t['id']}.json")
    return {"id": t["id"], "title": t["title"], "subtitle": t.get("subtitle"), "durationMin": t["durationMin"], "count": total}


def latest_neet_year():
    years = []
    for f in glob.glob(os.path.join(CONTENT, "questions", "*.json")):
        years += [q["source"].get("year") for q in json.load(open(f, encoding="utf-8"))["questions"] if q["source"].get("exam") == "NEET"]
    for f in glob.glob(os.path.join(CONTENT, "pyq", "*.json")):
        years += [q.get("year") for q in json.load(open(f, encoding="utf-8"))["questions"] if q.get("exam") == "NEET"]
    return max(int(y) for y in years if y)


def main():
    global LATEST_NEET
    os.makedirs(DATA, exist_ok=True)
    LATEST_NEET = latest_neet_year()
    print(f"trend markers: latest NEET paper {LATEST_NEET}; 'recent' = asked in {LATEST_NEET - RECENT_YEARS + 1}-{LATEST_NEET}")
    catalog = json.load(open(os.path.join(CONTENT, "catalog.json"), encoding="utf-8"))
    built = {}
    for folder in sorted(glob.glob(os.path.join(CONTENT, "*/"))):
        if os.path.exists(os.path.join(folder, "chapter.json")):
            meta, stats = build_chapter(folder)
            built[meta["id"]] = stats
    banks = dict(check_bank(f) for f in sorted(glob.glob(os.path.join(CONTENT, "questions", "*.json"))))
    # Chapter pages ("NCERT + PYQ"): from the question bank. The legacy content/pyq files are built only
    # for chapters that have no bank file (none at present; tools/convert_questions.py is retired).
    entries = {ch["id"]: ch for s in catalog["subjects"] for c in s["classes"] for ch in c["chapters"] + c.get("extras", [])}
    # A subject's chapter pages are linked from home only when its catalog entry has "pagesLive": true
    # (set by the session that has checked that subject's pages); unlinked pages still build and open by URL.
    live_subject = {ch["id"]: bool(s.get("pagesLive")) for s in catalog["subjects"] for c in s["classes"] for ch in c["chapters"] + c.get("extras", [])}
    pyq = {}
    for ch_id, bank in banks.items():
        n = build_bank_page(bank, entries.get(ch_id))
        if n:
            pyq[ch_id] = n
    legacy = set()
    for f in sorted(glob.glob(os.path.join(CONTENT, "pyq", "*.json"))):
        if json.load(open(f, encoding="utf-8"))["chapter"] not in banks:
            ch_id, n = build_pyq(f)
            pyq[ch_id] = n; legacy.add(ch_id)
    for ch_id, ch in entries.items():
        if ch_id in built:
            ch["ready"] = True
            ch["stats"] = built[ch_id]
        if ch_id in pyq and (live_subject.get(ch_id) or ch_id in legacy):
            ch["pyq"] = pyq[ch_id]
    missing = sorted(set(pyq) - set(entries))
    if missing:
        print(f"  note: pages built but not listed in content/catalog.json (not linked from home): {missing}")
    json.dump(catalog, open(os.path.join(DATA, "catalog.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"catalog updated: {len(pyq)} chapter pages built, {sum(1 for c in entries.values() if c.get('pyq'))} linked from home")
    # Hindi text: formulas/numbers must match English; terms must be NCERT's (tools/check_hindi.py)
    import subprocess
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "check_hindi.py")], capture_output=True, text=True)
    print("hindi: " + (r.stdout.strip().splitlines() or [""])[-1])
    if r.returncode:
        sys.exit(r.stdout + r.stderr)
    tests = [build_test(f, banks) for f in sorted(glob.glob(os.path.join(CONTENT, "tests", "*.json")))]
    json.dump({"tests": tests}, open(os.path.join(DATA, "tests", "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
