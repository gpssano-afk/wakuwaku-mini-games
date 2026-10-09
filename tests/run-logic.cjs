// No dependencies: run all browser-independent game rules with Node.js.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const context={window:{},document:{getElementById:id=>id==='results'?{textContent:''}:null},performance,structuredClone};
vm.createContext(context);
for(const file of [
  'games/hitofude/stages.js','games/hitofude/game.js','tests.js',
  'games/block-fit/generator.js','games/block-fit/game.js','games/block-fit/tests.js',
  'games/rail-connect/generator.js','games/rail-connect/game.js','games/rail-connect/tests.js',
  'games/cube-fit/renderer.js','games/cube-fit/generator.js','games/cube-fit/game.js','games/cube-fit/tests.js'
])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
let count=0;
for(const name of ['testResults','blockTestResults','railTestResults','cubeTestResults']){
  const result=context.window[name];assert.equal(result.passed,true,JSON.stringify(result.results));
  count+=result.results.length;console.log(`${name}: ${result.results.length} / ${result.results.length} PASS`);
}
console.log(`PASS ${count} tests; 16,000 generated puzzles`);
