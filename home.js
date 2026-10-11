/* Add one entry here to add a game card. Order in this array is display order. */
(() => {
  "use strict";
  const games = [
    {
      id: "hitofude", title: "ピカッとひとふで", category: "ひらめきパズル",
      description: "でんちから、ぜんぶのマスを つないでみよう！",
      href: "./games/hitofude/difficulty.html", image: "./assets/games/hitofude.svg"
    },
    {
      id: "block-fit", title: "ブロックぴったり", category: "かたちパズル",
      description: "あいたところに ぴったりの ブロックを おこう！",
      href: "./games/block-fit/difficulty.html", image: "./assets/games/block-fit.svg"
    },
    {
      id: "rail-connect", title: "レールつなぎ", category: "つなげパズル",
      description: "でんしゃが とおるように レールを つないでみよう！",
      href: "./games/rail-connect/difficulty.html", image: "./assets/games/rail-connect.svg"
    },
    {
      id: "cube-fit", title: "キューブぴったり", category: "くうかんパズル",
      description: "あいた ぶぶんに はまる かたちを えらぼう！",
      href: "./games/cube-fit/difficulty.html", image: "./assets/games/cube-fit.svg"
    }
  ];
  const container = document.getElementById("games");
  if (!container) return;
  function span(className, text) {
    const element = document.createElement("span");
    element.className = className;
    element.textContent = text;
    return element;
  }
  for (const game of games) {
    const card = document.createElement("a");
    card.className = "game-card";
    card.dataset.game = game.id;
    card.href = game.href;
    card.setAttribute("aria-label", `${game.title}で あそぶ`);
    const art = span("game-art", "");
    art.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.src = game.image;
    image.alt = "";
    image.width = 400;
    image.height = 250;
    // Fixed aspect ratio remains even when a local image cannot load.
    image.addEventListener("error", () => {
      image.hidden = true;
      art.append(span("art-fallback", game.title));
    }, { once: true });
    art.append(image);
    const copy = document.createElement("div");
    copy.className = "game-copy";
    const title = document.createElement("h3");
    title.className = "game-title";
    title.textContent = game.title;
    const play = span("play-label", "あそぶ");
    const arrow = span("play-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    play.append(arrow);
    const description = span("game-description", "");
    for (const phrase of game.description.match(/[^\s、]+、?|\s+/gu) || []) {
      description.append(/\s/u.test(phrase) ? document.createTextNode(phrase) : span("description-phrase", phrase));
    }
    copy.append(span("game-tag", game.category), title, description, play);
    card.append(art, copy);
    container.append(card);
  }
})();
