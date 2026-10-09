(() => {
  "use strict";
  const rules=window.CubeGenerator,renderer=window.CubeRenderer;
  function createState(puzzle) {return {puzzle,phase:'playing',selected:null,wrong:null};}
  function choose(state,index) {
    if(state.phase!=='playing'||!Number.isInteger(index)||!state.puzzle.options[index])return 'ignored';
    if(!rules.fits(state.puzzle,state.puzzle.options[index])) {state.wrong=index;return 'wrong';}
    state.selected=index;state.wrong=null;state.phase='fitting';return 'correct';
  }
  function complete(state) {
    if(state.phase!=='fitting'||!rules.fits(state.puzzle,state.puzzle.options[state.selected]))return false;
    state.phase='cleared';return true;
  }
  window.CubeFit=Object.freeze({createState,choose,complete});
  const scene=document.getElementById('cube-scene');if(!scene)return;
  const choices=document.getElementById('cube-choices'),overlay=document.getElementById('clear-overlay'),finished=document.getElementById('set-complete');
  const next=document.getElementById('next'),replay=document.getElementById('set-play-again'),hint=document.getElementById('hint'),announcement=document.getElementById('announcement');
  const progress=document.getElementById('set-progress'),SET_SIZE=10;
  const difficulty=new URLSearchParams(location.search).get('difficulty')==='hard'?'hard':'easy';
  const NS='http://www.w3.org/2000/svg';
  let puzzle,state,number=0,completed=0,frame=null,run=0,floating=null;
  const segments=Array.from({length:SET_SIZE},()=>{const el=document.createElement('span');el.className='set-progress-step';el.setAttribute('aria-hidden','true');progress.append(el);return el;});
  document.getElementById('difficulty-label').textContent=difficulty==='hard'?'むずかしい':'かんたん';
  function drawStatus() {
    scene.dataset.question=String(number);scene.dataset.difficulty=difficulty;scene.dataset.phase=state.phase;
    document.getElementById('stage-number').textContent=`もんだい ${number} / ${SET_SIZE}`;
    progress.setAttribute('aria-valuenow',String(completed));segments.forEach((el,i)=>el.classList.toggle('is-done',i<completed));
    for(const button of choices.querySelectorAll('button'))button.disabled=state.phase!=='playing';
  }
  function stopAnimation() {run++;if(frame!==null)cancelAnimationFrame(frame);frame=null;floating?.remove();floating=null;scene.classList.remove('is-complete');}
  function description(cells) {
    return cells.map(c=>`よこ${c.x+1}、おく${c.y+1}、たかさ${c.z+1}`).join('。');
  }
  function render() {
    scene.setAttribute('viewBox',renderer.viewBox(rules.fullCube(puzzle.size),16));
    scene.setAttribute('aria-label','てまえと うえが かけた キューブ');
    renderer.draw(scene,puzzle.remaining,{size:puzzle.size});choices.replaceChildren();
    const bounds=puzzle.options.map(renderer.bounds),width=Math.max(...bounds.map(b=>b.right-b.left))+18,height=Math.max(...bounds.map(b=>b.bottom-b.top))+18;
    puzzle.options.forEach((piece,i)=>{
      const button=document.createElement('button');button.type='button';button.className='cube-choice';button.dataset.option=String(i);
      button.setAttribute('aria-label',`${i+1}ばんの ブロック。キューブ ${piece.length}こ`);
      button.setAttribute('aria-describedby',`shape-${i}`);
      const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`${-width/2} ${-height/2} ${width} ${height}`);svg.setAttribute('aria-hidden','true');
      const b=bounds[i],g=renderer.group(piece,{piece:true});g.classList.add('voxel-piece');g.setAttribute('transform',`translate(${-((b.left+b.right)/2)} ${-((b.top+b.bottom)/2)})`);svg.append(g);
      const label=document.createElement('span');label.className='choice-number';label.textContent=['①','②','③'][i];
      const desc=document.createElement('span');desc.id=`shape-${i}`;desc.className='sr-only';desc.textContent=description(piece);
      button.append(svg,label,desc);button.addEventListener('click',()=>select(i,button));choices.append(button);
    });
    drawStatus();
  }
  function finish() {
    frame=null;if(!complete(state))return;completed=Math.max(completed,number);drawStatus();
    const final=number===SET_SIZE;overlay.hidden=final;finished.hidden=!final;
    hint.textContent='ぴったり！ キューブが できたね！';
    announcement.textContent=final?'ぜんぶ できた！ 10もん クリア！':'できた！';
    (final?replay:next).focus({preventScroll:true});
  }
  function animateFit(index,button) {
    const piece=puzzle.options[index],source=button.querySelector('.voxel-piece').getScreenCTM(),target=scene.getScreenCTM();
    const origin={x:Math.min(...puzzle.missing.map(c=>c.x)),y:Math.min(...puzzle.missing.map(c=>c.y)),z:Math.min(...puzzle.missing.map(c=>c.z))};
    const offset=renderer.project(origin),to={a:target.a,d:target.d,e:target.e+target.a*offset.x,f:target.f+target.d*offset.y};
    const svg=document.createElementNS(NS,'svg');svg.classList.add('flying-piece');svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);svg.setAttribute('aria-hidden','true');
    const g=renderer.group(piece,{piece:true});svg.append(g);document.body.append(svg);floating=svg;
    button.classList.add('is-selected');button.querySelector('svg').classList.add('in-flight');
    const token=++run,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?120:850,glow=reduced?60:320,start=performance.now();
    const setPosition=t=>g.setAttribute('transform',`matrix(${source.a+(to.a-source.a)*t} 0 0 ${source.d+(to.d-source.d)*t} ${source.e+(to.e-source.e)*t} ${source.f+(to.f-source.f)*t})`);
    setPosition(0);
    function tick(now) {
      if(token!==run)return;
      const t=Math.min(1,(now-start)/duration),eased=t*t*(3-2*t);setPosition(eased);
      if(t<1){frame=requestAnimationFrame(tick);return;}
      // Merge actual occupied cells, recompute exposed faces, then celebrate.
      floating.remove();floating=null;
      renderer.draw(scene,[...puzzle.remaining,...puzzle.missing],{size:puzzle.size,highlight:new Set(puzzle.missing.map(renderer.key))});
      scene.setAttribute('aria-label','ぜんぶ そろった キューブ');scene.classList.add('is-complete');
      const end=now+glow;
      function settle(time){if(token!==run)return;if(time<end)frame=requestAnimationFrame(settle);else finish();}
      frame=requestAnimationFrame(settle);
    }
    frame=requestAnimationFrame(tick);
  }
  function select(index,button) {
    const result=choose(state,index);if(result==='ignored')return;
    choices.querySelectorAll('.is-wrong').forEach(el=>el.classList.remove('is-wrong'));
    if(result==='wrong') {
      button.classList.remove('is-wrong');void button.offsetWidth;button.classList.add('is-wrong');
      hint.textContent='ちがうよ。もういちど！';announcement.textContent=hint.textContent;return;
    }
    hint.textContent='ぴったり はまるかな？';announcement.textContent='';drawStatus();animateFit(index,button);
  }
  function reset() {stopAnimation();state=createState(puzzle);overlay.hidden=true;finished.hidden=true;hint.textContent='ぴったり はまるのは どれ？';announcement.textContent='';render();}
  function newPuzzle() {stopAnimation();puzzle=rules.generate(difficulty);number++;reset();}
  next.addEventListener('click',()=>{if(state.phase==='cleared'&&number<SET_SIZE)newPuzzle();});
  replay.addEventListener('click',()=>{if(state.phase==='cleared'&&number===SET_SIZE){number=0;completed=0;newPuzzle();}});
  document.getElementById('reset').addEventListener('click',reset);
  for(const link of document.querySelectorAll('a'))link.addEventListener('click',stopAnimation);
  window.addEventListener('pagehide',reset);window.addEventListener('resize',()=>{if(state?.phase==='fitting')reset();});
  newPuzzle();
})();
