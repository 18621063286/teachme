// 温度滑块。用法：<div class="temp-widget" data-labels="h,e,l,o" data-logits="1,2.2,-3,4.1"></div>
(function () {
  function setup(box) {
    const labels = box.dataset.labels.split(',');
    const y = box.dataset.logits.split(',').map(Number);
    box.innerHTML = '<label>温度 T = <strong class="tv"></strong></label>' +
      '<input class="h-slider" type="range" min="-2.3" max="1.61" step="0.01" value="0" aria-label="温度（对数刻度）">' +
      '<div class="bars"></div><p class="rd" aria-live="polite"></p>';
    const s = box.querySelector('input'), bars = box.querySelector('.bars');
    function render() {
      const T = Math.exp(Number(s.value));
      const m = Math.max(...y.map((v) => v / T));
      const e = y.map((v) => Math.exp(v / T - m));
      const z = e.reduce((a, b) => a + b, 0);
      const p = e.map((v) => v / z);
      const H = -p.reduce((a, v) => a + (v > 0 ? v * Math.log2(v) : 0), 0);
      box.querySelector('.tv').textContent = T.toFixed(2);
      bars.innerHTML = labels.map((c, i) => '<span>' + c + '</span><span><span class="bar" style="display:block;width:' +
        (p[i] * 100).toFixed(1) + '%"></span></span><span>' + p[i].toFixed(3) + '</span>').join('');
      box.querySelector('.rd').textContent = '分布的熵 H = ' + H.toFixed(3) + ' bit（4 个字符最多 2 bit）';
    }
    s.addEventListener('input', render);
    render();
  }
  document.querySelectorAll('.temp-widget').forEach(setup);
})();
