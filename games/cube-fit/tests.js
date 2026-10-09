(() => {
  "use strict";
  const generator=window.CubeGenerator,renderer=window.CubeRenderer,game=window.CubeFit,results=[],statistics={};
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  function test(name,action){try{action();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.message});}}
  const id=c=>`${c.x},${c.y},${c.z}`;
  function normalized(cells){const axes=['x','y','z'],min=axes.map(a=>Math.min(...cells.map(c=>c[a])));return cells.map(c=>axes.map((a,i)=>c[a]-min[i]).join(',')).sort().join(';');}
  function joined(cells){const pending=cells.map(c=>[c.x,c.y,c.z]),seen=new Set();if(!pending.length)return false;const queue=[pending[0]];for(let i=0;i<queue.length;i++){const c=queue[i],key=c.join(',');if(seen.has(key))continue;seen.add(key);for(const p of pending)if(!seen.has(p.join(','))&&p.reduce((n,x,a)=>n+Math.abs(x-c[a]),0)===1)queue.push(p);}return seen.size===pending.length&&new Set(pending.map(c=>c.join(','))).size===pending.length;}
  // Independent fit oracle: try every translation inside the actual cube.
  function fits(puzzle,piece){if(piece.length!==puzzle.missing.length)return false;const missing=new Set(puzzle.missing.map(id));for(let x=-2;x<puzzle.size;x++)for(let y=-2;y<puzzle.size;y++)for(let z=-2;z<puzzle.size;z++)if(piece.every(c=>missing.has(`${c.x+x},${c.y+y},${c.z+z}`)))return true;return false;}
  const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  function sameUnderRotation(a,b){if(a.length!==b.length)return false;const target=normalized(b);for(const p of permutations){let parity=0;for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)if(p[i]>p[j])parity++;for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){if(x*y*z*(parity%2?-1:1)!==1)continue;const signs=[x,y,z];if(normalized(a.map(c=>{const v=[c.x,c.y,c.z];return{x:signs[0]*v[p[0]],y:signs[1]*v[p[1]],z:signs[2]*v[p[2]]};}))===target)return true;}}return false;}
  // Ray/box oracle does NOT use the renderer's culling or painter order.
  // On each primitive projected triangle, find the foremost occupied voxel.
  const faceCorners={x:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],y:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]],z:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]};
  function oracleImage(cells){
    const samples=new Map();for(const c of cells)for(const axis of ['x','y','z'])for(const tri of [[0,1,2],[0,2,3]]){
      const points=tri.map(i=>faceCorners[axis][i].map((n,a)=>n+[c.x,c.y,c.z][a]));
      const projected=points.map(([x,y,z])=>[x-y,x+y-2*z]);const key=projected.map(p=>p.join(',')).sort().join(';');
      samples.set(key,{projected,point:[0,1,2].map(a=>points.reduce((sum,p)=>sum+p[a],0)/3)});
    }
    const result=new Map();for(const [key,sample] of samples){let nearest=-Infinity,owner,face;for(const c of cells){const lower=[c.x,c.y,c.z].map((n,a)=>n-sample.point[a]),upper=lower.map(n=>n+1),lo=Math.max(...lower),hi=Math.min(...upper);if(hi-lo>1e-8&&hi>nearest){nearest=hi;owner=id(c);face=['x','y','z'][upper.indexOf(hi)];}}if(owner)result.set(key,{owner,face,projected:sample.projected});}return result;
  }
  function checkImage(cells){const expected=oracleImage(cells),actual=renderer.visibleTriangles(cells);assert(actual.size===expected.size,'Missing or extra projected triangles');for(const [key,face] of expected){const got=actual.get(key);assert(got&&id(got.cell)===face.owner&&got.axis===face.face,'Incorrect face occlusion/order');}return expected;}
  function imageSignature(image){const triangles=[...image.values()],minU=Math.min(...triangles.flatMap(t=>t.projected.map(p=>p[0]))),minV=Math.min(...triangles.flatMap(t=>t.projected.map(p=>p[1])));return new Map(triangles.map(t=>[t.projected.map(([u,v])=>`${u-minU},${v-minV}`).sort().join(';'),t.face]));}
  function imageDifference(a,b){const union=new Set([...a.keys(),...b.keys()]);let different=0;for(const key of union)if(a.get(key)!==b.get(key))different++;return different/union.size;}
  function inspect(puzzle){
    const {size,missing,remaining,options}=puzzle,removed=new Set(missing.map(id));
    assert(size===(puzzle.difficulty==='hard'?4:3)&&options.length===3,'Invalid size/choice count');assert(joined(missing)&&joined(remaining),'Disconnected cube/hole');
    const complete=[];for(let x=0;x<size;x++)for(let y=0;y<size;y++)for(let z=0;z<size;z++)complete.push({x,y,z});
    assert(missing.every(c=>[c.x,c.y,c.z].every(n=>Number.isInteger(n)&&n>=0&&n<size)),'Hole out of bounds');
    assert(remaining.length+missing.length===size**3,'Wrong occupied count');assert(remaining.every(c=>!removed.has(id(c)))&&new Set([...missing,...remaining].map(id)).size===size**3,'Incomplete/disjoint coverage');
    const exteriorOwners=new Set([...oracleImage(complete).values()].map(f=>f.owner));
    for(const c of missing){assert(exteriorOwners.has(id(c)),'Hidden deciding voxel');for(let z=c.z+1;z<size;z++)assert(removed.has(`${c.x},${c.y},${z}`),'Cannot insert from above');}
    checkImage(remaining);const images=[];
    for(const piece of options){assert(joined(piece),'Disconnected option');assert(piece.every(c=>[c.x,c.y,c.z].every(n=>Number.isInteger(n)&&n>=0&&n<size)),'Invalid option coordinates');const image=checkImage(piece),seen=new Set([...image.values()].map(f=>f.owner));assert(piece.every(c=>seen.has(id(c))),'Hidden option voxel');images.push(imageSignature(image));}
    const matches=options.map(piece=>fits(puzzle,piece));assert(matches.filter(Boolean).length===1,'Not exactly one solution');
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){assert(!sameUnderRotation(options[i],options[j]),'Rotationally equivalent choices');assert(imageDifference(images[i],images[j])+1e-10>=(puzzle.difficulty==='easy'&&missing.length<=3?.26:.14),'Indistinguishable projected choices');}
    assert(normalized(options[matches.indexOf(true)])===normalized(missing),'Wrong answer shape');
    return matches.indexOf(true);
  }
  const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(const difficulty of ['easy','hard'])test(`${difficulty==='easy'?'かんたん':'むずかしい'}: 1000問の独立適合・視認性・描画・一意性検証`,()=>{
    const random=seeded(difficulty==='easy'?219:571),times=[],unique=new Set(),holes=new Set(),answerPositions=[0,0,0],counts={};
    for(let i=0;i<1000;i++){const start=performance.now(),p=generator.generate(difficulty,random);times.push(performance.now()-start);assert(generator.validate(p),'Generator validation failed');const answer=inspect(p);answerPositions[answer]++;unique.add(JSON.stringify(p));holes.add(p.missing.map(id).sort().join(';'));counts[p.missing.length]=(counts[p.missing.length]||0)+1;
      const state=game.createState(p);for(let j=0;j<3;j++)if(j!==answer){assert(game.choose(state,j)==='wrong','Wrong choice accepted');assert(state.phase==='playing','Wrong choice locks play');}assert(game.choose(state,answer)==='correct'&&game.complete(state),'Correct choice cannot complete');
    }
    assert(unique.size>200&&holes.size>=(difficulty==='easy'?9:12),'Insufficient variety');assert(difficulty==='easy'?counts[2]>0&&counts[3]>0&&counts[4]>0&&counts[5]>0:!counts[2]&&!counts[3]&&counts[4]>0&&counts[5]>0,'Unexpected difficulty mix');assert(answerPositions.every(n=>n>200&&n<450),'Answer position bias');
    times.sort((a,b)=>a-b);statistics[difficulty]={puzzles:1000,uniquePuzzles:unique.size,uniqueHoles:holes.size,answerPositions,missingCounts:counts,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[950],maxMs:times.at(-1)};
  });
  test('投影: 等長の3軸・同じ向き・平行移動',()=>{
    const o=renderer.project({x:0,y:0,z:0});assert(o.x===0&&o.y===0,'Origin');const axes=[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}].map(renderer.project);for(const a of axes)assert(Math.abs(Math.hypot(a.x,a.y)-Math.sqrt(1200))<1e-8,'Unequal edges');assert(axes[0].x===30&&axes[1].x===-30&&axes[2].y<0,'Axis directions');const p=renderer.project({x:2,y:1,z:2}),shift=renderer.project({x:1,y:2,z:0}),sum=renderer.project({x:3,y:3,z:2});assert(Math.abs(sum.x-p.x-shift.x)<1e-8&&Math.abs(sum.y-p.y-shift.y)<1e-8,'Translation changes shape');
  });
  test('完全な立方体: 共有面を除去し、表面と重なり順が正しい',()=>{
    for(const size of [3,4]){const full=generator.fullCube(size);assert(renderer.faces(full).length===3*size*size,'Internal or missing faces');assert(checkImage(full).size===6*size*size,'Complete silhouette');const faces=renderer.faces(full);assert(faces.every((f,i)=>!i||f.cell.x+f.cell.y+f.cell.z>=faces[i-1].cell.x+faces[i-1].cell.y+faces[i-1].cell.z),'Not back-to-front');}
  });
  test('穴の内側の面と完成後の面が実データに対応',()=>{
    const p=generator.generate('hard',seeded(11)),hole=checkImage(p.remaining),complete=checkImage([...p.remaining,...p.missing]);assert(renderer.faces(p.remaining).some(f=>f.cell[f.axis]+1<p.size),'No inner cavity wall');assert(complete.size===6*p.size*p.size&&hole.size!==0,'Completion is incomplete');assert([...hole].some(([k,f])=>complete.get(k)?.owner!==f.owner),'Hole is only decorative');
  });
  test('完全に隠れる候補ボクセルを拒否',()=>{
    const p=structuredClone(generator.generate('hard',seeded(27))),hidden=[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:1,y:1,z:0},{x:1,y:1,z:1}];assert(!renderer.allVisible(hidden),'Hidden back voxel considered visible');p.options[0]=hidden;assert(!generator.validate(p),'Hidden candidate accepted');
  });
  test('不正な穴・サイズ・重複・同一候補を拒否',()=>{
    const original=generator.generate('easy',seeded(14));for(const change of [p=>p.size=4,p=>p.missing.push(p.missing[0]),p=>p.remaining.pop(),p=>p.options[1]=p.options[0],p=>p.options.pop(),p=>p.options[0][0].x=9]){const p=structuredClone(original);change(p);assert(!generator.validate(p),'Malformed puzzle accepted');}
    assert(!generator.visibleMissing(3,[{x:0,y:0,z:0}]),'Hidden back corner accepted');assert(!generator.visibleMissing(4,[{x:0,y:0,z:0}]),'Hidden 4x4 back corner accepted');const hard=structuredClone(generator.generate('hard',seeded(73)));for(const change of [p=>p.size=3,p=>p.remaining.pop(),p=>p.missing.push(p.missing[0])]){const p=structuredClone(hard);change(p);assert(!generator.validate(p),'Malformed hard cube accepted');}assert(!generator.validate(null),'Null accepted');
  });
  test('不正解は何度でも再挑戦、正解以外では完成しない',()=>{
    const p=generator.generate('hard',seeded(43)),state=game.createState(p),wrong=p.options.findIndex(piece=>!fits(p,piece));for(let i=0;i<20;i++){assert(game.choose(state,wrong)==='wrong'&&state.phase==='playing','Retry blocked');assert(!game.complete(state),'Wrong choice completed');}for(const index of [-1,3,.5,null])assert(game.choose(state,index)==='ignored','Invalid choice accepted');assert(state.puzzle===p,'Retry changed puzzle');
  });
  test('正解中の連打・重複クリアを防止',()=>{
    const p=generator.generate('easy',seeded(67)),state=game.createState(p),answer=p.options.findIndex(piece=>fits(p,piece));assert(game.choose(state,answer)==='correct','Correct rejected');for(let i=0;i<3;i++)assert(game.choose(state,i)==='ignored','Duplicate fit');assert(game.complete(state)&&!game.complete(state),'Duplicate completion');assert(game.choose(state,answer)==='ignored','Cleared choice replayed');
  });
  test('やりなおしは同じ問題・候補順に戻る',()=>{
    const p=generator.generate('hard',seeded(71)),before=JSON.stringify(p),state=game.createState(p);game.choose(state,p.options.findIndex(piece=>fits(p,piece)));const reset=game.createState(state.puzzle);assert(reset.puzzle===p&&JSON.stringify(reset.puzzle)===before,'Puzzle/order changed');assert(reset.phase==='playing'&&reset.selected===null&&reset.wrong===null,'Not reset');
  });
  test('固定・異常な乱数でも有効なフォールバックで終了',()=>{
    for(const difficulty of ['easy','hard'])for(const value of [0,1,1-Number.EPSILON,NaN]){let calls=0;const p=generator.generate(difficulty,()=>{assert(++calls<20000,'Unbounded generator');return value;});assert(generator.validate(p),'Unsafe fallback');inspect(p);}assert(generator.generate('unknown',()=>0).difficulty==='easy','Unknown difficulty');
  });
  window.cubeTestResults={passed:results.every(r=>r.passed),results,statistics};
  const output=document.getElementById('cube-results');if(output)output.textContent=results.map(r=>`${r.passed?'PASS':'FAIL'} ${r.name}${r.error?`: ${r.error}`:''}`).join('\n')+`\n\n${results.filter(r=>r.passed).length} / ${results.length} PASS`;
})();
