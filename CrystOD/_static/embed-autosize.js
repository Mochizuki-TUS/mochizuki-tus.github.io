/*
  Fit the embedded-output iframes (_static/embed/*.html) to their content.

  The pages embed two different kinds of document, and a single fixed `height`
  attribute cannot serve both:

    * flow documents (molecule_to_crystal_simulator, MolOD_*, CrystalOD_*,
      Multiplet_*, SUBGROUP_*) have a natural height that depends on how wide
      the frame is -- the diagrams stack their side panel below the diagram
      when the frame is 720px wide or less -- so any fixed height clips them
      or leaves a blank strip at some window size.  Measured at the frame
      widths of the theme, the ScF3 diagram opened on R is 1245-1288px tall
      stacked (frames of 666-720px) and 702-730px side by side (722-788px).

    * the 3D viewers (SALC_*, BZ_*, phonon_visualize_*) are laid out in
      viewport units (`height:100vh` / `95vh`), which inside an iframe means
      "the height of the frame".  They already fill whatever they are given,
      and their scrollHeight only ever mirrors the frame, so they must be left
      alone.

  Same-origin (the published https site, or any http server): the content is
  measured once with the frame collapsed and once with it very tall.  The
  height of the <body> box tells the two kinds apart -- a flow document's body
  keeps its height, a viewport-sized body follows the frame -- and a flow
  document then gets its exact scrollHeight.  (The document element itself
  cannot be used for this test: its scrollHeight is never smaller than the
  frame, so every document shorter than the tall probe would look
  viewport-sized and keep a too-tall declared height.)  The measurement is
  done and undone within one task, so the browser never paints the collapsed
  state.

  Cross-origin (the local build opened through file://, where Chrome gives
  every file its own origin, so contentDocument is null): nothing can be
  measured, and the declared heights are used.  A flow document that restacks
  declares two of them, measured beforehand:

      <iframe ... height="740" data-narrow-height="1300" data-narrow-width="720">

  `height` is used while the frame is wider than `data-narrow-width` pixels
  (its inner width, the width the embedded document's media queries see) and
  `data-narrow-height` otherwise; the width is re-read whenever the column is
  resized.  Frames without the two data attributes keep their `height`.
*/

(function () {
  "use strict";

  // the content is measured at two very different frame heights; a document
  // whose height is its own gives the same answer twice, one laid out in
  // viewport units follows the frame
  var PROBE_SMALL = 60;
  var PROBE_LARGE = 2000;
  var TOLERANCE = 4;

  function embedFrames() {
    return Array.prototype.filter.call(
      document.querySelectorAll("iframe"),
      function (frame) {
        return frame.src.indexOf("/_static/embed/") !== -1;
      }
    );
  }

  // the height the page declares for the frame at its present width
  function declaredHeight(frame) {
    var wide = parseFloat(frame.getAttribute("height")) || 0;
    var narrow = parseFloat(frame.getAttribute("data-narrow-height"));
    var limit = parseFloat(frame.getAttribute("data-narrow-width"));
    if (!isNaN(narrow) && !isNaN(limit) && frame.clientWidth > 0 &&
        frame.clientWidth <= limit) {
      return narrow;
    }
    return wide;
  }

  function useDeclared(frame) {
    var height = declaredHeight(frame);
    if (height > 0) {
      frame.style.height = height + "px";
    }
  }

  function contentHeight(doc) {
    return Math.max(
      doc.documentElement ? doc.documentElement.scrollHeight : 0,
      doc.body ? doc.body.scrollHeight : 0
    );
  }

  // the height of the body box itself (with its margins): unlike the
  // scrollHeight of the document element, it is not clamped to the frame
  function bodyHeight(doc) {
    var body = doc.body;
    var style = doc.defaultView ? doc.defaultView.getComputedStyle(body) : null;
    var margins = style
      ? (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
      : 0;
    return body.getBoundingClientRect().height + margins;
  }

  function fit(frame) {
    var doc;
    try {
      doc = frame.contentDocument;
    } catch (e) {
      doc = null;
    }
    if (!doc) {
      // cross-origin (file://): nothing to measure, use the declared height
      useDeclared(frame);
      return;
    }
    if (!doc.body || doc.URL === "about:blank" || frame.getClientRects().length === 0) {
      // not loaded yet (lazy frame), or not rendered (inside a closed
      // dropdown, where every probe would read 0): size it as declared; the
      // resize observer fits it once it is shown
      useDeclared(frame);
      return;
    }

    // the height declared in the .md file is the floor for anything that
    // sizes itself against the frame
    var declared = declaredHeight(frame);

    frame.style.height = PROBE_SMALL + "px";
    var small = contentHeight(doc);
    var bodySmall = bodyHeight(doc);
    frame.style.height = PROBE_LARGE + "px";
    var bodyLarge = bodyHeight(doc);

    if (Math.abs(bodyLarge - bodySmall) <= TOLERANCE) {
      // height independent of the frame: fit it exactly, which both reveals
      // what a too-short frame was hiding and reclaims a too-tall one
      frame.style.height = Math.ceil(small) + "px";
    } else {
      // the document stretches with the frame (95vh/100vh viewers, possibly
      // with flow content above them): never shrink it below what the page
      // asked for, but still grow if the flow part alone needs more
      frame.style.height = Math.ceil(Math.max(declared, small)) + "px";
    }
  }

  function fitAll() {
    embedFrames().forEach(fit);
  }

  function watch(frame) {
    // `loading="lazy"` means load fires when the frame scrolls into view
    frame.addEventListener("load", function () {
      fit(frame);
      // the content can settle after load (fonts, canvas sizing); re-fit once
      // the browser has laid it out
      requestAnimationFrame(function () {
        fit(frame);
      });
    });
    fit(frame);
  }

  function start() {
    var frames = embedFrames();
    frames.forEach(watch);

    // the natural height depends on the frame width (the embeds restack at
    // 720px), so re-fit whenever the column is resized -- this also covers
    // the right-hand table of contents being toggled
    if (window.ResizeObserver && frames.length) {
      var pending = null;
      var observer = new ResizeObserver(function () {
        if (pending) {
          return;
        }
        pending = requestAnimationFrame(function () {
          pending = null;
          fitAll();
        });
      });
      frames.forEach(function (frame) {
        if (frame.parentElement) {
          observer.observe(frame.parentElement);
        }
      });
    } else {
      window.addEventListener("resize", fitAll);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
