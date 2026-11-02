const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../tools/draw_parallel_card.html'),'utf8'),context=vm.createContext({});
vm.runInContext(html.match(/<script id="pipeline-model">([\s\S]*?)<\/script>/)?.[1]||'',context);
function model(){assert.ok(context.XYPipeline,'PP scheduling model is not implemented');return context.XYPipeline;}
const plain=v=>JSON.parse(JSON.stringify(v));

test('batch count includes DP and rejects nonintegral or unsafe configurations',()=>{
 const M=model(),base={gbs:32,mbs:2,dp:2,pp:2,mode:'1f1b'};
 assert.equal(M.validateBatch(base).config.mbn,8);
 assert.equal(M.validateBatch({...base,dp:4}).config.mbn,4);
 assert.equal(M.validateBatch({...base,gbs:'64',mbs:'4'}).config.mbn,8);
 for(const c of [{gbs:''},{mbs:0},{gbs:17},{gbs:1.5},{gbs:true},{dp:0},{pp:0},{pp:4097},{mode:'other'},{gbs:Number.MAX_SAFE_INTEGER+1},{mbs:Number.MAX_SAFE_INTEGER,dp:2},{gbs:262148,mbs:1,dp:1,pp:1}])assert.equal(M.validateBatch({...base,...c}).ok,false,JSON.stringify(c));
});

test('1F1B has the hand-derived two-stage two-microbatch schedule',()=>{
 const result=model().buildSchedule({pp:2,mbn:2,mode:'1f1b'});
 assert.deepEqual(plain(result.stages.map(row=>row.map(e=>[e.phase,e.microbatch,e.start,e.end]))),[
  [['fwd',0,0,1],['fwd',1,1,2],['bwd',0,3,4],['bwd',1,5,6]],
  [['fwd',0,1,2],['bwd',0,2,3],['fwd',1,3,4],['bwd',1,4,5]]
 ]);
 assert.equal(result.duration,6);assert.equal(result.busyTime,8);assert.ok(Math.abs(result.utilization-2/3)<1e-12);assert.deepEqual(plain(result.peakOutstanding),[2,1]);
});

test('GPipe runs all forwards then reverses microbatches for backward',()=>{
 const result=model().buildSchedule({pp:2,mbn:2,mode:'gpipe'});
 assert.deepEqual(plain(result.stages.map(row=>row.map(e=>[e.phase,e.microbatch,e.start,e.end]))),[
  [['fwd',0,0,1],['fwd',1,1,2],['bwd',1,4,5],['bwd',0,5,6]],
  [['fwd',0,1,2],['fwd',1,2,3],['bwd',1,3,4],['bwd',0,4,5]]
 ]);assert.deepEqual(plain(result.peakOutstanding),[2,2]);
});

test('one stage has no bubbles and the two algorithms retain distinct local orders',()=>{
 const M=model(),a=M.buildSchedule({pp:1,mbn:3,mode:'1f1b'}),b=M.buildSchedule({pp:1,mbn:3,mode:'gpipe'});
 assert.deepEqual(plain(a.stages[0].map(e=>e.phase+e.microbatch)),['fwd0','bwd0','fwd1','bwd1','fwd2','bwd2']);
 assert.deepEqual(plain(b.stages[0].map(e=>e.phase+e.microbatch)),['fwd0','fwd1','fwd2','bwd2','bwd1','bwd0']);
 for(const r of [a,b]){assert.equal(r.duration,6);assert.equal(r.bubbleRate,0);assert.equal(r.utilization,1)}
});

test('all small schedules complete every event without stage overlap or dependency violations',()=>{
 const M=model();
 for(const mode of ['1f1b','gpipe'])for(let pp=1;pp<=7;pp++)for(let mbn=1;mbn<=9;mbn++){
  const result=M.buildSchedule({pp,mbn,mode}),lookup=new Map(result.events.map(e=>[e.stage+':'+e.microbatch+':'+e.phase,e]));
  assert.equal(result.events.length,2*pp*mbn);assert.equal(lookup.size,2*pp*mbn);assert.equal(result.duration,2*(mbn+pp-1));
  for(const row of result.stages)for(let i=0;i<row.length;i++){
   const e=row[i];assert.equal(e.end,e.start+1);if(i)assert.ok(row[i-1].end<=e.start);
   if(e.phase==='fwd'&&e.stage>0)assert.ok(lookup.get((e.stage-1)+':'+e.microbatch+':fwd').end<=e.start);
   if(e.phase==='bwd'){assert.ok(lookup.get(e.stage+':'+e.microbatch+':fwd').end<=e.start);if(e.stage<pp-1)assert.ok(lookup.get((e.stage+1)+':'+e.microbatch+':bwd').end<=e.start)}
  }
 }
});

test('1F1B bounds outstanding microbatches by pipeline depth while GPipe retains the full batch',()=>{
 const M=model();assert.deepEqual(plain(M.buildSchedule({pp:4,mbn:8,mode:'1f1b'}).peakOutstanding),[4,3,2,1]);
 assert.deepEqual(plain(M.buildSchedule({pp:4,mbn:8,mode:'gpipe'}).peakOutstanding),[8,8,8,8]);
});

test('large pipeline uses no recursion and excessive graph size is rejected before allocation',()=>{
 const M=model(),result=M.buildSchedule({pp:4096,mbn:1,mode:'1f1b'});assert.equal(result.duration,8192);assert.equal(result.events.length,8192);
 assert.throws(()=>M.buildSchedule({pp:4096,mbn:17,mode:'1f1b'}),/65.?536|65536/);
 for(const input of [{pp:0,mbn:1,mode:'1f1b'},{pp:1,mbn:0,mode:'gpipe'},{pp:1,mbn:1,mode:'invalid'}])assert.throws(()=>M.buildSchedule(input));
});
