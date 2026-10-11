const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context={window:{},document:{}};vm.createContext(context);
for(const file of ['games/common/pictures.js','games/picture-chain/generator.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const R=context.window.ChainRules,words=context.window.PuzzlePictures.words,byId=new Map(words.map(w=>[w.id,w]));
// Independent exhaustive oracle: inspect only displayed cards and names, never the certificate or rule helpers.
function solutions(p,prefix=[p.start.id]){
 const answers=[],cards=new Map(p.cards.map(w=>[w.id,w]));
 function search(path){if(path.length===p.cards.length){answers.push(path);return;}const tail=cards.get(path.at(-1)).name.slice(-1);for(const word of p.cards)if(!path.includes(word.id)&&word.name.slice(0,1)===tail)search([...path,word.id]);}
 search(prefix);return answers;
}
let seed=62374;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const unique=Object.fromEntries([3,4,5,6].map(n=>[n,new Set()])),positions=new Set();let total=0,alternate=0,maxMs=0;
for(let set=0;set<1000;set++){
 let previous=null,last=0;
 for(let n=1;n<=10;n++){
  const start=performance.now(),p=R.generate(n,random,previous);maxMs=Math.max(maxMs,performance.now()-start);const expected=[3,3,3,4,4,4,5,5,6,6][n-1];assert.equal(p.count,expected);assert.equal(p.cards.length,expected);assert.ok(p.count>=last);last=p.count;
  assert.equal(new Set(p.cards.map(w=>w.id)).size,expected);assert.equal(p.cards[0].id,p.start.id);for(const w of p.cards){assert.equal(w.name,byId.get(w.id).name);assert.notEqual(w.name.at(-1),'ん');}
  const answers=solutions(p);assert.ok(answers.length>0,'Independent DFS found no complete solution');if(answers.length>1)alternate++;
  assert.ok(R.validate(p));const snapshot=JSON.stringify(p);assert.equal(R.isComplete(p,[p.start.id]),false);assert.equal(R.canAppend(p,[p.start.id],p.start.id),false);assert.equal(R.canAppend(p,[p.start.id],'unknown'),false);
  for(const answer of answers){const prefix=[p.start.id];for(const id of answer.slice(1)){assert.equal(R.isComplete(p,prefix),false,'Premature clear');assert.equal(R.canAppend(p,prefix,id),true);for(const unused of p.cards)if(!prefix.includes(unused.id)&&unused.name[0]!==byId.get(prefix.at(-1)).name.at(-1))assert.equal(R.canAppend(p,prefix,unused.id),false);prefix.push(id);assert.equal(R.canAppend(p,prefix,id),false);}assert.equal(R.isComplete(p,prefix),true);assert.equal(R.isComplete(p,[...prefix,prefix.at(-1)]),false);assert.equal(R.isComplete(p,[...prefix].reverse()),false);}
  assert.equal(JSON.stringify(p),snapshot,'Rule checks mutated the problem');const key=p.start.id+':'+p.cards.slice(1).map(w=>w.id).sort().join();unique[expected].add(key);if(previous&&previous.count===p.count)assert.notEqual(key,previous.start.id+':'+previous.cards.slice(1).map(w=>w.id).sort().join());positions.add(p.cards.findIndex(w=>w.id===answers[0][1]));previous=p;total++;
 }
}
const ids=['gorilla','camel','doll','pillow','trumpet','panda'],fixture={number:9,count:6,start:byId.get(ids[0]),cards:ids.map(id=>byId.get(id)),solution:ids};assert.ok(R.validate(fixture));assert.equal(solutions(fixture).length,2);for(const answer of solutions(fixture))assert.ok(R.isComplete(fixture,answer));assert.ok(alternate>0);
// A locally valid dead end must remain undoable; no saved-order comparison is allowed.
const cards=['あか','かさ','さか','かな'].map((name,i)=>({id:String(i),name})),deadEnd={start:cards[0],cards};assert.ok(R.canAppend(deadEnd,['0'],'3'));assert.equal(R.isComplete(deadEnd,['0','3']),false);assert.equal(solutions(deadEnd,['0','3']).length,0);assert.ok(R.canAppend(deadEnd,['0'],'1'));assert.ok(R.isComplete(deadEnd,['0','1','2','3']));
assert.equal(R.correct({name:'りんご'},{name:'こま'}),false);assert.equal(R.correct({name:'らっぱ'},{name:'はな'}),false);
for(const value of [0,1,NaN,-1])for(let n=1;n<=10;n++){const p=R.generate(n,()=>value);assert.ok(R.validate(p)&&solutions(p).length>0);}
for(const n of [3,4,5,6])assert.ok(unique[n].size>=20);assert.equal(positions.size,5);
console.log(`PASS picture-chain: ${total} all-card puzzles; independent exhaustive solutions; alternate-answer puzzles ${alternate}; distinct fixed-start/card sets ${JSON.stringify(Object.fromEntries(Object.entries(unique).map(([k,v])=>[k,v.size])))}; max generation ${maxMs.toFixed(2)}ms; prefixes/duplicates/undoable dead ends/kana/RNG guards`);
