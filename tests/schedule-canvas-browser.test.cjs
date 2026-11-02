const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge',proxy:process.env.TEST_SITE_URL&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
 const page=await browser.newPage({viewport:{width:1700,height:1100}}),errors=[],requests=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});page.setDefaultTimeout(7000);
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name)},wait=async()=>page.waitForTimeout(300);
 const task=(stage,phase,chunk=0,mb=0)=>page.locator(`.schedule-task[data-stage="${stage}"][data-phase="${phase}"][data-chunk="${chunk}"][data-microbatch="${mb}"]`);
 try{
  await page.goto(process.env.TEST_SITE_URL||'file:///'+path.resolve(__dirname,'../tools/draw_parallel_card.html').replaceAll('\\','/'));
  await page.locator('[data-view="schedule"]').click();
  await check('global phases have exactly two full-height separators and one header each',async()=>{
   assert.equal(await page.locator('[data-schedule-region="warmup"]').count(),1);assert.equal(await page.locator('[data-schedule-region="steady"]').count(),1);
   assert.equal(await page.locator('[data-schedule-region="cooldown"]').count(),1);assert.equal(await page.locator('[data-schedule-boundary]').count(),2);assert.deepEqual(await page.locator('[data-schedule-boundary]').evaluateAll(es=>es.map(e=>Number(e.dataset.scheduleBoundary))),[4,46]);
   const line=page.locator('[data-schedule-boundary]').first();assert.equal(await line.getAttribute('data-stage'),null);
   assert.ok(Number(await line.getAttribute('y2'))-Number(await line.getAttribute('y1'))>=130);
   await page.locator('#scheduleBoundaries').uncheck();assert.equal(await page.locator('[data-schedule-region]').count(),0);await page.locator('#scheduleBoundaries').check();
  });
  await check('PP layers are table cells and forward/backward share green hue',async()=>{
   const table=page.locator('[data-schedule-table]');assert.match(await table.textContent(),/PP stage/);assert.match(await table.textContent(),/层分布/);
   assert.equal(await page.locator('[data-schedule-layer="0:0"]').textContent(),'2');assert.match(await page.locator('.schedule-stage-label[data-stage="0"]').textContent(),/总层数 2 层/);
   assert.equal(await task(0,'fwd').locator('rect').getAttribute('fill'),'#d5efdc');assert.equal(await task(0,'bwd').locator('rect').getAttribute('fill'),'#278650');
  });
  await check('eight stages fit fully and VPP uses split table headers and yellow/blue pairs',async()=>{
   await page.locator('#total').fill('64');await page.locator('#layers').fill('16');await page.locator('#pp').fill('8');await wait();
   assert.equal(await page.locator('#schedulePp').innerText(),'8');
   const geometry=await page.locator('#scheduleBoard').evaluate(e=>({height:e.clientHeight,full:e.scrollHeight}));assert.ok(geometry.height>=geometry.full-1,'all eight stages must fit without vertical scrolling');
   assert.equal(await page.locator('.schedule-stage-label').count(),8);
   await page.locator('#scheduleVppEnabled').check();assert.equal(await page.locator('#scheduleError').isVisible(),false);
   assert.equal(await page.locator('[data-schedule-stage-heading]').getAttribute('aria-rowspan'),'2');
   assert.deepEqual(await page.locator('[data-schedule-chunk-heading]').allTextContents(),['VPP 0','VPP 1']);
   assert.equal(await page.locator('[data-schedule-layer="0:0"]').textContent(),'1');assert.equal(await page.locator('[data-schedule-layer="0:1"]').textContent(),'1');
   const exported=await page.evaluate(()=>PPScheduler.exportSvg());
   for(const [chunk,f,b] of [[0,'#fff0b9','#f4c542'],[1,'#dcedff','#4a9ee8']]){
    const colors=await page.evaluate(({text,chunk})=>{const d=new DOMParser().parseFromString(text,'image/svg+xml');return ['fwd','bwd'].map(p=>d.querySelector(`.schedule-task[data-stage="0"][data-phase="${p}"][data-chunk="${chunk}"] rect`).getAttribute('fill'))},{text:exported,chunk});assert.deepEqual(colors,[f,b]);
   }
  });
  await check('ctrl-wheel zoom anchors the mouse and drag does not select a task',async()=>{
   const board=page.locator('#scheduleBoard');await board.scrollIntoViewIfNeeded();const box=await board.boundingBox();
   await board.evaluate(e=>e.scrollLeft=500);await page.waitForTimeout(70);
   await page.mouse.move(box.x+box.width*.7,box.y+100);await page.keyboard.down('Control');const old=await page.locator('#scheduleZoomLabel').innerText();await page.mouse.wheel(0,-250);await page.keyboard.up('Control');await page.waitForTimeout(100);
   assert.notEqual(await page.locator('#scheduleZoomLabel').innerText(),old);assert.equal(await page.evaluate(()=>window.devicePixelRatio),1);
   const before=await board.evaluate(e=>e.scrollLeft);await page.mouse.move(box.x+box.width*.7,box.y+150);await page.mouse.down();await page.mouse.move(box.x+box.width*.7-140,box.y+150,{steps:12});await page.mouse.up();await page.waitForTimeout(80);
   assert.ok(await board.evaluate(e=>e.scrollLeft)>before+100);assert.equal(await page.locator('.schedule-task[data-selected="true"]').count(),0);
  });
  await check('WASD moves smoothly, releases stop it and inputs retain typing',async()=>{
   const board=page.locator('#scheduleBoard');await board.focus();const before=await board.evaluate(e=>e.scrollLeft);await page.keyboard.down('d');await page.waitForTimeout(180);await page.keyboard.up('d');const after=await board.evaluate(e=>e.scrollLeft);assert.ok(after>before+50);await page.waitForTimeout(100);assert.equal(await board.evaluate(e=>e.scrollLeft),after);
   await page.locator('#scheduleGbs').focus();const saved=await board.evaluate(e=>e.scrollLeft);await page.keyboard.down('d');await page.waitForTimeout(80);await page.keyboard.up('d');assert.equal(await board.evaluate(e=>e.scrollLeft),saved);
  });
  await check('fullscreen works with Esc and drag, wheel and vertical WASD',async()=>{
   await page.locator('#total').fill('128');await page.locator('#layers').fill('32');await page.locator('#pp').fill('16');await wait();await page.locator('#scheduleGbs').fill('64');
   await page.locator('#scheduleFullscreen').click();await page.waitForFunction(()=>document.getElementById('scheduleFullscreen').getAttribute('aria-pressed')==='true');assert.equal(await page.locator('#scheduleFullscreen').getAttribute('aria-pressed'),'true');
   assert.equal(await page.evaluate(()=>document.fullscreenElement?.id||document.querySelector('.schedule-shell.is-fullscreen')?.id),'scheduleShell');
   await page.locator('#scheduleBoard').focus();const top=await page.locator('#scheduleBoard').evaluate(e=>e.scrollTop);await page.keyboard.down('s');await page.waitForTimeout(150);await page.keyboard.up('s');assert.ok(await page.locator('#scheduleBoard').evaluate(e=>e.scrollTop)>top);
   const z=await page.locator('#scheduleZoomLabel').innerText(),b=await page.locator('#scheduleBoard').boundingBox();await page.mouse.move(b.x+b.width*.7,b.y+150);await page.keyboard.down('Control');await page.mouse.wheel(0,-120);await page.keyboard.up('Control');await page.waitForTimeout(60);assert.notEqual(await page.locator('#scheduleZoomLabel').innerText(),z);
   await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await page.locator('#scheduleFullscreen').getAttribute('aria-pressed'),'false');
   await page.locator('[data-view="diagram"]').click();assert.equal(await page.locator('#fullscreenBtn').getAttribute('aria-pressed'),'false');await page.locator('[data-view="schedule"]').click();
  });
  await check('selection arrows follow chronological execution and requested ports',async()=>{
   await page.locator('#scheduleVppEnabled').uncheck();await page.locator('#pp').fill('2');await page.locator('#total').fill('16');await page.locator('#layers').fill('4');await wait();await page.locator('#scheduleGbs').fill('8');await page.locator('#scheduleZoomReset').click();await page.locator('#scheduleBoard').evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(60);
   await task(0,'fwd').click();assert.equal(await page.locator('[data-schedule-arrow]').count(),3);
   const info=await page.evaluate(()=>[...document.querySelectorAll('[data-schedule-arrow]')].map(e=>({from:e.dataset.from,to:e.dataset.to,d:e.getAttribute('d'),stroke:e.getAttribute('stroke'),ports:e.dataset.ports})));
   assert.equal(info[0].ports,'bottom-left');assert.equal(info[2].ports,'right-bottom');
   assert.equal(info[0].stroke,await task(0,'fwd').locator('rect').getAttribute('stroke'));
   const geometry=await page.evaluate(()=>[...document.querySelectorAll('[data-schedule-arrow]')].map(e=>{const a=document.querySelector('[data-schedule-event="'+e.dataset.from+'"]'),b=document.querySelector('[data-schedule-event="'+e.dataset.to+'"]'),box=t=>{const r=t.querySelector('rect');return ['x','y','width','height'].map(k=>Number(r.getAttribute(k)))};return {a:box(a),b:box(b),ports:e.dataset.ports,d:e.getAttribute('d'),start:Number(b.dataset.start),end:Number(a.dataset.end)}}));
   for(const arrow of geometry){const nums=arrow.d.match(/-?\d+(?:\.\d+)?/g).map(Number);assert.ok(nums.every(Number.isFinite));assert.ok(arrow.start>=arrow.end);const [x,y,w,h]=arrow.a,[tx,ty,tw,th]=arrow.b;if(arrow.ports==='bottom-left'){assert.deepEqual(nums.slice(0,2),[x+w/2,y+h]);assert.equal(nums.at(-1),tx);}else if(arrow.ports==='right-bottom'){assert.deepEqual(nums.slice(0,2),[x+w,y+h/2]);assert.equal(nums.at(-1),ty+th);}}
   for(let i=0;i<6;i++)await page.locator('#scheduleZoomIn').click();await page.keyboard.down('d');await page.waitForTimeout(80);await page.keyboard.up('d');const pan1=await page.locator('#scheduleBoard').evaluate(e=>e.scrollLeft);await page.keyboard.down('d');await page.waitForTimeout(80);await page.keyboard.up('d');assert.ok(await page.locator('#scheduleBoard').evaluate(e=>e.scrollLeft)>pan1);
   await page.locator('#scheduleBoard').evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(60);
   await page.locator('#scheduleZoomReset').click();await page.locator('#scheduleVppEnabled').check();await task(0,'fwd').click();assert.equal(await page.locator('[data-schedule-arrow]').count(),7);
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#saveSvg').click()]);const text=fs.readFileSync(await download.path(),'utf8');assert.equal((text.match(/data-schedule-arrow=/g)||[]).length,7);assert.match(text,/data-schedule-table/);
   await page.screenshot({path:path.join(__dirname,'../verification/schedule-arrows.png'),fullPage:true});
   await page.locator('#scheduleBoard').press('Escape');assert.equal(await page.locator('[data-schedule-arrow]').count(),0);
   await page.screenshot({path:path.join(__dirname,'../verification/schedule-canvas.png'),fullPage:true});
  });
  await check('many chunks page the table, export all columns and retain narrow-screen controls',async()=>{
   await page.locator('#layers').fill('12');await wait();await page.locator('#scheduleVpp').fill('6');
   assert.deepEqual(await page.locator('[data-schedule-chunk-heading]').allTextContents(),['VPP 0','VPP 1','VPP 2','VPP 3']);
   await page.locator('[data-chunk-page="1"]').focus();await page.keyboard.press('Enter');assert.deepEqual(await page.locator('[data-schedule-chunk-heading]').allTextContents(),['VPP 4','VPP 5']);await page.keyboard.press('Enter');assert.deepEqual(await page.locator('[data-schedule-chunk-heading]').allTextContents(),['VPP 0','VPP 1','VPP 2','VPP 3']);assert.equal(await page.evaluate(()=>document.activeElement.dataset.chunkPage),'1');
   const exported=await page.evaluate(()=>PPScheduler.exportSvg());assert.equal((exported.match(/data-schedule-chunk-heading=/g)||[]).length,6);assert.equal((exported.match(/data-schedule-layer=/g)||[]).length,12);
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);assert.equal(await page.locator('[data-schedule-chunk-heading]').count(),1);assert.equal(await page.locator('#scheduleFullscreen').isVisible(),true);
   await page.locator('#scheduleFullscreen').scrollIntoViewIfNeeded();await page.locator('#scheduleFullscreen').click();await page.waitForFunction(()=>document.getElementById('scheduleFullscreen').getAttribute('aria-pressed')==='true');await page.keyboard.press('Escape');await page.waitForTimeout(70);assert.equal(await page.locator('#scheduleFullscreen').getAttribute('aria-pressed'),'false');
  });
  await check('invalid batches tolerate zoom and fullscreen has a working fallback',async()=>{
   await page.locator('#scheduleGbs').fill('17');assert.equal(await page.locator('#scheduleError').isVisible(),true);
   for(const id of ['scheduleZoomIn','scheduleZoomOut','scheduleZoomReset'])await page.locator('#'+id).click();assert.equal(await page.locator('.schedule-task').count(),0);
   await page.locator('#scheduleGbs').fill('8');assert.equal(await page.locator('#scheduleError').isVisible(),false);
   await page.evaluate(()=>{document.getElementById('scheduleShell').requestFullscreen=()=>Promise.reject(new Error('test fallback'))});
   await page.locator('#scheduleFullscreen').click();await page.waitForFunction(()=>document.querySelector('#scheduleShell.is-fullscreen'));assert.equal(await page.locator('#scheduleFullscreen').getAttribute('aria-pressed'),'true');
   await page.keyboard.press('Escape');assert.equal(await page.locator('#scheduleFullscreen').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('schedule-canvas-fullscreen')),false);
  });
  assert.deepEqual(errors,[]);if(!process.env.TEST_SITE_URL)assert.deepEqual(requests,[]);console.log('Schedule canvas checks:',checks.length);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
