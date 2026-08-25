/* 発展教材の閲覧ガード．
   4冊（マテリアル計算科学・固体物理学・密度汎関数理論・線形応答理論）は
   どれも同じパスワードで開くので，保存キーも共通の1つに統一してある．
   education.html で一度パスワードを確認すれば，このタブでは4冊すべてが開く．
   4つの *_Textbook/assets/access-guard.js は，
   下の ACCESS_KEY と ACCESS_VALUE を必ず同じ値にしておくこと
   （違うのは最後の行の戻り先アンカーだけである）． */
(function () {
  var ACCESS_KEY = 'textbookAccess';
  var ACCESS_VALUE = 'verified-2026-08';
  var allowed = false;

  try {
    allowed = sessionStorage.getItem(ACCESS_KEY) === ACCESS_VALUE;
  } catch (e) {
    allowed = false;
  }

  if (!allowed) {
    document.documentElement.style.display = 'none';
    window.location.replace('../education.html#compmatsci-textbook');
  }
})();
