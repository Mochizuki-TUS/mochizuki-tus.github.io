/* Access guard for the advanced textbooks (English edition).
   The four protected books (Computational Materials Science, Solid State Physics,
   Density Functional Theory, Linear Response Theory) share one password and one
   storage key: once the password is confirmed on education-en.html, all of them
   open in this tab. ACCESS_KEY and ACCESS_VALUE must match the other
   access-guard.js files; only the return anchor in the last line differs. */
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
    window.location.replace('../education-en.html#compmatsci-textbook');
  }
})();
