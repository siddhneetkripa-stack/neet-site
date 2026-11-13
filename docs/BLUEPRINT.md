# NEET Platform — Website Blueprint

Status: agreed by Vimal on 12 Nov 2026, except prices and fees (not decided; see section 10).
Source of truth for building this site. Every Claude / AI session working on neet-site or neet-sources reads this file first, works phase by phase (section 11), and updates "Build status" at the end of each session.

## Build status (update every session)

- neet-sources: NCERT Class 11–12 Physics, Chemistry, Biology in English (ncert/) and Hindi (ncert-hi/, Kruti Dev font, 79 chapters); NEET papers 2013–2026; JEE Main papers 2020–2026; repo_tool verify/fetch.
- neet-site: NCERT MindMap prototype — Chemistry 11 Unit 5 Thermodynamics (72 nodes, 116 questions); PYQs for Chemistry 11 Unit 1 (17 NEET + 63 JEE Main) in NCERT order.
- Phase 0 (12 Nov 2026):
  - Question format fixed: `docs/question-schema.json` (v1). Bilingual `text.en` / `text.hi` with a status per language (missing, placeholder, draft, checked, proofread), answer (single / numeric with tolerance), NCERT chapter + paragraph ids + NCERT lines (excerpt images), source (PYQ exam/year/shift, NCERT Exercise, Exemplar, Own, AI), type, difficulty 1–5, time estimate, media, status (draft/checked/live/flagged), review record. `tools/build.py` validates every bank file against it.
  - Converted: `content/questions/chem11-01.json` (103: 80 PYQs + 23 NCERT/Exemplar/practice) and `content/questions/chem11-thermodynamics.json` (116). Hindi is a marked placeholder in all of them (status `placeholder`), pending the glossary.
  - Exam-screen engine prototype: `exam.html` (+ `assets/exam.js`, `assets/exam.css`), first test `content/tests/chem11-01-pyq.json` = all 80 Unit 1 PYQs (Section A 42 MCQ, Section B 38 numerical, 150 min, +4/−1). NTA palette (5 states), countdown, Save & Next / Clear / Save & Mark / Mark & Next (unsaved choices are dropped, as in the real exam), Hindi/English per question, on-screen numeric keypad, autosave + resume after reload, submit summary, result with score, section table, changed answers (wrong→right / right→wrong), time per question, question-wise review with solutions and NCERT excerpts. Tested on PC and phone widths.
  - Branch `claude/festive-planck-y4u7f1` (not yet merged to `main`). "Mark for Review & Next" keeps a selected answer (NTA wording, research finding 3); switchable per test with `rules.markNextSavesAnswer` until the NEET 2027 bulletin confirms. Check the rest against docs/research/01-nta-cbt-screen-spec.md once that file is in the repo.
  - Prototype limits: no backend, so timer and answer key live in the browser; the reader/PYQ pages still read the legacy files (content/pyq, mind-map section files), and the bank is regenerated from them with `tools/convert_questions.py` until those pages move to the bank.
