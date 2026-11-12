/* ---------- IT Ch4 · Fig 4.1: binary channels and their capacity ---------- */
function itMI(px, M) { /* mutual information in bits for input pmf px and emission matrix M (rows = inputs) */
  const ny = M[0].length, py = new Array(ny).fill(0);
  px.forEach((p, x) => M[x].forEach((m, y) => { py[y] += p * m; }));
  let I = 0; px.forEach((p, x) => M[x].forEach((m, y) => { if (p > 0 && m > 0) I += p * m * itLog2(m / py[y]); }));
  return I;
}
reg('it-ch4', 'channels', function () {
  const svg = $('#it-ch-svg'); if (!svg) return;
  const sq = $('#it-ch-q'), sp = $('#it-ch-pi'), out = $('#it-ch-out'), g = el('g', {}, svg);
  const CH = {
    'symmetric (BSC)': { ys: ['0', '1'], M: q => [[1 - q, q], [q, 1 - q]], C: q => 1 - itBin(q), f: 'C = 1 − H(q)' },
    'erasure (BEC)': { ys: ['0', 'e', '1'], M: q => [[1 - q, q, 0], [0, q, 1 - q]], C: q => 1 - q, f: 'C = 1 − q' },
    'Z-channel': { ys: ['0', '1'], M: q => [[1, 0], [q, 1 - q]], C: null, f: 'no simple formula; computed numerically' }
  };
  let cur = 'symmetric (BSC)';
  const L = 380, R = 690, B = 250, T = 30, X = p => L + p * (R - L), Y = v => B - v * (B - T);
  function render() {
    const q = +sq.value, pi = +sp.value; $('#it-ch-qv').textContent = q.toFixed(2); $('#it-ch-piv').textContent = pi.toFixed(2);
    clear(g); const ch = CH[cur], M = ch.M(q);
    /* channel diagram */
    const xs = [[90, 90], [90, 210]], ny = ch.ys.length, ys = ch.ys.map((_, j) => [270, ny === 3 ? 70 + j * 80 : 90 + j * 120]);
    M.forEach((row, x) => row.forEach((m, y) => {
      if (m <= 0) return;
      const [x1, y1] = xs[x], [x2, y2] = ys[y];
      path('M' + (x1 + 18) + ' ' + y1 + 'L' + (x2 - 18) + ' ' + y2, x === 0 ? 's-blue' : 's-red', g, { 'stroke-width': .8 + m * 7, opacity: .75 });
      const mx = x1 + 18 + (x2 - x1 - 36) * (x === 0 ? .3 : .7), my = y1 + (y2 - y1) * (x === 0 ? .3 : .7);
      text(g, mx, my - 6, itFmt(m, 2), 'lbl', { 'text-anchor': 'middle', 'font-size': 11 });
    }));
    xs.forEach(([x, y], k) => { el('circle', { cx: x, cy: y, r: 17, class: 'f-paper s s-ink', 'stroke-width': 1.5 }, g); text(g, x, y + 5, String(k), 'lbl-ink lbl-serif', { 'text-anchor': 'middle', 'font-size': 16 }); text(g, x - 26, y + 4, 'P = ' + itFmt(k ? pi : 1 - pi, 2), 'lbl', { 'text-anchor': 'end', 'font-size': 11 }); });
    ys.forEach(([x, y], k) => { el('circle', { cx: x, cy: y, r: 17, class: 'f-paper s s-ink', 'stroke-width': 1.5 }, g); text(g, x, y + 5, ch.ys[k], 'lbl-ink lbl-serif', { 'text-anchor': 'middle', 'font-size': 16 }); });
    text(g, 90, 262, 'input X', 'lbl', { 'text-anchor': 'middle', 'font-size': 11.5 }); text(g, 270, 262, 'output Y', 'lbl', { 'text-anchor': 'middle', 'font-size': 11.5 });
    /* I(X;Y) against pi */
    axisLine(g, L, R, B, [0, .25, .5, .75, 1].map(p => [X(p), String(p)]), { dy: 16, fs: 11 });
    vAxis(g, L, B, T, [0, .25, .5, .75, 1].map(v => [Y(v), String(v)]));
    text(g, R, B + 32, 'π = P(X = 1)', 'lbl', { 'text-anchor': 'end', 'font-size': 11.5 }); text(g, L + 6, T - 10, 'I(X;Y), bits', 'lbl', { 'font-size': 11.5 });
    const pts = []; let best = 0, bp = 0;
    for (let k = 0; k <= 200; k++) { const p = k / 200, I = itMI([1 - p, p], M); pts.push([X(p), Y(I)]); if (I > best + 1e-12) { best = I; bp = p; } }
    path(poly(pts), 's-blue', g, { 'stroke-width': 2.4, fill: 'none' });
    path('M' + L + ' ' + Y(best) + 'H' + R, 's-ochre', g, { 'stroke-dasharray': '6 4', 'stroke-width': 1.3 });
    text(g, R - 4, Y(best) - 6, 'C = ' + itFmt(best), 'lbl-ochre', { 'text-anchor': 'end', 'font-size': 12 });
    const I = itMI([1 - pi, pi], M);
    el('circle', { cx: X(pi), cy: Y(I), r: 6, class: 'f-ochre' }, g);
    out.innerHTML = 'With π = ' + itFmt(pi, 2) + ': I(X;Y) = <b>' + itFmt(I) + '</b> bits per use. Capacity <b>' + itFmt(best) + '</b>, reached at π ≈ ' + itFmt(bp, 2) + ' (' + ch.f + ').' +
      (cur.startsWith('Z') && q > 0 && q < 1 ? ' The best input sends 1 less than half the time, since 1s are the ones that get damaged.' : '');
  }
  const bs = Object.keys(CH).map(n => { const b = document.createElement('button'); b.textContent = n; b.dataset.g = n; b.addEventListener('click', () => { cur = n; pressGroup(bs, n, 'data-g'); render(); }); $('#it-ch-btns').appendChild(b); return b; });
  pressGroup(bs, cur, 'data-g');
  sq.addEventListener('input', render); sp.addEventListener('input', render); render();
});

