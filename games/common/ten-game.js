(() => {
  "use strict";
  function element(tag,className,text="") {const el=document.createElement(tag);el.className=className;el.textContent=text;return el;}
  function picture(item,className="picture") {const img=element("img",className);img.src=item.image;img.alt=item.name;img.width=200;img.height=180;return img;}
  function choice(item,handler,className="picture-choice") {const button=element("button",className);button.type="button";button.dataset.item=item.id;button.setAttribute("aria-label",item.name);button.append(picture(item),element("span","picture-name",item.name));button.addEventListener("click",()=>handler(item,button));return button;}
  class TenGame {
    constructor(controller) {
      this.controller=controller;this.number=0;this.completed=0;this.started=false;this.cleared=false;this.pending=false;this.epoch=0;this.timers=new Set();this.paused=false;
      this.main=document.querySelector("main");this.area=document.getElementById("play-area");this.hint=document.getElementById("hint");
      this.progress=document.getElementById("set-progress");this.steps=Array.from({length:10},()=>{const e=element("span","set-progress-step");e.setAttribute("aria-hidden","true");this.progress.append(e);return e;});
      this.guide=document.getElementById("howto-overlay");this.pause=document.getElementById("pause-overlay");
      document.getElementById("reset").addEventListener("click",()=>{if(this.started&&!this.paused&&!this.guideActive)this.reset();});
      document.getElementById("next").addEventListener("click",()=>{if(this.cleared&&this.number<10&&!this.paused){this.newQuestion();}});
      document.getElementById("set-play-again").addEventListener("click",()=>{if(this.cleared&&this.number===10){this.number=0;this.completed=0;this.newQuestion();}});
      document.getElementById("howto-help").addEventListener("click",()=>this.openGuide());
      document.getElementById("howto-start").addEventListener("click",()=>this.closeGuide());
      document.getElementById("resume").addEventListener("click",()=>{if(this.paused){this.paused=false;this.pause.hidden=true;this.main.inert=false;this.reset();}});
      this.guide.addEventListener("keydown",event=>{if(event.key==="Tab"){const buttons=[...this.guide.querySelectorAll("button:not(:disabled),a")];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}}});
      document.addEventListener("visibilitychange",()=>{if(document.hidden)this.suspend("hidden");else if(this.guideActive)this.controller.guide(document.getElementById("guide-demo"),this);});
      window.addEventListener("pagehide",()=>this.suspend("pagehide"));
      for(const link of document.querySelectorAll("a"))link.addEventListener("click",()=>this.cancel("navigation"));
      this.meta();this.openGuide();
    }
    later(action,delay) {const epoch=this.epoch,id=setTimeout(()=>{this.timers.delete(id);if(this.epoch===epoch)action();},delay);this.timers.add(id);return id;}
    cancel(reason="reset") {this.epoch++;for(const id of this.timers)clearTimeout(id);this.timers.clear();this.controller.stop?.(reason);}
    meta() {this.main.dataset.question=String(this.number);document.getElementById("stage-number").textContent=this.number?`もんだい ${this.number} / 10`:"10もん あそぼう！";this.progress.setAttribute("aria-valuenow",String(this.completed));this.steps.forEach((el,i)=>el.classList.toggle("is-done",i<this.completed));}
    openGuide() {if(this.guideActive)return;this.cancel("guide");this.guideActive=true;this.guide.hidden=false;this.main.inert=true;document.body.classList.add("howto-active");document.getElementById("howto-start").textContent=this.started?"もどる":"スタート";this.controller.guide(document.getElementById("guide-demo"),this);document.getElementById("howto-start").focus({preventScroll:true});}
    closeGuide() {if(!this.guideActive)return;this.guideActive=false;this.guide.hidden=true;this.main.inert=false;document.body.classList.remove("howto-active");if(!this.started){this.started=true;this.newQuestion();}else this.reset();}
    newQuestion() {if(this.number>=10)return;this.number++;this.puzzle=this.controller.generate(this.number,Math.random,this.puzzle);this.reset();}
    reset() {this.cancel();this.area.classList.remove("is-success");this.pending=false;this.cleared=false;document.getElementById("clear-overlay").hidden=true;document.getElementById("set-complete").hidden=true;this.main.dataset.phase="playing";this.hint.textContent="";this.meta();this.controller.reset(this.puzzle,this);}
    wrong(button,message="ちがうよ。もういちど！") {if(this.pending||this.cleared)return;this.hint.textContent=message;button?.classList.add("is-wrong");this.later(()=>button?.classList.remove("is-wrong"),420);}
    win() {if(this.pending||this.cleared||this.paused||this.guideActive)return;this.pending=true;this.main.dataset.phase="celebrating";this.area.classList.add("is-success");this.hint.textContent="できた！";this.later(()=>{this.area.classList.remove("is-success");this.pending=false;this.cleared=true;this.main.dataset.phase="cleared";this.completed=Math.max(this.completed,this.number);this.meta();document.getElementById(this.number===10?"set-complete":"clear-overlay").hidden=false;document.getElementById(this.number===10?"set-play-again":"next").focus({preventScroll:true});},matchMedia("(prefers-reduced-motion: reduce)").matches?120:650);}
    suspend(reason) {this.cancel(reason);this.area.classList.remove("is-success");if(this.started&&!this.cleared&&!this.guideActive){this.paused=true;this.pause.hidden=false;this.main.inert=true;this.main.dataset.phase="paused";document.getElementById("resume").focus({preventScroll:true});}}
  }
  window.PictureUI=Object.freeze({element,picture,choice});window.TenGame=TenGame;
})();
