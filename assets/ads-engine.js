(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NKMAds=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const measures=['spend','sales','directSales','conversions','directConversions','views','clicks','units','directUnits'];
const headers={spend:'Spend',sales:'Sales Amount',directSales:'Direct Sales Amount',conversions:'Conversion',directConversions:'Direct Conversion',views:'Views',clicks:'Clicks',units:'Sold Products',directUnits:'Directly Sold Products'};
const text=v=>String(v??'').trim();
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
function number(value,label,count=false){const str=typeof value==='number'?String(value):text(value);if(!/^\d+(?:\.\d+)?$/.test(str))throw Error(label+': missing or invalid nonnegative number.');const n=Number(str);if(!Number.isFinite(n)||n>1e12||(count&&!Number.isSafeInteger(n)))throw Error(label+': value is out of range.');return n;}
const validStore=v=>typeof v==='string'&&text(v).length>0&&text(v).length<=160&&!/[\x00-\x1f]/.test(v);
function parseTikTok(rows,name,options){
 const store=text(options?.tiktokStore);if(!validStore(store))throw Error(name+': choose the TikTok store before selecting files.');
 const aliases={date:['ตามวัน','By day','Day','Date'],spend:['ต้นทุน','Cost'],conversions:['คำสั่งซื้อ SKU (ร้านค้าปัจจุบัน)','Orders (SKU) (Current shop)','Orders (SKU)'],sales:['รายได้ขั้นต้น (ร้านค้าปัจจุบัน)','Gross revenue (Current shop)','Gross revenue'],currency:['สกุลเงิน','Currency']},head=rows[0].map(text),columns={};
 for(const [key,names] of Object.entries(aliases)){const matches=head.map((h,i)=>names.includes(h)?i:-1).filter(i=>i>=0);if(matches.length!==1)throw Error(name+': missing or repeated TikTok '+key+' column.');columns[key]=matches[0];}
 const result=[],seen=new Set();for(let i=1;i<rows.length;i++){const row=rows[i];if(row.every(v=>text(v)===''))continue;const raw=text(row[columns.date]);if(['-','Total','Summary'].includes(raw)){if(rows.slice(i+1).some(r=>r.some(v=>text(v)!=='')))throw Error(name+': TikTok total row must be last.');continue;}const match=raw.match(/^(\d{4}-\d{2}-\d{2})(?: 00:00:00)?$/),date=match?.[1];if(!validDate(date))throw Error(name+', row '+(i+1)+': invalid daily date. Export TikTok GMV Max by day.');if(seen.has(date))throw Error(name+': repeated daily date '+date+'.');seen.add(date);if(text(row[columns.currency])!=='THB')throw Error(name+': export in THB.');
  const record={store,platform:'TikTok',currency:'THB',from:date,to:date,file:name,...Object.fromEntries(measures.map(k=>[k,null]))};for(const key of ['spend','sales','conversions'])record[key]=number(row[columns[key]],name+', row '+(i+1)+' '+key,key==='conversions');result.push(record);
 }if(!result.length)throw Error(name+': no daily TikTok records.');return result;
}
function parse(rows,name='Advertising export',options={}){
 if(!Array.isArray(rows)||rows.length<2)throw Error(name+': no advertising data.');
 if(text(rows[0]?.[0])!=='Shopee Ads Data')return parseTikTok(rows,name,options);
 const metadata=rows[0].map(text),period=metadata.find(v=>/^Time:/.test(v))?.match(/^Time:\s*(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/),currency=metadata.find(v=>/^Currency:/.test(v))?.match(/^Currency:\s*([A-Z]{3})$/)?.[1];
 if(!period||!validDate(period[1])||!validDate(period[2])||period[1]>period[2])throw Error(name+': reporting dates are missing or invalid.');
 if(currency!=='THB')throw Error(name+': export in THB. Other currencies cannot be combined with Nakama reports.');
 const head=rows[1].map(text),columns={};for(const h of ['BigSeller Store Name',...Object.values(headers)]){if(head.filter(v=>v===h).length!==1)throw Error(name+': missing or repeated '+h+' column.');columns[h]=head.indexOf(h);}
 const result=[],seen=new Set();
 for(let i=2;i<rows.length;i++){const row=rows[i];if(row.every(v=>v===null||v===undefined||text(v)===''))continue;const store=text(row[columns['BigSeller Store Name']]);if(store==='Summary')continue;
  if(!store||store.length>160||/[\x00-\x1f]/.test(store))throw Error(name+', row '+(i+1)+': invalid store name.');if(seen.has(store))throw Error(name+': repeated store '+store+'.');seen.add(store);
  const record={store,platform:'Shopee',currency,from:period[1],to:period[2],file:name};for(const key of measures)record[key]=number(row[columns[headers[key]]],name+', row '+(i+1)+' '+headers[key],!['spend','sales','directSales'].includes(key));result.push(record);
 }
 if(!result.length)throw Error(name+': no store records.');return result;
}
const key=r=>JSON.stringify([r.platform,r.currency,r.store,r.from,r.to]);
const same=(a,b)=>measures.every(k=>a[k]===b[k]);
function merge(existing,incoming){
 const batch=new Map();let duplicates=0,added=0,replaced=0;
 for(const row of incoming){const k=key(row),other=batch.get(k);if(other&&!same(other,row))throw Error('Two selected files disagree for '+row.store+' ('+row.from+' to '+row.to+'). Import the latest report separately.');if(other)duplicates++;else batch.set(k,row);}
 const records=new Map(existing.map(r=>[key(r),r]));for(const [k,row] of batch){const other=records.get(k);if(other){if(same(other,row))duplicates++;else{records.set(k,row);replaced++;}}else{records.set(k,row);added++;}}
 const rows=Array.from(records.values()).sort((a,b)=>identity(a).localeCompare(identity(b))||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));let previous,group;
 // A daily row can coexist with a containing period total. Two period totals cannot overlap.
 for(const row of rows){if(identity(row)!==group){group=identity(row);previous=null;}if(row.from===row.to)continue;if(previous&&row.from<=previous.to)throw Error(row.store+': '+row.from+' to '+row.to+' overlaps '+previous.from+' to '+previous.to+'. Use daily exports or non-overlapping period totals.');previous=row;}
 totals(rows);return {rows,added,replaced,duplicates};
}
function totals(rows){const out=Object.fromEntries(measures.map(k=>[k,0]));for(const row of rows)for(const k of measures){if(row[k]===null){out[k]=null;continue;}if(!Number.isFinite(row[k])||row[k]<0)throw Error('Invalid advertising metric: '+k+'.');if(out[k]!==null)out[k]+=row[k];}for(const k of measures)if(out[k]!==null&&(!Number.isFinite(out[k])||out[k]>Number.MAX_SAFE_INTEGER/100))throw Error('Advertising totals exceed supported numeric limits.');for(const k of ['spend','sales','directSales'])if(out[k]!==null)out[k]=Math.round(out[k]*100)/100;return {...out,roas:out.spend&&out.sales!==null?out.sales/out.spend:null,directRoas:out.spend&&out.directSales!==null?out.directSales/out.spend:null,cpa:out.conversions&&out.spend!==null?out.spend/out.conversions:null,ctr:out.views&&out.clicks!==null?out.clicks/out.views:null,conversionRate:out.clicks&&out.conversions!==null?out.conversions/out.clicks:null};}
const identity=r=>JSON.stringify([r.platform,r.currency,r.store]);
function dayBoundary(rows,date,after=false){let low=0,high=rows.length;while(low<high){const mid=(low+high)>>>1;if(rows[mid].from<date||(after&&rows[mid].from===date))low=mid+1;else high=mid;}return low;}
function select(rows,range,stores=[],platform='All'){
 if(!validDate(range?.from)||!validDate(range?.to)||range.from>range.to)throw Error('Choose valid advertising dates.');const filtered=rows.filter(r=>(!stores.length||stores.includes(r.store))&&(platform==='All'||r.platform===platform)),candidates=filtered.filter(r=>r.from>=range.from&&r.to<=range.to),partial=filtered.filter(r=>r.from<=range.to&&r.to>=range.from&&(r.from<range.from||r.to>range.to)),dailyRows=candidates.filter(r=>r.from===r.to),byStore=new Map(),excluded=new Set();
 for(const r of dailyRows){const id=identity(r);if(!byStore.has(id))byStore.set(id,[]);byStore.get(id).push(r);}
 for(const days of byStore.values())days.sort((a,b)=>a.from.localeCompare(b.from));
 for(const period of candidates.filter(r=>r.from!==r.to)){const storeDays=byStore.get(identity(period))||[],days=storeDays.slice(dayBoundary(storeDays,period.from),dayBoundary(storeDays,period.to,true)),expected=(Date.parse(period.to)-Date.parse(period.from))/86400000+1;if(new Set(days.map(r=>r.from)).size===expected)excluded.add(period);else for(const day of days)excluded.add(day);}
 const included=candidates.filter(r=>!excluded.has(r));return {rows:included,partial,dailyRows,shadowed:candidates.filter(r=>excluded.has(r)),totals:totals(included)};
}
function groups(rows){const map=new Map();for(const r of rows){const id=identity(r);if(!map.has(id))map.set(id,[]);map.get(id).push(r);}return Array.from(map.values(),records=>({store:records[0].store,platform:records[0].platform,...totals(records)})).sort((a,b)=>b.spend-a.spend);}
function daily(rows){const map=new Map();for(const r of rows)if(r.from===r.to){if(!map.has(r.from))map.set(r.from,[]);map.get(r.from).push(r);}return Array.from(map,([date,records])=>({date,stores:records.length,platformCounts:Object.fromEntries([...new Set(records.map(r=>r.platform))].map(p=>[p,totals(records.filter(r=>r.platform===p)).conversions])),...totals(records)})).sort((a,b)=>a.date.localeCompare(b.date));}
return {parse,merge,totals,select,groups,daily,validDate,validStore,key,measures};
});
