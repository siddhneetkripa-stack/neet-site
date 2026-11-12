# NEET counselling data: what I collected and how the predictor should be built

Prepared 13 Nov 2026 for Blueprint section 7 (Counselling module). Files: `04a-rajasthan-closing-ranks-by-category.csv`, `04b-rajasthan-closing-ranks-by-college.csv`.

**Bottom line:** a clean category-by-gender series of Rajasthan state-quota closing ranks for 2025 (Rounds 1–3) and 2026 (Round 1), plus per-college closing ranks for 2026 Round 3 and an indicative per-college list for 2025. **That is enough to design and demo the predictor, not to run it for real.** Accurate per-college, per-category numbers have to be built from the counselling board's own allotment PDFs, as described below.

## What is in the files

| File | Covers | Rank type | Source quality |
| --- | --- | --- | --- |
| 04a (129 rows) | Rajasthan 85% state quota: govt-fee and management-fee MBBS in govt/RajMES colleges, by 7 categories × boys/girls; 2025 R1–R3, 2026 R1 (with NEET scores); 2026 R1 govt-fee BDS; NRI; one MCC 2026 R1 figure | NEET All India Rank | ALLEN news summaries of official allotment lists; consistent across rounds. 2025 R3 management-fee SC/ST rows: the source does not tie them to a quota explicitly |
| 04b (34 rows) | 2026 Round 3 (and Round 2) closing ranks for 13 govt colleges + 2 dental; 2025 opening/closing for 19 govt colleges | 2026: **state merit rank**, unreserved open seats only; 2025: AIR, General, quota not stated by source | neet2seat (read from official PDF) for 2026; Careers360 for 2025 (treat as indicative) |

## Key facts for the design (2026 cycle)

- Rajasthan state counselling covers about 2,274 government-fee seats (6 govt colleges, 24 RajMES, RUHS-CMS, 2 ESIC) and 3,252 seats in 18 private colleges. [aglasem]
- 2026 Round 1, govt-fee MBBS, General boys closed at AIR 14,220 / 589 marks; management-fee seats in the same colleges closed at AIR 51,035 / 534 marks. [ALLEN]
- After 2026 Round 3, all government MBBS seats were filled and about 1,039 MBBS seats were vacant across 15 private colleges. [Medical Dialogues]
- Round 3 sent 1,230 seats to candidates from other states, mostly private-college general seats. [neet2seat]
- Rajasthan allots by **state merit rank**, has **separate girls' seats**, an **MBC** category, **ST Tribal Area (TSP)** seats, and **government-fee vs management-fee** seats inside government/RajMES colleges. A predictor built on AIR and the five national categories will give Rajasthan students wrong answers.
- Choices were scrapped and refilled before Round 3 in 2026, and missing a Round 3 seat forfeits the deposit and bars the stray round. These rules change yearly; the calendar/alert feature should carry them as plain-Hindi notices.

## How to build the real predictor (Phase 3, May–Jun 2027)

1. **Collect the official PDFs each year** from the Rajasthan board site (2026: ug.neetrajasthan.com) and MCC (mcc.nic.in): provisional allotment lists for every round, seat matrices, merit lists. These are candidate-wise lists (roll no., AIR, state rank, category, gender, college, seat type).
2. **Parse them into one table** (one row per allotted seat). The files are large PDFs; download them from an Indian connection.
3. **Compute closing ranks** per year × round × college × seat type × category × gender, for both AIR and state rank.
4. **Validate** against the ALLEN category summaries in 04a: the overall closing rank per category must match.
5. **Show ranges, not promises**: "In 2025 and 2026 this seat closed between X and Y in Round 1 and went to Z by Round 3."
6. **Add MCC AIQ** (15% govt seats, deemed, central institutes) from MCC's round-wise result PDFs the same way.

Gaps to fill then: per-college reserved-category closing ranks; private-college ranks and fees per quota; MCC AIQ per college; 2024 for a three-year trend; BDS management-fee.

## Strategic notes

- Counselling predictors are crowded (Careers360, ALLEN, neet2seat, several smaller sites). Ours wins only if it is Rajasthan-specific (state rank, girls' seats, MBC, TSP, fee types), in Hindi, tied to the student's own mock percentile months before the exam, and backed by WhatsApp alerts for each round.
- Large Sikar coachings already publish Rajasthan counselling articles and closing-rank posts, so this module overlaps with them directly.

## Sources

Source keys used in the CSVs: ALLEN-2025-R1/R2/R3 and ALLEN-2026-R1 = the four ALLEN links below; NEET2SEAT-2026-R3 = the neet2seat Round 3 link; CAREERS360-2025 = the Careers360 link.

- [ALLEN — Rajasthan 2025 Round 1 closing ranks](https://news.allen.in/rajasthan-neet-ug-2025-counselling-1st-round-seat-allotment/)
- [ALLEN — Rajasthan 2025 Round 2 closing ranks](https://news.allen.in/neet-ug-rajasthan-counselling-2025-round-2-provisional-seat-allotment-list/)
- [ALLEN — Rajasthan 2025 Round 3 closing ranks](https://news.allen.in/rajasthan-neet-ug-counselling-third-round-seat-allotment-released/)
- [ALLEN — Rajasthan 2026 Round 1 closing ranks and scores](https://news.allen.in/neet-ug-2026-rajasthan-counselling-round-1-seat-allotment-released/)
- [neet2seat — Rajasthan 2026 Round 3 result and college closing ranks](https://neet2seat.com/news/rajasthan-neet-ug-2026-round-3-result-report-by-15-october-seats-to-other-states)
- [neet2seat — 2026 Round 3 choices refilled](https://neet2seat.com/news/rajasthan-neet-ug-2026-round-3-schedule-fresh-choices)
- [Careers360 — Rajasthan NEET cutoff (2025 college table)](https://medicine.careers360.com/articles/rajasthan-neet-cut-off-2026)
- [aglasem — Rajasthan counselling 2026 seat structure](https://admission.aglasem.com/rajasthan-mbbs-bds/)
- [Medical Dialogues — 1,039 private MBBS seats vacant after Round 3, 2026](https://medicaldialogues.in/amp/news/education/medical-admissions/rajasthan-neet-counselling-1039-mbbs-seats-vacant-across-15-private-medical-colleges-after-round-3-181294)
