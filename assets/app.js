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
    const seg = ch ? `<div class="seg"><a href="#/c/${ch.id}" class="${mode === 'map' ? 'on' : ''}">Map</a><a href="#/c/${ch.id}/read" class="${mode === 'read' ? 'on' : ''}">Full synopsis</a></div>` : '';
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

  // ---------- chapter: map + panel ----------
  function renderChapter(chId, nodeId) {
    document.body.dataset.subject = subjectOf(chId);
    getJSON(`data/${chId}.json`).then(ch => {
      const map = indexTree(ch);
      const cur = map[nodeId] ? map[nodeId].node : ch;
      const path = pathTo(map, cur.id);
      const parent = map[cur.id].parent;
      // A paragraph-level node has no children: show its parent's layer with this node highlighted.
      const isLeaf = !(cur.children || []).length;
      const mapNode = isLeaf && parent ? parent : cur;
      const mapParent = mapNode.id === ch.id ? null : map[mapNode.id].parent;
      const crumbs = path.map((n, i) => `${i ? '<span class="sep">›</span>' : ''}<a href="${href(ch, n)}">${esc(n.short || n.title)}</a>`).join('');

      app.innerHTML = topbar(ch, 'map') + `<main>
        <nav class="crumbs">${crumbs}</nav>
        <div class="layout">
          <div class="mapbox">${mapSVG(ch, mapNode, mapParent, cur.id)}${cardList(ch, mapNode, mapParent, cur.id)}
            <p class="map-hint">${isLeaf ? 'Highlighted: the paragraph you are reading. Tap another box to jump.' : 'Solid box = more layers inside · dashed box = paragraph'}</p></div>
          ${panel(ch, cur)}
        </div></main>${footer()}`;
      bindMap();
      bindPanel(ch, cur);
    }).catch(err);
  }
  const href = (ch, n) => n.id === ch.id ? `#/c/${ch.id}` : `#/c/${ch.id}/n/${encodeURIComponent(n.id)}`;

  function mapSVG(ch, cur, parent, activeId) {
    const kids = cur.children || [];
    const W = 800, H = 640, cx = W / 2, cy = H / 2 + 6;
    let out = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Mind map of ${esc(cur.title)}">`;
    const n = kids.length;
    const boxes = kids.map((k, i) => {
      // start at the top, go clockwise; with 2 children place them left/right
      const ang = n === 2 ? Math.PI * i : -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1);
      const rx = n <= 3 ? 265 : 290, ry = n <= 3 ? 200 : 236;
      return { k, x: cx + rx * Math.cos(ang), y: cy + ry * Math.sin(ang) };
    });
    if (n === 1) { boxes[0].x = cx; boxes[0].y = cy + 220; }
    boxes.forEach(b => {
      const mx = (cx + b.x) / 2 + (b.y - cy) * 0.12, my = (cy + b.y) / 2 - (b.x - cx) * 0.12;
      out += `<path class="edge" d="M${cx},${cy} Q${mx},${my} ${b.x},${b.y}"/>`;
    });
    // centre node
    const cl = wrap(cur.short || cur.title, 13).slice(0, 4);
    out += `<g class="n-center${parent ? ' clickable' : ''}" ${activeId !== cur.id ? `tabindex="0" role="link" data-href="${href(ch, cur)}"` : ''}><circle cx="${cx}" cy="${cy}" r="92"/>` +
      cl.map((l, i) => `<text x="${cx}" y="${cy + (i - (cl.length - 1) / 2) * 23 + 7}" text-anchor="middle" font-size="${cl.length > 3 ? 18 : 21}">${esc(l)}</text>`).join('') + `</g>`;
    // children
    boxes.forEach(({ k, x, y }) => {
      const qs = allQuestions(k), sub = (k.children || []).length;
      const done = qs.length && doneCount(qs) === qs.length;
      const lines = wrap(k.short || k.title, 17).slice(0, 2);
      const w = 212, h = 42 + lines.length * 21;
      const meta = (sub ? `${sub} inside` : 'paragraph') + ` · ${qs.length} Q${qs.length === 1 ? '' : 's'}` + (done ? ' ✓' : '');
      out += `<g class="n-child${sub ? '' : ' leaf'}${done ? ' done' : ''}${k.id === activeId ? ' active' : ''}" tabindex="0" role="link" data-href="${href(ch, k)}" aria-label="${esc(k.title)}">
        <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="14"/>
        ${lines.map((l, i) => `<text x="${x}" y="${y - h / 2 + 27 + i * 21}" text-anchor="middle">${esc(l)}</text>`).join('')}
        <text class="meta" x="${x}" y="${y + h / 2 - 11}" text-anchor="middle">${meta}</text></g>`;
    });
    if (parent) {
      out += `<g class="n-back" tabindex="0" role="link" data-href="${href(ch, parent)}" aria-label="Up to ${esc(parent.title)}"><rect x="10" y="10" width="${Math.min(260, 50 + (parent.short || parent.title).length * 9.5)}" height="38" rx="19"/><text x="28" y="35">↑ ${esc(parent.short || parent.title)}</text></g>`;
    }
    return out + '</svg>';
  }

  function cardList(ch, cur, parent, activeId) {
    const kids = cur.children || [];
    return `<div class="cardlist">${parent ? `<a class="up" href="${href(ch, parent)}">↑ ${esc(parent.short || parent.title)}</a>` : ''}
      <a class="center" href="${href(ch, cur)}">${esc(cur.title)}</a>
      ${kids.map(k => { const qs = allQuestions(k); const sub = (k.children || []).length;
        return `<a class="${sub ? '' : 'leaf'}${k.id === activeId ? ' active' : ''}" href="${href(ch, k)}">${esc(k.title)}<small>${sub ? sub + ' ›' : ''} ${qs.length} Q${doneCount(qs) === qs.length && qs.length ? ' ✓' : ''}</small></a>`; }).join('')}</div>`;
  }

  function bindMap() {
    app.querySelectorAll('[data-href]').forEach(g => {
      g.addEventListener('click', () => { location.hash = g.dataset.href; });
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = g.dataset.href; } });
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
    if (n.points && n.points.length) h += `<div class="box points"><h4>Remember</h4><ul>${n.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
    if (n.traps && n.traps.length) h += `<div class="box traps"><h4>Exam traps</h4><ul>${n.traps.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
    return h;
  }

  function pagesPills(ch, n) {
    const p = n.pages || []; if (!p.length) return '';
    const first = Math.min(...p), last = Math.max(...p);
    return `<a class="pill" target="_blank" rel="noopener" href="${pdfLink(ch, first)}" title="Open the official NCERT PDF at this page">NCERT ${first === last ? 'p. ' + first : 'pp. ' + first + '–' + last} ↗</a>`;
  }
  // "p_ex" → p<sub>ex</sub>, "ΔS_total" → ΔS<sub>total</sub>
  const fmt = f => esc(f).replace(/_([A-Za-z0-9]+)/g, '<sub>$1</sub>');

  function panel(ch, n) {
    const own = (n.questions || []).map(q => Object.assign({ node: n.id, nodeTitle: n.title }, q));
    const all = allQuestions(n);
    const kids = n.children || [];
    return `<article class="panel">
      <div class="panel-head"><div class="ref"><span>${esc(n.ref || '')}</span>${pagesPills(ch, n)}</div><h2>${esc(n.title)}</h2></div>
      <div class="panel-body">${nodeContent(ch, n)}
        ${kids.length ? `<div class="sub-list"><h4>Inside this ${n.id === ch.id ? 'chapter' : 'topic'}</h4>${kids.map(k => `<a href="${href(ch, k)}">${esc(k.title)}<small>${allQuestions(k).length} Qs ›</small></a>`).join('')}</div>` : ''}
      </div>
      <div class="actions">
        ${own.length ? `<button class="btn" data-quiz="own">Practise this node (${own.length})</button>` : ''}
        ${kids.length && all.length ? `<button class="btn ${own.length ? 'ghost' : ''}" data-quiz="all">Practise ${n.id === ch.id ? 'whole chapter' : 'this branch'} (${all.length})</button>` : ''}
        ${all.length ? `<span class="progress">${doneCount(all)}/${all.length} answered correctly</span>` : ''}
      </div></article>`;
  }

  function bindPanel(ch, n) {
    app.querySelectorAll('[data-quiz]').forEach(b => b.addEventListener('click', () => {
      const qs = b.dataset.quiz === 'own' ? (n.questions || []).map(q => Object.assign({ node: n.id, nodeTitle: n.title }, q)) : allQuestions(n);
      openQuiz(ch, n, qs);
    }));
  }

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
