// Keep management controls hidden when a page is embedded in any frame.
// The initial style also blocks interaction when framed scripts are sandboxed.
(() => {
  if (window.self === window.top) {
    document.getElementById("frame-guard-style")?.remove();
  } else {
    window.stop();
  }
})();
