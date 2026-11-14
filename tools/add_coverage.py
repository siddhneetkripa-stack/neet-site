#!/usr/bin/env python3
"""NCERT-coverage questions: content/coverage/<chapter>.json -> content/questions/<chapter>.json.

    python3 tools/add_coverage.py chem11-02 [chem12-01 ...]     # or: --all

Every NCERT paragraph should have at least one question (CLAUDE.md, "NCERT in MCQs"). For paragraphs no
PYQ touches, an authoring file lists short entries; this tool expands them into full bank questions
(docs/question-schema.json) and upserts them by id, so a re-run after an edit updates the bank.

Authoring entry (all text HTML; en and hi must keep numbers, formulas and units identical):
  {"para": "2.1.1", "n": 1, "type": "single|statement|match|assertion-reason|numerical",
   "kind": "AI" | "NCERT Exercise" | "NCERT Exemplar", "ref": "Ex 2.3" (for exercise/exemplar),
   "d": 2|3|4 (easy/medium/hard on the owner's scale), "a": 0-3 (index of the correct option),
   "en": {"q": "...", "o": [4], "sol": "...", "hint": "...", "trap": "..."(optional)},
   "hi": {"q": "...", "o": [4], "sol": "...", "hint": "...", "trap": "..."(optional)},
   "paras": ["2.1.1", "2.1.2"] (optional, default [para])}
Numerical answer: "type": "numerical", "ans": 4.5, "tol": 0.01 (no "o", no "a").
Checks: paragraph ids exist; exactly 4 distinct options; a in range; en/hi option counts equal.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIME = {2: 45, 3: 60, 4: 90}
KIND_ID = {"AI": "ai", "NCERT Exercise": "ncertex", "NCERT Exemplar": "exemplar"}


def die(msg):
    sys.exit("add_coverage: " + msg)


def expand(ch, bank, e):
    para_ids = {p["id"] for p in bank["paragraphs"]}
    paras = e.get("paras") or [e["para"]]
    for p in paras:
        if p not in para_ids:
            die(f"{ch}: paragraph {p} is not in the bank's paragraph list")
    kind = e.get("kind", "AI")
    qid = f"{ch}-{KIND_ID[kind]}-{e['para'].replace('.', '-')}-q{e.get('n', 1)}"
    num = e["type"] == "numerical"
    text = {}
    for L in ("en", "hi"):
        t = e[L]
        o = {"status": "draft"}
        if L == "hi":
            o["note"] = "Draft Hindi (Claude), NCERT Hindi terms; not yet proofread."
        o["q"] = t["q"]
        if not num:
            if len(t["o"]) != 4 or len(set(t["o"])) != 4:
                die(f"{qid} ({L}): needs 4 distinct options")
            o["o"] = list(t["o"])
        for k in ("sol", "hint", "trap"):
            if t.get(k):
                o[k] = t[k]
        if not o.get("sol"):
            die(f"{qid} ({L}): no solution")
        text[L] = o
    if num:
        ans = {"kind": "numeric", "value": e["ans"]}
        if e.get("tol") is not None:
            ans["tol"] = e["tol"]
    else:
        if not 0 <= e["a"] <= 3:
            die(f"{qid}: answer index out of range")
        ans = {"kind": "single", "index": e["a"]}
    src = {"kind": kind}
    if kind == "AI":
        src["paper"] = f"Own question (AI) on NCERT {e['para']}"
    else:
        src["paper"] = f"{kind} {e.get('ref', '')}".strip() + " (reworded as an MCQ)"
    return {
        "id": qid, "type": {"numerical": "numerical"}.get(e["type"], e["type"]),
        "text": text, "answer": ans,
        "ncert": {"chapter": ch, "paras": paras},
        "source": src,
        "difficulty": e["d"], "difficultyBasis": "author", "timeSec": TIME[e["d"]],
        "status": "draft", "ncert_status": "in_ncert", "syllabus_status": "current",
        "review": {"modelA": "Claude (question, key and worked solution)",
                   "note": "NCERT-coverage question for a paragraph with no PYQ; second-model check pending."},
    }


def run(ch):
    src = os.path.join(ROOT, "content", "coverage", ch + ".json")
    dst = os.path.join(ROOT, "content", "questions", ch + ".json")
    entries = json.load(open(src, encoding="utf-8"))
    bank = json.load(open(dst, encoding="utf-8"))
    qs = [expand(ch, bank, e) for e in entries]
    ids = [q["id"] for q in qs]
    if len(set(ids)) != len(ids):
        die(f"{ch}: duplicate ids in the authoring file")
    pos = {q["id"]: i for i, q in enumerate(bank["questions"])}
    added = 0
    for q in qs:
        if q["id"] in pos:
            bank["questions"][pos[q["id"]]] = q
        else:
            bank["questions"].append(q)
            added += 1
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{ch}: {len(qs)} coverage questions ({added} new) -> {os.path.relpath(dst, ROOT)}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["--all"]:
        args = sorted(f[:-5] for f in os.listdir(os.path.join(ROOT, "content", "coverage")) if f.endswith(".json"))
    if not args:
        die("give chapter ids or --all")
    for a in args:
        run(a)
