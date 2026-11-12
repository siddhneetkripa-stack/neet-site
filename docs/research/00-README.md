# Overnight research pack — 13 Nov 2026

For the NEET platform build (see ../BLUEPRINT.md). Stored in `neet-site/docs/research/`. (The Sikar schools/coachings contact list from the same night is kept with Vimal, not in the repo.)

| File | What it is | Use it for |
| --- | --- | --- |
| 01-nta-cbt-screen-spec.md | Exact behaviour of NTA's computer-based test screen: flow, layout, 5 palette states, every button, timer, language, input rules, NEET settings | Building and checking the exam-screen test engine (Phase 0) |
| 02-neet-syllabus-ncert-map.md | NEET 2026 syllabus units mapped to current NCERT chapters; topics NEET keeps that NCERT dropped (whole p-Block); topics NEET dropped (for old PYQs) | Question tagging fields, PYQ Explorer flags, adding old-edition NCERT chapters |
| 04-counselling-data-notes.md | What counselling data exists, what is missing, how to build the Rajasthan-aware college predictor | Phase 3 counselling module |
| 04a-rajasthan-closing-ranks-by-category.csv | Rajasthan state-quota closing ranks by category × gender, 2025 R1–R3 and 2026 R1 | Predictor prototype and validation |
| 04b-rajasthan-closing-ranks-by-college.csv | Per-college closing ranks: 2026 R3 (state rank) and 2025 (indicative) | Predictor prototype |

Three findings to act on:

1. **p-Block is in NEET but not in current NCERT.** Add old-edition NCERT p-Block chapters (Class 11 and 12) to neet-sources, or p-Block questions cannot be traced to NCERT lines.
2. **Rajasthan counselling runs on state merit rank, girls' seats, MBC, TSP and govt-fee vs management-fee seats.** The predictor must model these; AIR-only predictors give wrong answers here.
3. **NTA's own text says "Mark for Review & Next" keeps a selected answer for evaluation;** some coaching descriptions say otherwise. Build it as a setting and confirm when the NEET 2027 bulletin is out.
