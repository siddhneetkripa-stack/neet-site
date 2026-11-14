# CBT engine (Cloudflare Worker + D1)

The exam screen (`exam.html` + `assets/exam.js`) in **server mode**: `exam.html?cbt=<slug>`.
Adapted from the vkcscience.com test system (Musafir2507/vkcscience-tests): Google sign-in checked on the server,
the clock and the answer key kept in D1, every saved answer sent to the server, keys and solutions returned only
after submitting, answer-key fixes re-mark submitted attempts.
The Worker also serves the whole static site, so pages and API share one origin (sign-in cookie works without
third-party cookies). Without the Worker (GitHub Pages) `exam.html` still runs the local PYQ prototype tests.

**Answer keys never go in this public repo.** Test files live in the private `neet-sources` repo, `cbt/tests/`,
built by `tools/make_cbt.py` (this repo) from the plans in `content/cbt-plans/<subject>.json` (which questions, in
which order; picked by `tools/plan_cbt.py`) and the banks: `content/questions/` here and the private chemistry bank
(`Musafir2507/chemistry-bank`, checked out next to this repo). Since 14 Nov 2026 this replaces chemistry-bank's own
`cbt/make_cbt.py` (whose `plan.json` was carried over unchanged into `content/cbt-plans/chemistry.json`).
neet-sources' workflow "Load CBT tests" turns them into SQL with `worker/scripts/build-tests-sql.mjs` and loads D1.
Owner's deploy steps: `docs/deploy-checklist.md`.

## Files
- `src/index.js` routes: `/api/me`, `/api/auth/google|dev|logout`, `/api/cbt/tests`, `/api/cbt/test/<slug>[/start|/retake]`,
  `/api/cbt/attempt/<id>/save|submit|result`; everything else → static site.
- `src/tests.js` attempts, saving, scoring (+4/−1 from each test's `marking`; single-correct and numeric answers).
- `src/auth.js` Google ID-token check + cookie sessions (same as vkcscience).
- `migrations/` D1 schema. `scripts/build-tests-sql.mjs` test files → SQL (skips unchanged tests by hash).

## Test file (in neet-sources/cbt/tests/<slug>.json)
`slug, exam (neet-chem|neet-phy|neet-full), subject, kind (chapter|pyq|mock), branch, chapter (one chapter) /
chapters [...], title{en,hi}, subtitle{en,hi}, access (free|paid), product (paid only), status (live|draft|archived),
duration_min, marking{correct,wrong,blank}, reveal, rules, sort_order, sections[{id, name{en,hi}, count}],
allowOldNcert?, questions[{id, type, chapter, section, topic{en,hi}, paras, paraTitles[{en,hi}], format, nature,
difficulty (1 easy|2 medium|3 hard), source?{en,hi}, text{en,hi}{status,q,o,sol,hint?,trap?},
answer{kind:"single",index,alsoAccepted?} | {kind:"numeric",value,tol}}]`.
Before submitting the browser gets id, type, topic, paras, chapter, paraTitles, section, format, difficulty and the
question text; key, solution and source come with the result. Mocks have three sections (Physics, Chemistry,
Biology); the result page shows marks per chapter and the NCERT paragraphs of wrong/unanswered questions, each
linking to `./#/pyq/<chapter>/s/<paragraph>`.
Paid tests stay `draft` (hidden) until passes are on sale; prices are not decided — no price is stored here.

## One-time setup (owner)
1. Cloudflare account (a new one for the NEET brand, or the VKC one for now). Create the database:
   `npx wrangler d1 create neet-cbt` → put the `database_id` in `wrangler.toml`.
2. Google sign-in: Google Cloud console → APIs & Services → Credentials → OAuth client ID (Web). Authorised JavaScript
   origins: the workers.dev address (later the real domain). Put the Client ID in `GOOGLE_CLIENT_ID` in `wrangler.toml`.
3. API token (Cloudflare → My Profile → API Tokens → "Edit Cloudflare Workers" + D1 edit) and the account ID:
   add both as GitHub Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` in **neet-site and neet-sources**.
4. Merge to main → "Deploy CBT engine" runs; then run "Load CBT tests" in neet-sources.
Domain: when chosen, add a `routes` block (see vkcscience-tests/wrangler.toml) and add the domain to the Google origins.

## Local testing
```
cd worker && npm install
npx wrangler d1 migrations apply DB --local --env dev
node scripts/build-tests-sql.mjs ../../neet-sources/cbt/tests > build/tests.sql
npx wrangler d1 execute DB --local --env dev --file build/tests.sql
npx wrangler dev --env dev        # "Sign in (dev)" button, no Google needed
```
Tested 13 Nov 2026 (headless Chrome, 390 px and 1280 px): sign-in, start, save, mark for review, reload, resume on a
cleared browser (answers restored from the server), submit, result with topic-wise table; browser and server scores agree.
Tested 14 Nov 2026 with all 79 tests loaded: Hindi-first list/result, mock with 3 sections, chapter test scored
35 = 10 × 4 − 5 × 1 as expected, weak-paragraph links open the chapter page at that paragraph; no console errors.
