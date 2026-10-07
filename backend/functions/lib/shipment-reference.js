'use strict';
function validate(products){
 if(!Array.isArray(products)||!products.length||products.length>2000)throw Error('Product Info needs 1–2,000 products.');
 return products.map(product=>{
  const sku=String(product.sku??'').trim();if(!sku||sku.length>160)throw Error('Missing or invalid Product Info SKU: '+sku);
  const output={sku,type:String(product.type??'').slice(0,160),model:String(product.model??'').slice(0,200)};
  for(const field of ['width','length','height','cbm','unitsPerBox']){const value=product[field]===0?null:product[field]??null;if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)||value<=0))throw Error('Invalid '+field+' for '+sku);output[field]=value;}
  return output;
 });
}
function create({db,member,C}){return {async load(request){
 await member(request);const saved=(await db.doc('shipmentReference/main').get()).data();await member(request);
 if(!saved)C.fail('failed-precondition','Product Info has not been connected. Upload its workbook to check this shipment locally.');
 let products;try{products=validate(saved.products);}catch{C.fail('data-loss','Product Info reference needs repair.');}
 return {products,updatedAt:saved.updatedAt?.toMillis?.()||null,source:{title:saved.source?.title||'Product Info',sheet:'Product Info',url:saved.source?.url||null},revision:saved.revision||null};
 }};}
module.exports=create;module.exports.validate=validate;
