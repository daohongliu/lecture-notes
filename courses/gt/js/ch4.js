/* ---------- GT Ch4 · Fig 4.1: best response staircases ---------- */
reg('gt-ch4', 'brcurves', function () {
  const host = $('#gt-brc-tab'), svg = $('#gt-brc-svg'); if (!host || !svg) return;
  const out = $('#gt-brc-out'), g = el('g', {}, svg);
  const presets = { 'Example 4.11': { r: ['T', 'B'], c: ['L', 'R'], p1: '1,0;0,2', p2: '5,0;0,1' } };
  ['matching pennies', 'Prisoner’s Dilemma', 'chicken', 'stag hunt', 'coordination'].forEach(n => presets[n] = GT_GAMES[n]);
  let G, P1, P2;
  const L = 50, R = 300, B = 280, T = 30, X = q => L + q * (R - L), Y = p => B - p * (B - T);
  function load(n) { G = presets[n]; P1 = gtParse(G.p1); P2 = gtParse(G.p2); render(); }
  /* indifference point of a·t + b·(1−t) vs c·t + d·(1−t): returns {t, sgn0, sgn1} where sgn = sign(first − second) at t = 0, 1 */
  function indiff(a, b, c, d) { const s0 = b - d, s1 = a - c; return { s0, s1, t: s0 === s1 ? null : s0 / (s0 - s1) }; }
  function stair(I) { /* best value of own prob (1 = first strategy) as a function of the other's prob t, as segments */
    const v = s => s > 0 ? 1 : s < 0 ? 0 : null;
    if (I.s0 === 0 && I.s1 === 0) return 'all';
    if (I.t !== null && I.t > 0 && I.t < 1) return [[0, I.t, v(I.s0)], [I.t, 1, v(I.s1)]];
    return [[0, 1, v(I.s0 + I.s1)]];
  }
  function render() {
    gtTable(host, { rows: G.r, cols: G.c, P1, P2, edit: true, onChange: render });
    clear(g);
    el('rect', { x: L, y: T, width: R - L, height: B - T, class: 'f-paper s s-soft', 'stroke-width': 1 }, g);
    axisLine(g, L, R, B, [[X(0), '0'], [X(.5), '½'], [X(1), '1']], { dy: 16, fs: 11 });
    vAxis(g, L, B, T, [[Y(0), '0'], [Y(.5), '½'], [Y(1), '1']]);
    text(g, R, B + 30, 'q = P(' + G.c[0] + ')', 'lbl-red', { 'text-anchor': 'end', 'font-size': 12 });
    text(g, L - 6, T - 12, 'p = P(' + G.r[0] + ')', 'lbl-blue', { 'font-size': 12 });
    const I1 = indiff(P1[0][0], P1[0][1], P1[1][0], P1[1][1]), I2 = indiff(P2[0][0], P2[1][0], P2[0][1], P2[1][1]);
    const s1 = stair(I1), s2 = stair(I2);
    /* BR1: p as a function of q */
    if (s1 === 'all') el('rect', { x: L, y: T, width: R - L, height: B - T, fill: 'url(#h-blue)', opacity: .6 }, g);
    else { const pts = []; s1.forEach(([a, b, v]) => { pts.push([X(a), Y(v)], [X(b), Y(v)]); }); path(poly(pts), 's-blue', g, { 'stroke-width': 4, fill: 'none', 'stroke-linejoin': 'round', opacity: .85 }); }
    /* BR2: q as a function of p */
    if (s2 === 'all') el('rect', { x: L, y: T, width: R - L, height: B - T, fill: 'url(#h-red)', opacity: .6 }, g);
    else { const pts = []; s2.forEach(([a, b, v]) => { pts.push([X(v), Y(a)], [X(v), Y(b)]); }); path(poly(pts), 's-red', g, { 'stroke-width': 2.2, fill: 'none', 'stroke-dasharray': '7 4' }); }
    const A = gtAnalyse(P1, P2), eq = A.ne.map(([i, j]) => ({ p: i === 0 ? 1 : 0, q: j === 0 ? 1 : 0, pure: true }));
    if (I1.t !== null && I2.t !== null && I1.t > 0 && I1.t < 1 && I2.t > 0 && I2.t < 1) eq.push({ p: I2.t, q: I1.t });
    eq.forEach(e => { el('circle', { cx: X(e.q), cy: Y(e.p), r: 8, class: 's s-ochre', fill: 'var(--ochre-wash)', 'stroke-width': 2.4 }, g); });
    const degen = s1 === 'all' || s2 === 'all' || I1.t === 0 || I1.t === 1 || I2.t === 0 || I2.t === 1;
    out.innerHTML = 'Player 1 is indifferent at q = ' + (I1.t === null ? (s1 === 'all' ? 'every q' : 'no q') : gtFrac(I1.t)) + '; player 2 at p = ' + (I2.t === null ? (s2 === 'all' ? 'every p' : 'no p') : gtFrac(I2.t)) + '.<br>' +
      'Nash equilibria (p, q): <b>' + eq.map(e => '(' + gtFrac(e.p) + ', ' + gtFrac(e.q) + ')' + (e.pure ? '' : ' mixed')).join(', ') + '</b>' + (degen ? ' <span class="dim">(degenerate payoffs: there may be a whole segment of equilibria where the staircases overlap)</span>' : '') + '.';
  }
  gtButtons($('#gt-brc-btns'), Object.keys(presets), 'Example 4.11', load); load('Example 4.11');
});

