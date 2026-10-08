(() => {
  "use strict";
  const key = cell => `${cell.row},${cell.col}`;
  const same = (a, b) => a.row === b.row && a.col === b.col;
  const adjacent = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

  function createState(stage) {
    return { stage, path: [], visited: new Set(), lit: new Set(), cleared: false,
      blocked: new Set(stage.blocked.map(key)), bulbs: new Set(stage.bulbs.map(key)),
      walkableCount: stage.rows * stage.cols - stage.blocked.length };
  }

  function begin(state, cell) {
    const tip = state.path.length ? state.path[state.path.length - 1] : state.stage.battery;
    if (state.cleared || !same(tip, cell)) return false;
    if (!state.path.length) {
      state.path.push({ ...cell });
      state.visited.add(key(cell));
    }
    return true;
  }

  function move(state, cell) {
    const tip = state.path[state.path.length - 1];
    const id = key(cell);
    if (!tip || state.cleared || !Number.isInteger(cell.row) || !Number.isInteger(cell.col) ||
        cell.row < 0 || cell.row >= state.stage.rows || cell.col < 0 || cell.col >= state.stage.cols ||
        state.blocked.has(id) || state.visited.has(id) || !adjacent(tip, cell)) return false;
    state.path.push({ ...cell });
    state.visited.add(id);
    if (state.bulbs.has(id)) state.lit.add(id);
    state.cleared = state.visited.size === state.walkableCount;
    return true;
  }

  // Small solver for validation. Never runs during normal gameplay.
  function solve(stage) {
    const blocked = new Set(stage.blocked.map(key));
    const walkableCount = stage.rows * stage.cols - blocked.size;
    const path = [stage.battery];
    const visited = new Set([key(stage.battery)]);
    function search(cell) {
      if (visited.size === walkableCount) return path.map(item => ({ ...item }));
      for (const next of [
        { row: cell.row, col: cell.col + 1 }, { row: cell.row + 1, col: cell.col },
        { row: cell.row, col: cell.col - 1 }, { row: cell.row - 1, col: cell.col },
      ]) {
        const id = key(next);
        if (next.row < 0 || next.row >= stage.rows || next.col < 0 || next.col >= stage.cols ||
            blocked.has(id) || visited.has(id)) continue;
        visited.add(id);
        path.push(next);
        const result = search(next);
        if (result) return result;
        visited.delete(id);
        path.pop();
      }
      return null;
    }
    return search(stage.battery);
  }

  // The same functions are used by the UI and the plain browser test page.
  window.Hitofude = Object.freeze({ createState, begin, move, solve, adjacent });
  const board = document.getElementById("board");
  if (!board) return;

  const generator = window.HitofudeStages;
  const difficulty = new URLSearchParams(window.location.search).get("difficulty") === "hard" ? "hard" : "easy";
  document.getElementById("difficulty-label").textContent = difficulty === "hard" ? "むずかしい" : "かんたん";
  const overlay = document.getElementById("clear-overlay");
  const title = document.getElementById("clear-title");
  const nextButton = document.getElementById("next");
  const hint = document.getElementById("hint");
  const announcement = document.getElementById("announcement");
  let number = 1;
  let stage = generator.generate(difficulty);
  let state;
  let activePointer = null;
  let wire;
  let tipMarker;
  const bulbElements = new Map();
  const NS = "http://www.w3.org/2000/svg";

  function svg(tag, attributes = {}) {
    const element = document.createElementNS(NS, tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  }
  const center = cell => ({ x: (cell.col + .5) * 100, y: (cell.row + .5) * 100 });

  function drawBulb(cell) {
    const point = center(cell);
    const group = svg("g", { class: "bulb", transform: `translate(${point.x} ${point.y})`, "data-cell": key(cell) });
    group.append(
      svg("circle", { class: "bulb-halo", cx: 0, cy: -7, r: 35 }),
      svg("path", { class: "bulb-rays", d: "M0-40v-5M-28-29l-4-4M28-29l4-4M-35-7h-5M35-7h5" }),
      svg("circle", { class: "bulb-head", cx: 0, cy: -7, r: 21 }),
      svg("path", { class: "bulb-filament", d: "M-8-8 0 0 8-8M0 0v16" }),
      svg("rect", { class: "bulb-base", x: -11, y: 15, width: 22, height: 13, rx: 4 }),
      svg("path", { d: "M-7 21h14", stroke: "#fff", "stroke-width": 2 }),
    );
    bulbElements.set(key(cell), group);
    board.append(group);
  }

  function drawBattery(cell) {
    const point = center(cell);
    const group = svg("g", { transform: `translate(${point.x} ${point.y})` });
    group.append(
      svg("rect", { class: "battery-terminal", x: -10, y: -33, width: 20, height: 9, rx: 3 }),
      svg("rect", { class: "battery-body", x: -24, y: -25, width: 48, height: 55, rx: 8 }),
      svg("path", { class: "bolt", d: "M3-18-13 3H-2L-4 20 14-4H3Z" }),
    );
    board.append(group);
  }

  function endDrag() {
    const id = activePointer;
    activePointer = null;
    if (id !== null && board.hasPointerCapture(id)) board.releasePointerCapture(id);
  }

  function loadStage() {
    endDrag();
    state = createState(stage);
    board.replaceChildren();
    bulbElements.clear();
    board.setAttribute("viewBox", `0 0 ${state.stage.cols * 100} ${state.stage.rows * 100}`);
    for (let row = 0; row < state.stage.rows; row++) {
      for (let col = 0; col < state.stage.cols; col++) {
        const blocked = state.blocked.has(key({ row, col }));
        board.append(svg("rect", { class: blocked ? "blocked-cell" : "cell", x: col * 100 + 6, y: row * 100 + 6, width: 88, height: 88, rx: 14 }));
        if (blocked) board.append(svg("path", { class: "blocked-mark", d: `M${col * 100 + 40} ${row * 100 + 40}l20 20m0-20-20 20` }));
      }
    }
    wire = svg("path", { class: "wire", "pointer-events": "none" });
    tipMarker = svg("circle", { class: "tip", r: 10, "pointer-events": "none" });
    board.append(wire, tipMarker);
    state.stage.bulbs.forEach(drawBulb);
    drawBattery(state.stage.battery);
    document.getElementById("stage-number").textContent = `もんだい ${number}`;
    overlay.hidden = true;
    announcement.textContent = "";
    render();
  }

  function render() {
    wire.setAttribute("d", state.path.map((cell, i) => {
      const point = center(cell);
      return `${i ? "L" : "M"}${point.x} ${point.y}`;
    }).join(" "));
    const tip = state.path[state.path.length - 1];
    tipMarker.style.display = tip && !state.bulbs.has(key(tip)) && !same(tip, state.stage.battery) ? "" : "none";
    if (tip) {
      const point = center(tip);
      tipMarker.setAttribute("cx", point.x);
      tipMarker.setAttribute("cy", point.y);
    }
    bulbElements.forEach((element, id) => element.classList.toggle("lit", state.lit.has(id)));
    board.dataset.stage = String(number);
    board.dataset.difficulty = difficulty;
    board.dataset.pathLength = String(state.path.length);
    board.dataset.litCount = String(state.lit.size);
    board.dataset.cleared = String(state.cleared);
    board.setAttribute("aria-label", `だい${number}もん。${state.walkableCount}マスのうち${state.visited.size}マスを とおったよ。でんちから ぜんぶのマスを なぞってね。キーボードでは やじるしキーで すすめるよ。`);
    hint.textContent = state.cleared ? "ぜんぶのマスを とおれたね！" :
      state.path.length ? "せんの さきから のこりのマスへ！" : "でんちから ぜんぶのマスを なぞってね";
    if (state.cleared && overlay.hidden) {
      title.textContent = "できた！";
      nextButton.textContent = "つぎへ";
      overlay.hidden = false;
      announcement.textContent = title.textContent;
      nextButton.focus({ preventScroll: true });
    }
  }

  function cellAt(event) {
    const rect = board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    return { row: Math.floor(y / rect.height * state.stage.rows), col: Math.floor(x / rect.width * state.stage.cols) };
  }

  function advance(cell) {
    const tip = state.path[state.path.length - 1];
    if (!tip || same(tip, cell) || state.cleared) return false;
    // Fast straight sweeps still visit each intermediate neighbor. Stop at the
    // first blocked/visited cell. A diagonal target is always rejected.
    if (tip.row !== cell.row && tip.col !== cell.col) return false;
    const dr = Math.sign(cell.row - tip.row);
    const dc = Math.sign(cell.col - tip.col);
    let changed = false;
    let current = tip;
    while (!same(current, cell)) {
      const next = { row: current.row + dr, col: current.col + dc };
      if (!move(state, next)) break;
      changed = true;
      current = next;
    }
    return changed;
  }

  board.addEventListener("pointerdown", event => {
    if (activePointer !== null || event.isPrimary === false || event.button !== 0) return;
    const cell = cellAt(event);
    if (!cell || !begin(state, cell)) return;
    event.preventDefault();
    activePointer = event.pointerId;
    board.setPointerCapture(event.pointerId);
    render();
  });
  board.addEventListener("pointermove", event => {
    if (event.pointerId !== activePointer) return;
    event.preventDefault();
    // Coalesced samples help on touchscreens without adding any dependency.
    const samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
    let changed = false;
    for (const sample of [...samples, event]) {
      const cell = cellAt(sample);
      if (cell) changed = advance(cell) || changed;
    }
    if (changed) render();
  });
  board.addEventListener("pointerup", event => {
    if (event.pointerId !== activePointer) return;
    const cell = cellAt(event);
    if (cell && advance(cell)) render();
    endDrag();
  });
  board.addEventListener("pointercancel", event => { if (event.pointerId === activePointer) endDrag(); });
  board.addEventListener("lostpointercapture", event => { if (event.pointerId === activePointer) activePointer = null; });
  window.addEventListener("blur", endDrag);
  window.addEventListener("pagehide", endDrag);

  board.addEventListener("keydown", event => {
    const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const direction = directions[event.key];
    if (!direction || state.cleared) return;
    event.preventDefault();
    if (!state.path.length) begin(state, state.stage.battery);
    const tip = state.path[state.path.length - 1];
    move(state, { row: tip.row + direction[0], col: tip.col + direction[1] });
    render();
  });
  document.getElementById("reset").addEventListener("click", loadStage);
  nextButton.addEventListener("click", () => {
    if (!state.cleared) return;
    stage = generator.generate(difficulty);
    number++;
    loadStage();
    board.focus({ preventScroll: true });
  });
  loadStage();
})();
