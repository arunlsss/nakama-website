'use strict';
const crypto=require('node:crypto');
// All account documents remain private under the existing default-deny rules.
module.exports=function accounts({db,auth,fail,member,apiKey,fetchImpl=fetch,now=Date.now}){
 const clean=value=>String(value||'').trim();
 function userId(value){const id=clean(value).toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(id))fail('invalid-argument','User ID must be 3–32 characters: letters, numbers, periods, underscores or hyphens.');return id;}
 const profileRef=uid=>db.doc('accountProfiles/'+uid),aliasRef=id=>db.doc('userIds/'+id);
 async function authenticated(request){if(!request.auth?.uid)fail('unauthenticated','Sign in first.');const u=await auth.getUser(request.auth.uid);if(u.disabled)fail('permission-denied','This account is disabled.');return u;}
 async function limit(request,operation,id){
  const time=now(),ip=request.rawRequest?.ip||request.rawRequest?.socket?.remoteAddress||'unknown';
  const keys=[['ip:'+ip,30],...(id?[['user:'+id,10]]:[])].map(([key,max])=>[db.doc('accountLimits/'+crypto.createHash('sha256').update(operation+':'+key).digest('hex')),max]);
  await db.runTransaction(async tx=>{const snapshots=await Promise.all(keys.map(([ref])=>tx.get(ref)));for(let i=0;i<keys.length;i++){const d=snapshots[i].data()||{},recent=d.start>time-60000,count=recent?(d.count||0)+1:1;if(count>keys[i][1])fail('resource-exhausted','Too many attempts. Wait a minute and try again.');tx.set(keys[i][0],{start:recent?d.start:time,count});}});
 }
 async function register(request){
  await limit(request,'register');const id=userId(request.data?.userId),email=clean(request.data?.email),password=request.data?.password;
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('invalid-argument','Enter a valid email address from any provider.');
  if(typeof password!=='string'||password.length<8||password.length>128)fail('invalid-argument','Use a password with 8–128 characters.');
  const uid=crypto.randomUUID(),profile=profileRef(uid),alias=aliasRef(id);
  await db.runTransaction(async tx=>{if((await tx.get(alias)).exists)fail('already-exists','That User ID is taken. Choose another.');tx.create(alias,{uid});tx.create(profile,{userId:id,email,status:'pending',verificationRequired:true,registeredAt:now()});});
  try{await auth.createUser({uid,email,password,emailVerified:false});}
  catch(e){await db.runTransaction(async tx=>{const a=await tx.get(alias);if(a.data()?.uid===uid){tx.delete(alias);tx.delete(profile);}});if(e.code==='auth/email-already-exists')fail('already-exists','That email already has an account. Sign in with your email, then choose a User ID in My account.');if(['auth/invalid-email','auth/invalid-password','auth/password-does-not-meet-requirements'].includes(e.code))fail('invalid-argument','Check your email and use a stronger password.');throw e;}
  return {userId:id,email,status:'pending'};
 }
 async function login(request){
  // Do not expose the email behind a User ID before checking its password.
  const id=clean(request.data?.userId).toLowerCase();await limit(request,'login',id.slice(0,32));
  const invalid=()=>fail('unauthenticated','The User ID and password were not accepted.');
  if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(id)||typeof request.data?.password!=='string'||request.data.password.length>128)return invalid();
  const alias=(await aliasRef(id).get()).data();if(!alias?.uid)return invalid();
  const u=await auth.getUser(alias.uid);if(u.disabled||!u.email)return invalid();
  if(!apiKey)fail('failed-precondition','User ID login needs the Nakama web configuration. Email login is still available.');
  let response;try{response=await fetchImpl('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:u.email,password:request.data.password,returnSecureToken:true}),signal:AbortSignal.timeout(15000)});}catch{fail('unavailable','The sign-in service could not be reached. Try again.');}
  if(!response.ok)return invalid();const result=await response.json();let token;try{token=await auth.verifyIdToken(result.idToken);}catch{return invalid();}
  if(token.uid!==u.uid)return invalid();
  // Client signs into Firebase normally, preserving the email/password provider and existing claims.
  return {email:u.email};
 }
 async function profile(request){const u=await authenticated(request),[p,m]=await Promise.all([profileRef(u.uid).get(),db.doc('members/'+u.uid).get()]),d=p.data()||{},role=u.customClaims?.nakamaRole;
  const active=m.data()?.enabled===true&&m.data()?.role===role&&['viewer','importer','admin'].includes(role);
  return {userId:d.userId||null,email:u.email||'',emailVerified:u.emailVerified,status:active?'active':d.status||'access-needed',role:active?role:null};
 }
 async function link(request){const u=await authenticated(request),id=userId(request.data?.userId),profile=profileRef(u.uid),alias=aliasRef(id);await limit(request,'link',u.uid);
  await db.runTransaction(async tx=>{const [p,a]=await Promise.all([tx.get(profile),tx.get(alias)]);if(p.data()?.userId&&p.data().userId!==id)fail('failed-precondition','Your account already has a User ID. Contact your administrator to change it.');if(a.exists&&a.data()?.uid!==u.uid)fail('already-exists','That User ID is taken. Choose another.');tx.set(alias,{uid:u.uid});tx.set(profile,{userId:id,email:u.email,registeredAt:p.data()?.registeredAt||now(),status:p.data()?.status||'access-needed'},{merge:true});});return profileResult(request);
 }
 const profileResult=request=>profile(request);
 async function list(request){await member(request,['admin']);const cursor=request.data?.cursor;if(cursor!==undefined&&cursor!==null&&(typeof cursor!=='string'||!/^[-a-zA-Z0-9]{1,128}$/.test(cursor)))fail('invalid-argument','Invalid account cursor.');let query=db.collection('accountProfiles').orderBy('__name__').limit(51);if(cursor)query=query.startAfter(cursor);const result=await query.get(),docs=result.docs.slice(0,50);
  const users=await Promise.all(docs.map(async doc=>{const [u,m]=await Promise.all([auth.getUser(doc.id).catch(()=>null),db.doc('members/'+doc.id).get()]);if(!u)return null;const p=doc.data(),role=u.customClaims?.nakamaRole,active=m.data()?.enabled===true&&m.data()?.role===role&&['viewer','importer','admin'].includes(role);return {uid:doc.id,userId:p.userId,email:u.email,emailVerified:u.emailVerified,status:active?'active':p.status||'access-needed',role:active?role:null,registeredAt:p.registeredAt};}));await member(request,['admin']);return {users:users.filter(Boolean),nextCursor:result.docs.length>50?docs.at(-1).id:null};
 }
 async function review(request){const actor=await member(request,['admin']),uid=clean(request.data?.uid),action=request.data?.action,role=request.data?.role;
  if(!/^[-a-zA-Z0-9]{1,128}$/.test(uid)||!['approve','reject','disable'].includes(action))fail('invalid-argument','Choose an account and action.');
  if(uid===actor.uid)fail('failed-precondition','You cannot change your own access here.');
  if(action==='approve'&&!['viewer','importer','admin'].includes(role))fail('invalid-argument','Choose Viewer, Importer or Admin.');
  const u=await auth.getUser(uid),p=await profileRef(uid).get();if(!p.exists)fail('not-found','Registration not found.');
  if(action==='approve'&&(!u.emailVerified||u.disabled))fail('failed-precondition',u.disabled?'This Firebase account is disabled.':'The user must verify their email before approval.');
  await member(request,['admin']);await db.doc('members/'+uid).set({enabled:false,role:action==='approve'?role:null});
  const claims={...u.customClaims};if(action==='approve')claims.nakamaRole=role;else delete claims.nakamaRole;await auth.setCustomUserClaims(uid,claims);
  if(action!=='approve')await auth.revokeRefreshTokens(uid);
  await db.runTransaction(async tx=>{const actorMember=await tx.get(db.doc('members/'+actor.uid));if(actorMember.data()?.enabled!==true||actorMember.data()?.role!=='admin')fail('permission-denied','Admin access changed.');tx.set(db.doc('members/'+uid),{enabled:action==='approve',role:action==='approve'?role:null});tx.set(profileRef(uid),{status:action==='approve'?'active':action==='reject'?'rejected':'disabled',reviewedBy:actor.uid,reviewedAt:now()},{merge:true});});
  return {status:action==='approve'?'active':action==='reject'?'rejected':'disabled'};
 }
 return {register,login,profile,link,list,review};
};
