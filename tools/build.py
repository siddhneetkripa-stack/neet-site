#!/usr/bin/env python3
"""Merge chapter section files from content/<chapter>/ into data/<chapter>.json.

Usage:  python3 tools/build.py
Checks: unique node ids, every question has 4 options and a valid answer index.
Also builds PYQ pages: content/pyq/<chapter>.json -> data/pyq/<chapter>.json
(checks options/answers, that every NCERT excerpt image exists, and sections are in NCERT order).
"""
import json, os, sys, glob

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

def sec_key(sec):
    return tuple(int(x) for x in sec.split("."))

def build_pyq(path):
    doc = json.load(open(path, encoding="utf-8"))
    ch = doc["chapter"]
    img_dir = os.path.join(ROOT, "assets", "ncert", ch)
    keys = [sec_key(s["sec"]) for s in doc["sections"]]
    if keys != sorted(keys):
        sys.exit(f"{ch}: PYQ sections are not in NCERT order")
    n = 0
    for s in doc["sections"]:
        s["questions"].sort(key=lambda q: q["year"])
        for q in s["questions"]:
            n += 1
            if len(q["o"]) != 4 or not (0 <= q["a"] < 4):
                sys.exit(f"{ch} PYQ bad options/answer: {q['q'][:50]}")
            for field in ("year", "q", "sol", "hint", "ncert"):
                if not q.get(field):
                    sys.exit(f"{ch} PYQ missing {field}: {q['q'][:50]}")
            for x in q["ncert"]:
                if not os.path.exists(os.path.join(img_dir, x["img"] + ".webp")):
                    sys.exit(f"{ch} PYQ: missing excerpt image {x['img']}.webp")
            q["id"] = f"pyq-{ch}-{s['sec']}-{q['year']}-{n}"
    os.makedirs(os.path.join(DATA, "pyq"), exist_ok=True)
    json.dump(doc, open(os.path.join(DATA, "pyq", ch + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{ch}: {n} PYQs -> data/pyq/{ch}.json")
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
