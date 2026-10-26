// 第 7 课组件：咖啡自动机（交互模型）+ 粗粒化 + 压缩长度。
//
// 1) 实时模拟：<div class="l7-sim" data-n="48" data-total="6000000"></div>
//    上半奶油（1）、下半咖啡（0）。每一步随机挑一个格子和一个方向，两边不同就交换，
//    碰到杯壁就作废。每 250 000 步量一次：细粒度状态的压缩长度（熵）和
//    粗粒化 + 三档量化后的压缩长度（表观复杂度）。
//    压缩用浏览器自带的 CompressionStream('deflate')，与 Python 的 zlib 是同一种算法；
//    浏览器不支持时退回游程编码长度，并在图下注明。
// 2) 数值练习：<div class="l7-num" data-answer="0.444" data-tol="0.01" data-hint="…" data-explain="…"></div>
const Coffee = (function () {
  const NS = 'http://www.w3.org/2000/svg';

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 以 w×w 窗口为中心求平均；窗口伸出边界的部分不计入（与 avg_pool2d 的 count_include_pad=False 相同）。
  function coarse(g, n, w) {
    const h = w >> 1, out = new Float64Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let s = 0, c = 0;
      for (let yy = Math.max(0, y - h); yy <= Math.min(n - 1, y + h); yy++)
        for (let xx = Math.max(0, x - h); xx <= Math.min(n - 1, x + h); xx++) { s += g[yy * n + xx]; c++; }
      out[y * n + x] = s / c;
    }
    return out;
  }
  const quant = cg => Uint8Array.from(cg, v => Math.min(2, Math.floor(v * 3)));

  const hasDeflate = typeof CompressionStream === 'function';
  async function clen(bytes) {
    if (!hasDeflate) {               // 游程编码：每一段记一个（值, 长度）对
      let runs = 1;
      for (let i = 1; i < bytes.length; i++) if (bytes[i] !== bytes[i - 1]) runs++;
      return runs * 2;
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return (await new Response(stream).arrayBuffer()).byteLength;
  }

  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function setupSim(host) {
    const n = Number(host.dataset.n || 48), total = Number(host.dataset.total || 6000000);
    const every = 250000, perFrame = 50000;
    let g, rand, t, data, running = false, w = 9;

    const wrap = document.createElement('div');
    wrap.className = 'l7-panels';
    const mk = label => {
      const fig = document.createElement('figure');
      const cv = document.createElement('canvas');
      cv.width = cv.height = n;
      const cap = document.createElement('figcaption');
      cap.textContent = label;
      fig.append(cv, cap);
      wrap.appendChild(fig);
      return cv.getContext('2d');
    };
    const ctxFine = mk('细粒度（每格 0/1）'), ctxCoarse = mk('粗粒化 + 三档');
    host.appendChild(wrap);

    const W = 520, H = 200, L = 44, R = 10, T = 10, B = 30;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'h-svg', role: 'img', 'aria-label': '熵与表观复杂度随时间变化' });
    host.appendChild(svg);
    const legend = document.createElement('p');
    legend.className = 'h-readout';
    host.appendChild(legend);

    const bar = document.createElement('div');
    bar.style.marginTop = '.5rem';
    const play = document.createElement('button');
    const reset = document.createElement('button');
    reset.textContent = '重置';
    const sel = document.createElement('select');
    sel.className = 'h-input';
    sel.setAttribute('aria-label', '粗粒化窗口边长');
    [3, 5, 9].forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = `窗口 ${v}×${v}`; sel.appendChild(o); });
    sel.value = '9';
    bar.append(play, reset, sel);
    host.appendChild(bar);
    const out = document.createElement('p');
    out.className = 'h-readout';
    host.appendChild(out);

    function paint(ctx, vals, shade) {
      const img = ctx.createImageData(n, n);
      const css = getComputedStyle(document.documentElement);
      const parse = s => { const m = s.trim().match(/^#(..)(..)(..)$/); return m ? m.slice(1).map(h => parseInt(h, 16)) : [128, 128, 128]; };
      const on = parse(css.getPropertyValue('--cell-on')), off = parse(css.getPropertyValue('--cell-off'));
      for (let i = 0; i < n * n; i++) {
        const a = shade(vals[i]);
        for (let k = 0; k < 3; k++) img.data[4 * i + k] = Math.round(off[k] + (on[k] - off[k]) * a);
        img.data[4 * i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }

    function drawPlot() {
      svg.textContent = '';
      const yMax = Math.max(100, ...data.map(d => Math.max(d[1], d[2]))) * 1.05;
      const X = x => L + (x / total) * (W - L - R), Y = y => T + (1 - y / yMax) * (H - T - B);
      svg.appendChild(svgEl('line', { x1: L, y1: Y(0), x2: W - R, y2: Y(0), class: 'axis' }));
      svg.appendChild(svgEl('line', { x1: L, y1: Y(0), x2: L, y2: T, class: 'axis' }));
      const tick = (x, y, s, anchor) => { const e = svgEl('text', { x, y, class: 'tick', 'text-anchor': anchor }); e.textContent = s; svg.appendChild(e); };
      tick(L - 6, Y(0) + 4, '0', 'end');
      tick(L - 6, T + 8, String(Math.round(yMax)), 'end');
      tick(X(0), H - 12, '0', 'middle');
      tick(X(total), H - 12, `${total / 1e6}M`, 'middle');
      tick(W - R, H - 1, '步数', 'end');
      tick(L + 4, T + 10, '压缩后字节数', 'start');
      const line = (k, cls) => svg.appendChild(svgEl('polyline', { points: data.map(d => `${X(d[0])},${Y(d[k])}`).join(' '), class: cls }));
      line(1, 'curve l7-fine');
      line(2, 'curve');
      const last = data[data.length - 1];
      legend.innerHTML = `<span class="l7-key l7-fine-key"></span>熵（细粒度）${last[1]} B　<span class="l7-key"></span>表观复杂度（粗粒化）${last[2]} B` +
        (hasDeflate ? '' : '　·　<em>你的浏览器不支持 CompressionStream，这里用游程编码长度代替</em>');
    }

    let busy = false;
    async function measure() {
      busy = true;
      const q = quant(coarse(g, n, w));
      const [a, b] = await Promise.all([clen(g), clen(q)]);
      data.push([t, a, b]);
      paint(ctxFine, g, v => v);
      paint(ctxCoarse, q, v => v / 2);
      drawPlot();
      const peak = data.reduce((m, d) => (d[2] > m[2] ? d : m));
      out.textContent = `t = ${t.toLocaleString()}　·　复杂度峰值 ${peak[2]} B，出现在 t = ${peak[0].toLocaleString()}`;
      busy = false;
    }

    function init() {
      running = false; play.textContent = '开始';
      w = Number(sel.value); rand = mulberry32(1); t = 0; data = [];
      g = new Uint8Array(n * n);
      for (let i = 0; i < n * n / 2; i++) g[i] = 1;
      measure();
    }

    function stepMany(k) {
      for (let s = 0; s < k; s++) {
        const i = Math.floor(rand() * n * n), d = Math.floor(rand() * 4);
        const y = (i / n) | 0, x = i % n;
        let j;
        if (d === 0) { if (y === 0) continue; j = i - n; }
        else if (d === 1) { if (y === n - 1) continue; j = i + n; }
        else if (d === 2) { if (x === 0) continue; j = i - 1; }
        else { if (x === n - 1) continue; j = i + 1; }
        if (g[i] !== g[j]) { const tmp = g[i]; g[i] = g[j]; g[j] = tmp; }
      }
    }

    async function frame() {
      if (!running) return;
      if (!busy) {
        stepMany(perFrame); t += perFrame;
        if (t % every === 0) await measure();
        if (t >= total) { running = false; play.textContent = '已结束'; return; }
      }
      setTimeout(frame, 0);
    }

    play.onclick = () => {
      if (t >= total) return;
      running = !running;
      play.textContent = running ? '暂停' : '继续';
      if (running) setTimeout(frame, 0);
    };
    reset.onclick = init;
    sel.onchange = init;
    init();
  }

  function setupNum(host) {
    const ans = Number(host.dataset.answer), tol = Number(host.dataset.tol || 0.01);
    const bar = document.createElement('div');
    const input = document.createElement('input');
    Object.assign(input, { type: 'text', inputMode: 'decimal', placeholder: host.dataset.placeholder || '填一个数' });
    input.className = 'h-input';
    const check = document.createElement('button');
    check.textContent = '检查';
    const reveal = document.createElement('button');
    reveal.textContent = '看答案';
    bar.append(input, check, reveal);
    const fb = document.createElement('p');
    fb.className = 'feedback';
    host.append(bar, fb);
    check.onclick = () => {
      const v = parseFloat(input.value);
      if (Number.isNaN(v)) { fb.className = 'feedback bad'; fb.textContent = '先填一个数。'; return; }
      const ok = Math.abs(v - ans) <= tol;
      fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
      fb.textContent = ok ? '对。' + host.dataset.explain : '还不对。' + host.dataset.hint;
    };
    reveal.onclick = () => { fb.className = 'feedback'; fb.textContent = host.dataset.explain; };
  }

  document.querySelectorAll('.l7-sim').forEach(setupSim);
  document.querySelectorAll('.l7-num').forEach(setupNum);
  return { coarse, quant };
})();
