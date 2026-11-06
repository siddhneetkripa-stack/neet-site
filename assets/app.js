/* NEET NCERT Mind Maps: layered, clickable mind map + synopsis + node-wise quizzes.
   Plain JavaScript, no build step. Data lives in /data/*.json (built by tools/build.py). */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const cache = {};
  let catalog = null;

  // ---------- progress (per browser; storage may be unavailable) ----------
  const PKEY = 'neetmm-progress-v1';
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch (e) { progress = {}; }
  function saveProgress() { try { localStorage.setItem(PKEY, JSON.stringify(progress)); } catch (e) { /* ignore */ } }

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getJSON = url => cache[url] ? Promise.resolve(cache[url]) : fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); }).then(j => (cache[url] = j));
  const subjectOf = id => id.startsWith('phy') ? 'physics' : id.startsWith('bio') ? 'biology' : 'chemistry';

  function indexTree(root) {
    const map = {};
    (function walk(n, parent, depth) {
      map[n.id] = { node: n, parent, depth };
      (n.children || []).forEach(c => walk(c, n, depth + 1));
    })(root, null, 0);
    return map;
  }
  function pathTo(map, id) { const p = []; let cur = map[id]; while (cur) { p.unshift(cur.node); cur = cur.parent ? map[cur.parent.id] : null; } return p; }
  function allQuestions(n, acc = []) { (n.questions || []).forEach(q => acc.push(Object.assign({ node: n.id, nodeTitle: n.title }, q))); (n.children || []).forEach(c => allQuestions(c, acc)); return acc; }
  function doneCount(qs) { return qs.filter(q => progress[q.id] === true).length; }
  function wrap(text, max) {
    const words = text.split(' '), lines = []; let line = '';
    words.forEach(w => { if ((line + ' ' + w).trim().length > max && line) { lines.push(line); line = w; } else line = (line + ' ' + w).trim(); });
    if (line) lines.push(line);
    return lines;
  }
  function pdfLink(ch, page) { return `${ch.ncertPdf}#page=${page - ch.pdfPageOffset}`; }

  // ---------- router ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    window.scrollTo(0, 0);
    if (parts[0] === 'c' && parts[1]) {
      const chId = parts[1];
      if (parts[2] === 'read') return renderRead(chId);
      return renderChapter(chId, parts[2] === 'n' ? decodeURIComponent(parts[3] || '') : '');
    }
    renderHome();
  }
  window.addEventListener('hashchange', route);

  function topbar(ch, mode) {
    const seg = ch ? `<div class="seg"><a href="#/c/${ch.id}" class="${mode === 'map' ? 'on' : ''}">Tree</a><a href="#/c/${ch.id}/read" class="${mode === 'read' ? 'on' : ''}">Full synopsis</a></div>` : '';
    return `<header class="topbar"><a class="brand" href="#/">NCERT<span>·</span>MindMap</a><div class="spacer"></div>${seg}</header>`;
  }

  // ---------- home ----------
  function renderHome() {
    document.body.dataset.subject = 'chemistry';
    getJSON('data/catalog.json').then(cat => {
      catalog = cat;
      const colors = { physics: '#4338ca', chemistry: '#0f766e', biology: '#15803d' };
      app.innerHTML = topbar(null) + `<main>
        <section class="hero"><h1>Every NCERT paragraph, mapped.</h1>
        <p>Pick a chapter and open its mind map. Go down layer by layer, from chapter to section to paragraph. Every node has a short synopsis in our own words and questions on exactly that part, with a link to the page in the official NCERT book.</p></section>
        ${(() => { const ready = []; cat.subjects.forEach(s => s.classes.forEach(c => c.chapters.forEach(ch => ch.ready && ready.push({ s, c, ch }))));
          return ready.length ? `<section class="subject"><h2>Ready now</h2><div class="chap-grid">${ready.map(({ s, c, ch }) => `<a class="chap ready" style="--sc:${colors[s.id]}" href="#/c/${ch.id}"><small>${esc(s.name)} · Class ${c.cls} · Ch ${ch.no}</small>${esc(ch.title)}<small>${ch.stats.nodes} nodes · ${ch.stats.questions} questions</small></a>`).join('')}</div></section>` : ''; })()}
        ${cat.subjects.map(s => `<section class="subject" style="--sc:${colors[s.id]}"><h2><span class="dot"></span>${esc(s.name)}</h2>
          ${s.classes.map(c => `<div class="cls-label">Class ${c.cls}</div><div class="chap-grid">
            ${c.chapters.map(ch => ch.ready
              ? `<a class="chap ready" href="#/c/${ch.id}"><small>Ch ${ch.no} · ${ch.stats.nodes} nodes · ${ch.stats.questions} Qs</small>${esc(ch.title)}</a>`
              : `<a class="chap soon"><small>Ch ${ch.no} · coming soon</small>${esc(ch.title)}</a>`).join('')}
          </div>`).join('')}</section>`).join('')}
      </main>${footer()}`;
    }).catch(err);
  }

  // ---------- chapter: expanding tree ----------
  // The tree grows to the right as you click: chapter → section → sub-topic → paragraph → detail card.
  // Only one branch per level stays open, so the path you are reading is always clear.
  const href = (ch, n) => n.id === ch.id ? `#/c/${ch.id}` : `#/c/${ch.id}/n/${encodeURIComponent(n.id)}`;
  let T = null; // { ch, map, selected, about:Set }

  function renderChapter(chId, nodeId) {
    document.body.dataset.subject = subjectOf(chId);
    getJSON(`data/${chId}.json`).then(ch => {
      const map = indexTree(ch);
      T = { ch, map, selected: map[nodeId] ? nodeId : ch.id, about: new Set() };
      app.innerHTML = topbar(ch, 'map') + `<main class="wide">
        <div class="tree-head"><div><h1>${esc(ch.title)}</h1><p class="ref">${esc(ch.ref)} · ${ch.stats.nodes} topics · ${ch.stats.questions} questions</p></div>
          <p class="legend"><span class="lg-node"></span> tap to open the next layer <span class="lg-q">Q</span> questions on that topic</p></div>
        <div class="tree-wrap" id="treewrap"></div></main>${footer()}`;
      drawTree(false);
    }).catch(err);
  }

  function drawTree(scrollToNew) {
    const { ch, map } = T;
    const open = new Set(pathTo(map, T.selected).map(n => n.id));
    const wrap = document.getElementById('treewrap');
    const sx = wrap.scrollLeft, sy = window.scrollY;
    wrap.innerHTML = `<div class="tree">${branch(ch, ch, open, 0)}</div>`;
    wrap.scrollLeft = sx; window.scrollTo(0, sy);
    bindTree();
    if (scrollToNew) {
      // keep the tapped node near the top of the screen and bring its new layer into view sideways
      const sel = wrap.querySelector('.is-sel');
      if (sel) {
        const row = sel.querySelector('.node-row'), kids = sel.querySelector(':scope > .kids') || row;
        const top = row.getBoundingClientRect().top + window.scrollY - 76;
        if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: 'smooth' });
        const wr = wrap.getBoundingClientRect(), kr = kids.getBoundingClientRect(), rr = row.getBoundingClientRect();
        if (kr.right > wr.right - 10) wrap.scrollTo({ left: wrap.scrollLeft + Math.min(kr.right - wr.right + 30, rr.left - wr.left - 20), behavior: 'smooth' });
        else if (rr.left < wr.left) wrap.scrollTo({ left: wrap.scrollLeft + rr.left - wr.left - 20, behavior: 'smooth' });
      }
    }
  }

  function branch(ch, n, open, depth) {
    const kids = n.children || [];
    const isOpen = open.has(n.id);
    const sel = T.selected === n.id;
    const qs = allQuestions(n);
    const done = qs.length && doneCount(qs) === qs.length;
    const meta = kids.length ? `${kids.length} inside` : 'paragraph';
    let h = `<div class="branch${isOpen ? ' is-open' : ''}${sel ? ' is-sel' : ''}${kids.length ? '' : ' is-leaf'}" data-id="${n.id}">
      <div class="node-row">
        <button class="tnode${depth === 0 ? ' root' : ''}${done ? ' done' : ''}" data-open="${n.id}" aria-expanded="${isOpen}">
          <span class="tt">${esc(depth === 0 ? n.title : n.title)}</span>
          <span class="tm">${meta}${done ? ' · ✓ done' : ''}</span>
          ${depth ? `<span class="chev">${isOpen ? '‹' : '›'}</span>` : ''}
        </button>
        ${qs.length ? `<button class="qchip" data-q="${n.id}" title="Questions on this topic">Q ${qs.length}</button>` : ''}
      </div>`;
    if (isOpen) {
      h += `<div class="kids">`;
      if (kids.length) {
        h += `<div class="branch about-b">${aboutCard(ch, n)}</div>`;
        h += kids.map(k => branch(ch, k, open, depth + 1)).join('');
      } else {
        h += `<div class="branch detail-b">${detailCard(ch, n)}</div>`;
      }
      h += `</div>`;
    }
    return h + `</div>`;
  }

  function aboutCard(ch, n) {
    const isOpen = T.about.has(n.id);
    return `<div class="about${isOpen ? ' open' : ''}">
      <button class="about-t" data-about="${n.id}"><span>ⓘ About ${esc(n.short || n.title)}</span><span>${isOpen ? 'hide' : 'read'}</span></button>
      ${isOpen ? `<div class="about-body"><p class="ref">${esc(n.ref || '')} ${pagesPills(ch, n)}</p>${nodeContent(ch, n)}</div>` : ''}
    </div>`;
  }

  function detailCard(ch, n) {
    const qs = (n.questions || []).map(q => Object.assign({ node: n.id, nodeTitle: n.title }, q));
    return `<article class="detail">
      <div class="d-head"><span class="ref">${esc(n.ref || '')}</span>${pagesPills(ch, n)}</div>
      <h2>${esc(n.title)}</h2>
      ${nodeContent(ch, n)}
      ${qs.length ? `<section class="inline-q" id="iq-${n.id}"><h3>Questions on this paragraph <small>${doneCount(qs)}/${qs.length} correct</small></h3>
        ${qs.map((q, i) => inlineQ(q, i)).join('')}</section>` : ''}
    </article>`;
  }

  function inlineQ(q, i) {
    const ord = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    return `<div class="iq" data-qid="${q.id}">
      <div class="qmeta"><span>Q${i + 1}</span><span>·</span><span>${esc(q.src || 'Practice')}</span>${q.lvl ? `<span>·</span><span>${esc(q.lvl)}</span>` : ''}${progress[q.id] === true ? '<span class="pill">✓ done before</span>' : ''}</div>
      <div class="qtext">${esc(q.q)}</div>
      ${ord.map((k, pos) => `<button class="opt" data-k="${k}"><b>${'ABCD'[pos]}</b>${esc(q.o[k])}</button>`).join('')}
      <div class="slot"></div></div>`;
  }

  function bindTree() {
    const { ch, map } = T;
    const wrap = document.getElementById('treewrap');
    wrap.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.open;
      const open = new Set(pathTo(map, T.selected).map(n => n.id));
      if (id === ch.id) T.selected = ch.id;
      else if (open.has(id)) T.selected = map[id].parent.id; // tap an open node to fold it
      else T.selected = id;
      history.replaceState(null, '', T.selected === ch.id ? `#/c/${ch.id}` : `#/c/${ch.id}/n/${encodeURIComponent(T.selected)}`);
      drawTree(true);
    }));
    wrap.querySelectorAll('[data-about]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.about; T.about.has(id) ? T.about.delete(id) : T.about.add(id); drawTree(false);
    }));
    wrap.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const n = map[b.dataset.q].node;
      if (!(n.children || []).length) { // paragraph: open it and jump to its questions
        T.selected = n.id; drawTree(false);
        const s = document.getElementById('iq-' + n.id); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        return;
      }
      openQuiz(ch, n, allQuestions(n));
    }));
    wrap.querySelectorAll('.iq').forEach(box => {
      const qid = box.dataset.qid;
      const n = map[T.selected].node;
      const q = (n.questions || []).find(x => x.id === qid);
      box.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => {
        const k = +btn.dataset.k, ok = k === q.a;
        if (ok) progress[q.id] = true; else if (progress[q.id] !== true) progress[q.id] = false;
        saveProgress();
        box.querySelectorAll('.opt').forEach(b => { const j = +b.dataset.k; b.disabled = true; if (j === q.a) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
        box.querySelector('.slot').innerHTML = `<div class="explain"><span class="verdict ${ok ? 'ok' : 'no'}">${ok ? 'Correct.' : 'Not quite.'}</span> ${esc(q.e)}</div>`;
        const qs = n.questions || [];
        const sm = box.closest('.inline-q').querySelector('h3 small'); if (sm) sm.textContent = `${doneCount(qs)}/${qs.length} correct`;
      }));
    });
  }

  function nodeContent(ch, n, withDiagram = true) {
    let h = '';
    if (withDiagram && n.diagram && window.DIAGRAMS[n.diagram]) {
      const d = window.DIAGRAMS[n.diagram];
      h += `<figure class="diagram">${d.svg}<figcaption>${esc(d.caption)}</figcaption></figure>`;
    }
    h += `<div class="syn">${n.synopsis || ''}</div>`;
    if (n.formulas && n.formulas.length) h += `<div class="box formulas"><h4>Formulas</h4><ul>${n.formulas.map(f => `<li><code>${fmt(f)}</code></li>`).join('')}</ul></div>`;
    if (n.points && n.points.length) h += `<div class="box points"><h4>Remember</h4><ul>${n.points.map(p => `<li>${fmt(p)}</li>`).join('')}</ul></div>`;
    if (n.traps && n.traps.length) h += `<div class="box traps"><h4>Exam traps</h4><ul>${n.traps.map(p => `<li>${fmt(p)}</li>`).join('')}</ul></div>`;
    return h;
  }

  function pagesPills(ch, n) {
    const p = n.pages || []; if (!p.length) return '';
    const first = Math.min(...p), last = Math.max(...p);
    return `<a class="pill" target="_blank" rel="noopener" href="${pdfLink(ch, first)}" title="Open the official NCERT PDF at this page">NCERT ${first === last ? 'p. ' + first : 'pp. ' + first + '–' + last} ↗</a>`;
  }
  // "p_ex" → p<sub>ex</sub>, "ΔS_total" → ΔS<sub>total</sub>
  const fmt = f => esc(f).replace(/_([A-Za-z0-9]+)/g, '<sub>$1</sub>');

  // ---------- read mode (whole-chapter synopsis) ----------
  function renderRead(chId) {
    document.body.dataset.subject = subjectOf(chId);
    getJSON(`data/${chId}.json`).then(ch => {
      const section = (n, lvl) => `<div class="node" id="r-${n.id}"><h3>${esc(n.title)} <a class="pill" href="${href(ch, n)}">map ›</a> ${pagesPills(ch, n)}</h3>${nodeContent(ch, n)}${(n.children || []).map(c => section(c, lvl + 1)).join('')}</div>`;
      app.innerHTML = topbar(ch, 'read') + `<main class="read">
        <section><h1>${esc(ch.title)}</h1><p class="ref">${esc(ch.ref)}</p>${nodeContent(ch, ch)}
          <h3>Contents</h3><ol class="toc">${ch.children.map(s => `<li><a href="#/c/${ch.id}/read" data-jump="r-${s.id}">${esc(s.title)}</a></li>`).join('')}</ol></section>
        ${ch.children.map(s => `<section class="lvl-1" id="r-${s.id}"><h2>${esc(s.title)}</h2><p>${pagesPills(ch, s)} <a class="pill" href="${href(ch, s)}">open in map ›</a></p>${nodeContent(ch, s)}${(s.children || []).map(c => section(c, 2)).join('')}</section>`).join('')}
      </main>${footer()}`;
      app.querySelectorAll('[data-jump]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.getElementById(a.dataset.jump).scrollIntoView({ behavior: 'smooth' }); }));
    }).catch(err);
  }

  // ---------- quiz ----------
  function openQuiz(ch, scope, qs) {
    let i = 0; const answers = [];
    // shuffle option order each attempt so the answer letter can't be memorised
    const order = () => qs.forEach(q => { const o = [0, 1, 2, 3]; for (let j = 3; j > 0; j--) { const r = Math.floor(Math.random() * (j + 1)); [o[j], o[r]] = [o[r], o[j]]; } q._ord = o; });
    order();
    const ov = document.createElement('div'); ov.className = 'overlay';
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const close = () => { ov.remove(); document.body.style.overflow = ''; route(); };
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.addEventListener('keydown', function onKey(e) { if (!document.body.contains(ov)) return document.removeEventListener('keydown', onKey); if (e.key === 'Escape') close(); });

    function shell(body, foot) {
      ov.innerHTML = `<div class="quiz" role="dialog" aria-modal="true"><div class="quiz-head"><div class="title">${esc(scope.short || scope.title)}</div><button class="x" aria-label="Close">×</button></div>
        <div class="bar"><i style="width:${(answers.length / qs.length) * 100}%"></i></div><div class="quiz-body">${body}</div>${foot ? `<div class="quiz-foot">${foot}</div>` : ''}</div>`;
      ov.querySelector('.x').onclick = close;
    }
    function show() {
      const q = qs[i];
      shell(`<div class="qmeta"><span>Q ${i + 1} of ${qs.length}</span><span>·</span><span>${esc(q.nodeTitle)}</span><span>·</span><span>${esc(q.src || 'Practice')}</span>${q.lvl ? `<span>·</span><span>${esc(q.lvl)}</span>` : ''}${(q.pyq || []).map(y => `<span class="pill">${esc(y)}</span>`).join('')}</div>
        <div class="qtext">${esc(q.q)}</div>
        ${q._ord.map((k, pos) => `<button class="opt" data-k="${k}"><b>${'ABCD'[pos]}</b>${esc(q.o[k])}</button>`).join('')}<div class="slot"></div>`,
        `<span></span><button class="btn" id="next" disabled>${i + 1 < qs.length ? 'Next →' : 'See score'}</button>`);
      ov.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(+b.dataset.k));
      ov.querySelector('#next').onclick = () => { i++; i < qs.length ? show() : score(); };
    }
    function pick(k) {
      const q = qs[i], ok = k === q.a;
      answers.push({ q, k, ok });
      if (ok) progress[q.id] = true; else if (progress[q.id] !== true) progress[q.id] = false;
      saveProgress();
      ov.querySelectorAll('.opt').forEach(b => { const j = +b.dataset.k; b.disabled = true; if (j === q.a) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
      ov.querySelector('.slot').innerHTML = `<div class="explain"><span class="verdict ${ok ? 'ok' : 'no'}">${ok ? 'Correct.' : 'Not quite.'}</span> ${esc(q.e)}</div>`;
      ov.querySelector('.bar i').style.width = (answers.length / qs.length) * 100 + '%';
      const n = ov.querySelector('#next'); n.disabled = false; n.focus();
    }
    function score() {
      const right = answers.filter(a => a.ok).length;
      const wrong = answers.filter(a => !a.ok);
      shell(`<div class="score"><div class="big">${right}/${qs.length}</div><p>${right === qs.length ? 'Perfect. This part is solid.' : right / qs.length >= 0.7 ? 'Good. Revisit the ones you missed.' : 'Re-read the synopsis for the nodes below, then try again.'}</p></div>
        ${wrong.length ? `<h3>Revise these</h3><ul class="review">${wrong.map(a => `<li><a href="${href(ch, { id: a.q.node })}" data-close>${esc(a.q.nodeTitle)}</a>: ${esc(a.q.q)}</li>`).join('')}</ul>` : ''}`,
        `<button class="btn ghost" id="again">Try again</button><button class="btn" id="done">Done</button>`);
      ov.querySelector('#again').onclick = () => { i = 0; answers.length = 0; order(); show(); };
      ov.querySelector('#done').onclick = close;
      ov.querySelectorAll('[data-close]').forEach(a => a.addEventListener('click', () => { ov.remove(); document.body.style.overflow = ''; }));
    }
    show();
  }

  function footer() {
    return `<footer>Synopses, questions and diagrams are original study material based on the NCERT syllabus. NCERT textbooks are © NCERT and are linked, not reproduced. Free to read the book at <a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener">ncert.nic.in</a>.</footer>`;
  }
  function err(e) { console.error(e); app.innerHTML = topbar(null) + `<main><p class="empty">Could not load this page. ${esc(e.message || '')}</p></main>`; }

  route();
})();
