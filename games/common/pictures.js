(() => {
  "use strict";
  const base = document.currentScript ? new URL("../../assets/pictures/", document.currentScript.src).href : "/assets/pictures/";
  const entries = [
    ["apple","りんご","food"], ["gorilla","ごりら","animal"], ["trumpet","らっぱ","thing"],
    ["panda","ぱんだ","animal"], ["doll","だるま","thing"], ["pillow","まくら","thing"],
    ["camel","らくだ","animal"], ["watermelon","すいか","food"], ["umbrella","かさ","thing"],
    ["fish","さかな","animal"], ["eggplant","なす","food"], ["cat","ねこ","animal"],
    ["top","こま","thing"], ["turtle","かめ","animal"], ["glasses","めがね","thing"],
    ["chicken","にわとり","animal"], ["squirrel","りす","animal"], ["bear","くま","animal"],
    ["pig","ぶた","animal"], ["tanuki","たぬき","animal"], ["fox","きつね","animal"], ["horse","うま","animal"]
  ];
  const words = entries.map(([id,name,category]) => Object.freeze({id,name,category,image:base+id+".svg",first:name[0],last:name.at(-1)}));
  const memory = [...words, ...[["car","くるま"],["train","でんしゃ"],["ball","ぼーる"]].map(([id,name])=>Object.freeze({id,name,category:"thing",image:base+id+".svg"}))];
  function index(length, random) {const value=Number(random());return Math.min(length-1,Math.max(0,Math.floor((Number.isFinite(value)?value:0)*length)));}
  function shuffle(items, random=Math.random) {const result=[...items];for(let i=result.length-1;i>0;i--){const j=index(i+1,random);[result[i],result[j]]=[result[j],result[i]];}return result;}
  window.PuzzlePictures=Object.freeze({words:Object.freeze(words),memory:Object.freeze(memory)});
  window.PuzzleRandom=Object.freeze({index,shuffle});
})();
