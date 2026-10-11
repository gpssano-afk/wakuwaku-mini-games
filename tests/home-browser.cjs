/* Requires the existing Playwright/Chromium verification environment, not app dependencies. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=(process.argv[2]||'http://127.0.0.1:8000/').replace(/\/?$/,'/');
const artifacts=process.env.ARTIFACT_DIR||'/tmp/wakuwaku-home-tests';fs.mkdirSync(artifacts,{recursive:true});
const games=[['hitofude','#board'],['block-fit','#block-board'],['rail-connect','#rail-board'],['cube-fit','#cube-scene']];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
 const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  async function home(){await page.goto(root);await page.locator('.game-card').last().waitFor();await page.evaluate(()=>document.fonts.ready);}
  async function layout(expected){
   const result=await page.evaluate(()=>{
    const bounds=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
    return{width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
     cards:[...document.querySelectorAll('.game-card')].map(el=>({box:bounds(el),button:bounds(el.querySelector('.play-label')),art:bounds(el.querySelector('.game-art')),titleSize:parseFloat(getComputedStyle(el.querySelector('.game-title')).fontSize),descriptionSize:parseFloat(getComputedStyle(el.querySelector('.game-description')).fontSize),bad:[...el.querySelectorAll('.game-copy, .game-title, .game-description, .game-tag, .play-label')].some(child=>child.scrollWidth>child.clientWidth+1)})),
     footer:bounds(document.querySelector('.home-landscape')),nested:document.querySelectorAll('.game-card button,.game-card a').length,
     font:document.fonts.check('900 40px "Wakuwaku Round"')};
   });
   assert.equal(result.overflow,false,'Horizontal scroll');assert.equal(result.cards.length,expected);assert.equal(result.nested,0);assert.equal(result.font,true);
   for(let i=0;i<result.cards.length;i++){
    const c=result.cards[i];assert.ok(c.box.x>=0&&c.box.x+c.box.width<=result.width+1);assert.equal(c.bad,false,'Clipped card text');assert.ok(c.titleSize>=15&&c.descriptionSize>=12);assert.ok(c.button.height>=44&&c.button.width>=100);assert.ok(Math.abs(c.art.width/c.art.height-1.6)<.001);
    if(i%2===1){const previous=result.cards[i-1];assert.ok(Math.abs(c.box.y-previous.box.y)<.01,'Not a two-column row');assert.ok(Math.abs(c.box.width-previous.box.width)<=1/64+.001);assert.ok(Math.abs(c.box.height-previous.box.height)<.01);assert.ok(Math.abs(c.button.bottom-previous.button.bottom)<.01,'Buttons not aligned');}
    else if(i>=2) assert.ok(c.box.y>=result.cards[i-2].box.bottom+9,'Rows overlap');
   }
   assert.ok(result.footer.y>=Math.max(...result.cards.map(c=>c.box.bottom))+19,'Footer overlaps cards');return result;
  }
  for(const width of [320,360,390,430,1024]){
   await page.setViewportSize({width,height:width===320?568:width===1024?768:844});await home();await layout(4);
   assert.deepEqual(await page.locator('.game-card').evaluateAll(els=>els.map(el=>el.dataset.game)),games.map(g=>g[0]));
   assert.equal(await page.locator('.game-art img').evaluateAll(els=>els.every(el=>el.complete&&el.naturalWidth>0)),true);
   await page.screenshot({path:path.join(artifacts,`home-${width}.png`),fullPage:true});
   console.log(`PASS ${width}px: two columns, equal row heights/buttons, readable text, no overflow, original SVGs and local round font`);
  }
  await page.setViewportSize({width:320,height:568});
  for(const [game,board]of games)for(const mode of ['easy','hard']){
   await home();await page.locator(`.game-card[data-game="${game}"]`).tap();await page.waitForURL(`**/${game}/difficulty.html`);
   await page.locator(`.difficulty-card[href$="difficulty=${mode}"]`).tap();await page.waitForURL(`**/${game}/index.html?difficulty=${mode}`);
   assert.equal(await page.locator('#howto-overlay').isVisible(),true);assert.equal(await page.locator('.howto-step').count(),3);
   assert.equal(await page.locator('main').evaluate(el=>el.inert),true);
   await page.screenshot({path:path.join(artifacts,`${game}-${mode}-guide.png`),fullPage:true});
   await page.locator('#howto-start').tap();await page.locator(board).waitFor();assert.equal(await page.locator('#howto-overlay').isVisible(),false);
   assert.equal(await page.locator('#difficulty-label').textContent(),mode==='easy'?'かんたん':'むずかしい');
   assert.equal(await page.locator('#stage-number').textContent(),'もんだい 1 / 10');assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'),'0');
   await page.locator('.howto-help').tap();assert.equal(await page.locator('#howto-overlay').isVisible(),true);await page.locator('#howto-start').tap();
   await page.locator('#reset').tap();assert.equal(await page.locator('#stage-number').textContent(),'もんだい 1 / 10');assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'),'0');
   await page.locator('a[aria-label="ホームへもどる"]').tap();await page.waitForURL('**/index.html');assert.equal(await page.locator('.game-card').count(),4);
   console.log(`PASS ${game} ${mode}: native card/difficulty tap, guide/reopen, start/reset, ten-question metadata, home`);
  }
  // Test-only additions change the loaded catalog, never the production file.
  const source=fs.readFileSync(path.join(__dirname,'../home.js'),'utf8');
  for(const count of [5,6,7,8,9,10]){
   const extras=Array.from({length:count-4},(_,i)=>({id:`test-${i}`,title:i===0?'ながい なまえの パズルで あそぼう':'テストのパズル',category:'ひらめきパズル',description:'ながい せつめいでも よみやすく ならべよう！',href:'./games/hitofude/difficulty.html',image:'./assets/games/hitofude.svg'}));
   const extraContext=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true,serviceWorkers:'block'});
   await extraContext.route('**/home.js',route=>route.fulfill({contentType:'text/javascript',body:source.replace('  const container =',`  games.push(...${JSON.stringify(extras)});\n  const container =`)}));
   const extraPage=await extraContext.newPage();extraPage.on('pageerror',error=>errors.push(error.message));
   // Reuse the same layout oracle against another page without exposing a production hook.
   await extraPage.goto(root);await extraPage.locator('.game-card').nth(count-1).waitFor();await extraPage.evaluate(()=>document.fonts.ready);
   for(const width of [320,1024]){
    await extraPage.setViewportSize({width,height:768});
    const data=await extraPage.evaluate(()=>{
     const boxes=[...document.querySelectorAll('.game-card')].map(el=>{const r=el.getBoundingClientRect(),b=el.querySelector('.play-label').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,buttonBottom:b.bottom};});
     return{boxes,overflow:document.documentElement.scrollWidth>innerWidth,footer:document.querySelector('.home-landscape').getBoundingClientRect().top,clipped:[...document.querySelectorAll('.game-title,.game-description,.play-label')].some(el=>el.scrollWidth>el.clientWidth+1)};
    });
    assert.equal(data.overflow,false);assert.equal(data.clipped,false);assert.equal(data.boxes.length,count);
    data.boxes.forEach((box,i)=>{assert.ok(box.x>=0&&box.x+box.width<=width+1);if(i%2){assert.equal(box.y,data.boxes[i-1].y);assert.equal(box.buttonBottom,data.boxes[i-1].buttonBottom);}else if(i>=2)assert.ok(box.y>data.boxes[i-2].bottom);});
    assert.ok(data.footer>=data.boxes.at(-1).bottom+19);
    await extraPage.locator('.game-card').last().scrollIntoViewIfNeeded();assert.equal(await extraPage.locator('.game-card').last().isVisible(),true);
    if(count===10)await extraPage.screenshot({path:path.join(artifacts,`home-ten-${width}.png`),fullPage:true});
   }
   await extraContext.close();console.log(`PASS test-only ${count} cards: automatic two-column rows, long title/description, aligned buttons, scroll access, footer follows`);
  }
  const fallbackContext=await browser.newContext({viewport:{width:320,height:568},serviceWorkers:'block'});
  await fallbackContext.route('**/assets/games/*.svg',route=>route.abort());const fallbackPage=await fallbackContext.newPage();
  await fallbackPage.goto(root);await fallbackPage.locator('.art-fallback').nth(3).waitFor();
  assert.equal(await fallbackPage.locator('.game-card').count(),4);assert.equal(await fallbackPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const ratios=await fallbackPage.locator('.game-art').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return b.width/b.height;}));assert.ok(ratios.every(r=>Math.abs(r-1.6)<.001));
  await fallbackPage.screenshot({path:path.join(artifacts,'home-image-fallback.png'),fullPage:true});await fallbackContext.close();
  await home();assert.equal(await page.locator('.game-card').count(),4);await page.keyboard.press('Tab');assert.equal(await page.locator('.game-card').first().evaluate(el=>el===document.activeElement),true);
  assert.deepEqual(errors,[]);console.log('PASS image failure layout; keyboard link; production remains four cards; no JavaScript errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
