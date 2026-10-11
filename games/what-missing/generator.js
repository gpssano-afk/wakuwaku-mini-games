(() => {
  "use strict";
  const {memory}=window.PuzzlePictures,{index,shuffle}=window.PuzzleRandom;
  function config(number) {
    const n=Math.max(1,Math.min(10,number));
    return n<=3?{count:3,choices:2,seconds:5}:n<=6?{count:4,choices:3,seconds:6}:n<=8?{count:5,choices:3,seconds:7}:{count:6,choices:4,seconds:8};
  }
  function generate(number,random=Math.random,previous=null) {
    const settings=config(number);let items=shuffle(memory,random).slice(0,settings.count);
    if(previous&&items.map(x=>x.id).join()===previous.items.map(x=>x.id).join())items=[...items.slice(1),memory.find(x=>!items.some(y=>x.id===y.id))];
    const missing=index(items.length,random),answer=items[missing];
    const options=shuffle([answer,...shuffle(memory.filter(x=>!items.some(y=>x.id===y.id)),random).slice(0,settings.choices-1)],random);
    return {number,...settings,items,missing,options};
  }
  function validate(p) {const c=config(p.number);return p.items.length===c.count&&p.options.length===c.choices&&p.seconds===c.seconds&&new Set(p.items.map(x=>x.id)).size===c.count&&new Set(p.options.map(x=>x.id)).size===c.choices&&Number.isInteger(p.missing)&&p.missing>=0&&p.missing<p.items.length&&p.options.filter(x=>x.id===p.items[p.missing].id).length===1;}
  window.MissingRules=Object.freeze({config,generate,validate,correct:(p,id)=>id===p.items[p.missing].id});
})();
