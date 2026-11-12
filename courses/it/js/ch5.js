/* ---------- IT Ch5 · Fig 5.1: a two-state Markov chain ---------- */
reg('it-ch5', 'markov', function () {
  const svg = $('#it-mc-svg'); if (!svg) return;
  const sa = $('#it-mc-a'), sb = $('#it-mc-b'), out = $('#it-mc-out'), g = el('g', {}, svg);
  let seed = 7;
  function render() {
    const a = +sa.value, b = +sb.value; $('#it-mc-av').textContent = a.toFixed(2); $('#it-mc-bv').textContent = b.toFixed(2);
    clear(g);
    const mu = b / (a + b), Hm = itBin(mu), Hr = mu * itBin(a) + (1 - mu) * itBin(b);
    /* chain diagram */
    const A = [70, 70], Bp = [230, 70];
    [[A, 'a', mu], [Bp, 'b', 1 - mu]].forEach(([[x, y], s, m]) => { el('circle', { cx: x, cy: y, r: 22, class: 'f-paper s ' + (s === 'a' ? 's-blue' : 's-red'), 'stroke-width': 1.8 }, g); text(g, x, y + 6, s, 'lbl-ink lbl-serif', { 'text-anchor': 'middle', 'font-size': 18 }); text(g, x, y + 42, 'μ = ' + itFmt(m, 2), 'lbl', { 'text-anchor': 'middle', 'font-size': 11 }); });
    path('M96 60Q150 30 204 60', 's-ink', g, { fill: 'none', 'stroke-width': .8 + a * 4 }); itArrow(g, 204, 60, .8, .6);
    path('M204 82Q150 112 96 82', 's-ink', g, { fill: 'none', 'stroke-width': .8 + b * 4 }); itArrow(g, 96, 82, -.8, -.6);
    text(g, 150, 32, 'α = ' + a.toFixed(2), 'lbl', { 'text-anchor': 'middle', 'font-size': 11 }); text(g, 150, 118, 'β = ' + b.toFixed(2), 'lbl', { 'text-anchor': 'middle', 'font-size': 11 });
    /* sample path */
    const R = rng(seed); let s = R() < mu ? 0 : 1; const N = 60, x0 = 300, w = 6.7;
    text(g, x0, 28, 'a sample path', 'lbl', { 'font-size': 11 });
    for (let t = 0; t < N; t++) { el('rect', { x: x0 + t * w, y: s ? 60 : 40, width: w - 1, height: 18, class: s ? 'f-red' : 'f-blue', opacity: .8 }, g); s = s ? (R() < b ? 0 : 1) : (R() < a ? 1 : 0); }
    text(g, x0 - 6, 54, 'a', 'lbl-blue lbl-serif', { 'text-anchor': 'end', 'font-size': 13 }); text(g, x0 - 6, 74, 'b', 'lbl-red lbl-serif', { 'text-anchor': 'end', 'font-size': 13 });
    /* convergence of (1/n) H(X1..Xn) */
    const L = 70, Rr = 690, Bt = 300, T = 150, NN = 30, X = n => L + (n - 1) / (NN - 1) * (Rr - L), Y = v => Bt - v * (Bt - T);
    axisLine(g, L, Rr, Bt, [1, 5, 10, 15, 20, 25, 30].map(n => [X(n), String(n)]), { dy: 15, fs: 10.5 });
    vAxis(g, L, Bt, T, [0, .5, 1].map(v => [Y(v), String(v)]));
    text(g, Rr, Bt - 6, 'n', 'lbl', { 'text-anchor': 'end', 'font-size': 11.5 });
    path('M' + L + ' ' + Y(Hr) + 'H' + Rr, 's-ochre', g, { 'stroke-dasharray': '6 4', 'stroke-width': 1.3 }); text(g, Rr - 4, Y(Hr) + 16, 'entropy rate H(X) = ' + itFmt(Hr), 'lbl-ochre', { 'text-anchor': 'end', 'font-size': 11.5 });
    path('M' + L + ' ' + Y(Hm) + 'H' + Rr, 's-soft', g, { 'stroke-dasharray': '2 3' }); text(g, Rr - 4, Y(Hm) + (Hm > Hr + .08 ? -6 : 14), 'H(X₁) = ' + itFmt(Hm), 'lbl', { 'text-anchor': 'end', 'font-size': 11.5 });
    const pts = []; for (let n = 1; n <= NN; n++) pts.push([X(n), Y((Hm + (n - 1) * Hr) / n)]);
    path(poly(pts), 's-blue', g, { 'stroke-width': 2.4, fill: 'none' }); pts.forEach(p => el('circle', { cx: p[0], cy: p[1], r: 2.6, class: 'f-blue' }, g));
    text(g, L + 8, T - 4, '(1/n) H(X₁,…,Xₙ)', 'lbl-blue', { 'font-size': 11.5 });
    out.innerHTML = 'Stationary distribution μ = (' + itFmt(mu, 3) + ', ' + itFmt(1 - mu, 3) + '). One symbol on its own carries H(X₁) = ' + itFmt(Hm) + ' bits, but given the previous one only H(X) = <b>' + itFmt(Hr) + '</b> bits per symbol' + (Hm - Hr > .005 ? ' — the dependence saves ' + itFmt(Hm - Hr) + ' bits per symbol.' : ' (almost independent).');
  }
  $('#it-mc-new').addEventListener('click', () => { seed = (seed * 9301 + 49297) % 233280; render(); });
  sa.addEventListener('input', render); sb.addEventListener('input', render); render();
});
function itArrow(g, x, y, ux, uy) { const s = 7, px = -uy, py = ux; path('M' + (x - ux * s + px * s * .5) + ' ' + (y - uy * s + py * s * .5) + 'L' + x + ' ' + y + 'L' + (x - ux * s - px * s * .5) + ' ' + (y - uy * s - py * s * .5), 's-ink', g, { fill: 'none', 'stroke-width': 1.4 }); }

