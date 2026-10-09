(() => {
  "use strict";
  const key = cell => `${cell.row},${cell.col}`;
  const adjacent = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

  function isValid(stage, path = stage?.solution) {
    if (!stage || !Number.isInteger(stage.rows) || !Number.isInteger(stage.cols) ||
        stage.rows < 1 || stage.cols < 1 || !Array.isArray(path) || path.length < 2 ||
        !Array.isArray(stage.blocked) || !Array.isArray(stage.bulbs) || !stage.battery) return false;
    const inside = cell => cell && Number.isInteger(cell.row) && Number.isInteger(cell.col) &&
      cell.row >= 0 && cell.row < stage.rows && cell.col >= 0 && cell.col < stage.cols;
    if (!stage.blocked.every(inside) || !stage.bulbs.every(inside) || !inside(stage.battery)) return false;
    const blocked = new Set(stage.blocked.map(key));
    const visited = new Set();
    if (blocked.size !== stage.blocked.length || path.length !== stage.rows * stage.cols - blocked.size ||
        !inside(path[0]) || key(path[0]) !== key(stage.battery)) return false;
    for (let i = 0; i < path.length; i++) {
      const cell = path[i];
      if (!inside(cell) || blocked.has(key(cell)) || visited.has(key(cell)) ||
          (i && !adjacent(path[i - 1], cell))) return false;
      visited.add(key(cell));
    }
    const bulbs = new Set(stage.bulbs.map(key));
    return bulbs.size === stage.bulbs.length && bulbs.size === visited.size - 1 &&
      !bulbs.has(key(stage.battery)) && [...bulbs].every(id => visited.has(id));
  }

  // Within a set the grid never shrinks; legacy calls stay randomized.
  function sizeForQuestion(difficulty,question) {
    if (!Number.isInteger(question) || question < 1 || question > 10) return null;
    return (difficulty === "hard" ? 4 : 3) + (question >= 6 ? 1 : 0);
  }

  // Build a simple path first; cells outside it become obstacles. Bounded retries
  // keep generation quick, with a guaranteed serpentine path as a fallback.
  function generate(difficulty = "easy", random = Math.random, question = null) {
    difficulty = difficulty === "hard" ? "hard" : "easy";
    const size = sizeForQuestion(difficulty, question) ?? (difficulty === "hard" ? 5 : random() < .65 ? 3 : 4);
    const total = size * size;
    const obstacles = difficulty === "hard" ? 3 + Math.floor(random() * 4) :
      (size === 3 ? 1 : 2) + Math.floor(random() * 2);
    const target = total - obstacles;
    let path;
    for (let attempt = 0; attempt < 150; attempt++) {
      const start = difficulty === "hard" ?
        { row: 1 + Math.floor(random() * (size - 2)), col: 1 + Math.floor(random() * (size - 2)) } :
        { row: random() < .5 ? 0 : size - 1, col: random() < .5 ? 0 : size - 1 };
      const candidate = [start];
      const visited = new Set([key(start)]);
      while (candidate.length < target) {
        const tip = candidate[candidate.length - 1];
        const next = [
          { row: tip.row - 1, col: tip.col }, { row: tip.row, col: tip.col + 1 },
          { row: tip.row + 1, col: tip.col }, { row: tip.row, col: tip.col - 1 },
        ].filter(cell => cell.row >= 0 && cell.row < size && cell.col >= 0 && cell.col < size && !visited.has(key(cell)));
        if (!next.length) break;
        let chosen = next[Math.floor(random() * next.length)];
        if (difficulty === "easy" && candidate.length > 1 && random() < .7) {
          const previous = candidate[candidate.length - 2];
          chosen = next.find(cell => cell.row - tip.row === tip.row - previous.row &&
            cell.col - tip.col === tip.col - previous.col) || chosen;
        }
        candidate.push(chosen);
        visited.add(key(chosen));
      }
      if (candidate.length === target) { path = candidate; break; }
    }
    if (!path) {
      path = [];
      const transpose = random() < .5;
      const flip = random() < .5;
      for (let row = 0; row < size; row++) {
        for (let step = 0; step < size; step++) {
          const col = row % 2 ? size - 1 - step : step;
          const cell = transpose ? { row: col, col: row } : { row, col };
          if (flip) cell.col = size - 1 - cell.col;
          path.push(cell);
        }
      }
      path = path.slice(0, target);
    }
    path = path.map(cell => Object.freeze({ ...cell }));
    const open = new Set(path.map(key));
    const blocked = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!open.has(key({ row, col }))) blocked.push(Object.freeze({ row, col }));
      }
    }
    const stage = { difficulty, rows: size, cols: size, battery: path[0],
      bulbs: Object.freeze(path.slice(1)), blocked: Object.freeze(blocked), solution: Object.freeze(path) };
    if (!isValid(stage)) throw new Error("Invalid generated puzzle");
    return Object.freeze(stage);
  }

  window.HitofudeStages = Object.freeze({ generate, isValid, sizeForQuestion });
})();
