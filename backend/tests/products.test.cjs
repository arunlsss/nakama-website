const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),C=require('../functions/lib/core'),P=require('../functions/lib/products');
const revision='11111111-1111-4111-8111-111111111111',args={op:'products',revision,from:'2026-09-30',to:'2026-10-01'};
const order=(key,date,sku='24/14',qty=2,status='Completed')=>({key,id:'private-'+key,date,store:'NKM_SHP',platform:'Shopee',status,customer:{buyerHash:'secret-hash'},lines:[{sku,product:'Wiper',price:50,qty,status}]});
test('product dates include both boundaries across months and retain unique SKU order counts',()=>{
 const one=order('one','2026-09-30');one.lines.push({...one.lines[0],qty:1});
 const records=[order('before','2026-09-29'),one,order('two','2026-10-01'),order('after','2026-10-02'),order('excluded','2026-10-01','X',1,'Platform Processing')];
 const rows=P.rows(records,P.validate(args));a.equal(rows.length,2);a.equal(rows.reduce((n,r)=>n+r.gmv,0),250);a.equal(rows.reduce((n,r)=>n+r.units,0),5);a.equal(rows.reduce((n,r)=>n+r.orders,0),2);a.equal(rows[0].size1,'24');a.equal(rows[0].size2,'14');for(const token of ['buyerHash','secret-hash','private-one','lines'])a.ok(!JSON.stringify(rows).includes(token));a.deepEqual(P.rows(records,{from:'2027-01-01',to:'2027-01-01'}),[]);
});
test('product request rejects invalid dates, reversed dates, revision and pagination',()=>{
 for(const data of [{...args,from:'2026-09-31'},{...args,to:'2026-09-01'},{...args,revision:'bad'},{...args,cursor:'bad'},{...args,from:'1900-01-01',to:'2026-10-01'}])a.throws(()=>P.validate(data),e=>e.code==='invalid-argument');
});
function harness(records,{afterDownload=()=>{}}={}){
 let enabled=true,downloads=0;const snapshot=C.snapshot(records),db={doc:p=>({get:async()=>({data:()=>p.startsWith('members/')?{enabled,role:'viewer'}:{state:'published',snapshot:'private/revisions/sample'}})})},exports={};
 const sandbox={exports,process:{env:{GCLOUD_PROJECT:'nakama-sales'}},console,require:name=>{
  if(name==='firebase-functions/v2/https')return {onCall:(opts,fn)=>fn,HttpsError:class extends Error{constructor(code,msg){super(msg);this.code=code;}}};
  if(name==='firebase-admin/app')return {initializeApp:()=>{}};
  if(name==='firebase-admin/firestore')return {getFirestore:()=>db};
  if(name==='firebase-admin/auth')return {getAuth:()=>({getUser:async()=>({disabled:false})})};
  if(name==='firebase-admin/storage')return {getStorage:()=>({bucket:()=>({file:()=>({download:async()=>{downloads++;afterDownload(()=>enabled=false);return [snapshot];}})})})};
  if(name.startsWith('./lib/'))return require('../functions/'+name.slice(2));
  if(name==='./auth-config.json')return {apiKey:'test-public-key'};return require(name);
 }};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../functions/index.js'),'utf8'),sandbox);return {call:exports.nkmCustomerInsights,revoke:()=>enabled=false,downloads:()=>downloads};
}
const request=data=>({auth:{uid:'u',token:{nakamaRole:'viewer'}},data});
test('product endpoint requires membership before and after private reads and only returns paginated totals',async()=>{
 const records=Array.from({length:510},(_,i)=>order('o'+i,'2026-09-30','SKU'+i)),h=harness(records);
 await a.rejects(()=>h.call({data:args}),e=>e.code==='unauthenticated');a.equal(h.downloads(),0);
 const first=await h.call(request(args));a.equal(first.kind,'products');a.equal(first.total,510);a.equal(first.rows.length,500);a.ok(first.nextCursor);a.ok(!JSON.stringify(first).includes('secret-hash'));
 const last=await h.call(request({...args,cursor:first.nextCursor}));a.equal(last.rows.length,10);a.equal(last.nextCursor,null);a.equal(h.downloads(),1);a.equal(new Set([...first.rows,...last.rows].map(r=>r.sku)).size,510);
 h.revoke();const before=h.downloads();await a.rejects(()=>h.call(request(args)),e=>e.code==='permission-denied');a.equal(h.downloads(),before);
 const late=harness(records,{afterDownload:revoke=>revoke()});await a.rejects(()=>late.call(request(args)),e=>e.code==='permission-denied');
});
