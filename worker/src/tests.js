// CBT test logic, taken from the vkcscience.com engine: availability, attempts, saving, scoring, results.
// Answer keys and solutions never leave the server before the student has submitted.

const GRACE_MS = 90 * 1000; // network slack after the timer ends
const J = (s, d = null) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };

export function testRow(t) {
  const meta = J(t.meta, {});
  return {
    slug: t.slug, exam: t.exam, chapter: t.chapter, access: t.access, product: t.product, status: t.status,
    durationMin: t.duration_min, marking: J(t.marking, { correct: 4, wrong: -1, blank: 0 }),
    opens_at: t.opens_at, closes_at: t.closes_at, sort_order: t.sort_order, ...meta,
  };
}

export function windowState(t, student, now = Date.now()) {
  if (t.status === "draft" && student && student.is_admin) return "open";
  if (t.status !== "live") return "hidden";
  if (t.opens_at && now < Date.parse(t.opens_at)) return "upcoming";
  if (t.closes_at && now > Date.parse(t.closes_at)) return "closed";
  return "open";
}

export async function hasAccess(env, t, student) {
  if (t.access === "free") return true;
  if (!student) return false;
  if (student.is_admin) return true;
  if (!t.product) return false;
  const row = await env.DB.prepare("SELECT 1 FROM enrolments WHERE student_id = ? AND product = ?").bind(student.id, t.product).first();
  return !!row;
}

export const getTest = (env, slug) => env.DB.prepare("SELECT * FROM tests WHERE slug = ?").bind(slug).first();

export async function listTests(env, student) {
  const { results } = await env.DB.prepare(
    `SELECT t.*, (SELECT COUNT(*) FROM questions q WHERE q.test_slug = t.slug) AS qcount FROM tests t
     WHERE t.status = 'live' OR (t.status = 'draft' AND ?1 = 1) ORDER BY t.sort_order, t.slug`
  ).bind(student && student.is_admin ? 1 : 0).all();
  const mine = {};
  if (student) {
    const { results: as } = await env.DB.prepare("SELECT * FROM attempts WHERE student_id = ?").bind(student.id).all();
    for (const a of as) mine[a.test_slug] = a;
  }
  const out = [];
  for (const t of results) {
    const a = mine[t.slug];
    out.push({
      ...testRow(t), count: t.qcount, state: windowState(t, student), access_ok: await hasAccess(env, t, student),
      attempt: a ? { id: a.id, submitted: !!a.submitted_at, score: a.score, deadline_at: a.deadline_at } : null,
    });
  }
  return out;
}

export async function getAttempt(env, id, student) {
  const a = await env.DB.prepare("SELECT * FROM attempts WHERE id = ?").bind(id).first();
  if (!a || (a.student_id !== student.id && !student.is_admin)) return null;
  return a;
}

export const isOpen = (a, now = Date.now()) => !a.submitted_at && now <= Date.parse(a.deadline_at) + GRACE_MS;

export async function startAttempt(env, t, student, lang) {
  const old = await env.DB.prepare("SELECT * FROM attempts WHERE test_slug = ? AND student_id = ?").bind(t.slug, student.id).first();
  if (old) return old;
  const start = Date.now();
  let deadline = start + t.duration_min * 60000;
  if (t.closes_at) deadline = Math.min(deadline, Date.parse(t.closes_at));
  await env.DB.prepare("INSERT OR IGNORE INTO attempts (test_slug, student_id, started_at, deadline_at, lang) VALUES (?, ?, ?, ?, ?)")
    .bind(t.slug, student.id, new Date(start).toISOString(), new Date(deadline).toISOString(), lang === "hi" ? "hi" : "en").run();
  return env.DB.prepare("SELECT * FROM attempts WHERE test_slug = ? AND student_id = ?").bind(t.slug, student.id).first();
}

// A retake removes the old attempt (free practice tests; paid series can switch this off per test later).
export async function dropAttempt(env, a) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM responses WHERE attempt_id = ?").bind(a.id),
    env.DB.prepare("DELETE FROM attempts WHERE id = ?").bind(a.id),
  ]);
}

// Questions for the exam screen: no answers, no solutions.
export async function examQuestions(env, slug) {
  const { results } = await env.DB.prepare("SELECT qno, public, answer FROM questions WHERE test_slug = ? ORDER BY qno").bind(slug).all();
  return results.map((r) => {
    const p = J(r.public, {});
    return { ...p, qno: r.qno, answer: { kind: (J(r.answer, {}).kind) || "single" } };
  });
}

