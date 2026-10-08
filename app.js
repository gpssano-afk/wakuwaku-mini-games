/* Shared PWA setup. Relative URLs also work under a GitHub Pages repository. */
(() => {
  "use strict";
  const root = new URL("./", document.currentScript.src);
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(new URL("service-worker.js", root), { scope: root.pathname })
        .catch(error => console.warn("オフライン対応を開始できませんでした。", error));
    });
  }
})();