/* ---------- IT Ch4 · Fig 4.2: rate against error ---------- */
reg('it-ch4', 'rateerror', function () {
  const svg = $('#it-re-svg'); if (!svg) return;
  const sq = $('#it-re-q'), out = $('#it-re-out'), g = el('g', {}, svg);
  const L = 70, R = 560, B = 280, T = 20, LO = -12, X = r => L + r * (R - L), Y = e => { const l = Math.max(LO, Math.log10(Math.max(e, 1e-300))); return T + (0 - l) / (0 - LO) * (B - T); };
  const binom = (n, k) => Math.exp(itLogChoose(n, k) * 1);
  function tail(n, q, t) { /* P(more than t flips among n) */ let s = 0; for (let k = t + 1; k <= n; k++) s += binom(n, k) * Math.pow(q, k) * Math.pow(1 - q, n - k); return s; }
  function render() {
    const q = +sq.value, C = 1 - itBin(q); $('#it-re-qv').textContent = q.toFixed(3); clear(g);
    el('rect', { x: L, y: T, width: X(C) - L, height: B - T, class: 'f-ochrew' }, g);
    path('M' + X(C) + ' ' + T + 'V' + B, 's-ochre', g, { 'stroke-dasharray': '6 4', 'stroke-width': 1.6 });
    text(g, X(C) + 5, B - 10, 'C = ' + itFmt(C), 'lbl-ochre', { 'font-size': 12 });
    text(g, X(C) / 2 + L / 2, B - 10, 'achievable', 'lbl-ochre', { 'text-anchor': 'middle', 'font-size': 12, 'font-style': 'italic' });
    axisLine(g, L, R, B, [0, .2, .4, .6, .8, 1].map(r => [X(r), String(r)]), { dy: 16, fs: 11 });
    vAxis(g, L, B, T, [0, -2, -4, -6, -8, -10, -12].map(l => [Y(Math.pow(10, l)), l ? '10' + String(l).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]) : '1']));
    text(g, R, B + 32, 'rate (bits per channel use)', 'lbl', { 'text-anchor': 'end', 'font-size': 11.5 }); text(g, L + 6, T - 6, 'block error', 'lbl', { 'font-size': 11.5 });
    const rows = [];
    for (let n = 1; n <= 25; n += 2) { const e = n === 1 ? q : tail(n, q, (n - 1) / 2); rows.push(['rep. ' + n, 1 / n, e]); el('circle', { cx: X(1 / n), cy: Y(e), r: 5, class: 'f-blue' }, g); if (n <= 5) text(g, X(1 / n) + (n === 1 ? -8 : 7), Y(e) + (n === 1 ? -10 : -6), n === 1 ? 'uncoded' : 'repeat ×' + n, 'lbl-blue', { 'font-size': 10.5, 'text-anchor': n === 1 ? 'end' : 'start' }); }
    [[3, '[7,4]'], [4, '[15,11]'], [5, '[31,26]'], [6, '[63,57]']].forEach(([m, nm]) => {
      const n = (1 << m) - 1, k = n - m, e = tail(n, q, 1); rows.push(['Hamming ' + nm, k / n, e]);
      el('rect', { x: X(k / n) - 5, y: Y(e) - 5, width: 10, height: 10, class: 'f-red' }, g);
      text(g, X(k / n), Y(e) + 20 + (m % 2) * 13, nm, 'lbl-red', { 'font-size': 10.5, 'text-anchor': 'middle' });
    });
    const x0 = 600; text(g, x0, 200, 'repetition', 'lbl-blue', { 'font-size': 12 }); el('circle', { cx: x0 + 90, cy: 196, r: 5, class: 'f-blue' }, g);
    text(g, x0, 222, 'Hamming', 'lbl-red', { 'font-size': 12 }); el('rect', { x: x0 + 85, y: 213, width: 10, height: 10, class: 'f-red' }, g);
    const h = rows.find(r => r[0] === 'Hamming [7,4]'), r5 = rows.find(r => r[0] === 'rep. 5');
    out.innerHTML = 'q = ' + q.toFixed(3) + ': capacity <b>' + itFmt(C) + '</b>. Hamming [7,4]: rate 0.571, block error ' + h[2].toExponential(2) + '. Repeating 5 times: rate 0.2, error ' + r5[2].toExponential(2) + '. ' +
      'Every code here sits above the bottom of the plot; Shannon’s theorem promises codes at any rate below ' + itFmt(C) + ' with error below 10⁻¹² (and lower), for long enough blocks.';
  }
  sq.addEventListener('input', render); render();
});

