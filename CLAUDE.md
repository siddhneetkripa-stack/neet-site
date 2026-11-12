# NEET NCERT Mind Map site: working rules

> **Start here: read docs/BLUEPRINT.md first.** It is the agreed plan for the whole platform (bilingual NEET practice site with NCERT reader, PYQs, exam-screen test engine, analysis, counselling, school/coaching tie-ups). Work phase by phase as its section 11 says, keep prices configurable (not decided), and update its "Build status" section at the end of every session. The rules below still apply.

## Several Claude accounts work on this repo (owner's setup, Nov 2026)
The owner uses more than one Claude account on this repo and on neet-sources, so assume another session may be working in parallel.
- **Start of session:** `git fetch origin`; read `main`'s docs/BLUEPRINT.md "Build status", docs/research/, and the open `claude/*` branches
  (`git log origin/main..origin/<branch>`) to see what is in progress. Don't redo or contradict work that is already there; build on it.
- **Work on your own branch**, never directly on `main`. Rebase on `origin/main` before pushing; never force-push or rewrite a branch you didn't create.
- **Keep changes in your area.** Before editing a file another open branch also changes, check that branch and keep the edits small, to avoid merge conflicts.
  `data/` is built output: after a rebase, re-run `python3 tools/build.py` rather than hand-merging `data/` conflicts.
- **Hand-off lives in the repo, not in chat:** update "Build status" in BLUEPRINT.md (done / in progress / next, with the branch name)
  so the other account's session can pick up where you stopped.
- Merges to `main` (which publishes the site) happen only when the owner says so.

## What this site is
A free website for NEET aspirants. Its core is a **layered, clickable mind map of each NCERT chapter**: chapter → section → sub-section → paragraph. Every node has:
- a **synopsis written in our own words** (never copied NCERT text),
- key points, formulas and exam traps,
- **questions tied to that exact node** (practice now; verified PYQs later),
- a link to the page in the **official NCERT PDF** (linked, never hosted).

