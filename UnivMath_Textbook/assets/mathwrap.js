/* 行内数式（$…$）が本文の幅より長いとき（等式の長い連鎖など），その数式だけを
   横スクロールできる 1 行のブロックに切り替える．MathJax 3 は自動改行をしないので，
   狭い画面でページ全体が横にはみ出すのを防ぐためのもの．画面幅が変わったら判定し直す． */
(function () {
  function fit() {
    var list = document.querySelectorAll('main mjx-container[jax="CHTML"]:not([display="true"])');
    Array.prototype.forEach.call(list, function (m) {
      var p = m.parentElement;
      if (!p) return;
      m.classList.remove('math-wide');
      var avail = p.clientWidth || p.getBoundingClientRect().width;
      if (avail && m.getBoundingClientRect().width > avail - 2) m.classList.add('math-wide');
    });
  }
  function start() {
    if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
      MathJax.startup.promise.then(fit);
      var t;
      window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 200); });
    } else {
      setTimeout(start, 200);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
