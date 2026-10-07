const fs=require('node:fs'),crypto=require('node:crypto'),ar=require('node:module').createRequire(require.resolve('../functions/package.json'));
const {initializeApp,applicationDefault}=ar('firebase-admin/app'),{getFirestore,Timestamp}=ar('firebase-admin/firestore');
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
(async()=>{
 const projectId=require('./project.cjs')(arg('--project')),file=arg('--file');if(!file)throw Error('Provide --file with a private Product Info snapshot.');
 const input=JSON.parse(fs.readFileSync(file,'utf8')),products=require('../functions/lib/shipment-reference').validate(input.products);
 if(!input.source?.url?.startsWith('https://docs.google.com/spreadsheets/d/'))throw Error('Provide the verified Product Info source URL.');
 const revision=crypto.createHash('sha256').update(JSON.stringify(products)).digest('hex'),source={title:'[NKM] Pricing Structure 2026',sheet:'Product Info',url:input.source.url};
 if(args.includes('--firebase-login')){
  const cli=require('firebase-tools/lib/auth'),account=cli.getProjectDefaultAccount(process.cwd());
  if(!account?.tokens?.refresh_token)throw Error('Sign in to the Firebase CLI before saving the reference.');
  const token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
  const encode=value=>value===null?{nullValue:null}:Array.isArray(value)?{arrayValue:{values:value.map(encode)}}:typeof value==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]))}}:typeof value==='number'?{doubleValue:value}:{stringValue:value};
  const url='https://firestore.googleapis.com/v1/projects/'+projectId+'/databases/(default)/documents/shipmentReference/main',headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},fields=encode({products,source,revision}).mapValue.fields;
  fields.updatedAt={timestampValue:new Date().toISOString()};
  const written=await fetch(url,{method:'PATCH',headers,body:JSON.stringify({fields})});if(!written.ok)throw Error('Private reference save failed ('+written.status+').');
  const read=await fetch(url,{headers});if(!read.ok)throw Error('Private reference readback failed ('+read.status+').');const saved=await read.json();
  if(saved.fields?.revision?.stringValue!==revision||saved.fields?.products?.arrayValue?.values?.length!==products.length)throw Error('Reference verification failed.');
  console.log('Private Product Info reference verified: '+products.length+' rows.');return;
 }
 initializeApp({projectId,credential:applicationDefault()});const db=getFirestore();
 await db.doc('shipmentReference/main').set({products,source,revision,updatedAt:Timestamp.now()});
 const saved=(await db.doc('shipmentReference/main').get()).data();if(saved.revision!==revision||saved.products.length!==products.length)throw Error('Reference verification failed.');
 console.log('Private Product Info reference verified: '+products.length+' SKUs.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
