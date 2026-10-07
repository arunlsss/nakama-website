importScripts('vendor/xlsx.full.min.js','shipment-engine.js?v=benchmark-20261007');
self.onmessage=event=>{
 try{
  const {buffer,kind,unit}=event.data,book=XLSX.read(buffer,{type:'array',dense:true,sheetRows:5042});
  const candidates=kind==='catalog'&&book.Sheets['Product Info']?['Product Info']:book.SheetNames;
  const found=[];let lastError;
  for(const name of candidates){
   const sheet=book.Sheets[name],ref=sheet['!fullref']||sheet['!ref'];if(ref&&XLSX.utils.decode_range(ref).e.r>=5041)throw Error('The selected sheet has too many rows.');
   const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:null,raw:true});
   try{found.push(kind==='catalog'?NKMShipment.catalog(rows):NKMShipment.parse(rows,{sheet:name,unit}));}catch(error){lastError=error;}
  }
  if(found.length!==1)throw Error(found.length?'More than one shipment table was found. Upload a workbook with one shipment table.':lastError?.message||'No matching table was found.');
  self.postMessage({result:found[0]});
 }catch(error){self.postMessage({error:error.message});}
};