/* ---------- IT Ch4 · Fig 4.3: Hamming [7,4] in a Venn diagram ---------- */
reg('it-ch4', 'hamming', function () {
  const svg = $('#it-hm-svg'); if (!svg) return;
  const out = $('#it-hm-out'), g = el('g', {}, svg), host = $('#it-hm-data');
  const H = [[1, 1, 0, 1, 1, 0, 0], [1, 0, 1, 1, 0, 1, 0], [0, 1, 1, 1, 0, 0, 1]];
  const names = ['d₁', 'd₂', 'd₃', 'd₄', 'p₁', 'p₂', 'p₃'];
  let d = [1, 0, 1, 1], flip = [0, 0, 0, 0, 0, 0, 0];
  const enc = d => [d[0], d[1], d[2], d[3], (d[0] + d[1] + d[3]) % 2, (d[0] + d[2] + d[3]) % 2, (d[1] + d[2] + d[3]) % 2];
  /* circle centres for rows of H: A (p1), B (p2), C (p3) */
  const CX = [[180, 130], [260, 130], [220, 200]], RR = 82;
  const POS = [[220, 115], [175, 185], [265, 185], [220, 155], [140, 100], [300, 100], [220, 255]]; /* d1 in A∩B, d2 in A∩C, d3 in B∩C, d4 centre */
  const btns = d.map((_, i) => { const b = document.createElement('button'); b.addEventListener('click', () => { d[i] ^= 1; render(); }); host.appendChild(b); return b; });
  function render() {
    clear(g);
    const w = enc(d), r = w.map((b, i) => b ^ flip[i]);
    const syn = H.map(row => row.reduce((s, h, i) => s + h * r[i], 0) % 2);
    let pos = -1; if (syn.some(Boolean)) pos = [0, 1, 2, 3, 4, 5, 6].find(i => H.every((row, k) => row[i] === syn[k]));
    const dec = r.slice(); if (pos >= 0) dec[pos] ^= 1;
    const ok = dec.slice(0, 4).every((b, i) => b === d[i]);
    CX.forEach(([cx, cy], k) => {
      el('circle', { cx, cy, r: RR, class: syn[k] ? 's s-red' : 's s-blue', fill: syn[k] ? 'var(--red-wash)' : 'var(--blue-wash)', 'fill-opacity': .45, 'stroke-width': syn[k] ? 2.6 : 1.5 }, g);
    });
    [['row 1 of H', 90, 40], ['row 2', 330, 40], ['row 3', 220, 305]].forEach(([s, x, y], k) => text(g, x, y, s + (syn[k] ? ': odd ✗' : ': even ✓'), syn[k] ? 'lbl-red' : 'lbl-blue', { 'text-anchor': 'middle', 'font-size': 12 }));
    POS.forEach(([x, y], i) => {
      const bad = flip[i];
      const c = el('circle', { cx: x, cy: y, r: 17, class: 'f-paper s ' + (bad ? 's-red' : 's-ink'), 'stroke-width': bad ? 2.8 : 1.4, tabindex: 0, role: 'button', 'aria-label': 'flip ' + names[i], style: 'cursor:pointer' }, g);
      text(g, x, y + 5, String(r[i]), (bad ? 'lbl-red' : 'lbl-ink') + ' lbl-serif', { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, 'pointer-events': 'none' });
      text(g, x + 18, y - 14, names[i], 'lbl', { 'font-size': 11, 'pointer-events': 'none' });
      if (i === pos) el('circle', { cx: x, cy: y, r: 23, class: 's s-ochre', fill: 'none', 'stroke-width': 2.4, 'stroke-dasharray': '4 3', 'pointer-events': 'none' }, g);
      const hit = () => { flip[i] ^= 1; render(); };
      c.addEventListener('click', hit); c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(); } });
    });
    const x0 = 430, row = (y, lab, bits, cls) => { text(g, x0, y, lab, 'lbl', { 'font-size': 12 }); bits.forEach((b, i) => text(g, x0 + 110 + i * 22, y, String(b), (cls && cls(i)) || 'lbl-ink', { 'text-anchor': 'middle', 'font-size': 14, 'font-family': 'var(--mono)' })); };
    row(60, 'message', d); row(90, 'codeword', w); row(120, 'received', r, i => flip[i] ? 'lbl-red' : 'lbl-ink');
    text(g, x0, 150, 'syndrome rH⊤ = ' + syn.join(''), 'lbl-ink', { 'font-size': 12.5 });
    text(g, x0, 172, pos >= 0 ? '= column ' + (pos + 1) + ' of H → flip ' + names[pos] : '= 000 → accept as is', pos >= 0 ? 'lbl-ochre' : 'lbl', { 'font-size': 12.5 });
    row(204, 'decoded', dec.slice(0, 4), i => dec[i] !== d[i] ? 'lbl-red' : 'lbl-ink');
    const nf = flip.reduce((a, b) => a + b, 0);
    text(g, x0, 236, ok ? '✓ message recovered' : '✗ wrong message', ok ? 'lbl-blue' : 'lbl-red', { 'font-size': 13, 'font-weight': 600 });
    btns.forEach((b, i) => { b.textContent = names[i] + ' = ' + d[i]; });
    out.innerHTML = nf === 0 ? 'No bits flipped: every circle has even parity, the syndrome is 000.' : nf === 1 ? 'One bit flipped. The circles that now have odd parity are exactly the ones containing it, so the syndrome names it and the decoder repairs it.' :
      nf + ' bits flipped. ' + (ok ? 'Lucky: the decoder still got the message right.' : 'The syndrome now points at the wrong bit (or at none), and the decoder makes things worse: a distance-3 code can only correct one error.');
  }
  $('#it-hm-clear').addEventListener('click', () => { flip = flip.map(() => 0); render(); });
  render();
});
