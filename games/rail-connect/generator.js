(() => {
  "use strict";
  const steps = [[-1,0],[0,1],[1,0],[0,-1]]; // North, east, south, west; clockwise.
  function ports(tile) {
    if (!tile || tile.type === "empty") return [];
    const r = tile.rotation;
    if (tile.type === "start" || tile.type === "goal") return [r];
    return tile.type === "straight" ? [r, (r + 2) % 4] : [r, (r + 1) % 4];
  }
  function direction(from, to, cols) {
    const dr = Math.floor(to / cols) - Math.floor(from / cols), dc = to % cols - from % cols;
    return steps.findIndex(([r,c]) => r === dr && c === dc);
  }
  // Follow actual ports, not the saved solution. Bound traversal and reject revisits.
  function trace(puzzle, tiles = puzzle.tiles) {
    const path = [], seen = new Set();
    let index = puzzle.start, incoming = null;
    while (path.length < puzzle.rows * puzzle.cols) {
      if (seen.has(index) || !tiles[index]) return null;
      seen.add(index); path.push(index);
      const tile = tiles[index], exits = ports(tile);
      if (index === puzzle.goal) return tile.type === "goal" && incoming !== null && exits.includes(incoming) ? path : null;
      if (incoming !== null && !exits.includes(incoming)) return null;
      const outgoing = exits.filter(d => d !== incoming);
      if (outgoing.length !== 1) return null;
      const d = outgoing[0], row = Math.floor(index / puzzle.cols) + steps[d][0], col = index % puzzle.cols + steps[d][1];
      if (row < 0 || col < 0 || row >= puzzle.rows || col >= puzzle.cols) return null;
      const next = row * puzzle.cols + col;
      if (!ports(tiles[next]).includes((d + 2) % 4)) return null;
      index = next; incoming = (d + 2) % 4;
    }
    return null;
  }
  function isValid(puzzle) {
    if (!puzzle || !["easy","hard"].includes(puzzle.difficulty) || ![3,4,5].includes(puzzle.rows) || puzzle.rows !== puzzle.cols ||
        !Array.isArray(puzzle.tiles) || puzzle.tiles.length !== puzzle.rows * puzzle.cols || !Array.isArray(puzzle.solution) ||
        new Set(puzzle.solution).size !== puzzle.solution.length || puzzle.solution[0] !== puzzle.start || puzzle.solution.at(-1) !== puzzle.goal) return false;
    if (puzzle.difficulty === "easy" ? puzzle.rows > 4 : puzzle.rows < 4) return false;
    const allowed = ["empty","start","goal","straight","curve"];
    if (!puzzle.tiles.every(t => t && allowed.includes(t.type) && Number.isInteger(t.rotation) && t.rotation >= 0 && t.rotation < 4 &&
        Number.isInteger(t.solutionRotation) && t.solutionRotation >= 0 && t.solutionRotation < 4)) return false;
    if (puzzle.tiles.filter(t => t.type === "start").length !== 1 || puzzle.tiles.filter(t => t.type === "goal").length !== 1) return false;
    const solved = puzzle.tiles.map(t => ({...t,rotation:t.solutionRotation})), path = trace(puzzle, solved);
    if (!path || path.length !== puzzle.solution.length || path.some((n,i) => n !== puzzle.solution[i]) || trace(puzzle)) return false;
    const curves = puzzle.solution.filter(n => puzzle.tiles[n].type === "curve").length;
    const changed = puzzle.solution.filter(n => ["straight","curve"].includes(puzzle.tiles[n].type) &&
      ports(puzzle.tiles[n]).slice().sort().join() !== ports(solved[n]).sort().join()).length;
    return changed >= 2 && (puzzle.difficulty === "easy" ? path.length >= 5 && path.length <= 7 && curves === 1 : path.length >= 2 * puzzle.rows + 2 && curves >= 4);
  }
  const safeHardPath = [0,1,5,4,8,9,10,6,7,11,15];
  const safeHardPath5 = [0,1,6,5,10,11,12,7,8,13,14,19,24];
  const safeEasyPath4 = [0,1,2,3,7,11];
  function build(size, path, difficulty, pick) {
    const tiles = Array.from({length:size * size}, () => ({type:"empty",rotation:0,solutionRotation:0}));
    path.forEach((index,i) => {
      const before = i ? direction(index,path[i-1],size) : null;
      const after = i < path.length - 1 ? direction(index,path[i+1],size) : null;
      let type, rotation;
      if (!i || i === path.length - 1) { type = !i ? "start" : "goal"; rotation = !i ? after : before; }
      else if ((before + 2) % 4 === after) { type = "straight"; rotation = before; }
      else { type = "curve"; rotation = [0,1,2,3].find(r => [r,(r+1)%4].includes(before) && [r,(r+1)%4].includes(after)); }
      tiles[index] = {type,rotation,solutionRotation:rotation};
    });
    const used = new Set(path), unused = tiles.map((_,i) => i).filter(i => !used.has(i));
    for (let i = unused.length - 1; i > 0; i--) { const j = pick(i + 1); [unused[i],unused[j]] = [unused[j],unused[i]]; }
    const dummyCount = difficulty === "easy" ? pick(2) : Math.max(1, Math.ceil(unused.length * .65));
    for (const index of unused.slice(0,dummyCount)) { const rotation = pick(4); tiles[index] = {type:pick(2) ? "curve" : "straight",rotation,solutionRotation:rotation}; }
    for (const index of path.slice(1,-1)) {
      const tile = tiles[index];
      const turn = difficulty === "hard" ? pick(4) : (pick(2) ? (tile.type === "straight" ? 1 : 3) : 0);
      tile.rotation = (tile.rotation + turn) % 4;
    }
    // Both fixed stations have a wrong-facing neighboring rail initially, so
    // at least two distinct rails must be changed, even for an alternate route.
    for (const index of [path[1],path.at(-2)]) {
      const tile = tiles[index]; tile.rotation = (tile.solutionRotation + (tile.type === "straight" ? 1 : 2)) % 4;
    }
    return {difficulty,rows:size,cols:size,start:path[0],goal:path.at(-1),tiles,solution:path};
  }
  // Within a set the grid never shrinks; legacy calls stay randomized.
  function sizeForQuestion(difficulty,question) {
    if (!Number.isInteger(question) || question < 1 || question > 10) return null;
    return (difficulty === "hard" ? 4 : 3) + (question >= 6 ? 1 : 0);
  }

  function generate(difficulty = "easy", random = Math.random, question = null) {
    difficulty = difficulty === "hard" ? "hard" : "easy";
    const pick = n => { const r = random(); return Math.floor(Math.max(0,Math.min(1 - Number.EPSILON,Number.isFinite(r) ? r : 0)) * n); };
    let size = sizeForQuestion(difficulty, question) ?? (difficulty === "easy" ? 3 + pick(2) : 4 + pick(2)), path;
    if (difficulty === "easy") {
      const row = size === 4 ? pick(2) : 0;
      path = Array.from({length:size},(_,col) => row * size + col);
      for (let r = row + 1; r < size; r++) path.push(r * size + size - 1);
    } else {
      const target = 2 * size + 2 + pick(3);
      for (let attempt = 0; attempt < 120 && !path; attempt++) {
        const candidate = [pick(2) ? size - 1 : 0], seen = new Set(candidate);
        while (candidate.length < target) {
          const current = candidate.at(-1), row = Math.floor(current / size), col = current % size;
          const choices = steps.map(([dr,dc]) => [row+dr,col+dc]).filter(([r,c]) => r>=0 && c>=0 && r<size && c<size && !seen.has(r*size+c));
          if (!choices.length) break;
          const [r,c] = choices[pick(choices.length)], next = r * size + c; candidate.push(next); seen.add(next);
        }
        const curves = candidate.slice(1,-1).filter((n,i) => (direction(n,candidate[i],size)+2)%4 !== direction(n,candidate[i+2],size)).length;
        if (candidate.length === target && curves >= 4) path = candidate;
      }
      if (!path) path = size === 5 ? [...safeHardPath5] : [...safeHardPath];
    }
    const flipRows = pick(2), flipCols = pick(2), transpose = pick(2);
    path = path.map(n => { let row = Math.floor(n/size), col = n%size; if (flipRows) row=size-1-row; if(flipCols)col=size-1-col; if(transpose)[row,col]=[col,row]; return row*size+col; });
    let puzzle = build(size,path,difficulty,pick);
    if (!isValid(puzzle)) puzzle = difficulty === "hard" ? build(size,size === 5 ? [...safeHardPath5] : [...safeHardPath],difficulty,()=>0) : build(size,size === 4 ? [...safeEasyPath4] : [0,1,2,5,8],difficulty,()=>0);
    puzzle.tiles.forEach(Object.freeze); Object.freeze(puzzle.tiles); Object.freeze(puzzle.solution);
    return Object.freeze(puzzle);
  }
  window.RailGenerator = Object.freeze({generate,isValid,ports,trace,direction,sizeForQuestion});
})();
