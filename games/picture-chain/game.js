(() => {
  "use strict";
  if(!document.getElementById("play-area"))return;
  const {element,picture,choice}=window.PictureUI,rules=window.ChainRules,words=window.PuzzlePictures.words;
  let stopGame=()=>{};
  function wordCard(word,last,fixed){
    const card=element("div","word-card"),name=element("span","picture-name");card.dataset.word=word.name;card.dataset.item=word.id;
    if(fixed)card.append(element("span","fixed-mark","ここから"));
    card.append(picture(word));
    if(last)name.append(document.createTextNode(word.name.slice(0,-1)),element("span","last-letter",word.name.at(-1)));else name.textContent=word.name;
    card.append(name);return card;
  }
  function mount(p,s,container,practice=false){
    let path=[p.start.id],phase="choosing";
    const byId=new Map(p.cards.map(w=>[w.id,w])),title=element("h2","play-title",practice?"えを じゅんばんに つなごう！":"ぜんぶ つなごう！"),chain=element("ol","chain-list"),instruction=element("p","chain-instruction"),remaining=element("p","remaining-cards"),answers=element("div","choices chain-choices"),undo=element("button","secondary undo-button","↶ ひとつもどす"),result=practice?element("p","guide-result"):s.hint;
    chain.id=practice?"practice-chain":"word-chain";chain.setAttribute("aria-label","つながった しりとり");answers.id=practice?"practice-choices":"word-choices";answers.dataset.count=String(p.count-1);undo.type="button";undo.id=practice?"practice-undo":"undo";
    container.replaceChildren(title,chain,instruction,remaining,answers);
    const practiceActions=element("div","practice-actions");
    if(practice){title.hidden=true;remaining.hidden=true;practiceActions.append(undo);container.append(practiceActions,result);}else container.append(undo);
    function status(){answers.dataset.phase=phase;answers.dataset.used=String(path.length-1);for(const button of answers.children){const used=path.includes(button.dataset.item);button.disabled=used||phase!=="choosing";button.classList.toggle("is-used",used);button.setAttribute("aria-pressed",String(used));button.querySelector(".used-mark").hidden=!used;}undo.disabled=path.length===1||phase!=="choosing";}
    function render(){
      chain.replaceChildren();chain.dataset.path=path.join(";");chain.dataset.length=String(path.length);
      path.forEach((id,i)=>{const step=element("li","chain-step");if(i){const arrow=element("span","chain-arrow"),svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),line=document.createElementNS("http://www.w3.org/2000/svg","path");svg.setAttribute("viewBox","0 0 22 22");line.setAttribute("d",i%3===0?"M4 2v12h13m-5-5 5 5-5 5":"M2 11h16m-5-5 5 5-5 5");svg.append(line);arrow.append(svg);arrow.setAttribute("aria-hidden","true");step.append(arrow);}step.append(wordCard(byId.get(id),i===path.length-1,i===0));chain.append(step);});
      const tail=byId.get(path.at(-1));instruction.replaceChildren(element("span","target-letter",tail.name.at(-1)),document.createTextNode("から はじまる えを タップ！"));remaining.textContent=`のこり ${p.count-path.length}まい`;if(path.length===p.count){instruction.textContent="ぜんぶ つながったね！";remaining.textContent="ぜんぶ つかったよ！";}status();
    }
    for(const word of p.cards.slice(1)){
      const button=choice(word,(selected,button)=>{
        if(phase!=="choosing"||path.includes(selected.id))return;
        if(!rules.canAppend(p,path,selected.id)){if(practice){result.textContent="ちがうよ。もういちど！";}else s.wrong(button);return;}
        path=[...path,selected.id];phase="joining";result.textContent="つながったね！";render();
        if(rules.isComplete(p,path)){phase="won";status();if(practice)result.textContent="できた！ ぜんぶ つながったね！";else s.win();return;}
        s.later(()=>{phase="choosing";status();if(!p.cards.some(w=>rules.canAppend(p,path,w.id)))result.textContent="ひとつもどして つなぎなおそう！";},180);
      });
      const mark=element("span","used-mark","✓");mark.hidden=true;mark.setAttribute("aria-hidden","true");button.append(mark);answers.append(button);
    }
    undo.addEventListener("click",()=>{if(phase!=="choosing"||path.length===1)return;path=path.slice(0,-1);result.textContent="つなぎなおして みよう！";render();});
    if(practice){const again=element("button","secondary practice-again","↻ もういちど");again.type="button";again.id="practice-reset";again.addEventListener("click",()=>{if(phase==="joining"||phase==="stopped")return;path=[p.start.id];phase="choosing";result.textContent="ぜんぶの えを つなごう！";render();});practiceActions.append(again);result.textContent="ぜんぶ つなげて みよう！";}
    stopGame=()=>{phase="stopped";status();};render();
  }
  new window.TenGame({
    generate:rules.generate,stop(){stopGame();},
    guide(container,s){const route=["apple","gorilla","trumpet"].map(id=>words.find(w=>w.id===id));mount({number:1,count:3,start:route[0],cards:[route[0],route[2],route[1]],solution:route.map(w=>w.id)},s,container,true);},
    reset(p,s){mount(p,s,s.area);}
  });
})();
