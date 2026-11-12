# NEET UG syllabus → NCERT chapter map

Prepared 13 Nov 2026 for question tagging (Blueprint section 6) and the PYQ Explorer.

The point in one line: **rationalised NCERT does not cover the whole NEET syllabus.** The biggest gap is the whole p-Block (Groups 13–18), which NEET keeps but the current NCERT books dropped. There are smaller gaps in every subject. Pre-2024 PYQs also include topics NEET has since dropped. Both need flags in the question format.

Basis: NEET UG 2026 syllabus (NMC, unchanged from 2024–25; the 2027 syllabus is not out yet), read from Motion's copy of the official text. NCERT chapter numbers are from neet-sources/ncert/index.json (current rationalised books: Physics 14+14, Chemistry 9+10, Biology 19+13). Items marked "verify" should be checked against the NCERT text in neet-sources before tagging.

## Proposed question-format fields

- `ncert_ref`: class-subject-chapter-paragraph, or `null`
- `ncert_status`: `in_ncert` | `old_ncert_only` (topic in NEET, dropped from rationalised NCERT; use the pre-2023 edition) | `lab_manual` (Experimental Skills / Practical Chemistry) | `outside_ncert` (in NEET, never in NCERT)
- `syllabus_status`: `current` | `dropped_2024` (old PYQ on a topic NEET no longer has; show it as "out of syllabus", keep it out of mocks)

## Physics (20 units)

| NEET unit | NCERT chapters (class-chapter) | In NEET but not in rationalised NCERT (verify) |
| --- | --- | --- |
| 1 Physics and Measurement | 11-1 Units and Measurement | Significant figures, errors in measurement |
| 2 Kinematics | 11-2, 11-3 | Relative velocity |
| 3 Laws of Motion | 11-4 | — |
| 4 Work, Energy and Power | 11-5 | — |
| 5 Rotational Motion | 11-6 | Parallel and perpendicular axis theorems |
| 6 Gravitation | 11-7 | — |
| 7 Properties of Solids and Liquids | 11-8, 11-9, 11-10 | — |
| 8 Thermodynamics | 11-11 | — |
| 9 Kinetic Theory of Gases | 11-12 | — |
| 10 Oscillations and Waves | 11-13, 11-14 | — |
| 11 Electrostatics | 12-1, 12-2 | — |
| 12 Current Electricity | 12-3 | — |
| 13 Magnetic Effects of Current and Magnetism | 12-4, 12-5 | — |
| 14 EMI and Alternating Currents | 12-6, 12-7 | — |
| 15 Electromagnetic Waves | 12-8 | — |
| 16 Optics | 12-9, 12-10 | — |
| 17 Dual Nature of Matter and Radiation | 12-11 | — |
| 18 Atoms and Nuclei | 12-12, 12-13 | — |
| 19 Electronic Devices | 12-14 | Logic gates |
| 20 Experimental Skills | NCERT lab manual (not in textbooks) | All 18 listed experiments (vernier, screw gauge, pendulum, Young's modulus, capillary rise, viscosity, resonance tube, specific heat, metre bridge, Ohm's law, galvanometer half-deflection, focal lengths, prism, travelling microscope, p-n and Zener diode curves, identifying components) |

Not in NEET 2026 (tag old PYQs `dropped_2024`): Doppler effect, Reynolds number, Newton's law of cooling, Stefan's law / black-body radiation, Van de Graaff generator, potentiometer, cyclotron, Earth's magnetism, human eye and its defects, transistors, Davisson–Germer experiment, radioactivity and decay law, communication systems.

## Chemistry (20 units)

| NEET unit | NCERT chapters | In NEET but not in rationalised NCERT |
| --- | --- | --- |
| 1 Some Basic Concepts | 11-1 | — |
| 2 Atomic Structure | 11-2 | — |
| 3 Chemical Bonding | 11-4 | — |
| 4 Chemical Thermodynamics | 11-5 | — |
| 5 Solutions | 12-1 | — |
| 6 Equilibrium | 11-6 | — |
| 7 Redox and Electrochemistry | 11-7, 12-2 | — |
| 8 Chemical Kinetics | 12-3 | — |
| 9 Classification and Periodicity | 11-3 | — |
| **10 p-Block Elements (Groups 13–18)** | **None** | **Whole unit.** Use old NCERT: Class 11 "The p-Block Elements" (Groups 13–14) and Class 12 "The p-Block Elements" (Groups 15–18) |
| 11 d- and f-Block Elements | 12-4 | — |
| 12 Coordination Compounds | 12-5 | — |
| 13 Purification and Characterisation | 11-8 | — |
| 14 Basic Principles of Organic Chemistry | 11-8 | — |
| 15 Hydrocarbons | 11-9 | — |
| 16 Organic Compounds containing Halogens | 12-6 | — |
| 17 Organic Compounds containing Oxygen | 12-7, 12-8 | — |
| 18 Organic Compounds containing Nitrogen | 12-9 | Diazonium salts (verify) |
| 19 Biomolecules | 12-10 | — |
| 20 Principles related to Practical Chemistry | NCERT lab manual | Detection of elements and functional groups; preparation of Mohr's salt, potash alum, acetanilide, aniline yellow, iodoform; titrations; salt analysis; enthalpy, sols and kinetics experiments |

