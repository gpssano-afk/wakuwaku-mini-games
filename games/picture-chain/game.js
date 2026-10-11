(() => {
  "use strict";
  if(!document.getElementById("play-area"))return;
  const {element,picture,choice}=window.PictureUI,rules=window.ChainRules,words=window.PuzzlePictures.words;
  let phase="stopped",session;
  function wordCard(word,highlight=false){const card=element("div","word-card"),name=element("span","picture-name");card.dataset.word=word.name;card.append(picture(word));if(highlight)name.append(document.createTextNode(word.name.slice(0,-1)),element("span","last-letter",word.last));else name.textContent=word.name;card.append(name);return card;}
  const controller={
    generate:rules.generate,
    stop(){phase="stopped";},
    guide(container,s){
      container.replaceChildren();const apple=words.find(w=>w.id==="apple"),gorilla=words.find(w=>w.id==="gorilla"),row=element("div","guide-sample"),answers=element("div","choices"),result=element("p","guide-result","りんごの「ご」。ごりらを タップ！");
      row.append(picture(apple),element("span","chain-arrow","→"),element("span","target-letter","ご"));let done=false;
      for(const word of [words.find(w=>w.id==="cat"),gorilla])answers.append(choice(word,()=>{if(done)return;if(word.id===gorilla.id){done=true;row.replaceChildren(picture(apple),element("span","chain-arrow","→"),picture(gorilla));result.textContent="できた！ りんご → ごりら！";}else result.textContent="「ご」から はじまる えを えらぼう。";}));container.append(row,result,answers);
    },
    reset(p,s){
      phase="choosing";let step=0;const chain=element("div","chain");chain.id="word-chain";chain.append(wordCard(p.start,true));const title=element("h2","play-title",p.links===2?"ふたつ つなごう！":"えで つなごう！"),instruction=element("p","chain-instruction"),answers=element("div","choices");answers.id="word-choices";answers.dataset.count=String(p.choices);s.area.replaceChildren(title,chain,instruction,answers);
      function render(){const current=p.steps[step];phase="choosing";answers.dataset.phase=phase;answers.dataset.step=String(step);instruction.replaceChildren(element("span","target-letter",current.from.last),document.createTextNode("から はじまるのは どれ？"));answers.replaceChildren();
        for(const word of current.options)answers.append(choice(word,(selected,button)=>{
          if(phase!=="choosing")return;
          if(!rules.correct(current.from,selected)){s.wrong(button);return;}
          phase="joining";answers.dataset.phase=phase;button.classList.add("is-right");for(const b of answers.children)b.disabled=true;chain.classList.add("has-links");chain.append(element("span","chain-arrow","→"),wordCard(selected,true));
          if(step+1===p.links){phase="won";answers.dataset.phase=phase;s.win();}else{s.hint.textContent="つながったね！ あとひとつ。";s.later(()=>{step++;s.hint.textContent="";render();},650);}
        }));
      }
      render();
    }
  };
  session=new window.TenGame(controller);
})();
