// Turns a folder of CBT test files (with keys — they live in the private neet-sources repo, cbt/tests/)
// into SQL that loads or updates them in D1. Taken from the vkcscience.com loader.
//
//   node scripts/build-tests-sql.mjs <tests-folder> [--hashes hashes.json] > tests.sql
//
// --hashes: output of `wrangler d1 execute DB --json --command "SELECT slug, content_hash FROM tests"`.
// Tests whose file is unchanged are skipped (D1 free tier: 100,000 row writes a day).
// A changed test's submitted attempts get score = NULL and are re-marked against the new key when next viewed.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const hi = args.indexOf("--hashes");
const hashFile = hi >= 0 ? args.splice(hi, 2)[1] : null;
const dir = args[0];
if (!dir) { console.error("usage: build-tests-sql.mjs <tests-folder> [--hashes file]"); process.exit(2); }
const live = new Map();
if (hashFile && existsSync(hashFile)) {
  try { for (const b of [].concat(JSON.parse(readFileSync(hashFile, "utf8")))) for (const r of (b && b.results) || []) live.set(r.slug, r.content_hash); }
  catch (e) { console.error("could not read hashes; writing every test:", e.message); }
}
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const errors = [], out = ["PRAGMA foreign_keys = ON;"];
let skipped = 0, written = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const raw = readFileSync(join(dir, file), "utf8");
  const t = JSON.parse(raw);
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 32);
  const where = file;
  if (!/^[a-z0-9-]+$/.test(t.slug || "")) errors.push(`${where}: bad slug`);
  for (const k of ["title", "exam", "duration_min", "marking", "questions"]) if (t[k] === undefined) errors.push(`${where}: missing ${k}`);
  const ids = new Set();
  (t.questions || []).forEach((x, i) => {
    const n = `${where} Q${i + 1}`;
    if (!x.id || ids.has(x.id)) errors.push(`${n}: missing or repeated id`); ids.add(x.id);
    for (const lang of ["en", "hi"]) {
      const tx = x.text && x.text[lang];
      if (!tx || !tx.q) errors.push(`${n}: no ${lang} text`);
      if (x.answer && x.answer.kind === "single" && (!Array.isArray(tx && tx.o) || tx.o.length !== 4)) errors.push(`${n}: ${lang} needs 4 options`);
    }
    const a = x.answer || {};
    if (a.kind === "single" && ![0, 1, 2, 3].includes(a.index)) errors.push(`${n}: answer index must be 0-3`);
    if (a.kind === "numeric" && typeof a.value !== "number") errors.push(`${n}: numeric answer needs a value`);
    if (!["single", "numeric"].includes(a.kind)) errors.push(`${n}: answer.kind must be single or numeric`);
  });
  if (t.sections) {
    const n = t.sections.reduce((a, s) => a + (s.count || 0), 0);
    if (n !== (t.questions || []).length) errors.push(`${where}: sections count ${n} questions, file has ${(t.questions || []).length}`);
    (t.questions || []).forEach((x, i) => { if (!t.sections.some((s) => s.id === x.section)) errors.push(`${where} Q${i + 1}: unknown section ${x.section}`); });
  }
  if (live.get(t.slug) === hash) { skipped++; continue; }
  written++;
  const meta = { title: t.title, subtitle: t.subtitle, rules: t.rules || {}, subject: t.subject, branch: t.branch,
    kind: t.kind || "chapter", chapters: t.chapters || (t.chapter ? [t.chapter] : []), sections: t.sections || null };
  out.push(`
INSERT INTO tests (slug, exam, chapter, meta, access, product, status, duration_min, marking, reveal, opens_at, closes_at, sort_order, content_hash, updated_at)
VALUES (${q(t.slug)}, ${q(t.exam)}, ${q(t.chapter)}, ${q(JSON.stringify(meta))}, ${q(t.access || "free")}, ${q(t.product)}, ${q(t.status || "live")},
  ${Number(t.duration_min)}, ${q(JSON.stringify(t.marking))}, ${q(t.reveal || "submit")}, ${q(t.opens_at)}, ${q(t.closes_at)}, ${Number(t.sort_order ?? 100)}, ${q(hash)}, datetime('now'))
ON CONFLICT(slug) DO UPDATE SET exam=excluded.exam, chapter=excluded.chapter, meta=excluded.meta, access=excluded.access, product=excluded.product,
  status=excluded.status, duration_min=excluded.duration_min, marking=excluded.marking, reveal=excluded.reveal, opens_at=excluded.opens_at,
  closes_at=excluded.closes_at, sort_order=excluded.sort_order, content_hash=excluded.content_hash, updated_at=excluded.updated_at;
DELETE FROM questions WHERE test_slug = ${q(t.slug)};`);
  t.questions.forEach((x, i) => {
    // public = what the exam screen gets before submitting (no key, no solution). chapter / paraTitles / section feed
    // the result page's weak-area lists; format and difficulty are labels only.
    const pub = { id: x.id, type: x.type || (x.answer.kind === "numeric" ? "numeric" : "single"), topic: x.topic, paras: x.paras || [],
      chapter: x.chapter || t.chapter || null, paraTitles: x.paraTitles || [], section: x.section || null,
      format: x.format || null, difficulty: x.difficulty || null, media: (x.media || []).filter((m) => m.where !== "solution"),
      text: Object.fromEntries(["en", "hi"].map((l) => [l, { status: x.text[l].status, q: x.text[l].q, o: x.text[l].o || [] }])) };
    const sol = Object.fromEntries(["en", "hi"].map((l) => [l, { sol: x.text[l].sol || "", hint: x.text[l].hint || "", trap: x.text[l].trap || "" }]));
    const solMedia = (x.media || []).filter((m) => m.where === "solution");
    if (solMedia.length) sol.media = solMedia; // a figure under the solution may give the answer away: sent after submitting only
    if (x.source) sol.source = x.source; // e.g. "NEET 2019": shown with the solution, after submitting
    out.push(`INSERT INTO questions (test_slug, qno, qid, public, answer, solution) VALUES (${q(t.slug)}, ${i + 1}, ${q(x.id)}, ${q(JSON.stringify(pub))}, ${q(JSON.stringify(x.answer))}, ${q(JSON.stringify(sol))});`);
  });
  out.push(`UPDATE attempts SET score = NULL WHERE test_slug = ${q(t.slug)} AND submitted_at IS NOT NULL;`);
}
if (errors.length) { console.error("Test files have problems:\n  " + errors.join("\n  ")); process.exit(1); }
console.error(`tests: ${written} to write, ${skipped} unchanged`);
if (out.length === 1) out.push("SELECT 1;");
process.stdout.write(out.join("\n") + "\n");