Not in NEET 2026 (tag old PYQs `dropped_2024`): States of Matter, Solid State, Surface Chemistry, Hydrogen, s-Block Elements, Metallurgy (isolation of elements), Polymers, Chemistry in Everyday Life, Environmental Chemistry; also preparation of ethers, cyanides/isocyanides, polysaccharides, reactivity of lanthanoids.

**Action for neet-sources:** add the old-edition NCERT p-Block chapters (Class 11 and Class 12) as a separate folder (e.g. `ncert-old/`), clearly labelled as pre-rationalisation editions, so p-Block questions can still be traced to NCERT lines. Same for the Physics and Biology gap topics above once verified.

## Biology (10 units)

| NEET unit | NCERT chapters | In NEET but not in rationalised NCERT (verify) |
| --- | --- | --- |
| 1 Diversity in Living World | 11-1 to 11-4 | — |
| 2 Structural Organisation in Animals and Plants | 11-5, 11-6, 11-7 | Families Malvaceae, Cruciferae, Leguminosae, Compositae, Graminae (NCERT describes Fabaceae, Solanaceae, Liliaceae); frog |
| 3 Cell Structure and Function | 11-8, 11-9, 11-10 | Classification of enzymes |
| 4 Plant Physiology | 11-11, 11-12, 11-13 | — |
| 5 Human Physiology | 11-14 to 11-19 | — |
| 6 Reproduction | 12-1, 12-2, 12-3 | Reproduction in organisms (the dropped NCERT chapter) |
| 7 Genetics and Evolution | 12-4, 12-5, 12-6 | — |
| 8 Biology and Human Welfare | 12-7, 12-8 | Dengue, chikungunya; tobacco abuse |
| 9 Biotechnology | 12-9, 12-10 | — |
| 10 Ecology and Environment | 12-11, 12-12, 12-13 | — |

Not in NEET 2026 (tag old PYQs `dropped_2024`): Transport in Plants, Mineral Nutrition, Digestion and Absorption, secondary growth, photoperiodism, vernalisation, seed dormancy, earthworm, cockroach, Strategies for Enhancement in Food Production, Environmental Issues, ecological succession, nutrient cycling, eye and ear, reflex arc.

## What this means for the site

1. **NCERT line tracing has holes.** p-Block alone is about 3–4 NEET questions a year by coaching estimates. Without old-edition text, those questions show "No current NCERT source" — say that honestly on the page rather than linking a wrong paragraph.
2. **PYQ Explorer must hide or flag pre-2024 questions on dropped topics.** Students should still be able to see them, but they must never land in a mock.
3. **Experimental Skills and Practical Chemistry** need their own "Lab" nodes in the NCERT tree, sourced from the NCERT lab manuals.
4. When the NEET 2027 syllabus is published (expected around Dec 2026–Jan 2027), re-run this check; the CBT switch itself is not expected to change the syllabus.

## Sources

- [NEET UG 2026 Physics syllabus (Motion copy of NMC text)](https://motion.ac.in/blog/wp-content/uploads/2025/12/NEET-Syllabus-2026-Physics.pdf)
- [NEET UG 2026 Chemistry syllabus (Motion copy)](https://motion.ac.in/blog/wp-content/uploads/2025/12/NEET-Syllabus-2026-Chemistry.pdf)
- [NEET UG 2026 Biology syllabus (Motion copy)](https://motion.ac.in/blog/wp-content/uploads/2025/12/NEET-Syllabus-2026-Biology.pdf)
- [Careers360 — NMC NEET UG 2026 syllabus released, unchanged](https://medicine.careers360.com/articles/nmc-neet-ug-syllabus-2026-released-download-official-pdf)
- [PW — p-Block in NEET but not in revised NCERT](https://www.pw.live/neet/exams/updated-neet-chemistry-syllabus)
- [PW — NEET Physics topics retained though deleted from NCERT](https://www.pw.live/neet/exams/updated-neet-physics-syllabus)
- [PW store — NCERT vs NEET chapter-wise comparison](https://store.pw.live/blogs/neet-syllabus-2024-25-subject-wise-syllabus)
- neet-sources/ncert/index.json (current NCERT chapter list)
