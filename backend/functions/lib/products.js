'use strict';
const C=require('./core'),E=require('./engine');
const valid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function validate(value){
 C.uuid(value?.revision);
 if(!valid(value?.from)||!valid(value?.to)||value.from>value.to||Number(value.to.slice(0,4))-Number(value.from.slice(0,4))>100)C.fail('invalid-argument','Choose valid product dates, up to 100 years apart.');
 const page=C.pageArgs({revision:value.revision,month:value.from.slice(0,7),kind:'skus',cursor:value.cursor});
 return {...page,from:value.from,to:value.to};
}
function rows(records,args){
 // Aggregate only selected orders; monthly grouping then preserves unique SKU order counts.
 // The engine emits product totals without buyer hashes, order IDs or customer fields.
 return E.aggregate(records.filter(o=>o.date>=args.from&&o.date<=args.to)).skus.sort((a,b)=>b.gmv-a.gmv||JSON.stringify([a.month,a.store,a.platform,a.status,a.sku,a.product]).localeCompare(JSON.stringify([b.month,b.store,b.platform,b.status,b.sku,b.product])));
}
module.exports={validate,rows};
