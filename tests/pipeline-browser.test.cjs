const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge',proxy:process.env.TEST_SITE_URL&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
 const page=await browser.newPage({viewport:{width:1700,height:1100}}),checks=[],errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});page.setDefaultTimeout(6000);
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name)},wait=async()=>page.waitForTimeout(280);
 try{
  await page.goto(process.env.TEST_SITE_URL||'file:///'+path.resolve(__dirname,'../tools/draw_parallel_card.html').replaceAll('\\','/'));
  const originalWeightFont=await page.locator('#weightSvg text').first().evaluate(e=>getComputedStyle(e).fontFamily);
  await check('third tab opens a schedule using live PP/DP and the batch formula',async()=>{
   assert.deepEqual(await page.locator('[data-view]').allTextContents(),['权重切分图','通信组表','PP 调度图']);
   await page.locator('[data-view="schedule"]').click();assert.equal(await page.locator('#scheduleMbn').innerText(),'8');
   assert.equal(await page.locator('#schedulePp').innerText(),'2');assert.equal(await page.locator('#scheduleDp').innerText(),'2');
   assert.equal(await page.locator('#scheduleDuration').innerText(),'18');assert.equal(await page.locator('#scheduleBoard').isVisible(),true);
   assert.ok((await page.locator('#scheduleBoard').boundingBox()).height<240,'small pipelines should not leave a large empty chart');
   assert.equal(await page.locator('.toolbar').isVisible(),false);assert.equal(await page.locator('.detail').isVisible(),false);
   await page.locator('[data-view="diagram"]').click();
   assert.equal(await page.locator('#weightSvg text').first().evaluate(e=>getComputedStyle(e).fontFamily),originalWeightFont,'schedule styles must not change the weight diagram');
   await page.locator('[data-view="schedule"]').click();
  });
  await check('GBS/MBS and current topology recalculate microbatch count',async()=>{
   await page.locator('#scheduleGbs').fill('64');assert.equal(await page.locator('#scheduleMbn').innerText(),'16');
   await page.locator('#total').fill('32');await wait();assert.equal(await page.locator('#scheduleDp').innerText(),'4');assert.equal(await page.locator('#scheduleMbn').innerText(),'8');
   await page.locator('#pp').fill('4');await wait();assert.equal(await page.locator('#schedulePp').innerText(),'4');assert.equal(await page.locator('#scheduleDp').innerText(),'2');assert.equal(await page.locator('#scheduleMbn').innerText(),'16');
  });
  await check('invalid batch or topology removes stale schedule and recovers',async()=>{
   await page.locator('#scheduleGbs').fill('17');assert.equal(await page.locator('#scheduleError').isVisible(),true);assert.equal(await page.locator('.schedule-task').count(),0);assert.equal(await page.locator('#scheduleMbn').innerText(),'—');
   await page.locator('#scheduleGbs').fill('64');await page.locator('#scheduleMbs').fill('0');assert.equal(await page.locator('.schedule-task').count(),0);
   await page.locator('#scheduleMbs').fill('2');assert.ok(await page.locator('.schedule-task').count()>0);
   await page.locator('#total').fill('31');await wait();assert.equal(await page.locator('.schedule-task').count(),0);
   await page.locator('#total').fill('32');await wait();assert.ok(await page.locator('.schedule-task').count()>0);
  });
  await check('modes change backward order and activation occupancy, and tasks can be selected',async()=>{
   await page.locator('#scheduleMode').selectOption('gpipe');assert.equal(await page.locator('#schedulePeak').innerText(),'16');
   const backward=page.locator('.schedule-task[data-stage="0"][data-phase="bwd"]');
   await page.locator('#scheduleBoard').evaluate(e=>e.scrollLeft=e.scrollWidth);await page.waitForTimeout(50);
   assert.ok((await backward.first().getAttribute('aria-label')).includes('微批 16'));
   await page.locator('#scheduleMode').selectOption('1f1b');assert.equal(await page.locator('#schedulePeak').innerText(),'4');
   const task=page.locator('.schedule-task[data-stage="0"][data-microbatch="0"]').first();await task.click();
   assert.ok(await page.locator('.schedule-task[data-selected="true"]').count()>=2);assert.match(await page.locator('#scheduleSelection').innerText(),/微批 1/);
   await task.press('Enter');assert.equal(await page.locator('.schedule-task[data-selected="true"]').count(),0);
  });
  await check('configuration and schedule SVG exports preserve schedule settings and all tasks',async()=>{
   await page.locator('#scheduleGbs').fill('16');await page.locator('#scheduleMbs').fill('2');await page.locator('#scheduleMode').selectOption('gpipe');
   const [configDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#exportBtn').click()]);
   const config=JSON.parse(fs.readFileSync(await configDownload.path(),'utf8'));assert.deepEqual(config.schedule,{gbs:16,mbs:2,mode:'gpipe'});
   const [svgDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#saveSvg').click()]);
   const svg=fs.readFileSync(await svgDownload.path(),'utf8');assert.match(svg,/PP 调度图/);assert.equal((svg.match(/data-schedule-event=/g)||[]).length,32);
   await page.locator('#scheduleGbs').fill('32');await page.locator('#fileInput').setInputFiles({name:'config.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(config))});await wait();
   assert.equal(await page.locator('#scheduleGbs').inputValue(),'16');assert.equal(await page.locator('#scheduleMode').inputValue(),'gpipe');
   delete config.schedule.mode;
   await page.locator('#fileInput').setInputFiles({name:'default-mode.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(config))});await wait();
   assert.equal(await page.locator('#scheduleMode').inputValue(),'1f1b');assert.equal(await page.locator('#scheduleMbn').innerText(),'4');assert.ok(await page.locator('.schedule-task').count()>0);
  });
  await check('large schedules virtualize both axes without losing the full stage range',async()=>{
   await page.locator('#scheduleMode').selectOption('gpipe');
   await page.locator('#layers').fill('128');await page.locator('#total').fill('512');await page.locator('#pp').fill('128');await wait();
   await page.locator('#scheduleGbs').fill('128');await page.locator('#scheduleMbs').fill('1');assert.equal(await page.locator('#scheduleMbn').innerText(),'128');
   assert.ok(await page.locator('.schedule-task').count()<1200);
   await page.locator('#scheduleBoard').evaluate(e=>{e.scrollTop=e.scrollHeight;e.scrollLeft=e.scrollWidth});await page.waitForTimeout(100);
   assert.ok(await page.locator('.schedule-stage-label[data-stage="127"]').count()>0);
   assert.equal(await page.locator('.schedule-task[data-stage="127"]').count(),0); // GPipe's last stage finishes before the final upstream cooldown.
   await page.locator('#scheduleBoard').evaluate(e=>e.scrollLeft=255*52);await page.waitForTimeout(100);
   assert.ok(await page.locator('.schedule-task[data-stage="127"]').count()>0);
  });
  await check('returning to old views restores original controls and offline interaction',async()=>{
   await page.locator('#scheduleGbs').fill('17');await page.locator('#scheduleMbs').fill('2');await page.locator('[data-view="diagram"]').click();
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportBtn').click()]);
   const saved=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(saved.total,512);assert.equal(saved.schedule,undefined);
   await page.locator('.config [data-preset="default"]').click();await page.locator('[data-view="diagram"]').click();
   assert.equal(await page.locator('.toolbar').isVisible(),true);assert.equal(await page.locator('.detail').isVisible(),true);assert.equal(await page.locator('.rank-card').count(),16);
   await page.locator('.rank-card[data-card-rank="0"] .global-rank-label').click();assert.equal(await page.locator('.detail-title').innerText(),'rank 0');
   await page.locator('[data-view="groups"]').click();assert.equal(await page.locator('#groupView').isVisible(),true);
   await page.locator('[data-view="schedule"]').click();await page.locator('#scheduleGbs').fill('32');await page.locator('#scheduleMbs').fill('2');await page.locator('#scheduleMode').selectOption('1f1b');
  });
  await check('narrow screen retains visible inputs, controls and chart',async()=>{
   await page.setViewportSize({width:390,height:844});await page.locator('#scheduleGbs').scrollIntoViewIfNeeded();assert.equal(await page.locator('#scheduleGbs').isVisible(),true);
   assert.equal(await page.locator('#scheduleBoard').isVisible(),true);assert.equal(await page.locator('#scheduleMode').isVisible(),true);await page.setViewportSize({width:1700,height:1100});
  });
  assert.deepEqual(errors,[]);if(!process.env.TEST_SITE_URL)assert.deepEqual(requests,[]);
  const out=path.join(__dirname,'../verification');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'pp-schedule.png'),fullPage:true});
  fs.writeFileSync(path.join(out,'pipeline-browser-report.json'),JSON.stringify({checks,errors,requests},null,2));console.log('Pipeline browser checks:',checks.length);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
