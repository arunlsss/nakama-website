import * as F from './vendor/firebase-sdk.js?v=accounts-20261005';
import {mountAuthUI} from './auth-ui.js?v=accounts-20261005';
const config=window.NKM_CLOUD_CONFIG;let auth,functions,storage,stopWatching;
let bridge=null;try{if(new URLSearchParams(window.location?.search||'').get('embedded')==='1'&&window.parent!==window&&window.parent.location.origin===window.location.origin)bridge=window.parent.NKMWorkspaceBridge||null;}catch{}
const reportPromises=new Map();
export function clearReportCache(){if(bridge)return bridge.clearReportCache();reportPromises.clear();}
export async function call(name,data,timeout=70000){
 if(bridge)return bridge.call(name,data,timeout);
 const cacheKey=name==='nkmReportPage'&&auth?.currentUser?auth.currentUser.uid+'|'+JSON.stringify(data):null;
 if(cacheKey&&reportPromises.has(cacheKey))return reportPromises.get(cacheKey);
 const promise=F.httpsCallable(functions,name,{timeout})(data).then(r=>r.data);
 if(cacheKey){if(reportPromises.size>=100)reportPromises.delete(reportPromises.keys().next().value);reportPromises.set(cacheKey,promise);promise.catch(()=>{if(reportPromises.get(cacheKey)===promise)reportPromises.delete(cacheKey);});}
 return promise;
}
const key=()=>`nakama-import:${config.firebase.projectId}:${auth.currentUser.uid}`;
export const configured=Boolean(config?.firebase?.projectId&&config.firebase.apiKey&&!/attendance/i.test(config.firebase.projectId));
export function authError(error,stage='signin'){
 const code=String(error?.code||'');
 const detail=code?` (${code})`:'';
 const network=['auth/network-request-failed','functions/unavailable','functions/deadline-exceeded','unavailable','deadline-exceeded'];
 if(network.includes(code))return 'Could not reach the sign-in or report service. Check your connection, then try again.'+detail;
 if(['auth/too-many-requests','functions/resource-exhausted'].includes(code))return 'Too many attempts. Wait a few minutes before trying again.'+detail;
 if(code==='auth/invalid-email')return 'Enter a valid email address.'+detail;
 if(['auth/invalid-credential','auth/invalid-login-credentials','auth/wrong-password','auth/user-not-found','functions/unauthenticated'].includes(code)&&stage!=='workspace')return 'The User ID or email and password were not accepted. Check your saved login and use Show to check the password.'+detail;
 if(['functions/already-exists','functions/invalid-argument','functions/failed-precondition'].includes(code))return error.message||'Check your account details.';
 if(code==='auth/user-disabled')return 'This account is disabled. Contact your administrator.'+detail;
 if(['auth/web-storage-unsupported','auth/unsupported-persistence-type'].includes(code))return 'This browser is blocking sign-in storage. Open this page directly in Safari or Chrome and try again.'+detail;
 if(['auth/operation-not-allowed','auth/unauthorized-domain','auth/invalid-api-key','auth/app-not-authorized','auth/configuration-not-found'].includes(code))return 'Sign-in configuration needs an administrator to check this website and its Firebase project.'+detail;
 if(stage==='workspace'){
  if(['functions/permission-denied','permission-denied'].includes(code))return 'You signed in, but this account does not have workspace access. Ask your administrator to grant a Nakama role.'+detail;
  if(['functions/unauthenticated','auth/user-token-expired','auth/invalid-user-token'].includes(code))return 'Your sign-in session expired. Sign out, then sign in again.'+detail;
  return 'You signed in, but your reports could not be opened. Try again or contact your administrator.'+detail;
 }
 return 'Sign-in could not finish. Try again, or open this page directly in Safari or Chrome.'+detail;
}
let refreshSession,pendingId=null;
export async function start(onSession,onError,onUpdate){
 if(bridge){const unsubscribe=bridge.start(onSession,onError,onUpdate);window.addEventListener('pagehide',unsubscribe,{once:true});return;}
 const ui=mountAuthUI({signIn,register,signOut,retrySession,accountProfile,linkUserId,verifyEmail,resetPassword,accounts,reviewAccount,authError});
 const receive=onSession;onSession=next=>{const result=receive(next);ui?.session(next);return result;};
 if(!configured){onSession({setup:true});return;}
 const app=F.initializeApp(config.firebase);
 // Prefer this tab's session storage, with an SDK-supported fallback for restricted browsers.
 auth=F.initializeAuth(app,{persistence:[F.browserSessionPersistence,F.inMemoryPersistence]});
 functions=F.getFunctions(app,config.region||'asia-southeast1');storage=F.getStorage(app);const db=F.getFirestore(app);let generation=0;
 refreshSession=async user=>{
  const current=++generation;reportPromises.clear();stopWatching?.();stopWatching=null;onSession({loading:true});
  if(!user){onSession(null);return;}
  try{
   await user.getIdToken(true);const state=await call('nkmWorkspace');if(current!==generation)return;
   onSession({user,role:state.role,state});let observedRevision=state.revision;
   stopWatching=F.onSnapshot(F.doc(db,'workspace/main'),snap=>{if(current!==generation)return;const next=snap.data()?.revision||null;if(next!==observedRevision){observedRevision=next;reportPromises.clear();onUpdate?.();}},e=>{if(current!==generation)return;reportPromises.clear();onSession({blocked:true,user,error:authError(e,'workspace')});onError(e);});
  }catch(e){if(current===generation)onSession({blocked:true,user,error:authError(e,'workspace')});}
 };
 F.onAuthStateChanged(auth,refreshSession);
}
export const retrySession=async()=>{if(bridge)return bridge.retrySession();if(auth.currentUser)await F.reload(auth.currentUser);return refreshSession(auth.currentUser);};
export const signIn=async(identifier,password)=>{if(bridge)return bridge.signIn(identifier,password);const value=String(identifier).replace(/[\u200B-\u200D\uFEFF]/g,'').trim();const email=value.includes('@')?value:(await call('nkmUserLogin',{userId:value,password})).email;return F.signInWithEmailAndPassword(auth,email,password);};
export async function register(userId,email,password){const result=await call('nkmRegister',{userId,email,password});await F.signInWithEmailAndPassword(auth,result.email,password);try{await F.sendEmailVerification(auth.currentUser);}catch(e){return {...result,verificationError:authError(e)};}return result;}
export const accountProfile=()=>call('nkmAccountProfile');
export const linkUserId=userId=>call('nkmLinkUserId',{userId});
export const verifyEmail=()=>F.sendEmailVerification(auth.currentUser);
export const resetPassword=email=>F.sendPasswordResetEmail(auth,String(email).trim());
export const accounts=cursor=>call('nkmAccounts',{cursor:cursor||null});
export const reviewAccount=(uid,action,role)=>call('nkmReviewAccount',{uid,action,role});
export const signOut=async()=>{if(bridge)return bridge.signOut();reportPromises.clear();remember(null);await F.signOut(auth);};
export const workspace=()=>call('nkmWorkspace');
export const customerInsights=args=>call('nkmCustomerInsights',args,560000);
export async function productRows(state,range){
 const rows=[],seen=new Set();let cursor=null,total;
 do{const p=await call('nkmCustomerInsights',{op:'products',revision:state.revision,...range,cursor},560000);
  if(p.version===1&&p.kind!=='products')throw Error('Exact-date product totals need the backend update. Ask your administrator to deploy it, then Refresh.');
  if(p.kind!=='products'||p.revision!==state.revision||p.from!==range.from||p.to!==range.to||!Array.isArray(p.rows)||!Number.isSafeInteger(p.total)||p.total<0)throw Error('Product report changed unexpectedly. Refresh and retry.');
  if(total===undefined)total=p.total;if(total!==p.total)throw Error('Product report changed unexpectedly. Refresh and retry.');rows.push(...p.rows);cursor=p.nextCursor;
  if(cursor&&seen.has(cursor))throw Error('Invalid product pagination. Refresh and retry.');if(cursor)seen.add(cursor);
 }while(cursor);
 if(rows.length!==total)throw Error('Incomplete product report. Refresh and retry.');return rows;
}

