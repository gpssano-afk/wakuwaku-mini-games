(() => {
  "use strict";
  const {index,shuffle}=window.PuzzleRandom;
  function config(number) {const n=Math.max(1,Math.min(10,number));return {length:n<=2?2:n<=4?3:n<=6?4:n<=8?5:6,kinds:n<=4?2:3};}
  function generate(number,random=Math.random,previous=null) {
    const settings=config(number),sequence=shuffle(Array.from({length:settings.kinds},(_,i)=>i),random);
    while(sequence.length<settings.length){const allowed=Array.from({length:settings.kinds},(_,i)=>i).filter(i=>!(sequence.at(-1)===i&&sequence.at(-2)===i));sequence.push(allowed[index(allowed.length,random)]);}
    if(previous&&sequence.join()===previous.sequence.join())for(let i=0;i<sequence.length;i++)sequence[i]=(sequence[i]+1)%settings.kinds;
    return {number,...settings,sequence};
  }
  function validate(p) {const c=config(p.number);return p.length===c.length&&p.kinds===c.kinds&&p.sequence.length===c.length&&new Set(p.sequence).size===c.kinds&&p.sequence.every((n,i)=>Number.isInteger(n)&&n>=0&&n<c.kinds&&!(i>=2&&n===p.sequence[i-1]&&n===p.sequence[i-2]));}
  function input(p,entered,drum) {if(!Number.isInteger(drum)||drum<0||drum>=p.kinds)return "ignored";if(p.sequence[entered.length]!==drum)return "wrong";return entered.length+1===p.length?"correct":"continue";}
  window.DrumRules=Object.freeze({config,generate,validate,input});
})();