## Copyright rules (do not break)
- Never put NCERT PDFs, full scanned pages or long copied passages in this public repo. NCERT books stay in the private `neet-sources` repo.
- **Exception (owner's decision, Nov 2026): short cropped NCERT excerpts** may be shown under PYQ answers/hints, in `assets/ncert/<chapter>/`. Each excerpt must be only the few lines the question relies on (a definition, a rule, one worked relation), carry a caption with the NCERT section and page, and link to that page on ncert.nic.in. Generate them with `scripts/ncert_crop.py` in `neet-sources` (spec in `scripts/excerpts/<chapter>.json`); never hand-crop whole pages.
- Diagrams are redrawn originals (assets/diagrams.js), not copies of NCERT figures.
- Short labelled references ("NCERT p. 151, Eq 5.16") are fine. Long quotations are not.
- Questions adapted from NCERT exercises are tagged `"src": "NCERT Ex 5.x"`; write them in our own words.

## Structure
```
index.html                 single-page app (hash routes: #/, #/c/<chapter>, #/c/<chapter>/n/<node>, #/c/<chapter>/read, #/pyq/<chapter>)
assets/app.js              expanding tree (chapter → section → paragraph → detail card), inline questions, quiz pop-up, full-synopsis view
assets/style.css           styles (placeholder look; owner has a final design to apply later)
assets/diagrams.js         original SVG diagrams, referenced by node "diagram" key
assets/ncert/<chapter>/    short NCERT excerpt crops (webp) used by PYQ answers
content/pyq/<chapter>.json PYQs for a chapter, in NCERT section order
content/catalog.json       full NEET syllabus: all Class 11 & 12 PCB chapters
content/questions/<ch>.json question bank in the fixed format (docs/question-schema.json): bilingual, NCERT paragraph ids
content/tests/<id>.json    test definitions (sections, marking, duration, which bank questions)
exam.html + assets/exam.js exam-screen test engine (NTA-style CBT), reads data/tests/<id>.json; open exam.html?test=<id>
tools/convert_questions.py legacy content/pyq + mind-map questions → content/questions (keeps Hindi/status on re-run)
tools/add_pyqs.py          tagged PYQ batches (content/pyq-batches/*.json) → one bank file per NCERT chapter
tools/check_hindi.py       Hindi vs English: formulas/numbers identical; Hindi terms must be NCERT's (run by build.py)
content/ncert/chemistry-paragraphs.json  NCERT section ids per Chemistry chapter (starts new banks)
content/glossary/hi-terms-used.json      every Hindi term used in questions, verified against neet-sources NCERT Hindi text
content/questions/chem1x-old-*.json      NEET topics not in the rationalised NCERT (ncert_status old_ncert_only); chem12-lab-* = lab manual
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

## PYQ pages (content/pyq/<chapter>.json → route #/pyq/<chapter>)
- File has `paragraphs` (ordered NCERT paragraph list: `id` like "1.4.2" or "1.10.2c", `title`, `pages`) and `questions`.
- Goal: **every NCERT paragraph has at least one question** (the page is "NCERT in MCQs"). PYQs first; for paragraphs never asked,
  add 1–2 questions (2 only if they test different things) from NCERT exercises → NCERT Exemplar → our own (`exam`: "NCERT Exercise" |
  "NCERT Exemplar" | "Practice", `srcRef` names the exercise/question; reword in our own words; no `year`). Don't add more than needed —
  the question's job is to bring that NCERT paragraph onto the page.
- Each question: `exam` ("NEET" | "JEE Main" | the three above), `year` (PYQs only), `srcRef` (paper/shift it was read from), `paras` (paragraph ids it tests),
  `q`, `sol` (our own worked solution, HTML), `hint`, optional `trap`, `check` (only if compared with a published key),
  `otherChapters` (e.g. "Class 12 · Solutions"), `ncert` (excerpts `{img, page, label}`). JEE also has `date` and `when`.
  MCQ: `o` (4 options, original order) + `a`. Numerical: `type: "num"`, `ans`, optional `tol`.
- build.py groups questions: one paragraph → that paragraph's section (NEET first, then JEE by date);
  two or more paragraphs, or any `otherChapters` → "Multiple concepts" section at the end. Paragraphs with
  no question are listed as "Not asked yet". Order is NCERT order from `paragraphs`.
- Plain mole conversion does not count as a second concept. Concentration-term conversions (e.g. mass % → molarity) do.
- Exclude questions whose core is another chapter (colligative properties, electrolysis, redox titrations, Carius),
  or topics no longer in NCERT (ppm, hardness, volume strength, normality).
- Transcribe exactly from the paper; solve every question; if the official answer looks inconsistent, add `<p class='errata'>`.
- Paper sources and keys: `neet-sources/neet-papers/index.json`, `neet-sources/jee-main/index.json`.
  Extraction tools: `neet-sources/scripts/pyq-tools/`.

## Question bank rules (docs/question-schema.json)
- Hindi: use only NCERT's Hindi terms (neet-sources glossary or ncert-hi-text); add each new term to content/glossary/hi-terms-used.json;
  keep formulas, numbers and units identical to English; new Hindi is status "draft" until a proofreader passes it.
- Tag every question with `ncert_status` and `syllabus_status` (docs/research/02-neet-syllabus-ncert-map.md): p-Block → old_ncert_only
  (chem11-old-p-block / chem12-old-p-block); topics NEET dropped in 2024 → dropped_2024 (never in mocks); practical chemistry → lab_manual.
- Check answers against NTA final keys where neet-papers has them (match the copy's question order to the booklet code first).

## Biology chapters: required features (owner's decision, Nov 2026)
When building any Biology chapter (Class 11 or 12), these are part of the definition of done, not optional extras:
1. **Recent-trend markers.** Each NCERT paragraph shows how often it was asked and when last asked
   (e.g. "asked 6× · last 2025"), and paragraphs asked in the **last 3 NEET years** get a visible "recent" flag.
   Compute these in `tools/build.py` from the questions' `exam`/`year` (PYQs only; NCERT/Exemplar/Practice don't count),
   so the markers update automatically when papers are added.
2. **Personal weak-paragraph list.** Track answers per paragraph in the browser (same `progress` store, keyed by
   question id → paragraph via `paras`). Show a "Revise these paragraphs" list of paragraphs with wrong or
   unattempted questions, each linking to its section, and let the student retry only those questions.
   Works without login; storage may be unavailable, so the page must still work without it.
Build these into the shared PYQ/MCQ page code so they also appear on Chemistry/Physics pages, but they must be
in place before any Biology chapter is published.

## Adding a chapter
1. Put the NCERT PDF in `neet-sources` (private).
2. Create `content/<subject><class>-<slug>/chapter.json` (copy the thermodynamics one; set `ncertPdf` and `pdfPageOffset` = first printed page − 1).
3. Write section files, then set the chapter's `id` in `content/catalog.json` to match.
4. Run `python3 tools/build.py`, open the site locally (`python3 -m http.server`) and check map, synopsis and quiz.

## Hosting
GitHub Pages from the `main` branch, root folder. No build step on the server; commit the `data/` output.
