const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function cloudHarness(extra={}){
 let observer;const session={},memory={},sdk={initializeApp:()=>({}),initializeAuth:(app,options)=>{sdk.options=options;return {currentUser:null};},browserSessionPersistence:session,inMemoryPersistence:memory,getFunctions:()=>({}),getStorage:()=>({}),getFirestore:()=>({}),onAuthStateChanged:(auth,fn)=>{observer=fn;},httpsCallable:()=>async()=>({data:{role:'viewer',revision:'r1'}}),doc:()=>({}),onSnapshot:()=>()=>{},...extra};
 const ctx=vm.createContext({window:{NKM_CLOUD_CONFIG:{firebase:{projectId:'nakama-sales',apiKey:'public'}}},mockSDK:sdk,sessionStorage:{getItem:()=>{throw Error('Blocked');},setItem:()=>{throw Error('Blocked');},removeItem:()=>{throw Error('Blocked');}}});
 vm.runInContext(read('assets/cloud.js').replace("import * as F from './vendor/firebase-sdk.js?v=glass-20261001';",'const F=mockSDK;').replace(/\bexport /g,''),ctx);
 return {sdk,ctx,session,memory,notify:user=>observer(user)};
}
test('restricted browsers get a memory fallback and pending imports remain recoverable in the open page',async()=>{
 const h=cloudHarness(),states=[];h.ctx.states=states;await vm.runInContext('start(s=>states.push(s),()=>{},()=>{})',h.ctx);
 assert.equal(h.sdk.options.persistence[0],h.session);assert.equal(h.sdk.options.persistence[1],h.memory);
 await h.notify(null);assert.equal(states.at(-1),null);
 vm.runInContext("remember('job1')",h.ctx);assert.equal(vm.runInContext('pendingImport()',h.ctx),'job1');vm.runInContext('remember(null)',h.ctx);assert.equal(vm.runInContext('pendingImport()',h.ctx),null);
});
test('email autofill whitespace is removed but password bytes are preserved',async()=>{
 let received;const h=cloudHarness({signInWithEmailAndPassword:(auth,email,password)=>{received={email,password};return Promise.resolve();}});
 await vm.runInContext('start(()=>{},()=>{},()=>{})',h.ctx);await vm.runInContext("signIn('  user@example.com\u200B  ','  Exact Password!  ')",h.ctx);assert.deepEqual(received,{email:'user@example.com',password:'  Exact Password!  '});
});
test('network failure and workspace rejection are distinguished from rejected credentials',async()=>{
 const h=cloudHarness({httpsCallable:()=>async()=>{throw {code:'functions/permission-denied'};}}),states=[];h.ctx.states=states;await vm.runInContext('start(s=>states.push(s),()=>{},()=>{})',h.ctx);
 await h.notify({uid:'test',getIdToken:async()=>{}});assert.equal(states.at(-1).blocked,true);assert.match(states.at(-1).error,/You signed in.*workspace access/);
 assert.match(vm.runInContext("authError({code:'auth/network-request-failed'})",h.ctx),/connection/);
 assert.doesNotMatch(vm.runInContext("authError({code:'auth/network-request-failed'})",h.ctx),/password/);
 assert.match(vm.runInContext("authError({code:'auth/invalid-credential'})",h.ctx),/email and password were not accepted/);
 assert.match(vm.runInContext("authError({code:'auth/too-many-requests'})",h.ctx),/Wait/);
});
test('sign-in form exposes the password only on request, prevents duplicate submissions and keeps failed credentials for correction',async()=>{
 let resolve;let attempts=0;const h=cloudHarness(),dom=new JSDOM(read('management.html'),{url:'http://localhost/management.html',runScripts:'outside-only'}),w=dom.window,ctx=dom.getInternalVMContext();
 w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addEventListener:()=>{}});
 w.cloudMock={pendingImport:()=>null,signIn:async()=>{attempts++;return new Promise(r=>resolve=r);},authError:e=>vm.runInContext('authError('+JSON.stringify(e)+')',h.ctx)};
 for(const file of ['engine.js','store-labels.js','report.js','charts.js','insights.js','insight-ui.js','theme.js'])vm.runInContext(read('assets/'+file),ctx);
 vm.runInContext(read('assets/management.js').split("import('./cloud.js")[0]+'\ncloud=cloudMock;sessionChanged(null);',ctx);
 const el=id=>w.document.getElementById(id);el('auth-email').value='user@example.com';el('auth-password').value='Secret!';el('auth-show-password').click();assert.equal(el('auth-password').type,'text');el('auth-show-password').click();assert.equal(el('auth-password').type,'password');
 el('auth-form').dispatchEvent(new w.Event('submit',{cancelable:true}));el('auth-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(attempts,1);assert.equal(el('auth-submit').disabled,true);resolve();await new Promise(r=>setTimeout(r,0));
 w.cloudMock.signIn=async()=>{throw {code:'auth/network-request-failed'};};el('auth-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));assert.match(el('auth-error').textContent,/connection/);assert.equal(el('auth-password').value,'Secret!');assert.equal(el('auth-submit').disabled,false);
 assert.equal(el('auth-email').getAttribute('autocapitalize'),'none');dom.window.close();
});
