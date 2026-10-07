(function(root){
'use strict';
const text=v=>String(v??'').trim(),key=v=>text(v).toLowerCase().replace(/\s+/g,' '),number=v=>{if(v===null||v===undefined||text(v)==='')return null;const n=Number(typeof v==='string'?v.replace(/,/g,'').trim():v);return Number.isFinite(n)?n:null;},positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const volume=box=>[box.width,box.length,box.height].every(positive)?box.width*box.length*box.height/1e6:null;
const money=v=>Math.round((v+Number.EPSILON)*100)/100;
const columns={tracking:['รายการ','tracking','tracking no','tracking number'],extension:['extension','carton','carton no'],qty:['จำนวนกล่อง','cartons','boxes'],width:['กว้าง','width','w'],length:['ยาว','length','depth','d','l'],height:['สูง','height','h'],cbm:['cbm'],rate:['ราคาต่อหน่วย','rate','unit rate'],amount:['จำนวนเงิน','amount'],sku:['sku','parent sku'],kg:['kg','weight (kg)']};
function parse(rows,{sheet='Shipment',unit='cm'}={}){
 if(!['cm','mm','m'].includes(unit))throw Error('Choose cm, mm or m for carton dimensions.');
 const factor={cm:1,mm:0.1,m:100}[unit];let header=-1,index;
 for(let i=0;i<Math.min(rows.length,40);i++){
  const names=rows[i].map(key),found={};for(const [field,aliases] of Object.entries(columns))found[field]=names.findIndex(v=>aliases.includes(v));
  if(['qty','width','length','height','cbm','rate','amount'].every(f=>found[f]>=0)){header=i;index=found;break;}
 }
 if(header<0)throw Error('Shipment columns were not found. Include boxes, width, length, height, CBM, unit rate and amount.');
 const output=[],issues=[];let declaredBoxes=null,invoiceTotal=null,tracking='';
 for(let i=header+1;i<rows.length;i++){
  const cells=rows[i]||[],at=f=>index[f]>=0?cells[index[f]]:null,qty=number(at('qty'));
  if(cells.some(c=>key(c)==='total')&&number(at('amount'))!==null){invoiceTotal=number(at('amount'));continue;}
  if(key(at('tracking'))==='รวม'||key(at('tracking'))==='total'){if(qty!==null)declaredBoxes=qty;continue;}
  const hasDimensions=['width','length','height'].some(f=>number(at(f))!==null),extension=text(at('extension'));
  if(!extension&&!(qty!==null&&hasDimensions))continue;
  if(text(at('tracking')))tracking=text(at('tracking'));
  const row={id:sheet+':'+(i+1),row:i+1,sheet,tracking,extension,qty,width:number(at('width'))===null?null:number(at('width'))*factor,length:number(at('length'))===null?null:number(at('length'))*factor,height:number(at('height'))===null?null:number(at('height'))*factor,cbm:number(at('cbm')),rate:number(at('rate')),amount:number(at('amount')),kg:number(at('kg')),sku:text(at('sku')),issues:[]};
  if(!Number.isInteger(qty)||qty<=0)row.issues.push('Invalid carton count');
  if(volume(row)===null)row.issues.push('Missing or invalid dimensions');
  if(!positive(row.cbm))row.issues.push(row.cbm===null?'Missing CBM; dimensions used':'Invalid CBM');
  if(row.rate===null||row.rate<0)row.issues.push('Invalid unit rate');
  if(row.amount===null||row.amount<0)row.issues.push('Invalid amount');
  const computed=volume(row);if(computed!==null&&positive(row.cbm)&&Math.abs(computed-row.cbm)>0.00050001)row.issues.push('CBM differs from dimensions');
  output.push(row);
 }
 if(!output.length)throw Error('No carton rows were found below the shipment headers.');
 if(output.length>5000)throw Error('Choose a shipment with at most 5,000 carton rows.');
 const boxes=output.reduce((n,r)=>n+(positive(r.qty)?r.qty:0),0);
 if(declaredBoxes!==null&&declaredBoxes!==boxes)issues.push('Carton total differs from the invoice total row');
 const groups=new Map();for(const row of output){const match=row.extension.match(/^(\d+)\s*\/\s*(\d+)$/);if(!match)continue;const g=groups.get(row.tracking)||{indices:new Set(),expected:Number(match[2])};if(g.expected!==Number(match[2])||g.indices.has(Number(match[1]))||Number(match[1])<1||Number(match[1])>g.expected)row.issues.push('Duplicate or inconsistent carton number');g.indices.add(Number(match[1]));groups.set(row.tracking,g);}
 for(const [tracking,g] of groups)if(g.indices.size!==g.expected)issues.push('Missing cartons in '+(tracking||'shipment')+' ('+g.indices.size+'/'+g.expected+')');
 return {rows:output,issues,boxes,declaredBoxes,invoiceTotal,headerRow:header+1,unit};
}
function catalog(rows){
 const header=rows.findIndex(row=>row.map(key).includes('parent sku')&&['w','d','h'].every(v=>row.map(key).includes(v)));
 if(header<0)throw Error('Product Info needs Parent SKU, W, D and H carton columns.');
 const names=rows[header].map(key),get=(row,name)=>row[names.indexOf(name)];
 const value=(row,name)=>{const n=number(get(row,name));return n===0?null:n;};
 const rate=(row,method)=>{const i=names.findIndex(name=>name===method+' freight (thb/m3)'||name===method+' freight (thb/m³)');return i<0?null:number(row[i]);};
 const products=rows.slice(header+1).filter(row=>text(get(row,'parent sku'))).map((row,i)=>({sku:text(get(row,'parent sku')),type:text(get(row,'type')),model:text(get(row,'model')),width:value(row,'w'),length:value(row,'d'),height:value(row,'h'),cbm:value(row,'cbm'),unitsPerBox:value(row,'unit/box'),seaRate:rate(row,'sea'),truckRate:rate(row,'truck'),row:header+i+2}));
 if(!products.length||products.length>2000)throw Error('Product Info needs 1–2,000 products.');
 return products;
}
function compare(row,products,{basis='cbm',freight='uploaded'}={}){
 if(!['sea','truck','uploaded'].includes(freight)||!['cbm','kg','none'].includes(basis))throw Error('Choose a valid freight method and charge basis.');
 const context={freight,basis,referenceRate:null,usedRate:null,rateSource:null};
 const issues=[...row.issues],matches=products.filter(p=>key(p.sku)===key(row.sku));
 if(!text(row.sku))return {...context,row,checked:false,issues:[...issues,'Enter SKU']};
 if(matches.length!==1)return {...context,row,checked:false,issues:[...issues,matches.length?'Duplicate SKU in Product Info':'SKU not found in Product Info']};
 const reference=matches[0];context.referenceRate=freight==='uploaded'?null:reference[freight+'Rate']??null;
 if(volume(reference)===null)return {...context,row,reference,checked:false,issues:[...issues,'Missing or invalid carton dimensions in Product Info']};
 if(volume(row)===null||!Number.isInteger(row.qty)||row.qty<=0||row.cbm!==null&&!positive(row.cbm))return {...context,row,reference,checked:false,issues:[...issues,'Complete valid carton dimensions and quantity first']};
 if(reference.cbm!==null&&reference.cbm!==undefined&&!positive(reference.cbm))return {...context,row,reference,checked:false,issues:[...issues,'Invalid CBM in Product Info']};
 const used={width:Math.min(row.width,reference.width),length:Math.min(row.length,reference.length),height:Math.min(row.height,reference.height)};
 const calculated=volume(used),excelCbm=positive(row.cbm)?row.cbm:volume(row),referenceCbm=positive(reference.cbm)?reference.cbm:volume(reference);
 used.cbm=Math.min(calculated,excelCbm,referenceCbm);used.totalCbm=used.cbm*row.qty;
 const dimensionsCapped=['width','length','height'].filter(f=>used[f]<row[f]);
 if(Math.abs(referenceCbm-volume(reference))>0.00050001)issues.push('Product Info CBM differs from dimensions');
 if(used.cbm<calculated-0.00050001)issues.push('Lower supplied CBM retained');
 let expectedOriginal=null,correctedAmount=null;
 if(positive(row.rate)||row.rate===0){
  if(basis==='cbm')expectedOriginal=money((positive(row.cbm)?row.cbm:Math.round(volume(row)*1000)/1000)*row.qty*row.rate);
  if(basis==='kg'&&positive(row.kg)){expectedOriginal=money(row.kg*row.qty*row.rate);correctedAmount=expectedOriginal;context.usedRate=row.rate;context.rateSource='Uploaded rate';}
 }
 if(basis==='cbm'){
  if(freight==='uploaded'){context.usedRate=positive(row.rate)||row.rate===0?row.rate:null;context.rateSource='Uploaded rate';}
  else{context.rateSource='Product Info '+(freight==='sea'?'Sea':'Truck');context.usedRate=typeof context.referenceRate==='number'&&Number.isFinite(context.referenceRate)&&context.referenceRate>=0?context.referenceRate:null;if(context.usedRate===null)issues.push('Missing or invalid '+(freight==='sea'?'Sea':'Truck')+' freight rate in Product Info');else if(row.rate!==null&&Math.abs(row.rate-context.usedRate)>0.01)issues.push('Uploaded rate differs from '+(freight==='sea'?'Sea':'Truck')+' freight reference');}
  if(context.usedRate!==null)correctedAmount=money(used.totalCbm*context.usedRate);
 }
 if(expectedOriginal!==null&&row.amount!==null&&Math.abs(expectedOriginal-row.amount)>0.02)issues.push('Amount differs from quantity × rate');
 if(basis==='kg'&&!positive(row.kg))issues.push('Missing weight for the kg charge check');
 return {...context,row,reference,used,checked:true,issues,dimensionsCapped,expectedOriginal,correctedAmount,difference:correctedAmount!==null&&row.amount!==null&&row.amount>=0?money(row.amount-correctedAmount):null};
}
function totals(results){
 const checked=results.filter(r=>r.checked),charges=checked.filter(r=>r.difference!==null);
 return {rows:results.length,checked:checked.length,issues:results.filter(r=>r.issues.length).length,boxes:results.reduce((n,r)=>n+(positive(r.row.qty)?r.row.qty:0),0),cbm:checked.reduce((n,r)=>n+r.used.totalCbm,0),amount:results.reduce((n,r)=>n+(r.row.amount>=0?r.row.amount:0),0),correctedAmount:charges.reduce((n,r)=>n+r.correctedAmount,0),difference:charges.reduce((n,r)=>n+r.difference,0),chargeRows:charges.length};
}
function csv(results){
 const header=['Sheet row','Tracking','Carton','SKU','Boxes','Uploaded W cm','Uploaded L cm','Uploaded H cm','Uploaded CBM','Product Info W cm','Product Info D cm','Product Info H cm','Product Info CBM','Chosen W cm','Chosen L cm','Chosen H cm','Chosen CBM','Chosen total CBM','Uploaded kg per carton','Uploaded rate','Uploaded amount THB','Calculated amount THB','Difference THB','Matched','Issues','Freight method','Charge basis','Selected reference rate THB/m3','Used rate','Rate source'];
 const cell=value=>'"'+String(value??'').replace(/^[\s]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 return [header,...results.map(r=>[r.row.row,r.row.tracking,r.row.extension,r.row.sku,r.row.qty,...['width','length','height','cbm'].map(k=>r.row[k]),...['width','length','height','cbm'].map(k=>r.reference?.[k]),...['width','length','height','cbm','totalCbm'].map(k=>r.used?.[k]),r.row.kg,r.row.rate,r.row.amount,r.correctedAmount,r.difference,r.checked?'Yes':'No',r.issues.join('; '),r.freight,r.basis,r.referenceRate,r.usedRate,r.rateSource])].map(row=>row.map(cell).join(',')).join('\r\n');
}
const api={parse,catalog,compare,totals,volume,number,csv};if(typeof module==='object'&&module.exports)module.exports=api;root.NKMShipment=api;
})(typeof window==='object'?window:globalThis);
