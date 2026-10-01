(function (root) {
  'use strict';
  const aliases = {
    id:['order no','order no.','order id','order number','order sn','platform order no','รหัสคำสั่งซื้อ','หมายเลขคำสั่งซื้อ'],
    date:['order time','order date','created time','create time','เวลาสั่งซื้อ','เวลาที่สั่งซื้อ'],
    store:['bigseller store nickname','store code','store name','store','shop name','ชื่อร้านค้า'],
    marketplaceStore:['marketplace store'], platform:['marketplace','platform','แพลตฟอร์ม'],
    status:['order status','status','สถานะคำสั่งซื้อ'], sku:['merchant sku','seller sku','sku','รหัสสินค้าผู้ขาย'],
    product:['product name','item name','ชื่อสินค้า'], price:['price','unit price','ราคา','ราคา(฿)'],
    qty:['quantity','qty','จำนวน'], line:['order item id','line item id','item id'],
    buyer:['username (buyer)','buyer username'],customerCode:['customer code'],
    province:['province (state)','province','state'],country:['country'],variation:['variation name','variation']
  };
  const text=v=>String(v??'').trim();
  const number=v=>{if(typeof v==='number')return Number.isFinite(v)?v:NaN; const s=text(v).replace(/THB|฿|,/gi,'').trim();return s!==''&&/^[-+]?\d+(\.\d+)?$/.test(s)?Number(s):NaN;};
  function date(v){
    if(typeof v==='number') return new Date(Date.UTC(1899,11,30)+Math.floor(v)*86400000).toISOString().slice(0,10);
    if(v instanceof Date) return v.toISOString().slice(0,10);
    const s=text(v), iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/), local=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/), monthName=s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s|$)/);
    const month=monthName?['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthName[2].slice(0,3).toLowerCase())+1:0;
    let key=iso?`${iso[1]}-${iso[2]}-${iso[3]}`:local?`${local[3]}-${local[2].padStart(2,'0')}-${local[1].padStart(2,'0')}`:month?`${monthName[3]}-${String(month).padStart(2,'0')}-${monthName[1].padStart(2,'0')}`:'';
    if(iso&&/[T ]\d.*(?:Z|[+-]\d{2}:?\d{2})$/.test(s)){const d=new Date(s);if(!isNaN(d)){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);key=['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-');}}
    if(!key||isNaN(Date.parse(key+'T00:00:00Z'))||new Date(key+'T00:00:00Z').toISOString().slice(0,10)!==key) return '';
    return key;
  }
  function platform(v){const s=text(v),l=s.toLowerCase();return l.includes('shopee')?'Shopee':l.includes('lazada')?'Lazada':l.includes('tiktok')?'TikTok':l.includes('manual')?'Manual':s;}
  function status(v){const s=text(v),l=s.toLowerCase();return /cancel|ยกเลิก/.test(l)?'Canceled':/refund|return|คืน/.test(l)?'Return & Refund':/unpaid|ยังไม่ชำระ/.test(l)?'Unpaid':/complete|success|สำเร็จ/.test(l)?'Completed':/^to[\s_-]*ship$/.test(l)?'To Ship':/ship|จัดส่ง/.test(l)?'Shipped':/process|ดำเนินการ/.test(l)?'Platform Processing':s;}
  const excludedStatus=v=>status(v)==='Platform Processing';
  const excludedOrder=o=>o?.excluded===true||excludedStatus(o?.status);
  function store(v,p){const s=text(v),l=s.toLowerCase();if(l.includes('chakkawan'))return 'CKW_SHP';if(l.includes('nakama'))return p==='Shopee'?'NKM_SHP':p==='Lazada'?'NKM_LZD':p==='TikTok'?'NKM_TT':s;if(l.includes('oem'))return p==='TikTok'?'OEMP_TT':'OEMP_SHP';if(l.includes('super gloss'))return p==='TikTok'?'SG_TT':'SG_SHP';if(/วันชัย|wanchai/.test(l))return p==='Lazada'?'WCH_LZD':'WCH_SHP';return /manual/.test(l)?'Manual Orders':s;}
  function columns(headers){const h=headers.map(v=>text(v).toLowerCase());return Object.fromEntries(Object.entries(aliases).map(([k,a])=>[k,h.findIndex(x=>a.includes(x))]));}
  const key=parts=>JSON.stringify(parts);
  function aggregate(records){
    const daily=new Map(), skus=new Map();
    function add(map,k,row,id){if(!map.has(k))map.set(k,{...row,gmv:0,units:0,ids:new Set()});const v=map.get(k);v.gmv+=row.gmv;v.units+=row.units;v.ids.add(id);}
    for(const o of records){if(excludedOrder(o))continue;for(const l of o.lines){const row={date:o.date,month:o.date.slice(0,7),store:o.store,marketplaceStore:o.marketplaceStore,platform:o.platform,status:o.status,gmv:l.price*l.qty,units:l.qty};add(daily,key([o.date,o.store,o.platform,o.status]),row,o.key);const sizes=l.sku.match(/(\d+)\s*\/\s*(\d+)/);add(skus,key([row.month,o.store,o.platform,o.status,l.sku,l.product]),{...row,date:row.month+'-01',sku:l.sku,product:l.product,size1:sizes?.[1]||'',size2:sizes?.[2]||''},o.key);}}
    const finish=map=>Array.from(map.values(),v=>{const {ids,...rest}=v;return {...rest,gmv:Math.round(v.gmv*100)/100,orders:ids.size};});
    return {daily:finish(daily),skus:finish(skus)};
  }
  function raw(files,existing=[],enrichment={}){
    // Keep only an identity/status marker for excluded orders. The export timestamp
    // prevents an older completed version from restoring an excluded order.
    const all=new Map(existing.map(o=>[o.key,excludedOrder(o)?{...o,lines:[]}:o]));let invalid=0,duplicates=0,replaced=0,lines=0,older=0,excludedRows=0,platformProcessingRows=0,unpricedToShipRows=0;const errors=[],excludedKeys=new Set();
    const exports=new Map();
    for(const [index,f] of files.entries()){const match=f.name.match(/^Order-SKU-all(\d{17})(?:\((\d+)\))?(?:\(\d+\))?\.(?:xlsx|csv)$/i);const stamp=match?.[1]||'';const batchKey=stamp||'file:'+index;if(!exports.has(batchKey))exports.set(batchKey,{stamp,files:[]});exports.get(batchKey).files.push({...f,part:Number(match?.[2]||0)});}
    const batches=Array.from(exports.values()).sort((a,b)=>a.stamp.localeCompare(b.stamp));
    for(const exportBatch of batches){
      exportBatch.files.sort((a,b)=>a.part-b.part);
      if(exportBatch.stamp&&exportBatch.files.length>1&&(exportBatch.files.some(f=>f.part===0)||new Set(exportBatch.files.map(f=>f.part)).size!==exportBatch.files.length))throw Error(`Export ${exportBatch.stamp}: duplicate or ambiguous parts. Select one copy of each numbered part, or a single complete export.`);
      const parts=exportBatch.files.map(f=>f.part).filter(Boolean);
      if(parts.length&&parts.some((p,i)=>p!==i+1))throw Error(`Export ${exportBatch.stamp}: split parts must start at (1) and be consecutive. Select every part of the export together.`);
      const batch=new Map(),processing=new Map();
      for(const f of exportBatch.files){const c=columns(f.headers);const required=['id','date','store','platform','status','sku','product','price','qty'];const missing=required.filter(k=>c[k]<0);if(missing.length)throw Error(`${f.name}: missing headers ${missing.join(', ')}. Price and Quantity must have named columns.`);
      for(let i=0;i<f.rows.length;i++){const r=f.rows[i];if(!r.some(v=>v!==null&&text(v)!==''))continue;const d=date(r[c.date]),p=platform(r[c.platform]),s=store(r[c.store],p),st=status(r[c.status]),id=text(r[c.id]),price=number(r[c.price]),qty=number(r[c.qty]),sku=text(r[c.sku]);
        const unsafeId=typeof r[c.id]==='number'&&!Number.isSafeInteger(r[c.id]);
        const isProcessing=excludedStatus(st),unpricedTransfer=p==='Shopee'&&st==='To Ship'&&text(r[c.price])==='--',excluded=isProcessing||unpricedTransfer;
        if(!d||!p||!s||!st||!id||unsafeId||(!excluded&&(!sku||!Number.isFinite(price)||price<0||!Number.isInteger(qty)||qty<0))){invalid++;if(errors.length<8){const issues=[];if(!d)issues.push('Order Time is missing or invalid');if(!p)issues.push('Marketplace is missing');if(!s)issues.push('Store is missing');if(!st)issues.push('Order Status is missing');if(!id)issues.push('Order No is missing');if(unsafeId)issues.push('Order No exceeds numeric precision; re-export it as text');if(!excluded){if(!sku)issues.push('Merchant SKU is missing');if(!Number.isFinite(price)||price<0)issues.push(`Price ${JSON.stringify(text(r[c.price]).slice(0,60))} must be a number >= 0`);if(!Number.isInteger(qty)||qty<0)issues.push(`Quantity ${JSON.stringify(text(r[c.qty]).slice(0,60))} must be a whole number >= 0`);}errors.push(`${f.name}, row ${i+2}: ${issues.join('; ')} (status: ${text(r[c.status]).slice(0,60)}).`);}continue;}
        const k=key([p,s,id]),identity={key:k,id,date:d,store:s,marketplaceStore:c.marketplaceStore>=0?text(r[c.marketplaceStore]):s,platform:p,status:st};
        // Warehouse processing rows can coexist with the actual priced sale under
        // the same Order No. They must never participate in sales conflict checks.
        if(excluded){excludedRows++;if(isProcessing)platformProcessingRows++;else unpricedToShipRows++;excludedKeys.add(k);if(!processing.has(k))processing.set(k,{...identity,excluded:true,lines:[]});continue;}
        const customer=enrichment.order?.(r,c,p,s);
        if(!batch.has(k))batch.set(k,{...identity,...(customer?{customer}:{}),lines:[],lineIds:new Set()});const o=batch.get(k);
        if(customer&&o.customer)for(const field of ['buyerHash','province','country']){if(o.customer[field]&&customer[field]&&o.customer[field]!==customer[field])o.customer[field]='';}
        if(o.date!==d||o.status!==st)throw Error(`${f.name}: order ${id} has conflicting dates/statuses within the export. Resolve before importing.`);
        const lineId=c.line>=0?text(r[c.line]):'';if(lineId&&o.lineIds.has(lineId)){duplicates++;continue;}if(lineId)o.lineIds.add(lineId);
        o.lines.push({sku,product:text(r[c.product]),price,qty,...(enrichment.line?.(r,c)||{})});lines++;
      }
      }
      // Only processing-only identities need a marker. A real sale in this same
      // export supplies its own date/status/items, independent of file order.
      const merged=new Map([...processing,...batch]);
      for(const [k,o] of merged){delete o.lineIds;const prior=all.get(k);if(prior?.sourceBatch&&exportBatch.stamp&&prior.sourceBatch>exportBatch.stamp){older++;continue;}if(prior){const content=x=>JSON.stringify({id:x.id,date:x.date,store:x.store,marketplaceStore:x.marketplaceStore,platform:x.platform,status:x.status,lines:x.lines,customer:x.customer});if(content(prior)===content(o)){duplicates++;if(exportBatch.stamp>String(prior.sourceBatch||''))prior.sourceBatch=exportBatch.stamp;continue;}replaced++;}if(exportBatch.stamp)o.sourceBatch=exportBatch.stamp;all.set(k,o);}
    }
    if(older)errors.push(`${older} older order versions were skipped because newer BigSeller exports are already imported.`);
    const records=Array.from(all.values()),orderCount=records.filter(o=>!excludedOrder(o)).length,excludedOrders=[...excludedKeys].filter(k=>excludedOrder(all.get(k))).length;return {mode:'raw',records,orderCount,...aggregate(records),diagnostics:{invalid,duplicates,replaced,older,lines,excludedRows,platformProcessingRows,unpricedToShipRows,excludedOrders,retainedSalesOrders:excludedKeys.size-excludedOrders,errors}};
  }
  function summary(dailyRows,skuRows){
    function parse(rows,sku){if(!rows||rows.length<1)throw Error('Missing DATA Orders summary.');const headers=rows[0].map(v=>text(v).toLowerCase());const idx=s=>headers.indexOf(s);const names=sku?['month key','store code','marketplace','order status','gmv','units','orders','merchant sku','product name']:['date','store code','marketplace','order status','gmv','units','orders'];for(const n of names)if(idx(n)<0)throw Error(`Summary header missing: ${n}`);
      return rows.slice(1).filter(r=>text(r[0])!==''&&!excludedStatus(r[idx('order status')])).map(r=>{let d=date(r[idx(sku?'month key':'date')]);if(!d&&/^\d{4}-\d{2}$/.test(text(r[0])))d=text(r[0])+'-01';const gmv=number(r[idx('gmv')]),units=number(r[idx('units')]),orders=number(r[idx('orders')]);if(!d||!Number.isFinite(gmv)||!Number.isFinite(units)||!Number.isFinite(orders)||!Number.isInteger(orders)||orders<0)throw Error('Invalid date or numeric values in summary.');return {date:d,month:d.slice(0,7),store:text(r[idx('store code')]),marketplaceStore:text(r[idx('marketplace store')]),platform:platform(r[idx('marketplace')]),status:status(r[idx('order status')]),gmv,units,orders,...(sku?{sku:text(r[idx('merchant sku')]),product:text(r[idx('product name')]),size1:text(r[idx('wiper size 1')]),size2:text(r[idx('wiper size 2')])}:{})};});}
    const daily=parse(dailyRows,false),skus=skuRows?parse(skuRows,true):[];const same=daily.filter(r=>r.gmv===r.units).length;const fractional=daily.filter(r=>!Number.isInteger(r.units)).length;
    return {mode:'summary',records:[],daily,skus,diagnostics:{invalid:0,duplicates:0,replaced:0,lines:daily.length,errors:[...(same?[`${same.toLocaleString()} daily rows have GMV equal to Units. Verify raw Price/Quantity mapping before relying on unit totals.`]:[]),...(fractional?[`${fractional.toLocaleString()} daily rows contain fractional Units.`]:[])],sourceUnverified:same>0||fractional>0}};
  }
  function filter(rows,f){return rows.filter(r=>!excludedOrder(r)&&(!f.month||r.month===f.month)&&(!f.store||r.store===f.store)&&(!f.platform||r.platform===f.platform)&&(!f.status||r.status===f.status));}
  function group(rows,field){const map=new Map();for(const r of rows){const label=r[field];if(!map.has(label))map.set(label,{label,gmv:0,units:0,orders:0});const v=map.get(label);for(const n of ['gmv','units','orders'])v[n]+=r[n];}return Array.from(map.values()).sort((a,b)=>b.gmv-a.gmv);}
  const api={raw,summary,aggregate,date,number,filter,group,columns};root.NKMEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
