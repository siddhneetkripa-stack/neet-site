# NEET NCERT Mind Map site: working rules

## What this site is
A free website for NEET aspirants. Its core is a **layered, clickable mind map of each NCERT chapter**: chapter → section → sub-section → paragraph. Every node has:
- a **synopsis written in our own words** (never copied NCERT text),
- key points, formulas and exam traps,
- **questions tied to that exact node** (practice now; verified PYQs later),
- a link to the page in the **official NCERT PDF** (linked, never hosted).

## Copyright rules (do not break)
- Never put NCERT PDFs, scanned pages or copied paragraphs in this public repo. NCERT books stay in the private `neet-sources` repo.
- Diagrams are redrawn originals (assets/diagrams.js), not copies of NCERT figures.
- Short labelled references ("NCERT p. 151, Eq 5.16") are fine. Long quotations are not.
- Questions adapted from NCERT exercises are tagged `"src": "NCERT Ex 5.x"`; write them in our own words.

## Structure
```
index.html                 single-page app (hash routes: #/, #/c/<chapter>, #/c/<chapter>/n/<node>, #/c/<chapter>/read)
assets/app.js              map, synopsis panel, quiz, full-synopsis view
assets/style.css           styles (placeholder look; owner has a final design to apply later)
assets/diagrams.js         original SVG diagrams, referenced by node "diagram" key
content/catalog.json       full NEET syllabus: all Class 11 & 12 PCB chapters
content/<chapter-id>/      chapter.json (meta) + 01-…json, 02-…json section files (authoring source)
data/                      BUILT output; do not hand-edit. Run: python3 tools/build.py
tools/build.py             merges content → data, validates ids/questions, tags NCERT-exercise sources
```

## Node format (content/<chapter>/NN-*.json)
```json
{ "id": "unique-kebab-id", "title": "Full title", "short": "Map label (≤ 3 words)",
  "pages": [151, 152], "ref": "5.4 (e) · Eq 5.16", "diagram": "hess",
  "synopsis": "<p>HTML in our own words…</p>", "points": [], "formulas": ["ΔU = q + w"], "traps": [],
  "children": [ …nodes… ],
  "questions": [ { "q": "…", "o": ["A","B","C","D"], "a": 1, "e": "explanation", "lvl": "easy|medium|hard", "src": "Practice" } ] }
```
- One leaf node per NCERT paragraph / figure / worked problem group. Branches follow NCERT section numbering.
- Questions: exactly 4 options, `a` = index of the correct one (options are shuffled at runtime).
- Check every numerical answer by actually computing it. Flag NCERT misprints in a `<p class='errata'>` block.
- PYQs: add `"pyq": ["NEET 2021"]` **only after verifying against the official paper**. Never guess years.

## Adding a chapter
1. Put the NCERT PDF in `neet-sources` (private).
2. Create `content/<subject><class>-<slug>/chapter.json` (copy the thermodynamics one; set `ncertPdf` and `pdfPageOffset` = first printed page − 1).
3. Write section files, then set the chapter's `id` in `content/catalog.json` to match.
4. Run `python3 tools/build.py`, open the site locally (`python3 -m http.server`) and check map, synopsis and quiz.

## Hosting
GitHub Pages from the `main` branch, root folder. No build step on the server; commit the `data/` output.
