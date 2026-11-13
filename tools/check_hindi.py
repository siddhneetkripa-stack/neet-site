#!/usr/bin/env python3
"""Check Hindi question text against English and against NCERT's Hindi terms.

    python3 tools/check_hindi.py [content/questions/<chapter>.json ...] [--sources ../neet-sources]

For every question whose text.hi has real text (status draft / checked / proofread):
 1. Invariants: chemical formulas, numbers, units and symbols must be identical in English and Hindi
    (compared field by field: q, each option, sol, hint, trap). Any difference is an ERROR.
 2. Terms (needs neet-sources): every Hindi term listed in content/glossary/hi-terms-used.json must
    occur in NCERT's Hindi text (neet-sources/ncert-hi-text) or in glossary/hi-terms.json; and when the
    English text uses a listed English term, the Hindi text should use its Hindi term (WARN if not).
Exit code 1 on any ERROR.
"""
import json, os, re, sys, glob, html
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = {"g", "kg", "mg", "mol", "L", "mL", "dm", "cm", "m", "K", "atm", "bar", "u", "s", "J", "kJ", "M", "m", "Pa", "kPa",
         "nm", "pm", "Hz", "V", "A", "C", "W", "°C", "min", "h", "ppm", "N"}
# English words that look like symbols; dropped on both sides (so single-letter labels like "A" are not compared).
STOP = {"A", "An", "At", "In", "Of", "If", "It", "Is", "On", "Or", "To", "So", "No", "As", "Be", "By", "Do", "We", "I", "s", "OR", "AND", "NOT", "IE", "EN", "MO", "FC", "Up", "VSEPR", "Le", "II", "III", "IV", "V", "VI", "-I", "-II", "-III", "-IV"}
SUBS = str.maketrans("₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺", "01234567890123456789-+")


def plain(s):
    s = re.sub(r"<(sub|sup)>(.*?)</\1>", lambda m: m.group(2), s or "")
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s).translate(SUBS).replace("−", "-").replace("–", "-")
    s = re.sub(r"[’']s\b", "", s)
    s = re.sub(r"(?<![A-Za-z])[omp]-(?=[A-Za-z\u0900-\u097F])", " ", s)  # o-/m-/p- prefixes
    s = re.sub(r"(?<=[A-Za-z])-(?=[a-z]{2,})", " ", s)        # U-tube -> U tube
    s = re.sub(r"(?<=[A-Za-z])-(?=[\u0900-\u0963\u0966-\u097F])", " ", s)  # not before the danda       # U-नली -> U नली
    s = s.replace("%", " % ")
    s = re.sub(r"(?<=\d)-(?=[A-Za-z\u0900-\u097F]{2})", " ", s)    # 1,4-dichlorobenzene / 1,4-डाइक्लोरो...
    s = re.sub(r"(?<=[a-z\u0900-\u097F]{2})/", " / ", s)          # diamond/SiC, हीरा/SiC
    return s


def invariants(s):
    """Formula / number / unit / symbol tokens: anything that must not change between languages."""
    toks = re.findall(r"[A-Za-z0-9.()\[\]+\-×/%°±→⇌∝=:;≈<>Δ·]+", plain(s))
    out = []
    for t in toks:
        t = t.strip(".,;:()[]")
        if not t or t in STOP or re.fullmatch(r"\d+(st|nd|rd|th)", t):
            continue
        core = re.sub(r"[^A-Za-z0-9]", "", t)
        if not core and t not in ("%", "→", "×", "=", "∝", "Δ", "⇌", "≈"):
            continue
        letters = re.sub(r"[^A-Za-z]", "", t)
        if re.search(r"\d", t) or t in UNITS or t in ("%", "→", "×", "=", "∝", "Δ", "⇌", "≈"):
            out.append(t)
        elif letters and re.fullmatch(r"[A-Z][A-Za-z]{0,1}([A-Z][a-z]?)*", letters) and not re.fullmatch(r"[A-Z][a-z]{2,}", letters):
            out.append(t)  # formulas / symbols / abbreviations: CO, KOH, NaOH, NTA, STP, Li, HCOOH
    return Counter(out)


def load_terms(sources):
    path = os.path.join(ROOT, "content", "glossary", "hi-terms-used.json")
    terms = json.load(open(path, encoding="utf-8"))["terms"] if os.path.exists(path) else []
    if not sources:
        return terms, None
    corpus = ""
    for f in glob.glob(os.path.join(sources, "ncert-hi-text", "class1*", "*", "*.txt")):
        corpus += open(f, encoding="utf-8").read()
    gl = json.load(open(os.path.join(sources, "glossary", "hi-terms.json"), encoding="utf-8"))
    glhi = {t["hi"] for c in gl["chapters"] for t in c["terms"]}
    return terms, (corpus, glhi)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sources = None
    if "--sources" in sys.argv:
        sources = sys.argv[sys.argv.index("--sources") + 1]
        args = [a for a in args if a != sources]
    elif os.path.isdir(os.path.join(ROOT, "..", "neet-sources", "ncert-hi-text")):
        sources = os.path.join(ROOT, "..", "neet-sources")
    files = args or sorted(glob.glob(os.path.join(ROOT, "content", "questions", "*.json")))
    terms, ref = load_terms(sources)
    errors = warns = 0
    if ref:
        corpus, glhi = ref
        for t in terms:
            if t["hi"] not in corpus and t["hi"] not in glhi:
                print(f"ERROR term not found in NCERT Hindi text or glossary: {t['en']} = {t['hi']}")
                errors += 1
    else:
        print("(neet-sources not found: NCERT term check skipped)")
    checked = 0
    for f in files:
        bank = json.load(open(f, encoding="utf-8"))
        for q in bank["questions"]:
            en, hi = q["text"]["en"], q["text"]["hi"]
            if hi.get("status") in (None, "missing", "placeholder"):
                continue
            checked += 1
            fields = [("q", en.get("q"), hi.get("q")), ("sol", en.get("sol"), hi.get("sol")),
                      ("hint", en.get("hint"), hi.get("hint")), ("trap", en.get("trap"), hi.get("trap"))]
            fields += [(f"o{i + 1}", a, b) for i, (a, b) in enumerate(zip(en.get("o", []), hi.get("o", [])))]
            if len(en.get("o", [])) != len(hi.get("o", [])):
                print(f"ERROR {q['id']}: option count differs"); errors += 1
            for name, a, b in fields:
                if bool(a) != bool(b):
                    print(f"ERROR {q['id']} {name}: present in only one language"); errors += 1
                    continue
                if not a:
                    continue
                ia, ib = invariants(a), invariants(b)
                if ia != ib:
                    print(f"ERROR {q['id']} {name}: formulas/numbers differ  en-only {dict(ia - ib)}  hi-only {dict(ib - ia)}")
                    errors += 1
            ent = plain(" ".join(x for _, x, _ in fields if x)).lower()
            hit = plain(" ".join(x for _, _, x in fields if x))
            for t in terms:
                if t.get("check", True) and re.search(r"\b" + re.escape(t["en"].lower()) + r"\b", ent) and t["hi"] not in hit \
                        and not any(v in hit for v in t.get("variants", [])):
                    print(f"WARN  {q['id']}: English uses '{t['en']}' but Hindi lacks '{t['hi']}'")
                    warns += 1
    print(f"{checked} Hindi questions checked: {errors} errors, {warns} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