export const history=async()=>(await call('nkmHistory')).history;
export async function loadMonth(state,month,options={}){if(bridge)return bridge.loadMonth(state,month,options);if(!state.revision||!state.months.includes(month))throw Error('Choose an available month.');const section=async kind=>{const rows=[];let cursor=null,total;const seen=new Set();do{const p=await call('nkmReportPage',{revision:state.revision,month,kind,cursor});if(p.revision!==state.revision||p.month!==month||p.kind!==kind)throw Error('Report changed unexpectedly. Refresh and retry.');if(total===undefined)total=p.total;rows.push(...p.rows);cursor=p.nextCursor;if(cursor&&seen.has(cursor))throw Error('Invalid report pagination. Refresh and retry.');if(cursor)seen.add(cursor);}while(cursor);if(rows.length!==total)throw Error('Incomplete report. Refresh and retry.');return rows;};const [daily,skus]=await Promise.all([section('daily'),options.dailyOnly?Promise.resolve([]):section('skus')]);return {mode:'raw',records:[],daily,skus,diagnostics:{sourceUnverified:false},revision:state.revision,month};}
export function pendingImport(){try{return sessionStorage.getItem(key())||pendingId;}catch{return pendingId;}}
function remember(id){pendingId=id;try{if(id)sessionStorage.setItem(key(),id);else sessionStorage.removeItem(key());}catch{}}
export async function retryImport(onProgress){const id=pendingImport();if(!id)throw Error('No pending import in this session.');return processImport(id,onProgress);}
async function processImport(id,onProgress){const s=await call('nkmImportStatus',{id});if(s.state==='failed'){remember(null);throw Error(s.error?.message||'Upload corrected files.');}if(s.state==='complete'){remember(null);return s;}onProgress('Calculating and publishing shared reports…');try{const result=await call('nkmProcessImport',{id},560000);remember(null);return result;}catch(e){try{const s=await call('nkmImportStatus',{id});if(s.state==='complete'){remember(null);return s;}if(s.state==='failed'){remember(null);throw Error(s.error?.message||e.message);}}catch(statusError){if(!pendingImport())throw statusError;}throw Error(e.message+' Use “Check pending import” before another upload.');}}
export async function upload(files,onProgress){if(pendingImport())throw Error('Check your pending import first. Sign out and back in to abandon an incomplete upload.');const job=await call('nkmBeginImport',{files:files.map(f=>({name:f.name,size:f.size,lastModified:f.lastModified}))});remember(job.id);try{for(let i=0;i<job.files.length;i++){const item=job.files[i],file=files[Number(item.index)];await new Promise((resolve,reject)=>{const task=F.uploadBytesResumable(F.ref(storage,item.path),file,{contentType:item.contentType});task.on('state_changed',s=>onProgress(`Uploading ${i+1}/${job.files.length}: ${Math.round(s.bytesTransferred/s.totalBytes*100)}%`),reject,resolve);});}}catch(e){throw Error('Upload interrupted: '+e.message+' Sign out and back in, then upload all parts again.');}return processImport(job.id,onProgress);}
export const stockForecast=()=>call('nkmStockForecast',{op:'load'});
export const saveStockForecast=(state,revision)=>call('nkmStockForecast',{op:'save',state,revision});
export const stockDemand=end=>call('nkmStockDemand',{end:end||null},560000);
