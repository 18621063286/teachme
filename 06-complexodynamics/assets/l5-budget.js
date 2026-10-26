// 第 5 课组件：短描述与运行时间的取舍。
//
// 1) 预算滑块：<div class="l5-budget"></div>
//    Rule 30 从单个 1 出发、在无限长直线上跑 t 步，第 t 行有 n = 2t+1 格。
//    对比三样东西：状态本身 n bit；描述 (x₀, 规则, t) 中随 t 变化的部分 ⌈log₂ t⌉ bit；
//    按描述去模拟要做的格子更新次数 t² + 2t，以及 n log₂ n 的时间预算。
// 2) 数值练习：<div class="l5-num" data-answer="20" data-tol="0.5" data-explain="…"></div>
//    学习者填一个数，误差 tol 以内算对。
(function () {
  const fmtInt = x => (x >= 1e7 ? x.toExponential(2).replace('e+', ' × 10^') : Math.round(x).toLocaleString('en-US'));

  function setupBudget(host) {
    const slider = document.createElement('input');
    Object.assign(slider, { type: 'range', min: 0, max: 120, value: 30 });
    slider.className = 'h-slider';
    slider.setAttribute('aria-label', '演化步数 t（对数刻度）');
    const out = document.createElement('div');
    out.className = 'l5-out';
    host.append(slider, out);

    function draw() {
      const t = Math.max(1, Math.round(10 ** (slider.value / 10)));   // 10⁰ … 10¹²
      const n = 2 * t + 1;
      const desc = Math.ceil(Math.log2(t));
      const cost = t * t + 2 * t;
      const budget = n * Math.log2(n);
      const ok = cost <= budget;
      out.innerHTML = `
        <table>
          <tr><th class="l">步数 t</th><td class="mono">${fmtInt(t)}</td></tr>
          <tr><th class="l">状态长度 n = 2t+1</th><td class="mono">${fmtInt(n)} bit</td></tr>
          <tr><th class="l">描述里随 t 变的部分 ⌈log₂ t⌉</th><td class="mono">${desc} bit（另加常数 c）</td></tr>
          <tr><th class="l">按描述模拟的更新次数 t² + 2t</th><td class="mono">${fmtInt(cost)}</td></tr>
          <tr><th class="l">时间预算 n log₂ n</th><td class="mono">${fmtInt(budget)}</td></tr>
        </table>
        <p class="feedback ${ok ? 'ok' : 'bad'}">${ok
          ? '在预算内：这个短描述在时间受限的定义下仍然算数。'
          : '超出预算：这个短描述在时间受限的定义下不算数了。'}</p>`;
    }
    slider.addEventListener('input', draw);
    draw();
  }

  function setupNum(host) {
    const ans = Number(host.dataset.answer), tol = Number(host.dataset.tol || 0.5);
    const bar = document.createElement('div');
    const input = document.createElement('input');
    Object.assign(input, { type: 'text', inputMode: 'decimal', placeholder: host.dataset.placeholder || '?' });
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
      const g = parseFloat(input.value);
      if (Number.isNaN(g)) { fb.className = 'feedback bad'; fb.textContent = '先填一个数。'; return; }
      const ok = Math.abs(g - ans) <= tol;
      fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
      fb.textContent = ok ? '对。' + host.dataset.explain : (host.dataset.hint || '还不对，再算一遍。');
    };
    reveal.onclick = () => { fb.className = 'feedback'; fb.textContent = host.dataset.explain; };
  }

  document.querySelectorAll('.l5-budget').forEach(setupBudget);
  document.querySelectorAll('.l5-num').forEach(setupNum);
})();
