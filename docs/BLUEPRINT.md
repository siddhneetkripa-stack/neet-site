# NEET Platform — Website Blueprint

Status: agreed by Vimal on 12 Nov 2026, except prices and fees (not decided; see section 10).
Source of truth for building this site. Every Claude / AI session working on neet-site or neet-sources reads this file first, works phase by phase (section 11), and updates "Build status" at the end of each session.

## Build status (update every session)

**State on 14 Nov 2026: every branch is merged into `main`** (neet-site and neet-sources), approved by the owner; the old branches were deleted. `main` is the one base for all new work and publishes the site (GitHub Pages). Detailed session notes up to the merge: `docs/build-log.md`.

How to work from here:
- Start every session from `main`. Work on your own branch, commit often, and say in the branch name what the session does. Merges to `main` only when the owner says so.
- At the end of a session, update the summary below (counts, done, next) in a few lines. Put detailed notes (term choices, copy fixes, key conflicts) in `docs/build-log.md` under a dated heading, not here.
- Run `python3 tools/build.py` (needs neet-sources next to neet-site for the Hindi term check) and commit the `data/` output.

### What exists

Question bank (`content/questions/`, 98 chapter files; `data/questions/` built):

| Subject | NEET PYQs 2015–2026 | Worked solutions | Hindi | Other questions |
| --- | --- | --- | --- | --- |
| Chemistry | 605 | all | draft | 908 JEE Main PYQs (Unit 1's 63 have solutions + Hindi; 845 from JEE Main 2024–2026 have neither yet); 139 NCERT Exercise / Exemplar / Practice (Unit 1, Thermodynamics) |
| Physics | 605 | all | draft | none yet |
| Biology | 1,210 | all | draft | 83 NCERT-coverage questions (NCERT Exercise / AI) with solutions + draft Hindi; every Biology NCERT paragraph now has a question |

- All 3,550 questions: 219 `live` (Unit 1 and Thermodynamics prototype), 3,331 `draft`. Hindi: 2,566 `draft`, 139 `placeholder`, 845 `missing`, none proofread. `check_hindi.py`: 0 errors, 4 warnings (Physics terms that also have a Biology/Chemistry meaning).
- Answers are checked against official CBSE/NTA keys where available (NEET 2015–2021, 2025, 2026 Code 13; JEE Main 2026 Session 2); 2022–2024 rely on the copies' keys plus our own solving. Key conflicts and bonus questions carry notes; bonus questions never go into tests.
- Diagram questions written as text, needing redrawn figures: Physics 95, Chemistry NEET 47, JEE Main 61, Biology 19 (Biology list with what each figure must show: docs/build-log.md, 14 Nov 2026 Biology entry).
- **Biology pages (from `claude/bio-pages`, merged into `main` 14 Nov 2026):** done: NCERT coverage (0 paragraphs without a question), catalog (Hindi titles, ncertPdf, pdfPageOffset, old-NCERT `extras`, `pagesLive: true`), Hindi titles + printed pages for every paragraph, copy fixes, 19-figure list. Checked in headless Chromium on a local merge with `claude/pages-from-bank`: all 38 Biology pages, Hindi + English, 390 + 1280 px, no console errors; trend chips, "Revise these" and "Retry only these" work (also with storage blocked). Needs `claude/pages-from-bank` merged first (it has the bank-reading page). Next for Biology: Hindi proofreading, redrawn figures, second-model check of the 83 coverage questions.
- **Biology CBT labels + test plan (branch `claude/bio-cbt-labels`, not merged):** all 1,293 Biology questions have `type` (single 838, statement 247, match 169, assertion-reason 20, diagram 19) and `difficulty` on the owner's scale (easy 2: 660, medium 3: 532, hard 4: 101; `difficultyBasis` author), also on the batch entries; 169 "negative" tags in `content/cbt-plans/biology-tags.json` (the schema has no `tags` field). `content/cbt-plans/biology.json`: 27 chapter tests, 1,058 questions (generator `content/cbt-plans/make_biology_plan.py`). Two ambiguous PYQs reworded. Details: build-log 14 Nov 2026 "Biology CBT labels". Next: the CBT generator (`claude/cbt-from-bank`) reads the plan; add `tags` to the schema if wanted; Biology figures, then diagram questions into tests.
- NCERT paragraph ids for all three subjects (`content/ncert/`), Hindi term list (`content/glossary/hi-terms-used.json`, 1,749 terms checked against NCERT Hindi), official keys (`content/keys/neet-official-keys.json`).
- Tools: `add_pyqs.py`, `apply_keys.py` (now keeps our own extra accepted options instead of silently dropping them), `add_solutions.py`, `check_hindi.py`, `make_paragraphs.py`, `build.py` (also computes the per-paragraph trend counts).

Site (static, GitHub Pages):
- Final design B + C (Mukta, teal/saffron, Hindi-first toggle): home, chapter mind map (Chemistry Thermodynamics), exam screen.
- **Chapter pages ("NCERT + PYQ") are built from the question bank** for all 98 bank files (`tools/build.py` → `data/pyq/<ch>.json`; merged into `main` 14 Nov 2026). Shown: questions with a worked solution (JEE Main PYQs without one wait); Hindi question text when the interface is Hindi, with a per-question English switch and a "हिंदी प्रारूप" tag while draft; trend chips and "Revise these" / "Retry only these"; topics NEET dropped in 2024 in their own section at the end (never in trend counts); old-NCERT and lab chapters as one list, newest paper first, with the topic on each card. Hindi chapter titles in `content/catalog.json` (`hi`), checked against the NCERT Hindi text.
- Linked from home: all three subjects (`"pagesLive": true` in content/catalog.json): 98 pages, incl. old-NCERT/lab chapters in their own row per class. Checked with headless Chrome after the Biology merge: 98 pages, Hindi and English, 390 px and 1280 px, no console errors, no sideways scrolling.
- Mock safety (tools/build.py `build_test`): a test with a `dropped_2024` question fails the build; `old_ncert_only` questions (still in the NEET syllabus, e.g. p-Block) need `"allowOldNcert": true` in the test file.
- Checked with headless Chrome: all 98 pages, Hindi and English, 390 px and 1280 px: no console errors, no sideways scrolling.

CBT server (`worker/`, Cloudflare Worker + D1, Google sign-in): 27 physical-chemistry chapter tests whose keys live in neet-sources `cbt/tests/`. Tested locally only. Deploying needs the owner's Cloudflare account, a D1 database, a Google Client ID and two GitHub secrets (`worker/README.md`).

neet-sources: NCERT (English, Hindi Kruti Dev and Unicode text), NEET papers 2013–2026, JEE Main 2020–2026 (incl. the VKC NTA chemistry extracts), glossary, pyq-tools (incl. JEE batch scripts), CBT test files.

### Next, in order
1. **Chapter pages**: live for Physics, Chemistry and Biology (on `main`). Left: Hindi paragraph titles and printed page numbers for many Physics chapters (pages fall back to English titles and PDF-page links); show the 845 JEE Main PYQs once they have solutions.
2. **Hindi proofreading** of all draft Hindi (Physics, Chemistry, Biology; old-NCERT chapters first, as they have no NCERT Hindi text to check against), status `draft` → `proofread`.
3. **Redrawn figures** for the 222 diagram questions, then move checked PYQs from `draft` to `checked`.
4. **JEE Main Chemistry**: tag 2020–2023, then solutions + Hindi for all JEE PYQs.
5. **NCERT coverage questions**: Biology done; Physics and Chemistry not started.
6. **CBT**: deploy (owner's accounts), Hindi-first styling of result/list pages, organic and inorganic chapter tests, then Physics/Biology tests and full mocks.
7. **Open checks needing the printed booklets / official keys**: NEET 2022–2024 official keys; 2025 Code 45 Biology Q121, Q162, Chemistry Q69; 2016 P2 Physics Q4/Q15/Q17/Q19; 2016 P1 Physics Q22; 2022 Biology Q144/Q155; 2024 Biology Q131; 2020 F3 Biology Q174.
8. Later phases (section 11): Practice Zone, analysis, parent report, partner portal, counselling, SEO pages; brand name, domain and prices are still the owner's decisions.

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
