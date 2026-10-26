// 第 4 课组件：两段式描述。
//
// 1) 计数集合滑块：<div class="tp-slider" data-n="1000"></div>
//    S = {长度 n、恰有 k 个 1 的串}。拖 k，看在 S 里指名一个元素要多少位（log₂ C(n,k)），
//    并与第 2 课的 n·h(k/n) 对照。
// 2) 数值题：<div class="num-q" data-answer="17.30" data-tol="0.1"
//               data-hint="…" data-explain="…"></div>
//    学习者填数，误差在 tol 以内算对。
(function () {
  const log2C = (n, k) => {           // log₂ C(n, k)，逐项累加避免溢出
    let s = 0;
    for (let i = 1; i <= k; i++) s += Math.log2(n - k + i) - Math.log2(i);
    return s;
  };
  const plogp = p => (p > 0 ? p * Math.log2(p) : 0);
  const h = p => -plogp(p) - plogp(1 - p);

  function setupSlider(host) {
    const n = Number(host.dataset.n || 1000);
    const slider = document.createElement('input');
    Object.assign(slider, { type: 'range', min: 0, max: n, value: Math.round(n / 100) });
    slider.className = 'h-slider';
    slider.setAttribute('aria-label', 'k：1 的个数');
    const out = document.createElement('p');
    out.className = 'h-readout';
    host.append(slider, out);
    function draw() {
      const k = Number(slider.value);
      out.innerHTML = `n = ${n}，k = ${k}　·　逐位照抄：${n} 位　·　<strong>在 S 里指名下标：log₂ C(n,k) = ${log2C(n, k).toFixed(2)} 位</strong>　·　n·h(k/n) = ${(n * h(k / n)).toFixed(2)} 位`;
    }
    slider.addEventListener('input', draw);
    draw();
  }

  function setupNum(host) {
    const ans = Number(host.dataset.answer), tol = Number(host.dataset.tol || 0.01);
    const bar = document.createElement('div');
    const input = document.createElement('input');
    Object.assign(input, { type: 'text', inputMode: 'decimal', placeholder: '? 位' });
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
      fb.textContent = ok ? '对。' + host.dataset.explain : '还不对。' + host.dataset.hint;
    };
    reveal.onclick = () => { fb.className = 'feedback'; fb.textContent = host.dataset.explain; };
  }

  document.querySelectorAll('.tp-slider').forEach(setupSlider);
  document.querySelectorAll('.num-q').forEach(setupNum);
})();
