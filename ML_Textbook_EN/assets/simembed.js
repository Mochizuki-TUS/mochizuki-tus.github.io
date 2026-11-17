/* 章に埋め込んだシミュレーター（iframe.qsim-embed）の高さを，シミュレーター側から届く
   postMessage({qsim:'height', height:h}) に合わせて変える受け側．200〜8000 px の範囲だけ受け付け，
   送り主が本ページの iframe.qsim-embed であるときだけ反映する（CompMatSci_Textbook の受け側と同じ動作）．
   章の head で <script src="assets/simembed.js" defer></script> として読む． */
(function () {
  if (window.__qsimEmbedResize) return;
  window.__qsimEmbedResize = 1;
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.qsim !== 'height') return;
    var h = Number(d.height);
    if (!(h > 200 && h < 8000)) return;
    var fs = document.querySelectorAll('iframe.qsim-embed');
    for (var i = 0; i < fs.length; i++) {
      if (fs[i].contentWindow === e.source) {
        fs[i].style.height = Math.ceil(h) + 'px';
        return;
      }
    }
  });
})();
