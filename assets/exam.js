/* Exam-screen test engine (prototype, Blueprint section 3 module 3).
   Behaves like the NTA computer-based test screen: question palette with the five NTA states, countdown,
   Save & Next / Clear / Save & Mark for Review / Mark for Review & Next, Hindi/English switch per question,
   on-screen keypad for numerical answers. Every action is autosaved to this browser and the attempt
   resumes after a reload or power cut. Submit -> result with score, time per question and changed answers.

   Data: data/tests/<id>.json (built by tools/build.py from content/tests + content/questions).
   No backend yet: the timer runs in the browser and answer keys ship with the test file. The real engine
   must keep the timer and the keys on the server (Blueprint section 9). Plain JavaScript, no build step. */
(function () {
  'use strict';
  const root = document.getElementById('cbt');
  const params = new URLSearchParams(location.search);
  const SKEY = id => 'cbt-v1:' + id;
  // Server mode (exam.html?cbt=<slug>): the CBT Worker (worker/) keeps the clock and the answer key; every saved
  // answer goes to the server, and keys + solutions arrive only after submitting. Without it (exam.html?test=<id>)
  // the page runs the local prototype tests from data/tests/.
  const SERVER = params.get('cbt');
  let ME = null;         // signed-in student {name, …}
  function api(path, opts) {
    opts = opts || {};
    return fetch('/api' + path, { method: opts.method || 'GET', credentials: 'same-origin',
      headers: opts.body ? { 'content-type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, status: r.status, d })));
  }

  // ---------- storage (may be unavailable: private mode, blocked cookies) ----------
  let storageOK = true;
  function load(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { storageOK = false; return null; } }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { storageOK = false; } }
  function drop(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }
  try { localStorage.setItem('cbt-probe', '1'); localStorage.removeItem('cbt-probe'); } catch (e) { storageOK = false; }

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el) => (el || root).querySelector(sel);
  const $$ = (sel, el) => [...(el || root).querySelectorAll(sel)];
  const pad = n => String(n).padStart(2, '0');
  const hms = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
  const mmss = ms => { const s = Math.round(ms / 1000); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${pad(s % 60)}s`; };
  const L = (obj, lang) => obj ? (obj[lang] || obj.en) : '';

  // Site language (same setting as the chapter pages; Hindi first). The plain pages (test list, instructions,
  // result) follow it; it is also the default language of the questions. The exam screen's buttons, palette and
  // header stay in English as on NTA's own screen.
  const LKEY = 'neet-ui-lang';
  let ulang = 'hi';
  try { ulang = localStorage.getItem(LKEY) || 'hi'; } catch (e) { /* storage unavailable */ }
  document.documentElement.lang = ulang;
  const tt = (hi, en) => ulang === 'hi' ? hi : en;
  let rerender = null;   // redraws the current plain page after a language switch
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ulang]'); if (!b) return;
    ulang = b.dataset.ulang; try { localStorage.setItem(LKEY, ulang); } catch (e2) { /* ignore */ }
    document.documentElement.lang = ulang;
    if (rerender) rerender();
  });
  function pageBar() {
    return `<header class="cbt-bar"><a class="brand" href="./"><span class="mark" aria-hidden="true"><i></i></span><span class="word">NCERT<span>·</span>MindMap</span></a>
      <nav><a href="./">${tt('अध्याय', 'Chapters')}</a><a href="exam.html">${tt('टेस्ट', 'Tests')}</a></nav><span class="grow"></span>
      <div class="lang" role="group" aria-label="${tt('भाषा', 'Language')}"><button type="button" data-ulang="hi" class="${ulang === 'hi' ? 'on' : ''}" aria-pressed="${ulang === 'hi'}">हिंदी</button><button type="button" data-ulang="en" class="${ulang === 'en' ? 'on' : ''}" aria-pressed="${ulang === 'en'}">English</button></div></header>`;
  }
  // Chapter names for the test list and the result page's weak areas (data/catalog.json of the site).
  let CAT = {};
  function loadCatalog() {
    return fetch('data/catalog.json').then(r => r.ok ? r.json() : {}).then(c => {
      (function walk(o) {
        if (Array.isArray(o)) return o.forEach(walk);
        if (o && typeof o === 'object') {
          if (o.id && typeof o.title === 'string') CAT[o.id] = { en: o.title, hi: o.hi || o.title };
          Object.values(o).forEach(walk);
        }
      })(c);
    }).catch(() => {});
  }
  const chName = (id, lang) => CAT[id] ? L(CAT[id], lang || ulang) : id;
  const chLink = (id, para) => `./#/pyq/${encodeURIComponent(id)}${para ? '/s/' + encodeURIComponent(para) : ''}`;

  // Interface language: like NTA's own mock (nta.ac.in/Quiz, checked 13 Nov 2026 with Hindi chosen), only the
  // instructions page and the question text switch to Hindi; buttons, palette legend and header stay English.
  const UI = {
    en: {
      instructions: 'General Instructions', readCarefully: 'Please read the instructions carefully',
      chooseLang: 'Choose your default language', agree: 'I have read and understood the instructions. I agree that the questions can be viewed in the language I choose, and that in case of doubt the English version is final.',
      proceed: 'I am ready to begin', duration: 'Duration', questions: 'Questions', marking: 'Marking',
    },
    hi: {
      instructions: 'सामान्य निर्देश', readCarefully: 'कृपया निर्देश ध्यान से पढ़ें',
      chooseLang: 'अपनी डिफ़ॉल्ट भाषा चुनें', agree: 'मैंने निर्देश पढ़ और समझ लिए हैं। प्रश्न मेरी चुनी भाषा में देखे जा सकते हैं; किसी संदेह की स्थिति में अंग्रेज़ी संस्करण अंतिम होगा।',
      proceed: 'मैं शुरू करने के लिए तैयार हूँ', duration: 'अवधि', questions: 'प्रश्न', marking: 'अंकन',
    },
  };
  const INSTR = {
    en: [
      'The clock is set on the server in the real exam; here it runs in your browser. The countdown at the top right shows the time left. When it reaches zero the test is submitted automatically.',
      'The question palette on the right (tap <b>☰ Questions</b> on a phone) shows the status of every question:',
      '__legend__',
      'Questions that are <b>Answered and Marked for Review</b> are evaluated. Questions only Marked for Review (no answer) are not.',
      'To answer: click an option, then click <b>SAVE &amp; NEXT</b>. <b>If you move to another question without saving, your choice is not saved.</b>',
      '<b>SAVE &amp; MARK FOR REVIEW</b> saves the answer and marks it. <b>MARK FOR REVIEW &amp; NEXT</b> marks the question and moves on; __marknext_en__ <b>CLEAR</b> removes your saved answer.',
      'For numerical questions, type the answer with the on-screen keypad only.',
      'Use <b>View in</b> above each question to switch that question between English and Hindi.',
      'Every action is saved in this browser. If the power or network goes, open this page again on the same device and the test resumes with the time that was left.',
    ],
    hi: [
      'वास्तविक परीक्षा में घड़ी सर्वर पर चलती है; यहाँ यह आपके ब्राउज़र में चलती है। ऊपर दाईं ओर उलटी गिनती शेष समय दिखाती है। शून्य होने पर परीक्षा अपने आप जमा हो जाएगी।',
      'दाईं ओर का प्रश्न पैलेट (फ़ोन पर <b>☰ Questions</b> दबाएँ) हर प्रश्न की स्थिति दिखाता है:',
      '__legend__',
      '<b>उत्तर दिया और पुनरावलोकन हेतु चिह्नित</b> प्रश्नों का मूल्यांकन होगा। केवल चिह्नित (बिना उत्तर) प्रश्नों का नहीं।',
      'उत्तर देने के लिए विकल्प चुनें, फिर <b>SAVE &amp; NEXT</b> दबाएँ। <b>बिना सेव किए दूसरे प्रश्न पर जाने से आपका चुनाव सेव नहीं होगा।</b>',
      '<b>SAVE &amp; MARK FOR REVIEW</b> उत्तर सेव करके चिह्नित करता है। <b>MARK FOR REVIEW &amp; NEXT</b> प्रश्न को चिह्नित करके आगे बढ़ता है; __marknext_hi__ <b>CLEAR</b> सेव किया उत्तर हटाता है।',
      'संख्यात्मक प्रश्नों का उत्तर केवल स्क्रीन पर दिए कीपैड से लिखें।',
      'हर प्रश्न के ऊपर <b>View in</b> से उस प्रश्न को अंग्रेज़ी या हिंदी में देखें।',
      'हर क्रिया इस ब्राउज़र में सेव होती है। बिजली या नेटवर्क जाने पर इसी डिवाइस पर यह पेज फिर खोलें; परीक्षा बचे हुए समय के साथ वहीं से चलेगी।',
    ],
  };
  if (SERVER) {
    INSTR.en[0] = 'The clock runs on the server. The countdown at the top right shows the time left; when it reaches zero the test is submitted automatically.';
    INSTR.hi[0] = 'घड़ी सर्वर पर चलती है। ऊपर दाईं ओर उलटी गिनती शेष समय दिखाती है; शून्य होने पर परीक्षा अपने आप जमा हो जाएगी।';
    INSTR.en[INSTR.en.length - 1] = 'Every saved answer is stored on the server as well as in this browser. If the power or network goes, sign in again on any device: the test resumes, but the clock keeps running.';
    INSTR.hi[INSTR.hi.length - 1] = 'हर सेव किया उत्तर सर्वर पर और इस ब्राउज़र में रखा जाता है। बिजली या नेटवर्क जाने पर किसी भी डिवाइस पर फिर से साइन इन करें: परीक्षा वहीं से चलेगी, पर घड़ी चलती रहती है।';
  }
  const STATUS = [
    ['nv', 'Not Visited', 'नहीं देखा'],
    ['na', 'Not Answered', 'उत्तर नहीं दिया'],
    ['an', 'Answered', 'उत्तर दिया'],
    ['mr', 'Marked for Review', 'पुनरावलोकन हेतु चिह्नित'],
    ['am', 'Answered & Marked for Review (will be evaluated)', 'उत्तर दिया और चिह्नित (मूल्यांकन होगा)'],
  ];
  const HI_DRAFT = 'हिंदी पाठ प्रारूप (draft) है: अभी प्रूफ़रीडिंग नहीं हुई है। किसी संदेह की स्थिति में अंग्रेज़ी पाठ अंतिम माना जाएगा। · Hindi is a draft, not yet proofread; the English text prevails.';
  const hasHi = q => !['missing', 'placeholder'].includes(q.text.hi.status);
  function hiSummary() {
    const n = Q.filter(x => hasHi(x.q)).length, drafts = Q.filter(x => x.q.text.hi.status === 'draft').length;
    if (!n) return HI_PENDING;
    return (n < Q.length ? `${Q.length} में से ${n} प्रश्नों का हिंदी पाठ उपलब्ध है; बाकी अंग्रेज़ी में दिखेंगे। · ` : '') + (drafts ? HI_DRAFT : '');
  }
  const HI_PENDING = 'हिंदी अनुवाद अभी उपलब्ध नहीं है (NCERT हिंदी शब्दावली तैयार होने पर जोड़ा जाएगा)। नीचे अंग्रेज़ी पाठ दिखाया गया है। · Hindi placeholder: Hindi text pending, English shown.';

  // ---------- state ----------
  let T = null;          // test
  let Q = [];            // flat list: {q, sec, si, n}
  let S = null;          // saved attempt state
  let sel = null;        // current unsaved selection (index or string)
  let tickTimer = null, lastTick = 0, paletteOpen = false;

  // NTA's own instructions say a choice selected before "Mark for Review & Next" is kept and evaluated;
  // some coaching descriptions say it is not. Per-test setting until the NEET 2027 bulletin confirms it
  // (docs/research/00-README.md, finding 3). Default: NTA's wording.
  const markNextSaves = () => !T.rules || T.rules.markNextSavesAnswer !== false;

  function stateOf(q) { return S.q[q.id] || (S.q[q.id] = { v: false, ans: null, mark: false, t: 0, hist: [] }); }
  function status(q) {
    const s = S.q[q.id];
    if (!s || !s.v) return 'nv';
    const has = s.ans !== null && s.ans !== '';
    return s.mark ? (has ? 'am' : 'mr') : (has ? 'an' : 'na');
  }
  function save() { S.savedAt = Date.now(); store(SKEY(T.id), S); if (SERVER && S.attemptId && !S.submitted) queueSync(); }

  // ---------- server sync (server mode) ----------
  let syncTimer = null, syncing = false, lastSent = {};
  function items(all) {
    const out = [];
    Q.forEach(x => {
      const st = S.q[x.q.id]; if (!st) return;
      const it = { qno: x.n, ans: st.ans === null || st.ans === undefined ? null : String(st.ans), mark: !!st.mark, v: !!st.v,
        t: Math.round(st.t || 0), hist: (st.hist || []).map(h => ({ a: h.a === null ? null : String(h.a), at: Math.round(h.at) })) };
      const sig = JSON.stringify([it.ans, it.mark, it.v, it.hist.length, Math.round(it.t / 10000)]);
      if (all || lastSent[x.n] !== sig) { out.push(it); it._sig = sig; }
    });
    return out;
  }
  function queueSync() { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 1500); }
  function sync() {
    if (syncing || !S || S.submitted) return;
    const its = items(false);
    if (!its.length) return;
    syncing = true;
    api(`/cbt/attempt/${S.attemptId}/save`, { method: 'POST', body: { items: its.map(({ _sig, ...i }) => i) } }).then(r => {
      syncing = false;
      if (r.ok) { its.forEach(i => { lastSent[i.qno] = i._sig; }); netState(true); }
      else if (r.status === 409) { if (!S.submitted) { S.remaining = 0; S.timeUp = true; finish(); } }
      else { netState(false); queueSync(); }
    }).catch(() => { syncing = false; netState(false); setTimeout(sync, 5000); });
  }
  function netState(ok) { const el = document.getElementById('net'); if (el) { el.hidden = ok; } }

  // ---------- boot ----------
  function getJSON(url) { return fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }); }
  function boot() {
    rerender = null;
    if (SERVER) return bootServer(SERVER);
    const id = params.get('test');
    if (!id) return renderList();
    getJSON(`data/tests/${encodeURIComponent(id)}.json`).then(test => {
      T = test;
      Q = [];
      T.sections.forEach((sec, si) => sec.questions.forEach(q => Q.push({ q, sec, si, n: Q.length + 1 })));
      document.title = `${L(T.title, 'en')} · Exam-screen practice`;
      S = load(SKEY(T.id));
      if (S && S.v === 1 && S.submitted) return renderResult();
      if (S && S.v === 1 && S.started) return renderResume();
      S = null;
      renderInstructions(ulang);
    }).catch(e => { root.innerHTML = `<div class="cbt-page"><h1>${tt('टेस्ट नहीं खुल सका', 'Could not load the test')}</h1><p>${esc(e.message)}</p><p><a href="exam.html">${tt('सभी टेस्ट', 'All tests')}</a></p></div>`; });
  }


  // ---------- server mode: load, sign in, start, resume, result ----------
  function bootServer(slug) {
    api(`/cbt/test/${encodeURIComponent(slug)}`).then(r => {
      const d = r.d;
      if (r.status === 401 && d.test) return renderSignIn(d.test);
      if (r.status === 403 && d.test) return renderLocked(d.test);
      if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
      ME = d.student;
      const t = d.test;
      const SUBJ = { physics: ['Physics', 'भौतिकी'], chemistry: ['Chemistry', 'रसायन विज्ञान'], biology: ['Biology', 'जीव विज्ञान'] }[t.subject] || ['Questions', 'प्रश्न'];
      // mocks have sections (Physics, Chemistry, Biology); each question carries its section id
      const secs = (t.sections || []).length > 1
        ? t.sections.map(s => ({ id: s.id, name: s.name, marking: t.marking, questions: d.questions.filter(q => q.section === s.id) }))
        : [{ id: 'A', name: { en: SUBJ[0], hi: SUBJ[1] }, marking: t.marking, questions: d.questions }];
      T = { id: 'cbt:' + t.slug, slug: t.slug, title: t.title, subtitle: t.subtitle, durationMin: t.durationMin, rules: t.rules || {}, server: true,
        kind: t.kind, sections: secs };
      Q = [];
      T.sections.forEach((sec, si) => sec.questions.forEach(q => Q.push({ q, sec, si, n: Q.length + 1 })));
      document.title = `${L(T.title, 'en')} · Exam-screen practice`;
      const a = d.attempt;
      S = load(SKEY(T.id));
      if (!a) { S = null; drop(SKEY(T.id)); return renderInstructions(ulang); }
      if (a.submitted) return loadResult(a.id);
      if (!S || S.attemptId !== a.id) S = fromServer(a, d.responses);
      S.deadlineLocal = Date.now() + (Date.parse(a.deadline_at) - d.server_now);
      S.remaining = Math.max(0, S.deadlineLocal - Date.now());
      lastSent = {};
      renderResume();
    }).catch(e => { root.innerHTML = `<div class="cbt-page"><h1>${tt('टेस्ट नहीं खुल सका', 'Could not load the test')}</h1><p>${esc(e.message)}</p><p><a href="exam.html">${tt('सभी टेस्ट', 'All tests')}</a></p></div>`; });
  }
  function toLocalAns(q, a) { return a === null || a === undefined ? null : q.answer.kind === 'numeric' ? String(a) : Number(a); }
  function fromServer(a, resp) {
    const st = { v: 1, testId: T.id, attemptId: a.id, started: Date.parse(a.started_at), cur: 0, lang: a.lang || 'en', qlang: {}, q: {}, events: 0, submitted: false };
    Q.forEach(x => { const r = resp && resp[x.n]; if (r) st.q[x.q.id] = { v: r.v, ans: toLocalAns(x.q, r.ans), mark: r.mark, t: r.t || 0, hist: (r.hist || []).map(h => ({ a: toLocalAns(x.q, h.a), at: h.at })) }; });
    return st;
  }
  function applyResult(d) {
    d.key.forEach(k => {
      const x = Q[k.qno - 1]; if (!x) return;
      x.q.answer = k.answer;
      ['en', 'hi'].forEach(l => { if (x.q.text[l]) Object.assign(x.q.text[l], (k.solution || {})[l] || {}); });
      if (k.solution && k.solution.source) x.q.srcLabel = k.solution.source;
    });
    if (!S || !S.q || !Object.keys(S.q).length) S = fromServer({ id: d.attempt.id, started_at: d.attempt.started_at, lang: (S && S.lang) || 'en' }, d.responses);
    S.attemptId = d.attempt.id;
    S.submitted = Date.parse(d.attempt.submitted_at) || Date.now();
    const used = Date.parse(d.attempt.submitted_at) - Date.parse(d.attempt.started_at);
    S.remaining = Math.max(0, T.durationMin * 60000 - used);
    S.serverScore = d.attempt.score;
    save();
  }
  function loadResult(id) {
    api(`/cbt/attempt/${id}/result`).then(r => {
      if (!r.ok) throw new Error(r.d.error || 'HTTP ' + r.status);
      applyResult(r.d); renderResult();
    }).catch(e => { root.innerHTML = `<div class="cbt-page"><h1>${tt('परिणाम नहीं खुल सका', 'Could not load the result')}</h1><p>${esc(e.message)}</p><p><a href="exam.html">${tt('सभी टेस्ट', 'All tests')}</a></p></div>`; });
  }
  function googleButton(el, after) {
    api('/me').then(r => {
      const me = r.d || {};
      if (me.dev_login) {
        el.innerHTML = '<button class="btn-go" id="devin">Sign in (dev)</button>';
        el.querySelector('#devin').onclick = () => api('/auth/dev', { method: 'POST', body: {} }).then(after);
        return;
      }
      if (!me.google_client_id || me.google_client_id === 'SET-ME') { el.innerHTML = '<p class="warn">Sign-in is not set up yet.</p>'; return; }
      const go = () => {
        google.accounts.id.initialize({ client_id: me.google_client_id, callback: res =>
          api('/auth/google', { method: 'POST', body: { credential: res.credential } }).then(x => x.ok ? after() : alert(x.d.error || 'Sign-in failed')) });
        google.accounts.id.renderButton(el, { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill' });
      };
      if (window.google && google.accounts) return go();
      const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = go; document.head.appendChild(sc);
    });
  }
  function renderSignIn(t) {
    rerender = () => renderSignIn(t);
    root.innerHTML = `${pageBar()}<div class="cbt-page"><p class="kicker">${esc(L(t.subtitle, ulang))}</p><h1>${esc(L(t.title, ulang))}</h1><p class="muted">${esc(L(t.title, ulang === 'hi' ? 'en' : 'hi'))}</p>
      <p>${tt('टेस्ट देने के लिए Google से साइन इन करें — आपका स्कोर और हल सुरक्षित रहेंगे।', 'Sign in with Google to take the test; your score and solutions stay saved.')}</p>
      <div id="gsign"></div><p><a href="exam.html">← ${tt('सभी टेस्ट', 'All tests')}</a></p></div>`;
    googleButton($('#gsign'), () => bootServer(t.slug));
  }
  function renderLocked(t) {
    rerender = () => renderLocked(t);
    root.innerHTML = `${pageBar()}<div class="cbt-page"><h1>${esc(L(t.title, ulang))}</h1><p class="muted">${esc(L(t.title, ulang === 'hi' ? 'en' : 'hi'))}</p>
      <p>${tt('यह टेस्ट पास के साथ खुलेगा (जल्द आ रहा है)। हर अध्याय का पहला टेस्ट और पहला मॉक टेस्ट अभी मुफ़्त है।', 'This test opens with a pass (coming soon). The first test of every chapter and the first full mock are free now.')}</p>
      <p><a href="exam.html">← ${tt('सभी टेस्ट', 'All tests')}</a></p></div>`;
  }

  // Test list: server tests (mocks, then each subject's chapter tests grouped by chapter), then the browser-only
  // PYQ prototype tests. Hindi first: each card shows the title in the site language with the other one below.
  function renderList() {
    rerender = renderList;
    Promise.all([api('/cbt/tests').catch(() => ({ ok: false })), getJSON('data/tests/index.json').catch(() => ({ tests: [] }))]).then(([sv, ix]) => {
      const online = sv.ok && sv.d.tests && sv.d.tests.length ? serverList(sv.d) : '';
      const other = ulang === 'hi' ? 'en' : 'hi';
      root.innerHTML = `${pageBar()}<div class="cbt-page list-page"><p class="kicker">${tt('परीक्षा स्क्रीन पर अभ्यास', 'Exam-screen practice')}</p><h1>${tt('टेस्ट चुनें', 'Choose a test')}</h1>
        <p class="lead">${tt('स्क्रीन NTA की कंप्यूटर आधारित परीक्षा जैसी है: प्रश्न पैलेट, उलटी गिनती, पुनरावलोकन हेतु चिह्नित, हर प्रश्न हिंदी/अंग्रेज़ी में।', 'The screen works like the NTA computer-based test: question palette, countdown, mark for review, Hindi/English per question.')}</p>
        ${online}
        <h2 class="grp-h">${tt('PYQ अभ्यास (केवल इस ब्राउज़र में)', 'PYQ practice (this browser only)')}</h2>
        <ul class="test-list">${ix.tests.map(t => { const s = load(SKEY(t.id)); return `<li><a href="exam.html?test=${encodeURIComponent(t.id)}"><b>${esc(L(t.title, ulang))}</b><small>${esc(L(t.title, other))}</small><span>${esc(L(t.subtitle, ulang))}</span><span>${t.count} ${tt('प्रश्न', 'questions')} · ${t.durationMin} ${tt('मिनट', 'min')}${s && s.submitted ? ' · <i>' + tt('परिणाम तैयार', 'result ready') + '</i>' : s && s.started ? ' · <i>' + tt('जारी', 'in progress') + '</i>' : ''}</span></a></li>`; }).join('')}</ul>
        <p><a href="./">← ${tt('अध्याय पृष्ठों पर लौटें', 'Back to the chapter pages')}</a></p></div>`;
      if (sv.ok && !sv.d.signed_in && $('#gsign')) googleButton($('#gsign'), () => renderList());
    }).catch(e => { root.innerHTML = `${pageBar()}<div class="cbt-page"><p>${esc(e.message)}</p></div>`; });
  }
  function serverList(d) {
    const other = ulang === 'hi' ? 'en' : 'hi';
    const chip = t => !t.access_ok ? `<i class="lock">🔒 ${tt('पास', 'pass')}</i>`
      : t.attempt && t.attempt.submitted ? `<i class="done">${tt('परिणाम', 'result')}: ${t.attempt.score} / ${t.count * t.marking.correct}</i>`
      : t.attempt ? `<i>${tt('जारी', 'in progress')}</i>` : t.access === 'free' ? `<i class="free">${tt('निःशुल्क', 'free')}</i>` : '';
    const part = t => { const bits = L(t.title, ulang).split(' · '); return bits.length > 1 ? bits.slice(1).join(' · ') : bits[0]; };
    const card = t => `<li${t.access_ok ? '' : ' class="locked"'}><a href="exam.html?cbt=${encodeURIComponent(t.slug)}"><b>${esc(t.kind === 'mock' ? L(t.title, ulang) : part(t))}</b>
      <span>${t.count} ${tt('प्रश्न', 'questions')} · ${t.durationMin} ${tt('मिनट', 'min')} · +${t.marking.correct} / ${String(t.marking.wrong).replace('-', '−')}</span><span class="chips">${chip(t)}</span></a></li>`;
    const subjects = [['physics', 'भौतिकी', 'Physics'], ['chemistry', 'रसायन विज्ञान', 'Chemistry'], ['biology', 'जीव विज्ञान', 'Biology']];
    const mocks = d.tests.filter(t => t.kind === 'mock');
    let html = d.signed_in ? '' : `<div class="signin-box"><p>${tt('टेस्ट देने के लिए साइन इन करें। हर अध्याय का पहला टेस्ट और पहला मॉक टेस्ट मुफ़्त है।', 'Sign in to take the tests. The first test of every chapter and the first full mock are free.')}</p><div id="gsign"></div></div>`;
    if (mocks.length) html += `<h2 class="grp-h">${tt('पूर्ण NEET मॉक टेस्ट', 'Full NEET mock tests')} <small>180 ${tt('प्रश्न', 'questions')} · 180 ${tt('मिनट', 'min')}</small></h2><ul class="test-list mocks">${mocks.map(card).join('')}</ul>`;
    subjects.forEach(([id, hi, en]) => {
      const ts = d.tests.filter(t => t.kind !== 'mock' && (t.subject === id || (!t.subject && id === 'chemistry')));
      if (!ts.length) return;
      const groups = new Map();
      ts.forEach(t => { const chs = t.chapters && t.chapters.length ? t.chapters : [t.chapter]; const k = chs.join('+'); if (!groups.has(k)) groups.set(k, { chs, ts: [] }); groups.get(k).ts.push(t); });
      html += `<h2 class="grp-h subj-${id}">${ulang === 'hi' ? hi : en} <small>${ulang === 'hi' ? en : hi}</small></h2>`;
      html += [...groups.values()].map(g => `<section class="chap-tests"><h3 class="chap-h">${g.chs.map(c => esc(chName(c))).join(' + ')} <small>${g.chs.map(c => esc(chName(c, other))).join(' + ')}</small></h3>
        <p class="chap-links">${g.chs.map(c => `<a href="${chLink(c)}">${g.chs.length > 1 ? esc(chName(c)) + ': ' : ''}${tt('अध्याय के PYQ पढ़ें →', 'Read the chapter PYQs →')}</a>`).join(' ')}</p>
        <ul class="test-list">${g.ts.map(card).join('')}</ul></section>`).join('');
    });
    return html;
  }

  function legendHTML(lang, counts) {
    return `<ul class="legend">${STATUS.map(([k, en, hi]) => `<li><span class="pal ${k}">${counts ? counts[k] : ''}</span>${esc(lang === 'hi' ? hi : en)}</li>`).join('')}</ul>`;
  }

  function renderInstructions(lang) {
    rerender = null;
    const marks = T.sections.map(s => `${esc(L(s.name, lang))}: +${s.marking.correct} / ${s.marking.wrong} / ${s.marking.blank}`).join('<br>');
    root.innerHTML = `<div class="cbt-page instr">
      <header class="instr-head"><div><p class="kicker">${esc(UI[lang].instructions)}</p><h1>${esc(L(T.title, lang))}</h1><p class="muted">${esc(L(T.subtitle, lang))}</p></div>
        <label class="langpick">${esc(UI[lang].chooseLang)}<select id="deflang"><option value="en"${lang === 'en' ? ' selected' : ''}>English</option><option value="hi"${lang === 'hi' ? ' selected' : ''}>हिंदी (Hindi)</option></select></label></header>
      <div class="facts"><div><b>${T.durationMin} min</b><span>${esc(UI[lang].duration)}</span></div><div><b>${Q.length}</b><span>${esc(UI[lang].questions)}</span></div><div><b class="small">${marks}</b><span>${esc(UI[lang].marking)} (✓ / ✗ / –)</span></div></div>
      ${lang === 'hi' && hiSummary() ? `<p class="hi-note">${esc(hiSummary())}</p>` : ''}
      <h2>${esc(UI[lang].readCarefully)}</h2>
      <ol class="instr-list">${INSTR[lang].map(x => x === '__legend__' ? `<li class="nolist">${legendHTML(lang)}</li>` : `<li>${x
        .replace('__marknext_en__', markNextSaves() ? 'an option you have selected is kept and will be evaluated.' : 'a new choice is <b>not</b> saved.')
        .replace('__marknext_hi__', markNextSaves() ? 'चुना हुआ विकल्प रहेगा और उसका मूल्यांकन होगा।' : 'नया चुनाव सेव <b>नहीं</b> होता।')}</li>`).join('')}</ol>
      ${storageOK ? '' : '<p class="warn">This browser is not letting the page save data (private mode or blocked storage). The test works, but a reload will lose your answers.</p>'}
      <label class="agree"><input type="checkbox" id="agree"> ${esc(UI[lang].agree)}</label>
      <div class="instr-actions"><a class="btn-plain" href="exam.html">← ${lang === 'hi' ? 'सभी टेस्ट' : 'All tests'}</a><button id="go" class="btn-go" disabled>${esc(UI[lang].proceed)} →</button></div>
    </div>`;
    $('#deflang').onchange = e => renderInstructions(e.target.value);
    $('#agree').onchange = e => { $('#go').disabled = !e.target.checked; };
    $('#go').onclick = () => {
      if (SERVER) {
        $('#go').disabled = true;
        return api(`/cbt/test/${encodeURIComponent(T.slug)}/start`, { method: 'POST', body: { lang } }).then(r => {
          if (!r.ok) { alert(r.d.error || 'Could not start the test'); $('#go').disabled = false; return; }
          const a = r.d.attempt;
          S = { v: 1, testId: T.id, attemptId: a.id, started: Date.parse(a.started_at), cur: 0, lang, qlang: {}, q: {}, events: 0, submitted: false };
          S.deadlineLocal = Date.now() + (Date.parse(a.deadline_at) - r.d.server_now);
          S.remaining = Math.max(0, S.deadlineLocal - Date.now());
          lastSent = {};
          visit(0); save(); renderExam();
        }).catch(() => { alert('No connection. Try again.'); $('#go').disabled = false; });
      }
      S = { v: 1, testId: T.id, started: Date.now(), remaining: T.durationMin * 60000, cur: 0, lang, qlang: {}, q: {}, events: 0, submitted: false };
      visit(0);
      save();
      renderExam();
    };
  }

  function renderResume() {
    const answered = Q.filter(x => ['an', 'am'].includes(status(x.q))).length;
    rerender = renderResume;
    root.innerHTML = `${pageBar()}<div class="cbt-page"><p class="kicker">${tt('टेस्ट जारी रखें', 'Resume test')}</p><h1>${esc(L(T.title, ulang))}</h1>
      <p>${tt(`आपकी परीक्षा सेव है${S.savedAt ? ' (' + new Date(S.savedAt).toLocaleTimeString() + ')' : ''}। ${Q.length} में से <b>${answered}</b> उत्तर दिए · बचा हुआ समय <b>${hms(S.remaining)}</b>।`, `Your attempt was saved ${S.savedAt ? 'at ' + new Date(S.savedAt).toLocaleTimeString() : ''}. <b>${answered}</b> of ${Q.length} answered · time left <b>${hms(S.remaining)}</b>.`)}</p>
      ${SERVER ? `<p class="muted">${tt('घड़ी सर्वर पर चल रही है।', 'The clock keeps running on the server.')}</p>` : ''}
      <div class="instr-actions"><button class="btn-plain" id="restart">${tt('छोड़ें और फिर से शुरू करें', 'Discard and start again')}</button><button class="btn-go" id="resume">${tt('जारी रखें', 'Resume')} →</button></div></div>`;
    $('#resume').onclick = () => { rerender = null; renderExam(); };
    $('#restart').onclick = () => { if (confirm(tt('यह प्रयास छोड़कर फिर से शुरू करें?', 'Discard this attempt and start again?'))) retake(); };
  }

  // ---------- exam screen ----------
  function visit(i) {
    S.cur = i;
    const st = stateOf(Q[i].q);
    st.v = true;
    st.visits = (st.visits || 0) + 1;
    sel = st.ans;
  }

  function renderExam() {
    root.innerHTML = `<div class="exam">
      <header class="ex-top"><div class="ex-title"><b>${esc(L(T.title, S.lang))}</b><span>${esc(L(T.subtitle, S.lang))}</span></div>
        <div class="ex-cand"><span class="avatar" aria-hidden="true">👤</span><div><small>Candidate</small><b>${esc(ME ? ME.name : 'Guest')}</b></div></div>
        <div class="ex-time"><small>Time Left</small><b id="clock">${hms(S.remaining)}</b></div>
        <button class="pal-toggle" id="paltoggle" aria-expanded="false">☰ Questions</button></header>
      ${storageOK ? '' : '<div class="ex-warn">Answers cannot be saved in this browser (storage blocked): do not reload.</div>'}
      <div class="ex-warn" id="net" hidden>Not connected: answers are kept in this browser and sent when the network is back. Do not close this page.</div>
      <nav class="ex-secs" id="secs"></nav>
      <div class="ex-body">
        <main class="ex-q" id="qpane"></main>
        <aside class="ex-pal" id="palette"></aside>
      </div>
      <footer class="ex-foot">
        <div class="row1">
          <button class="b-green" data-act="savenext">SAVE &amp; NEXT</button>
          <button class="b-white" data-act="clear">CLEAR</button>
          <button class="b-orange" data-act="savemark">SAVE &amp; MARK FOR REVIEW</button>
          <button class="b-blue" data-act="marknext">MARK FOR REVIEW &amp; NEXT</button>
        </div>
        <div class="row2">
          <button class="b-white" data-act="back">&lt;&lt; BACK</button>
          <button class="b-white" data-act="next">NEXT &gt;&gt;</button>
          <span class="grow"></span>
          <button class="b-submit" data-act="submit">SUBMIT</button>
        </div>
      </footer>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
    </div>`;
    $$('.ex-foot button').forEach(b => b.onclick = () => act(b.dataset.act));
    $('#paltoggle').onclick = () => togglePalette();
    drawQuestion();
    drawPalette();
    startClock();
  }

  function togglePalette(force) {
    paletteOpen = force != null ? force : !paletteOpen;
    $('#palette').classList.toggle('open', paletteOpen);
    $('#paltoggle').setAttribute('aria-expanded', paletteOpen);
  }

  function langOf(q) { return S.qlang[q.id] || S.lang; }

  function drawQuestion() {
    const x = Q[S.cur], q = x.q, lang = langOf(q);
    const hiReady = hasHi(q);
    const tx = lang === 'hi' && hiReady ? q.text.hi : q.text.en;
    const shownLang = lang === 'hi' && hiReady ? 'hi' : 'en';
    const num = q.answer.kind === 'numeric';
    $('#secs').innerHTML = T.sections.map((s, si) => `<button class="${si === x.si ? 'on' : ''}" data-sec="${si}">${esc(L(s.name, S.lang))}</button>`).join('');
    $$('#secs button').forEach(b => b.onclick = () => { const i = Q.findIndex(y => y.si === +b.dataset.sec); go(i, true); });
    const opts = num ? '' : `<ol class="opts">${tx.o.map((o, i) => `<li><label class="${sel === i ? 'picked' : ''}"><input type="radio" name="opt" value="${i}"${sel === i ? ' checked' : ''}><span class="on">${i + 1})</span><span class="otext">${o}</span></label></li>`).join('')}</ol>`;
    const pad_ = num ? `<div class="numans"><input id="numin" readonly inputmode="none" value="${esc(sel || '')}" aria-label="Your answer" placeholder="Enter answer using keypad">
      <div class="keypad">${['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '-'].map(k => `<button data-k="${k}">${k}</button>`).join('')}<button data-k="bs" class="wide">Backspace</button><button data-k="clr" class="wide">Clear All</button></div></div>` : '';
    $('#qpane').innerHTML = `<div class="qhead"><h2>Question No. ${x.n}</h2>
        <span class="qtype">${num ? 'Numerical' : 'Single correct'} · +${x.sec.marking.correct} / ${String(x.sec.marking.wrong).replace('-', '−')}</span>
        <label class="viewin">View in <select id="qlang"><option value="en"${lang === 'en' ? ' selected' : ''}>English</option><option value="hi"${lang === 'hi' ? ' selected' : ''}>हिंदी</option></select></label></div>
      ${lang === 'hi' && !hiReady ? `<p class="hi-note">${esc(HI_PENDING)}</p>` : ''}
      ${shownLang === 'hi' && q.text.hi.status === 'draft' ? '<p class="hi-draft" title="Hindi draft, not yet proofread">हिंदी प्रारूप · प्रूफ़रीडिंग बाकी</p>' : ''}
      <div lang="${shownLang}"><div class="qtext">${tx.q}</div>${opts}</div>${pad_}`;
    $('#qlang').onchange = e => { S.qlang[q.id] = e.target.value; save(); drawQuestion(); };
    $$('input[name=opt]').forEach(r => r.onchange = () => { sel = +r.value; $$('.opts label').forEach((l, i) => l.classList.toggle('picked', i === sel)); });
    $$('.keypad button').forEach(b => b.onclick = () => {
      let v = sel == null ? '' : String(sel);
      const k = b.dataset.k;
      if (k === 'bs') v = v.slice(0, -1);
      else if (k === 'clr') v = '';
      else if (k === '-') v = v.startsWith('-') ? v.slice(1) : '-' + v;
      else if (k === '.') { if (!v.includes('.')) v += v === '' || v === '-' ? '0.' : '.'; }
      else if (v.replace(/[-.]/g, '').length < 10) v += k;
      sel = v === '' ? null : v;
      $('#numin').value = v;
    });
    $('#qpane').scrollTop = 0;
  }

  function drawPalette() {
    const x = Q[S.cur];
    const counts = { nv: 0, na: 0, an: 0, mr: 0, am: 0 };
    Q.filter(y => y.si === x.si).forEach(y => counts[status(y.q)]++);
    $('#palette').innerHTML = `<div class="pal-head"><b>${esc(L(x.sec.name, 'en'))}</b><button class="pal-close" aria-label="Close palette">✕</button></div>
      ${legendHTML('en', counts)}
      <p class="pal-label">Choose a Question</p>
      <div class="pal-grid">${Q.filter(y => y.si === x.si).map(y => `<button class="pal ${status(y.q)}${y.n === x.n ? ' cur' : ''}" data-i="${y.n - 1}" aria-label="Question ${y.n}">${y.n}</button>`).join('')}</div>`;
    $$('.pal-grid button').forEach(b => b.onclick = () => { go(+b.dataset.i); togglePalette(false); });
    $('.pal-close').onclick = () => togglePalette(false);
  }

  let toastTimer = null;
  function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }

  function go(i, fromSection) {
    const st = stateOf(Q[S.cur].q);
    if (sel !== st.ans && sel !== null) toast(`Q${Q[S.cur].n}: your choice was not saved (use SAVE & NEXT).`);
    if (i < 0 || i >= Q.length) i = fromSection ? 0 : (i < 0 ? 0 : Q.length - 1);
    visit(i);
    save();
    drawQuestion();
    drawPalette();
  }

  function commit(val) {
    const q = Q[S.cur].q, st = stateOf(q);
    const v = val === '' || val === '-' || val === '.' ? null : val;
    if (v !== st.ans) {
      st.hist.push({ a: v, at: T.durationMin * 60000 - S.remaining });
      st.ans = v;
    }
  }

  function act(a) {
    const st = stateOf(Q[S.cur].q);
    const next = Math.min(S.cur + 1, Q.length - 1);
    if (a === 'savenext') { commit(sel); st.mark = false; if (S.cur === Q.length - 1) { save(); drawPalette(); toast('Last question. Use SUBMIT when you are done.'); return; } sel = st.ans; go(next); }
    else if (a === 'clear') { sel = null; commit(null); save(); drawQuestion(); drawPalette(); }
    else if (a === 'savemark') { commit(sel); st.mark = true; sel = st.ans; if (S.cur === Q.length - 1) { save(); drawPalette(); return; } go(next); }
    else if (a === 'marknext') {
      st.mark = true;
      if (markNextSaves()) commit(sel);
      else { const unsaved = sel !== st.ans && sel !== null; if (unsaved) toast('Marked for review. The new choice was not saved.'); }
      sel = st.ans; if (S.cur === Q.length - 1) { save(); drawQuestion(); drawPalette(); return; } go(next); }
    else if (a === 'back') go(S.cur - 1);
    else if (a === 'next') go(next);
    else if (a === 'submit') confirmSubmit();
  }

  // ---------- clock ----------
  function startClock() {
    clearInterval(tickTimer);
    lastTick = performance.now();
    let n = 0;
    tickTimer = setInterval(() => {
      const now = performance.now(), d = Math.min(now - lastTick, 5000); // ignore long sleeps (closed laptop)
      lastTick = now;
      S.remaining = SERVER && S.deadlineLocal ? Math.max(0, S.deadlineLocal - Date.now()) : S.remaining - d;
      stateOf(Q[S.cur].q).t += d;
      const c = $('#clock');
      if (c) { c.textContent = hms(S.remaining); c.classList.toggle('low', S.remaining < 5 * 60000); }
      if (S.remaining <= 0) { S.remaining = 0; S.timeUp = true; finish(); return; }
      if (++n % 5 === 0) save();
    }, 1000);
  }
  window.addEventListener('pagehide', () => { if (S && S.started && !S.submitted) save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.started && !S.submitted) save(); });

  // ---------- submit ----------
  function confirmSubmit() {
    const rows = T.sections.map((sec, si) => {
      const c = { nv: 0, na: 0, an: 0, mr: 0, am: 0 };
      Q.filter(y => y.si === si).forEach(y => c[status(y.q)]++);
      return `<tr><td>${esc(L(sec.name, 'en'))}</td><td>${sec.questions.length}</td><td>${c.an}</td><td>${c.na}</td><td>${c.mr}</td><td>${c.am}</td><td>${c.nv}</td></tr>`;
    }).join('');
    const ov = document.createElement('div');
    ov.className = 'modal';
    ov.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 id="mt">Submit the test? <small lang="hi">· टेस्ट जमा करें?</small></h2>
      <div class="tablewrap"><table class="sumtab"><thead><tr><th>Section</th><th>Questions</th><th>Answered</th><th>Not answered</th><th>Marked</th><th>Answered + marked</th><th>Not visited</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p>Time left: <b>${hms(S.remaining)}</b>. After submitting you cannot change any answer.</p>
      <div class="modal-actions"><button class="b-white" id="no">No, go back</button><button class="b-submit" id="yes">Yes, submit</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#no').onclick = () => ov.remove();
    ov.querySelector('#yes').onclick = () => { ov.remove(); finish(); };
  }

  function finish() {
    clearInterval(tickTimer);
    // a selection that was never saved is not evaluated (as in the real exam)
    if (SERVER) {
      clearTimeout(syncTimer);
      root.insertAdjacentHTML('beforeend', '<div class="modal" id="subm"><div class="modal-box"><h2>Submitting…</h2><p>जमा हो रहा है…</p></div></div>');
      const send = tries => api(`/cbt/attempt/${S.attemptId}/submit`, { method: 'POST', body: { items: items(true) } }).then(r => {
        if (!r.ok) throw new Error(r.d.error || 'HTTP ' + r.status);
        applyResult(r.d); renderResult(); window.scrollTo(0, 0);
      }).catch(e => {
        if (tries < 5) return setTimeout(() => send(tries + 1), 3000 * (tries + 1));
        const m = document.getElementById('subm');
        if (m) m.querySelector('.modal-box').innerHTML = `<h2>Could not reach the server</h2><p>Your answers are safe in this browser. Check the network and press Retry. (${esc(e.message)})</p><div class="modal-actions"><button class="b-submit" id="retry">Retry</button></div>`;
        const b = document.getElementById('retry'); if (b) b.onclick = () => { m.remove(); finish(); };
      });
      S.submitting = true; store(SKEY(T.id), S);
      return send(0);
    }
    S.submitted = Date.now();
    save();
    renderResult();
    window.scrollTo(0, 0);
  }

  // ---------- result ----------
  function isRight(q, a) {
    if (a === null || a === undefined || a === '') return null;
    if (q.answer.kind === 'numeric') { const v = parseFloat(a); return !isNaN(v) && Math.abs(v - q.answer.value) <= (q.answer.tol || 0) + 1e-9; }
    return a === q.answer.index || (q.answer.alsoAccepted || []).includes(a);   // official key may accept more than one
  }
  function fmtAns(q, a) {
    if (a === null || a === undefined || a === '') return '—';
    return q.answer.kind === 'numeric' ? esc(a) : `(${a + 1})`;
  }
  // chapter / paragraphs of a question: server tests carry chapter + paras + paraTitles {en,hi};
  // the browser prototype tests carry ncert.chapter, ncert.paras and English paraTitles
  const qChapter = q => q.chapter || (q.ncert && q.ncert.chapter) || null;
  const qParas = q => (q.paras && q.paras.length ? q.paras : (q.ncert && q.ncert.paras) || []);
  const qParaTitle = (q, i, lang) => { const t = (q.paraTitles || [])[i]; return !t ? '' : typeof t === 'string' ? t : L(t, lang); };

  function renderResult() {
    clearInterval(tickTimer);
    rerender = renderResult;
    const used = T.durationMin * 60000 - S.remaining;
    let score = 0, max = 0;
    const R = Q.map(x => {
      const st = S.q[x.q.id] || { ans: null, t: 0, hist: [], mark: false };
      const ok = isRight(x.q, st.ans);
      const m = x.sec.marking;
      const pts = ok === null ? m.blank : ok ? m.correct : m.wrong;
      score += pts; max += m.correct;
      const firsts = (st.hist || []).filter(h => h.a !== null);
      const first = firsts.length ? firsts[0].a : null;
      const changed = firsts.length > 1 || (firsts.length === 1 && st.ans === null);
      let change = null;
      if (changed) {
        const f = isRight(x.q, first), l = isRight(x.q, st.ans);
        change = l === null ? 'removed' : f && !l ? 'right-wrong' : !f && l ? 'wrong-right' : 'wrong-wrong';
        if (f && l) change = 'same';
      }
      return { x, st, ok, pts, first, changed, change };
    });
    const c = R.filter(r => r.ok === true).length, w = R.filter(r => r.ok === false).length, u = R.length - c - w;
    const ch = { 'wrong-right': 0, 'right-wrong': 0, 'wrong-wrong': 0, removed: 0, same: 0 };
    R.forEach(r => { if (r.change) ch[r.change]++; });
    const tmax = Math.max(...R.map(r => r.st.t || 0), 1);
    const avg = arr => arr.length ? arr.reduce((a, r) => a + (r.st.t || 0), 0) / arr.length : 0;
    const long = R.filter(r => (r.st.t || 0) >= 4 * 60000);
    const secRows = T.sections.length > 1 ? T.sections.map((sec, si) => {
      const rs = R.filter(r => r.x.si === si);
      const sc = rs.reduce((a, r) => a + r.pts, 0);
      return `<tr><td>${esc(L(sec.name, ulang))}</td><td>${rs.filter(r => r.ok === true).length}</td><td>${rs.filter(r => r.ok === false).length}</td><td>${rs.filter(r => r.ok === null).length}</td><td>${mmss(rs.reduce((a, r) => a + (r.st.t || 0), 0))}</td><td><b>${sc}</b> / ${rs.length * sec.marking.correct}</td></tr>`;
    }).join('') : '';
    const lang = ulang;
    const other = ulang === 'hi' ? 'en' : 'hi';

    root.innerHTML = `${pageBar()}<div class="cbt-page result">
      <p class="kicker">${tt('परिणाम', 'Result')}${S.timeUp ? ' · ' + tt('समय समाप्त होने पर अपने आप जमा हुआ', 'submitted automatically when time ran out') : ''}</p>
      <h1>${esc(L(T.title, ulang))}</h1><p class="muted">${esc(L(T.title, other))}</p>
      <div class="score-row">
        <div class="score"><b>${score}</b><span>${tt(`${max} में से अंक`, `out of ${max}`)}</span></div>
        <div class="kpi good"><b>${c}</b><span>${tt('सही', 'Correct')}</span></div>
        <div class="kpi bad"><b>${w}</b><span>${tt('गलत', 'Wrong')}</span></div>
        <div class="kpi"><b>${u}</b><span>${tt('उत्तर नहीं दिया', 'Not answered')}</span></div>
        <div class="kpi"><b>${c + w ? Math.round(100 * c / (c + w)) : 0}%</b><span>${tt('सटीकता', 'Accuracy')}</span></div>
        <div class="kpi"><b>${hms(used)}</b><span>${tt(`${T.durationMin} मिनट में से लगा समय`, `Time used of ${T.durationMin} min`)}</span></div>
      </div>
      ${secRows ? `<div class="tablewrap"><table class="sumtab"><thead><tr><th>${tt('खंड', 'Section')}</th><th>${tt('सही', 'Correct')}</th><th>${tt('गलत', 'Wrong')}</th><th>${tt('छोड़े', 'Not answered')}</th><th>${tt('समय', 'Time')}</th><th>${tt('अंक', 'Score')}</th></tr></thead><tbody>${secRows}</tbody></table></div>` : ''}
      ${weakBlocks(R)}

      <section class="res-block"><h2>${tt('बदले गए उत्तर', 'Changed answers')}</h2>
        ${R.some(r => r.changed) ? `<div class="chg">
          <div class="kpi good"><b>${ch['wrong-right']}</b><span>${tt('गलत → सही (लाभ)', 'Wrong → right (gained)')}</span></div>
          <div class="kpi bad"><b>${ch['right-wrong']}</b><span>${tt('सही → गलत (नुकसान)', 'Right → wrong (lost)')}</span></div>
          <div class="kpi"><b>${ch['wrong-wrong']}</b><span>${tt('गलत → दूसरा गलत', 'Wrong → another wrong')}</span></div>
          <div class="kpi"><b>${ch.removed}</b><span>${tt('उत्तर हटाया', 'Answer cleared')}</span></div></div>
          <p class="muted">${ch['right-wrong'] > ch['wrong-right'] ? tt('इस बार उत्तर बदलने से अंक घटे: आपका पहला उत्तर अधिक बार सही था।', 'Changing answers cost you marks this time: your first choice was more often right.') : ch['wrong-right'] > ch['right-wrong'] ? tt('इस बार बदलाव से लाभ हुआ: दोबारा जाँचना काम आया।', 'Your changes helped this time: re-checking paid off.') : tt('बदलावों से कुल अंक नहीं बदले।', 'Your changes did not change the score overall.')}</p>`
          : `<p class="muted">${tt('आपने कोई सेव किया उत्तर नहीं बदला।', 'You did not change any saved answer.')}</p>`}
      </section>

      <section class="res-block"><h2>${tt('हर प्रश्न पर समय', 'Time per question')}</h2>
        <p class="muted">${tt('औसत', 'Average')}: ${mmss(avg(R.filter(r => r.ok === true)))} ${tt('सही पर', 'on correct')} · ${mmss(avg(R.filter(r => r.ok === false)))} ${tt('गलत पर', 'on wrong')} · ${mmss(avg(R.filter(r => r.ok === null && r.st.v)))} ${tt('देखे पर छोड़े पर', 'on visited but not answered')}.${long.length ? ` ${tt(`<b>${long.length}</b> प्रश्नों पर 4 मिनट या अधिक लगे`, `<b>${long.length}</b> question${long.length > 1 ? 's' : ''} took 4 minutes or more`)}: ${long.map(r => 'Q' + r.x.n).join(', ')}.` : ''}</p>
        <div class="tbars" role="img" aria-label="${tt('हर प्रश्न पर लगे समय का चार्ट', 'Bar chart of time spent on each question')}">${R.map(r => `<a href="#rq${r.x.n}" class="tbar ${r.ok === true ? 'good' : r.ok === false ? 'bad' : 'none'}" title="Q${r.x.n}: ${mmss(r.st.t || 0)}"><i style="height:${Math.max(2, 100 * (r.st.t || 0) / tmax)}%"></i><span>${r.x.n}</span></a>`).join('')}</div>
        <p class="tbar-key"><span class="k good"></span>${tt('सही', 'correct')} <span class="k bad"></span>${tt('गलत', 'wrong')} <span class="k none"></span>${tt('उत्तर नहीं', 'not answered')}</p>
      </section>

      <section class="res-block"><h2>${tt('प्रश्नवार समीक्षा', 'Question-wise review')}</h2>
        <div class="filters" id="filters">${[['all', 'सभी', 'All'], ['bad', 'गलत', 'Wrong'], ['none', 'छोड़े', 'Not answered'], ['chg', 'बदले', 'Changed'], ['good', 'सही', 'Correct']].map(([k, h, e], i) => `<button data-f="${k}" class="${i ? '' : 'on'}">${tt(h, e)}</button>`).join('')}</div>
        <div id="rlist">${R.map(r => reviewCard(r, lang)).join('')}</div>
      </section>
      <div class="instr-actions"><a class="btn-plain" href="exam.html">← ${tt('सभी टेस्ट', 'All tests')}</a><button class="btn-go" id="retake">${tt('यह टेस्ट फिर से दें', 'Retake this test')}</button></div>
      ${SERVER ? '' : `<p class="muted small">${tt('प्रोटोटाइप: टाइमर और उत्तर कुंजी आपके ब्राउज़र में हैं। लाइव संस्करण दोनों को सर्वर पर रखता है।', 'Prototype: the timer and answer key are in your browser. The live version keeps both on the server.')}</p>`}
    </div>`;
    $$('#filters button').forEach(b => b.onclick = () => {
      $$('#filters button').forEach(x => x.classList.toggle('on', x === b));
      const f = b.dataset.f;
      $$('.rcard').forEach(card => { card.hidden = f !== 'all' && !card.classList.contains('f-' + f); });
    });
    renderResultBind(R);
    $('#retake').onclick = () => { if (confirm(tt('यह टेस्ट फिर से शुरू करें? आपका मौजूदा परिणाम हट जाएगा।', 'Start this test again? Your current result will be removed.'))) retake(); };
  }
  function retake() {
    const done = () => { drop(SKEY(T.id)); S = null; lastSent = {}; rerender = null; renderInstructions(ulang); window.scrollTo(0, 0); };
    if (!SERVER) return done();
    api(`/cbt/test/${encodeURIComponent(T.slug)}/retake`, { method: 'POST' }).then(r => r.ok ? done() : alert(r.d.error || 'Could not reset the test'));
  }

  // Weak areas, after the score: chapter-wise marks (weakest first) and the NCERT paragraphs of the wrong and
  // unanswered questions, each linking to that chapter's NCERT + PYQ page (at the paragraph).
  function weakBlocks(R) {
    if (!R.some(r => qChapter(r.x.q))) return topicBlock(R);
    const chs = new Map();
    R.forEach(r => {
      const id = qChapter(r.x.q) || '—';
      const c = chs.get(id) || { id, n: 0, c: 0, w: 0, pts: 0, max: 0 };
      c.n++; c.pts += r.pts; c.max += r.x.sec.marking.correct;
      if (r.ok === true) c.c++; else if (r.ok === false) c.w++;
      chs.set(id, c);
    });
    const rows = [...chs.values()].map(c => Object.assign(c, { pct: c.max ? c.pts / c.max : 0 })).sort((a, b) => a.pct - b.pct || b.n - a.n);
    const weakCh = rows.filter(c => c.pct < 0.5 && c.c < c.n);
    const paras = new Map();
    R.filter(r => r.ok !== true).forEach(r => {
      const q = r.x.q, chId = qChapter(q), ps = qParas(q);
      const list = ps.length ? ps.map((p, i) => ({ p, title: qParaTitle(q, i, ulang) })) : [{ p: '', title: q.topic ? L(q.topic, ulang) : '' }];
      list.slice(0, 2).forEach(({ p, title }) => {
        const k = chId + '#' + p;
        const e = paras.get(k) || { chId, p, title, w: 0, u: 0, qs: [] };
        if (r.ok === false) e.w++; else e.u++;
        e.qs.push(r.x.n);
        paras.set(k, e);
      });
    });
    const plist = [...paras.values()].sort((a, b) => (b.w * 2 + b.u) - (a.w * 2 + a.u) || a.chId.localeCompare(b.chId));
    const shown = plist.slice(0, 15);
    const bar = pct => `<span class="meter" aria-hidden="true"><i style="width:${Math.max(0, Math.round(100 * pct))}%"></i></span>`;
    const chTable = rs => `<div class="tablewrap"><table class="sumtab chtab"><thead><tr><th>${tt('अध्याय', 'Chapter')}</th><th>${tt('प्रश्न', 'Qs')}</th><th>${tt('सही', 'Correct')}</th><th>${tt('गलत', 'Wrong')}</th><th>${tt('छोड़े', 'Blank')}</th><th>${tt('अंक', 'Marks')}</th></tr></thead><tbody>
      ${rs.map(c => `<tr class="${c.pct < 0.5 && c.c < c.n ? 'weak-row' : ''}"><td><a href="${chLink(c.id)}">${esc(chName(c.id))}</a></td><td>${c.n}</td><td>${c.c}</td><td>${c.w}</td><td>${c.n - c.c - c.w}</td><td><b>${c.pts}</b> / ${c.max} ${bar(c.pct)}</td></tr>`).join('')}</tbody></table></div>`;
    return `<section class="res-block weak">
      <h2>${tt('अध्यायवार अंक', 'Chapter-wise marks')}</h2>
      ${weakCh.length ? `<p class="revise-first"><b>${tt('पहले दोहराएँ', 'Revise first')}:</b> ${weakCh.slice(0, 4).map(c => `<a href="${chLink(c.id)}">${esc(chName(c.id))}</a>`).join(', ')}</p>` : `<p class="muted">${tt('हर अध्याय में आधे से अधिक अंक। बढ़िया!', 'More than half the marks in every chapter. Well done!')}</p>`}
      ${chTable(rows.slice(0, 10))}
      ${rows.length > 10 ? `<details class="more-ch"><summary>${tt(`बाकी ${rows.length - 10} अध्याय`, `The other ${rows.length - 10} chapters`)}</summary>${chTable(rows.slice(10))}</details>` : ''}
      ${shown.length ? `<h2>${tt('इन NCERT अनुच्छेदों को फिर पढ़ें', 'Re-read these NCERT paragraphs')}</h2>
      <p class="muted">${tt('गलत या छोड़े गए प्रश्न जिन अनुच्छेदों से हैं। अनुच्छेद पर क्लिक करें: अध्याय पृष्ठ वहीं खुलेगा, उसके सभी PYQ के साथ।', 'The paragraphs your wrong or unanswered questions come from. Click one to open the chapter page at that paragraph, with all its PYQs.')}</p>
      <ul class="weak-paras">${shown.map(e => `<li><a href="${chLink(e.chId, e.p)}"><b>${e.p ? '§' + esc(e.p) + ' ' : ''}${esc(e.title || chName(e.chId))}</b><small>${esc(chName(e.chId))}</small></a>
        <span class="wp-n">${e.w ? `<i class="bad">${e.w} ${tt('गलत', 'wrong')}</i>` : ''}${e.u ? `<i>${e.u} ${tt('छोड़े', 'blank')}</i>` : ''} · ${e.qs.slice(0, 6).map(n => `<a href="#rq${n}">Q${n}</a>`).join(' ')}</span></li>`).join('')}</ul>
      ${plist.length > shown.length ? `<p class="muted">${tt(`और ${plist.length - shown.length} अनुच्छेद: नीचे प्रश्नवार समीक्षा देखें।`, `${plist.length - shown.length} more paragraphs: see the question-wise review below.`)}</p>` : ''}` : ''}
    </section>`;
  }
  function topicBlock(R) {
    if (!R.some(r => r.x.q.topic)) return '';
    const tp = {};
    R.forEach(r => { const k = r.x.q.topic ? L(r.x.q.topic, 'en') : '—'; const t = tp[k] = tp[k] || { name: r.x.q.topic, n: 0, c: 0, w: 0 }; t.n++; if (r.ok === true) t.c++; else if (r.ok === false) t.w++; });
    const rows = Object.values(tp).sort((a, b) => (a.c / a.n) - (b.c / b.n));
    const weak = rows.filter(t => t.n >= 2 && t.c / t.n < 0.5);
    return `<section class="res-block"><h2>${tt('विषयवार', 'Topic-wise')}</h2>
      ${weak.length ? `<p><b>${tt('पहले दोहराएँ', 'Revise first')}:</b> ${weak.slice(0, 3).map(t => esc(L(t.name, ulang))).join(', ')}</p>` : ''}
      <div class="tablewrap"><table class="sumtab"><thead><tr><th>${tt('विषय', 'Topic')}</th><th>${tt('प्रश्न', 'Questions')}</th><th>${tt('सही', 'Correct')}</th><th>${tt('गलत', 'Wrong')}</th><th>${tt('छोड़े', 'Not answered')}</th></tr></thead><tbody>
      ${rows.map(t => `<tr><td>${esc(L(t.name, ulang))}</td><td>${t.n}</td><td>${t.c}</td><td>${t.w}</td><td>${t.n - t.c - t.w}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function renderResultBind(R) {
    $$('.rcard .rlang').forEach(s => s.onchange = () => {
      const r = R.find(y => y.x.n === +s.dataset.n);
      s.closest('.rcard').outerHTML = reviewCard(r, s.value);
      renderResultBind(R);
    });
  }

  function reviewCard(r, lang) {
    const q = r.x.q, hiReady = hasHi(q);
    const tx = lang === 'hi' && hiReady ? q.text.hi : q.text.en;
    const H = lang === 'hi' && hiReady;
    const cls = r.ok === true ? 'good' : r.ok === false ? 'bad' : 'none';
    const src = q.srcLabel ? L(q.srcLabel, lang) : !q.source ? (q.topic ? L(q.topic, lang) : '') : q.source.kind === 'PYQ' ? `${q.source.exam} ${q.source.year}${q.source.session ? ' · ' + q.source.session : ''}` : q.source.label || q.source.kind;
    const nc = q.ncert || { paras: qParas(q), lines: [] };
    const chId = qChapter(q);
    const ansLine = q.answer.kind === 'numeric'
      ? `${H ? 'सही उत्तर' : 'Correct answer'}: <b>${q.answer.value}</b>${q.answer.tol ? ` (± ${q.answer.tol})` : ''}`
      : `${H ? 'सही उत्तर' : 'Correct answer'}: <b>(${q.answer.index + 1})</b>${(q.answer.alsoAccepted || []).length ? ` ${H ? 'तथा' : 'also'} ${q.answer.alsoAccepted.map(i => `(${i + 1})`).join(', ')}` : ''}`;
    const hist = (r.st.hist || []).map(h => fmtAns(q, h.a)).join(' → ');
    const opts = q.answer.kind === 'numeric' ? '' : `<ol class="ropts">${tx.o.map((o, i) => `<li class="${i === q.answer.index ? 'right' : ''}${i === r.st.ans && i !== q.answer.index ? ' wrongpick' : ''}"><span class="on">${i + 1})</span><span class="otext">${o}</span></li>`).join('')}</ol>`;
    const pdf = q.pdf && q.pdf.url;
    const lines = (nc.lines || []).map(l => `<figure class="excerpt">${l.img ? `<img src="assets/ncert/${esc(q.ncert.chapter)}/${esc(l.img)}.webp" alt="NCERT excerpt, ${esc(l.label)}" loading="lazy">` : ''}${l.text ? `<blockquote>${esc(l.text)}</blockquote>` : ''}<figcaption>NCERT ${esc(l.label)}${pdf ? ` · <a href="${esc(q.pdf.url)}#page=${l.page - q.pdf.offset}" target="_blank" rel="noopener">open page ${l.page} on ncert.nic.in</a>` : ''}</figcaption></figure>`).join('');
    const ps = nc.paras || [];
    const paraLinks = ps.map((p, i) => chId ? `<a href="${chLink(chId, p)}">§${esc(p)} ${esc(qParaTitle(q, i, H ? 'hi' : 'en'))}</a>` : `§${esc(p)} ${esc(qParaTitle(q, i, 'en'))}`).join(' · ');
    const verdict = r.ok === true ? (H ? 'सही' : 'Correct') : r.ok === false ? (H ? 'गलत' : 'Wrong') : (H ? 'उत्तर नहीं' : 'Not answered');
    return `<article class="rcard f-${cls}${r.changed ? ' f-chg' : ''}" id="rq${r.x.n}">
      <header><b>Q${r.x.n}</b><span class="badge ${cls}">${verdict} · ${r.pts > 0 ? '+' : ''}${r.pts}</span><span class="muted">${esc(src)} · ${mmss(r.st.t || 0)}${r.st.mark ? ' · ' + (H ? 'चिह्नित' : 'marked') : ''}</span>
        <select class="rlang" data-n="${r.x.n}" aria-label="Language"><option value="hi"${lang === 'hi' ? ' selected' : ''}>हिंदी</option><option value="en"${lang === 'en' ? ' selected' : ''}>English</option></select></header>
      ${lang === 'hi' && !hiReady ? `<p class="hi-note">${esc(HI_PENDING)}</p>` : ''}
      ${H && q.text.hi.status === 'draft' ? '<p class="hi-draft">हिंदी प्रारूप · प्रूफ़रीडिंग बाकी</p>' : ''}
      <div lang="${H ? 'hi' : 'en'}"><div class="qtext">${tx.q}</div>${opts}
      <p class="yours">${H ? 'आपका उत्तर' : 'Your answer'}: <b>${fmtAns(q, r.st.ans)}</b> · ${ansLine}${r.changed ? ` · <span class="chgnote">${H ? 'बदला' : 'changed'}: ${hist}</span>` : ''}</p>
      <details><summary>${H ? 'हल और NCERT अनुच्छेद' : 'Solution and NCERT paragraph'}</summary><div class="sol">${tx.sol || ''}</div>${tx.trap ? `<p class="trap"><b>${H ? 'सावधानी:' : 'Trap:'}</b> ${tx.trap}</p>` : ''}
        ${q.ncert_status && q.ncert_status !== 'in_ncert' ? `<p class="paras">${H ? ({ old_ncert_only: 'यह विषय NEET में है पर केवल पुरानी (2023 से पहले की) NCERT में', lab_manual: 'स्रोत: NCERT प्रयोगशाला पुस्तिका', outside_ncert: 'NCERT में नहीं' })[q.ncert_status] || '' : ({ old_ncert_only: 'No current NCERT source: this topic is in NEET but only in the pre-2023 NCERT', lab_manual: 'Source: NCERT laboratory manual', outside_ncert: 'Not in NCERT' })[q.ncert_status] || ''}${nc.oldRef ? ' · ' + esc(nc.oldRef) : ''}</p>` : ''}
        <p class="paras" ${ps.length || chId ? '' : 'hidden'}>NCERT: ${paraLinks}${chId ? `${ps.length ? ' · ' : ''}<a href="${chLink(chId)}">${esc(chName(chId, H ? 'hi' : 'en'))} →</a>` : ''}${(nc.otherChapters || []).length ? ' · ' + (H ? 'साथ में ' : 'also ') + esc(nc.otherChapters.join(', ')) : ''}</p>${lines}</details></div>
    </article>`;
  }

  loadCatalog().then(boot);
})();
