(() => {
  "use strict";
  const {words}=window.PuzzlePictures,{index,shuffle}=window.PuzzleRandom;
  const usable=words.filter(word=>word.name.at(-1)!=="ん"),byId=new Map(usable.map(word=>[word.id,word]));
  const pools=new Map();
  function config(number){const n=Math.max(1,Math.min(10,number));return {count:n<=3?3:n<=6?4:n<=8?5:6};}
  // Kana are compared as written: voiced/semi-voiced sounds remain distinct.
  function correct(from,to){return !!from?.name&&!!to?.name&&from.name.at(-1)===to.name[0];}
  function signature(p){return p.start.id+":"+p.cards.map(word=>word.id).sort().join(",");}
  function validPath(p,path,complete=false){
    if(!p||!Array.isArray(p.cards)||!Array.isArray(path)||!path.length||path[0]!==p.start?.id||new Set(path).size!==path.length)return false;
    const cards=new Map(p.cards.map(word=>[word.id,word]));
    if(path.some(id=>!cards.has(id))||path.some((id,i)=>i>0&&!correct(cards.get(path[i-1]),cards.get(id))))return false;
    return !complete||path.length===p.cards.length;
  }
  function canAppend(p,path,id){return validPath(p,path)&&!path.includes(id)&&validPath(p,[...path,id]);}
  function isComplete(p,path){return validPath(p,path,true);}
  function validate(p){
    if(!p||p.count!==config(p.number).count||!Array.isArray(p.cards)||p.cards.length!==p.count||new Set(p.cards.map(w=>w.id)).size!==p.count||p.cards[0]?.id!==p.start?.id)return false;
    if(p.cards.some(w=>!byId.has(w.id)||byId.get(w.id).name!==w.name||w.name.at(-1)==="ん"))return false;
    return isComplete(p,p.solution);
  }
  function routes(count){
    if(pools.has(count))return pools.get(count);
    const found=[];let visits=0;
    // The data graph is small. Bound discovery as well as the path length.
    function visit(path){if(++visits>5000)return;if(path.length===count){found.push(path);return;}
      for(const word of usable)if(!path.some(w=>w.id===word.id)&&correct(path.at(-1),word))visit([...path,word]);
    }
    for(const start of usable){if(visits>=5000)break;visit([start]);}
    pools.set(count,found);return found;
  }
  function generate(number,random=Math.random,previous=null){
    const {count}=config(number),available=routes(count);
    let candidates=available;
    if(previous){const different=available.filter(route=>signature({start:route[0],cards:route})!==signature(previous));if(different.length)candidates=different;}
    const fallback=["apple","gorilla","trumpet","panda","doll","pillow"].slice(0,count).map(id=>byId.get(id));
    const route=candidates.length?candidates[index(candidates.length,random)]:fallback;
    const p={number,count,start:route[0],cards:[route[0],...shuffle(route.slice(1),random)],solution:route.map(w=>w.id)};
    if(validate(p))return p;
    const safe={number,count,start:fallback[0],cards:[fallback[0],...shuffle(fallback.slice(1),random)],solution:fallback.map(w=>w.id)};
    if(!validate(safe))throw new Error("しりとりの単語データを確認してください");
    return safe;
  }
  window.ChainRules=Object.freeze({config,generate,validate,correct,validPath,canAppend,isComplete});
})();
