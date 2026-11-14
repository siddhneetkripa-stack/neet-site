#!/usr/bin/env python3
"""RETIRED (14 Nov 2026): the question bank (content/questions/) is now the master copy and the chapter
pages are built from it. Re-running this would overwrite later bank edits (fixes, added PYQs) with the
legacy text, so it refuses to run without --force. Edit content/questions/*.json directly instead.

Convert the legacy question files into the question-bank format (docs/question-schema.json).

    python3 tools/convert_questions.py

Sources (still used by the current Reader / PYQ pages until they move to the bank in Phase 1):
  content/pyq/chem11-01.json                  -> content/questions/chem11-01.json
  content/chem11-thermodynamics/NN-*.json     -> content/questions/chem11-thermodynamics.json

Safe to re-run: Hindi text, status, review and difficulty set by hand in an existing bank file are kept
(matched by question id); English text, answers and NCERT tags are refreshed from the legacy source.
"""
import json, os, re, glob, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content")
OUT = os.path.join(CONTENT, "questions")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def qtype(q):
    if q.get("type") == "num":
        return "numerical"
    t = re.sub(r"<[^>]+>", " ", q["q"])
    if re.search(r"\bAssertion\b|\bReason\b \(R\)", t):
        return "assertion-reason"
    if re.search(r"List[- ]?I\b|Match (the|List)|Column[- ]?I\b", t, re.I):
        return "match"
    if re.search(r"Statement[- ]?I\b|following statements|statements? (is|are) (correct|incorrect|true|false)", t, re.I):
        return "statement"
    if "<img" in t or "<svg" in q["q"]:
        return "diagram"
    return "single"


def hi_placeholder():
    return {"status": "placeholder", "note": "Hindi pending: waiting for the NCERT Hindi term glossary (neet-sources)."}


def merge_existing(new, old):
    """Keep hand-made fields from a previous bank file."""
    if not old:
        return new
    if old["text"]["hi"].get("status") not in ("missing", "placeholder"):
        new["text"]["hi"] = old["text"]["hi"]
    for k in ("status", "review", "media"):
        if k in old:
            new[k] = old[k] if k != "review" else {**new.get("review", {}), **old[k]}
    if old.get("difficultyBasis") in ("author", "data") and new.get("difficultyBasis") == "default":
        new["difficulty"], new["difficultyBasis"] = old["difficulty"], old["difficultyBasis"]
    return new


def load_old(path):
    if not os.path.exists(path):
        return {}
    return {q["id"]: q for q in json.load(open(path, encoding="utf-8"))["questions"]}


def write(path, doc):
    """Questions added to this bank by other tools (tools/add_pyqs.py) are kept after the converted ones."""
    if os.path.exists(path):
        made = {q["id"] for q in doc["questions"]}
        doc["questions"] += [q for q in json.load(open(path, encoding="utf-8"))["questions"] if q["id"] not in made
                             and q.get("status") == "draft" and q["source"]["kind"] == "PYQ"]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{os.path.relpath(path, ROOT)}: {len(doc['questions'])} questions")


# ---------- Chemistry 11 Unit 1 (PYQ page file) ----------
def convert_pyq(src):
    doc = json.load(open(src, encoding="utf-8"))
    ch = doc["chapter"]
    out_path = os.path.join(OUT, ch + ".json")
    old = load_old(out_path)
    m = re.match(r"(phy|chem|bio)(1[12])-(\d+)$", ch)
    subject = {"phy": "physics", "chem": "chemistry", "bio": "biology"}[m.group(1)]
    questions, seen, per_para = [], set(), {}
    for q in doc["questions"]:
        exam = q["exam"]
        is_pyq = exam in ("NEET", "JEE Main")
        if is_pyq:
            base = f"{ch}-{'neet' if exam == 'NEET' else 'jee'}-{q['year']}-{slug(q['srcRef'])}" if exam == "NEET" \
                else f"{ch}-jee-{slug(q['srcRef'])}"
        else:
            p = q["paras"][0]
            per_para[(exam, p)] = per_para.get((exam, p), 0) + 1
            kind = {"Practice": "ai", "NCERT Exercise": "ncert-ex", "NCERT Exemplar": "exemplar"}[exam]
            base = f"{ch}-{kind}-{slug(p)}-{per_para[(exam, p)]}"
        qid = base
        if qid in seen:
            qid = base + "-" + hashlib.sha1(q["q"].encode()).hexdigest()[:6]
        seen.add(qid)
        t = qtype(q)
        en = {"status": "checked", "q": q["q"]}
        if t != "numerical":
            en["o"] = q["o"]
        en["sol"] = q["sol"]
        for k in ("hint", "trap"):
            if q.get(k):
                en[k] = q[k]
        if is_pyq:
            source = {"kind": "PYQ", "exam": exam, "year": q["year"], "paper": q["srcRef"]}
            if q.get("date"):
                source["date"] = q["date"]
            if q.get("when"):
                source["session"] = q["when"]
        else:
            source = {"kind": {"Practice": "AI", "NCERT Exercise": "NCERT Exercise", "NCERT Exemplar": "NCERT Exemplar"}[exam],
                      "paper": q.get("srcRef", "")}
            if exam == "Practice":
                source["label"] = "Practice"
        ncert = {"chapter": ch, "paras": q["paras"], "lines": q.get("ncert", [])}
        if q.get("otherChapters"):
            ncert["otherChapters"] = q["otherChapters"]
        review = {"modelA": "Claude (worked solution)"}
        if q.get("check"):
            review["keyCheck"] = q["check"]
        if "errata" in q["sol"]:
            review["errata"] = "See the errata block in the solution."
        if q.get("also"):
            review["note"] = q["also"]  # dropped below if not in schema
        if t == "numerical":
            answer = {"kind": "numeric", "value": q["ans"], "tol": q.get("tol", 0)}
            time = 150
        else:
            answer = {"kind": "single", "index": q["a"]}
            time = 60 if exam == "NEET" else 120 if exam == "JEE Main" else 60
        review.pop("note", None)
        if q.get("also"):
            en["note"] = q["also"]
        new = {
            "id": qid, "type": t, "text": {"en": en, "hi": hi_placeholder()}, "answer": answer, "ncert": ncert,
            "source": source, "difficulty": 3, "difficultyBasis": "default", "timeSec": time,
            "status": "live", "review": review, "ncert_status": "in_ncert", "syllabus_status": "current",
        }
        questions.append(merge_existing(new, old.get(qid)))
    bank = {
        "$schema": "../../docs/question-schema.json", "schemaVersion": 1, "chapter": ch,
        "subject": subject, "class": int(m.group(2)), "unit": int(m.group(3)),
        "title": {"en": doc["title"]}, "ncertPdf": doc["ncertPdf"], "pdfPageOffset": doc["pdfPageOffset"],
        "generatedFrom": os.path.relpath(src, ROOT),
        "paragraphs": doc["paragraphs"], "questions": questions,
    }
    write(out_path, bank)


