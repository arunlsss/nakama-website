'use strict';
const E=require('./engine');
const stageLabels={before:'Before shipment',after:'After shipment',completed:'After delivery / completion',mixed:'Mixed stages',conflict:'Conflicting evidence',unknown:'Unknown'};
const clean=v=>String(v??'').trim().replace(/\s+/g,' ').slice(0,500);
function validate(data={}){
 const from=E.date(data.from),to=E.date(data.to);if(!from||from!==data.from||to!==data.to||from>to)throw Error('Choose valid cancellation report dates.');
 let store=data.store||'';if(Array.isArray(store)){if(!store.length||store.length>100||store.some(s=>typeof s!=='string'||!s.trim()||s.length>1000))throw Error('Choose 1 to 100 valid stores.');store=[...new Set(store)].sort();}else if(typeof store!=='string'||store.length>1000)throw Error('Invalid store filter.');
 const platform=data.platform||'';if(typeof platform!=='string'||platform.length>120)throw Error('Invalid marketplace filter.');
 return {from,to,store,platform};
}
// Date-only cells describe a whole Bangkok day. Same-day events without times cannot be ordered.
function moment(value){
 if(value==null||value==='')return null;
 if(typeof value==='number'){
  if(!Number.isFinite(value)||value<1||value>300000)return null;
  const min=Date.UTC(1899,11,30)+Math.floor(value)*86400000-25200000,fraction=value-Math.floor(value);
  if(fraction<1e-9)return {min,max:min+86400000-1};const exact=min+Math.round(fraction*86400000);return {min:exact,max:exact};
 }
 const s=clean(value),date=E.date(s);if(!date)return null;
 const iso=s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i);
 if(iso){if(E.date(iso[1])!==iso[1]||+iso[2]>23||+iso[3]>59||+(iso[4]||0)>59)return null;const t=Date.parse(s);return Number.isFinite(t)?{min:t,max:t}:null;}
 const time=s.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?$/),min=Date.parse(date+'T00:00:00+07:00');
 if(!time){if(s!==date&&!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)&&!/^\d{1,2} [A-Za-z]+ \d{4}$/.test(s))return null;return {min,max:min+86400000-1};}
 if(+time[1]>23||+time[2]>59||+(time[3]||0)>59)return null;const t=min+(+time[1]*3600+ +time[2]*60+ +(time[3]||0))*1000;return {min:t,max:t};
}
function priorStage(value){
 const s=clean(value).toLowerCase().replace(/[_-]/g,' ');
 if(/^(?:completed|complete|delivered|สำเร็จ|จัดส่งสำเร็จ)$/.test(s))return 'completed';
 if(/^(?:shipped|in transit|to receive|out for delivery|จัดส่งแล้ว|กำลังจัดส่ง)$/.test(s))return 'after';
 if(/^(?:to ship|unpaid|pending|pending payment|ready to ship|awaiting shipment|awaiting collection|packed|printed|รอจัดส่ง|ยังไม่ชำระ|รอชำระเงิน)$/.test(s))return 'before';
 return null;
}
function stage(metadata={}){
 const prior=priorStage(metadata.beforeStatus),cancel=moment(metadata.cancelledAt),ship=moment(metadata.shippedAt),complete=moment(metadata.completedAt);let timed=null;
 if(ship&&complete&&complete.max<ship.min)return 'conflict';
 if(cancel&&complete&&cancel.min>complete.max)timed='completed';
 else if(cancel&&ship){if(cancel.max<ship.min)timed='before';else if(cancel.min>ship.max)timed='after';}
 if(prior&&timed&&prior!==timed)return 'conflict';return prior||timed||'unknown';
}
function summary(records,data){
 const filters=validate(data),stages=new Map(Object.entries(stageLabels).map(([key,label])=>[key,{key,label,orders:0,gmv:0,units:0}])),reasons=new Map(),groups=new Map();
 const totals={affectedOrders:0,fullyCanceledOrders:0,partiallyCanceledOrders:0,gmv:0,units:0},coverage={metadataOrders:0,reasonOrders:0,stageOrders:0};
 function add(map,key,fields,o,line){if(!map.has(key))map.set(key,{...fields,gmv:0,units:0,ids:new Set()});const item=map.get(key);item.gmv+=line.price*line.qty;item.units+=line.qty;item.ids.add(o.key||JSON.stringify([o.platform,o.store,o.id]));}
 for(const o of records){
  if(o.excluded||o.status==='Platform Processing'||o.date<filters.from||o.date>filters.to||(Array.isArray(filters.store)?!filters.store.includes(o.store):filters.store&&filters.store!==o.store)||(filters.platform&&o.platform!==filters.platform))continue;
  const lines=o.lines.filter(l=>(l.status||o.status)==='Canceled');if(!lines.length)continue;
  totals.affectedOrders++;const partial=o.lines.some(l=>(l.status||o.status)!=='Canceled');totals[partial?'partiallyCanceledOrders':'fullyCanceledOrders']++;
  const evidence=new Set(lines.map(l=>stage(l.cancellation))),key=evidence.has('conflict')?'conflict':evidence.has('unknown')?'unknown':evidence.size>1?'mixed':[...evidence][0],bucket=stages.get(key);bucket.orders++;
  if(lines.some(l=>l.cancellation&&Object.keys(l.cancellation).length))coverage.metadataOrders++;
  if(lines.every(l=>clean(l.cancellation?.reason)))coverage.reasonOrders++;
  if(['before','after','completed','mixed'].includes(key))coverage.stageOrders++;
  for(const l of lines){const c=l.cancellation||{},reason=clean(c.reason)||'Not provided',beforeStatus=clean(c.beforeStatus)||'Not provided',initiator=clean(c.initiator)||'Not provided',gmv=l.price*l.qty;totals.gmv+=gmv;totals.units+=l.qty;bucket.gmv+=gmv;bucket.units+=l.qty;
   add(reasons,reason,{reason},o,l);add(groups,JSON.stringify([reason,key,beforeStatus,initiator,o.store,o.platform]),{reason,stage:key,stageLabel:stageLabels[key],beforeStatus,initiator,store:o.store,platform:o.platform},o,l);
  }
 }
 const finish=map=>[...map.values()].map(({ids,...r})=>({...r,orders:ids.size,gmv:Math.round(r.gmv*100)/100})).sort((a,b)=>b.orders-a.orders||b.gmv-a.gmv||JSON.stringify(a).localeCompare(JSON.stringify(b))),allGroups=finish(groups),allReasons=finish(reasons);
 totals.gmv=Math.round(totals.gmv*100)/100;
 return {kind:'cancellations',version:1,filters,totals,coverage,stages:[...stages.values()].map(r=>({...r,gmv:Math.round(r.gmv*100)/100})),reasons:allReasons.slice(0,50),reasonCount:allReasons.length,rows:allGroups.slice(0,500),rowCount:allGroups.length};
}
module.exports={validate,moment,stage,summary};
