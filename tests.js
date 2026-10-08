(() => {
  "use strict";
  const game = window.Hitofude;
  const generator = window.HitofudeStages;
  const results = [];
  const statistics = {};
  const cell = (row, col) => ({ row, col });
  const id = item => `${item.row},${item.col}`;
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function test(name, run) {
    try { run(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  }
  const straight = { rows: 3, cols: 3, battery: cell(1, 0), bulbs: [cell(1, 1), cell(1, 2)],
    blocked: [cell(0, 0), cell(0, 1), cell(0, 2), cell(2, 0), cell(2, 1), cell(2, 2)] };
  function started(stage = straight) {
    const state = game.createState(stage);
    assert(game.begin(state, stage.battery), "Cannot start at battery");
    return state;
  }
  function randomFromSeed(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function checkPuzzle(stage) {
    const path = stage.solution;
    const blocked = new Set(stage.blocked.map(id));
    const open = new Set();
    for (let row = 0; row < stage.rows; row++) {
      for (let col = 0; col < stage.cols; col++) if (!blocked.has(id(cell(row, col)))) open.add(id(cell(row, col)));
    }
    assert(path.length === open.size && new Set(path.map(id)).size === open.size, "Missing or repeated open cell");
    assert(id(path[0]) === id(stage.battery), "Wrong start");
    assert(path.every(item => open.has(id(item))), "Out-of-bounds or blocked cell in path");
    assert(stage.bulbs.length === open.size - 1, "Wrong bulb count");
    const bulbs = new Set(stage.bulbs.map(id));
    assert(bulbs.size === stage.bulbs.length && !bulbs.has(id(stage.battery)), "Wrong bulb placement");
    assert([...open].every(item => item === id(stage.battery) || bulbs.has(item)), "Open cell without a bulb");
    const state = started(stage);
    assert(state.visited.size === 1 && !state.cleared, "Battery count or initial clear incorrect");
    path.slice(1).forEach((item, position) => {
      const previous = path[position];
      assert(Math.abs(item.row - previous.row) + Math.abs(item.col - previous.col) === 1, "Non-cardinal path step");
      assert(game.move(state, item), "Game rejected generated solution");
      assert(state.cleared === (position === path.length - 2), "Incorrect full-cell clear condition");
    });
    assert(state.lit.size === stage.bulbs.length && state.visited.size === open.size, "Incomplete clear");
    assert(generator.isValid(stage), "Generator validation failed");
  }
  test("電池以外からは開始できない", () => {
    const state = game.createState(straight);
    assert(!game.begin(state, cell(1, 1)), "Started away from battery");
    assert(!game.move(state, cell(1, 1)), "Moved before beginning");
  });
  test("電池を通過済みに数える", () => {
    const state = started();
    assert(state.visited.size === 1 && state.path.length === 1 && !state.cleared, "Battery count incorrect");
  });
  test("上下左右のみが隣接・斜めは禁止", () => {
    const center = cell(1, 1);
    [cell(0, 1), cell(2, 1), cell(1, 0), cell(1, 2)].forEach(next => assert(game.adjacent(center, next), "Neighbor rejected"));
    [cell(0, 0), cell(2, 2), cell(1, 3), center].forEach(next => assert(!game.adjacent(center, next), "Non-neighbor accepted"));
    const square = { rows: 2, cols: 2, battery: cell(0, 0), bulbs: [cell(0, 1), cell(1, 0), cell(1, 1)], blocked: [] };
    assert(!game.move(started(square), cell(1, 1)), "Diagonal move accepted");
  });
  test("障害物・盤面外・飛び越しを拒否", () => {
    const state = started();
    [cell(0, 0), cell(2, 0), cell(1, -1), cell(-1, 0), cell(1, 3), cell(1, 2)].forEach(next => {
      assert(!game.move(state, next), "Invalid move accepted");
      assert(state.path.length === 1 && !state.lit.size, "Invalid move mutated state");
    });
  });
  test("点灯・再訪禁止・先端から再開", () => {
    const state = started();
    assert(game.move(state, cell(1, 1)) && state.lit.size === 1 && !state.cleared, "Lighting failed");
    assert(!game.move(state, cell(1, 0)) && !game.begin(state, cell(1, 0)), "Revisit accepted");
    assert(game.begin(state, cell(1, 1)), "Cannot resume at tip");
    assert(game.move(state, cell(1, 2)) && state.cleared, "Full-cell clear failed");
    assert(!game.move(state, cell(1, 1)), "Moved after clear");
  });
  test("リセットで経路・点灯・クリアを初期化", () => {
    let state = started();
    game.move(state, cell(1, 1)); game.move(state, cell(1, 2));
    state = game.createState(state.stage);
    assert(!state.path.length && !state.visited.size && !state.lit.size && !state.cleared, "Reset failed");
  });
  test("空きマスが残っていれば全電球点灯でもクリアしない", () => {
    const stage = { rows: 2, cols: 2, battery: cell(0, 0), bulbs: [cell(0, 1)], blocked: [] };
    const state = started(stage);
    game.move(state, cell(0, 1));
    assert(state.lit.size === 1 && !state.cleared, "Cleared with unvisited cells");
    game.move(state, cell(1, 1));
    assert(!state.cleared, "Cleared before final cell");
    assert(game.move(state, cell(1, 0)) && state.cleared, "Didn't clear all cells");
    assert(game.solve(stage).length === 4, "Solver didn't cover all cells");
  });
  for (const difficulty of ["easy", "hard"]) {
    test(`${difficulty === "easy" ? "かんたん" : "むずかしい"}5000問: 全マス解答・配置・クリア条件`, () => {
      const random = randomFromSeed(difficulty === "easy" ? 42 : 2026);
      const shapes = new Set();
      const sizes = new Set();
      let totalCells = 0;
      for (let i = 0; i < 5000; i++) {
        const stage = generator.generate(difficulty, random);
        checkPuzzle(stage);
        assert(stage.difficulty === difficulty, "Wrong difficulty");
        assert(difficulty === "hard" ? stage.rows === 5 && stage.blocked.length >= 3 && stage.blocked.length <= 6 :
          [3, 4].includes(stage.rows) && stage.blocked.length >= 1 && stage.blocked.length <= 3, "Difficulty bounds incorrect");
        if (difficulty === "hard") {
          const open = new Set(stage.solution.map(id));
          const branchCells = stage.solution.filter(item =>
            [cell(item.row - 1, item.col), cell(item.row + 1, item.col), cell(item.row, item.col - 1), cell(item.row, item.col + 1)]
              .filter(neighbor => open.has(id(neighbor))).length >= 3);
          assert(branchCells.length >= 2, "Hard board lacks choices");
        }
        shapes.add(`${stage.rows}:${id(stage.battery)}:${stage.blocked.map(id).join(";")}`);
        sizes.add(stage.rows);
        totalCells += stage.solution.length;
      }
      assert(shapes.size > (difficulty === "easy" ? 100 : 1000), "Insufficient puzzle variety");
      assert(difficulty !== "easy" || sizes.size === 2, "Missing 3x3 or 4x4 easy boards");
      statistics[difficulty] = { puzzles: 5000, uniqueBoards: shapes.size, averageOpenCells: totalCells / 5000 };
    });
  }
  test("定数乱数でも生成が終了し、解ける経路を出す", () => {
    for (const difficulty of ["easy", "hard"]) for (const value of [0, .999999]) {
      let calls = 0;
      const stage = generator.generate(difficulty, () => { calls++; return value; });
      checkPuzzle(stage);
      assert(calls < 10000, "Generation isn't bounded");
    }
  });
  test("不正な解答・電球・障害物を検証で拒否", () => {
    const stage = generator.generate("easy", randomFromSeed(15));
    assert(!generator.isValid(stage, stage.solution.slice(1)), "Omitted start accepted");
    const duplicate = stage.solution.slice(); duplicate[1] = duplicate[0];
    assert(!generator.isValid(stage, duplicate), "Repeated path cell accepted");
    assert(!generator.isValid({ ...stage, bulbs: [] }), "Missing bulbs accepted");
    assert(!generator.isValid({ ...stage, blocked: [...stage.blocked, stage.battery] }), "Blocked battery accepted");
    assert(!generator.isValid({ ...stage, battery: cell(-1, 0) }), "Invalid battery accepted");
    const diagonal = stage.solution.slice(); diagonal[1] = cell(diagonal[0].row + 1, diagonal[0].col + 1);
    assert(!generator.isValid(stage, diagonal), "Diagonal path accepted");
  });
  test("未知の難易度はかんたんになる", () => {
    assert(generator.generate("unknown", randomFromSeed(99)).difficulty === "easy", "Unsafe difficulty default");
  });
  window.testResults = { passed: results.every(result => result.passed), results, statistics };
  document.getElementById("results").textContent = results.map(result =>
    `${result.passed ? "PASS" : "FAIL"} ${result.name}${result.error ? `: ${result.error}` : ""}`
  ).join("\n") + `\n\n${results.filter(result => result.passed).length} / ${results.length} PASS`;
})();
