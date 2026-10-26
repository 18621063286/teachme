// 第 6 课：二维扩散组件。更新规则与 notebook 的 diffusion_2d 相同：
// u ← u + r·Lu，L 是五点拉普拉斯，边界用 replicate（越界处取最近的边缘值）。
//
// 1) 扩散模拟：<div class="l6-sim" data-size="24" data-block="8"></div>
//    中间一块方形初值为 1。滑块调 r，可选是否 clamp(0,1)，显示总量、最大值、最小值。
// 2) 手算一格：<div class="l6-calc" data-c="0.8" data-up="0.2" data-down="1" data-left="0.8" data-right="0.8" data-r="0.2"></div>
//    学习者填 Lu 和更新后的 u，误差 0.005 以内算对。
const Diffusion = (function () {
  function init(n, b) {
    const s = Math.floor((n - b) / 2);
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i >= s && i < s + b && j >= s && j < s + b ? 1 : 0)));
  }

  function step(u, r, clamp) {
    const n = u.length, at = (i, j) => u[Math.min(Math.max(i, 0), n - 1)][Math.min(Math.max(j, 0), n - 1)];
    return u.map((row, i) => row.map((c, j) => {
      const v = c + r * (at(i - 1, j) + at(i + 1, j) + at(i, j - 1) + at(i, j + 1) - 4 * c);
      return clamp ? Math.min(Math.max(v, 0), 1) : v;
    }));
  }

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function setupSim(host) {
    const n = Number(host.dataset.size || 24), b = Number(host.dataset.block || 8), px = 12;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = n * px;
    canvas.className = 'l6-canvas';
    canvas.setAttribute('aria-label', '二维扩散模拟');
    host.appendChild(canvas);

    const controls = document.createElement('div');
    controls.className = 'l6-controls';
    controls.innerHTML = `
      <label>r = <span class="mono" data-k="rv">0.20</span>
        <input type="range" min="0" max="35" value="20" data-k="r" class="h-slider"></label>
      <label><input type="checkbox" data-k="clamp" checked> clamp(0, 1)</label>`;
    host.appendChild(controls);
    const q = k => controls.querySelector(`[data-k="${k}"]`);

    const bar = document.createElement('div');
    bar.style.marginTop = '.5rem';
    const mk = (t, f) => { const btn = document.createElement('button'); btn.textContent = t; btn.onclick = f; bar.appendChild(btn); return btn; };
    let u, t, timer = null;
    const reset = () => { u = init(n, b); t = 0; draw(); };
    const once = () => { u = step(u, q('r').value / 100, q('clamp').checked); t++; draw(); };
    mk('单步', once);
    const play = mk('播放', () => {
      if (timer) { clearInterval(timer); timer = null; play.textContent = '播放'; return; }
      play.textContent = '暂停';
      timer = setInterval(() => { once(); if (t >= 200) play.click(); }, 60);
    });
    mk('重置', () => { if (timer) play.click(); reset(); });
    host.appendChild(bar);
    const out = document.createElement('p');
    out.className = 'h-readout';
    host.appendChild(out);

    q('r').addEventListener('input', () => { q('rv').textContent = (q('r').value / 100).toFixed(2); draw(); });

    function draw() {
      const ctx = canvas.getContext('2d'), pos = css('--accent'), neg = css('--ok'), bg = css('--bg');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      let sum = 0, mx = -Infinity, mn = Infinity;
      u.forEach((row, i) => row.forEach((v, j) => {
        sum += v; mx = Math.max(mx, v); mn = Math.min(mn, v);
        ctx.globalAlpha = Math.min(Math.abs(v), 1);
        ctx.fillStyle = v >= 0 ? pos : neg;
        ctx.fillRect(j * px, i * px, px, px);
      }));
      ctx.globalAlpha = 1;
      const r = q('r').value / 100, warn = r > 0.25 ? '　·　<strong>r &gt; 1/4：不稳定</strong>' : '';
      out.innerHTML = `t = ${t}　·　总量 ${sum.toFixed(4)}（初始 ${b * b}）　·　最大 ${mx.toFixed(4)}　·　最小 ${mn.toFixed(4)}${warn}`;
    }
    reset();
  }

  function setupCalc(host) {
    const d = host.dataset, v = k => Number(d[k]);
    const L = v('up') + v('down') + v('left') + v('right') - 4 * v('c'), next = v('c') + v('r') * L;
    const grid = document.createElement('table');
    grid.className = 'l6-nbhd';
    const cellOf = x => (x === null ? '<td></td>' : `<td class="mono">${x}</td>`);
    grid.innerHTML = `<tr>${cellOf(null)}${cellOf(d.up)}${cellOf(null)}</tr>
      <tr>${cellOf(d.left)}<td class="mono center">${d.c}</td>${cellOf(d.right)}</tr>
      <tr>${cellOf(null)}${cellOf(d.down)}${cellOf(null)}</tr>`;
    host.appendChild(grid);

    const bar = document.createElement('div');
    const field = ph => { const i = document.createElement('input'); Object.assign(i, { type: 'text', inputMode: 'decimal', placeholder: ph }); i.className = 'h-input'; bar.appendChild(i); return i; };
    const inL = field('Lu = ?'), inU = field('新的 u = ?');
    const check = document.createElement('button'); check.textContent = '检查';
    const reveal = document.createElement('button'); reveal.textContent = '看答案';
    bar.append(check, reveal);
    const fb = document.createElement('p'); fb.className = 'feedback';
    host.append(bar, fb);

    const fmt = x => (Math.round(x * 1e4) / 1e4).toString();
    const steps = `Lu = ${d.up} + ${d.down} + ${d.left} + ${d.right} − 4×${d.c} = ${fmt(L)}；新的 u = ${d.c} + ${d.r}×(${fmt(L)}) = ${fmt(next)}`;
    check.onclick = () => {
      const gL = parseFloat(inL.value), gU = parseFloat(inU.value);
      const okL = Math.abs(gL - L) < 0.005, okU = Math.abs(gU - next) < 0.005;
      fb.className = 'feedback ' + (okL && okU ? 'ok' : 'bad');
      fb.textContent = okL && okU ? `对。${steps}。`
        : !okL ? 'Lu 不对。四个邻居相加，再减去 4 倍的中心值。'
        : '新的 u 不对。它等于中心值加上 r 乘 Lu。';
    };
    reveal.onclick = () => { fb.className = 'feedback'; fb.textContent = steps + '。'; };
  }

  document.querySelectorAll('.l6-sim').forEach(setupSim);
  document.querySelectorAll('.l6-calc').forEach(setupCalc);
  return { step, init };
})();
