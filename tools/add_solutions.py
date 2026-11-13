#!/usr/bin/env python3
"""Merge worked solutions and Hindi text into the question bank.

    python3 tools/add_solutions.py content/solutions/<chapter>.json [...]

A solutions file maps question id -> {"sol": html, "hint": html, "trap": html?,
  "hi": {"q": html, "o": [4 html], "sol": html, "hint": html, "trap": html?}}
English `sol`/`hint`/`trap` are written into text.en (status stays as it is: "draft" until a reviewer checks it);
`hi` becomes text.hi with status "draft" (not proofread). tools/add_pyqs.py keeps both on re-runs.
Run tools/build.py afterwards: tools/check_hindi.py checks formulas/numbers are identical in both languages.
"""
import json, os, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    sols = {}
    for p in sys.argv[1:]:
        sols.update(json.load(open(p, encoding="utf-8")))
    done = set()
    for f in sorted(glob.glob(os.path.join(ROOT, "content", "questions", "*.json"))):
        bank = json.load(open(f, encoding="utf-8"))
        changed = False
        for q in bank["questions"]:
            s = sols.get(q["id"])
            if not s:
                continue
            en = q["text"]["en"]
            for k in ("sol", "hint", "trap"):
                if s.get(k):
                    en[k] = s[k]
            if s.get("hi"):
                h = dict(s["hi"])
                h["status"] = "draft"
                h.setdefault("note", "Draft Hindi (Claude), NCERT Hindi terms; not yet proofread.")
                q["text"]["hi"] = {"status": h.pop("status"), **h}
            done.add(q["id"])
            changed = True
        if changed:
            with open(f, "w", encoding="utf-8") as fh:
                json.dump(bank, fh, ensure_ascii=False, indent=1)
                fh.write("\n")
    missing = sorted(set(sols) - done)
    print(f"merged {len(done)}; unknown ids: {missing[:10]}{' …' if len(missing) > 10 else ''}")
    if missing:
        sys.exit(1)


if __name__ == "__main__":
    main()
