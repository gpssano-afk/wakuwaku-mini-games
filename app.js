/* Shared PWA setup. Relative URLs also work under a GitHub Pages repository. */
(() => {
  "use strict";
  const root = new URL("./", document.currentScript.src);
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(new URL("service-worker.js", root), { scope: root.pathname, updateViaCache: "none" })
        .catch(error => console.warn("オフライン対応を開始できませんでした。", error));
    });
  }

  // A short visual explanation appears once when entering any game.
  // No storage or tracking: reopening the game shows it again.
  const current = window.location.pathname.match(/\/games\/(hitofude|block-fit|rail-connect|cube-fit)\/index\.html$/);
  if (!current) return;
  const guides = {
    hitofude: {
      name: "ピカッとひとふで", hero:"💡",
      steps:[["🔋","でんちから はじめよう"],["☝️","ゆびで なぞって でんきを つけよう"],["✨","ぜんぶ ひかったら クリア！"]]
    },
    "block-fit": {
      name: "ブロックぴったり", hero:"🧩",
      steps:[["👆","ブロックを ゆびで つかもう"],["⬜","マスに うごかして はめよう"],["🌟","すきまなく うめたら クリア！"]]
    },
    "rail-connect": {
      name: "レールつなぎ", hero:"🚂",
      steps:[["↻","きいろい わくの レールを タップ！"],["🔒","ほかの レールは うごかないよ"],["🚂","えきから ゴールまで つなごう！"]]
    },
    "cube-fit": {
      name: "キューブぴったり", hero:"🧊",
      steps:[["👀","かけている ところを みよう"],["①②③","したの 3つから ひとつ えらぼう"],["✨","ぴったりだと キューブが かんせい！"]]
    }
  };
  const guide = guides[current[1]];
  const main = document.querySelector("main"), meta = main?.querySelector(".stage-meta");
  if (!main || !meta) return;
  const help = document.createElement("button");
  help.type = "button";
  help.className = "howto-help";
  help.textContent = "？";
  help.setAttribute("aria-label","あそびかたを みる");
  help.title = "あそびかた";
  meta.append(help);

  const overlay = document.createElement("div");
  overlay.id = "howto-overlay";
  overlay.className = "howto-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role","dialog");
  overlay.setAttribute("aria-modal","true");
  overlay.setAttribute("aria-labelledby","howto-title");
  const rows = guide.steps.map(([icon,tip]) =>
    `<li class="howto-step"><span class="howto-step-icon" aria-hidden="true">${icon}</span><span>${tip}</span></li>`
  ).join("");
  overlay.innerHTML = `<div class="howto-card">
    <div class="howto-hero" aria-hidden="true">${guide.hero}</div>
    <p class="howto-kicker">あそびかた</p>
    <h2 id="howto-title">${guide.name}</h2>
    <ol class="howto-steps">${rows}</ol>
    <button id="howto-start" class="howto-start" type="button">あそぶ！</button>
  </div>`;
  document.body.append(overlay);
  const startButton = overlay.querySelector("#howto-start");
  let fromHelp = false;
  function openGuide(reopen=false) {
    fromHelp = reopen;
    overlay.hidden=false;
    main.inert=true;
    document.body.classList.add("howto-active");
    startButton.focus({preventScroll:true});
  }
  function closeGuide() {
    overlay.hidden=true;
    main.inert=false;
    document.body.classList.remove("howto-active");
    if(fromHelp) help.focus({preventScroll:true});
  }
  help.addEventListener("click",()=>openGuide(true));
  startButton.addEventListener("click",closeGuide);
  overlay.addEventListener("keydown",event=>{
    if(event.key==="Escape"){event.preventDefault();closeGuide();}
    if(event.key==="Tab"){event.preventDefault();startButton.focus();}
  });
  openGuide();
})();
