(() => {
  "use strict";
  class DrumAudio {
    constructor(){this.enabled=true;this.context=null;this.voices=new Set();}
    async unlock(){if(!this.enabled)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!this.context)this.context=new Audio();if(this.context.state!=="running")await this.context.resume();}catch{ /* The visual game remains fully playable. */ }}
    play(index){if(!this.enabled||!this.context||this.context.state!=="running")return;const c=this.context,osc=c.createOscillator(),gain=c.createGain(),now=c.currentTime;osc.type="sine";osc.frequency.setValueAtTime([160,270,420][index],now);osc.frequency.exponentialRampToValueAtTime([90,170,270][index],now+.17);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.18,now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+.2);osc.connect(gain);gain.connect(c.destination);const voice={osc,gain};this.voices.add(voice);osc.onended=()=>{this.voices.delete(voice);osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+.22);}
    stop(suspend=false){for(const {osc}of this.voices){try{osc.stop();}catch{}}this.voices.clear();if(suspend&&this.context?.state==="running")this.context.suspend().catch(()=>{});}
    toggle(){this.enabled=!this.enabled;if(!this.enabled)this.stop();return this.enabled;}
  }
  window.DrumAudio=DrumAudio;
})();
