(() => {
  "use strict";
  const key = cell => `${cell.row},${cell.col}`;
  function createState(puzzle) { return { puzzle, placements: new Map(), cleared: false }; }
  function canPlace(state, id, row, col) {
    const piece = state.puzzle.pieces.find(p => p.id === id);
    if (!piece || !Number.isInteger(row) || !Number.isInteger(col)) return false;
    const occupied = new Set();
    for (const other of state.puzzle.pieces) {
      const at = state.placements.get(other.id);
      if (at && other.id !== id) for (const cell of other.cells) occupied.add(key({row:at.row + cell.row,col:at.col + cell.col}));
    }
    return piece.cells.every(c => row + c.row >= 0 && col + c.col >= 0 && row + c.row < state.puzzle.rows &&
      col + c.col < state.puzzle.cols && !occupied.has(key({row:row + c.row,col:col + c.col})));
  }
  function isComplete(state) {
    if (state.placements.size !== state.puzzle.pieces.length) return false;
    const occupied = new Set();
    for (const piece of state.puzzle.pieces) {
      const at = state.placements.get(piece.id);
      if (!at || !canPlace(state, piece.id, at.row, at.col)) return false;
      for (const cell of piece.cells) occupied.add(key({row:at.row + cell.row,col:at.col + cell.col}));
    }
    return occupied.size === state.puzzle.rows * state.puzzle.cols;
  }
  function place(state, id, row, col) {
    if (state.cleared || !canPlace(state, id, row, col)) return false;
    state.placements.set(id, {row, col}); state.cleared = isComplete(state); return true;
  }
  function remove(state, id) {
    if (state.cleared) return false;
    return state.placements.delete(id);
  }
  window.BlockFit = Object.freeze({createState, canPlace, place, remove, isComplete});
  const board = document.getElementById("block-board");
  if (!board) return;
  const tray = document.getElementById("piece-tray"), overlay = document.getElementById("clear-overlay");
  const next = document.getElementById("next"), hint = document.getElementById("hint");
  const announcement = document.getElementById("announcement");
  const difficulty = new URLSearchParams(location.search).get("difficulty") === "hard" ? "hard" : "easy";
  const colors = ["#f4a35d", "#78c5e5", "#8ec9a2", "#b7a0df", "#f4d463"];
  const labels = ["オレンジ", "みずいろ", "みどり", "むらさき", "きいろ"];
  const NS = "http://www.w3.org/2000/svg";
  let puzzle, state, number = 0, drag = null;
  const SET_SIZE = 10;
  const progress = document.getElementById("set-progress");
  const setComplete = document.getElementById("set-complete");
  const replayButton = document.getElementById("set-play-again");
  const progressSteps = Array.from({length:SET_SIZE}, () => {
    const segment = document.createElement("span");
    segment.className = "set-progress-step";
    segment.setAttribute("aria-hidden", "true");
    progress.append(segment);
    return segment;
  });
  function drawProgress() {
    const completed = Math.min(SET_SIZE, Math.max(0, number - 1 + (state.cleared ? 1 : 0)));
    progressSteps.forEach((segment, i) => segment.classList.toggle("is-done", i < completed));
    progress.setAttribute("aria-valuenow", String(completed));
    document.getElementById("stage-number").textContent = "もんだい " + number + " / " + SET_SIZE;
  }

  document.getElementById("difficulty-label").textContent = difficulty === "hard" ? "むずかしい" : "かんたん";
  function dimensions(piece) { return {rows:Math.max(...piece.cells.map(c => c.row)) + 1,cols:Math.max(...piece.cells.map(c => c.col)) + 1}; }
  function art(piece) {
    const {rows, cols} = dimensions(piece), svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${cols * 100} ${rows * 100}`); svg.setAttribute("aria-hidden", "true");
    for (const cell of piece.cells) {
      const rect = document.createElementNS(NS, "rect");
      for (const [name, value] of Object.entries({x:cell.col * 100 + 4,y:cell.row * 100 + 4,width:92,height:92,rx:16,
        fill:colors[piece.color],stroke:"#42536b","stroke-width":3})) rect.setAttribute(name, value);
      svg.append(rect);
    }
    return svg;
  }
  function cancelDrag() {
    if (!drag) return;
    const previous = drag; drag = null;
    previous.element.classList.remove("dragging"); previous.floating.remove(); previous.preview.remove();
    if (previous.element.hasPointerCapture(previous.pointerId)) previous.element.releasePointerCapture(previous.pointerId);
  }
  function render() {
    cancelDrag(); board.replaceChildren(); tray.replaceChildren();
    board.style.setProperty("--columns", puzzle.cols); board.style.setProperty("--rows", puzzle.rows);
    tray.classList.toggle("piece-tray--hard", difficulty === "hard");
    for (let i = 0; i < puzzle.rows * puzzle.cols; i++) { const cell = document.createElement("span"); cell.className = "board-cell"; board.append(cell); }
    for (const piece of puzzle.pieces) {
      const button = document.createElement("button"), d = dimensions(piece), at = state.placements.get(piece.id);
      button.type = "button"; button.className = "piece"; button.dataset.piece = piece.id;
      button.setAttribute("aria-label", `${labels[piece.color]}のブロック${at ? "。はめたところから うごかせるよ" : ""}`);
      button.style.setProperty("--tray-unit", `${Math.min(27, 84 / d.rows)}px`);
      button.style.setProperty("--piece-columns", d.cols); button.style.setProperty("--piece-rows", d.rows); button.append(art(piece));
      if (at) {
        button.classList.add("placed-piece"); button.style.left = `${at.col / puzzle.cols * 100}%`; button.style.top = `${at.row / puzzle.rows * 100}%`;
        button.style.width = `${d.cols / puzzle.cols * 100}%`; button.style.height = `${d.rows / puzzle.rows * 100}%`; board.append(button);
      } else { const slot = document.createElement("div"); slot.className = "piece-slot"; if (difficulty === "easy" && d.cols === 4) slot.style.gridColumn = "1 / -1"; slot.append(button); tray.append(slot); }
      button.addEventListener("pointerdown", event => startDrag(event, piece, button));
      button.addEventListener("pointermove", moveDrag); button.addEventListener("pointerup", drop);
      button.addEventListener("pointercancel", cancelDrag);
      button.addEventListener("lostpointercapture", () => { if (drag?.element === button) cancelDrag(); });
    }
    board.dataset.question = String(number); board.dataset.placed = String(state.placements.size); board.dataset.cleared = String(state.cleared);
    board.dataset.difficulty = difficulty;
    drawProgress();
    document.getElementById("tray-title").hidden = !tray.children.length;
    hint.textContent = state.cleared ? "ぴったり はまったね！" : "ブロックを もって はめよう！";
    const finalClear = state.cleared && number === SET_SIZE;
    overlay.hidden = !state.cleared || finalClear;
    setComplete.hidden = !finalClear;
    if (state.cleared) {
      announcement.textContent = finalClear ? "ぜんぶ できた！ 10もん クリア！" : "できた！";
      (finalClear ? replayButton : next).focus({preventScroll:true});
    }
  }
  function startDrag(event, piece, element) {
    if (drag || state.cleared || event.isPrimary === false || event.button !== 0) return;
    event.preventDefault();
    const rect = element.getBoundingClientRect(), d = dimensions(piece);
    const floating = art(piece), preview = art(piece);
    floating.classList.add("floating-piece"); preview.classList.add("placement-preview");
    document.body.append(floating); board.append(preview);
    drag = {piece, element, floating, preview, pointerId:event.pointerId,
      grabX:(event.clientX - rect.left) / rect.width * d.cols, grabY:(event.clientY - rect.top) / rect.height * d.rows,
      offset:event.pointerType === "touch" ? 24 : 0, target:null};
    element.classList.add("dragging"); element.setPointerCapture(event.pointerId); moveDrag(event);
  }
  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const b = board.getBoundingClientRect(), unit = b.width / puzzle.cols, d = dimensions(drag.piece);
    const left = event.clientX - drag.grabX * unit, top = event.clientY - drag.grabY * unit - drag.offset;
    Object.assign(drag.floating.style, {left:`${left}px`,top:`${top}px`,width:`${d.cols * unit}px`,height:`${d.rows * unit}px`});
    const row = Math.round((top - b.top) / unit), col = Math.round((left - b.left) / unit);
    const near = event.clientX >= b.left && event.clientX <= b.right && event.clientY - drag.offset >= b.top && event.clientY - drag.offset <= b.bottom;
    const valid = near && canPlace(state, drag.piece.id, row, col);
    drag.target = valid ? {row, col} : null;
    drag.preview.style.display = near ? "" : "none";
    Object.assign(drag.preview.style, {left:`${col * unit}px`,top:`${row * unit}px`,width:`${d.cols * unit}px`,height:`${d.rows * unit}px`});
    drag.preview.classList.toggle("invalid", !valid);
  }
  function drop(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    moveDrag(event);
    const {piece, target} = drag, trayBounds = tray.getBoundingClientRect();
    const toTray = event.clientX >= trayBounds.left && event.clientX <= trayBounds.right && event.clientY >= trayBounds.top && event.clientY <= trayBounds.bottom;
    const changed = target ? place(state, piece.id, target.row, target.col) : toTray && remove(state, piece.id);
    cancelDrag(); render();
    if (!changed) { hint.textContent = "ここには おけないよ。べつのところへ！"; announcement.textContent = hint.textContent; }
  }
  document.getElementById("reset").addEventListener("click", () => { state = createState(puzzle); announcement.textContent = ""; render(); });
  function newPuzzle() { cancelDrag(); number++; puzzle = window.BlockFitGenerator.generate(difficulty, Math.random, number); state = createState(puzzle); announcement.textContent = ""; render(); }
  next.addEventListener("click", () => { if (state.cleared && number < SET_SIZE) newPuzzle(); });
  replayButton.addEventListener("click", () => { number = 0; newPuzzle(); });
  window.addEventListener("blur", cancelDrag); window.addEventListener("pagehide", cancelDrag); window.addEventListener("resize", cancelDrag);
  newPuzzle();
})();
