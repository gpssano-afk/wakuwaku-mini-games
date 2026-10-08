(() => {
  "use strict";
  const key = cell => `${cell.row},${cell.col}`;
  const adjacent = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  const bounds = cells => ({
    row: Math.min(...cells.map(c => c.row)), col: Math.min(...cells.map(c => c.col)),
    bottom: Math.max(...cells.map(c => c.row)), right: Math.max(...cells.map(c => c.col)),
  });
  function connected(cells) {
    if (!cells.length || new Set(cells.map(key)).size !== cells.length) return false;
    const reached = new Set([key(cells[0])]), queue = [cells[0]];
    for (let i = 0; i < queue.length; i++) {
      for (const cell of cells) if (!reached.has(key(cell)) && adjacent(queue[i], cell)) {
        reached.add(key(cell)); queue.push(cell);
      }
    }
    return reached.size === cells.length;
  }
  function rectangle(row, col, rows, cols) {
    return Array.from({ length: rows * cols }, (_, i) => ({ row: row + Math.floor(i / cols), col: col + i % cols }));
  }
  function split(cells, pick) {
    const b = bounds(cells), height = b.bottom - b.row + 1, width = b.right - b.col + 1;
    const horizontal = height > width || (height === width && pick(2) === 0);
    const length = horizontal ? height : width;
    const cut = Math.floor(length / 2) + (length % 2 ? pick(2) : 0);
    const axis = horizontal ? "row" : "col", edge = b[axis] + cut;
    return [cells.filter(c => c[axis] < edge), cells.filter(c => c[axis] >= edge)];
  }
  function isValid(puzzle) {
    if (!puzzle || !["easy", "hard"].includes(puzzle.difficulty) ||
        !Number.isInteger(puzzle.rows) || !Number.isInteger(puzzle.cols) ||
        puzzle.rows < 3 || puzzle.rows > 5 || puzzle.rows !== puzzle.cols || !Array.isArray(puzzle.pieces)) return false;
    const count = puzzle.pieces.length;
    if (puzzle.difficulty === "easy" ? count < 2 || count > 3 || puzzle.rows > 4 : count < 4 || count > 5 || puzzle.rows < 4) return false;
    const ids = new Set(), covered = new Set();
    for (const piece of puzzle.pieces) {
      if (!piece || typeof piece.id !== "string" || ids.has(piece.id) || !Array.isArray(piece.cells) || piece.cells.length < 2 ||
          !piece.cells.every(c => c && Number.isInteger(c.row) && Number.isInteger(c.col) && c.row >= 0 && c.col >= 0) ||
          !connected(piece.cells) || !piece.solution || !Number.isInteger(piece.solution.row) || !Number.isInteger(piece.solution.col)) return false;
      ids.add(piece.id);
      const b = bounds(piece.cells);
      if (b.row !== 0 || b.col !== 0) return false;
      for (const cell of piece.cells) {
        const row = cell.row + piece.solution.row, col = cell.col + piece.solution.col, id = key({ row, col });
        if (row < 0 || col < 0 || row >= puzzle.rows || col >= puzzle.cols || covered.has(id)) return false;
        covered.add(id);
      }
    }
    return covered.size === puzzle.rows * puzzle.cols;
  }
  function safeHardRegions() {
    return [
        [{row:0,col:0},{row:0,col:1},{row:0,col:2},{row:1,col:0}],
        [{row:0,col:3},{row:1,col:1},{row:1,col:2},{row:1,col:3}],
        [{row:2,col:0},{row:3,col:0},{row:3,col:1},{row:3,col:2}],
        [{row:2,col:1},{row:2,col:2},{row:2,col:3},{row:3,col:3}],
      ];
  }
  function makePieces(regions) {
    return regions.map((cells, i) => {
      const b = bounds(cells);
      return { id: `block-${i}`, color: i, cells: cells.map(c => ({ row: c.row - b.row, col: c.col - b.col }))
        .sort((a, b) => a.row - b.row || a.col - b.col), solution: { row: b.row, col: b.col } };
    });
  }
  function generate(difficulty = "easy", random = Math.random) {
    difficulty = difficulty === "hard" ? "hard" : "easy";
    const pick = n => {
      const value = random();
      return Math.floor(Math.max(0, Math.min(1 - Number.EPSILON, Number.isFinite(value) ? value : 0)) * n);
    };
    const size = difficulty === "easy" ? 3 + pick(2) : 4 + pick(2);
    let regions;
    if (difficulty === "easy") {
      regions = split(rectangle(0, 0, size, size), pick);
      if (pick(2)) {
        const largest = regions[0].length >= regions[1].length ? 0 : 1;
        regions.splice(largest, 1, ...split(regions[largest], pick));
      }
    } else {
      const rowCut = Math.floor(size / 2), colCut = Math.floor(size / 2);
      regions = [rectangle(0, 0, rowCut, colCut), rectangle(0, colCut, rowCut, size - colCut),
        rectangle(rowCut, 0, size - rowCut, colCut), rectangle(rowCut, colCut, size - rowCut, size - colCut)];
      if (size === 5 && pick(2)) {
        const corner = regions.pop();
        const small = corner.filter(c => (c.row === rowCut && c.col < colCut + 2) || (c.row === rowCut + 1 && c.col === colCut));
        regions.push(small, corner.filter(c => !small.includes(c)));
      }
      // Transfer boundary cells, preserving both pieces' connectivity. The
      // completed partition remains an exact solution after every transfer.
      for (let attempt = 0; attempt < 120; attempt++) {
        const from = pick(regions.length), to = pick(regions.length);
        if (from === to || regions[from].length <= 3 || regions[to].length >= 9) continue;
        const cell = regions[from][pick(regions[from].length)];
        if (!regions[to].some(c => adjacent(c, cell))) continue;
        const donor = regions[from].filter(c => c !== cell), receiver = [...regions[to], cell], b = bounds(receiver);
        const a = bounds(donor);
        if (b.bottom - b.row >= 4 || b.right - b.col >= 4 || b.bottom === b.row || b.right === b.col ||
            a.bottom === a.row || a.right === a.col || !connected(donor)) continue;
        regions[from] = donor; regions[to] = receiver;
      }
      const complex = regions.filter(cells => { const b = bounds(cells); return cells.length < (b.bottom - b.row + 1) * (b.right - b.col + 1); }).length;
      if (complex < 2) regions = safeHardRegions();
    }
    const boardSize = regions.reduce((n, cells) => n + cells.length, 0) === 16 ? 4 : size;
    // Reflections vary the orientations before play; players never rotate pieces.
    const flipRows = pick(2), flipCols = pick(2);
    regions = regions.map(cells => cells.map(c => ({ row: flipRows ? boardSize - 1 - c.row : c.row,
      col: flipCols ? boardSize - 1 - c.col : c.col })));
    const pieces = makePieces(regions);
    for (let i = pieces.length - 1; i > 0; i--) { const j = pick(i + 1); [pieces[i], pieces[j]] = [pieces[j], pieces[i]]; }
    let puzzle = { difficulty, rows: boardSize, cols: boardSize, pieces };
    if (!isValid(puzzle)) {
      // An unexpected invalid partition also falls back to a known tiling.
      const safeSize = difficulty === "hard" ? 4 : 3;
      const safe = difficulty === "hard" ? safeHardRegions() : [rectangle(0,0,1,3), rectangle(1,0,2,3)];
      puzzle = {difficulty, rows:safeSize, cols:safeSize, pieces:makePieces(safe)};
    }
    for (const piece of puzzle.pieces) {
      piece.cells.forEach(Object.freeze); Object.freeze(piece.cells); Object.freeze(piece.solution); Object.freeze(piece);
    }
    Object.freeze(puzzle.pieces);
    return Object.freeze(puzzle);
  }
  window.BlockFitGenerator = Object.freeze({ generate, isValid, connected });
})();
