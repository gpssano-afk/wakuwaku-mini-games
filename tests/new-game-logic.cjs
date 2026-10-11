// Independent generation oracles. No framework or application dependencies.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context={window:{},document:{},URL};vm.createContext(context);
for(const file of ['games/common/pictures.js','games/what-missing/generator.js','games/drum-echo/generator.js','games/picture-chain/generator.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const {MissingRules:M,DrumRules:D,ChainRules:C,PuzzlePictures:P}=context.window;
let seed=734821;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const words=new Map(P.words.map(w=>[w.id,w]));assert.equal(words.size,P.words.length);
for(const w of P.memory){assert.ok(fs.existsSync(path.join(root,'assets/pictures',w.id+'.svg')));const svg=fs.readFileSync(path.join(root,'assets/pictures',w.id+'.svg'),'utf8');assert.ok(svg.includes('<title>'+w.name+'</title>'));}
for(const w of P.words){assert.equal(w.first,w.name[0]);assert.equal(w.last,w.name.at(-1));assert.notEqual(w.last,'ん');assert.ok(!/[ゃゅょぁぃぅぇぉー]/.test(w.name));}
let count=0;const positions=new Set(),unique={missing:new Set(),drum:new Set(),chain:new Set()};
for(let set=0;set<1000;set++){
 let previous={};let old=[0,0,0,0,0,0];
 for(let n=1;n<=10;n++){
  const m=M.generate(n,random,previous.m),d=D.generate(n,random,previous.d),c=C.generate(n,random,previous.c);
  assert.ok(M.validate(m)&&D.validate(d)&&C.validate(c));
  const sizes=[3,3,3,4,4,4,5,5,6,6],choices=[2,2,2,3,3,3,3,3,4,4];
  assert.equal(m.items.length,sizes[n-1]);assert.equal(m.options.length,choices[n-1]);assert.equal(new Set(m.items.map(w=>w.id)).size,m.items.length);
  const missing=m.items[m.missing].id;assert.equal(m.options.filter(w=>w.id===missing).length,1);
  for(const option of m.options){assert.equal(M.correct(m,option.id),option.id===missing);if(option.id!==missing)assert.ok(!m.items.some(w=>w.id===option.id));}
  assert.equal(d.sequence.length,Math.ceil(n/2)+1);assert.equal(d.kinds,n<=4?2:3);assert.equal(new Set(d.sequence).size,d.kinds);
  d.sequence.forEach((beat,i)=>{assert.ok(beat>=0&&beat<d.kinds);assert.ok(i<2||beat!==d.sequence[i-1]||beat!==d.sequence[i-2]);assert.equal(D.input(d,d.sequence.slice(0,i),beat),i===d.sequence.length-1?'correct':'continue');assert.equal(D.input(d,d.sequence.slice(0,i),(beat+1)%d.kinds),'wrong');});assert.equal(D.input(d,[],9),'ignored');
  assert.equal(c.steps.length,n>=9?2:1);assert.equal(c.choices,choices[n-1]);let from=c.start;const used=new Set([from.id]);
  for(const step of c.steps){assert.equal(step.from.id,from.id);assert.equal(step.options.length,choices[n-1]);assert.equal(new Set(step.options.map(w=>w.id)).size,step.options.length);const valid=step.options.filter(w=>w.name[0]===from.name.at(-1));assert.equal(valid.length,1);assert.ok(!used.has(valid[0].id));step.options.forEach(w=>{assert.equal(w.name,words.get(w.id).name);assert.equal(C.correct(from,w),w.name[0]===from.name.at(-1));});positions.add(step.options.indexOf(valid[0]));used.add(valid[0].id);from=valid[0];}
  const now=[m.count,m.choices,m.seconds,d.length,d.kinds,c.links];now.forEach((v,i)=>assert.ok(v>=old[i]));old=now;
  if(previous.d&&previous.d.length===d.length)assert.notEqual(previous.d.sequence.join(),d.sequence.join());if(previous.c)assert.notEqual(previous.c.start.id,c.start.id);
  unique.missing.add(m.items.map(w=>w.id).join()+m.missing);unique.drum.add(d.sequence.join());unique.chain.add(c.start.id+c.steps.map(s=>s.options.map(w=>w.id).join()).join());previous={m,d,c};count+=3;
 }
}
for(const value of [0,1,NaN,-1])for(let n=1;n<=10;n++)assert.ok(M.validate(M.generate(n,()=>value))&&D.validate(D.generate(n,()=>value))&&C.validate(C.generate(n,()=>value)));
assert.equal(positions.size,4);assert.ok(unique.missing.size>1000&&unique.drum.size>100&&unique.chain.size>1000);
assert.equal(C.correct({last:'ご'},{first:'こ'}),false);assert.equal(C.correct({last:'ぱ'},{first:'は'}),false);
console.log(`PASS new games: ${count} puzzles (10,000 each); independent answers, unique options, verified SVG/name pairs, monotonic ten-question difficulty, bounded RNG, retries, exact voiced kana, varied positions; diversity ${JSON.stringify(Object.fromEntries(Object.entries(unique).map(([k,v])=>[k,v.size])))}`);
