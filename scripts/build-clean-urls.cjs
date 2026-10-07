const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const pages=['about','products','find-wiper','management','stock-forecast','customer-insight','advertising','bundles','shipment-check'];
function build({check=false}={}){
 for(const page of pages){
  const source=fs.readFileSync(path.join(root,page+'.html'),'utf8');
  const output=path.join(root,page,'index.html');
  if(check){if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==source)throw Error('Run npm run build:urls before publishing: '+page);}
  else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,source);}
 }
}
if(require.main===module)build({check:process.argv.includes('--check')});
module.exports={build,pages};
