const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawn}=require('node:child_process'),net=require('node:net'),{JSDOM}=require('../backend/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),{build,pages}=require('../scripts/build-clean-urls.cjs');
test('published clean pages stay in sync with their sources',()=>build({check:true}));
test('old links preserve the query, anchor and history state at the clean address',()=>{
 for(const [old,clean] of [['management.html','management/'],['index.html',''],['advertising.html','advertising/']]){
  const dom=new JSDOM('',{url:'https://nakamaauto.com/'+old+'?embedded=1#health',runScripts:'outside-only'}),w=dom.window;
  w.history.replaceState({retained:true},'');vm.runInContext(fs.readFileSync(path.join(root,'assets/clean-urls.js'),'utf8'),dom.getInternalVMContext());
  assert.equal(w.location.href,'https://nakamaauto.com/'+clean+'?embedded=1#health');assert.equal(w.history.state.retained,true);assert.equal(w.history.length,1);dom.window.close();
 }
});
test('clean routes, direct refreshes, shared page links and upload readers resolve on the local server',async()=>{
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 const server=spawn(process.execPath,['dev-server.cjs','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
  const origin='http://127.0.0.1:'+port;
  for(const page of pages){
   const response=await fetch(origin+'/'+page+'/?test=refresh');assert.equal(response.status,200);
   const doc=new JSDOM(await response.text(),{url:origin+'/'+page+'/'}).window.document;
   for(const node of doc.querySelectorAll('script[src],link[rel=stylesheet]')){
    const resource=node.getAttribute('src')||node.getAttribute('href');assert.ok(resource.startsWith('/'),resource);
    assert.equal((await fetch(new URL(resource,origin))).status,200,resource);
   }
   for(const link of doc.querySelectorAll('a[href]')){
    const href=link.getAttribute('href');if(/^\/(?!\/)/.test(href))assert.ok(!href.includes('.html'),href);
   }
   doc.defaultView.close();
  }
  const redirect=await fetch(origin+'/management?embedded=1',{redirect:'manual'});assert.equal(redirect.status,301);assert.equal(redirect.headers.get('location'),'/management/?embedded=1');
  assert.equal((await fetch(origin+'/management.html')).status,200);
  for(const file of ['import-worker.js','ads-import-worker.js','stock-import-worker.js','data/customer-export-headers.json','data/products.json'])assert.equal((await fetch(origin+'/assets/'+file)).status,200);
 }finally{server.kill();}
});
