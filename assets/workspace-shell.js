(function(){
'use strict';
const embedded=new URLSearchParams(location.search).get('embedded')==='1';
document.documentElement.classList.add('auth-pending');
if(embedded&&window.parent!==window){
 try{if(window.parent.location.origin===location.origin&&window.parent.NKMWorkspaceBridge)document.documentElement.dataset.embedded='true';}catch{}
}
function initEmbedded(){
 if(document.documentElement.dataset.embedded!=='true')return;
 const frame=window.frameElement,parent=window.parent;
 const resize=()=>{const main=document.querySelector('main');if(frame&&main){const height=Math.ceil(main.getBoundingClientRect().height)+24,dialog=document.querySelector('dialog[open]'),modalHeight=dialog?parseFloat(dialog.style.top)+parseFloat(dialog.style.maxHeight)+24:0;frame.style.height=Math.max(400,height,modalHeight||0)+'px';}};
 new ResizeObserver(resize).observe(document.querySelector('main'));document.fonts?.ready.then(resize);resize();
 function positionDialog(dialog){dialog.style.position='fixed';dialog.style.margin='0 auto';const frameTop=frame.getBoundingClientRect().top,top=Math.max(16,80-frameTop),dock=parent.document.querySelector('.mobile-nav'),dockTop=dock&&parent.getComputedStyle(dock).display!=='none'?dock.getBoundingClientRect().top:parent.innerHeight,viewportBottom=Math.min(parent.innerHeight,dockTop)-16,height=Math.max(160,viewportBottom-(frameTop+top));dialog.style.top=top+'px';dialog.style.maxHeight=height+'px';frame.style.height=Math.max(parseFloat(frame.style.height)||400,top+height+24)+'px';}
 const modal=HTMLDialogElement.prototype.showModal;
 HTMLDialogElement.prototype.showModal=function(){positionDialog(this);modal.call(this);};
 const move=()=>document.querySelectorAll('dialog[open]').forEach(positionDialog);document.addEventListener('close',resize,true);parent.addEventListener('scroll',move,{passive:true});parent.addEventListener('resize',move);window.addEventListener('pagehide',()=>{parent.removeEventListener('scroll',move);parent.removeEventListener('resize',move);},{once:true});
 document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link||link.getAttribute('href').startsWith('#'))return;const url=new URL(link.href,location.href);if(url.origin!==location.origin)return;const file=url.pathname.split('/').at(-1);let view=file==='management.html'?url.hash.slice(1)||'overview':file==='stock-forecast.html'?'stock':file==='customer-insight.html'?'customers':null;if(view){event.preventDefault();parent.NKMWorkspaceBridge.navigate(view);}});
 const theme=()=>{document.documentElement.dataset.theme=parent.document.documentElement.dataset.theme;document.documentElement.dataset.themeMode=parent.document.documentElement.dataset.themeMode;};
 const themeObserver=new MutationObserver(theme);themeObserver.observe(parent.document.documentElement,{attributes:true,attributeFilter:['data-theme','data-theme-mode']});window.addEventListener('pagehide',()=>themeObserver.disconnect(),{once:true});theme();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initEmbedded,{once:true});else initEmbedded();
window.NKMWorkspace={create({session,allowed,api,navigate}){
 const clients=new Set(),frames=new Map();
 const requireApi=()=>{if(!allowed())throw Error('Workspace access is required.');return api();};
 window.NKMWorkspaceBridge={
  start(onSession,onError,onUpdate){const client={onSession,onUpdate};clients.add(client);Promise.resolve(onSession(session())).catch(onError);return ()=>clients.delete(client);},
  call:(...args)=>requireApi().call(...args),loadMonth:(...args)=>requireApi().loadMonth(...args),
  retrySession:()=>api().retrySession(),signIn:(...args)=>api().signIn(...args),signOut:()=>api().signOut(),
  clearReportCache:()=>requireApi().clearReportCache(),navigate
 };
 return {
  open(view){if(!allowed()||frames.has(view))return;const holder=document.getElementById(view+'-view'),frame=document.createElement('iframe');frame.title=view==='stock'?'Stock Forecast workspace':'Customer Insight workspace';frame.className='workspace-frame';frame.src=(view==='stock'?'stock-forecast.html':'customer-insight.html')+'?embedded=1';holder.replaceChildren(frame);frames.set(view,frame);},
  session(next){for(const client of clients)Promise.resolve(client.onSession(next)).catch(()=>{});if(!next?.user||next.blocked||next.loading){document.querySelectorAll('[data-workspace-dialog]').forEach(dialog=>dialog.remove());for(const [view] of frames)document.getElementById(view+'-view').replaceChildren();frames.clear();clients.clear();}},
  update(){for(const client of clients)client.onUpdate?.();},
  frameCount:()=>frames.size
 };
}};
})();
