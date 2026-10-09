const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=(process.argv[2]||'http://localhost:8000/').replace(/\/?$/,'/');
const artifacts=process.env.ARTIFACT_DIR||'/tmp/wakuwaku-cube-tests';fs.mkdirSync(artifacts,{recursive:true});
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/cube-fit/generator.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`
const originalCubeGenerator=window.CubeGenerator;window.testGenerated=0;
window.CubeGenerator={...originalCubeGenerator,generate:(...args)=>{window.testGenerated++;return window.testPuzzle=originalCubeGenerator.generate(...args);}};`});});
    await page.goto(root+'index%20%282%29.html');await page.waitForFunction(()=>window.cubeTestResults);
    const groups=await page.evaluate(()=>[window.testResults,window.blockTestResults,window.railTestResults,window.cubeTestResults]);
    for(const group of groups)assert.equal(group.passed,true,JSON.stringify(group.results));
    console.log('PASS '+groups.reduce((n,g)=>n+g.results.length,0)+' logic tests; 16,000 generated puzzles');
    fs.writeFileSync(path.join(artifacts,'cube-statistics.json'),JSON.stringify(groups.at(-1).statistics,null,2));
    console.log('CUBE STATISTICS '+JSON.stringify(groups.at(-1).statistics));
    const scene=page.locator('#cube-scene'),choices=page.locator('.cube-choice'),data=()=>scene.evaluate(el=>({...el.dataset}));
    const puzzle=()=>page.evaluate(()=>window.testPuzzle);
    const snapshot=async()=>({puzzle:await puzzle(),generated:await page.evaluate(()=>window.testGenerated),occupied:await scene.getAttribute('data-occupied'),choices:await choices.evaluateAll(elements=>elements.map(el=>el.innerHTML))});
    // Independent selection oracle: match translated voxel sets, not answer index or fits().
    const answer=()=>page.evaluate(()=>{const p=window.testPuzzle,hole=new Set(p.missing.map(c=>`${c.x},${c.y},${c.z}`));return p.options.findIndex(piece=>{if(piece.length!==hole.size)return false;for(let x=-2;x<3;x++)for(let y=-2;y<3;y++)for(let z=-2;z<3;z++)if(piece.every(c=>hole.has(`${c.x+x},${c.y+y},${c.z+z}`)))return true;return false;});});
    const waitClear=()=>page.waitForFunction(()=>document.querySelector('#cube-scene').dataset.phase==='cleared');
    await page.goto(root);assert.equal(await page.locator('.game-card').count(),4);await page.screenshot({path:path.join(artifacts,'home-four-games.png'),fullPage:true});
    await page.locator('.game-card[href*="cube-fit"]').tap();await page.waitForURL('**/cube-fit/difficulty.html');assert.equal(await page.locator('.difficulty-card').count(),2);await page.locator('.back-link').tap();await page.waitForURL('**/index.html');
    for(const mode of ['easy','hard']) {
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.locator('.game-card[href*="cube-fit"]').tap();await page.locator(`.difficulty-card[href$="difficulty=${mode}"]`).tap();await scene.waitFor();
      for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:1024,height:768}]){
        await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        for(const locator of [scene,page.locator('.toolbar h1'),page.locator('#reset'),...await choices.all()]){const bounds=await locator.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1);}
        for(const button of await choices.all()){const bounds=await button.boundingBox();assert.ok(bounds.width>=88&&bounds.height>=110);assert.ok(await button.getAttribute('aria-label'));assert.ok(await button.getAttribute('aria-describedby'));}
        const scales=await choices.locator('.voxel-piece').evaluateAll(elements=>elements.map(el=>el.getScreenCTM().a));assert.ok(scales.every(s=>Math.abs(s-scales[0])<1e-7),'Unequal candidate scale');
      }
      await page.setViewportSize({width:320,height:568});assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true,'Short portrait layout');
      const initial=await snapshot(),correct=await answer(),wrong=(correct+1)%3;
      await page.screenshot({path:path.join(artifacts,`cube-${mode}-before.png`),fullPage:true});
      await page.locator('#next').evaluate(el=>el.click());assert.equal((await data()).question,'1');
      for(let retry=0;retry<3;retry++){await choices.nth(wrong).tap();assert.equal(await page.locator('#hint').textContent(),'ちがうよ。もういちど！');assert.equal((await data()).phase,'playing');assert.equal(await scene.getAttribute('data-occupied'),initial.occupied);assert.equal(await page.locator('.flying-piece').count(),0);assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'),'0');await page.waitForTimeout(180);}
      await choices.nth(wrong).focus();await page.keyboard.press('Enter');assert.equal((await data()).phase,'playing');
      await page.locator('#reset').tap();assert.deepEqual(await snapshot(),initial);assert.equal(await page.locator('.is-wrong').count(),0);
      // Reset mid-flight and wait past the original finish deadline.
      await choices.nth(correct).tap();assert.equal((await data()).phase,'fitting');await page.waitForTimeout(220);assert.equal(await page.locator('.flying-piece').count(),1);await page.locator('#reset').tap();assert.deepEqual(await snapshot(),initial);await page.waitForTimeout(1400);assert.equal((await data()).phase,'playing');assert.equal(await page.locator('#clear-overlay').isVisible(),false);
      // Observe actual matrices and cells through the entire normal animation.
      const target=await page.evaluate(()=>{const p=window.testPuzzle,origin={x:Math.min(...p.missing.map(c=>c.x)),y:Math.min(...p.missing.map(c=>c.y)),z:Math.min(...p.missing.map(c=>c.z))},q=window.CubeRenderer.project(origin),m=document.querySelector('#cube-scene').getScreenCTM();return{a:m.a,d:m.d,e:m.e+m.a*q.x,f:m.f+m.d*q.y};});
      const source=await choices.nth(correct).locator('.voxel-piece').evaluate(el=>{const m=el.getScreenCTM();return{a:m.a,d:m.d,e:m.e,f:m.f};});
      await page.evaluate(()=>{window.flightSamples=[];window.completedPhase=null;new MutationObserver(()=>{const s=document.querySelector('#cube-scene');if(s.dataset.voxels==='27')window.completedPhase=s.dataset.phase;}).observe(document.querySelector('#cube-scene'),{attributes:true,attributeFilter:['data-voxels']});new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches('.flying-piece')){const g=node.querySelector('g'),recordSample=()=>window.flightSamples.push({matrix:g.getAttribute('transform'),cells:[...g.querySelectorAll('polygon')].map(el=>el.dataset.cell+':'+el.dataset.face+':'+el.getAttribute('points')).sort()});recordSample();new MutationObserver(recordSample).observe(g,{attributes:true,attributeFilter:['transform']});}}).observe(document.body,{childList:true});});
      await choices.nth(correct).tap();assert.equal((await data()).phase,'fitting');assert.equal(await page.locator('#clear-overlay').isVisible(),false);assert.equal(await choices.locator(':scope').evaluateAll(elements=>elements.every(el=>el.disabled)),true);
      await choices.nth(wrong).dispatchEvent('click');await choices.nth(correct).dispatchEvent('click');await page.locator('#next').evaluate(el=>el.click());assert.equal(await page.locator('.flying-piece').count(),1);assert.equal((await data()).question,'1');assert.equal(await page.evaluate(()=>window.testGenerated),initial.generated);
      await waitClear();const samples=await page.evaluate(()=>window.flightSamples);assert.ok(samples.length>10,'No animation movement');const matrix=sample=>sample.matrix.match(/[-\d.e]+/g).map(Number);const first=matrix(samples[0]),last=matrix(samples.at(-1));for(const [expected,actual] of [[source,[first[0],first[3],first[4],first[5]]],[target,[last[0],last[3],last[4],last[5]]]])[expected.a,expected.d,expected.e,expected.f].forEach((v,i)=>assert.ok(Math.abs(v-actual[i])<.001,'Wrong animation endpoint'));
      for(const sample of samples)assert.deepEqual(sample.cells,samples[0].cells,'Shape changed during movement');assert.equal(await page.evaluate(()=>window.completedPhase),'fitting','Success before completed cube');assert.equal((await data()).voxels,'27');assert.equal(await scene.locator('[data-cavity="true"]').count(),0);assert.equal(await page.locator('.flying-piece').count(),0);assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'),'1');
      await page.locator('#clear-overlay').evaluate(el=>el.hidden=true);await page.screenshot({path:path.join(artifacts,`cube-${mode}-complete.png`),fullPage:true});await page.locator('#clear-overlay').evaluate(el=>el.hidden=false);
      await page.locator('#reset').tap();assert.deepEqual(await snapshot(),initial);assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'),'1');
      await choices.nth(correct).tap();assert.equal((await data()).phase,'fitting');await page.locator('a[aria-label="ホームへもどる"]').tap();await page.waitForURL('**/index.html');await page.goBack();await scene.waitFor();await page.waitForTimeout(1400);assert.equal((await data()).phase,'playing');assert.equal(await page.locator('#clear-overlay').isVisible(),false);assert.equal(await page.locator('.flying-piece').count(),0);
      console.log(`PASS ${mode}: layout 320/390/430/tablet; wrong retries/keyboard; exact matrix movement/completion; input lock; same-puzzle reset and navigation cancel`);
      // Fresh sets, reduced motion respected. Two complete touch sets per mode.
      await page.goto(root+`games/cube-fit/index.html?difficulty=${mode}`);await scene.waitFor();await page.emulateMedia({reducedMotion:'reduce'});
      for(let set=0;set<2;set++) {
        for(let number=1;number<=10;number++){
          assert.equal((await data()).question,String(number));assert.equal(await page.locator('#stage-number').textContent(),`もんだい ${number} / 10`);assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'),String(number-1));const correct=await answer();
          await choices.nth((correct+1)%3).tap();assert.equal((await data()).question,String(number));assert.equal((await data()).phase,'playing');await page.waitForTimeout(100);
          await choices.nth(correct).tap();await waitClear();assert.equal((await data()).voxels,'27');assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'),String(number));
          if(number<10){assert.equal(await page.locator('#clear-overlay').isVisible(),true);await page.locator('#next').tap();await page.waitForFunction(n=>document.querySelector('#cube-scene').dataset.question===String(n),number+1);assert.equal((await data()).phase,'playing');}
          else{assert.equal(await page.locator('#clear-overlay').isVisible(),false);assert.equal(await page.locator('#set-complete').isVisible(),true);assert.equal(await page.locator('#set-complete-title').textContent(),'ぜんぶ できた！');const generated=await page.evaluate(()=>window.testGenerated);await page.locator('#next').evaluate(el=>el.click());assert.equal((await data()).question,'10');assert.equal(await page.evaluate(()=>window.testGenerated),generated);await page.screenshot({path:path.join(artifacts,`cube-${mode}-finish.png`),fullPage:true});await page.locator('#set-play-again').tap();await page.waitForFunction(()=>document.querySelector('#cube-scene').dataset.question==='1');assert.equal(await page.evaluate(()=>window.testGenerated),generated+1);assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'),'0');assert.equal((await data()).difficulty,mode);assert.equal(await page.locator('#set-complete').isVisible(),false);}
        }
      }
      await page.locator('#difficulty-label').tap();await page.waitForURL('**/cube-fit/difficulty.html');await page.locator('.back-link').tap();await page.waitForURL('**/index.html');assert.equal(await page.locator('.game-card').count(),4);console.log(`PASS ${mode}: 20 native-touch clears / 10-question finish / no 11 / new ten / home`);
    }
    assert.deepEqual(errors,[]);console.log('PASS cube touch browser suite; no JavaScript errors; artifacts '+artifacts);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
