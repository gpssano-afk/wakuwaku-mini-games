(() => {
  "use strict";
  const rules=window.RailGenerator,game=window.RailConnect,results=[],statistics={};
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  function test(name,action){try{action();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.message});}}
  const randomFromSeed=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const connections=t=>t.type==="empty"?[]:t.type==="straight"?[t.rotation,(t.rotation+2)%4]:t.type==="curve"?[t.rotation,(t.rotation+1)%4]:[t.rotation];
  function solveByRotating(puzzle){
    const state=game.createState(puzzle);
    for(const n of puzzle.solution.slice(1,-1)){
      const expected=connections({...puzzle.tiles[n],rotation:puzzle.tiles[n].solutionRotation}).sort().join();
      if(!puzzle.tiles[n].movable){assert(connections(state.tiles[n]).sort().join()===expected,"Fixed rail mismatched solution");continue;}
      let turns=0;while(connections(state.tiles[n]).sort().join()!==expected&&turns<4){assert(game.rotate(state,n),"Rotation failed");turns++;}
      assert(turns<4,"Cannot solve using rotation");
    }
    return state;
  }
  for(const difficulty of ["easy","hard"])test(`${difficulty==="easy"?"かんたん":"むずかしい"}: 1000問の生成・接続口・回転だけの解答・難易度`,()=>{
    const random=randomFromSeed(difficulty==="easy"?930:750),times=[],shapes=new Set(),sizes=new Set();
    let lengths=0,curves=0,rotations=0,dummies=0;
    for(let i=0;i<1000;i++){
      const start=performance.now(),p=rules.generate(difficulty,random);times.push(performance.now()-start);
      assert(rules.isValid(p),"Invalid puzzle");assert(!rules.trace(p),"Initially solved");
      assert(Object.isFrozen(p)&&Object.isFrozen(p.tiles[0]),"Mutable puzzle");sizes.add(p.rows);
      assert(new Set(p.solution).size===p.solution.length,"Repeated solution cell");
      const solved=solveByRotating(p),path=rules.trace(p,solved.tiles);assert(path&&path.join()===p.solution.join(),"Rotation solution failed");
      for(let k=1;k<path.length;k++){
        const a=path[k-1],b=path[k],dr=Math.floor(b/p.cols)-Math.floor(a/p.cols),dc=b%p.cols-a%p.cols;
        assert(Math.abs(dr)+Math.abs(dc)===1,"Diagonal/long step");
        const d=dr===-1?0:dc===1?1:dr===1?2:3;
        assert(connections(solved.tiles[a]).includes(d)&&connections(solved.tiles[b]).includes((d+2)%4),"Unmatched ports");
      }
      const bends=p.solution.filter(n=>p.tiles[n].type==="curve").length;
      assert(difficulty==="easy"?p.solution.length>=5&&p.solution.length<=7&&bends===1:p.solution.length>=2*p.rows+2&&bends>=4,"Difficulty not met");
      const changed=p.solution.filter(n=>connections(p.tiles[n]).sort().join()!==connections(solved.tiles[n]).sort().join());assert(changed.length>=2,"Needs fewer than two rail changes");
      const movable=p.tiles.map((tile,index)=>tile.movable?index:-1).filter(index=>index>=0);
      const target=difficulty==="easy"?(p.rows===3?2:3):(p.rows===4?3:4);
      assert(movable.length===target,"Too many rotating rails");
      assert(movable.every(index=>p.solution.slice(1,-1).includes(index)),"Unexpected movable rail");
      for(const index of p.solution.slice(1,-1)){
        if(!p.tiles[index].movable)assert(!game.rotate(game.createState(p),index),"Fixed rail rotated");
      }
      // The rails adjacent to both fixed stations initially lack the station port.
      const first=p.solution[1],last=p.solution.at(-2);
      assert(!connections(p.tiles[first]).includes(rules.direction(first,p.start,p.cols))&&!connections(p.tiles[last]).includes(rules.direction(last,p.goal,p.cols)),"An endpoint initially connected");
      for(const n of p.solution.slice(1,-1)){
        const t=p.tiles[n],full=(t.solutionRotation-t.rotation+4)%4;rotations+=t.type==="straight"?Math.min(full,(full+2)%4):full;
      }
      const unused=p.tiles.filter((t,n)=>t.type!=="empty"&&!p.solution.includes(n)).length;assert(difficulty==="easy"?unused<=1:unused>=1,"Wrong dummy count");
      lengths+=path.length;curves+=bends;dummies+=unused;shapes.add(JSON.stringify(p));
    }
    assert(sizes.size===2&&shapes.size>100,"Insufficient variety");times.sort((a,b)=>a-b);
    statistics[difficulty]={puzzles:1000,uniquePuzzles:shapes.size,averageLength:lengths/1000,averageCurves:curves/1000,averageTurns:rotations/1000,averageDummies:dummies/1000,
      meanMs:times.reduce((a,b)=>a+b,0)/1000,p95Ms:times[950],maxMs:times.at(-1)};
  });
  test("タップ相当の回転で接続口が時計回り90度ずつ変わる",()=>{
    const p=rules.generate("easy",()=>0),s=game.createState(p),n=p.solution[1],before=s.tiles[n].rotation,original=connections(s.tiles[n]);
    assert(game.rotate(s,n)&&s.tiles[n].rotation===(before+1)%4,"Not 90 degrees");
    assert(connections(s.tiles[n]).every(d=>original.map(x=>(x+1)%4).includes(d)),"Ports did not rotate");
    for(let i=0;i<3;i++)game.rotate(s,n);assert(s.tiles[n].rotation===before,"Four turns not original");
    assert(p.tiles[n].rotation===before,"Mutated initial puzzle");
  });
  test("駅・草原は固定、電車走行中とクリア後は回転できない",()=>{
    const p=rules.generate("easy",()=>0),s=game.createState(p),n=p.solution[1];
    assert(!game.rotate(s,p.start)&&!game.rotate(s,p.goal)&&!game.rotate(s,-1),"Station changed");
    const fixed=p.solution.slice(1,-1).find(index=>!p.tiles[index].movable);
    if(fixed!==undefined)assert(!game.rotate(s,fixed),"Fixed rail rotated");
    const empty=p.tiles.findIndex(t=>t.type==="empty");assert(!game.rotate(s,empty),"Grass changed");
    for(const phase of ["running","cleared"]){s.phase=phase;assert(!game.rotate(s,n),"Animation rotation allowed");}
  });
  function alternatePuzzle(){
    const tiles=Array.from({length:16},()=>({type:"empty",rotation:0,solutionRotation:0}));
    tiles[4]={type:"start",rotation:1};tiles[7]={type:"goal",rotation:3};
    for(const[n,r]of [[5,3],[1,1],[2,2],[6,0],[9,0],[10,3]])tiles[n]={type:"curve",rotation:r};
    return{rows:4,cols:4,start:4,goal:7,tiles,solution:[4,5,1,2,6,7]};
  }
  test("生成時と異なる有効な経路でもクリアし、ダミーの向きは問わない",()=>{
    const p=alternatePuzzle();assert(rules.trace(p).join()===p.solution.join(),"Original path rejected");
    const tiles=p.tiles.map(t=>({...t}));tiles[5].rotation=2;tiles[6].rotation=1;tiles[1].rotation=0;tiles[2].rotation=0;
    assert(rules.trace(p,tiles)?.join()==="4,5,9,10,6,7","Alternate route rejected");
  });
  test("片側だけの接続・切れ目・盤面外・斜めはクリアしない",()=>{
    const p=alternatePuzzle();
    for(const[n,r]of [[1,0],[5,0],[6,3]]){const tiles=p.tiles.map(t=>({...t}));tiles[n].rotation=r;assert(!rules.trace(p,tiles),"Broken connection accepted");}
    const missing=p.tiles.map(t=>({...t}));missing[2]={type:"empty",rotation:0};assert(!rules.trace(p,missing),"Gap accepted");
    const outside={rows:3,cols:3,start:0,goal:8,tiles:Array.from({length:9},()=>({type:"empty",rotation:0}))};outside.tiles[0]={type:"start",rotation:0};outside.tiles[8]={type:"goal",rotation:3};assert(!rules.trace(outside),"Outside route accepted");
    outside.tiles[0].rotation=1;outside.tiles[4]={type:"curve",rotation:3};assert(!rules.trace(outside),"Diagonal route accepted");
  });
  test("閉じたループや駅へ戻る経路でも無限探索せず終了",()=>{
    const p=alternatePuzzle();for(const[n,r]of [[1,1],[2,2],[5,0],[6,3]])p.tiles[n]={type:"curve",rotation:r};
    for(let i=0;i<1000;i++)assert(!rules.trace(p),"Closed loop cleared");
    const start=performance.now();for(let i=0;i<1000;i++)rules.trace(p);statistics.loop1000Ms=performance.now()-start;
  });
  test("やりなおしは配置・初期方向を維持して電車の状態を初期化",()=>{
    const p=rules.generate("hard",randomFromSeed(10)),before=JSON.stringify(p);let s=solveByRotating(p);s.phase="running";s=game.createState(s.puzzle);
    assert(s.puzzle===p&&s.phase==="playing"&&JSON.stringify(s.tiles)===JSON.stringify(p.tiles)&&JSON.stringify(p)===before,"Reset changed puzzle");
  });
  test("定数・不正乱数でも停止し、安全な解答問題へフォールバック",()=>{
    for(const mode of ["easy","hard"])for(const random of [()=>0,()=>1-Number.EPSILON,()=>NaN]){const p=rules.generate(mode,random);assert(rules.isValid(p)&&rules.trace(p,solveByRotating(p).tiles),"Invalid fallback");}
    assert(rules.generate("unknown",()=>0).difficulty==="easy","Unsafe default");
  });
  test("不正な初期方向・欠けた経路・完成済み問題を検証で拒否",()=>{
    const p=rules.generate("easy",()=>0);assert(!rules.isValid({...p,solution:p.solution.slice(1)}),"Missing solution accepted");
    const tiles=p.tiles.map(t=>({...t}));tiles[0].rotation=4;assert(!rules.isValid({...p,tiles}),"Invalid rotation accepted");
    assert(!rules.isValid({...p,tiles:solveByRotating(p).tiles}),"Initially solved accepted");
  });
  test("10問の盤面サイズは段階的に増加、必ず正解経路あり",()=>{
    for (const difficulty of ["easy","hard"]) {
      let previous=0;
      for(let question=1;question<=10;question++){
        const expected=(difficulty==="easy"?3:4)+(question>=6?1:0);
        for(const random of [randomFromSeed(3000+question),()=>0,()=>1-Number.EPSILON]){
          const puzzle=rules.generate(difficulty,random,question);
          assert(puzzle.rows===expected&&puzzle.cols===expected&&rules.isValid(puzzle),"Size/validity mismatch");
          const solved=puzzle.tiles.map(tile=>({...tile,rotation:tile.solutionRotation}));
          assert(rules.trace(puzzle,solved)?.length===puzzle.solution.length,"Broken scheduled solution");
        }
        assert(expected>=previous,"Shrinking rails");previous=expected;
      }
    }
  });
  window.railTestResults={passed:results.every(r=>r.passed),results,statistics};
  const output=document.getElementById("rail-results");if(output)output.textContent=results.map(r=>`${r.passed?"PASS":"FAIL"} ${r.name}${r.error?`: ${r.error}`:""}`).join("\n")+`\n\n${results.filter(r=>r.passed).length} / ${results.length} PASS`;
})();
