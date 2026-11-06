/* Redrawn, original diagrams (not copied from NCERT). Each entry: { svg, caption }. */
window.DIAGRAMS = (function () {
  const A = 'var(--accent)', I = '#1d2433', M = '#5b6474', S = '#e6f2f0';
  const font = 'font-family="system-ui,sans-serif"';
  const arrow = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${I}"/></marker><marker id="aha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${A}"/></marker></defs>`;
  const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" ${font} font-size="12">${arrow}${body}</svg>`;
  const beaker = (x, y, lid, insulated) => `
    ${insulated ? `<rect x="${x - 8}" y="${y - 6}" width="76" height="86" rx="10" fill="none" stroke="${M}" stroke-width="6" stroke-dasharray="2 3"/>` : ''}
    <path d="M${x},${y} v66 a6,6 0 0 0 6,6 h48 a6,6 0 0 0 6,-6 v-66" fill="none" stroke="${I}" stroke-width="2"/>
    <rect x="${x + 2}" y="${y + 34}" width="56" height="36" rx="4" fill="${S}"/>
    ${lid ? `<rect x="${x - 4}" y="${y - 4}" width="68" height="6" rx="2" fill="${I}"/>` : ''}`;
  return {
    'system-surroundings': { caption: 'System (reaction mixture) inside its surroundings (the room)', svg: svg(320, 170, `
      <rect x="10" y="10" width="300" height="150" rx="14" fill="#faf8f3" stroke="${M}" stroke-dasharray="6 5"/>
      <text x="22" y="30" fill="${M}">Surroundings (room)</text>
      ${beaker(130, 50, false, false)}
      <text x="160" y="105" text-anchor="middle" fill="${I}" font-weight="600">A + B</text>
      <text x="160" y="140" text-anchor="middle" fill="${A}" font-weight="700">System</text>
      <text x="245" y="70" fill="${M}">boundary</text><path d="M243,66 L196,74" stroke="${M}" marker-end="url(#ah)"/>`) },

    'system-types': { caption: 'What can cross the boundary? Matter (blue dots) and energy (arrows)', svg: svg(390, 190, `
      ${[['Open', 10, false, false, true, true], ['Closed', 140, true, false, false, true], ['Isolated', 270, true, true, false, false]].map(([t, x, lid, ins, mat, en]) => `
        ${beaker(x + 20, 50, lid, ins)}
        <text x="${x + 50}" y="172" text-anchor="middle" font-weight="700" fill="${I}">${t}</text>
        <text x="${x + 50}" y="187" text-anchor="middle" fill="${M}" font-size="10.5">${mat ? 'matter ✔ energy ✔' : en ? 'matter ✘ energy ✔' : 'matter ✘ energy ✘'}</text>
        ${mat ? `<circle cx="${x + 38}" cy="30" r="3.5" fill="#2563eb"/><circle cx="${x + 52}" cy="20" r="3.5" fill="#2563eb"/><circle cx="${x + 64}" cy="34" r="3.5" fill="#2563eb"/>` : ''}
        ${en ? `<path d="M${x + 86},96 h26" stroke="${A}" stroke-width="2" marker-end="url(#aha)"/><path d="M${x + 112},110 h-26" stroke="${A}" stroke-width="2" marker-end="url(#aha)"/>` : ''}`).join('')}`) },

    'adiabatic': { caption: 'Adiabatic wall: no heat crosses (q = 0); work can still be done', svg: svg(300, 170, `
      ${beaker(110, 50, true, true)}
      <line x1="140" y1="20" x2="140" y2="100" stroke="${I}" stroke-width="2"/><path d="M128,100 h24 M128,92 h24" stroke="${I}" stroke-width="3"/>
      <text x="140" y="14" text-anchor="middle" fill="${A}" font-weight="600">work (paddle) → ΔU = w_ad</text>
      <text x="40" y="95" fill="${M}">insulation</text><text x="210" y="95" fill="${M}">q = 0</text>`) },

    'diathermic': { caption: 'Conducting (copper) wall in a hot reservoir: heat flows in, ΔU = q', svg: svg(300, 170, `
      <rect x="40" y="20" width="220" height="140" rx="12" fill="#fff1e6" stroke="#f59e0b"/>
      <text x="52" y="38" fill="#b45309">Reservoir at T_B</text>
      ${beaker(120, 55, true, false)}
      <text x="150" y="122" text-anchor="middle" fill="${I}">T_A</text>
      <path d="M72,100 h40" stroke="${A}" stroke-width="2.5" marker-end="url(#aha)"/><path d="M228,100 h-40" stroke="${A}" stroke-width="2.5" marker-end="url(#aha)"/>
      <text x="92" y="92" text-anchor="middle" fill="${A}">q</text><text x="208" y="92" text-anchor="middle" fill="${A}">q</text>`) },

    'pv-single': { caption: 'Single-step compression at constant p_ex: work = shaded rectangle', svg: svg(300, 190, `
      <path d="M40,160 H280 M40,160 V15" stroke="${I}" stroke-width="1.6" marker-end="url(#ah)"/>
      <text x="282" y="175" fill="${M}">V</text><text x="28" y="18" fill="${M}">p</text>
      <rect x="80" y="60" width="150" height="100" fill="${S}" stroke="${A}"/>
      <path d="M230,140 Q150,120 80,60" fill="none" stroke="${M}" stroke-dasharray="4 4"/>
      <text x="155" y="54" text-anchor="middle" fill="${A}" font-weight="600">p_ex</text>
      <text x="80" y="176" text-anchor="middle" fill="${I}">V_f</text><text x="230" y="176" text-anchor="middle" fill="${I}">V_i</text>
      <text x="155" y="148" text-anchor="middle" fill="${I}" font-weight="700">w = −p_ex(V_f − V_i)</text>`) },

    'pv-steps': { caption: 'Finite steps (staircase) vs reversible (smooth curve): reversible compression needs the least work', svg: svg(320, 200, `
      <path d="M40,170 H300 M40,170 V15" stroke="${I}" stroke-width="1.6" marker-end="url(#ah)"/>
      <text x="302" y="185" fill="${M}">V</text><text x="28" y="18" fill="${M}">p</text>
      <path d="M260,150 Q140,140 80,40" fill="none" stroke="${A}" stroke-width="2.5"/>
      <path d="M260,150 V118 H180 V82 H120 V40 H80" fill="none" stroke="${I}" stroke-width="1.6" stroke-dasharray="5 3"/>
      <path d="M80,40 Q140,140 260,150 V170 H80 Z" fill="${S}" opacity=".7"/>
      <text x="200" y="160" fill="${A}" font-weight="600">reversible</text><text x="186" y="112" fill="${I}">multi-step</text>
      <text x="80" y="186" text-anchor="middle">V_f</text><text x="260" y="186" text-anchor="middle">V_i</text>`) },

    'partition': { caption: 'Halving the gas: V becomes V/2 (extensive) but T stays T (intensive)', svg: svg(320, 140, `
      <rect x="20" y="30" width="120" height="80" rx="8" fill="${S}" stroke="${I}"/><text x="80" y="75" text-anchor="middle" font-weight="600">V, T</text>
      <path d="M150,70 h30" stroke="${I}" stroke-width="2" marker-end="url(#ah)"/>
      <rect x="190" y="30" width="120" height="80" rx="8" fill="${S}" stroke="${I}"/><line x1="250" y1="30" x2="250" y2="110" stroke="${A}" stroke-width="3"/>
      <text x="220" y="75" text-anchor="middle" font-weight="600">V/2, T</text><text x="280" y="75" text-anchor="middle" font-weight="600">V/2, T</text>
      <text x="160" y="130" text-anchor="middle" fill="${M}">extensive: V, U, H, C · intensive: T, p, density</text>`) },

    'bomb': { caption: 'Bomb calorimeter: sealed steel bomb (ΔV = 0) in a water bath, measures q_V = ΔU', svg: svg(320, 200, `
      <rect x="40" y="40" width="220" height="140" rx="10" fill="#eaf3ff" stroke="${I}"/><text x="50" y="58" fill="${M}">water bath</text>
      <rect x="105" y="80" width="90" height="80" rx="12" fill="#d7dbe2" stroke="${I}" stroke-width="2"/><text x="150" y="125" text-anchor="middle" font-weight="700">bomb</text>
      <text x="150" y="142" text-anchor="middle" fill="${M}">sample + O₂</text>
      <line x1="225" y1="14" x2="225" y2="150" stroke="${I}" stroke-width="2"/><circle cx="225" cy="155" r="6" fill="#ef4444"/><text x="232" y="22" fill="${M}">thermometer</text>
      <line x1="70" y1="20" x2="70" y2="150" stroke="${I}"/><path d="M60,150 h20" stroke="${I}" stroke-width="3"/><text x="40" y="16" fill="${M}">stirrer</text>`) },

    'hess': { caption: 'Hess’s law: direct route = sum of the indirect route', svg: svg(360, 250, `
      <text x="30" y="40" font-weight="700" font-size="14">C(s) + O₂</text><text x="265" y="40" font-weight="700" font-size="14">CO₂(g)</text>
      <text x="180" y="185" text-anchor="middle" font-weight="700" font-size="14">CO(g) + ½O₂</text>
      <path d="M110,35 H255" stroke="${A}" stroke-width="2.5" marker-end="url(#aha)"/><text x="182" y="26" text-anchor="middle" fill="${A}" font-weight="700">ΔH = −393.5</text>
      <path d="M70,50 L150,165" stroke="${I}" stroke-width="2" marker-end="url(#ah)"/><text x="60" y="118" text-anchor="end" fill="${I}" font-weight="600">ΔH₁ = ?</text>
      <path d="M215,165 L290,50" stroke="${I}" stroke-width="2" marker-end="url(#ah)"/><text x="268" y="118" fill="${I}" font-weight="600">ΔH₂ = −283.0</text>
      <text x="180" y="220" text-anchor="middle" fill="${M}">ΔH₁ + ΔH₂ = −393.5  ⟹  ΔH₁ = −393.5 − (−283.0)</text><text x="180" y="240" text-anchor="middle" fill="${A}" font-weight="700">ΔH₁ = −110.5 kJ mol⁻¹</text>`) },

    'born-haber': { caption: 'Born–Haber cycle for NaCl (kJ mol⁻¹): the sum round the cycle is zero', svg: svg(470, 275, `
      <line x1="20" y1="40" x2="250" y2="40" stroke="${I}" stroke-width="2"/><text x="24" y="33" font-weight="600">Na⁺(g) + e⁻ + Cl(g)</text>
      <line x1="320" y1="100" x2="460" y2="100" stroke="${I}" stroke-width="2"/><text x="324" y="118" font-weight="600">Na⁺(g) + Cl⁻(g)</text>
      <line x1="20" y1="115" x2="250" y2="115" stroke="${I}" stroke-width="2"/><text x="24" y="108" font-weight="600">Na(g) + Cl(g)</text>
      <line x1="20" y1="165" x2="250" y2="165" stroke="${I}" stroke-width="2"/><text x="24" y="158" font-weight="600">Na(g) + ½Cl₂(g)</text>
      <line x1="20" y1="212" x2="250" y2="212" stroke="${I}" stroke-width="2"/><text x="24" y="205" font-weight="600">Na(s) + ½Cl₂(g)</text>
      <line x1="320" y1="255" x2="460" y2="255" stroke="${I}" stroke-width="2"/><text x="340" y="271" font-weight="600">NaCl(s)</text>
      <path d="M170,212 V168" stroke="${A}" stroke-width="2" marker-end="url(#aha)"/><text x="176" y="194" fill="${A}">+108.4 sublimation</text>
      <path d="M170,165 V118" stroke="${A}" stroke-width="2" marker-end="url(#aha)"/><text x="176" y="145" fill="${A}">+121 (½ bond)</text>
      <path d="M170,115 V43" stroke="${A}" stroke-width="2" marker-end="url(#aha)"/><text x="176" y="82" fill="${A}">+496 ionization</text>
      <path d="M252,42 L322,97" stroke="${A}" stroke-width="2" marker-end="url(#aha)"/><text x="292" y="58" fill="${A}">−348.6 e⁻ gain</text>
      <path d="M120,214 L328,253" stroke="${I}" stroke-width="2" marker-end="url(#ah)"/><text x="150" y="250" fill="${I}">ΔfH = −411.2</text>
      <path d="M440,253 V104" stroke="#b91c1c" stroke-width="2.5" marker-end="url(#ah)"/><text x="432" y="170" text-anchor="end" fill="#b91c1c" font-weight="700">lattice</text><text x="432" y="186" text-anchor="end" fill="#b91c1c" font-weight="700">+788</text>`) },

    'exo-endo': { caption: 'Enthalpy diagrams: exothermic (products lower) vs endothermic (products higher)', svg: svg(340, 180, `
      <text x="80" y="18" text-anchor="middle" font-weight="700">Exothermic</text><text x="255" y="18" text-anchor="middle" font-weight="700">Endothermic</text>
      <path d="M20,165 V30" stroke="${I}" marker-end="url(#ah)"/><text x="8" y="40" fill="${M}">H</text>
      <line x1="30" y1="60" x2="80" y2="60" stroke="${I}" stroke-width="2.5"/><text x="34" y="54">Reactants</text>
      <line x1="90" y1="140" x2="145" y2="140" stroke="${I}" stroke-width="2.5"/><text x="92" y="157">Products</text>
      <path d="M85,62 V136" stroke="${A}" stroke-width="2" marker-end="url(#aha)"/><text x="92" y="102" fill="${A}" font-weight="700">ΔH &lt; 0</text>
      <path d="M195,165 V30" stroke="${I}" marker-end="url(#ah)"/>
      <line x1="205" y1="140" x2="255" y2="140" stroke="${I}" stroke-width="2.5"/><text x="207" y="157">Reactants</text>
      <line x1="265" y1="60" x2="325" y2="60" stroke="${I}" stroke-width="2.5"/><text x="268" y="54">Products</text>
      <path d="M260,138 V64" stroke="#b91c1c" stroke-width="2" marker-end="url(#ah)"/><text x="266" y="102" fill="#b91c1c" font-weight="700">ΔH &gt; 0</text>`) },

    'diffusion': { caption: 'Remove the partition: gases A and B mix spontaneously (ΔH = 0, ΔS > 0)', svg: svg(340, 130, (function () {
      let s = `<rect x="10" y="20" width="140" height="80" rx="8" fill="none" stroke="${I}"/><line x1="80" y1="20" x2="80" y2="100" stroke="${A}" stroke-width="3"/>
        <rect x="190" y="20" width="140" height="80" rx="8" fill="none" stroke="${I}"/><path d="M155,60 h28" stroke="${I}" stroke-width="2" marker-end="url(#ah)"/>
        <text x="80" y="122" text-anchor="middle" fill="${M}">(a) separated</text><text x="260" y="122" text-anchor="middle" fill="${M}">(b) mixed: more random</text>`;
      const pts = [[22, 34], [44, 52], [30, 76], [60, 40], [62, 86], [40, 92], [70, 64], [20, 58]];
      pts.forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="4" fill="${I}"/><circle cx="${x + 70}" cy="${y}" r="4" fill="#fff" stroke="${I}"/>`; });
      pts.forEach(([x, y], i) => { const dx = 180 + ((i * 37) % 130), dy = 30 + ((i * 23) % 62), ex = 200 + ((i * 53) % 120), ey = 32 + ((i * 41) % 60);
        s += `<circle cx="${dx + 12}" cy="${dy}" r="4" fill="${I}"/><circle cx="${ex}" cy="${ey + 4}" r="4" fill="#fff" stroke="${I}"/>`; });
      return s; })()) }
  };
})();
