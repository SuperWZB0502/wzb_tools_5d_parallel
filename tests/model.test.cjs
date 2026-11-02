const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../tools/draw_parallel_card.html'),'utf8');
const context=vm.createContext({});
vm.runInContext(html.match(/<script id="model">([\s\S]*?)<\/script>/)[1],context);
const M=context.XYModel;
const plain=x=>JSON.parse(JSON.stringify(x));
const base={total:32,layers:24,experts:8,tp:2,cp:2,pp:2,ep:4,extend:false,layerCounts:[9,15]};
function topo(c={}){const v=M.validateConfig({...base,...c});assert.equal(v.ok,true,JSON.stringify(v.errors));return M.buildTopology(v.config)}
test('reject invalid sizes, unsafe integers, incomplete and mismatched stages',()=>{
 for(const c of [{total:4097},{total:0},{tp:0},{tp:1.5},{tp:Infinity},{layers:Number.MAX_SAFE_INTEGER+1},{total:31},{ep:3},{experts:7},{extend:true,experts:12},{layerCounts:['',24]},{layerCounts:[8,15]},{layerCounts:[0,24]},{experts:0},{pp:33}]) assert.equal(M.validateConfig({...base,...c}).ok,false,JSON.stringify(c));
 assert.equal(M.validateConfig({...base,experts:0,ep:1,extend:false}).ok,true);
 assert.equal(M.validateConfig({...base,layers:25,layerCounts:[9,16]}).ok,true);
});
test('reject malformed imported field types rather than coercing another topology',()=>{
 const tiny={total:1,layers:1,experts:0,tp:1,cp:1,pp:1,ep:1,extend:false,layerCounts:[1]};
 for(const key of ['total','layers','tp','cp','pp','ep','experts'])for(const v of [true,[1],{}])assert.equal(M.validateConfig({...tiny,[key]:v}).ok,false,key+': '+JSON.stringify(v));
 for(const v of ['true',1,[],null])assert.equal(M.validateConfig({...tiny,extend:v}).ok,false,'extend '+JSON.stringify(v));
 for(const v of [true,[1],{}])assert.equal(M.validateConfig({...tiny,layerCounts:[v]}).ok,false,'layer '+JSON.stringify(v));
 assert.equal(M.validateConfig(null).ok,false);assert.equal(M.validateConfig([]).ok,false);
});
test('rank mapping and the seven groups match the supplied 32-card fixture',()=>{
 const t=topo();assert.equal(t.config.dp,4);assert.equal(t.span,4);assert.equal(t.repeatCount,2);
 assert.deepEqual(plain(t.coords(17)),{tp:1,cp:0,dp:0,pp:1,ep:0,replica:0,combined:0});
 for(const [type,want] of Object.entries({TP:[0,1],CP:[0,2],PP:[0,16],EP:[0,2,4,6],DP:[0,4,8,12],DP_CP:[0,2,4,6,8,10,12,14],EXPERT:[0,8],ROUTE:[0,1,2,3,4,5,6,7]})) assert.deepEqual(plain(t.groupFor(type,0).members),want,type);
 assert.equal(t.groupFor('TP',17).index,8);assert.equal(t.groupFor('PP',17).index,1);
 assert.deepEqual(plain(t.layerRanges),[{start:1,end:9,count:9},{start:10,end:24,count:15}]);
 for(const type of ['TP','CP','PP','EP','DP','DP_CP','EXPERT']){const a=t.groups(type).flat();assert.equal(a.length,32);assert.equal(new Set(a).size,32)}
});
test('expert placement and exact identities distinguish shards from copies',()=>{
 const a=topo(),b=topo({extend:true});
 assert.deepEqual(plain(a.placement(0)),{start:0,end:1,count:2,fraction:0.5,shard:0});
 assert.deepEqual(plain(a.placement(1)),{start:0,end:1,count:2,fraction:0.5,shard:1});
 assert.deepEqual(plain(b.placement(1)),{start:1,end:1,count:1,fraction:1,shard:null});
 for(const t of [a,b]){assert.equal(t.identity(0,'moe'),t.identity(8,'moe'));assert.notEqual(t.identity(0,'moe'),t.identity(4,'moe'));assert.notEqual(t.identity(0,'att'),t.identity(1,'att'));assert.equal(t.identity(0,'att'),t.identity(2,'att'))}
});
test('relations use actual dispatcher domains and phase conditions',()=>{
 const t=topo();
 const rel=(type,o={})=>M.buildRelations(t,0,type,{phases:['fwd','bwd','sync'],dispatcher:'AllGather',optimizer:false,sp:false,...o});
 assert.deepEqual(plain(rel('moe').find(x=>x.phase==='fwd'&&x.domain==='ROUTE').members),[0,1,2,3,4,5,6,7]);
 assert.ok(rel('moe',{dispatcher:'AllToAll'}).some(x=>x.domain==='EP'));
 assert.ok(rel('moe',{dispatcher:'AllToAll'}).some(x=>x.domain==='TP'));
 assert.equal(rel('att').some(x=>x.kind==='parameter'),false);
 assert.ok(rel('att',{optimizer:true}).some(x=>x.phase==='sync'&&x.domain==='DP_CP'&&x.kind==='parameter'&&x.operation==='AllGather'));
 assert.deepEqual(plain(rel('att',{phases:[]})),[]);
 assert.ok(rel('att',{phases:['bwd']}).every(x=>x.phase==='bwd'));
 assert.equal(rel('att').find(x=>x.phase==='sync'&&x.domain==='DP_CP').operation,'AllReduce');
 assert.equal(rel('att',{optimizer:true}).find(x=>x.phase==='sync'&&x.domain==='DP_CP'&&x.kind==='gradient').operation,'ReduceScatter');
 const ex=M.buildRelations(topo({extend:true}),0,'moe',{phases:['fwd'],dispatcher:'AllToAll'});assert.ok(ex.some(x=>x.domain==='ROUTE'));assert.equal(ex.some(x=>x.domain==='TP'),false);
});
test('PP joins only adjacent stages with the rank endpoints and layer boundary',()=>{
 const t=topo({total:24,layers:12,pp:3,ep:2,layerCounts:[3,5,4]});
 const r=M.buildRelations(t,0,'moe',{phases:['fwd','bwd'],dispatcher:'AllGather'}).filter(x=>x.domain==='PP');
 assert.equal(r.length,2);assert.deepEqual(plain(r[0].targets),[{rank:8,module:'rank'}]);assert.deepEqual(plain(r[0].boundary),[3,4]);
 assert.deepEqual(plain(r[0].from),{rank:0,module:'rank'});assert.deepEqual(plain(r[0].to),{rank:8,module:'rank'});
 assert.deepEqual(plain(r[1].from),{rank:8,module:'rank'});assert.deepEqual(plain(r[1].to),{rank:0,module:'rank'});
 assert.deepEqual(plain(r[1].boundary),[4,3]);
 const s=M.visibleSlice(t,new Set([0,2]));assert.equal(s.stages[1].expanded,false);assert.equal(s.ranks.includes(8),false);assert.equal(s.ranks.includes(16),true);
});
test('4096-card rendering stays within budget while groups remain complete',()=>{
 const t=topo({total:4096,layers:64,tp:8,cp:2,pp:8,ep:8,experts:64,layerCounts:[4,6,8,10,12,10,8,6]});
 assert.equal(t.config.dp,32);assert.equal(t.config.expertReplicas,8);assert.equal(t.span,8);assert.equal(t.repeatCount,8);
 const s=M.visibleSlice(t,new Set([0,7]));assert.equal(s.ranks.length,128);assert.ok(s.ranks.includes(3584));
 const all=new Set([0,1,2,3,4,5,6,7]);const p=M.visibleSlice(t,all);assert.equal(p.ranks.length,128);assert.equal(p.cardPages,4);
 assert.equal(M.visibleSlice(t,new Set()).ranks.length,0);assert.equal(t.groups('TP').length,512);
 const b=M.visibleSlice(t,new Set([7]),7,0);assert.ok(b.ranks.includes(4032));
});
test('single-card and extreme TP/PP do not change ranks or exceed bounds',()=>{
 const one=topo({total:1,layers:1,tp:1,cp:1,pp:1,ep:1,experts:0,layerCounts:[1]});assert.equal(M.buildRelations(one,0,'att',{phases:['fwd','bwd','sync'],optimizer:true}).length,0);
 const huge=topo({total:4096,layers:1,tp:4096,cp:1,pp:1,ep:1,experts:0,layerCounts:[1]});const s=M.visibleSlice(huge,new Set([0]),0,31);assert.equal(s.ranks.length,128);assert.equal(s.ranks[127],4095);
 const pp=topo({total:4096,layers:4096,tp:1,cp:1,pp:4096,ep:1,experts:0,layerCounts:Array(4096).fill(1)});const l=M.buildStageLayout(pp,new Set([0,4095]));const last=M.visibleSlice(pp,new Set([0,4095]),0,0,{top:l.rows[2].y,height:600});assert.equal(last.stages.length,3);assert.deepEqual(plain(last.ranks),[0,4095]);
});