/* ---------- GT Ch4 · Fig 4.2: Brouwer in one dimension ---------- */
reg('gt-ch4', 'brouwer', function () {
  const svg = $('#gt-fp-svg'); if (!svg) return;
  const out = $('#gt-fp-out'), jb = $('#gt-fp-jump');
  const L = 200, R = 500, B = 310, T = 10, X = x => L + x * (R - L), Y = y => B - y * (B - T);
  const xs = [0, .25, .5, .5, .75, 1];
  let ys = [.8, .9, .55, .55, .2, .3], jump = false;
  const gA = el('g', {}, svg), g = el('g', {}, svg), gH = el('g', {}, svg);
  el('rect', { x: L, y: T, width: R - L, height: B - T, class: 'f-paper s s-soft', 'stroke-width': 1 }, gA);
  path('M' + X(0) + ' ' + Y(0) + 'L' + X(1) + ' ' + Y(1), 's-soft', gA, { 'stroke-dasharray': '4 4' });
  text(gA, X(1) + 6, Y(1) + 4, 'y = x', 'lbl', { 'font-size': 11 });
  axisLine(gA, L, R, B, [[X(0), '0'], [X(1), '1']], { dy: 16, fs: 11 });
  vAxis(gA, L, B, T, [[Y(0), '0'], [Y(1), '1']]);
  function fixed() {
    const f = [];
    for (let k = 0; k < xs.length - 1; k++) {
      if (xs[k] === xs[k + 1]) continue;
      const a = ys[k] - xs[k], b = ys[k + 1] - xs[k + 1];
      if (a === 0) f.push(xs[k]);
      else if (a * b < 0) f.push(xs[k] + (xs[k + 1] - xs[k]) * a / (a - b));
      if (k === xs.length - 2 && b === 0) f.push(xs[k + 1]);
    }
    return f.filter((v, i) => f.findIndex(w => Math.abs(w - v) < 1e-9) === i);
  }
  const handles = xs.map((x, k) => {
    const h = el('circle', { r: 8, class: 'f-blue', tabindex: 0, role: 'slider', 'aria-label': 'f at ' + x, style: 'cursor:grab' }, gH);
    drag(h, svg, pt => { ys[k] = clamp((B - pt.y) / (B - T), 0, 1); if (!jump && (k === 2 || k === 3)) ys[5 - k] = ys[k]; render(); });
    keyNudge(h, () => ys[k], v => { ys[k] = clamp(v, 0, 1); if (!jump && (k === 2 || k === 3)) ys[5 - k] = ys[k]; render(); }, .02, .1);
    return h;
  });
  function render() {
    clear(g);
    const segs = jump ? [[0, 1, 2], [3, 4, 5]] : [[0, 1, 2, 4, 5]];
    segs.forEach(s => path(poly(s.map(k => [X(xs[k]), Y(ys[k])])), 's-blue', g, { 'stroke-width': 2.6, fill: 'none' }));
    if (jump) { el('circle', { cx: X(.5), cy: Y(ys[2]), r: 4, class: 'f-blue' }, g); el('circle', { cx: X(.5), cy: Y(ys[3]), r: 4, class: 'f-paper s s-blue', 'stroke-width': 1.6 }, g); }
    handles.forEach((h, k) => { h.setAttribute('cx', X(xs[k]) + (jump && k === 3 ? 0 : 0)); h.setAttribute('cy', Y(ys[k])); h.style.display = !jump && k === 3 ? 'none' : ''; });
    const F = fixed();
    F.forEach(x => el('circle', { cx: X(x), cy: Y(x), r: 9, class: 's s-ochre', fill: 'none', 'stroke-width': 2.4 }, g));
    out.innerHTML = F.length ? 'Fixed point' + (F.length > 1 ? 's' : '') + ' at x = <b>' + F.map(x => x.toFixed(3)).join(', ') + '</b>.' : '<b>No fixed point!</b> The graph jumped over the diagonal at x = ½: this f is not continuous.';
  }
  jb.addEventListener('click', () => { jump = !jump; jb.setAttribute('aria-pressed', String(jump)); if (!jump) ys[3] = ys[2]; else { ys = [.8, .9, .7, .3, .2, .1]; } render(); });
  $('#gt-fp-rand').addEventListener('click', () => { const Rn = rng(Date.now() & 0xffff); ys = ys.map(() => Rn()); if (!jump) ys[3] = ys[2]; render(); });
  render();
});