# ---------- Chemistry 11 Unit 5 Thermodynamics (mind-map section files) ----------
LVL = {"easy": (2, 45), "medium": (3, 75), "hard": (4, 120)}
NCERT_SRC = {  # same table as tools/build.py
    "A thermodynamic state function is a quantity": "NCERT Ex 5.1",
    "For a process to occur under adiabatic conditions": "NCERT Ex 5.2",
    "The enthalpies of all elements in their standard": "NCERT Ex 5.3",
    "For CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l), ΔU = −X": "NCERT Ex 5.4",
    "No work is done on a system but heat q is taken out": "NCERT Problem 5.1",
}


def convert_mindmap(folder):
    meta = json.load(open(os.path.join(folder, "chapter.json"), encoding="utf-8"))
    ch = meta["id"]
    out_path = os.path.join(OUT, ch + ".json")
    old = load_old(out_path)
    paragraphs, questions = [], []

    def walk(n):
        p = {"id": n["id"], "title": n["title"], "pages": n.get("pages", [])}
        if n.get("ref"):
            p["ref"] = n["ref"]
        paragraphs.append(p)
        for i, q in enumerate(n.get("questions", [])):
            qid = f"{ch}-{n['id']}-q{i + 1}"
            src = q.get("src") or next((s for pre, s in NCERT_SRC.items() if q["q"].startswith(pre)), None)
            diff, time = LVL.get(q.get("lvl"), (3, 60))
            source = {"kind": "NCERT Exercise", "paper": src} if src else {"kind": "AI", "label": "Practice"}
            new = {
                "id": qid, "type": qtype(q),
                "text": {"en": {"status": "checked", "q": q["q"], "o": q["o"], "sol": q["e"]}, "hi": hi_placeholder()},
                "answer": {"kind": "single", "index": q["a"]},
                "ncert": {"chapter": ch, "paras": [n["id"]]},
                "source": source, "difficulty": diff, "difficultyBasis": "author" if q.get("lvl") else "default",
                "timeSec": time, "status": "live", "review": {"modelA": "Claude (worked solution)"},
                "ncert_status": "in_ncert", "syllabus_status": "current",
            }
            if q.get("pyq"):
                new["review"]["keyCheck"] = "Also asked: " + ", ".join(q["pyq"])
            questions.append(merge_existing(new, old.get(qid)))
        for c in n.get("children", []):
            walk(c)

    for f in sorted(glob.glob(os.path.join(folder, "[0-9]*.json"))):
        for n in json.load(open(f, encoding="utf-8")):
            walk(n)
    bank = {
        "$schema": "../../docs/question-schema.json", "schemaVersion": 1, "chapter": ch,
        "subject": meta["subject"].lower(), "class": meta["cls"], "unit": meta["unit"],
        "title": {"en": meta["title"]}, "ncertPdf": meta["ncertPdf"], "pdfPageOffset": meta["pdfPageOffset"],
        "generatedFrom": os.path.relpath(folder, ROOT) + "/",
        "paragraphs": paragraphs, "questions": questions,
    }
    write(out_path, bank)


if __name__ == "__main__":
    import sys
    if "--force" not in sys.argv:
        sys.exit("convert_questions.py is retired: content/questions/ is the master copy. See the docstring.")
    convert_pyq(os.path.join(CONTENT, "pyq", "chem11-01.json"))
    convert_mindmap(os.path.join(CONTENT, "chem11-thermodynamics"))
