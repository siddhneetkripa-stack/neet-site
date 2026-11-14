#!/usr/bin/env python3
"""Write content/cbt-plans/biology.json: chapter CBT tests from the Biology bank.

    python3 content/cbt-plans/make_biology_plan.py

Rules (owner, Nov 2026):
- 30-45 questions per test, about 1 minute each; first test of a chapter free, the rest free:false.
- Each test mixes years, types and difficulties and runs from easy to hard.
- Never syllabus_status dropped_2024; old_ncert_only only in tests of old-NCERT chapters;
  no diagram questions (no redrawn figures yet); no bonus questions; exact repeats of a question
  (same text and options in another year) appear once; no question whose key
  is still in conflict (our answer differs from a printed or official key); no question without a worked solution; a question is in only one test per chapter.
- Number of tests = usable questions // 30 (so none is under 30); a test holds at most 45, so up to
  14 questions of a large chapter may stay unused.
- A chapter with fewer than 30 usable questions is joined with the next chapter(s) of the same
  class (book order) until the group reaches 30; that test lists all of them in "chapters".
Labels (type, difficulty) come from the bank; 'negative' tags from biology-tags.json.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QDIR = os.path.join(ROOT, "content", "questions")
MIN_Q, MAX_Q = 30, 45
TYPE_ORDER = {"single": 0, "statement": 1, "match": 2, "assertion-reason": 3, "numerical": 4}


def catalog():
    cat = json.load(open(os.path.join(ROOT, "content", "catalog.json"), encoding="utf-8"))
    bio = next(s for s in cat["subjects"] if s["id"] == "biology")
    out = []
    for c in bio["classes"]:
        for ch in c["chapters"] + c.get("extras", []):
            out.append(ch)
    return out


def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or "")).strip().lower()


def eligible(bank, old_chapter):
    seen, out = {}, []
    qs = sorted(bank["questions"], key=lambda q: -(q["source"].get("year") or 0))  # newest copy of a repeat wins
    for q in qs:
        r = json.dumps(q.get("review", {})).lower()
        key = q.get("review", {}).get("keyCheck", "").lower()
        conflict = "differs" in key or re.search(r"ours: \d", key)  # our answer differs from a printed/official key
        if q["syllabus_status"] == "dropped_2024" or q["type"] == "diagram" or "bonus" in r or conflict:
            continue
        if q["ncert_status"] == "old_ncert_only" and not old_chapter:
            continue
        en = q["text"]["en"]
        if not en.get("sol"):
            continue
        key = norm(en["q"]) + "|" + "|".join(norm(o) for o in en.get("o", []))
        if key in seen:
            continue
        seen[key] = q["id"]
        out.append(q)
    return out


def split(pool, k):
    """Deal questions into k tests so each gets a similar mix of difficulty, type and year."""
    tests = [[] for _ in range(k)]
    deck = sorted(pool, key=lambda q: (q["difficulty"], TYPE_ORDER.get(q["type"], 9), -(q["source"].get("year") or 0), q["id"]))
    for i, q in enumerate(deck):
        r, c = divmod(i, k)
        tests[c if r % 2 == 0 else k - 1 - c].append(q)  # snake order
    return tests


def order(test):
    """Easy -> hard; inside a difficulty level, alternate types and years so neighbours differ."""
    out = []
    for d in sorted({q["difficulty"] for q in test}):
        level = [q for q in test if q["difficulty"] == d]
        by_type = {}
        for q in sorted(level, key=lambda q: (-(q["source"].get("year") or 0), q["id"])):
            by_type.setdefault(q["type"], []).append(q)
        for t, lane in by_type.items():  # newest, oldest, next newest, ... so years alternate
            by_type[t] = [x for pair in zip(lane, lane[::-1]) for x in pair][:len(lane)] if len(lane) > 2 else lane
            seen, mixed = set(), []
            for x in by_type[t]:
                if x["id"] not in seen:
                    seen.add(x["id"]); mixed.append(x)
            by_type[t] = mixed + [x for x in lane if x["id"] not in seen]
        lanes = sorted(by_type.values(), key=len, reverse=True)
        while any(lanes):
            for lane in lanes:
                if lane:
                    out.append(lane.pop(0))
    return out


def main():
    chapters = catalog()
    banks = {}
    for ch in chapters:
        p = os.path.join(QDIR, ch["id"] + ".json")
        if os.path.exists(p):
            banks[ch["id"]] = json.load(open(p, encoding="utf-8"))
    pools = {cid: eligible(b, "-old-" in cid) for cid, b in banks.items()}
    # group small chapters with the next ones of the same class (old-NCERT chapters stay on their own)
    groups, cur = [], []
    order_ids = [c["id"] for c in chapters if c["id"] in banks]
    for cid in order_ids:
        if "-old-" in cid:
            if pools[cid]:
                groups.append([cid])
            continue
        if cur and cur[0][:5] != cid[:5]:
            groups.append(cur); cur = []
        cur.append(cid)
        if sum(len(pools[c]) for c in cur) >= MIN_Q:
            groups.append(cur); cur = []
    if cur:
        if groups and groups[-1][0][:5] == cur[0][:5] and "-old-" not in groups[-1][0]:
            groups[-1] += cur
        else:
            groups.append(cur)
    title = {c["id"]: c for c in chapters}
    tests, skipped = [], []
    for g in groups:
        pool = [q for c in g for q in pools[c]]
        n = len(pool)
        if n < MIN_Q:
            skipped.append((g, n)); continue
        k = max(1, n // MIN_Q)  # as many tests as keep each at 30 or more
        parts = split(pool, k)
        for i, part in enumerate(parts, 1):
            if len(part) > MAX_Q:  # keep 45, evenly spread over the difficulty/type/year deck
                part = [part[round(j * len(part) / MAX_Q)] for j in range(MAX_Q)]
            part = order(part)
            en = " + ".join(title[c]["title"] for c in g)
            hi = " + ".join(title[c].get("hi", title[c]["title"]) for c in g)
            t = {"slug": f"{g[0]}-t{i}", "chapter": g[0]}
            if len(g) > 1:
                t["chapters"] = g
            t.update({"title": {"en": f"{en} · Test {i}", "hi": f"{hi} · टेस्ट {i}"},
                      "free": i == 1, "durationMin": len(part), "marking": {"right": 4, "wrong": -1},
                      "ids": [q["id"] for q in part]})
            tests.append(t)
    plan = {"subject": "biology",
            "note": ("Chapter tests from Biology PYQs and NCERT-coverage questions; built by "
                     "content/cbt-plans/make_biology_plan.py (rules in its docstring). 1 minute per question. "
                     "Tests with 'chapters' join small chapters of the same class."),
            "tests": tests}
    with open(os.path.join(ROOT, "content", "cbt-plans", "biology.json"), "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)
        f.write("\n")
    for t in tests:
        print(t["slug"], len(t["ids"]), "free" if t["free"] else "", t.get("chapters", ""))
    for g, n in skipped:
        print("skipped", g, n, "usable questions")
    print(len(tests), "tests;", sum(len(t["ids"]) for t in tests), "questions;",
          "usable per chapter:", {c: len(v) for c, v in pools.items()})


if __name__ == "__main__":
    main()
