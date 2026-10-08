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
  function rectangle(rows, cols, battery = cell(0, 0), blocked = []) {
    const denied = new Set(blocked.map(id));
    const bulbs = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const item = cell(row, col);
      if (!denied.has(id(item)) && id(item) !== id(battery)) bulbs.push(item);
    }
    return { rows, cols, battery, blocked, bulbs };
  }
  function follow(stage, path) {
    const state = started(stage);
    path.slice(1).forEach(item => assert(game.move(state, item), "Invalid test prefix"));
    return state;
  }
  // Independent exhaustive oracle for small boards. It never reads a generated
  // solution and does not use the production search's masks or pruning rules.
  function oracle(state) {
    const visited = new Set(state.visited);
    const stage = state.stage;
    function search(item) {
      if (visited.size === stage.rows * stage.cols - stage.blocked.length) return true;
      for (const next of [cell(item.row + 1, item.col), cell(item.row - 1, item.col),
        cell(item.row, item.col + 1), cell(item.row, item.col - 1)]) {
        if (next.row < 0 || next.row >= stage.rows || next.col < 0 || next.col >= stage.cols ||
            state.blocked.has(id(next)) || visited.has(id(next))) continue;
        visited.add(id(next));
        if (search(next)) return true;
        visited.delete(id(next));
      }
      return false;
    }
    return search(state.path[state.path.length - 1]);
  }
  test("正解可能な途中経路は続行できる", () => {
    const stage = rectangle(3, 3);
    const state = follow(stage, [cell(0, 0), cell(0, 1), cell(1, 1)]);
    assert(game.checkContinuation(state) === "possible", "Viable prefix rejected");
    assert(!state.failed && game.begin(state, cell(1, 1)), "Cannot resume viable prefix");
  });
  test("まだ移動できても、全マス解答がなければ不可能", () => {
    const state = follow(rectangle(3, 3), [cell(0, 0), cell(0, 1), cell(1, 1), cell(1, 2)]);
    assert(!state.visited.has("0,2") && !state.visited.has("2,2"), "Must still have legal next moves");
    assert(!oracle(state) && game.checkContinuation(state) === "impossible", "Impossible prefix wasn't detected");
    assert(!state.failed, "Search must not mutate drag state");
  });
  test("生成時の解答と違っても別解があれば続行", () => {
    const stage = rectangle(2, 3);
    stage.solution = [cell(0, 0), cell(0, 1), cell(0, 2), cell(1, 2), cell(1, 1), cell(1, 0)];
    const alternate = [cell(0, 0), cell(1, 0), cell(1, 1), cell(0, 1), cell(0, 2), cell(1, 2)];
    const state = follow(stage, alternate.slice(0, 3));
    assert(oracle(state) && game.checkContinuation(state) === "possible", "Alternate solution rejected");
    alternate.slice(3).forEach(item => assert(game.move(state, item), "Alternate solution failed"));
    assert(state.cleared && game.checkContinuation(state) === "possible", "Full alternate clear rejected");
  });
  test("時間・探索数の上限では不可能と判定しない", () => {
    const state = started(rectangle(5, 5));
    assert(game.checkContinuation(state, { timeLimitMs: 0 }) === "unknown", "Zero time budget wasn't unknown");
    assert(game.checkContinuation(state, { nodeLimit: 1 }) === "unknown", "Node budget wasn't unknown");
    let ticks = 0;
    assert(game.checkContinuation(state, { now: () => ++ticks > 5 ? 100 : 0 }) === "unknown", "Mid-search timeout wasn't unknown");
    assert(!state.failed && state.path.length === 1, "Budget changed state");
    assert(game.move(state, cell(0, 1)), "Cannot continue after budget exhaustion");
    assert(game.checkContinuation(started(rectangle(6, 6))) === "unknown", "Unsupported board wasn't conservative");
  });
  test("3×3の全障害物配置・有効な途中経路を独立探索と照合", () => {
    let checks = 0;
    for (const battery of [cell(0, 0), cell(1, 1)]) {
      const batteryBit = 1 << (battery.row * 3 + battery.col);
      for (let open = 1; open < 512; open++) {
        if (!(open & batteryBit) || open === batteryBit) continue;
        const blocked = [];
        for (let n = 0; n < 9; n++) if (!(open & (1 << n))) blocked.push(cell(Math.floor(n / 3), n % 3));
        const stage = rectangle(3, 3, battery, blocked);
        function prefixes(path) {
          const state = follow(stage, path);
          const expected = oracle(state) ? "possible" : "impossible";
          assert(game.checkContinuation(state, { timeLimitMs: 1000 }) === expected, "Mismatch with exhaustive oracle");
          checks++;
          if (state.cleared) return;
          const tip = path[path.length - 1];
          for (const next of [cell(tip.row + 1, tip.col), cell(tip.row - 1, tip.col), cell(tip.row, tip.col + 1), cell(tip.row, tip.col - 1)]) {
            if (next.row >= 0 && next.row < 3 && next.col >= 0 && next.col < 3 &&
                !state.blocked.has(id(next)) && !state.visited.has(id(next))) prefixes([...path, next]);
          }
        }
        prefixes([battery]);
      }
    }
    statistics.oracleChecks = checks;
  });
  for (const difficulty of ["easy", "hard"]) {
    test(`${difficulty === "easy" ? "かんたん" : "むずかしい"}: 2000回の判定と速度計測`, () => {
      const random = randomFromSeed(difficulty === "easy" ? 810 : 515);
      const times = [];
      const outcomes = { possible: 0, impossible: 0, unknown: 0 };
      const clock = () => globalThis.performance?.now() ?? Date.now();
      for (let i = 0; i < 1000; i++) {
        const stage = generator.generate(difficulty, random);
        const length = 1 + Math.floor(random() * (stage.solution.length - 1));
        const valid = follow(stage, stage.solution.slice(0, length));
        const t0 = clock(), result = game.checkContinuation(valid);
        times.push(clock() - t0); outcomes[result]++;
        assert(result !== "impossible", "Known viable prefix marked impossible");
        const other = started(stage);
        const steps = 2 + Math.floor(random() * 8);
        for (let step = 0; step < steps && !other.cleared; step++) {
          const tip = other.path[other.path.length - 1];
          const choices = [cell(tip.row + 1, tip.col), cell(tip.row - 1, tip.col), cell(tip.row, tip.col + 1), cell(tip.row, tip.col - 1)]
            .filter(item => item.row >= 0 && item.row < stage.rows && item.col >= 0 && item.col < stage.cols &&
              !other.blocked.has(id(item)) && !other.visited.has(id(item)));
          if (!choices.length) break;
          game.move(other, choices[Math.floor(random() * choices.length)]);
        }
        const t1 = clock(), otherResult = game.checkContinuation(other);
        times.push(clock() - t1); outcomes[otherResult]++;
        if (i < 100 && otherResult !== "unknown") assert((otherResult === "possible") === oracle(other), "Generated prefix oracle mismatch");
      }
      times.sort((a, b) => a - b);
      statistics[`${difficulty}Continuation`] = { checks: times.length, ...outcomes,
        meanMs: times.reduce((a, b) => a + b, 0) / times.length,
        p95Ms: times[Math.floor(times.length * .95)], maxMs: times[times.length - 1] };
    });
  }
  window.testResults = { passed: results.every(result => result.passed), results, statistics };
  document.getElementById("results").textContent = results.map(result =>
    `${result.passed ? "PASS" : "FAIL"} ${result.name}${result.error ? `: ${result.error}` : ""}`
  ).join("\n") + `\n\n${results.filter(result => result.passed).length} / ${results.length} PASS`;
})();
