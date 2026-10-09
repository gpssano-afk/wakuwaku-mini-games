// Test-only: uses an already installed Playwright and Chromium; no app dependencies.
// Serve the repo, then: node tests/block-touch.cjs http://localhost:8000/
// --instant-drag deliberately reproduces the old CDP fling/tap-suppression failure.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');

async function touchDrag(cdp, from, to, instant = false) {
  if (instant) {
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{...from, id:1}]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{...to, id:1}]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
  } else {
    // Send real browser touch input along the path. A puzzle placement is not a
    // scroll flick: instant CDP jumps otherwise create GestureFlingStart and
    // Chrome consumes the next tap to stop that fling, even with touch-action:none.
    await cdp.send('Input.synthesizeScrollGesture', {
      x:from.x, y:from.y, xDistance:to.x-from.x, yDistance:to.y-from.y,
      speed:700, gestureSourceType:'touch', preventFling:true
    });
  }
}

async function run() {
  const root = (process.argv[2] || 'http://localhost:8000/').replace(/\/?$/, '/');
  const instant = process.argv.includes('--instant-drag');
  const traceFile = process.env.INPUT_TRACE;
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true});
  let trace, events = [], total = 0;
  try {
    if (traceFile) {
      trace = await browser.newBrowserCDPSession();
      trace.on('Tracing.dataCollected', event => events.push(...event.value));
      await trace.send('Tracing.start', {categories:'input,benchmark,latency', transferMode:'ReportEvents'});
    }
    for (const viewport of [{width:320,height:568}, {width:390,height:844}]) {
      const context = await browser.newContext({viewport, hasTouch:true, isMobile:true, serviceWorkers:'block'});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // Observe actual generated problems without replacing the generator/solution.
      await page.route('**/block-fit/generator.js', async route => {
        const response = await route.fetch();
        await route.fulfill({response, body:(await response.text()) + `
const originalGenerator = window.BlockFitGenerator;
window.testGenerated = 0;
window.BlockFitGenerator = {...originalGenerator, generate:(...args) => {
  window.testGenerated++;
  return window.testPuzzle = originalGenerator.generate(...args);
}};`});
      });
      const cdp = await context.newCDPSession(page);
      const board = page.locator('#block-board');
      const question = () => board.getAttribute('data-question');
      const placePiece = async (puzzle, piece, input = 'touch') => {
        const element = page.locator(`.piece[data-piece="${piece.id}"]`);
        await element.scrollIntoViewIfNeeded();
        const source = await element.boundingBox(), bounds = await board.boundingBox();
        const cols = Math.max(...piece.cells.map(cell => cell.col)) + 1;
        const rows = Math.max(...piece.cells.map(cell => cell.row)) + 1;
        const cell = piece.cells[0], unit = bounds.width / puzzle.cols;
        const from = {x:source.x+(cell.col+.5)*source.width/cols, y:source.y+(cell.row+.5)*source.height/rows};
        const to = {x:bounds.x+(piece.solution.col+cell.col+.5)*unit,
          y:bounds.y+(piece.solution.row+cell.row+.5)*unit+(input==='touch'?24:0)};
        const placed = Number(await board.getAttribute('data-placed'));
        if (input === 'touch') await touchDrag(cdp, from, to, instant);
        else {await page.mouse.move(from.x,from.y); await page.mouse.down(); await page.mouse.move(to.x,to.y,{steps:8}); await page.mouse.up();}
        await page.waitForFunction(expected => document.querySelector('#block-board').dataset.placed === String(expected), placed+1);
        assert.equal(await page.locator('.floating-piece, .placement-preview, .dragging').count(), 0);
      };
      for (const mode of ['easy','hard']) {
        await page.goto(root);
        await page.locator('.game-card[href*="block-fit"]').tap();
        await page.waitForURL('**/block-fit/difficulty.html');
        await page.locator(`.difficulty-card[href$="difficulty=${mode}"]`).tap();
        await board.waitFor();
        await page.evaluate(() => {
          window.testClicks = [];
          window.testPointers = new Set();
          document.addEventListener('pointerdown', event => window.testPointers.add(event.pointerId), true);
          document.addEventListener('pointerup', event => {
            window.testPointers.delete(event.pointerId);
          }, true);
          document.addEventListener('pointercancel', event => window.testPointers.delete(event.pointerId), true);
          document.addEventListener('lostpointercapture', event => {
            window.testCaptureReleased = !event.target.hasPointerCapture?.(event.pointerId);
          }, true);
          document.addEventListener('click', event => {
            if (['next','set-play-again','reset'].includes(event.target.id))
              window.testClicks.push({id:event.target.id, trusted:event.isTrusted, pointerType:event.pointerType});
          }, true);
        });
        // One native touch set and one mouse set per difficulty/screen size.
        for (const input of ['touch','mouse']) {
          for (let number=1; number<=10; number++) {
            assert.equal(await question(), String(number));
            assert.equal(await page.locator('#stage-number').textContent(), `もんだい ${number} / 10`);
            assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'), String(number-1));
            const puzzle = await page.evaluate(() => window.testPuzzle);
            if (number === 1 && !instant) {
              await placePiece(puzzle, puzzle.pieces[0], input);
              const generated = await page.evaluate(() => window.testGenerated);
              await page.locator('#reset')[input==='touch'?'tap':'click']();
              assert.equal(await page.evaluate(() => window.testGenerated), generated);
              assert.deepEqual(await page.evaluate(() => window.testPuzzle), puzzle);
              assert.equal(await board.getAttribute('data-placed'), '0');
              assert.equal(await question(), '1');
              assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'), '0');
            }
            for (let i=0; i<puzzle.pieces.length; i++) {
              assert.equal(await page.locator('#clear-overlay').isVisible(), false);
              assert.equal(await board.getAttribute('data-cleared'), 'false');
              await placePiece(puzzle, puzzle.pieces[i], input);
              assert.equal(await board.getAttribute('data-cleared'), String(i===puzzle.pieces.length-1));
            }
            assert.equal(await page.evaluate(() => window.testPointers.size), 0);
            assert.equal(await page.evaluate(() => window.testCaptureReleased), true);
            assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'), String(number));
            total++;
            if (number < 10) {
              assert.equal(await page.locator('#clear-overlay').isVisible(), true);
              const clicks = await page.evaluate(() => window.testClicks.filter(event => event.id==='next').length);
              // Exactly one genuine tap/click, without retries, force or JS click fallback.
              await page.locator('#next')[input==='touch'?'tap':'click']();
              await page.waitForFunction(expected => document.querySelector('#block-board').dataset.question===String(expected), number+1, {timeout:3000});
              const received = await page.evaluate(() => window.testClicks.filter(event => event.id==='next'));
              assert.equal(received.length, clicks+1);
              assert.equal(received.at(-1).trusted, true);
              assert.equal(received.at(-1).pointerType, input);
              assert.equal(await board.getAttribute('data-placed'), '0');
              assert.equal(await page.locator('#clear-overlay').isVisible(), false);
              assert.equal(await board.getAttribute('data-difficulty'), mode);
            } else {
              assert.equal(await page.locator('#clear-overlay').isVisible(), false);
              assert.equal(await page.locator('#set-complete').isVisible(), true);
              assert.equal(await page.locator('#set-complete-title').textContent(), 'ぜんぶ できた！');
              const generated = await page.evaluate(() => window.testGenerated);
              // Intentional JS click only on the hidden button to verify no question 11.
              await page.locator('#next').evaluate(element => element.click());
              assert.equal(await question(), '10');
              assert.equal(await page.evaluate(() => window.testGenerated), generated);
              await page.locator('#set-play-again')[input==='touch'?'tap':'click']();
              await page.waitForFunction(() => document.querySelector('#block-board').dataset.question==='1');
              assert.equal(await page.evaluate(() => window.testGenerated), generated+1);
              assert.equal(await page.locator('#set-progress').getAttribute('aria-valuenow'), '0');
              assert.equal(await page.locator('#set-complete').isVisible(), false);
              assert.equal(await board.getAttribute('data-placed'), '0');
            }
          }
          console.log(`PASS ${viewport.width}x${viewport.height} ${mode} ${input}: 10 questions, first next tap, reset, progress, finish, replay`);
        }
        await page.locator('#difficulty-label').tap();
        await page.waitForURL('**/block-fit/difficulty.html');
        await page.locator('.back-link').tap();
        await page.waitForURL('**/index.html');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(`PASS ${total} cleared problems; no JavaScript errors`);
  } finally {
    if (trace) {
      const completed = new Promise(resolve => trace.once('Tracing.tracingComplete', resolve));
      await trace.send('Tracing.end'); await completed;
      fs.writeFileSync(traceFile, JSON.stringify(events));
      console.log('INPUT TRACE', Object.fromEntries(['InputLatency::GestureFlingStart','FilterTapSuppression'].map(name => [name,events.filter(event => event.name===name && event.ph!=='e').length])));
    }
    await browser.close();
  }
}
module.exports = {touchDrag};
if (require.main === module) run().catch(error => {console.error(error); process.exitCode=1;});
