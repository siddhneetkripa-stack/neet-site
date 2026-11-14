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

  // ---------- interface language (Hindi first; questions stay in English until the Hindi bank is linked) ----------
  const LKEY = 'neet-ui-lang';
  let lang = 'hi';
  try { lang = localStorage.getItem(LKEY) || 'hi'; } catch (e) { /* storage unavailable */ }
  const t = (hi, en) => lang === 'hi' ? hi : en;
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    lang = b.dataset.lang; try { localStorage.setItem(LKEY, lang); } catch (e2) { /* ignore */ }
    document.documentElement.lang = lang; route();
  });
  document.documentElement.lang = lang;

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
    if (parts[0] === 'pyq' && parts[1]) return renderPYQ(parts[1]);
    if (parts[0] === 'c' && parts[1]) {
      const chId = parts[1];
      if (parts[2] === 'read') return renderRead(chId);
      return renderChapter(chId, parts[2] === 'n' ? decodeURIComponent(parts[3] || '') : '');
    }
    renderHome();
  }
  window.addEventListener('hashchange', route);

  // Look up a chapter's catalog entry (ready mind map? PYQ count?) so tabs only link to pages that exist.
  function catEntry(chId) {
    let hit = null;
    (catalog ? catalog.subjects : []).forEach(s => s.classes.forEach(c => c.chapters.forEach(ch => { if (ch.id === chId) hit = ch; })));
    return hit || {};
  }
  function topbar(ch, mode) {
    const e = ch ? catEntry(ch.id) : {};
    const tabs = [];
    if (ch && (e.ready || mode === 'map' || mode === 'read')) tabs.push(`<a href="#/c/${ch.id}" class="${mode === 'map' ? 'on' : ''}">${t('ट्री', 'Tree')}</a>`, `<a href="#/c/${ch.id}/read" class="${mode === 'read' ? 'on' : ''}">${t('पूरा सार', 'Full synopsis')}</a>`);
    if (ch && (e.pyq || mode === 'pyq')) tabs.push(`<a href="#/pyq/${ch.id}" class="${mode === 'pyq' ? 'on' : ''}">MCQs</a>`);
    const seg = tabs.length > 1 ? `<div class="seg">${tabs.join('')}</div>` : '';
    const back = ch ? `<a class="back-home" href="#/" aria-label="${t('सभी अध्याय', 'All chapters')}">← ${t('सभी अध्याय', 'All chapters')}</a>` : '';
    const nav = ch ? '' : `<nav class="topnav" aria-label="${t('मुख्य', 'Main')}"><a href="#/" class="on">${t('अध्याय', 'Chapters')}</a><a href="exam.html">${t('टेस्ट', 'Tests')}</a></nav>`;
    const lng = `<div class="lang" role="group" aria-label="${t('भाषा', 'Language')}"><button type="button" data-lang="hi" class="${lang === 'hi' ? 'on' : ''}" aria-pressed="${lang === 'hi'}">हिंदी</button><button type="button" data-lang="en" class="${lang === 'en' ? 'on' : ''}" aria-pressed="${lang === 'en'}">English</button></div>`;
    return `<header class="topbar"><a class="brand" href="#/"><span class="mark" aria-hidden="true"><i></i></span><span class="word">NCERT<span>·</span>MindMap</span></a>${back}${nav}<div class="spacer"></div>${seg}${lng}</header>`;
  }

  // ---------- home ----------
  function renderHome() {
    document.body.dataset.subject = 'chemistry';
    getJSON('data/catalog.json').then(cat => {
      catalog = cat;
      const colors = { physics: '#3730A3', chemistry: '#0B4F57', biology: '#166534' };
      const hiName = { physics: 'भौतिकी', chemistry: 'रसायन विज्ञान', biology: 'जीव विज्ञान' };
      const ready = []; cat.subjects.forEach(s => s.classes.forEach(c => c.chapters.forEach(ch => (ch.ready || ch.pyq) && ready.push({ s, c, ch }))));
      const first = ready.find(r => r.ch.pyq) || ready[0];
      const firstHref = first ? (first.ch.pyq ? `#/pyq/${first.ch.id}` : `#/c/${first.ch.id}`) : '#/';
      const tiles = cat.subjects.map(s => {
        const all = [], live = []; s.classes.forEach(c => c.chapters.forEach(ch => { all.push(ch); if (ch.ready || ch.pyq) live.push(ch); }));
        const pct = all.length ? Math.round(100 * live.length / all.length) : 0;
        const name = lang === 'hi' ? (hiName[s.id] || s.name) : s.name;
        return `<a class="subj-tile" href="#subj-${s.id}" data-jump-home="subj-${s.id}"><b>${esc(name)}</b><span>${live.length ? t(`${all.length} में से ${live.length} अध्याय तैयार`, `${live.length} of ${all.length} chapters ready`) : t('NCERT से जोड़ने का काम जारी', 'Tagging to NCERT in progress')}</span><span class="meter"><i style="width:${pct}%;background:${colors[s.id]}"></i></span><span class="go">${live.length ? t('खोलें →', 'Open →') : t('जल्द', 'Coming soon')}</span></a>`;
      }).join('');
      app.innerHTML = topbar(null) + `<main class="home">
        <section class="home-hero">
          <div class="copy">
            <span class="badge">NEET · हिंदी और English</span>
            <h1>${t('NCERT पढ़िए,<br>हर PYQ उसके साथ।', 'Read NCERT.<br>See every PYQ beside it.')}</h1>
            <p>${t('हर NCERT अनुच्छेद के साथ उस पर पूछे गए NEET प्रश्न, हल और वह NCERT लाइन जिस पर प्रश्न बना है। फिर NTA जैसी स्क्रीन पर टेस्ट।', 'Every NCERT paragraph with the NEET questions asked from it, worked solutions and the NCERT lines each question is built on. Then a test on an NTA-style screen.')}</p>
            <p class="en">${t('Read NCERT. See every PYQ beside it.', 'NCERT पढ़िए, हर PYQ उसके साथ।')}</p>
            <div class="ctas"><a class="btn big" href="${firstHref}">${t('पहला अध्याय खोलें · मुफ़्त', 'Open the first chapter · free')}</a><a class="btn big ghost" href="exam.html">${t('परीक्षा स्क्रीन देखें', 'Try the exam screen')}</a></div>
          </div>
          <div class="preview" aria-hidden="true">
            <div class="ph"><b>1.8 ${t('मोल संकल्पना', 'Mole concept')}</b> · ${t('रसायन · इकाई 1', 'Chemistry · Unit 1')}</div>
            <div class="cols">
              <div><span class="lbl">NCERT · ${t('पृष्ठ', 'p.')} 18</span>
                <span class="nline"><span class="no">1</span><span>${t('एक मोल = 12 g कार्बन-12 में जितने परमाणु', 'One mole = as many particles as atoms in 12 g of carbon-12')}</span></span>
                <span class="nline hot"><span class="no">2</span><span>${t('आवोगाद्रो स्थिरांक', 'Avogadro constant')}: 6.022 × 10²³ mol⁻¹</span></span>
                <span class="nline"><span class="no">3</span><span>${t('एक मोल का ग्राम में द्रव्यमान = मोलर द्रव्यमान', 'Mass of one mole in grams = molar mass')}</span></span></div>
              <div><span class="lbl">PYQ · ${t('NEET में 5 बार', 'NEET 5×')}</span>
                <span class="q"><b>NEET 2024</b> · ${t('हीलियम परमाणुओं की सबसे अधिक संख्या', 'Highest number of He atoms')}</span>
                <span class="q"><b>NEET 2026</b> · ${t('5.4 g यूरिया में H परमाणु', 'H atoms in 5.4 g urea')}</span>
                <span class="q"><b>NEET 2025</b> · ${t('समान परमाणु संख्या', 'Equal number of atoms')}</span></div>
            </div>
          </div>
        </section>
        <section class="band"><div class="t"><b>${t('NTA जैसी परीक्षा स्क्रीन', 'NTA-style exam screen')}</b><span>${t('वही पैलेट, वही रंग, वही बटन। परीक्षा से पहले कंप्यूटर पर अभ्यास।', 'Same palette, colours and buttons. Practise on a computer before the exam.')}</span></div><a class="btn big saffron" href="exam.html">${t('टेस्ट शुरू करें', 'Start a test')}</a></section>
        <h2 class="sec">${t('विषय', 'Subjects')}</h2>
        <div class="subj-tiles">${tiles}</div>
        <section class="steps">
          <div><small>01 · ${t('पढ़ें', 'Read')}</small><b>${t('एक बार में एक NCERT अनुच्छेद', 'One NCERT paragraph at a time')}</b><span>${t('सार, सूत्र, ट्रैप और NCERT पेज का लिंक।', 'Summary, formulas, traps and a link to the NCERT page.')}</span></div>
          <div><small>02 · ${t('अभ्यास', 'Practise')}</small><b>${t('उस अनुच्छेद के सारे PYQ', 'Every PYQ from that paragraph')}</b><span>${t('हल के साथ वह NCERT लाइन जिस पर प्रश्न बना है।', 'With the NCERT lines each question is built on.')}</span></div>
          <div><small>03 · ${t('टेस्ट', 'Test')}</small><b>${t('NTA जैसी स्क्रीन पर', 'On an NTA-style screen')}</b><span>${t('फिर दोबारा पढ़ने वाले अनुच्छेदों की सूची।', 'Then a list of paragraphs to revise.')}</span></div>
        </section>
        ${ready.length ? `<h2 class="sec">${t('अभी तैयार', 'Ready now')}</h2><div class="chap-grid">${ready.map(({ s, c, ch }) => `<a class="chap ready" style="--sc:${colors[s.id]}" href="${ch.ready ? `#/c/${ch.id}` : `#/pyq/${ch.id}`}"><small>${esc(s.name)} · Class ${c.cls} · Ch ${ch.no}</small>${esc(ch.title)}<small>${[ch.ready ? `${ch.stats.nodes} nodes · ${ch.stats.questions} questions` : '', ch.pyq ? `${ch.pyq} MCQs (PYQs + NCERT)` : ''].filter(Boolean).join(' · ')}</small></a>`).join('')}</div>` : ''}
        ${cat.subjects.map(s => `<section class="subject" id="subj-${s.id}" style="--sc:${colors[s.id]}"><h2><span class="dot"></span>${esc(lang === 'hi' ? (hiName[s.id] || s.name) : s.name)}</h2>
          ${s.classes.map(c => `<div class="cls-label">${t('कक्षा', 'Class')} ${c.cls}</div><div class="chap-grid">
            ${c.chapters.map(ch => ch.ready
              ? `<a class="chap ready" href="#/c/${ch.id}"><small>Ch ${ch.no} · ${ch.stats.nodes} nodes · ${ch.stats.questions} Qs${ch.pyq ? ` · ${ch.pyq} MCQs` : ''}</small>${esc(ch.title)}</a>`
              : ch.pyq
              ? `<a class="chap ready" href="#/pyq/${ch.id}"><small>Ch ${ch.no} · ${ch.pyq} MCQs</small>${esc(ch.title)}</a>`
              : `<a class="chap soon"><small>Ch ${ch.no} · ${t('जल्द', 'coming soon')}</small>${esc(ch.title)}</a>`).join('')}
          </div>`).join('')}</section>`).join('')}
      </main>${footer()}`;
      app.querySelectorAll('[data-jump-home]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const el = document.getElementById(a.dataset.jumpHome); if (el) el.scrollIntoView({ behavior: 'smooth' }); }));
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

  // ---------- PYQs: past NEET + JEE Main questions in NCERT paragraph order ----------
  // Data: data/pyq/<chapter>.json (built from content/pyq by tools/build.py): `sections` in NCERT order,
  // the last one may be "multi" (questions that need 2+ paragraphs). Questions are MCQ (o, a) or
  // numerical (type "num", ans, tol). Content strings are our own trusted HTML, so they are inserted as HTML.
  function renderPYQ(chId, retryOnly) {
    document.body.dataset.subject = subjectOf(chId);
    const load = catalog ? Promise.resolve(catalog) : getJSON('data/catalog.json').then(c => (catalog = c));
    load.then(() => getJSON(`data/pyq/${chId}.json`)).then(P => {
      const all = []; P.sections.forEach(s => s.questions.forEach(q => all.push(q)));
      const paraTitle = {}; (P.paragraphs || []).forEach(p => { paraTitle[p.id] = p.title; });
      const years = [...new Set(all.map(q => q.year))].sort((a, b) => b - a);
      const pdf = page => `${P.ncertPdf}#page=${page - P.pdfPageOffset}`;
      const pages = pp => pp.length > 1 ? `pp. ${pp[0]}–${pp[pp.length - 1]}` : `p. ${pp[0]}`;
      const stateLabel = v => v === true ? `<span class="state ok">✓ ${t('सही', 'correct')}</span>` : v === false ? `<span class="state no">✗ ${t('गलत', 'wrong')}</span>` : '<span class="state"></span>';
      const stat = () => { const done = all.filter(q => progress[q.id] !== undefined).length, ok = all.filter(q => progress[q.id] === true).length; return t(`${all.length} में से ${done} किए · ${ok} सही`, `${done}/${all.length} attempted · ${ok} correct`); };
      const ansText = q => q.type === 'num' ? `<b>${t('उत्तर', 'Answer')}: ${q.ans}</b>${q.unit ? ' ' + q.unit : ''}` : `<b>${t('उत्तर', 'Answer')}: (${q.a + 1})</b> ${q.o[q.a]}`;
      const excerpts = q => `<div class="excerpts">${(q.ncert || []).map(x => `<figure class="excerpt"><img src="assets/ncert/${chId}/${x.img}.webp" alt="NCERT excerpt, ${esc(x.label)}" loading="lazy"><figcaption><span>NCERT · ${esc(x.label)}</span><a href="${pdf(x.page)}" target="_blank" rel="noopener">${t('पृष्ठ', 'Open page')} ${x.page} ↗</a></figcaption></figure>`).join('')}</div>`;

      // Recent-trend markers per paragraph section, from PYQs only (NEET / JEE Main with a year).
      // tools/build.py writes per-paragraph counts (P.trends) using the latest NEET year across all content;
      // the in-browser count below is the fallback for data built without them.
      const neetYears = all.filter(q => q.exam === 'NEET' && q.year).map(q => +q.year);
      const latest = P.latestNeet || (neetYears.length ? Math.max(...neetYears) : 0);
      const trend = sec => {
        const T = (P.trends || {})[sec.sec];
        if (P.trends) return T ? { neet: T.neet, last: T.last || 0, jee: T.jee, recent: !!T.recent } : { neet: 0, last: 0, jee: 0, recent: false };
        const qs = sec.questions, ny = qs.filter(q => q.exam === 'NEET' && q.year).map(q => +q.year), jee = qs.filter(q => q.exam === 'JEE Main').length;
        const last = ny.length ? Math.max(...ny) : 0;
        return { neet: ny.length, last, jee, recent: !!last && last >= latest - 2 };
      };
      const trendChips = tr => `<div class="trend">${tr.neet ? `<span class="chip neet">${t(`NEET में ${tr.neet} बार · आख़िरी ${tr.last}`, `NEET ${tr.neet}× · last ${tr.last}`)}</span>` : `<span class="chip never">${t('NEET में अभी तक नहीं', 'Not in NEET yet')}</span>`}${tr.recent ? `<span class="chip recent">${t('पिछले 3 साल में पूछा गया', 'Asked in the last 3 years')}</span>` : ''}${tr.jee ? `<span class="chip">JEE Main ${tr.jee}×</span>` : ''}</div>`;

      // Personal weak-paragraph list: paragraphs with a wrong or unattempted question (from the progress store).
      const weak = () => {
        const wrong = [], untried = [];
        P.sections.filter(s => s.sec !== 'multi').forEach(s => {
          const w = s.questions.filter(q => progress[q.id] === false).length;
          if (w) wrong.push({ s, w }); else if (s.questions.some(q => progress[q.id] === undefined)) untried.push(s);
        });
        return { wrong, untried };
      };
      const reviseBox = () => {
        if (!all.some(q => progress[q.id] !== undefined)) return '';
        const W = weak();
        if (!W.wrong.length && !W.untried.length) return `<div class="revise"><b>${t('सब अनुच्छेद पूरे!', 'All paragraphs done!')}</b></div>`;
        return `<div class="revise"><b>${t('ये दोबारा पढ़ें', 'Revise these')}</b>
          ${W.wrong.slice(0, 6).map(x => `<a href="#/pyq/${chId}" data-jump="s-${x.s.sec}">§${esc(x.s.sec.replace(/[a-d]$/, ''))} ${esc(x.s.title)} · ${x.w} ${t('गलत', 'wrong')}</a>`).join('')}
          ${W.untried.length ? `<p>${t(`${W.untried.length} अनुच्छेद अभी बाकी`, `${W.untried.length} paragraphs not tried yet`)}</p>` : ''}
          <button class="btn saffron" type="button" data-act="retry">${t('सिर्फ़ ये प्रश्न करें', 'Retry only these')}</button></div>`;
      };
      // Retry set: wrong questions plus untried ones in the same paragraphs; if nothing is wrong yet, the untried ones.
      const weakIds = (() => {
        const ids = new Set();
        P.sections.forEach(s => { if (s.questions.some(q => progress[q.id] === false)) s.questions.forEach(q => { if (progress[q.id] !== true) ids.add(q.id); }); });
        if (!ids.size) all.forEach(q => { if (progress[q.id] === undefined) ids.add(q.id); });
        return ids;
      })();
      const isWeakQ = q => weakIds.has(q.id);

      const card = (q, n, multi) => `<article class="pyq" id="${q.id}" data-year="${q.year}" data-exam="${esc(q.exam)}">
          <div class="pyq-head"><span class="qn">Q${n}</span><span class="year ${({ 'NEET': 'neet', 'JEE Main': 'jee', 'NCERT Exercise': 'ncert', 'NCERT Exemplar': 'exemplar', 'Practice': 'practice' })[q.exam] || ''}">${esc(q.exam)}${q.year ? ' ' + q.year : ''}</span>${q.when ? `<span class="when">${esc(q.when)}</span>` : (!q.year && q.srcRef ? `<span class="when">${esc(q.srcRef)}</span>` : '')}${q.type === 'num' ? `<span class="tag num">${t('संख्यात्मक', 'numerical')}</span>` : ''}${(q.otherChapters || []).length ? `<span class="tag" title="${esc(q.otherChapters.join(', '))}">+ ${t('दूसरा अध्याय', 'other chapter')}</span>` : ''}${retryOnly ? '<span class="state"></span>' : stateLabel(progress[q.id])}</div>
          ${multi ? `<div class="paras">${q.paras.map(id => `<a href="#/pyq/${chId}" data-jump="s-${id}" class="para">§${id.replace(/[a-d]$/, '')} ${esc(paraTitle[id] || '')}</a>`).join('')}${(q.otherChapters || []).map(c => `<span class="para other">${esc(c)}</span>`).join('')}</div>` : ''}
          <div class="qtext">${q.q}</div>
          ${q.type === 'num'
            ? `<form class="numans"><label>${t('आपका उत्तर', 'Your answer')} <input type="text" inputmode="decimal" autocomplete="off" aria-label="${t('संख्यात्मक उत्तर', 'Numerical answer')}"></label><button class="btn" type="submit">${t('जाँचें', 'Check')}</button></form>`
            : `<div class="opts">${q.o.map((o, k) => `<button class="opt" data-k="${k}"><b>(${k + 1})</b><span>${o}</span></button>`).join('')}</div>`}
          <div class="pyq-actions"><button class="btn ghost" data-act="hint">${t('संकेत + NCERT', 'Hint + NCERT')}</button><button class="btn ghost" data-act="ans">${t('उत्तर देखें', 'Show answer')}</button></div>
          <div class="reveal hint" hidden><p class="hint-text"><b>${t('संकेत', 'Hint')}:</b> ${q.hint}</p></div>
          <div class="reveal answer" hidden>
            <p class="ans-line">${ansText(q)}</p>
            ${q.check ? `<p class="check">✔ ${esc(q.check)}</p>` : ''}
            <div class="sol">${q.sol}</div>
            ${q.trap ? `<p class="trap"><b>${t('ट्रैप', 'Trap')}:</b> ${q.trap}</p>` : ''}
            ${q.also ? `<p class="also">${esc(q.also)}</p>` : ''}
          </div>
          ${(q.ncert || []).length ? `<div class="reveal ncert" hidden><h4>${t('NCERT में यह कहाँ है', 'Where NCERT says it')}</h4>${excerpts(q)}</div>` : ''}
        </article>`;
      let n = 0;
      const exams = Object.entries(P.counts || {}).filter(([, c]) => c);
      const sections = P.sections.map(s => ({ s, qs: retryOnly ? s.questions.filter(isWeakQ) : s.questions })).filter(x => !retryOnly || x.qs.length);
      const side = `<aside class="pyq-side" aria-label="${t('अनुच्छेद', 'Paragraphs')}"><div class="head"><span>${t('अनुच्छेद', 'PARAGRAPH')}</span><span>NEET</span></div>
          <nav class="plist">${P.sections.map(s => { const tr = trend(s); return `<a class="p${s.sec === 'multi' ? '' : tr.neet ? '' : ' none'}" href="#/pyq/${chId}" data-jump="s-${s.sec}" data-sec="s-${s.sec}"><span class="t"><b>${s.sec === 'multi' ? '✱' : '§' + esc(s.sec.replace(/[a-d]$/, ''))}</b> <span class="tt">${esc(s.title)}</span></span><span class="n${tr.recent ? ' recent' : ''}">${s.sec === 'multi' ? s.questions.length : (tr.neet || '–')}${tr.recent ? ' · ' + t('नया', 'new') : ''}</span></a>`; }).join('')}</nav>
          <div id="revise-slot">${reviseBox()}</div></aside>`;
      app.innerHTML = topbar({ id: chId }, 'pyq') + `<main class="pyq-page"><div class="pyq-layout">${side}<div class="pyq-main">
        <section class="pyq-intro"><p class="kicker">${t('NCERT के क्रम में हर अनुच्छेद, उसके प्रश्नों के साथ', 'NCERT in MCQs · every paragraph, in book order')}</p><h1>${esc(P.title)}</h1>
          <p class="ref">${esc(P.ref)} · ${all.length} ${t('प्रश्न', 'questions')} (${exams.map(([e, c]) => `${c} ${esc(e)}`).join(', ')}) · ${esc(P.years)}</p>
          ${lang === 'hi' ? '<p class="muted">प्रश्नों का हिंदी पाठ जल्द जुड़ेगा; अभी प्रश्न English में हैं।</p>' : ''}
          <p class="muted">${t('हर अनुच्छेद पर कम से कम एक प्रश्न है। जहाँ NEET या JEE Main ने पूछा है, वे प्रश्न पहले हैं; बाकी अनुच्छेदों पर NCERT अभ्यास, Exemplar या हमारे अभ्यास प्रश्न। एक से ज़्यादा अनुच्छेद वाले प्रश्न अंत में <b>Multiple concepts</b> में हैं। पहले खुद हल करें: <b>संकेत + NCERT</b> वह NCERT लाइन दिखाता है जिस पर प्रश्न बना है, <b>उत्तर देखें</b> पूरा हल।', 'Every NCERT paragraph of this chapter has at least one question. Where NEET or JEE Main has asked about a paragraph, those previous-year questions come first; paragraphs not asked yet get one or two questions from NCERT exercises, NCERT Exemplar or our own practice set, so no part of the book is skipped. Questions needing more than one paragraph are under <b>Multiple concepts</b> at the end. Try each question first: <b>Hint + NCERT</b> shows the textbook lines it is built on, <b>Show answer</b> gives the worked solution.')}</p>
          ${retryOnly ? `<div class="retry-bar"><span>${t('सिर्फ़ गलत और बाकी प्रश्न दिख रहे हैं', 'Showing only wrong and untried questions')}</span><button class="btn ghost" type="button" data-act="showall">${t('सारे प्रश्न दिखाएँ', 'Show all questions')}</button></div>` : ''}
          <div class="pyq-tools"><span class="stat" id="pyqstat">${stat()}</span>
            <span class="filters"><label>${t('परीक्षा', 'Exam')} <select id="examsel"><option value="">${t('सभी', 'Both')}</option>${exams.map(([e]) => `<option>${esc(e)}</option>`).join('')}</select></label>
            <label>${t('वर्ष', 'Year')} <select id="yearsel"><option value="">${t('सभी वर्ष', 'All years')}</option>${years.map(y => `<option>${y}</option>`).join('')}</select></label></span></div>
        </section>
        ${sections.map(({ s, qs }) => `<section class="pyq-sec${s.sec === 'multi' ? ' multi' : ''}" id="s-${s.sec}"><h2>${s.sec === 'multi' ? '<span>✱</span>' : `<span>§${s.sec.replace(/[a-d]$/, '')}</span>`} ${esc(s.title)}</h2>
          ${s.sec === 'multi' ? `<p class="sec-ref">${esc(P.multiRule || '')}</p>` : `${trendChips(trend(s))}<p class="sec-ref">NCERT ${pages(s.pages)} · <a href="${pdf(s.pages[0])}" target="_blank" rel="noopener">${t('NCERT में पढ़ें', 'read in NCERT')} ↗</a></p>`}
          ${qs.map(q => card(q, ++n, s.sec === 'multi')).join('')}</section>`).join('')}
        ${!retryOnly && (P.empty || []).length ? `<section class="pyq-sec empty-paras"><h2>${t('अभी तक नहीं पूछे गए', 'Not asked yet')}</h2><p class="sec-ref">${t('इन वर्षों में NEET या JEE Main का कोई प्रश्न सिर्फ़ इन अनुच्छेदों पर नहीं आया। इन्हें NCERT में पढ़ें; ये भी पूछे जा सकते हैं।', 'No NEET or JEE Main question in these years tests these paragraphs on its own. Read them in NCERT; they can still be asked.')}</p>
          <ul>${P.empty.map(p => `<li><a href="${pdf(p.pages[0])}" target="_blank" rel="noopener">§${esc(p.id.replace(/[a-d]$/, ''))} ${esc(p.title)}</a> <small>${pages(p.pages)}</small></li>`).join('')}</ul></section>` : ''}
        <p class="pyq-note">${esc(P.note)}</p>
      </div></div></main>${footer()}`;

      const bindJumps = root => root.querySelectorAll('[data-jump]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth' }); }));
      const bindRetry = root => { const b = root.querySelector('[data-act="retry"]'); if (b) b.addEventListener('click', () => renderPYQ(chId, true)); };
      bindJumps(app); bindRetry(app);
      const sa = app.querySelector('[data-act="showall"]'); if (sa) sa.addEventListener('click', () => renderPYQ(chId));
      const refreshRevise = () => { const slot = app.querySelector('#revise-slot'); if (!slot) return; slot.innerHTML = reviseBox(); bindJumps(slot); bindRetry(slot); };
      const filter = () => {
        const y = app.querySelector('#yearsel').value, ex = app.querySelector('#examsel').value;
        app.querySelectorAll('.pyq').forEach(c => { c.hidden = (!!y && c.dataset.year !== y) || (!!ex && c.dataset.exam !== ex); });
        app.querySelectorAll('.pyq-sec:not(.empty-paras)').forEach(s => { s.hidden = ![...s.querySelectorAll('.pyq')].some(c => !c.hidden); });
      };
      app.querySelector('#yearsel').addEventListener('change', filter);
      app.querySelector('#examsel').addEventListener('change', filter);
      app.querySelectorAll('.pyq').forEach(c => {
        const q = all.find(x => x.id === c.id);
        const open = sel => { const el = c.querySelector(sel); if (el) el.hidden = false; };
        const record = ok => {
          // First attempt counts; in "retry only these" mode the new attempt replaces the old one.
          if (progress[q.id] === undefined || retryOnly) { progress[q.id] = ok; saveProgress(); }
          c.querySelector('.state').outerHTML = stateLabel(ok);
          c.querySelector('.ans-line').insertAdjacentHTML('afterbegin', `<span class="verdict ${ok ? 'ok' : 'no'}">${ok ? t('सही।', 'Correct.') : t('सही नहीं।', 'Not quite.')}</span> `);
          open('.answer'); open('.ncert');
          app.querySelector('#pyqstat').textContent = stat();
          refreshRevise();
        };
        c.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
          const k = +b.dataset.k;
          c.querySelectorAll('.opt').forEach(x => { const j = +x.dataset.k; x.disabled = true; if (j === q.a) x.classList.add('right'); else if (j === k) x.classList.add('wrong'); });
          record(k === q.a);
        }));
        const f = c.querySelector('.numans');
        if (f) f.addEventListener('submit', e => {
          e.preventDefault();
          const inp = f.querySelector('input'), v = parseFloat(inp.value.replace(',', '.'));
          if (!isFinite(v)) { inp.focus(); return; }
          const ok = Math.abs(v - q.ans) <= (q.tol != null ? q.tol : Math.max(0.01, Math.abs(q.ans) * 0.01));
          inp.disabled = true; f.querySelector('button').disabled = true; f.classList.add(ok ? 'right' : 'wrong');
          record(ok);
        });
        c.querySelector('[data-act="hint"]').addEventListener('click', () => { open('.hint'); open('.ncert'); });
        c.querySelector('[data-act="ans"]').addEventListener('click', () => { c.querySelectorAll('.opt').forEach(x => { if (+x.dataset.k === q.a) x.classList.add('right'); }); open('.answer'); open('.ncert'); });
      });
      if ('IntersectionObserver' in window) {
        const links = {}; app.querySelectorAll('.plist a.p').forEach(a => { links[a.dataset.sec] = a; });
        const io = new IntersectionObserver(es => es.forEach(e => {
          if (!e.isIntersecting || !links[e.target.id]) return;
          Object.values(links).forEach(a => a.classList.remove('cur'));
          links[e.target.id].classList.add('cur');
        }), { rootMargin: '-80px 0px -70% 0px' });
        app.querySelectorAll('.pyq-sec[id]').forEach(sec => io.observe(sec));
      }
      if (retryOnly) window.scrollTo(0, 0);
    }).catch(err);
  }

  function footer() {
    return `<footer>${t('सार, हल, प्रश्न और चित्र NCERT पाठ्यक्रम पर आधारित हमारी अपनी अध्ययन सामग्री हैं। NCERT पुस्तकें © NCERT: हम केवल छोटे अंश पेज नंबर के श्रेय के साथ दिखाते हैं और पूरी पुस्तक का लिंक देते हैं। मुफ़्त पढ़ें:', 'Synopses, solutions, questions and diagrams are original study material based on the NCERT syllabus. NCERT textbooks are © NCERT: we show only short excerpts for reference, each credited with its page, and link to the full book. Read it free at')} <a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener">ncert.nic.in</a>.</footer>`;
  }
  function err(e) { console.error(e); app.innerHTML = topbar(null) + `<main><p class="empty">Could not load this page. ${esc(e.message || '')}</p></main>`; }

  route();
})();