export async function responsesOf(env, attemptId) {
  const { results } = await env.DB.prepare("SELECT * FROM responses WHERE attempt_id = ?").bind(attemptId).all();
  const out = {};
  for (const r of results) out[r.qno] = { ans: r.ans, mark: !!r.mark, v: !!r.visited, t: r.t_ms, hist: J(r.hist, []) };
  return out;
}

// items: [{qno, ans (string|null), mark, v, t, hist}]
export async function saveItems(env, attempt, items) {
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM questions WHERE test_slug = ?").bind(attempt.test_slug).first();
  const stmts = [];
  for (const it of (items || []).slice(0, 400)) {
    const qno = Number(it.qno);
    if (!Number.isInteger(qno) || qno < 1 || qno > n.n) continue;
    let ans = it.ans === null || it.ans === undefined || it.ans === "" ? null : String(it.ans).slice(0, 24);
    if (ans !== null && !/^-?\d*\.?\d*$/.test(ans)) ans = null;
    const hist = JSON.stringify((Array.isArray(it.hist) ? it.hist : []).slice(-20).map((h) => ({ a: h && h.a != null ? String(h.a).slice(0, 24) : null, at: Number(h && h.at) || 0 })));
    stmts.push(env.DB.prepare(
      `INSERT INTO responses (attempt_id, qno, ans, mark, visited, t_ms, hist, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(attempt_id, qno) DO UPDATE SET ans = excluded.ans, mark = excluded.mark, visited = excluded.visited,
         t_ms = MAX(responses.t_ms, excluded.t_ms), hist = excluded.hist, updated_at = excluded.updated_at`
    ).bind(attempt.id, qno, ans, it.mark ? 1 : 0, it.v ? 1 : 0, Math.max(0, Math.min(36e5 * 4, Number(it.t) || 0)), hist));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return stmts.length;
}

export function isRight(answer, ans) {
  if (ans === null || ans === undefined || ans === "") return null;
  if (answer.kind === "numeric") { const v = parseFloat(ans); return !isNaN(v) && Math.abs(v - answer.value) <= (answer.tol || 0) + 1e-9; }
  return Number(ans) === answer.index;
}

export async function scoreAttempt(env, attempt, t, markSubmitted = true) {
  const marking = J(t.marking, { correct: 4, wrong: -1, blank: 0 });
  const { results } = await env.DB.prepare(
    `SELECT q.qno, q.answer, r.ans FROM questions q LEFT JOIN responses r ON r.attempt_id = ? AND r.qno = q.qno WHERE q.test_slug = ?`
  ).bind(attempt.id, attempt.test_slug).all();
  let correct = 0, wrong = 0, blank = 0;
  for (const r of results) {
    const ok = isRight(J(r.answer, {}), r.ans);
    if (ok === null) blank++; else if (ok) correct++; else wrong++;
  }
  const score = correct * marking.correct + wrong * marking.wrong + blank * (marking.blank || 0);
  const submittedAt = attempt.submitted_at || (markSubmitted ? new Date().toISOString() : null);
  await env.DB.prepare("UPDATE attempts SET score = ?, correct = ?, wrong = ?, blank = ?, submitted_at = ? WHERE id = ?")
    .bind(score, correct, wrong, blank, submittedAt, attempt.id).run();
  return { ...attempt, score, correct, wrong, blank, submitted_at: submittedAt };
}

export async function settle(env, attempt, t) {
  if (!attempt.submitted_at && Date.now() > Date.parse(attempt.deadline_at) + GRACE_MS) return scoreAttempt(env, attempt, t, true);
  if (attempt.submitted_at && attempt.score === null) return scoreAttempt(env, attempt, t, false); // key was corrected
  return attempt;
}

// After submitting: keys and solutions, plus the server's own totals.
export async function resultPayload(env, attempt, t) {
  const { results } = await env.DB.prepare("SELECT qno, qid, answer, solution FROM questions WHERE test_slug = ? ORDER BY qno")
    .bind(attempt.test_slug).all();
  const takers = await env.DB.prepare("SELECT COUNT(*) AS n FROM attempts WHERE test_slug = ? AND submitted_at IS NOT NULL").bind(t.slug).first();
  return {
    attempt: { id: attempt.id, score: attempt.score, correct: attempt.correct, wrong: attempt.wrong, blank: attempt.blank,
      started_at: attempt.started_at, submitted_at: attempt.submitted_at, deadline_at: attempt.deadline_at },
    key: results.map((r) => ({ qno: r.qno, id: r.qid, answer: J(r.answer, {}), solution: J(r.solution, {}) })),
    responses: await responsesOf(env, attempt.id),
    takers: takers ? takers.n : 0,
  };
}
