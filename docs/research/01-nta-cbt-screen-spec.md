# NTA Computer-Based Test screen — spec for our test engine

Prepared 12–13 Nov 2026 for neet-site Phase 0 (Blueprint section 3, module 3).
Purpose: our exam screen must behave exactly like NTA's, so a student who practises on it meets nothing new on exam day.

Status of facts: rules marked [NTA] come from NTA's own CBT guidelines (Appendix "Computer Based Test (CBT) Guidelines" in NTA information bulletins, here the CUET-UG 2025 copy). Rules marked [widely reported] come from coaching and exam sites describing the JEE Main / CUET screen and agree with each other, but are not in NTA's text. NEET's own CBT bulletin is not out yet (expected around Feb 2027); re-check everything when it is.

## 1. Screen flow

1. **Login page** — roll number / login ID and password. [NTA]
2. **Welcome screen** — candidate photo, name, subject/paper. [NTA]
3. **General instructions page** — full rules, legend of palette symbols, language choice; a checkbox "I have read and understood the instructions" and a "Proceed"/"I am ready to begin" button that becomes active only at start time. [NTA for instructions; checkbox/button wording widely reported — use NTA wording when the NEET bulletin appears]
4. **Exam screen** (below).
5. **Submit / time-up** — exam ends automatically when the timer reaches zero; candidate is not required to submit. [NTA] Our engine also offers a Submit button (JEE Main and most mocks show one) with a confirmation summary.
6. **After submit (our addition)** — result and analysis; NTA shows nothing at this point.

## 2. Exam screen layout

| Area | Position | Contents |
| --- | --- | --- |
| Header | Top | Exam name, candidate name and photo (top right), countdown timer (top right), language selector [NTA: language change via the profile area at top right] |
| Section tabs | Top bar, below header | One tab per section; current section highlighted; hovering/legend shows counts per status [NTA] |
| Question area | Left / centre, large | Question number, question text (with images), four options with radio buttons; scroll controls to jump to top/bottom of a long question [NTA] |
| Question palette | Right side | Grid of question-number buttons coloured by status; legend with counts above it [NTA]; a ">" arrow collapses it and "<" reopens it [NTA] |
| Action bar | Bottom of question area | Save & Next, Save & Mark for Review, Clear Response, Mark for Review & Next, Back, Next, Submit [widely reported for JEE Main; NTA text names Save & Next, Mark for Review & Next, Clear Response] |
| Question Paper button | Top right | Opens the whole paper in a pop-up for reading [NTA] |

## 3. Palette statuses (five)

| # | Status | Look (use these) | How a question gets it | Evaluated? |
| --- | --- | --- | --- | --- |
| 1 | Not Visited | Grey/white square | Never opened | No |
| 2 | Not Answered | Red/orange shape | Opened, no saved answer | No |
| 3 | Answered | Green shape | Option chosen + Save & Next | Yes |
| 4 | Marked for Review | Purple circle | Mark for Review & Next with no saved answer | **No** [NTA] |
| 5 | Answered & Marked for Review | Purple circle with green dot/tick | Option chosen + Save & Mark for Review (or Mark for Review & Next with an option chosen) | **Yes** [NTA] |

Look column: [widely reported, consistent across sources]. Some sources describe Not Answered as orange and Marked for Review as blue rather than red/purple; confirm on NTA's official mock test before final styling. The JEE Main screen is commonly shown with different shapes per status (not only colours); copy the shapes too, so colour-blind students can tell states apart.

## 4. Buttons — exact behaviour

| Button | Behaviour | Source |
| --- | --- | --- |
| Option (radio) | Click to select; click the same option again to deselect; click another to change | [NTA] |
| Save & Next | Saves the selected option, sets status Answered, opens next question; on the last question of a section, moves to the first question of the next section | [NTA] |
| Save & Mark for Review | Saves the option, sets Answered & Marked for Review, moves to next | [widely reported; JEE Main] |
| Mark for Review & Next | Marks for review and moves on; if an option is selected NTA's text says the answer is saved and marked (status 5); if none, status 4 | [NTA] |
| Clear Response | Removes the selected/saved option for the current question | [NTA] |
| Palette number | Jumps straight to that question; **does not save** the current one | [NTA] |
| Back / Next | Move without saving | [widely reported] |
| Section tab | Opens that section's questions; free movement between sections at any time | [NTA] |
| Submit | Ends the test after a confirmation showing counts per status | [our engine; JEE Main shows one] |

