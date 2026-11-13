#!/usr/bin/env python3
"""Build NCERT paragraph-id lists (section / sub-section level) for a subject from the books in neet-sources.

    python3 tools/make_paragraphs.py biology ../neet-sources    -> content/ncert/biology-paragraphs.json
    python3 tools/make_paragraphs.py physics ../neet-sources    -> content/ncert/physics-paragraphs.json

English titles and pdfPage come from the English chapter PDFs (pdftotext, page by page); Hindi titles from the
same-numbered headings in neet-sources/ncert-hi-text (NCERT's own Hindi). Same layout as chemistry-paragraphs.json.
Ids stay at NCERT's section / sub-section level (e.g. 8.5.3); split finer in a chapter's own bank when needed.
Existing entries (hand edits, extra ids) are kept when the file is regenerated.
"""
import html, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFIX = {"biology": "bio", "physics": "phy", "chemistry": "chem"}
SMALL = {"and", "of", "in", "the", "a", "an", "to", "for", "with", "on", "by", "its", "at", "from", "as", "or"}


def tcase(s):
    if not s.isupper():
        return s
    out = []
    for i, w in enumerate(s.lower().split()):
        out.append(w if (i and w in SMALL) else w[:1].upper() + w[1:])
    return " ".join(out)


def xml_pages(pdf):
    xml = subprocess.run(["pdftohtml", "-xml", "-i", "-stdout", "-q", pdf], capture_output=True, text=True).stdout
    fonts = {m.group(1): float(m.group(2)) for m in re.finditer(r'<fontspec id="(\d+)" size="([\d.]+)"', xml)}
    for pm in re.finditer(r'<page number="(\d+)".*?</page>', xml, re.S):
        els = []
        for m in re.finditer(r'<text top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)" font="(\d+)">(.*?)</text>', pm.group(0)):
            raw = m.group(6)
            txt = html.unescape(re.sub(r"<[^>]+>", "", raw)).strip()
            if txt and int(m.group(3)) > 0:
                els.append({"top": int(m.group(1)), "left": int(m.group(2)), "h": int(m.group(4)),
                            "size": fonts.get(m.group(5), 0), "bold": "<b>" in raw, "t": txt})
        yield int(pm.group(1)), els


def clean(t):
    t = re.sub(r"\s+", " ", t).strip(" .:–-")
    t = t.replace("’", "'")
    t = re.sub(r"\b([A-Z]) (?=[A-Z]{2,})", r"\1", t)  # "O RGAN" -> "ORGAN" (drop-cap spacing)
    return t


def page_lines(pdf):
    n = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout).group(1))
    for p in range(1, n + 1):
        yield p, subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), pdf, "-"], capture_output=True, text=True).stdout.split("\n")


def fix_caps(t):
    # small-caps headings come out as "E UKARYOTIC CELLS" / "Ntroduction" doubles; repair the common forms
    t = re.sub(r"\b([A-Z]) ([A-Z]{2,})", r"\1\2", t)
    return t


def english_heads(pdf, no):
    rx = re.compile(rf"^\s*({no}\.\d{{1,2}}(?:\.\d{{1,2}})?)\s*(.*)$")
    stop = re.compile(r"^\s*(SUMMARY|Summary|EXERCISES|Exercises|POINTS TO PONDER|Points to Ponder)\s*$")
    heads, contents = {}, {}
    for p, lines in page_lines(pdf):
        done = False
        for i, ln in enumerate(lines):
            if p > 1 and stop.match(ln):
                done = True
                break
            m = rx.match(ln)
            if not m:
                continue
            pid, title = m.group(1), m.group(2).strip()
            j = i
            while not title and j + 1 < len(lines) and j - i < 2:
                j += 1
                title = lines[j].strip()
            title = fix_caps(title)
            lone = not m.group(2).strip()
            bad = (not title or not title[:1].isupper() or len(title) > 80 or re.search(r"[=×→]|\d{3,}", title)
                   or title.startswith(("Figure", "Table", "Fig.")) or rx.match(title))
            if bad:
                if lone and p > 1 and pid not in heads:   # number printed apart from its (graphic) title
                    heads[pid] = {"id": pid, "title": "", "pdfPage": p, "body": False}
                continue
            if title.isupper() and j + 1 < len(lines):
                nxt = lines[j + 1].strip()
                if nxt and nxt.isupper() and len(nxt) < 45 and not rx.match(nxt):
                    title += " " + fix_caps(nxt)
            elif p == 1 and j + 1 < len(lines):  # contents box wraps: "4.1 Basis of" / "Classification"
                nxt = lines[j + 1].strip()
                if nxt and len(nxt) < 30 and not rx.match(nxt) and not nxt.isupper() and title.split()[-1].lower() in SMALL | {"of", "the"}:
                    title += " " + nxt
            title = clean(title)
            if p == 1 and not title.isupper():
                contents.setdefault(pid, title)  # chapter-contents box (title case)
                continue
            cur = heads.get(pid)
            body = title.isupper() or pid.count(".") == 2
            if cur is None or not cur["title"] or (body and not cur["body"]):
                heads[pid] = {"id": pid, "title": tcase(title), "pdfPage": p, "body": body}
        if done:
            break
    for pid, t in contents.items():  # body upper-case heading wins; contents box fills the rest
        if pid in heads and not heads[pid]["body"]:
            heads[pid]["title"] = t
    # main sections must run in sequence: drop stray numbers far beyond the last good one
    mains = sorted((int(k.split(".")[1]) for k in heads if k.count(".") == 1))
    good, last = set(), 0
    for n in mains:
        if n - last <= 3:
            good.add(n)
            last = n
    return {k: v for k, v in heads.items() if int(k.split(".")[1]) in good}