/* ---------- IT Ch5 · Fig 5.2: random walk on a weighted graph ---------- */
reg('it-ch5', 'walk', function () {
  const svg = $('#it-rw-svg'); if (!svg) return;
  const out = $('#it-rw-out'), g = el('g', {}, svg);
  const V = [[90, 150], [220, 60], [220, 240], [370, 150], [500, 60], [500, 240]];
  const E = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5], [1, 4]];
  let W = [1, 1, 1, 1, 1, 1, 1, 1, 0];
  function connected() { const seen = new Set([0]), st = [0]; while (st.length) { const v = st.pop(); E.forEach(([a, b], k) => { if (!W[k]) return; const u = a === v ? b : b === v ? a : -1; if (u >= 0 && !seen.has(u)) { seen.add(u); st.push(u); } }); } return seen.size === V.length; }
  function render() {
    clear(g);
    const wv = V.map((_, i) => E.reduce((s, [a, b], k) => s + (a === i || b === i ? W[k] : 0), 0)), tot = W.reduce((a, b) => a + b, 0);
    E.forEach(([a, b], k) => {
      const [x1, y1] = V[a], [x2, y2] = V[b];
      const ln = el('path', { d: 'M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2, class: 's ' + (W[k] ? 's-ink' : 's-soft'), 'stroke-width': W[k] ? 1 + W[k] * 2.2 : 1.2, 'stroke-dasharray': W[k] ? '' : '4 4', fill: 'none' }, g);
      const hit = el('path', { d: 'M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2, stroke: 'transparent', 'stroke-width': 18, fill: 'none', 'pointer-events': 'stroke', style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': 'edge ' + (a + 1) + '–' + (b + 1) + ', weight ' + W[k] }, g);
      const f = () => { W[k] = (W[k] + 1) % 4; render(); };
      hit.addEventListener('click', f); hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } });
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      el('circle', { cx: mx, cy: my, r: 9, class: 'f-paper', 'pointer-events': 'none' }, g);
      text(g, mx, my + 4, String(W[k]), W[k] ? 'lbl-ink' : 'lbl', { 'text-anchor': 'middle', 'font-size': 11, 'pointer-events': 'none' });
    });
    const ok = connected() && tot > 0;
    V.forEach(([x, y], i) => {
      const mu = tot ? wv[i] / (2 * tot) : 0, r = 8 + Math.sqrt(mu) * 60;
      el('circle', { cx: x, cy: y, r, class: 'f-paper', 'pointer-events': 'none' }, g); el('circle', { cx: x, cy: y, r, class: 'f-bluew s s-blue', 'stroke-width': 1.6, 'pointer-events': 'none' }, g);
      text(g, x, y + 4, String(i + 1), 'lbl-ink', { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, 'pointer-events': 'none' });
      text(g, x, y + r + 14, 'μ = ' + itFmt(mu, 3), 'lbl', { 'text-anchor': 'middle', 'font-size': 10.5, 'pointer-events': 'none', style: 'paint-order:stroke;stroke:var(--paper);stroke-width:4px' });
    });
    if (!ok) { out.innerHTML = '<b>The graph is disconnected</b>, so the walk has more than one stationary distribution. Add an edge back.'; return; }
    const pe = []; E.forEach((_, k) => { if (W[k]) { pe.push(W[k] / (2 * tot), W[k] / (2 * tot)); } });
    const He = itEntropy(pe), Hmu = itEntropy(wv.map(w => w / (2 * tot))), Hr = He - Hmu;
    const x0 = 570; [['w (total weight) = ' + tot, 'lbl-ink'], ['H(edges) = ' + itFmt(He), 'lbl'], ['H(μ) = ' + itFmt(Hmu), 'lbl'], ['rate = ' + itFmt(Hr), 'lbl-ochre']].forEach(([s, c], k) => text(g, x0, 80 + k * 24, s, c, { 'font-size': 12.5, 'font-weight': k === 3 ? 700 : 400 }));
    out.innerHTML = 'Entropy rate H(X) = H(edges) − H(μ) = ' + itFmt(He) + ' − ' + itFmt(Hmu) + ' = <b>' + itFmt(Hr) + '</b> bits per step. (Check: averaging the entropy of each vertex’s exit distribution over μ gives the same number.)';
  }
  $('#it-rw-unit').addEventListener('click', () => { W = W.map((w, k) => k < 8 ? 1 : 0); render(); });
  $('#it-rw-rand').addEventListener('click', () => { const R = rng(Date.now() & 0xffff); W = W.map(() => 1 + Math.floor(R() * 3)); render(); });
  render();
});

