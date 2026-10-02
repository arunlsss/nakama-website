(function(root){
'use strict';
const DAY=86400000, text=v=>String(v??'').trim(), stamp=s=>Date.parse(s+'T00:00:00Z');
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(stamp(s))&&new Date(stamp(s)).toISOString().slice(0,10)===s;
const shift=(s,n)=>new Date(stamp(s)+n*DAY).toISOString().slice(0,10);
function today(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>parts.find(x=>x.type===k).value).join('-');}
function fail(message){throw Error(message);}
function str(v,label,max=160){if(typeof v!=='string'||!v.trim()||v.length>max)fail('Enter a valid '+label+'.');return v.trim();}
function num(v,label,max=1e8,integer=false){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||(integer&&!Number.isSafeInteger(v)))fail('Enter a valid '+label+'.');return v;}
const date=(v,label)=>validDate(v)&&v>='1900-01-01'&&v<='2100-12-31'?v:fail('Enter a valid '+label+'.');
const identifier=(v,label)=>{const s=str(v,label,80);if(!/^[A-Za-z0-9_-]+$/.test(s))fail('Invalid '+label+'.');return s;};
const category=sku=>/^wiper/i.test(sku)?'wiper':/^NKM_/i.test(sku)&&/cleaner|spray|purpose|lubric|remov|shine|foam|degreas|restore|weld|fluid|rust|pitch|carb|brake/i.test(sku)?'spray':'other';
const lead={wiper:45,spray:60,other:45};
function empty(){return {version:1,snapshot:null,settings:{warehouses:[],horizon:180,safetyDays:15,coverageDays:90,demandMode:'lost'},skus:[],pos:[]};}
function parseInventory(headers,rows,fileName,asOf){
 const normalized=headers.map(v=>text(v).toLowerCase());
 const aliases={sku:['sku name','ชื่อsku','sku'],title:['title','หัวข้อ'],warehouse:['warehouse','ชื่อคลังสินค้า'],onhand:['on hand','onhand','สต็อกที่มีอยู่'],incoming:['on the way','ระหว่างทาง']};
 const col=Object.fromEntries(Object.entries(aliases).map(([k,a])=>[k,normalized.findIndex(h=>a.includes(h))]));
 for(const k of ['sku','warehouse','onhand'])if(col[k]<0)fail('Missing BigSeller header: '+k+'. Use the inventory export.');
 if(rows.length>5000)fail('Stock imports support up to 5,000 warehouse rows.');
 const seen=new Set(),out=[];
 for(let i=0;i<rows.length;i++){
  const row=rows[i];if(!row.some(v=>text(v)))continue;
  const sku=str(text(row[col.sku]),'SKU'),warehouse=str(text(row[col.warehouse]),'warehouse'),key=JSON.stringify([sku,warehouse]);
  if(seen.has(key))fail('Duplicate SKU / warehouse at row '+(i+2)+'. Upload one warehouse balance per SKU.');seen.add(key);
  const read=(c,label,optional=false)=>{const raw=row[c];if(optional&&(c<0||raw==null||text(raw)===''))return 0;const s=text(raw).replace(/,/g,'');if(!/^\d+(?:\.\d+)?$/.test(s))fail('Invalid '+label+' at row '+(i+2)+'.');return num(Number(s),label,1e8,true);};
  out.push({sku,title:text(row[col.title]).slice(0,240)||sku,warehouse,onhand:read(col.onhand,'On Hand'),incoming:read(col.incoming,'On The Way',true)});
 }
 if(!out.length)fail('The inventory export contains no stock rows.');
 return {date:date(asOf,'stock snapshot date'),fileName:str(fileName,'file name',200),rows:out};
}
function validate(value){
 if(value?.version!==1)fail('Unsupported stock forecast version.');
 const s=empty();
 if(value.snapshot){const v=value.snapshot;if(!Array.isArray(v.rows)||!v.rows.length||v.rows.length>5000)fail('Invalid stock rows.');const seen=new Set();s.snapshot={date:date(v.date,'stock snapshot date'),fileName:str(v.fileName,'file name',200),rows:v.rows.map(r=>{const sku=str(r.sku,'SKU'),warehouse=str(r.warehouse,'warehouse'),key=JSON.stringify([sku,warehouse]);if(seen.has(key))fail('Duplicate SKU / warehouse.');seen.add(key);return {sku,warehouse,title:str(r.title||sku,'title',240),onhand:num(r.onhand,'On Hand',1e8,true),incoming:num(r.incoming,'incoming',1e8,true)};})};}
 const v=value.settings||{};if(!Array.isArray(v.warehouses)||v.warehouses.length>30)fail('Invalid warehouse selection.');s.settings={warehouses:[...new Set(v.warehouses.map(w=>str(w,'warehouse')))],horizon:num(v.horizon,'forecast horizon',365,true),safetyDays:num(v.safetyDays,'safety days',90,true),coverageDays:num(v.coverageDays,'coverage days',180,true),demandMode:v.demandMode};if(s.settings.horizon<30||s.settings.coverageDays<1||!['lost','backorder'].includes(v.demandMode))fail('Invalid forecast settings.');
 if(!Array.isArray(value.skus)||value.skus.length>2000)fail('Too many stock SKUs.');const skus=new Set();s.skus=value.skus.map(r=>{const sku=str(r.sku,'SKU');if(skus.has(sku))fail('Duplicate SKU settings.');skus.add(sku);if(!['wiper','spray','other'].includes(r.category))fail('Choose a product category.');return {sku,category:r.category,rate:r.rate===null?null:num(r.rate,'daily rate',1e6),offline:num(r.offline||0,'offline daily rate',1e6),growth:num(r.growth||0,'monthly growth',200),rateSource:str(r.rateSource||'Manual','rate source',200)};});
 if(!Array.isArray(value.pos)||value.pos.length>200)fail('Up to 200 POs are supported in this version.');const ids=new Set(),numbers=new Set();s.pos=value.pos.map(p=>{const id=identifier(p.id,'PO ID'),number=str(p.number,'PO number',80);if(ids.has(id)||numbers.has(number))fail('Duplicate PO number.');ids.add(id);numbers.add(number);if(!['draft','confirmed','production','transit','cancelled'].includes(p.status))fail('Invalid PO status.');if(!Array.isArray(p.lines)||!p.lines.length||p.lines.length>100)fail('Add 1–100 PO lines.');const lineIds=new Set();return {id,number,supplier:text(p.supplier).slice(0,160),orderDate:date(p.orderDate,'order date'),status:p.status,lines:p.lines.map(l=>{const lid=identifier(l.id,'line ID');if(lineIds.has(lid))fail('Duplicate PO line.');lineIds.add(lid);const qty=num(l.qty,'ordered quantity',1e8,true);if(qty<1)fail('PO quantity must be positive.');const eta=date(l.eta,'arrival date');if(eta<p.orderDate)fail('Arrival date is before the order date.');if(!Array.isArray(l.receipts)||l.receipts.length>100)fail('Invalid receipts.');const receiptIds=new Set();const receipts=l.receipts.map(r=>{const rid=identifier(r.id,'receipt ID');if(receiptIds.has(rid))fail('Duplicate receipt.');receiptIds.add(rid);const rd=date(r.date,'receipt date'),rq=num(r.qty,'received quantity',1e8,true);if(rd<p.orderDate||rq<1||rd>today())fail('Receipt date or quantity is invalid.');return {id:rid,date:rd,qty:rq};});if(receipts.reduce((n,r)=>n+r.qty,0)>qty)fail('Received quantity exceeds ordered quantity.');return {id:lid,sku:str(l.sku,'SKU'),qty,warehouse:str(l.warehouse,'warehouse'),eta,receipts};})};});
 return s;
}
function received(line){return line.receipts.reduce((n,r)=>n+r.qty,0);}
function remaining(line){return line.qty-received(line);}
function poStatus(p){if(p.status==='cancelled'||p.status==='draft')return p.status;return p.lines.every(l=>remaining(l)===0)?'received':p.lines.some(l=>received(l)>0)?'partially received':p.status;}
function mergeSnapshot(state,snapshot){
 const out=JSON.parse(JSON.stringify(state)),warehouses=[...new Set(snapshot.rows.map(r=>r.warehouse))];out.snapshot=snapshot;
 out.settings.warehouses=out.settings.warehouses.length?out.settings.warehouses.filter(w=>warehouses.includes(w)):warehouses.filter(w=>!/return/i.test(w));
 if(!out.settings.warehouses.length)out.settings.warehouses=warehouses;
 const settings=new Map(out.skus.map(r=>[r.sku,r]));for(const row of snapshot.rows)if(!settings.has(row.sku))settings.set(row.sku,{sku:row.sku,category:category(row.sku),rate:null,offline:0,growth:0,rateSource:'Manual'});out.skus=[...settings.values()];return validate(out);
}
function forecast(state,sku,referenceDate=today()){
 const cfg=state.skus.find(r=>r.sku===sku),settings=state.settings,snapshot=state.snapshot;
 if(!snapshot||!cfg||cfg.rate===null||!settings.warehouses.length)return {sku,available:false,reason:!snapshot?'Upload a stock snapshot':!settings.warehouses.length?'Select a warehouse':'Set daily running rate',days:[]};
 const stockRows=snapshot.rows.filter(r=>r.sku===sku&&settings.warehouses.includes(r.warehouse));if(!stockRows.length)return {sku,available:false,reason:'No stock row in selected warehouses',days:[]};
 const start=snapshot.date,planningDate=referenceDate>start?referenceDate:start,age=Math.round((stamp(planningDate)-stamp(start))/DAY);if(age>365)return {sku,available:false,reason:'Upload a current stock snapshot',days:[]};
 const opening=stockRows.reduce((n,r)=>n+r.onhand,0),reportedIncoming=stockRows.reduce((n,r)=>n+r.incoming,0),events=new Map(),overdue=[],arrivals=[];let pipeline=0;
 const add=(day,qty,label,kind)=>{const v=events.get(day)||{qty:0,labels:[]};v.qty+=qty;v.labels.push({label,qty,kind});events.set(day,v);};
 for(const p of state.pos)for(const l of p.lines){if(l.sku!==sku||!settings.warehouses.includes(l.warehouse))continue;
  // A stock snapshot includes actual receipts on or before its as-of date.
  for(const r of l.receipts)if(r.date>start)add(r.date,r.qty,p.number+' received','actual');
  if(['draft','cancelled'].includes(p.status)||remaining(l)<=0)continue;
  pipeline+=remaining(l);if(l.eta<=planningDate)overdue.push({po:p.number,qty:remaining(l),date:l.eta});else{add(l.eta,remaining(l),p.number,'planned');arrivals.push({po:p.number,qty:remaining(l),date:l.eta});}
 }
 const rate=cfg.rate+cfg.offline,days=[];let balance=opening,firstShortage=null,firstSafety=null,unmet=0;
 // Compute beyond the displayed horizon when needed for a complete replenishment recommendation.
 const length=Math.max(settings.horizon,age+lead[cfg.category]+settings.coverageDays+1);
 for(let i=1;i<=length;i++){
  const d=shift(start,i),demand=rate*Math.pow(1+cfg.growth/100,(i-1)/30),inbound=events.get(d),before=balance+(inbound?.qty||0),net=before-demand;
  const short=settings.demandMode==='backorder'?Math.max(0,demand-Math.max(0,before)):Math.max(0,-net);unmet+=short;
  balance=settings.demandMode==='lost'?Math.max(0,net):net;
  const buffer=demand*settings.safetyDays;if(short>1e-8&&!firstShortage)firstShortage=d;if(balance<buffer-1e-8&&!firstSafety)firstSafety=d;
  days.push({date:d,balance,demand,inbound:inbound?.qty||0,arrivals:inbound?.labels||[],shortage:short,buffer});
 }
 arrivals.sort((a,b)=>a.date.localeCompare(b.date));
 const arrivalIndex=age+lead[cfg.category]-1;let recommendationBalance=arrivalIndex?days[arrivalIndex-1].balance:opening,required=0;
 for(let i=arrivalIndex;i<arrivalIndex+settings.coverageDays;i++){const d=days[i];recommendationBalance+=d.inbound-d.demand;required=Math.max(required,d.buffer-recommendationBalance);}
 const display=days.slice(0,settings.horizon),within=d=>d&&d<=display.at(-1).date;
 return {sku,available:true,opening,rate,pipeline,reportedIncoming,incomingDifference:reportedIncoming-pipeline,nextArrival:arrivals[0]||null,overdue,days:display,firstShortage:within(firstShortage)?firstShortage:null,firstSafety:within(firstSafety)?firstSafety:null,unmet:display.reduce((n,d)=>n+d.shortage,0),endBalance:display.at(-1).balance,recommendation:Math.ceil(Math.max(0,required)),proposedETA:shift(planningDate,lead[cfg.category]),coverageEnd:shift(planningDate,lead[cfg.category]+settings.coverageDays-1),latestOrderDate:(firstSafety||firstShortage)?shift(firstSafety||firstShortage,-lead[cfg.category]):null};
}
function demand(records,end,months=[]){
 const online=records.filter(o=>!o.excluded&&o.platform!=='Manual'&&o.status!=='Platform Processing'&&validDate(o.date)),relevant=online.filter(o=>['Completed','Shipped','To Ship'].includes(o.status));
 const latest=online.reduce((m,o)=>o.date>m?o.date:m,'');end=end||latest;if(!validDate(end))return {end:null,rows:[],coverage:false,months:[]};
 const from=shift(end,-29),map=new Map(),needed=[];for(const o of online)if(o.date<=end)for(const l of o.lines)if(Number.isSafeInteger(l.qty)&&l.qty>=0&&!map.has(l.sku))map.set(l.sku,{sku:l.sku,units7:0,units30:0,daily:new Map()});let m=from.slice(0,7);while(m<=end.slice(0,7)){needed.push(m);const [y,n]=m.split('-').map(Number);m=new Date(Date.UTC(y,n,1)).toISOString().slice(0,7);}
 for(const o of relevant){if(o.date<from||o.date>end)continue;for(const l of o.lines){if(!Number.isSafeInteger(l.qty)||l.qty<0)continue;const v=map.get(l.sku)||{sku:l.sku,units7:0,units30:0,daily:new Map()};v.units30+=l.qty;if(o.date>=shift(end,-6))v.units7+=l.qty;v.daily.set(o.date,(v.daily.get(o.date)||0)+l.qty);map.set(l.sku,v);}}
 return {end,from,latest,coverage:needed.every(m=>months.includes(m)),missingMonths:needed.filter(m=>!months.includes(m)),statsVersion:2,rows:[...map.values()].map(v=>{const days=Array.from({length:30},(_,i)=>v.daily.get(shift(from,i))||0),week=days.slice(-7);return {sku:v.sku,units7:v.units7,units30:v.units30,rate7:v.units7/7,rate30:v.units30/30,min7:Math.min(...week),max7:Math.max(...week),min30:Math.min(...days),max30:Math.max(...days)};})};
}
function applyDemand(state,report,window=30,mode='average'){
 const usable=report?.coverage===true&&validDate(report.end)&&Array.isArray(report.rows),map=new Map(usable?report.rows.map(r=>[r.sku,r]):[]),days=Number(window)===7?7:30,selected=['max','min'].includes(mode)?mode:'average',key=(selected==='average'?'rate':selected)+days;
 return {...state,skus:state.skus.map(c=>{if(!usable)return {...c,rate:null,rateSource:'Sales rate unavailable'};const r=map.get(c.sku);if(r){const rate=r[key];return {...c,rate:Number.isFinite(rate)&&rate>=0?rate:null,rateSource:days+'-day online '+selected+' ending '+report.end};}return {...c,rate:c.rateSource==='Manual'?c.rate:null,rateSource:c.rateSource==='Manual'?'Manual':'No exact sales SKU match'};})};
}
const api={applyDemand,today,shift,validDate,lead,category,empty,validate,parseInventory,mergeSnapshot,received,remaining,poStatus,forecast,demand};root.NKMStock=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
