(() => {
  "use strict";
  if(!document.getElementById("play-area"))return;
  const {element}=window.PictureUI,rules=window.DrumRules,sound=new window.DrumAudio();
  const names=["まる","さんかく","ほし"],marks=["●","▲","★"],colors=["#f1a7a5","#8ac9e7","#f4d47e"];
  let phase="stopped",session,entered=[],locked=false,practiceStop=()=>{};
  function drum(i,action){const button=element("button","drum");button.type="button";button.dataset.drum=String(i);button.style.setProperty("--drum",colors[i]);button.setAttribute("aria-label",names[i]+"の たいこ");button.append(element("span","drum-mark",marks[i]),element("span","drum-name",names[i]));button.addEventListener("click",()=>action(i,button));return button;}
  function light(button,s){button.classList.add("is-lit");sound.play(Number(button.dataset.drum));s.later(()=>button.classList.remove("is-lit"),300);}
  const controller={
    generate:rules.generate,
    stop(reason){phase="stopped";locked=false;sound.stop(["hidden","pagehide","navigation"].includes(reason));for(const b of document.querySelectorAll(".drum"))b.classList.remove("is-lit");practiceStop();},
    guide(container,s){
      container.replaceChildren();let playing=false,ready=false,position=0;const result=element("p","guide-result","まる → さんかく を きいてみよう！"),play=element("button","primary","▶ おてほんをきく"),row=element("div","drums practice-drums");play.type="button";play.id="practice-play";
      for(let i=0;i<2;i++)row.append(drum(i,(n,button)=>{if(!ready||playing)return;light(button,s);if(n!==[0,1][position]){position=0;result.textContent="もういちど。まる → さんかく！";return;}position++;if(position===2){ready=false;result.textContent="できた！ まねっこ じょうず！";}}));
      practiceStop=()=>{playing=false;ready=false;position=0;play.disabled=false;};
      play.addEventListener("click",async()=>{if(playing)return;playing=true;ready=false;position=0;play.disabled=true;const token=s.epoch;await sound.unlock();if(token!==s.epoch||!s.guideActive)return;result.textContent="みて、きいてね。";light(row.children[0],s);s.later(()=>light(row.children[1],s),800);s.later(()=>{playing=false;ready=true;play.disabled=false;result.textContent="まる → さんかく を タップ！";},1500);});container.append(result,row,play);
    },
    reset(p,s){
      practiceStop=()=>{};phase="ready";entered=[];locked=false;s.area.replaceChildren();const title=element("h2","play-title","おてほんをきこう！"),row=element("div","drums"),beats=element("div","beats"),play=element("button","primary","▶ おてほんをきく"),mute=element("button","secondary sound-toggle");row.id="drum-board";row.dataset.phase=phase;play.id="listen";play.type="button";mute.id="sound-toggle";mute.type="button";
      const beatElements=Array.from({length:p.length},()=>{const dot=element("span","beat");dot.setAttribute("aria-hidden","true");beats.append(dot);return dot;});
      const status=()=>{row.dataset.phase=phase;row.dataset.entered=String(entered.length);for(const b of row.children)b.disabled=phase!=="input"||locked||Number(b.dataset.drum)>=p.kinds;play.disabled=["demo","won"].includes(phase);mute.textContent=sound.enabled?"♪ おと ON":"♪ おと OFF";mute.setAttribute("aria-pressed",String(sound.enabled));beatElements.forEach((e,i)=>e.classList.toggle("is-done",i<entered.length));};
      for(let i=0;i<3;i++)row.append(drum(i,async(n,button)=>{
        if(phase!=="input"||locked||n>=p.kinds)return;locked=true;const token=s.epoch;status();await sound.unlock();if(token!==s.epoch||phase!=="input")return;light(button,s);const result=rules.input(p,entered,n);
        if(result==="wrong"){entered=[];s.wrong(button,"あれ？ もういちど やってみよう！");}
        else {entered.push(n);s.hint.textContent="そのちょうし！";}
        if(result==="correct"){phase="won";status();s.win();return;}
        status();s.later(()=>{locked=false;status();},220);
      }));
      play.addEventListener("click",async()=>{
        if(["demo","won"].includes(phase))return;
        s.cancel("listen");phase="demo";entered=[];locked=false;title.textContent="みて、きいてね！";s.hint.textContent="";status();const token=s.epoch;await sound.unlock();if(token!==s.epoch||phase!=="demo")return;
        function show(i){if(phase!=="demo")return;if(i===p.sequence.length){phase="input";title.textContent="まねしてたたこう！";play.textContent="↻ もういちどきく";s.hint.textContent="じぶんのペースで たたいてね。";status();return;}light(row.children[p.sequence[i]],s);s.later(()=>show(i+1),800);}
        show(0);
      });
      mute.addEventListener("click",()=>{sound.toggle();status();});for(const button of row.children)button.classList.toggle("is-later",Number(button.dataset.drum)>=p.kinds);s.area.append(title,row,beats,element("div","actions"),mute);s.area.querySelector(".actions").append(play);status();
    }
  };
  session=new window.TenGame(controller);
})();