Key trap to teach: choosing an option is **not** an answer until it is saved. Leaving a question by palette click or Back/Next discards an unsaved choice. Our tutorial must make students feel this once.

Ambiguity to resolve when the NEET bulletin comes out: whether Mark for Review & Next saves a selected option (NTA's CUET text says yes; some JEE descriptions say no). Build it as a setting, default = NTA text (saves).

## 5. Timer

- Server-controlled clock; countdown at the top right; shows remaining time. [NTA]
- Auto-ends at zero; no submission needed. [NTA]
- If a computer fails, the candidate is moved and lost time is restored. [NTA] → our engine: resume the same attempt with the server's remaining time.
- Our addition: warnings at 15 and 5 minutes left (configurable, can be switched off for strict mode).

## 6. Language

- Candidate picks Hindi or English; can change the question language for the whole paper during the exam. [NTA]
- English version is final in case of translation doubt. [NTA] → show this line on the instructions page.
- Our addition: per-question "view in other language" toggle (Blueprint innovation 7), off in strict exam mode.

## 7. Input rules

- Physical keyboard disabled for the whole exam; mouse only. [NTA] → in strict mode, ignore key presses; on phones, touch only.
- Numerical answers use an on-screen keypad. [NTA] (Not needed for NEET MCQs; needed later for JEE.)
- Rough sheets on paper, returned after the exam. [NTA] → our tutorial tells students to practise with paper rough sheets.

## 8. NEET paper settings (configurable, not hard-coded)

| Setting | Current value | Note |
| --- | --- | --- |
| Questions | 180 (Physics 45, Chemistry 45, Botany 45, Zoology 45) | NEET 2025–26 pattern; 2027 not notified |
| Duration | 180 min | Reports say 2027 may add 15 min, as in the 2026 re-exam; keep configurable |
| Marking | +4 / −1 / 0 | Configurable per test |
| Sections | Physics, Chemistry, Botany, Zoology | Each a tab |
| Shifts | Possibly 5–6 days of shifts in 2027 | Means normalised scores; our percentile should note this |

## 9. What our engine adds on top (does not change the NTA look)

- Strict mode (exactly NTA) vs practice mode (hints off, but per-question language toggle and pause allowed).
- Records for analysis: time on each question, every option change, saves, review marks, order of visits.
- Resume after power cut or network loss.
- "First time on a computer" 3-minute tutorial using five dummy questions, one for each palette state.

## Sources

- [NTA CBT Guidelines, Appendix-V, CUET-UG 2025 bulletin copy](https://assets.collegedunia.com/public/image/CUET_UG_2025_CBT_Guidelines_d56f5fd7786f3ac86475a8e3da67c03b.pdf)
- [Careers360 — how JEE Main online exam is conducted (palette colours)](https://engineering.careers360.com/articles/how-jee-online-exam-conducted)
- [PW — JEE Main 2026 online exam tips](https://www.pw.live/iit-jee/exams/jee-main-2026-online-exam-tips)
- [cuet.com — CUET CBT exam screen](https://www.cuet.com/cuet-cbt-exam)
- [open-exam-prep — NTA CBT interface and button mechanics](https://open-exam-prep.com/study-guides/in-ugc-net/introduction/exam-day-cbt-mechanics)
- [Motion — NEET 2027 expected changes (duration)](https://motion.ac.in/examinfo/neet-exam/)
- [Deccan Chronicle — NEET 2027 over six days at 1,000+ centres](https://www.deccanchronicle.com/nation/neet-ug-2027-revamp-six-day-computer-test-planned-at-over-1000-centres-1969315)
