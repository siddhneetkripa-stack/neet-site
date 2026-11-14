# Deploy checklist: CBT tests (owner)

What you create by hand, once, so the CBT engine (`worker/`) goes live. Everything else is automatic after the
branches are merged. Time needed: about 30 minutes. Nothing here costs money (Cloudflare free plan, Google free).

Brand and domain are not decided: the engine first runs on a free `workers.dev` address. When the domain is bought,
do step 6.

## 1. Cloudflare account and D1 database

1. Make (or use) a Cloudflare account: https://dash.cloudflare.com/sign-up. A new account for the NEET brand is
   cleaner; the VKC one also works for now (the Worker is separate from vkcscience).
2. Note the **Account ID**: Cloudflare dashboard → Workers & Pages → right-hand side "Account ID" (32 letters/numbers).
3. Choose the workers.dev subdomain when Cloudflare asks (Workers & Pages → first visit), e.g. `neetprep`.
   The site will then be at `https://neet-cbt.<subdomain>.workers.dev`.
4. Create the database: Workers & Pages → D1 SQL Database → **Create** → name `neet-cbt` → Create.
   Copy its **Database ID**.
5. Send me (or paste into `worker/wrangler.toml`, line `database_id = …` under `[[d1_databases]]`) that Database ID.
   It is not a secret; it goes in the public repo.

## 2. Cloudflare API token (for GitHub to deploy)

Cloudflare → My Profile (top right) → API Tokens → **Create Token** → template **"Edit Cloudflare Workers"** → Use template.
- Permissions: keep the template's rows, and **add one row: Account → D1 → Edit**.
- Account Resources: Include → your account. Zone Resources: All zones (or none; no domain yet).
- Continue → Create Token → **copy the token now** (it is shown only once).

## 3. Google sign-in (OAuth client ID)

Google Cloud console: https://console.cloud.google.com (use the brand Google account, e.g. siddhneetkripa@gmail.com).
1. Create a project, e.g. "NEET practice".
2. APIs & Services → **OAuth consent screen** → External → app name (placeholder brand is fine), support email,
   developer email → Save. Scopes: none to add (sign-in uses only email/profile/openid). Then **Publish app**
   ("In production"). In "Testing" mode only the test users you list can sign in.
3. APIs & Services → Credentials → **Create credentials → OAuth client ID** → Application type **Web application**.
   - Authorised JavaScript origins: `https://neet-cbt.<subdomain>.workers.dev` (from step 1.3).
     Add `http://localhost:8787` too if you want to test sign-in locally.
   - Authorised redirect URIs: none needed.
4. Copy the **Client ID** (ends in `.apps.googleusercontent.com`). It is public, not a secret: it goes in
   `worker/wrangler.toml` as `GOOGLE_CLIENT_ID` (send it to me or paste it in place of `SET-ME`).

## 4. GitHub secrets (both repos)

In **siddhneetkripa-stack/neet-site** and again in **siddhneetkripa-stack/neet-sources**:
Settings → Secrets and variables → Actions → **New repository secret**:

| Name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | the token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | the Account ID from step 1.2 |

neet-sources is private and its loader workflow reads the public neet-site repo, so no other secret is needed.

## 5. Go live

1. `worker/wrangler.toml` has the real `database_id` and `GOOGLE_CLIENT_ID` (commit on the branch, or tell me).
2. Say "merge": `claude/cbt-from-bank` goes into `main` in **neet-site** first (workflow "Deploy CBT engine" creates
   the tables and deploys the Worker), then in **neet-sources** (workflow "Load CBT tests" loads the 79 tests).
   If neet-sources was merged first, re-run its workflow by hand: Actions → Load CBT tests → Run workflow.
3. Open `https://neet-cbt.<subdomain>.workers.dev/exam.html`, sign in with Google, take the free mock or a free
   chapter test, submit, and check the result page. Admin emails (`ADMIN_EMAILS` in wrangler.toml) also see the
   paid tests, which stay hidden (`draft`) for everyone else until passes go on sale.

## 6. Later: the domain

When the brand domain is bought and added to Cloudflare: add a `routes` block to `worker/wrangler.toml`
(`routes = [{ pattern = "example.in", custom_domain = true }]`), add `https://example.in` to the Google client's
Authorised JavaScript origins, and merge. GitHub Pages can keep serving the static site meanwhile.

## What stays private

Answer keys and solutions are only in neet-sources `cbt/tests/` and in D1; the browser gets them after submitting.
`content/cbt-plans/` in neet-site lists only question ids.
