#!/usr/bin/env python3
"""Check bank answers against official answer keys and record the result on each question.

    python3 tools/apply_keys.py content/keys/neet-official-keys.json [--write]

KEYS.json: {"<year>-<booklet>": {"meta": {"source": "...", "year": 2019, "match": "Code S2"}, "key": {"46": "2", ...}}}
`match` is the text that must appear in a question's source.paper for this key to apply (e.g. "Code S2",
"Phase 2 Code AA", "Re-exam Code D"). Key values: "1"–"4", "1,4" (several accepted), "Bonus".
Prints every disagreement; with --write sets review.keyCheck / review.keySource (and answer.alsoAccepted
for multi-answer keys) on agreeing questions, and review.note on disagreements (answers are never changed
automatically: a disagreement needs a person or a fresh solve).
"""
import json, os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    doc = json.load(open(sys.argv[1], encoding="utf-8"))
    keys = doc.get("keys", doc)
    write = "--write" in sys.argv
    stats = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "content", "questions", "*.json"))):
        bank = json.load(open(f, encoding="utf-8"))
        changed = False
        for q in bank["questions"]:
            src = q["source"]
            if src.get("kind") != "PYQ" or src.get("exam") != "NEET":
                continue
            for name, k in keys.items():
                meta = k["meta"]
                if src.get("year") != meta["year"] or meta["match"].lower() not in src.get("paper", "").lower():
                    continue
                m = re.search(r"Q(\d+)\s*$", src["paper"])
                if not m or m.group(1) not in k["key"]:
                    continue
                val = k["key"][m.group(1)].strip()
                st = stats.setdefault(name, {"agree": 0, "differ": [], "bonus": []})
                rev = q.setdefault("review", {})
                if val.lower().startswith("bonus") or not re.fullmatch(r"[1-4](,[1-4])*", val):
                    st["bonus"].append((q["id"], val))
                    if write:
                        rev["keyCheck"] = f"Official key ({meta['source_short']}): {val}"
                        rev["keySource"] = meta["source"]
                        changed = True
                    continue
                acc = [int(x) - 1 for x in val.split(",")]
                ans = q["answer"]
                if ans.get("kind") != "single":
                    continue
                ours = [ans["index"]] + ans.get("alsoAccepted", [])
                if ans["index"] in acc:
                    st["agree"] += 1
                    if write:
                        rev["keyCheck"] = f"Matches the official key ({meta['source_short']}: {val})"
                        rev["keySource"] = meta["source"]
                        extra = [a for a in acc if a != ans["index"]]
                        if extra:
                            ans["alsoAccepted"] = sorted(set(extra))
                        elif "alsoAccepted" in ans and not set(ans["alsoAccepted"]) <= set(acc):
                            ans.pop("alsoAccepted")
                        changed = True
                else:
                    st["differ"].append((q["id"], ans["index"] + 1, val))
                    if write:
                        rev["keyCheck"] = f"DIFFERS from the official key ({meta['source_short']}: {val}; ours: option {ans['index'] + 1})"
                        rev["keySource"] = meta["source"]
                        changed = True
        if changed:
            with open(f, "w", encoding="utf-8") as fh:
                json.dump(bank, fh, ensure_ascii=False, indent=1)
                fh.write("\n")
    for name, st in stats.items():
        print(f"{name}: {st['agree']} agree, {len(st['differ'])} differ, {len(st['bonus'])} bonus/odd")
        for d in st["differ"]:
            print("   DIFFER", d)
        for b in st["bonus"]:
            print("   BONUS/ODD", b)


if __name__ == "__main__":
    main()
