(() => {
  "use strict";
  const game = window.BlockFit, generator = window.BlockFitGenerator, results = [], statistics = {};
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  function test(name, action) { try { action(); results.push({name,passed:true}); } catch (error) { results.push({name,passed:false,error:error.message}); } }
  function randomFromSeed(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
  function independentCheck(puzzle) {
    const occupied = new Set();
    for (const piece of puzzle.pieces) {
      const reached = [piece.cells[0]], unseen = piece.cells.slice(1);
      for (let i = 0; i < reached.length; i++) for (let n = unseen.length - 1; n >= 0; n--) {
        if (Math.abs(reached[i].row - unseen[n].row) + Math.abs(reached[i].col - unseen[n].col) === 1) reached.push(...unseen.splice(n, 1));
      }
      assert(!unseen.length, "Disconnected piece");
      const local = new Set();
      for (const cell of piece.cells) {
        assert(Number.isInteger(cell.row) && Number.isInteger(cell.col) && cell.row >= 0 && cell.col >= 0, "Invalid shape");
        const id = `${cell.row},${cell.col}`; assert(!local.has(id), "Duplicate piece cell"); local.add(id);
        const row = cell.row + piece.solution.row, col = cell.col + piece.solution.col;
        assert(row >= 0 && col >= 0 && row < puzzle.rows && col < puzzle.cols, "Outside solution");
        const absolute = `${row},${col}`; assert(!occupied.has(absolute), "Overlapping solution"); occupied.add(absolute);
      }
    }
    assert(occupied.size === puzzle.rows * puzzle.cols, "Gaps in solution");
  }
  for (const difficulty of ["easy", "hard"]) test(`${difficulty === "easy" ? "かんたん" : "むずかしい"}: 1000問の連結・回転なし解答・配置・クリア`, () => {
    const random = randomFromSeed(difficulty === "easy" ? 450 : 975), shapes = new Set(), sizes = new Set(), counts = new Set(), times = [];
    let complexPieces = 0, branchingPieces = 0, staircasePieces = 0, tPieces = 0, lPieces = 0;
    for (let i = 0; i < 1000; i++) {
      const start = performance.now(), puzzle = generator.generate(difficulty, random); times.push(performance.now() - start);
      assert(puzzle.difficulty === difficulty && generator.isValid(puzzle), "Invalid generation"); independentCheck(puzzle);
      assert(difficulty === "easy" ? [3,4].includes(puzzle.rows) && [2,3].includes(puzzle.pieces.length) : [4,5].includes(puzzle.rows) && [4,5].includes(puzzle.pieces.length), "Wrong difficulty");
      const state = game.createState(puzzle);
      for (const [n, piece] of puzzle.pieces.entries()) {
        assert(!state.cleared, "Early clear"); assert(game.place(state,piece.id,piece.solution.row,piece.solution.col), "Solution placement rejected");
        assert(state.cleared === (n === puzzle.pieces.length - 1), "Wrong clear timing");
        const width = Math.max(...piece.cells.map(c=>c.col)) + 1, height = Math.max(...piece.cells.map(c=>c.row)) + 1;
        if (width * height > piece.cells.length) complexPieces++;
        if (piece.cells.some(a=>piece.cells.filter(b=>Math.abs(a.row-b.row)+Math.abs(a.col-b.col)===1).length>=3)) branchingPieces++;
        if (piece.cells.length === 4 && width * height === 6) {
          const branch = piece.cells.some(a => piece.cells.filter(b => Math.abs(a.row-b.row) + Math.abs(a.col-b.col) === 1).length === 3);
          const straightThree = piece.cells.some(a => piece.cells.filter(b => a.row === b.row).length === 3 || piece.cells.filter(b => a.col === b.col).length === 3);
          if (branch) tPieces++;
          else if (straightThree) lPieces++;
          else staircasePieces++;
        }
      }
      assert(game.isComplete(state), "Complete board rejected"); sizes.add(puzzle.rows); counts.add(puzzle.pieces.length);
      shapes.add(JSON.stringify(puzzle.pieces.map(p=>p.cells).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))));
    }
    assert(sizes.size === 2 && counts.size === 2 && shapes.size >= (difficulty === "hard" ? 100 : 8), "Insufficient variety");
    if (difficulty === "hard") assert(complexPieces > 1000 && tPieces > 0 && lPieces > 0 && staircasePieces > 0, "Missing harder shapes");
    times.sort((a,b)=>a-b);
    statistics[difficulty] = {puzzles:1000,uniqueShapeSets:shapes.size,sizes:[...sizes],pieceCounts:[...counts],complexPieces,branchingPieces,tPieces,lPieces,staircasePieces,
      meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[950],maxMs:times.at(-1)};
  });
  const example = () => generator.generate("easy", randomFromSeed(111));
  test("不正な位置・盤面外・重なりを拒否し、元の配置を維持", () => {
    const puzzle = example(), state = game.createState(puzzle), a = puzzle.pieces[0], b = puzzle.pieces[1];
    assert(game.place(state,a.id,a.solution.row,a.solution.col), "Initial placement");
    const previous = JSON.stringify([...state.placements]);
    for (const [id,row,col] of [[a.id,-1,0],[a.id,0,-1],[a.id,puzzle.rows,0],[a.id,0,.5],["missing",0,0]]) assert(!game.place(state,id,row,col), "Invalid placement accepted");
    assert(JSON.stringify([...state.placements])===previous,"Invalid placement changed state");
    // Place a cell from B over a cell from A, independently constructing a collision.
    const first = a.cells[0], second = b.cells[0];
    assert(!game.place(state,b.id,a.solution.row+first.row-second.row,a.solution.col+first.col-second.col),"Overlap accepted");
    assert(!state.cleared,"Partial board cleared");
  });
  test("配置済みピースを再移動し、置き場に戻しても続行できる", () => {
    const puzzle = example(), state = game.createState(puzzle), piece = puzzle.pieces[0];
    assert(game.place(state,piece.id,piece.solution.row,piece.solution.col),"Initial placement");
    let other;
    for(let row=0;row<puzzle.rows;row++)for(let col=0;col<puzzle.cols;col++)if((row!==piece.solution.row||col!==piece.solution.col)&&game.canPlace(state,piece.id,row,col))other={row,col};
    assert(other && game.place(state,piece.id,other.row,other.col),"Cannot move placed piece");
    assert(state.placements.size===1 && !state.cleared,"Moved piece duplicated");
    assert(game.remove(state,piece.id) && !state.placements.size,"Cannot return to tray");
    assert(game.place(state,piece.id,piece.solution.row,piece.solution.col),"Cannot place again");
  });
  test("生成時の配置と異なる別解でも全マスを埋めればクリア", () => {
    const puzzle={difficulty:"easy",rows:3,cols:3,pieces:Array.from({length:3},(_,i)=>({id:`bar-${i}`,color:i,cells:[{row:0,col:0},{row:0,col:1},{row:0,col:2}],solution:{row:i,col:0}}))};
    const state=game.createState(puzzle);
    puzzle.pieces.forEach((p,i)=>{assert(game.place(state,p.id,2-i,0),"Alternate placement rejected");assert(state.cleared===(i===2),"Early alternate clear");});
    assert(state.cleared && game.isComplete(state),"Alternate solution rejected");
  });
  test("全ピースを置いても隙間・重なり・盤面外があればクリアしない", () => {
    const puzzle=example(),state=game.createState(puzzle);
    for(const piece of puzzle.pieces)state.placements.set(piece.id,{row:0,col:0});
    assert(!game.isComplete(state),"Overlap cleared");
    for(const piece of puzzle.pieces)state.placements.set(piece.id,{...piece.solution});
    state.placements.set(puzzle.pieces[0].id,{row:puzzle.rows,col:0});assert(!game.isComplete(state),"Outside cleared");
  });
  test("リセットで同じ問題・形・順番のまま配置を初期化", () => {
    const puzzle=example(),before=JSON.stringify(puzzle);let state=game.createState(puzzle);
    puzzle.pieces.forEach(piece=>game.place(state,piece.id,piece.solution.row,piece.solution.col));
    state=game.createState(state.puzzle);
    assert(state.puzzle===puzzle && JSON.stringify(puzzle)===before && !state.placements.size && !state.cleared,"Reset changed puzzle");
    assert(Object.isFrozen(puzzle) && Object.isFrozen(puzzle.pieces[0].cells),"Mutable puzzle");
  });
  test("定数・不正な乱数でも安全な問題を出し、不正な問題を検証で拒否", () => {
    for(const mode of ["easy","hard"])for(const random of [()=>0,()=>1-Number.EPSILON,()=>NaN]){const puzzle=generator.generate(mode,random);independentCheck(puzzle);assert(generator.isValid(puzzle),"Unsafe fallback");}
    assert(generator.generate("missing",()=>0).difficulty==="easy","Unknown mode default");
    const puzzle=example(),bad={...puzzle,pieces:puzzle.pieces.slice(1)};
    assert(!generator.isValid(bad),"Incomplete partition accepted");
    assert(!generator.isValid({...puzzle,pieces:[...puzzle.pieces,puzzle.pieces[0]]}),"Duplicate piece accepted");
    assert(!generator.connected([{row:0,col:0},{row:1,col:1}]),"Diagonal piece accepted");
  });
  window.blockTestResults={passed:results.every(r=>r.passed),results,statistics};
  const output=document.getElementById("block-results");
  if(output)output.textContent=results.map(r=>`${r.passed?"PASS":"FAIL"} ${r.name}${r.error?`: ${r.error}`:""}`).join("\n")+`\n\n${results.filter(r=>r.passed).length} / ${results.length} PASS`;
})();
