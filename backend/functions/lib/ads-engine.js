(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NKMAds=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const measures=['spend','sales','directSales','conversions','directConversions','views','clicks','units','directUnits'];
const headers={spend:'Spend',sales:'Sales Amount',directSales:'Direct Sales Amount',conversions:'Conversion',directConversions:'Direct Conversion',views:'Views',clicks:'Clicks',units:'Sold Products',directUnits:'Directly Sold Products'};
const text=v=>String(v??'').trim();
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
function number(value,label,count=false){const str=typeof value==='number'?String(value):text(value);if(!/^\d+(?:\.\d+)?$/.test(str))throw Error(label+': missing or invalid nonnegative number.');const n=Number(str);if(!Number.isFinite(n)||n>1e12||(count&&!Number.isSafeInteger(n)))throw Error(label+': value is out of range.');return n;}
function parse(rows,name='Advertising export'){
 if(!Array.isArray(rows)||rows.length<3||text(rows[0]?.[0])!=='Shopee Ads Data')throw Error(name+': upload the BigSeller Shopee Ads Overview export.');
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
 const rows=Array.from(records.values()).sort((a,b)=>a.store.localeCompare(b.store)||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));let previous;
 for(const row of rows){if(previous&&previous.store===row.store&&previous.platform===row.platform&&previous.currency===row.currency&&row.from<=previous.to)throw Error(row.store+': '+row.from+' to '+row.to+' overlaps '+previous.from+' to '+previous.to+'. Use non-overlapping exports. A weekly total cannot be combined with daily reports for the same dates.');previous=row;}
 totals(rows);return {rows,added,replaced,duplicates};
}
function totals(rows){const out=Object.fromEntries(measures.map(k=>[k,0]));for(const row of rows)for(const k of measures)out[k]+=row[k];for(const k of measures)if(!Number.isFinite(out[k])||out[k]>Number.MAX_SAFE_INTEGER/100)throw Error('Advertising totals exceed supported numeric limits.');for(const k of ['spend','sales','directSales'])out[k]=Math.round(out[k]*100)/100;return {...out,roas:out.spend?out.sales/out.spend:null,directRoas:out.spend?out.directSales/out.spend:null,cpa:out.conversions?out.spend/out.conversions:null,ctr:out.views?out.clicks/out.views:null,conversionRate:out.clicks?out.conversions/out.clicks:null};}
function select(rows,range,stores=[]){if(!validDate(range?.from)||!validDate(range?.to)||range.from>range.to)throw Error('Choose valid advertising dates.');const filtered=rows.filter(r=>!stores.length||stores.includes(r.store)),included=filtered.filter(r=>r.from>=range.from&&r.to<=range.to),partial=filtered.filter(r=>r.from<=range.to&&r.to>=range.from&&!included.includes(r));return {rows:included,partial,totals:totals(included)};}
function groups(rows){const map=new Map();for(const r of rows){if(!map.has(r.store))map.set(r.store,[]);map.get(r.store).push(r);}return Array.from(map,([store,records])=>({store,...totals(records)})).sort((a,b)=>b.spend-a.spend);}
function daily(rows){const map=new Map();for(const r of rows)if(r.from===r.to){if(!map.has(r.from))map.set(r.from,[]);map.get(r.from).push(r);}return Array.from(map,([date,records])=>({date,stores:records.length,...totals(records)})).sort((a,b)=>a.date.localeCompare(b.date));}
return {parse,merge,totals,select,groups,daily,validDate,key,measures};
});
