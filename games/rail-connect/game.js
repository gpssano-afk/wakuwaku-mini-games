(() => {
  "use strict";
  const rules = window.RailGenerator;
  function createState(puzzle) { return {puzzle,tiles:puzzle.tiles.map(t=>({...t})),phase:"playing"}; }
  function rotate(state, index) {
    const tile = state.tiles[index];
    if (state.phase !== "playing" || !tile || !["straight","curve"].includes(tile.type) || !tile.movable) return false;
    tile.rotation = (tile.rotation + 1) % 4; return true;
  }
  window.RailConnect = Object.freeze({createState,rotate,trace:rules.trace});
  const board = document.getElementById("rail-board");
  if (!board) return;
  const NS = "http://www.w3.org/2000/svg", SET_SIZE = 10;
  const difficulty = new URLSearchParams(location.search).get("difficulty") === "hard" ? "hard" : "easy";
  const overlay = document.getElementById("clear-overlay"), finished = document.getElementById("set-complete");
  const next = document.getElementById("next"), replay = document.getElementById("set-play-again");
  const progress = document.getElementById("set-progress"), hint = document.getElementById("hint"), announcement = document.getElementById("announcement");
  const trainLayer = document.getElementById("train-layer"), train = document.getElementById("train"), trainPath = document.getElementById("train-path");
  const progressSteps = Array.from({length:SET_SIZE},()=> { const el=document.createElement("span"); el.className="set-progress-step"; el.setAttribute("aria-hidden","true"); progress.append(el); return el; });
  let puzzle, state, number = 0, completed = 0, frame = null, run = 0;
  document.getElementById("difficulty-label").textContent = difficulty === "hard" ? "むずかしい" : "かんたん";
  function svg(tag, attrs = {}) { const el=document.createElementNS(NS,tag); for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v); return el; }
  function railArt(d) {
    const group=svg("g",{class:"rail-art"});
    group.append(svg("path",{d,fill:"none",stroke:"#edb24c","stroke-width":26,"stroke-dasharray":"5 12"}),
      svg("path",{d,fill:"none",stroke:"#467aa4","stroke-width":17}),svg("path",{d,fill:"none",stroke:"#eaf5dc","stroke-width":8}));
    return group;
  }
  const center = n => ({x:(n%puzzle.cols+.5)*100,y:(Math.floor(n/puzzle.cols)+.5)*100});
  const edge = (n,d) => { const c=center(n); return {x:c.x+[0,50,0,-50][d],y:c.y+[-50,0,50,0][d]}; };
  function stopTrain() { run++; if(frame!==null)cancelAnimationFrame(frame); frame=null; }
  function positionTrain(point, angle) { train.setAttribute("transform",`translate(${point.x} ${point.y}) rotate(${angle})`); }
  function drawStatus() {
    board.dataset.question=String(number); board.dataset.phase=state.phase; board.dataset.difficulty=difficulty;
    document.getElementById("stage-number").textContent=`もんだい ${number} / ${SET_SIZE}`;
    progressSteps.forEach((el,i)=>el.classList.toggle("is-done",i<completed)); progress.setAttribute("aria-valuenow",String(completed));
    for (const el of board.children) el.disabled=state.phase!=="playing" || !["straight","curve"].includes(el.dataset.type) || el.dataset.movable !== "true";
  }
  function render() {
    board.replaceChildren(); board.style.setProperty("--size",puzzle.cols);
    trainLayer.setAttribute("viewBox",`0 0 ${puzzle.cols*100} ${puzzle.rows*100}`);
    state.tiles.forEach((tile,i)=> {
      const button=document.createElement("button"); button.type="button"; button.className=`rail-tile rail-tile--${tile.type}`;
      button.dataset.index=String(i); button.dataset.type=tile.type; button.dataset.rotation=String(tile.rotation);
      button.dataset.movable=String(tile.movable===true);
      button.classList.toggle("rail-tile--movable",tile.movable===true);
      button.classList.toggle("rail-tile--fixed",["straight","curve"].includes(tile.type)&&!tile.movable);
      button.setAttribute("aria-label", tile.type==="empty" ? "くさはら" : tile.type==="start" ? "しゅっぱつの えき" : tile.type==="goal" ? "ゴールの えき" : tile.movable ? "きいろい わく。タップして レールを まわす" : "うごかない レール");
      const image=svg("svg",{viewBox:"0 0 100 100","aria-hidden":"true"});
      image.append(svg("rect",{x:2,y:2,width:96,height:96,rx:14,
        fill:tile.movable?"#fff5d9":"#eaf5dc",
        stroke:tile.movable?"#e6ab2b":"#ccdfb5",
        "stroke-width":tile.movable?5:2}));
      if (tile.type==="straight" || tile.type==="curve") {
        const art=railArt(tile.type==="straight" ? "M50 0V100" : "M50 0Q50 50 100 50"); art.style.transform=`rotate(${tile.rotation*90}deg)`; image.append(art);
        if(tile.movable) {
          const mark=svg("text",{x:85,y:23,"text-anchor":"middle","font-size":24,"font-weight":900,fill:"#946015"});
          mark.textContent="↻";image.append(mark);
        }
      } else if (tile.type==="start" || tile.type==="goal") {
        const p=[{x:50,y:0},{x:100,y:50},{x:50,y:100},{x:0,y:50}][tile.rotation]; image.append(railArt(`M50 50L${p.x} ${p.y}`));
        image.append(svg("rect",{x:24,y:32,width:52,height:40,rx:12,fill:tile.type==="start"?"#83c9e4":"#f5cf6a",stroke:"#466580","stroke-width":3}),
          svg("path",{d:"M23 36L50 22 77 36",fill:"none",stroke:"#466580","stroke-width":5,"stroke-linejoin":"round"}));
        const text=svg("text",{x:50,y:tile.rotation===2?17:93,"text-anchor":"middle","font-size":17,fill:"#253b53","font-weight":800}); text.textContent=tile.type==="start"?"はじまり":"ゴール"; image.append(text);
      } else { image.append(svg("path",{d:"M34 64l4-8 4 8m18-25 4-8 4 8",fill:"none",stroke:"#accb91","stroke-width":4,"stroke-linecap":"round"})); }
      button.append(image); button.addEventListener("click",()=>tap(i,button)); board.append(button);
    });
    trainPath.setAttribute("d",""); positionTrain(center(puzzle.start),puzzle.tiles[puzzle.start].rotation*90-90); drawStatus();
  }
  function pathData(route) {
    const first=center(route[0]); let d=`M${first.x} ${first.y}`;
    const exit=edge(route[0],rules.direction(route[0],route[1],puzzle.cols)); d+=`L${exit.x} ${exit.y}`;
    for(let i=1;i<route.length-1;i++) {
      const n=route[i],out=edge(n,rules.direction(n,route[i+1],puzzle.cols)),c=center(n);
      d+=state.tiles[n].type==="curve"?`Q${c.x} ${c.y} ${out.x} ${out.y}`:`L${out.x} ${out.y}`;
    }
    const last=center(route.at(-1)); return d+`L${last.x} ${last.y}`;
  }
  function arrive() {
    frame=null; state.phase="cleared"; completed=Math.max(completed,number); drawStatus();
    const final=number===SET_SIZE; overlay.hidden=final; finished.hidden=!final;
    hint.textContent=final?"ぜんぶの えきに ついたね！":"えきに ついたよ！";
    announcement.textContent=final?"ぜんぶ できた！ 10もん クリア！":"できた！";
    (final?replay:next).focus({preventScroll:true});
  }
  function startTrain(route) {
    state.phase="running"; drawStatus(); hint.textContent="でんしゃが はしるよ！";
    trainPath.setAttribute("d",pathData(route)); const length=trainPath.getTotalLength(), token=++run;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration=reduced?250:Math.min(2600,900+route.length*90), start=performance.now()+(reduced?0:180);
    function tick(now) {
      if(token!==run)return;
      const t=Math.max(0,Math.min(1,(now-start)/duration)),distance=length*t;
      const point=trainPath.getPointAtLength(distance),before=trainPath.getPointAtLength(Math.max(0,distance-.5)),after=trainPath.getPointAtLength(Math.min(length,distance+.5));
      positionTrain(point,Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI);
      if(t<1)frame=requestAnimationFrame(tick); else arrive();
    }
    frame=requestAnimationFrame(tick);
  }
  function tap(index, button) {
    if(!rotate(state,index))return;
    button.dataset.rotation=String(state.tiles[index].rotation);
    const art=button.querySelector(".rail-art"),angle=parseFloat(art.style.transform.slice(7)) || 0; art.style.transform=`rotate(${angle+90}deg)`;
    const route=rules.trace(puzzle,state.tiles); if(route)startTrain(route);
  }
  function reset() {
    stopTrain(); state=createState(puzzle); overlay.hidden=true; finished.hidden=true; announcement.textContent="";
    hint.textContent="きいろい わくの レールだけ まわせるよ！"; render();
  }
  function newPuzzle() { stopTrain(); number++; puzzle=rules.generate(difficulty, Math.random, number); reset(); }
  next.addEventListener("click",()=>{if(state.phase==="cleared"&&number<SET_SIZE)newPuzzle();});
  replay.addEventListener("click",()=>{if(state.phase==="cleared"&&number===SET_SIZE){number=0;completed=0;newPuzzle();}});
  document.getElementById("reset").addEventListener("click",reset);
  for(const link of document.querySelectorAll("a"))link.addEventListener("click",()=>stopTrain());
  window.addEventListener("pagehide",reset);
  newPuzzle();
})();
