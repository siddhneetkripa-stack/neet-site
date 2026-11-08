#!/usr/bin/env python3
"""Merge chapter section files from content/<chapter>/ into data/<chapter>.json.

Usage:  python3 tools/build.py
Checks: unique node ids, every question has 4 options and a valid answer index.
Also builds PYQ pages: content/pyq/<chapter>.json -> data/pyq/<chapter>.json
(checks options/answers, that every NCERT excerpt image exists, and sections are in NCERT order).
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
    os.makedirs(os.path.join(DATA, "pyq"), exist_ok=True)
    json.dump(out, open(os.path.join(DATA, "pyq", ch + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{ch}: {n} PYQs {out['counts']} in {len(sections)} sections ({len(multi)} multi-concept) -> data/pyq/{ch}.json")
    return ch, n

def main():
    os.makedirs(DATA, exist_ok=True)
    catalog = json.load(open(os.path.join(CONTENT, "catalog.json"), encoding="utf-8"))
    built = {}
    for folder in sorted(glob.glob(os.path.join(CONTENT, "*/"))):
        if os.path.exists(os.path.join(folder, "chapter.json")):
            meta, stats = build_chapter(folder)
            built[meta["id"]] = stats
    pyq = dict(build_pyq(f) for f in sorted(glob.glob(os.path.join(CONTENT, "pyq", "*.json"))))
    for subj in catalog["subjects"]:
        for cls in subj["classes"]:
            for ch in cls["chapters"]:
                if ch.get("id") in built:
                    ch["ready"] = True
                    ch["stats"] = built[ch["id"]]
                if ch.get("id") in pyq:
                    ch["pyq"] = pyq[ch["id"]]
    json.dump(catalog, open(os.path.join(DATA, "catalog.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("catalog updated")

if __name__ == "__main__":
    main()
