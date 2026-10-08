(() => {
  "use strict";
  // B: battery, o: bulb, .: open, #: blocked. All puzzles are original fixed data.
  const maps = [
    ["###", "Boo", "###"],
    ["Bo#", "#o#", "#o#"],
    ["Boo", "##o", "#oo"],
    ["B.o#", "##.#", "o.o#", ".###"],
    ["B..o", "o##.", ".##o", "o..o"],
    ["B.o.", ".#.o", "o#..", ".o.o"],
    ["B..o", ".o#.", "..o.", "o..o"],
    ["o...o", ".#.#.", "..B.o", ".###.", "o...o"],
    ["B...o", ".##..", "o.o.o", ".##..", "o...o"],
    ["o...o", ".#.#.", "o.B.o", ".#.#.", "o...o"],
  ];
  window.HitofudeStages = Object.freeze(maps.map((map, index) => {
    const stage = { id: index + 1, rows: map.length, cols: map[0].length, battery: null, bulbs: [], blocked: [] };
    let batteries = 0;
    map.forEach((line, row) => {
      if (line.length !== stage.cols) throw new Error("Invalid stage width");
      Array.from(line).forEach((symbol, col) => {
        const cell = Object.freeze({ row, col });
        if (symbol === "B") { stage.battery = cell; batteries++; }
        else if (symbol === "o") stage.bulbs.push(cell);
        else if (symbol === "#") stage.blocked.push(cell);
        else if (symbol !== ".") throw new Error("Invalid stage symbol");
      });
    });
    if (batteries !== 1 || !stage.bulbs.length) throw new Error("Invalid stage items");
    Object.freeze(stage.bulbs);
    Object.freeze(stage.blocked);
    return Object.freeze(stage);
  }));
})();
