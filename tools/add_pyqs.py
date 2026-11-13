#!/usr/bin/env python3
"""Add tagged PYQs to the question bank, one bank file per NCERT chapter.

    python3 tools/add_pyqs.py content/pyq-batches/neet-2025-chemistry.json [...]

A batch file is a list of compact entries (written while reading a paper):
  {"year": 2025, "exam": "NEET", "paper": "Code 45 Q46", "ch": "chem11-02", "paras": ["2.4.1"],
   "type": "single", "q": "...", "o": ["...", "...", "...", "..."], "a": 3, "also": [1],
   "ncert_status": "in_ncert", "syllabus_status": "current", "other": ["Class 12 · Amines"], "oldRef": "...",
   "key": "NTA final key Code 45: 4", "keySource": "NTA final answer key 2025 (Code 45)",
   "note": "options are structures in the paper: needs redrawn figure", "dup": "chem11-01-..."}
`a` is the 0-based correct option in the order printed; `also` lists other options the official key accepts.
Numerical: "type": "numerical", "ans": 14, "tol": 0.

New chapter banks are started from content/ncert/chemistry-paragraphs.json; chapters dropped from the
rationalised NCERT (OLD below) get an empty paragraph list and ncert_status old_ncert_only.
Entries are added as status "draft" (English draft transcription, Hindi missing, no solution yet) and are
replaced by id when a batch is re-run, keeping any Hindi / solution / status already added by hand.
Entries with "dup" (already in a bank, e.g. Unit 1) are skipped.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QDIR = os.path.join(ROOT, "content", "questions")
PARAS = json.load(open(os.path.join(ROOT, "content", "ncert", "chemistry-paragraphs.json"), encoding="utf-8"))["chapters"]
CAT = json.load(open(os.path.join(ROOT, "content", "catalog.json"), encoding="utf-8"))

# Chapters not in the rationalised NCERT (docs/research/02-neet-syllabus-ncert-map.md)
OLD = {
    "chem11-old-p-block": (11, 11, "The p-Block Elements (Groups 13–14)", "in NEET 2026", "Old NCERT Class 11 Part II Unit 11 The p-Block Elements"),
    "chem12-old-p-block": (12, 7, "The p-Block Elements (Groups 15–18)", "in NEET 2026", "Old NCERT Class 12 Part I Unit 7 The p-Block Elements"),
    "chem11-old-states-of-matter": (11, 5, "States of Matter", "dropped_2024", "Old NCERT Class 11 Part I Unit 5 States of Matter"),
    "chem11-old-hydrogen": (11, 9, "Hydrogen", "dropped_2024", "Old NCERT Class 11 Part II Unit 9 Hydrogen"),
    "chem11-old-s-block": (11, 10, "The s-Block Elements", "dropped_2024", "Old NCERT Class 11 Part II Unit 10 The s-Block Elements"),
    "chem11-old-environmental-chemistry": (11, 14, "Environmental Chemistry", "dropped_2024", "Old NCERT Class 11 Part II Unit 14 Environmental Chemistry"),
    "chem12-old-solid-state": (12, 1, "The Solid State", "dropped_2024", "Old NCERT Class 12 Part I Unit 1 The Solid State"),
    "chem12-old-surface-chemistry": (12, 5, "Surface Chemistry", "dropped_2024", "Old NCERT Class 12 Part I Unit 5 Surface Chemistry"),
    "chem12-old-metallurgy": (12, 6, "General Principles and Processes of Isolation of Elements", "dropped_2024", "Old NCERT Class 12 Part I Unit 6"),
    "chem12-old-polymers": (12, 15, "Polymers", "dropped_2024", "Old NCERT Class 12 Part II Unit 15 Polymers"),
    "chem12-old-everyday-life": (12, 16, "Chemistry in Everyday Life", "dropped_2024", "Old NCERT Class 12 Part II Unit 16"),
    # NEET Unit 20 (Principles Related to Practical Chemistry): NCERT lab manual, not the textbooks
    "chem12-lab-practical-chemistry": (12, 20, "Principles Related to Practical Chemistry", "current", "NCERT Laboratory Manual Chemistry (Class XI and XII)"),
}
LAB = {"chem12-lab-practical-chemistry"}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def catalog_title(ch):
    for s in CAT["subjects"]:
        for c in s["classes"]:
            for x in c["chapters"]:
                if x.get("id") == ch:
                    return x["title"], c["cls"], x["no"]
    return None


def pdf_url(cls, no):
    """Class 11 Part I = units 1-6 (kech1NN), Part II = 7-9 (kech2NN); Class 12 Part I = 1-5, Part II = 6-10."""
    split = 6 if cls == 11 else 5
    part, n = (1, no) if no <= split else (2, no - split)
    return f"https://ncert.nic.in/textbook/pdf/{'kech' if cls == 11 else 'lech'}{part}{n:02d}.pdf"


def new_bank(ch):
    if ch in OLD:
        cls, unit, title, syl, old = OLD[ch]
        return {"$schema": "../../docs/question-schema.json", "schemaVersion": 1, "chapter": ch, "subject": "chemistry",
                "class": cls, "unit": unit, "title": {"en": title}, "ncert_status": "lab_manual" if ch in LAB else "old_ncert_only",
                "syllabus_status": "dropped_2024" if syl == "dropped_2024" else "current", "oldNcert": old,
                "note": "Traced to the NCERT laboratory manual (NEET Unit 20), not a textbook chapter." if ch in LAB else "Not in the rationalised NCERT (2023+). Questions trace to the pre-2023 edition only.",
                "paragraphs": [], "questions": []}
    title, cls, no = catalog_title(ch)
    P = PARAS[ch]
    return {"$schema": "../../docs/question-schema.json", "schemaVersion": 1, "chapter": ch, "subject": "chemistry",
            "class": cls, "unit": no, "title": {"en": title},
            "ncertPdf": pdf_url(cls, no),
            "ncert_status": "in_ncert", "syllabus_status": "current",
            "paragraphs": [{k: v for k, v in {"id": p["id"], "title": p["title"], "hi": p.get("hi"), "pdfPage": p.get("pdfPage")}.items() if v} for p in P["paragraphs"]],
            "questions": []}


def entry_to_q(e):
    ch = e["ch"]
    exam = e.get("exam", "NEET")
    qid = f"{ch}-{'neet' if exam == 'NEET' else 'jee'}-{e['year']}-{slug(e['paper'])}"
    t = e.get("type", "single")
    en = {"status": "draft", "q": e["q"]}
    if t != "numerical":
        en["o"] = e["o"]
    if e.get("sol"):
        en["sol"] = e["sol"]
    answer = {"kind": "numeric", "value": e["ans"], "tol": e.get("tol", 0)} if t == "numerical" else {"kind": "single", "index": e["a"]}
    if e.get("also"):
        answer["alsoAccepted"] = e["also"]
    ncert = {"chapter": ch, "paras": e.get("paras", [])}
    if e.get("other"):
        ncert["otherChapters"] = e["other"]
    if e.get("oldRef"):
        ncert["oldRef"] = e["oldRef"]
    review = {}
    if e.get("key"):
        review["keyCheck"] = e["key"]
    if e.get("keySource"):
        review["keySource"] = e["keySource"]
    if e.get("note"):
        review["note"] = e["note"]
    bank_default = OLD.get(ch)
    q = {"id": qid, "type": t, "text": {"en": en, "hi": {"status": "missing"}}, "answer": answer, "ncert": ncert,
         "source": {"kind": "PYQ", "exam": exam, "year": e["year"], "paper": e["paper"]},
         "difficulty": 3, "difficultyBasis": "default", "timeSec": 60 if t != "numerical" else 150, "status": "draft",
         "ncert_status": e.get("ncert_status", ("lab_manual" if ch in LAB else "old_ncert_only") if bank_default else "in_ncert"),
         "syllabus_status": e.get("syllabus_status", "dropped_2024" if bank_default and bank_default[3] == "dropped_2024" else "current"),
         "review": review}
    if e.get("session"):
        q["source"]["session"] = e["session"]
    return q


def main():
    added = {}
    for path in sys.argv[1:]:
        for e in json.load(open(path, encoding="utf-8")):
            if e.get("dup"):
                continue
            q = entry_to_q(e)
            ch = e["ch"]
            bp = os.path.join(QDIR, ch + ".json")
            bank = json.load(open(bp, encoding="utf-8")) if os.path.exists(bp) else new_bank(ch)
            pid = {p["id"] for p in bank["paragraphs"]}
            bad = [p for p in q["ncert"]["paras"] if p not in pid]
            if bad:
                sys.exit(f"{q['id']}: unknown paragraph(s) {bad} in {ch}")
            old = next((x for x in bank["questions"] if x["id"] == q["id"]), None)
            if old:  # keep hand-made work
                if old["text"]["hi"]["status"] not in ("missing", "placeholder"):
                    q["text"]["hi"] = old["text"]["hi"]
                if old["text"]["en"].get("sol") and not q["text"]["en"].get("sol"):
                    q["text"]["en"]["sol"] = old["text"]["en"]["sol"]
                if old["status"] != "draft":
                    q["status"] = old["status"]
                # keep results of tools/apply_keys.py (official keys) and answers it accepted
                if "official key" in old.get("review", {}).get("keyCheck", "").lower():
                    for k in ("keyCheck", "keySource"):
                        q["review"][k] = old["review"][k]
                    if old["answer"].get("alsoAccepted") and q["answer"]["kind"] == "single":
                        q["answer"]["alsoAccepted"] = old["answer"]["alsoAccepted"]
                bank["questions"][bank["questions"].index(old)] = q
            else:
                bank["questions"].append(q)
            with open(bp, "w", encoding="utf-8") as f:
                json.dump(bank, f, ensure_ascii=False, indent=1)
                f.write("\n")
            added[ch] = added.get(ch, 0) + 1
    for ch, n in sorted(added.items()):
        print(f"{ch}: {n}")


if __name__ == "__main__":
    main()
