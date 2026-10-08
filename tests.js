(() => {
  "use strict";
  const game = window.Hitofude;
  const stages = window.HitofudeStages;
  const results = [];
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function test(name, run) {
    try { run(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  }
  const cell = (row, col) => ({ row, col });
  const started = (index = 0) => {
    const state = game.createState(stages[index]);
    assert(game.begin(state, state.stage.battery), "Battery should start");
    return state;
  };
  test("10ステージの固定データ", () => assert(stages.length === 10, "Expected 10 stages"));
  test("電池以外から開始できない", () => {
    const state = game.createState(stages[0]);
    assert(!game.begin(state, cell(1, 1)), "Started away from battery");
    assert(!game.move(state, cell(1, 1)) && !state.path.length, "Moved before starting");
  });
  test("上下左右のみが隣接", () => {
    const center = cell(2, 2);
    [cell(1, 2), cell(3, 2), cell(2, 1), cell(2, 3)].forEach(next => assert(game.adjacent(center, next), "Cardinal direction rejected"));
    [cell(1, 1), cell(3, 3), cell(2, 4), center].forEach(next => assert(!game.adjacent(center, next), "Non-neighbor accepted"));
  });
  test("通行禁止・盤面外・飛び越しを無視", () => {
    const state = started();
    [cell(0, 0), cell(2, 0), cell(1, -1), cell(-1, 0), cell(1, 3), cell(1, 2)].forEach(next => {
      assert(!game.move(state, next), "Invalid move accepted");
      assert(state.path.length === 1 && !state.lit.size, "Invalid move mutated state");
    });
  });
  test("通行可能マスでも斜めは禁止", () => {
    const state = started(6);
    assert(!game.move(state, cell(1, 1)) && state.path.length === 1, "Diagonal accepted");
  });
  test("点灯・再訪禁止・先端から再開", () => {
    const state = started();
    assert(game.move(state, cell(1, 1)), "Could not move");
    assert(state.lit.size === 1 && !state.cleared, "Incorrect bulb state");
    assert(!game.move(state, cell(1, 0)), "Revisited battery");
    assert(!game.begin(state, cell(1, 0)), "Resumed away from tip");
    assert(game.begin(state, cell(1, 1)), "Could not resume tip");
    assert(game.move(state, cell(1, 2)) && state.cleared, "Did not clear");
    assert(!game.move(state, cell(1, 1)), "Moved after clear");
  });
  test("リセット後は経路・点灯・クリアを初期化", () => {
    let state = started();
    game.move(state, cell(1, 1));
    game.move(state, cell(1, 2));
    state = game.createState(state.stage);
    assert(!state.path.length && !state.visited.size && !state.lit.size && !state.cleared, "Reset failed");
  });
  const solutions = [];
  stages.forEach((stage, index) => {
    test(`ステージ${index + 1}に有効な解答がある`, () => {
      const solution = game.solve(stage);
      assert(solution && solution.length > 1, "No solution");
      const ids = solution.map(item => `${item.row},${item.col}`);
      assert(new Set(ids).size === ids.length, "Repeated cell in solution");
      assert(solution[0].row === stage.battery.row && solution[0].col === stage.battery.col, "Wrong start");
      const forbidden = new Set(stage.blocked.map(item => `${item.row},${item.col}`));
      solution.forEach((item, position) => {
        assert(item.row >= 0 && item.row < stage.rows && item.col >= 0 && item.col < stage.cols && !forbidden.has(ids[position]), "Invalid solution cell");
        if (position) assert(Math.abs(item.row - solution[position - 1].row) + Math.abs(item.col - solution[position - 1].col) === 1, "Non-adjacent solution step");
      });
      assert(stage.bulbs.every(item => ids.includes(`${item.row},${item.col}`)), "Missing bulb");
      const state = game.createState(stage);
      assert(game.begin(state, solution[0]), "Cannot start solution");
      solution.slice(1).forEach(next => assert(game.move(state, next), "Game rejected solution"));
      assert(state.cleared && state.lit.size === stage.bulbs.length, "Game didn't clear solution");
      solutions.push(solution);
    });
  });
  window.testResults = { passed: results.every(result => result.passed), results, solutions };
  document.getElementById("results").textContent = results.map(result =>
    `${result.passed ? "PASS" : "FAIL"} ${result.name}${result.error ? `: ${result.error}` : ""}`
  ).join("\n") + `\n\n${results.filter(result => result.passed).length} / ${results.length} PASS`;
})();