- Phase 0, session 2 (13 Nov 2026), branch `claude/phase0-hindi-pyq-tagging` (from `claude/festive-planck-y4u7f1`; not merged to `main`):
  - neet-sources now has the glossary (`glossary/hi-terms.json`, 2,673 pairs) and Unicode Hindi NCERT text (`ncert-hi-text/`).
  - **Hindi for the 80 Unit 1 PYQs**: `text.hi` (question, options, solution, hint, trap) in `content/questions/chem11-01.json`, status `draft` (not proofread). Every Hindi term used is listed in `content/glossary/hi-terms-used.json` and verified to occur in NCERT's Hindi books or the glossary; words NCERT has no term for (yield, concordant reading, blast furnace, Assertion/Reason wording, a few compound names) are listed there under `noNcertTerm` for the proofreader. `tools/check_hindi.py` (run by `build.py`) checks that formulas, numbers and units are identical in both languages: 80/80 pass. Exam screen checked in Hindi and English at 375 px and PC width, incl. subscripts in options and the result page; draft Hindi carries a "हिंदी प्रारूप · प्रूफ़रीडिंग बाकी" tag.
  - **Schema v1.1**: `ncert_status` (in_ncert / old_ncert_only / lab_manual / outside_ncert), `syllabus_status` (current / dropped_2024), `answer.alsoAccepted` (keys like "1,2"), `ncert.oldRef`, paragraph `pdfPage`; solution required only once a question is checked/live. Mocks never include `dropped_2024` questions.
  - **NCERT paragraph ids** for the 17 other current Chemistry chapters: `content/ncert/chemistry-paragraphs.json` (from the English books' headings; Hindi titles from the glossary). Ids are section/sub-section level (e.g. 4.3.6); split into finer paragraphs when a chapter's page is built.
  - **NEET Chemistry PYQs tagged** (one bank file per chapter, `content/questions/<chapter>.json`, added with `tools/add_pyqs.py` from `content/pyq-batches/neet-<year>-chemistry.json`): 274 new questions = 2020 (44, Code F3), 2021 (49, Code P3), 2023 (49), 2024 (47), 2025 (43, Code 45), 2026 (42); Unit 1 questions already in the bank are skipped. 218 in_ncert, 50 old_ncert_only (p-Block and other dropped chapters), 6 lab_manual; 34 dropped_2024. Old-NCERT banks: `chem11-old-p-block`, `chem12-old-p-block`, `chem11-old-hydrogen`, `chem11-old-s-block`, `chem11-old-states-of-matter`, `chem11-old-environmental-chemistry`, `chem12-old-solid-state`, `chem12-old-surface-chemistry`, `chem12-old-metallurgy`, `chem12-old-polymers`, `chem12-old-everyday-life`; lab: `chem12-lab-practical-chemistry`.
  - Answers: 2020, 2021, 2025 checked against the NTA final keys in neet-sources (copy order matched to the booklet code); 2023, 2024, 2026 against the copies' printed keys plus our own solving (no usable NTA key: 2026's Codes 11–14 key needs the Code 13 booklet to map question order). One conflict: NEET 2025 Code 45 Q69 (vitamins) — NTA key says option 2, the correct matching is option 1 in the eSaral copy; flagged in the question's `review.note`.
  - All new questions are `status: draft`: English transcribed from the copies (formulas checked against page images), Hindi `missing`, no solution yet. 25 are `type: diagram` (structures/graphs written as text) and need redrawn figures; clipped options in eSaral copies are noted per question. None appear on the site or in tests until checked.
- Phase 0, session 3 (13 Nov 2026), same branch `claude/phase0-hindi-pyq-tagging`:
  - Review fixes: KCl assertion stem (JEE Main 27 Jun 2022 S1) restored "is 'x' g mL⁻¹" in EN + HI (the eSaral copy drops it; other published copies have it); `__pycache__/` untracked and git-ignored.
  - Exam screen language: NTA's official mock (nta.ac.in/Quiz, JEE Main paper, Hindi chosen) shows Hindi question text and Hindi instructions, but buttons, palette legend and header stay English. Our screen already matches, so no Hindi button labels were added (noted in assets/exam.js).
  - PYQ tagging progress, per year:
    - NEET 2019 (Code S2, Motion copy): 44 tagged (+1 already in Unit 1). Answers = the copy's key + our solving (no NTA key in neet-sources); Q159 accepts (3) and (4) as printed.
    - NEET 2017 (Code A, official bilingual CBSE booklet): 44 tagged (+1 in Unit 1); answers checked against the published Code A key, all agree (Q50 key accepts 1 and 4). The booklet prints NTA/CBSE's own Hindi for every question, a source for `text.hi` later.
    - NEET 2016 Phase 1 (Code A booklet + Aakash solutions): 45 tagged. Answers = the solutions' key + our solving (no official key in neet-sources); Q51 and Q53 keys accept two options; Q71 was a bonus (correct product CaCN2 not offered) — kept with a placeholder answer and a note, never for tests. Q63, Q72, Q84 are `outside_ncert` (acetonide formation, Clausius–Clapeyron, atropisomerism).
    - NEET 2016 Phase 2 (Code AA questions-with-solutions copy): 45 tagged, incl. Q59 into the Unit 1 bank (`chem11-01`). Answers = the copy's key + our solving. Questionable keys flagged in notes: Q71 (XeF4 'octahedral'), Q77 (biphenyl coplanar), Q90 (allylic bromination); 7 questions `outside_ncert` (trans effect, Jahn–Teller, pyrrole, nitroalkanes + HNO2, bridgehead tautomerism, Q52-type derivations noted).
    - NEET 2015 (AIPMT re-exam, official bilingual Code D booklet + solutions copy): 45 tagged, 5 of them into the Unit 1 bank (Q93, 94, 96, 108, 116). Answers = the solutions' key + our solving; 6 answers the copy does not print were solved by us (noted). Q126 (Ti orbital order) flagged: key (4) vs a case for (3). Q99 `outside_ncert`.
    - NEET 2018 (Code AA, scanned official bilingual booklet: OCR to locate questions, text read from page images): 43 tagged (+2 already in Unit 1). Answers checked against the published Code AA key, all agree (Q65 key marked with an asterisk; option 2 also correct, accepted).
    - NEET 2022 (Code T2, scanned eSaral copy, read from page images): 48 tagged (+2 already in Unit 1). Answers = the copy's key + our solving; Q97 was a bonus (E°cell misprinted as 10.5 V; 0.9615 V if 1.05 V intended) — kept with a note, never for tests.
  - **All NEET Chemistry papers in neet-sources (2015–2026, incl. both 2016 phases) are now tagged: 605 questions in the bank** (2015 45, 2016 90, 2017–2020 45 each, 2021–2024 50 each, 2025–2026 45 each). Of the 588 newly drafted ones: 433 in_ncert, 140 old_ncert_only, 9 outside_ncert, 6 lab_manual; 92 dropped_2024; 47 diagram questions needing redrawn figures. Two bonus questions (2016-P1 Q71, 2022 Q97) must stay out of tests.
