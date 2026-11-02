const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge',proxy:process.env.TEST_SITE_URL&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
 const page=await browser.newPage({viewport:{width:1700,height:1100}}),errors=[],requests=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name)},wait=async()=>page.waitForTimeout(300);
 const task=(stage,phase,chunk=0)=>page.locator(`.schedule-task[data-stage="${stage}"][data-phase="${phase}"][data-chunk="${chunk}"]`).first();
 try{
  await page.goto(process.env.TEST_SITE_URL||'file:///'+path.resolve(__dirname,'../tools/draw_parallel_card.html').replaceAll('\\','/'));
  await page.locator('[data-view="schedule"]').click();
  await check('actual stage layers and default backward ratio control task widths and time',async()=>{
   assert.equal(await page.locator('#scheduleBackwardRatio').inputValue(),'2');
   assert.equal(await page.locator('#scheduleDuration').innerText(),'54');
   const f=await task(0,'fwd').locator('rect').boundingBox(),b=await task(0,'bwd').locator('rect').boundingBox();assert.ok(b.width>f.width*1.9&&b.width<f.width*2.15);
   await page.locator('#scheduleGbs').fill('8');
   await page.locator('[data-layer="0"]').fill('1');await page.locator('[data-layer="1"]').fill('3');await wait();
   assert.equal(await page.locator('#scheduleDuration').innerText(),'21');
   assert.equal(await task(0,'fwd').getAttribute('data-duration'),'1');assert.equal(await task(1,'bwd').getAttribute('data-duration'),'6');
   await task(1,'bwd').hover();assert.match(await page.locator('#scheduleSelection').innerText(),/3 层/);
  });
  await check('global phase boundaries can be toggled and exported',async()=>{
   const lines=page.locator('[data-schedule-boundary]');assert.ok(await lines.count()>0);
   assert.ok(await page.locator('[data-schedule-region="warmup"]').count()>0);
   await page.locator('#scheduleBoundaries').uncheck();assert.equal(await lines.count(),0);
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#saveSvg').click()]);
   assert.doesNotMatch(fs.readFileSync(await download.path(),'utf8'),/data-schedule-boundary/);
   await page.locator('#scheduleBoundaries').check();assert.ok(await lines.count()>0);
  });
  await check('VPP interleaves chunks on physical rows and validates constraints',async()=>{
   await page.locator('[data-layer="0"]').fill('2');await page.locator('[data-layer="1"]').fill('2');await wait();
   await page.locator('#scheduleVppEnabled').check();
   assert.equal(await page.locator('#scheduleDuration').innerText(),'15');assert.equal(await page.locator('.schedule-task').count(),16);
   assert.equal(await page.locator('.schedule-stage-label').count(),2);assert.ok(await task(0,'fwd',1).count()>0);
   assert.equal(await page.locator('#scheduleMode option[value="gpipe"]').evaluate(e=>e.disabled),true);
   const a=await task(0,'fwd',0).locator('rect').boundingBox(),b=await task(0,'fwd',1).locator('rect').boundingBox();assert.equal(a.y,b.y);
   await page.locator('#scheduleGbs').fill('12');assert.equal(await page.locator('#scheduleError').isVisible(),true);assert.equal(await page.locator('.schedule-task').count(),0);
   await page.locator('#scheduleGbs').fill('8');await page.locator('#scheduleVpp').fill('3');assert.equal(await page.locator('.schedule-task').count(),0);
   await page.locator('#scheduleVpp').fill('1');assert.equal(await page.locator('#scheduleError').isVisible(),true);
   await page.locator('#scheduleVpp').fill('2');assert.equal(await page.locator('#scheduleError').isVisible(),false);
  });
  await check('uneven chunks, ratio and settings survive JSON and SVG roundtrips',async()=>{
   await page.locator('#layers').fill('8');await wait();await page.locator('[data-layer="0"]').fill('3');await page.locator('[data-layer="1"]').fill('5');await wait();
   assert.equal(await task(0,'fwd',0).getAttribute('data-duration'),'1');assert.equal(await task(0,'fwd',1).getAttribute('data-duration'),'2');
   assert.equal(await task(1,'fwd',0).getAttribute('data-duration'),'2');assert.equal(await task(1,'fwd',1).getAttribute('data-duration'),'3');
   await page.locator('#scheduleBackwardRatio').fill('1.5');assert.equal(await task(1,'bwd',1).getAttribute('data-duration'),'4.5');
   await page.locator('#scheduleBoundaries').uncheck();
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportBtn').click()]);const config=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
   assert.equal(config.schedule.vpp,2);assert.equal(config.schedule.backwardRatio,1.5);assert.equal(config.schedule.showBoundaries,false);
   const [svgDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#saveSvg').click()]);const svg=fs.readFileSync(await svgDownload.path(),'utf8');
   assert.equal((svg.match(/data-schedule-event=/g)||[]).length,16);assert.match(svg,/data-chunk="1"/);assert.match(svg,/data-duration="4.5"/);assert.doesNotMatch(svg,/data-schedule-boundary/);
   await page.locator('#scheduleVppEnabled').uncheck();await page.locator('#scheduleBackwardRatio').fill('2');await page.locator('#scheduleBoundaries').check();
   config.schedule.vpp=' 2 ';config.schedule.backwardRatio=' 1.5 ';config.schedule.gbs=' 8 ';config.schedule.mbs=' 2 ';
   await page.locator('#fileInput').setInputFiles({name:'weighted-vpp.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(config))});await wait();
   assert.equal(await page.locator('#scheduleVppEnabled').isChecked(),true);assert.equal(await page.locator('#scheduleBackwardRatio').inputValue(),'1.5');assert.equal(await page.locator('#scheduleBoundaries').isChecked(),false);assert.equal(await page.locator('#scheduleError').isVisible(),false);
  });
  await check('GPipe, large layer counts and narrow screens remain usable',async()=>{
   await page.locator('#scheduleVppEnabled').uncheck();await page.locator('#scheduleMode').selectOption('gpipe');await page.locator('#scheduleBoundaries').check();
   assert.equal(await page.locator('[data-schedule-region="steady"]').count(),0);assert.ok(await page.locator('[data-schedule-region="forward"]').count()>0);
   await page.locator('#layers').fill('1000000');await wait();assert.equal(await page.locator('#scheduleError').isVisible(),false);
   assert.ok(await page.locator('.schedule-task').count()>0);assert.ok(await page.locator('#scheduleBoard').evaluate(e=>e.scrollWidth)<8001000);
   await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#scheduleVppEnabled').isVisible(),true);assert.equal(await page.locator('#scheduleBackwardRatio').isVisible(),true);
   await page.setViewportSize({width:1700,height:1100});await page.locator('#layers').fill('8');await wait();await page.locator('#scheduleVppEnabled').check();
   await page.screenshot({path:path.join(__dirname,'../verification/weighted-vpp.png'),fullPage:true});
  });
  assert.deepEqual(errors,[]);if(!process.env.TEST_SITE_URL)assert.deepEqual(requests,[]);console.log('Weighted pipeline browser checks:',checks.length);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
