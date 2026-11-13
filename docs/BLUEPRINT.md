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
    - bio11-old-mineral-nutrition tagged, 12 questions, ready for solutions (12 old_ncert_only; 12 dropped_2024; 9 checked against official keys, 3 against the copy's key + our solving; bonus: 2016 Phase 1 Code A Q98)
    - bio11-old-digestion-and-absorption tagged, 19 questions, ready for solutions (17 old_ncert_only; 2 outside_ncert; 19 dropped_2024; 15 checked against official keys, 4 against the copy's key + our solving)
    - bio12-01 tagged, 49 questions, ready for solutions (2 diagram; 41 checked against official keys, 8 against the copy's key + our solving)
    - bio12-02 tagged, 39 questions, ready for solutions (6 outside_ncert; 1 diagram; 30 checked against official keys, 9 against the copy's key + our solving)
    - bio12-03 tagged, 29 questions, ready for solutions (2 outside_ncert; 22 checked against official keys, 7 against the copy's key + our solving)
    - bio12-04 tagged, 61 questions, ready for solutions (1 outside_ncert; 3 diagram; 44 checked against official keys, 17 against the copy's key + our solving)
    - bio12-05 tagged, 72 questions, ready for solutions (2 outside_ncert; 1 diagram; 51 checked against official keys, 21 against the copy's key + our solving)
    - bio12-06 tagged, 34 questions, ready for solutions (27 checked against official keys, 7 against the copy's key + our solving)
    - bio12-07 tagged, 38 questions, ready for solutions (3 outside_ncert; 28 checked against official keys, 10 against the copy's key + our solving)
    - bio12-08 tagged, 24 questions, ready for solutions (1 outside_ncert; 22 checked against official keys, 2 against the copy's key + our solving)
    - bio12-09 tagged, 59 questions, ready for solutions (1 outside_ncert; 3 diagram; 44 checked against official keys, 15 against the copy's key + our solving)
    - bio12-10 tagged, 30 questions, ready for solutions (2 outside_ncert; 24 checked against official keys, 6 against the copy's key + our solving)
    - bio12-11 tagged, 35 questions, ready for solutions (4 old_ncert_only; 1 outside_ncert; 4 dropped_2024; 26 checked against official keys, 9 against the copy's key + our solving)
    - bio12-12 tagged, 29 questions, ready for solutions (5 old_ncert_only; 6 outside_ncert; 5 dropped_2024; 23 checked against official keys, 6 against the copy's key + our solving)
    - bio12-13 tagged, 33 questions, ready for solutions (3 outside_ncert; 23 checked against official keys, 10 against the copy's key + our solving)
    - bio12-old-reproduction-in-organisms tagged, 8 questions, ready for solutions (8 old_ncert_only; 8 checked against official keys, 0 against the copy's key + our solving)
    - bio12-old-food-production tagged, 17 questions, ready for solutions (14 old_ncert_only; 3 outside_ncert; 17 dropped_2024; 13 checked against official keys, 4 against the copy's key + our solving)
    - bio12-old-environmental-issues tagged, 28 questions, ready for solutions (24 old_ncert_only; 4 outside_ncert; 28 dropped_2024; 21 checked against official keys, 7 against the copy's key + our solving)
  - Physics batches in progress (`content/pyq-batches/neet-<year>-physics.json`; formulas retyped from page images, every numerical recomputed): 2015, 2016 Phase 1, 2016 Phase 2 done (135 questions, all agree with the official CBSE keys; 2015 Q146 has an errata note). Next 2017, 2018 (scan, OCR), 2019 S2 Q91–135, 2020, 2021 (P3 Q1–50), 2022–2026. Physics chapter banks are built only after all years are tagged.
  - Left for Physics and Biology (in this order): tag Physics 2017–2026 (≈470 questions; 2018 needs OCR of the scan, 2022–2026 eSaral copies clip the right edge — read from page images; 2026 needs the booklet-order mapping as done for Biology), then build the Physics chapter banks (`tools/add_pyqs.py --chapter phy..`); then worked solutions + draft Hindi for all 1,210 Biology and all Physics PYQs (patch format of `content/solutions/<chapter>.json` + `tools/add_solutions.py`). No Physics/Biology solutions or Hindi exist yet. Biology pages also need the trend markers and weak-paragraph list (CLAUDE.md) before publishing.
  - Open checks for a person with the booklets: 2025 Code 45 Q121, Q162 (NTA key differs; eSaral copy probably reorders options); 2016 P2 Physics Q4/Q17/Q19 options and Q15 stem opening (cut at page breaks, entered from the official paper's usual wording); 2016 P1 Physics Q22 options 1/4; 2022 Biology Q144/Q155 options (garbled OCR); 2024 Biology Q131 (copy 10x vs our x).
  - Dropped Physics topics stay in their current chapter bank as `old_ncert_only` + `dropped_2024` (Doppler effect, potentiometer, transistors, …).
  - Chemistry banks: `tools/apply_keys.py --write` re-ran over all banks after the new official keys were added, so 2017/2018/2020/2021/2025/2026 Chemistry key checks now read "Matches the official key (…)"; no answers changed.
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
- Phase 0, session 6 (13 Nov 2026), branch `claude/bio-trends-solutions` (from `claude/phy-bio-pyq-tagging`; not merged to `main`). Biology work only; Physics continues on `claude/phy-bio-pyq-tagging`.
  - **Recent-trend markers** (CLAUDE.md Biology requirement 1): `tools/build.py` computes per-paragraph counts from PYQs only (`para_trends`): NEET count, JEE Main count, NEET years, last NEET year, `recent` = asked in the last 3 NEET papers (latest year found in the content, now 2026 → 2024–2026). Written to `data/pyq/<ch>.json` (`trends`) and to every bank copy `data/questions/<ch>.json` (`paraTrends`), so they update when papers are added. PYQ page: "asked NEET n× · last YYYY" under each section heading, a RECENT badge, and a dot in the section menu.
  - **Personal weak-paragraph list** (requirement 2): "Revise these paragraphs" panel on the PYQ page, from the same `progress` store (question id → `paras`): paragraphs with wrong answers first, then not-tried ones, each linking to its section, plus "Retry only these questions" (shows only wrong/untried questions; a retry may overwrite the stored result). Works without storage. Tested at 390 px with Playwright (no console errors).
  - Both live in the shared PYQ page code, so Chemistry/Physics pages get them too. Biology pages still need the page itself (bank → reader/PYQ page) before publishing.
  - **Biology worked solutions + draft Hindi** (one commit per chapter; source `content/solutions/<chapter>.json`, merged with `tools/add_solutions.py`): **bio12-04 (61), bio12-05 (72), bio12-01 (49), bio12-02 (39), bio12-03 (29), bio12-06 (34), bio12-07 (38), bio12-08 (24), bio12-09 (59), bio12-10 (30), bio12-11 (35), bio12-12 (29), bio12-13 (33) done** — all current Class 12 chapters. Every answer re-solved and checked against the key; Hindi terms from neet-sources `ncert-hi-text` (class 12 biology), DNA/RNA/gene symbols kept in Latin; 50 Biology terms added to `content/glossary/hi-terms-used.json`. `check_hindi.py`: 801 questions, 0 errors / 0 warnings (three small tokenizer rules added: "Co-dominance" is not cobalt, plural acronyms like RBCs, Hindi ordinals like 11वाँ).
  - Fixes on the way: 2025 Code 45 Q152 pedigree read from the page image — X-linked recessive, answer 1/4 now worked out (paras + 4.8.2); 2016-P1 Q128 errata (statement iv is also true); page-footer debris removed from 3 options/stems (2020 F3 Q118, 2025 Q145, 2026 Q93, 2026 lac-operon stem) in both batch and bank. Still to fix: bio11-06 2025 Code 45 Q118 option ends "parenchymatous m" (truncated).
  - bio12-01: 67 more NCERT Hindi terms in the glossary (embryo sac, endosperm, xenogamy…); words NCERT Hindi lacks (epiblast, pollenkitt, tegmen) are listed under `noNcertTerm`. Figure questions 2022 T2 Q147 (apple, C → thalamus) and 2024 Q196 (wind-pollinated inflorescence) worked from the page images. eSaral footer debris removed from the 2024 Q196 stem (batch + bank); the same footer still sits in three other 2024 items (bio11-11, bio11-17, bio12-09; one of them has options run together) — fix with those chapters.
  - bio12-02: 73 more terms (NCERT Hindi: spermatogenesis = शुक्रजनन, spermiogenesis = शुक्राणुजनन — easy to swap); 13 words missing from NCERT Hindi (capacitation, amnion, inhibin…) under `noNcertTerm`. 2024 Q101 stem now carries the flow chart as text (GnRH → LH → (B)…), read from the page image (batch + bank). bio12-01 2016 Q130: plant placenta is अपरा in NCERT Hindi (fixed).
  - bio12-03: 30 more terms (STIs as in NCERT Hindi: सुजाक, जननिक परिसर्प, यकृतशोथ-B; IUD names). Errata: 2020 F3 Q174 — options 3 and 4 are printed identically in our copy (key = 3); check the option text against the official F3 booklet. 2017 Q172 note: key gives artificial insemination (NCERT's remedy for low sperm count), though ICSI is also used.
  - bio12-06: 36 more terms (NCERT Hindi: analogy = तुल्यरूपता, founder effect = संस्थापक प्रभाव, gene migration = जीन पलायन). **Key fix: 2026 Q158** (booklet Code 13 Q164) — the eSaral copy has options 2 and 3 swapped against the booklet; the key (booklet 3) is copy option 2 (A-II, B-IV, C-I, D-III, as in NCERT 6.8). Fixed in the batch, the bank and `content/keys/neet-official-keys.json` (key 158 → 2, note added). 2016 P2 Q167 stem had option debris ("(A) (B) 2pq (C) pq (D)") — removed in batch + bank.
  - bio12-07: 56 more terms (NCERT Hindi: colostrum = पीयूष, sporozoites = जीवाणुज, leukaemia = अधिश्वेतरक्तता, dopamine = डोपेमीन). 2024 Q174 options were run together in the copy (option 4 held the whole option list) — rebuilt from the page: A-II,B-IV,C-III,D-I / A-I,B-III,C-II,D-IV / A-III,B-I,C-II,D-IV / A-IV,B-II,C-III,D-I (batch + bank; key 3 unchanged). Helper idea for later chapters: list Hindi words in a solutions file that never occur in `ncert-hi-text` — it catches non-NCERT technical words quickly.
  - bio12-08: 24 more terms; Latin binomials kept in Latin italics in Hindi (as NCERT names vary in transliteration). Biology spellings of acids/ethanol (ब्युट्रिक, ऐथानॉल) are glossary entries with `check: false` so they do not clash with the Chemistry book forms. 2024 Q169 options were run together in the copy — rebuilt from the page (batch + bank; key 3 unchanged).
  - bio12-09: 31 more terms (vector = संवाहक, recombinant = पुनर्योगज, selectable marker = वरणयोग्य चिह्नक, elution = क्षालन). Figure questions 2024 Q148 (pBR322: X = ori, Y = rop), 2025 Q115 (plasmid with EcoRI inside β-galactosidase) and 2025 Q126 (bioreactor: C = foam breaker) worked from the page images. Debris removed: 2024 Q149 option 3 (eSaral footer), 2026 Q94 option 4 ("w: NEET 2"). Note on 2020 F3 Q143: NTA's key marks "sticky ends joined by ligase" as the wrong statement (it is about ligase, not restriction enzymes); the solution explains this. Still to fix with their chapters: eSaral footer in bio11-11 and bio11-17 (2024), option debris in bio11-06 ("an NEET 2") and bio11-16 ("t NEET 2").
  - bio12-10: 18 more terms (RNAi = आरएनए अंतरक्षेप, probe = संपरीक्षित्र, emphysema = इंफासीमा, transgenic = पारजीवी as printed in NCERT Hindi). Copy fix: 2025 Q116 "organ isms" → "organisms" (batch + bank).
  - bio12-11: 28 more terms (carrying capacity = पोषण क्षमता, exponential = चरघातांकी, commensalism = सहभोजिता, amensalism = एमेन्सेलिज्म as in NCERT Hindi table 11.1). Four old_ncert_only/dropped_2024 questions (adaptations, niche) also solved. 2025 Q157 note: key says both statements wrong — the fig's flowers (inflorescence) are pollinated, not the fruit.
  - bio12-12: 26 more terms (pyramid = पिरैमिड, fragmentation = खंडन, leaching = निक्षालन, catabolism = अपचयन). Errata kept: 2024 Q131 — copy prints 10x, NCERT's 10 per cent law gives x (bank answer stays x); check against the NTA 2024 final key when it is added. Copy fix: "Statement Il" → "Statement II" (2022 Q131, batch + bank).
  - bio12-13: 27 more terms (in-situ = स्वस्थाने, ex-situ = बाह्यस्थाने, co-extinction = सहविलुप्तता). `check_hindi.py`: one more tokenizer rule — "Co-extinction" and "Ex-situ" are not the symbols Co / Ex. Copy fix: 2016 P1 Q120 options "Co – extinctions", "Over – exploitation" (batch + bank).
  - Old-NCERT banks: **bio12-old-reproduction-in-organisms (8), bio12-old-food-production (17), bio12-old-environmental-issues (28) done** — all Class 12 Biology banks now have solutions + draft Hindi. These chapters have no Hindi text in `ncert-hi-text` (it holds the rationalised books only), so their Hindi uses the nearest NCERT Hindi words from other chapters and keeps the English term in brackets where none exists (rhizome, offset, hyphae, pistillate).
  - Copy fix: "Zoo Secti" page-header debris removed from two 2023 option texts (Q50, Q85; batch + bank).
  - bio11-old-transport-in-plants (18) done: 13 more terms (phloem = फलोएम as NCERT Hindi spells it, tensile strength = तनन सामर्थ्य); water potential, root pressure, cohesion, guttation, apoplast are not in the rationalised Hindi books, so the English stays in brackets (listed under `noNcertTerm`). `check_hindi.py`: "Bi-directional" is not the symbol Bi. Copy fix: the 2020 page footer " 13thSeptember 2020, Biology Page | NN" stripped from every 2020 question (batch + bio11-07, bio11-12, this bank).
  - bio11-old-mineral-nutrition (12) done: 31 more terms (nitrogen fixation = नाइट्रोजन स्थिरिकरण, legume = लेग्युम, splitting of water = जल का विघटन, elongation = दीर्घीकरण, as in NCERT Hindi); leghaemoglobin, nitrogenase, denitrification, macro/micronutrients, catalase kept with English in brackets (`noNcertTerm`). Variants added so older questions still pass (copper ताँबा, legume लेग्यूम, enzyme एंज़ाइम, chlorophyll पर्णहरित). 2016 P1 Q98 is a CBSE bonus (nickel is a micronutrient, so no option has three macronutrients); the solution says so.
  - bio11-old-digestion-and-absorption (19) done: 26 more terms from the NCERT Hindi books' other chapters (duodenum = ग्रहणी, chyme = काइम, pepsinogen = पेप्सिनोजेन, erythropoiesis = रक्ताणु उत्पत्ति, appendix = परिशेषिका, macrophages = भक्षकाणु). Dentition and gut-wall terms (premolars, thecodont, ileum, caecum, sphincter of Oddi, goblet/oxyntic cells) are not in the rationalised Hindi books: English in brackets, listed under `noNcertTerm`. All bio12-old-* and bio11-old-* banks now have solutions + draft Hindi.
  - bio11-01 (10) done: 24 more terms from NCERT Hindi ch1 (specific epithet = जाति संकेत पद, binomial nomenclature = द्विपदनाम पद्धति, taxonomic categories = वर्गिकी संवर्ग, photoperiod = दीप्तिकाल). Herbarium/museum/key/catalogue (taxonomic aids, removed from the rationalised book) keep English in brackets. NCERT Hindi Table 1.1 misprints Insecta as इंसेंक्टा; we write इंसेक्टा (Insecta). 2022 Q173 note: the options list categories from kingdom down although the stem says 'ascending'; only option 4 has the right sequence (key 4).
  - bio11-02 (36) done: 56 more terms from NCERT Hindi ch2 (Deuteromycetes = डयूटिरोमाइसिटीज, slime moulds = अवपंक कवक, diatomaceous earth = डाइएटमी मृदा, viroid = वाइराइड, methanogens = मैथेनोजेन). Variants so older questions pass: unicellular एककोशिक, methane मिथेन, mycorrhiza कवक मूल, cyanobacteria सायनोबैक्टीरिया, zoospores चलबीजाणु; bio12-06 2015 Q62 option now says जातिवृत्तीय (phylogenetic). Copy fix: 2024 Q152 options were run together — rebuilt (batch + bank; key 1 unchanged).
  - **Answer fixes found by re-solving (2022, Code T2, eSaral scan):** Q198 (bio11-02) stored 1, the copy's key and the correct answer are 4 (cyanobacteria are autotrophs in Monera); Q164 (bio12-05) stored option 2 (3.3 × 10<sup>6</sup> bp) although our own solution computes 3.3 × 10<sup>9</sup> bp = the copy's key 4. Both fixed in batch + bank. Then all 100 Biology answers of the 2022 batch were re-read from the page images (each "Ans." box OCR'd on its own): all now agree with the copy (Q101 is a bonus). The 2023 batch was checked against the copy's answer table and 2024 against the copy's "Correct Option" lines: all agree except the known 2024 Q131 errata.
  - bio11-03 (32) done: 37 more terms from NCERT Hindi ch3 (pteridophyte = टैरिडोफाइट, protonema = प्रथम तंतु, sporophyte = बीजाणु-उद्भिद्, antherozoids = पुमणु, carrageen = कैरागीन, monoecious = उभयलिंगाश्रयी). bio11-02's Hindi brought in line (टैरिडोफाइट, फयूकोजैंथिन, द्विकशाभिक). 2025 Q162 (Code 45): the eSaral copy marks option 1 (our answer by content); NTA's Code 45 key says 2, which with the options as printed would make <i>Polytrichum</i> a pteridophyte — the copy probably reorders this question's options; errata note added, check against the Code 45 booklet.
  - bio11-04 (42) done: 63 more terms from NCERT Hindi ch4 (choanocytes = कीपकोशिका, comb plates = कंकत पट्टिका, radula = रेतीजिह्वा, book lungs = पुस्त फुप्फुस, gill slits = क्लोम छिद्र, notochord = पृष्ठरज्जु). 'crop' set to `check: false` (Biology uses it for both farm crops and the bird's crop). Copy fix: 2025 Q109 option 4 had trailing debris "h‐" (batch + bank).
  - bio11-05 (42) done: 42 more terms from NCERT Hindi ch5 (axile = स्तंभीय, free central = मुक्त स्तंभीय, coleorhiza = मूलांकुरचोल, epiphyllous = परिदल लग्न, acropetal = अग्राभिसारी, drupe = अष्ठिल). The rationalised Hindi book dropped stem/root modifications and the Fabaceae/Liliaceae families, so those terms keep English in brackets. Copy fixes: 2024 Q144 options were run together (rebuilt, key 1 unchanged); 2026 Q121 had placeholder options "[floral formula N]" — typeset from the Code 13 booklet scan (Q108; arc over C and A = epipetalous), batch + bank. Figure questions 2024 Q145 (both flowers perigynous) and Q147 (maize grain L.S., C = radicle) checked on the page images.
  - bio11-06 (32) done: 20 more terms from NCERT Hindi ch6 (bulliform cells = आवर्ध त्वक्कोशिका, stele = रंभ, pericycle = परिरंभ, starch sheath = स्टार्च आच्छद); secondary-growth terms (heartwood, phellogen, lenticels…) are not in the rationalised Hindi book and keep English in brackets. Copy fix: 2025 Q118 option 1 was cut ("parenchymatous m") and option 4 had debris ("an NEET 2") — fixed from the copy text (batch + bank). 2022 Q101 is a bonus in the copy (all five statements are true); solution says so. Figure 2024 Q141 checked (C = guard cell).
  - bio11-07 (32) done: 14 more terms from NCERT Hindi ch7 (frog only in the rationalised book: copulatory pad = मैथुनांग, vocal sacs = वाक् कोष, sinus venosus = शिराकोटर, renal portal = वृक्कीय निवाहिका); tissue, earthworm and cockroach terms keep English in brackets. Copy fixes: 2023 Q90 option 4 debris ("ology ion-B") and 2026 Q177 option 2 trailing comma (batch + bank).
  - bio11-08 (47) done: 31 more terms from NCERT Hindi ch8 (mitochondria = सूत्र कणिका, lysosome = लयनकाय, vacuole = रसधानी, nucleolus = केंद्रिका, polysome = बहुसूत्र, acrocentric = अग्रबिंदु, cytoskeleton = साइटोपंजर); variants added so Class 12 Hindi (क्रोमोसोम, माइटोकॉन्ड्रिया, रिक्तिका) still passes. Copy fixes: 2024 Q157 options run together (rebuilt, key 4 unchanged); debris removed from 2023 Q55 option 4 ("ology ion-A") and 2025 Q98 option 2 ("p‐") — batch + bank. 2025 Q121 (Code 45): like Q162, the eSaral copy marks option 1 (our answer by content) but NTA's Code 45 key says 4; errata note added — check against the booklet.
  - bio11-09 (45) done: 46 more terms from NCERT Hindi ch9 (substituted methanes = प्रतिस्थापित मेथेन, apoenzyme = एपोएंजाइम, prosthetic group = प्रोस्थेटिक समूह, competitive inhibitor = प्रतिस्पर्धी संदमक, lyases = लायेजेज). Terms the Chemistry book spells differently (aromatic, lysine, glycosidic, toxin, nucleoside…) are `check: false` so both books' forms pass. Copy fixes: 2024 Q191 options run together (rebuilt, key 3 unchanged); 2026 Q167 had no reaction in the stem and option 4 debris ("Lyases en") — reaction C(X)–C(Y) → X–Y + C=C added from the page image (batch + bank). Figure 2016 P2 Q144 (energy diagram) checked.
  - bio11-10 (38) done: 27 more terms from NCERT Hindi ch10 (leptotene…diakinesis = तनुपट्ट, युग्मपट्ट, स्थूलपट्ट, द्विपट्ट, पारगतिक्रम; terminalisation = उपांतीभवन; chiasmata = काएज्मेटा; bivalent = युगली; quiescent stage = शांत अवस्था). `check_hindi.py`: "He tells…" (pronoun) is not the symbol He.
  - bio11-11 (29) done: 20 more terms from NCERT Hindi ch11 (bundle sheath = पूलाच्छद, chemiosmosis = रसोपरासरण, Kranz = क्रांज़, RuBisCO = रुबिस्को, lumen = अवकाशिका); photosystems written PS I / PS II (NCERT Hindi uses both PS and पीएस). Copy fixes: 2024 Q139 option 4 eSaral footer ("https://admin.esaral.com/quiz-pdf/6104 eSaral") removed (batch + bank; same footer also removed from bio11-17's 2024 Q161 in the bank); 2026 Q131 "Calvin cy cle" → "Calvin cycle".
  - bio11-12 (18) done: 11 more terms from NCERT Hindi ch12 (respiratory quotient = साँस गुणांक as NCERT prints it, oxidative phosphorylation = ऑक्सीकारी-फॉस्फोरिलिकरण, acetyl CoA = एसीटाइल कोएंजाइम A, final electron acceptor = अंतिम इलेक्ट्रॉन ग्राही). 2026 Q126 RQ = 102/145 ≈ 0.70 checked.
  - Next (Biology): Class 11 bio11-13…19. Note for bio11-17: 2024 Q161 options are still run together (rebuild them from the page). Note for the proofreader: old-chapter Hindi (अंतःप्रजनन, जीवद्रव्यक, जैव प्रबलीकरण…) could not be matched to an NCERT Hindi book here; check against the old-edition Hindi books if they are added to neet-sources.

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
