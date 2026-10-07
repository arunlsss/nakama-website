'use strict';
const Customer=require('./customer');
const MAX_SKUS=200,MAX_PAIRS=300,round=n=>Math.round(n*100)/100;
const key=(a,b)=>JSON.stringify([a,b].sort());
function validate(args){const filters=Customer.validate(args);if(Number(filters.to.slice(0,4))-Number(filters.from.slice(0,4))>100)throw Error('Choose a date range up to 100 years apart.');return filters;}
function compatibility(a,b){
 if(a.fitment&&b.fitment&&a.fitment!==b.fitment)return 'Different vehicle fitments — review before bundling';
 if(a.category==='Wipers'||b.category==='Wipers')return 'Confirm vehicle, blade size and connector fitment';
 return 'Confirm product compatibility, stock and margin';
}
function summary(records,args){
 const f=validate(args),active=new Set(['Completed','To Ship','Shipped','Unpaid']),status=s=>f.basis==='all'||(f.basis==='completed'?s==='Completed':active.has(s));
 const catalog=new Map(),baskets=[],seen=new Set();let selectedOrders=0,emptyOrders=0,ignoredLines=0,multiSkuOrders=0,firstDate=null,lastDate=null;
 const options={stores:[...new Set(records.filter(o=>!o.excluded&&o.status!=='Platform Processing').map(o=>o.store))].sort().slice(0,500),platforms:[...new Set(records.filter(o=>!o.excluded&&o.status!=='Platform Processing').map(o=>o.platform))].sort().slice(0,100)};
 for(const o of records){
  if(o.excluded||o.status==='Platform Processing'||!status(o.status)||o.date<f.from||o.date>f.to||!(Array.isArray(f.store)?f.store.includes(o.store):f.store==='all'||(f.store==='nakama'?/^NKM_/.test(o.store):o.store===f.store))||(f.platform&&o.platform!==f.platform))continue;
  // Canonical identity is store/marketplace scoped. Count one basket per order, regardless of repeated lines.
  const identity=JSON.stringify([o.store,o.platform,o.key||o.id]);if(seen.has(identity))continue;seen.add(identity);selectedOrders++;
  const basket=new Set();
  for(const l of o.lines||[]){
   if(l.status==='Platform Processing'||!status(l.status||o.status))continue;const sku=String(l.sku||'').trim(),qty=Number(l.qty),price=Number(l.price);
   if(!sku||!Number.isFinite(qty)||qty<=0){ignoredLines++;continue;}
   const category=Customer.category(l),fitment=Customer.fitment(l),r=catalog.get(sku)||{sku,product:String(l.product||sku).slice(0,300),category,orders:0,units:0,pricedUnits:0,value:0,fitments:new Set(),stores:new Set()};
   if(!basket.has(sku))r.orders++;r.units+=qty;
   if(l.price!=null&&Number.isFinite(price)&&price>=0){r.pricedUnits+=qty;r.value+=qty*price;}
   if(fitment)r.fitments.add(fitment.brand+' '+fitment.model);r.stores.add(o.store);catalog.set(sku,r);basket.add(sku);
  }
  if(!basket.size){emptyOrders++;continue;}if(basket.size>1)multiSkuOrders++;baskets.push(basket);
  firstDate=!firstDate||o.date<firstDate?o.date:firstDate;lastDate=!lastDate||o.date>lastDate?o.date:lastDate;
 }
 const products=[...catalog.values()].sort((a,b)=>b.orders-a.orders||a.sku.localeCompare(b.sku)).slice(0,MAX_SKUS).map(({fitments,stores,pricedUnits,value,...r})=>({...r,averagePrice:pricedUnits?round(value/pricedUnits):null,fitment:fitments.size===1?[...fitments][0]:null,stores:[...stores].sort()}));
 const included=new Set(products.map(p=>p.sku)),bySku=new Map(products.map(p=>[p.sku,p])),pairs=new Map();let coveredOrders=0;
 for(const basket of baskets){const skus=[...basket].filter(s=>included.has(s)).sort();if(skus.length)coveredOrders++;for(let i=0;i<skus.length;i++)for(let j=i+1;j<skus.length;j++){const id=key(skus[i],skus[j]);pairs.set(id,(pairs.get(id)||0)+1);}}
 const describe=(a,b,orders=0)=>({id:key(a.sku,b.sku),skus:[a.sku,b.sku],orders,support:baskets.length?orders/baskets.length:0,confidenceA:orders/a.orders,confidenceB:orders/b.orders,lift:orders*baskets.length/(a.orders*b.orders),referencePrice:a.averagePrice!=null&&b.averagePrice!=null?round(a.averagePrice+b.averagePrice):null,compatibility:compatibility(a,b)});
 const ranked=[...pairs].map(([id,orders])=>{const [a,b]=JSON.parse(id);return describe(bySku.get(a),bySku.get(b),orders);}).sort((a,b)=>b.orders-a.orders||b.lift-a.lift||a.id.localeCompare(b.id));
 const ideas=ranked.filter(p=>p.orders>=3&&p.lift>1&&!p.compatibility.startsWith('Different')).slice(0,8).map(p=>({...p,title:'Test a frequently paired bundle',source:'Purchase patterns',reason:`Observed together in ${p.orders} orders. Test whether an offer improves attachment without reducing margin.`}));
 const candidates=products.slice(0,60);
 for(const a of candidates)for(const b of candidates){if(ideas.length>=12||a.sku>=b.sku||!(a.category==='Wipers'&&b.category==='Car care'||b.category==='Wipers'&&a.category==='Car care')||!a.stores.some(s=>b.stores.includes(s)))continue;const id=key(a.sku,b.sku);if(ideas.some(p=>p.id===id))continue;ideas.push({...describe(a,b,pairs.get(id)||0),title:'Wiper + car-care trial',source:'Category opportunity',reason:'Complementary categories sold in the same store. This is an idea to test; demand and compatibility are unverified.'});}
 return {kind:'bundles',version:1,filters:f,options,totals:{orders:baskets.length,selectedOrders,multiSkuOrders,skuCount:catalog.size,pairCount:ranked.length},coverage:{firstDate,lastDate,emptyOrders,ignoredLines,analyzedSkus:products.length,coveredOrders,skuLimit:MAX_SKUS,pairsReturned:Math.min(MAX_PAIRS,ranked.length)},products,pairs:ranked.slice(0,MAX_PAIRS),ideas};
}
// Only the aggregate catalog and pair counts are sent to AI. Customer fields and order identities never enter this payload.
function aiContext(report){const products=report.products.slice(0,60),ids=new Set(products.map(p=>p.sku));return {filters:report.filters,totalBaskets:report.totals.orders,products,pairs:report.pairs.filter(p=>p.skus.every(s=>ids.has(s))).slice(0,60).map(({skus,orders,lift})=>({skus,orders,lift}))};}
function validateIdeas(value,report){
 if(!Array.isArray(value?.ideas)||value.ideas.length>8)throw Error('Invalid AI bundle response.');const catalog=new Map(report.products.slice(0,60).map(p=>[p.sku,p])),used=new Set();
 return value.ideas.map(p=>{if(!Array.isArray(p.skus)||p.skus.length!==2||p.skus[0]===p.skus[1]||p.skus.some(s=>!catalog.has(s))||typeof p.title!=='string'||!p.title.trim()||p.title.length>120||typeof p.reason!=='string'||!p.reason.trim()||p.reason.length>700)throw Error('Invalid AI bundle response.');const id=key(...p.skus);if(used.has(id))throw Error('Duplicate AI bundle.');used.add(id);const [a,b]=p.skus.map(s=>catalog.get(s));if(!a.stores.some(s=>b.stores.includes(s)))throw Error('AI bundle spans unavailable stores.');const pair=report.pairs.find(p=>p.id===id);return {id,skus:p.skus,title:p.title,reason:p.reason,source:'AI idea',orders:pair?.orders??null,compatibility:compatibility(a,b),referencePrice:a.averagePrice!=null&&b.averagePrice!=null?round(a.averagePrice+b.averagePrice):null};});
}
module.exports={validate,summary,aiContext,validateIdeas};
