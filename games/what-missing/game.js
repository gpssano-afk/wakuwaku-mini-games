(() => {
  "use strict";
  if(!document.getElementById("play-area"))return;
  const {element,picture,choice}=window.PictureUI,rules=window.MissingRules,items=window.PuzzlePictures.memory;
  let phase="stopped",session;
  const controller={
    generate:rules.generate,
    stop(){phase="stopped";},
    guide(container,s){
      container.replaceChildren();const row=element("div","guide-sample"),sample=items.filter(x=>["apple","bear","car"].includes(x.id));
      for(const id of ["apple","bear","car"]){const cell=element("span","guide-object");cell.dataset.item=id;cell.append(picture(sample.find(x=>x.id===id)));row.append(cell);}
      const prompt=element("p","guide-result","おぼえてね。ひとつ きえるよ。"),answers=element("div","choices"),result=element("p","guide-result");
      let ready=false,done=false;
      for(const id of ["cat","bear"]){const item=items.find(x=>x.id===id);const button=choice(item,()=>{if(!ready||done)return;if(id==="bear"){done=true;row.children[1].replaceChildren(picture(item));result.textContent="できた！ これが きえたね。";}else result.textContent="もういちど えらんでね。";});button.disabled=true;answers.append(button);}
      container.append(row,prompt,answers,result);
      s.later(()=>{ready=true;row.children[1].replaceChildren(element("span","question-mark","？"));prompt.textContent="なにがきえた？ タップしてみよう！";for(const b of answers.children)b.disabled=false;},1800);
    },
    reset(p,s){
      phase="remembering";s.area.replaceChildren();const title=element("h2","play-title","おぼえよう！"),board=element("div","memory-board");board.id="memory-board";board.dataset.phase=phase;
      const cells=p.items.map(item=>{const cell=element("div","memory-cell");cell.dataset.item=item.id;cell.append(picture(item));board.append(cell);return cell;});
      const timer=element("div","memory-timer"),time=element("div","memory-time");timer.setAttribute("role","progressbar");timer.setAttribute("aria-label","おぼえる じかん");timer.setAttribute("aria-valuemin","0");timer.setAttribute("aria-valuemax",String(p.seconds));timer.append(time);
      const answers=element("div","choices");answers.id="memory-choices";answers.dataset.count=String(p.choices);answers.hidden=true;
      for(const item of p.options)answers.append(choice(item,(selected,button)=>{
        if(phase!=="choosing")return;
        if(!rules.correct(p,selected.id)){s.wrong(button);return;}
        phase="won";board.dataset.phase=phase;cells[p.missing].replaceChildren(picture(p.items[p.missing]));button.classList.add("is-right");for(const b of answers.children)b.disabled=true;again.disabled=true;s.win();
      }));
      const again=element("button","secondary remember-again","↻ もういちどみる");again.type="button";again.hidden=true;again.addEventListener("click",()=>{if(phase==="choosing")s.reset();});
      s.area.append(title,board,timer,answers,again);
      const started=performance.now();
      function tick(){if(phase!=="remembering")return;const remaining=Math.max(0,p.seconds-(performance.now()-started)/1000);time.style.width=`${remaining/p.seconds*100}%`;timer.setAttribute("aria-valuenow",String(Math.ceil(remaining)));if(remaining>0)s.later(tick,100);}
      tick();
      s.later(()=>{if(phase!=="remembering")return;phase="covering";board.dataset.phase=phase;title.textContent="なにが きえるかな？";timer.hidden=true;cells.forEach(cell=>{cell.classList.add("is-covered");cell.setAttribute("aria-hidden","true");});
        s.later(()=>{phase="choosing";board.dataset.phase=phase;title.textContent="なにがきえたかな？";cells.forEach(cell=>{cell.classList.remove("is-covered");cell.removeAttribute("aria-hidden");});cells[p.missing].replaceChildren(element("span","missing-mark","？"));cells[p.missing].dataset.missing="true";answers.hidden=false;again.hidden=false;s.hint.textContent="きえた えを タップ！";},500);
      },p.seconds*1000);
    }
  };
  session=new window.TenGame(controller);
})();
