(() => {
  "use strict";
  // B: battery, o (or .): bulb, #: blocked. Every non-battery open cell is a bulb.
  // 1–3: short paths; 4–7: easy turns; 8–10: small boards with a choice of route.
  const maps = [
    ["###", "Boo", "###"],
    ["Bo#", "#o#", "#o#"],
    ["Boo", "##o", "#oo"],
    ["Boo#", "##o#", "ooo#", "o###"],
    ["Booo", "o##o", "o##o", "oooo"],
    ["Booo", "o#oo", "o#oo", "oooo"],
    ["Booo", "oo#o", "oooo", "oooo"],
    ["Booo", "oooo", "oooo", "oooo"],
    ["#Boo", "oooo", "oooo", "oooo"],
    ["##oo", "oBoo", "oooo", "oooo"],
  ];
  window.HitofudeStages = Object.freeze(maps.map((map, index) => {
    const stage = { id: index + 1, rows: map.length, cols: map[0].length, battery: null, bulbs: [], blocked: [] };
    let batteries = 0;
    map.forEach((line, row) => {
      if (line.length !== stage.cols) throw new Error("Invalid stage width");
      Array.from(line).forEach((symbol, col) => {
        const cell = Object.freeze({ row, col });
        if (symbol === "B") { stage.battery = cell; batteries++; }
        else if (symbol === "o" || symbol === ".") stage.bulbs.push(cell);
        else if (symbol === "#") stage.blocked.push(cell);
        else throw new Error("Invalid stage symbol");
      });
    });
    if (batteries !== 1 || !stage.bulbs.length) throw new Error("Invalid stage items");
    Object.freeze(stage.bulbs);
    Object.freeze(stage.blocked);
    return Object.freeze(stage);
  }));
})();
