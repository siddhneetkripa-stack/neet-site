// NEET CBT engine: a Cloudflare Worker that serves the static site (same origin) and the test API under /api/.
// Adapted from the vkcscience.com test system (Musafir2507/vkcscience-tests). Brand and domain: not decided yet.

import { verifyGoogleIdToken, upsertStudent, createSession, currentStudent, destroySession } from "./auth.js";
import {
  testRow, windowState, hasAccess, getTest, listTests, getAttempt, isOpen, startAttempt, dropAttempt,
  examQuestions, responsesOf, saveItems, scoreAttempt, settle, resultPayload,
} from "./tests.js";

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const fail = (status, error) => json({ error }, status);

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

function sameOrigin(request) {
  // State-changing calls must come from our own pages (cookie is SameSite=Lax; this blocks cross-site form posts too).
  const o = request.headers.get("Origin");
  return !o || o === new URL(request.url).origin;
}

async function api(request, env, url) {
  const path = url.pathname.replace(/^\/api/, "");
  const method = request.method;
  if (method !== "GET" && !sameOrigin(request)) return fail(403, "Bad origin");
  const student = await currentStudent(request, env);

  if (path === "/me" && method === "GET") {
    return json({
      site: env.SITE_NAME, google_client_id: env.GOOGLE_CLIENT_ID, dev_login: env.DEV_LOGIN === "1",
      student: student ? { name: student.name, email: student.email, picture: student.picture, admin: !!student.is_admin } : null,
    });
  }
  if (path === "/auth/google" && method === "POST") {
    const { credential } = await body(request);
    try {
      const p = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID);
      const s = await upsertStudent(env, { sub: p.sub, email: p.email, name: p.name, picture: p.picture });
      return json({ ok: true, name: s.name }, 200, { "set-cookie": await createSession(env, s.id) });
    } catch (e) { return fail(401, "Sign-in failed: " + e.message); }
  }
  if (path === "/auth/dev" && method === "POST" && env.DEV_LOGIN === "1") {
    const { email = "student@dev.test", name = "Dev Student" } = await body(request);
    const s = await upsertStudent(env, { sub: "dev:" + email, email, name });
    return json({ ok: true }, 200, { "set-cookie": (await createSession(env, s.id)).replace("; Secure", "") });
  }
  if (path === "/auth/logout" && method === "POST") return json({ ok: true }, 200, { "set-cookie": await destroySession(request, env) });

  if (path === "/cbt/tests" && method === "GET") return json({ tests: await listTests(env, student), signed_in: !!student });

  let m = path.match(/^\/cbt\/test\/([a-z0-9-]+)(\/start|\/retake)?$/);
  if (m) {
    const t = await getTest(env, m[1]);
    if (!t || windowState(t, student) === "hidden") return fail(404, "No such test");
    const info = testRow(t);
    if (!student) return json({ test: info, signin_required: true }, 401);
    if (!(await hasAccess(env, t, student))) return json({ test: info, locked: true }, 403);
    const state = windowState(t, student);
    if (method === "GET" && !m[2]) {
      let a = await env.DB.prepare("SELECT * FROM attempts WHERE test_slug = ? AND student_id = ?").bind(t.slug, student.id).first();
      if (a) a = await settle(env, a, t);
      return json({
        test: { ...info, state }, questions: await examQuestions(env, t.slug), server_now: Date.now(),
        attempt: a ? { id: a.id, started_at: a.started_at, deadline_at: a.deadline_at, submitted: !!a.submitted_at, lang: a.lang } : null,
        responses: a && !a.submitted_at ? await responsesOf(env, a.id) : {},
        student: { name: student.name },
      });
    }
    if (method === "POST" && m[2] === "/start") {
      if (state !== "open") return fail(409, "This test is not open now");
      const { lang } = await body(request);
      const a = await startAttempt(env, t, student, lang);
      return json({ attempt: { id: a.id, started_at: a.started_at, deadline_at: a.deadline_at, submitted: !!a.submitted_at }, server_now: Date.now() });
    }
    if (method === "POST" && m[2] === "/retake") {
      const a = await env.DB.prepare("SELECT * FROM attempts WHERE test_slug = ? AND student_id = ?").bind(t.slug, student.id).first();
      if (a) await dropAttempt(env, a);
      return json({ ok: true });
    }
  }

  m = path.match(/^\/cbt\/attempt\/(\d+)\/(save|submit|result)$/);
  if (m) {
    if (!student) return fail(401, "Please sign in");
    let a = await getAttempt(env, Number(m[1]), student);
    if (!a) return fail(404, "No such attempt");
    const t = await getTest(env, a.test_slug);
    if (m[2] === "save" && method === "POST") {
      if (!isOpen(a)) return json({ closed: true, submitted: !!a.submitted_at }, 409);
      const { items } = await body(request);
      return json({ saved: await saveItems(env, a, items), server_now: Date.now() });
    }
    if (m[2] === "submit" && method === "POST") {
      if (isOpen(a)) {
        const { items } = await body(request);
        await saveItems(env, a, items);
        a = await scoreAttempt(env, a, t, true);
      } else a = await settle(env, a, t);
      return json(await resultPayload(env, a, t));
    }
    if (m[2] === "result" && method === "GET") {
      a = await settle(env, a, t);
      if (!a.submitted_at) return fail(409, "Not submitted yet");
      return json(await resultPayload(env, a, t));
    }
  }
  return fail(404, "Not found");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await api(request, env, url); }
      catch (e) { console.log("api error", url.pathname, e && e.stack); return fail(500, "Server error"); }
    }
    return env.ASSETS.fetch(request);
  },
};