- Phase 0, session 5 (13 Nov 2026), branch `claude/phy-bio-pyq-tagging` (from `claude/phase0-hindi-pyq-tagging`; not merged to `main`): NEET Biology and Physics PYQs.
  - NCERT paragraph ids for Biology and Physics: `content/ncert/biology-paragraphs.json` (380 ids) and `physics-paragraphs.json`, made by `tools/make_paragraphs.py` from the English books in neet-sources (Hindi titles from `ncert-hi-text`); hand fixes in `content/ncert/paragraph-overrides.json`. Physics list still needs the same hand check as Biology (exercise numbers and wrapped headings).
  - `tools/add_pyqs.py` now handles all three subjects (`--chapter` adds one chapter at a time); old-NCERT Biology banks: `bio11-old-transport-in-plants`, `bio11-old-mineral-nutrition`, `bio11-old-digestion-and-absorption`, `bio12-old-reproduction-in-organisms` (still in NEET), `bio12-old-food-production`, `bio12-old-environmental-issues`. Topics dropped inside current chapters (animal tissues, cockroach/earthworm, secondary growth, photoperiodism, eye/ear, succession, nutrient cycling…) stay in the current chapter bank with `ncert_status: old_ncert_only` and an `oldRef`.
  - Official keys added to `content/keys/neet-official-keys.json`: CBSE 2017 Code A, CBSE 2018 Code AA, NTA 2020 F3, NTA 2021 P3, NTA 2025 Code 45 (all 180/200); 2026 Code 13 key mapped to the eSaral Biology copy order (mapping in the key note).
  - Biology batches (`content/pyq-batches/neet-<year>-biology.json`, all papers 2015–2026, 1,210 questions) tagged to NCERT paragraphs; every question solved while tagging. Hindi and solutions not written yet for these.
  - Hindi source text: neet-sources `ncert-hi-text/` already holds all Physics (14+14) and Biology (19+13) chapters in Unicode (made in an earlier session), so nothing new was needed there.
  - Chapter banks pushed (one commit per chapter; "ready for solutions" = tagged + key-checked, no solutions/Hindi yet):
    - bio11-01 tagged, 10 questions, ready for solutions (2 old_ncert_only; 1 outside_ncert; 9 checked against official keys, 1 against the copy's key + our solving)
    - bio11-02 tagged, 36 questions, ready for solutions (1 outside_ncert; 31 checked against official keys, 5 against the copy's key + our solving)
    - bio11-03 tagged, 32 questions, ready for solutions (3 old_ncert_only; 1 outside_ncert; 25 checked against official keys, 7 against the copy's key + our solving; key differs: 2025 Code 45 Q162)
    - bio11-04 tagged, 42 questions, ready for solutions (31 checked against official keys, 11 against the copy's key + our solving)
    - bio11-05 tagged, 42 questions, ready for solutions (1 old_ncert_only; 2 outside_ncert; 4 diagram; 31 checked against official keys, 11 against the copy's key + our solving)
    - bio11-06 tagged, 32 questions, ready for solutions (16 old_ncert_only; 15 dropped_2024; 1 diagram; 23 checked against official keys, 9 against the copy's key + our solving; bonus: 2022 Code T2 Q101)
    - bio11-07 tagged, 32 questions, ready for solutions (25 old_ncert_only; 13 dropped_2024; 22 checked against official keys, 10 against the copy's key + our solving)
    - bio11-08 tagged, 47 questions, ready for solutions (4 outside_ncert; 39 checked against official keys, 8 against the copy's key + our solving; key differs: 2025 Code 45 Q121)
    - bio11-09 tagged, 45 questions, ready for solutions (3 outside_ncert; 2 diagram; 32 checked against official keys, 13 against the copy's key + our solving)
    - bio11-10 tagged, 38 questions, ready for solutions (2 outside_ncert; 24 checked against official keys, 14 against the copy's key + our solving)
    - bio11-11 tagged, 29 questions, ready for solutions (3 outside_ncert; 19 checked against official keys, 10 against the copy's key + our solving)
    - bio11-12 tagged, 18 questions, ready for solutions (12 checked against official keys, 6 against the copy's key + our solving)
    - bio11-13 tagged, 27 questions, ready for solutions (4 old_ncert_only; 4 dropped_2024; 18 checked against official keys, 9 against the copy's key + our solving)
    - bio11-14 tagged, 25 questions, ready for solutions (1 outside_ncert; 20 checked against official keys, 5 against the copy's key + our solving)
    - bio11-15 tagged, 26 questions, ready for solutions (1 outside_ncert; 20 checked against official keys, 6 against the copy's key + our solving)
    - bio11-16 tagged, 18 questions, ready for solutions (3 outside_ncert; 1 diagram; 13 checked against official keys, 5 against the copy's key + our solving)
    - bio11-17 tagged, 27 questions, ready for solutions (1 outside_ncert; 1 diagram; 19 checked against official keys, 8 against the copy's key + our solving)
    - bio11-18 tagged, 19 questions, ready for solutions (8 old_ncert_only; 1 outside_ncert; 8 dropped_2024; 14 checked against official keys, 5 against the copy's key + our solving)
    - bio11-19 tagged, 31 questions, ready for solutions (3 outside_ncert; 25 checked against official keys, 6 against the copy's key + our solving)
    - bio11-old-transport-in-plants tagged, 18 questions, ready for solutions (17 old_ncert_only; 1 outside_ncert; 18 dropped_2024; 12 checked against official keys, 6 against the copy's key + our solving)
- Left / next:
  - NEET Chemistry tagging is complete for 2015–2026. Next papers: older AIPMT (2013–2014, if added to neet-sources), then NEET Physics and Biology the same way (render pages with `pdftoppm -r 80`, read them, write a batch in `content/pyq-batches/`, run `tools/add_pyqs.py`, then `tools/build.py`; OCR needs `apt-get install tesseract-ocr`, `pip install pymupdf`).
  - Official keys (session 4, 13 Nov 2026): parsed into `content/keys/neet-official-keys.json`, applied with `tools/apply_keys.py` (records `review.keyCheck`/`keySource`; never changes answers silently). Now checked against official keys: 2015 (CBSE, Code D), 2016 P1 (A) and P2 (AA) (CBSE), 2017 (A), 2018 (AA), 2019 (NTA final, S2), 2020 (F3), 2021 (P3), 2025 (45), 2026 (Code 13 key, question order mapped via the booklet scan). Corrected to the official key: 2019 Q140 (30 J), 2016-P2 Q71 (square planar sp3d2) and Q79, 2015 Q118, 2026 Q54 (pink→colourless); dropped by NTA: 2019 Q159; bonus: 2016-P1 Q71. Key PDFs used are copies on cdn1.byjus.com (URLs in the key file); they are not yet in neet-sources (this session had read-only access to it) — add them with repo_tool. Still without an official key: 2022, 2023, 2024 (NTA portals not reachable from here; Byju's has only coaching Q&A copies for 2022); 2025 Q69 conflict still open.
  - Hindi for the new PYQs: the 2015, 2017 and 2018 booklets are official bilingual papers with NTA/CBSE's own Hindi printed beside each question — transcribe that Hindi rather than translating.
  - Check 2026 answers against the official Code 13 booklet scan; check the 2025 Q69 conflict and the clipped options against official booklets.
  - Worked solutions + draft Hindi for the newly tagged PYQs: **done for all 588** (branch `claude/phase0-hindi-pyq-tagging`). Source files `content/solutions/<chapter>.json` (id → en sol/hint/trap + hi q/o/sol/hint), merged with `python3 tools/add_solutions.py content/solutions/<file>.json` (re-runnable). Every numeric answer was recomputed; Hindi terms come from neet-sources `ncert-hi-text`; `tools/check_hindi.py` passes with 0 errors / 0 warnings on 668 Hindi questions (tokenizer now handles IUPAC locants, arrows, `X/liquid`, `aryl-O`, accented names, emphasis words like INCORRECT). Hindi for the old-NCERT banks (chem11-old-*, chem12-old-*, lab) could not be checked against an old NCERT Hindi edition (not in neet-sources); proofread those terms first. Questionable official keys are flagged in `<p class='errata'>` (2018 Q50 halogens, 2016-P2 Q77 biphenyl and Q79 pyrrole, 2016-P2 Q73 trans-effect wording, 2019 Q159 dropped, bonus 2016-P1 Q71 and 2022 Q97). All new Hindi is `draft`.
  - Next: NEET Physics and Biology PYQs (2015–2026) the same way (tag → batch → add_pyqs → keys → solutions + Hindi).
  - Redrawn figures for the 47 diagram questions; then move the new PYQs from `draft` to `checked`.
  - Hindi proofreading of the 80 Unit 1 PYQs (status `draft` → `proofread`); the Phase 0 gate ("works in Hindi and English on phone and PC") is met technically with draft Hindi.
  - Move the Reader / PYQ pages to read the bank files (Phase 1), then retire `tools/convert_questions.py`.
  - Content pipeline (two-model check, Hindi review queue).

## 1. Vision and positioning

A bilingual (Hindi + English) NEET practice platform built on one idea: every NEET question comes from an NCERT line, so every question, test and report on the site points back to that line. It sits beside coaching, not against it: students keep their institute; we give them the exam-screen practice, NCERT-anchored analysis and counselling their institute does not.

- Who: NEET aspirants in Sikar first (Class 11, 12, droppers), then Rajasthan, then Hindi-belt India.
- The bet: NEET moves to computer-based testing (announced for 2027; may slip to 2028). Students who have practised on the real screen lose fewer marks to the format. The platform is useful in both cases, because NCERT-anchored practice works on paper too.
- Goal: 10,000 active students (10% of Sikar's ~1 lakh) by NEET 2028, through individual sign-ups plus school and small-coaching tie-ups.
- Brand: a new, separate brand (name decided later); not VKC, not linked to GCI. Never put Vimal's name, VKC or GCI anywhere on this site.
- Later scope: NEET counselling, then JEE Main on the same engine.

## 2. Users and roles

Six roles share one login system; each sees only what its role needs.

| Role | What they do on the site | Pays? |
| --- | --- | --- |
| Student | Read NCERT with PYQs, practise, take exam-screen mocks, see analysis | Free tier; paid pass |
| Parent | Weekly WhatsApp/SMS report; read-only progress page | Usually the payer |
| School | Scheduled mocks in its lab; teacher dashboard; term reports | Per student |
| Small coaching | Our tests and question bank under its own name; batch analytics | Per student or flat fee |
| Counselling client | Rank-to-college predictor, choice-filling help, 1:1 sessions | Counselling pack |
| Admin / content team | Adds and checks questions, reviews error reports, manages partners | Internal |

## 3. Site map and modules

Nine modules, all fed by one question bank and one NCERT map. Modules 1–5 are the student core; 6–9 come in later phases.

1. NCERT Reader (free) — every chapter of Class 11–12 Physics, Chemistry, Biology as a tree: chapter → topic → paragraph.
   - Each paragraph: plain-language synopsis, key points, formulas, exam traps, link to the exact page on ncert.nic.in.
   - Side panel: every PYQ ever asked from that paragraph, with year and exam.
   - Hindi / English toggle per paragraph; NCERT's own Hindi terms.
2. PYQ Explorer (free core) — NEET 2013–2026 and JEE Main (Chemistry/Physics) PYQs in NCERT order.
   - Filters: subject, chapter, year, difficulty, type (statement, assertion-reason, match, diagram, numerical).
   - After answering: worked solution plus the exact NCERT lines the question is built on.
   - Heatmap per chapter: which paragraphs NEET asks from most.
3. Exam-screen Test Engine (CBT simulator) — looks and behaves like NTA's computer-based screen.
   - Question palette with NTA colours (not visited, not answered, answered, marked for review, answered + marked).
   - Server-synced countdown, section switching, Hindi/English switch per question, mouse-only answering.
   - Test types: chapter test, part syllabus, full mock (180 Q / 200 min, current pattern), PYQ paper replay, custom test.
   - Resumes after a power cut or network drop; autosaves every answer.
   - Paper-pattern (OMR-style) mode in case CBT is delayed.
4. Practice Zone — untimed sets by paragraph, topic or chapter; instant answer with solution; daily 15-question goal; streaks.
5. Analysis and Revision — the paid heart of the site.
   - Score, rank among Sikar users, All-India-style percentile among all users.
   - Time per question, first-attempt vs changed answers, skipped topics, accuracy by chapter and question type.
   - Weak-area map: every weak topic linked to its NCERT pages to re-read.
   - Mistake notebook: wrong questions return after 3, 7 and 21 days.
   - Weekly parent report.
6. Counselling — college predictor, counselling calendar, choice-filling help, paid 1:1 sessions (section 7).
7. Partner Portal — schools and small coachings: create batches, assign tests, class analytics, reports (section 8).
8. Content Admin — question entry, two-model checking queue, student error reports, Hindi review queue (section 6).
9. Public pages for search — one page per PYQ and per NCERT topic (question visible, solution behind free login), blog, NEET news, CBT explainer.

## 4. Innovations

Marks and similar apps win on volume; we win on NCERT depth, the real exam screen, Hindi and local presence.

1. NCERT line tracing — every question shows the NCERT sentence it was built on; every weak area points to a page.
2. NCERT coverage score — e.g. "you have mastered 62% of NCERT Biology paragraphs", shown as a coloured book map.
3. Real exam-screen rehearsal — the NTA interface plus a short "first time on a computer" tutorial.
4. Behaviour analysis — rushing the last 20 minutes, changing right answers to wrong, 4+ minutes on one question, guessing streaks.
5. Exam-day temperament drills — timed sprints (10 questions in 8 minutes) and a negative-marking risk meter.
6. Sikar Rank — weekly open Sunday mock with local rank.
7. Same question, two languages, one tap — Hindi-medium students can check the English wording (NTA's English text prevails in disputes).
8. Paragraph-level PYQ prediction — NCERT paragraphs not asked for years but next to heavily asked ones.
9. Parent report in Hindi on WhatsApp — tests taken, score trend, chapters to revise.
10. Offline test days — monthly mock in a partner school's computer lab; results feed the same analysis.

## 5. Hindi and English

Hindi is a full first language, not a translation layer: every question, solution, synopsis and screen exists in both.

- Terms: NCERT's own Hindi terms only, from the Hindi NCERT books in neet-sources, held in one glossary file; every Hindi text is checked against it automatically.
- Text: Unicode Devanagari everywhere (Kruti Dev PDFs converted first). Font: Noto Sans Devanagari.
- Quality gate: no Hindi question goes live until a Hindi proofreader passes it; students can flag "Hindi unclear".
- Interface: buttons, menus and reports in both languages; exam screen copies NTA's bilingual layout.
- Search: Hindi pages are separate URLs so Google ranks them for Hindi searches.

## 6. Content system

One question bank feeds every module; a question is written once, checked twice, and tagged so any test can be assembled automatically. Content is produced by AI (Claude, ChatGPT); humans proofread and review, they do not write.

Sources, in order of trust:

| Source | Use | Note |
| --- | --- | --- |
| NEET PYQs 2013–2026 | PYQ Explorer, paper replays, analysis baseline | Answers checked against NTA final keys where available |
| JEE Main PYQs (Physics, Chemistry) | Extra practice in overlapping chapters | Tagged JEE |
| Vimal's own question repository | Chapter tests and mocks | Only questions he owns the rights to (section 12) |
| AI-written questions | Filling gaps: paragraphs with few questions | Never published without the two-model check |
| NCERT Exemplar | Practice Zone | Credited to NCERT |

Each question carries: English and Hindi text, options, answer, solution (both languages), NCERT class/chapter/paragraph ID, the NCERT lines used, source (PYQ year, own, AI), type, difficulty (1–5, later recalculated from student data), time estimate, image/diagram if any, status (draft, checked, live, flagged).

Pipeline for every new question:

1. Import or write (repository digitised by OCR, then cleaned).
2. Tag to NCERT paragraph automatically; a human confirms.
3. Model A writes the solution; Model B solves independently.
4. Agree → next step. Disagree → subject reviewer.
5. Hindi version made against the glossary; Hindi proofreader passes it.
6. Plagiarism check: no question text or solutions copied from Allen, Aakash, PW, Marks or other paid material.
7. Goes live; student error reports reopen it.

Reviewers: Vimal for Chemistry; one Biology and one Physics person a few hours a week for flagged items; one Hindi proofreader.

Target bank size: 15,000 questions by NEET 2027 (~4,000 PYQs + 11,000 own and AI-made), 30,000 by NEET 2028.

## 7. Counselling module

Runs from result day to the last stray-vacancy round (roughly June to October).

- College predictor (free, login): rank, category, domicile, quota → likely colleges for MBBS, BDS, BAMS/BHMS by round; built from past round-wise allotment data published by MCC (All India Quota, deemed, central) and the Rajasthan state counselling board.
- Counselling calendar and alerts: MCC and Rajasthan dates on WhatsApp in Hindi.
- Choice-list builder: drag-and-drop ordered list with fees, bond, seat type and last year's closing rank; printable.
- Paid counselling pack: document checklist, 1:1 video sessions, help through every round.
- Before the exam: "what can my mock score get me", mapping mock percentile to last year's ranks.
- Rule: show ranges and past data, never promise a seat; official counselling sites are the final word.

## 8. Schools and small coachings

Tie-ups are how the platform reaches 10,000 students: one school or coaching brings a whole batch.

| Offer | For schools | For small coachings |
| --- | --- | --- |
| Scheduled mocks on the exam screen | In their computer lab, monthly | In their centre or on phones, weekly |
| Their name on tests and reports | Optional | Yes (white-label) |
| Teacher / owner dashboard | Class-wise scores, weak chapters, test attendance | Batch analytics, student comparisons |
| Term report | NCERT coverage of the class, PYQ-based analysis | Same, plus progress over months |
| Custom test builder | Teachers pick chapters | Owner picks chapters, adds own questions |

- How to sell: free pilot (one batch, one month, three mocks), then a results report — the report is the pitch.
- First targets: 3–5 Sikar schools with Class 11–12 science and computer labs; 5–10 small coachings without their own test system.
- Partner data stays with the partner; never show one institute's students to another; never approach a partner's students directly.

## 9. Technical architecture

A PWA on managed services: no server to look after, cost grows with users.

| Layer | Choice | Why |
| --- | --- | --- |
| Front end | Next.js (React) as a PWA | One code base for phone, laptop, lab PCs; fast public pages |
| Database + login | Supabase (Postgres) | Phone-OTP login, row-level security per institute |
| Hosting | Vercel or Cloudflare Pages | Free/low tier until real traffic |
| Formulas, diagrams | KaTeX; images in object storage behind a CDN | Clean notation in both languages |
| Payments | Razorpay | UPI, cards, subscriptions, invoices |
| Messages | WhatsApp Business API provider + SMS fallback | Parent reports, counselling alerts |
| Content source | neet-sources and neet-site repos | Questions as versioned files, imported into the database |

- Main tables: users, roles, institutes, batches, ncert_nodes (class → chapter → paragraph), questions, question_translations, tests, test_questions, attempts, responses (answer, time spent, changes, marked-for-review), error_reports, colleges, cutoffs, payments.
- Exam engine rules: server-side timer; every answer saved on click; answer keys never reach the browser before submission; dropped connection resumes the same attempt.
- Load target: 5,000 students in the same Sunday mock without slowdown; load-tested before the first open mock.
- Running cost (approximate): under Rs 5,000/month until ~5,000 active users.
- Privacy: many users are minors; collect only name, phone, class, school, city; parent phone with consent; data in India where possible; clear privacy page.

## 10. Monetisation

Free tier brings students in; paid passes, institute deals and counselling earn. All prices and fees: NOT DECIDED — Vimal sets them later. Do not hard-code prices; keep them configurable.

| Plan | Includes |
| --- | --- |
| Free | NCERT Reader, PYQ Explorer, 1 full mock a month, basic score |
| Practice Pass | All practice, chapter tests, full analysis, mistake notebook |
| Mock Pass | Practice Pass + weekly full mocks, Sikar rank, parent report |
| Counselling Pack | Predictor details, choice-list builder, 1:1 sessions |
| School / coaching | Section 8 |

## 11. Build roadmap

Each phase starts when the gate before it is passed.

| Phase | When | Deliverables | Gate to next phase |
| --- | --- | --- | --- |
| 0 Foundation | Nov–Dec 2026 | Hindi NCERT → Unicode + term glossary; question format (JSON schema) fixed; all NEET PYQs tagged to NCERT paragraphs (Chemistry first); exam-screen engine prototype with 80 Chemistry Unit 1 PYQs in Hindi + English; content pipeline (two-model check, Hindi review) | Prototype works in Hindi and English on phone and PC |
| 1 Free launch | Jan–Feb 2027 | NCERT Reader + PYQ Explorer for all three subjects; phone-OTP login, saved results; free monthly mock; public question pages; first Sikar outreach | 1,000 registered users; NTA confirms CBT or paper for 2027 |
| 2 NEET 2027 season | Mar–May 2027 | Paid passes (Razorpay); Sunday mock with Sikar Rank; full analysis; parent reports; mistake notebook; NCERT coverage score | 300 paying students; Sunday mock stable at scale |
| 3 Counselling, tie-ups | Jun–Sep 2027 | College predictor, counselling calendar and pack; partner portal; pilots with 3–5 schools and 5–10 coachings | 3 paid institute contracts; reviewers for all subjects |
| 4 Scale and JEE | Oct 2027–May 2028 | Offline test days in partner labs; rest of Rajasthan; JEE Main (Physics, Chemistry, then Maths) on the same engine | 10,000 active students by NEET 2028 |

If CBT slips to 2028, phases 1–3 run unchanged and paper-pattern mode carries the 2027 season.

## 12. Risks and open decisions

| Risk | Why it matters | What we do |
| --- | --- | --- |
| Rights to the question repository | Papers made for an employer usually belong to that employer | Use only questions Vimal made on his own; when unsure, rewrite rather than copy |
| Employer contract / conflict of interest | A Sikar NEET platform competes for the same students | Check the contract before going public; brand stays separate |
| CBT delayed to 2028 | Simulator loses urgency for a year | Paper-pattern mode; NCERT-PYQ value holds either way |
| Wrong AI answers | One bad key costs trust fast | Two-model check, NTA keys, reviewers, error button |
| Weak Hindi | Hindi-medium students leave | Glossary, proofreader, "Hindi unclear" flag |
| Big players copy the idea | PW, Allen, Marks can build a CBT screen | Win on NCERT depth, Sikar presence, schools, parents |
| Copyright | NCERT text and rivals' material | Short credited NCERT excerpts with links; no rival content |
| Minors' data | Legal and trust risk | Minimal data, parent consent, privacy page |

Open decisions:

- [ ] Brand name and domain
- [ ] Prices and fees
- [ ] Monthly budget for hosting, WhatsApp, reviewers
- [ ] Biology, Physics and Hindi reviewers
- [ ] Business entity for payments and invoices (ask a CA)
- [ ] Which part of the question repository is Vimal's to use