def hindi_heads(txt_path, no, en_pages):
    if not os.path.exists(txt_path):
        return {}
    rx = re.compile(rf"^\s*({no}\.\d{{1,2}}(?:\.\d{{1,2}}){{0,2}})\s+(\S.*)$")
    cands, page = {}, 0
    for ln in open(txt_path, encoding="utf-8"):
        pm = re.match(r"=== page (\d+) ===", ln)
        if pm:
            page = int(pm.group(1))
            continue
        if re.match(r"^\s*(अभ्यास|सारांश)\s*$", ln):
            break
        m = rx.match(ln)
        if m and re.search(r"[\u0900-\u097F]", m.group(2)) and len(m.group(2)) < 90:
            cands.setdefault(m.group(1), []).append((page, clean(m.group(2))))
    out = {}
    for pid, lst in cands.items():
        target = en_pages.get(pid, 0)
        out[pid] = min(lst, key=lambda c: (abs(c[0] - target), -len(c[1])))[1]
    return out


def key(pid):
    return [int(x) for x in pid.split(".")]


def main():
    subj, src = sys.argv[1], sys.argv[2]
    idx = json.load(open(os.path.join(src, "ncert", "index.json"), encoding="utf-8"))
    idx = idx if isinstance(idx, list) else idx.get("files", [])
    outp = os.path.join(ROOT, "content", "ncert", f"{subj}-paragraphs.json")
    chapters = {}
    op = os.path.join(ROOT, "content", "ncert", "paragraph-overrides.json")
    global OVR
    OVR = json.load(open(op, encoding="utf-8")).get(subj, {}) if os.path.exists(op) else {}
    for e in sorted((e for e in idx if e.get("subject") == subj and e.get("chapter")), key=lambda e: (e["class"], e["chapter"])):
        cls, no = e["class"], e["chapter"]
        cid = f"{PREFIX[subj]}{cls}-{no:02d}"
        rel = e["file"].replace("ncert/", "", 1)
        eh = english_heads(os.path.join(src, e["file"]), no)
        hh = hindi_heads(os.path.join(src, "ncert-hi-text", rel.replace(".pdf", ".txt")), no, {k: v["pdfPage"] for k, v in eh.items()})
        # drop ids whose parent section is missing and that look like stray numbers (e.g. "8.12" in a figure caption)
        mains = {k for k in eh if k.count(".") == 1}
        paras = []
        for pid in sorted(eh, key=key):
            if pid.count(".") == 2 and pid.rsplit(".", 1)[0] not in mains:
                continue
            h = eh[pid]
            p = {"id": pid, "title": h["title"]}
            if hh.get(pid):
                p["hi"] = hh[pid]
            p["pdfPage"] = h["pdfPage"]
            paras.append(p)
        ov = dict(OVR.get(cid, {}))
        if ov.pop("__complete__", False):
            paras = [p for p in paras if p["id"] in ov]
        for pid, t in ov.items():  # hand fixes: content/ncert/paragraph-overrides.json
            hit = next((p for p in paras if p["id"] == pid), None)
            if t is None:
                paras = [p for p in paras if p["id"] != pid]
            elif hit:
                hit["title"] = t
            else:
                par = next((p for p in sorted(paras, key=lambda p: key(p["id"])) if key(p["id"]) < key(pid)), None)
                par = [p for p in paras if key(p["id"]) < key(pid)]
                new = {"id": pid, "title": t}
                if hh.get(pid):
                    new["hi"] = hh[pid]
                new["pdfPage"] = max(par, key=lambda p: key(p["id"])).get("pdfPage") if par else 1
                paras.append(new)
        have = {p["id"] for p in paras}

        paras.sort(key=lambda p: key(re.sub(r"[a-z]$", "", p["id"])))
        chapters[cid] = {"pdf": rel, "title": e.get("title"), "paragraphs": paras}
        print(cid, len(paras), e.get("title"))
    doc = {"description": f"NCERT (rationalised, 2023+) {subj.title()} paragraph ids per chapter, from the section headings of the English books in neet-sources (tools/make_paragraphs.py); Hindi titles from the same-numbered headings in neet-sources/ncert-hi-text. Used by tools/add_pyqs.py to start a chapter's question bank. Sub-paragraph ids may be added in a chapter's own bank.",
           "chapters": chapters}
    with open(outp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")


if __name__ == "__main__":
    main()
