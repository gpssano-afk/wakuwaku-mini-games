(() => {
  "use strict";
  const {words}=window.PuzzlePictures,{index,shuffle}=window.PuzzleRandom;
  function config(number) {const n=Math.max(1,Math.min(10,number));return {choices:n<=3?2:n<=8?3:4,links:n>=9?2:1,similar:n>=7};}
  const following=(word,used=[])=>words.filter(w=>w.first===word.last&&!used.includes(w.id));
  function generate(number,random=Math.random,previous=null) {
    const settings=config(number),starts=shuffle(words,random);
    if(previous){const same=starts.findIndex(w=>w.id===previous.start.id);if(same===0)starts.push(starts.shift());}
    for(const start of starts){
      const used=[start.id],steps=[];let from=start;
      for(let i=0;i<settings.links;i++){
        const possible=following(from,used).filter(w=>i===settings.links-1||following(w,[...used,w.id]).length>0);
        if(!possible.length)break;
        const answer=possible[index(possible.length,random)];
        let others=shuffle(words.filter(w=>w.first!==from.last&&!used.includes(w.id)),random);
        if(settings.similar)others.sort((a,b)=>Number(b.category===answer.category)-Number(a.category===answer.category));
        steps.push({from,options:shuffle([answer,...others.slice(0,settings.choices-1)],random)});used.push(answer.id);from=answer;
      }
      if(steps.length===settings.links)return {number,...settings,start,steps};
    }
    throw new Error("単語データに つながることばがありません");
  }
  function validate(p) {const c=config(p.number);if(p.steps.length!==c.links||p.choices!==c.choices)return false;let from=p.start;const used=new Set([from.id]);for(const step of p.steps){const correct=step.options.filter(w=>w.first===from.last);if(step.from.id!==from.id||step.options.length!==c.choices||new Set(step.options.map(w=>w.id)).size!==c.choices||correct.length!==1||used.has(correct[0].id)||correct[0].last==="ん")return false;from=correct[0];used.add(from.id);}return true;}
  window.ChainRules=Object.freeze({config,generate,validate,correct:(from,word)=>from.last===word.first});
})();