/* ---------- IT Ch5 · Fig 5.3: Wonham filter and Viterbi ---------- */
reg('it-ch5', 'viterbi', function () {
  const svg = $('#it-vt-svg'); if (!svg) return;
  const S = { a: $('#it-vt-a'), b: $('#it-vt-b'), e: $('#it-vt-e'), f: $('#it-vt-f') }, out = $('#it-vt-out'), obsHost = $('#it-vt-obs'), g = el('g', {}, svg);
  let ys = [1, 2, 2, 1];
  const presets = { 'Examples 5.17, 5.19': { a: .3, b: .4, e: .1, f: .2, ys: [1, 2, 2, 1] }, 'filter and Viterbi disagree': { a: .1, b: .1, e: .2, f: .2, ys: [2, 1, 2, 1, 2] } };
  function load(n) { const p = presets[n]; S.a.value = p.a; S.b.value = p.b; S.e.value = p.e; S.f.value = p.f; ys = p.ys.slice(); render(); }
  function render() {
    const a = +S.a.value, b = +S.b.value, e = +S.e.value, f = +S.f.value;
    $('#it-vt-av').textContent = a.toFixed(2); $('#it-vt-bv').textContent = b.toFixed(2); $('#it-vt-ev').textContent = e.toFixed(2); $('#it-vt-fv').textContent = f.toFixed(2);
    const P = [[1 - a, a], [b, 1 - b]], M = [[1 - e, e], [f, 1 - f]];
    /* filter (unnormalised and normalised) and Viterbi */
    let mu = [1, 0], pi = [1, 0]; const MU = [mu.slice()], PI = [pi.slice()], BK = [null];
    ys.forEach(y => {
      const A = [0, 1].map(i => [0, 1].map(j => P[i][j] * M[j][y - 1]));
      const nm = [0, 1].map(j => mu[0] * A[0][j] + mu[1] * A[1][j]), s = nm[0] + nm[1]; mu = nm.map(v => v / s);
      const bk = [0, 0], np = [0, 1].map(j => { const c0 = pi[0] * A[0][j], c1 = pi[1] * A[1][j]; bk[j] = c1 > c0 ? 1 : 0; return Math.max(c0, c1); });
      pi = np; MU.push(mu.slice()); PI.push(pi.slice()); BK.push(bk);
    });
    const T = ys.length, last = PI[T][1] > PI[T][0] ? 1 : 0, best = new Array(T + 1); best[T] = last;
    for (let t = T; t > 0; t--) best[t - 1] = BK[t][best[t]];
    /* draw */
    clear(g);
    const L = 90, Rr = 660, w = T ? (Rr - L) / T : 0, X = t => L + t * w, Yst = [130, 240];
    text(g, L - 50, 70, 'observed', 'lbl', { 'font-size': 11, 'text-anchor': 'middle' });
    ['state 1', 'state 2'].forEach((s, i) => text(g, L - 40, Yst[i] + 4, s, i ? 'lbl-red' : 'lbl-blue', { 'text-anchor': 'end', 'font-size': 12 }));
    for (let t = 1; t <= T; t++) for (let j = 0; j < 2; j++) { const i = BK[t][j]; path('M' + (X(t - 1) + 20) + ' ' + Yst[i] + 'L' + (X(t) - 20) + ' ' + Yst[j], 's-soft', g, { 'stroke-width': 1.2 }); itArrow(g, X(t) - 20, Yst[j], (X(t) - X(t - 1) - 40) / Math.hypot(X(t) - X(t - 1) - 40, Yst[j] - Yst[i]), (Yst[j] - Yst[i]) / Math.hypot(X(t) - X(t - 1) - 40, Yst[j] - Yst[i])); }
    for (let t = 1; t <= T; t++) path('M' + (X(t - 1) + 20) + ' ' + Yst[best[t - 1]] + 'L' + (X(t) - 20) + ' ' + Yst[best[t]], 's-ochre', g, { 'stroke-width': 4.5, opacity: .8 });
    for (let t = 0; t <= T; t++) {
      if (t) text(g, X(t), 70, String(ys[t - 1]), 'lbl-ink lbl-serif', { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600 });
      text(g, X(t), 300, 't = ' + t, 'lbl', { 'text-anchor': 'middle', 'font-size': 10.5 });
      for (let j = 0; j < 2; j++) {
        const y = Yst[j], m = MU[t][j];
        el('circle', { cx: X(t), cy: y, r: 18, class: 'f-paper s ' + (j ? 's-red' : 's-blue'), 'stroke-width': best[t] === j ? 2.6 : 1.3 }, g);
        el('rect', { x: X(t) - 3, y: y - 17 + 34 * (1 - m), width: 6, height: 34 * m, class: j ? 'f-red' : 'f-blue', opacity: .55 }, g);
        text(g, X(t), y + 34, itFmt(m, 2), j ? 'lbl-red' : 'lbl-blue', { 'text-anchor': 'middle', 'font-size': 10.5 });
      }
    }
    text(g, X(0), 30, 'thick: most likely path   ·   bars and numbers: filter posterior μₜ', 'lbl', { 'font-size': 11 });
    /* observation buttons */
    obsHost.innerHTML = '';
    ys.forEach((y, k) => { const bt = document.createElement('button'); bt.textContent = 'y' + (k + 1) + ' = ' + y; bt.addEventListener('click', () => { ys[k] = 3 - y; render(); }); obsHost.appendChild(bt); });
    const add = document.createElement('button'); add.textContent = '+'; add.className = 'ghost'; add.disabled = ys.length >= 8; add.addEventListener('click', () => { ys.push(1); render(); }); obsHost.appendChild(add);
    const rm = document.createElement('button'); rm.textContent = '−'; rm.className = 'ghost'; rm.disabled = ys.length <= 1; rm.addEventListener('click', () => { ys.pop(); render(); }); obsHost.appendChild(rm);
    const fl = MU[T][1] > MU[T][0] ? 2 : 1;
    out.innerHTML = 'π (unnormalised Viterbi scores): ' + PI.map((p, t) => 't' + t + ' (' + p.map(v => v < 1e-3 && v > 0 ? v.toExponential(2) : v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')).join(', ') + ')').join('  ') +
      '.<br>Most likely path: <b>(' + best.map(s => s + 1).join(', ') + ')</b>, ending in state ' + (last + 1) + '. Filter’s most likely state at the end: <b>' + fl + '</b> (' + itFmt(Math.max(...MU[T]), 2) + ')' +
      (fl !== last + 1 ? ' — <b>they disagree</b>: the best path and the best final state answer different questions.' : '.');
  }
  Object.values(S).forEach(s => s.addEventListener('input', render));
  const names = Object.keys(presets), bs = names.map(n => { const b = document.createElement('button'); b.textContent = n; b.dataset.g = n; b.addEventListener('click', () => { pressGroup(bs, n, 'data-g'); load(n); }); $('#it-vt-btns').appendChild(b); return b; });
  pressGroup(bs, names[0], 'data-g'); render();
});
