(function(root){
'use strict';
let sequence=0;
function create(select,{defaultValue='',modes=[{value:'',label:'All stores'}],maxStores=100}={}){
 const doc=select.ownerDocument,embedded=doc.documentElement.dataset.embedded==='true',modalDoc=embedded?root.parent.document:doc,id='nkm-stores-'+select.id+'-'+(++sequence);
 let selection=defaultValue,draft=new Set(),draftMode=null,disabled=false,applying=false;
 const names=new Map(),mode=v=>modes.find(m=>m.value===v),copy=v=>Array.isArray(v)?[...v]:v;
 const host=doc.createElement('div');host.className='store-picker';select.hidden=true;select.after(host);
 host.innerHTML='<button type="button" class="store-picker-trigger" aria-haspopup="dialog" aria-expanded="false"><span><b></b><small></small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>';
 const trigger=host.querySelector('button'),title=host.querySelector('b'),detail=host.querySelector('small'),dialog=modalDoc.createElement('dialog');
 dialog.id=id;dialog.className='store-picker-dialog';dialog.setAttribute('aria-labelledby',id+'-title');
 if(embedded){dialog.dataset.workspaceDialog='true';root.addEventListener('pagehide',()=>dialog.remove(),{once:true});}else trigger.setAttribute('aria-controls',id);
 dialog.innerHTML='<div class="store-picker-heading"><div><span class="eyebrow">STORE FILTER</span><h2 id="'+id+'-title">Choose stores</h2><p>Select one or several stores to include.</p></div><button type="button" class="store-picker-close" aria-label="Close store picker">×</button></div><label class="store-picker-search">Search stores<input type="search" placeholder="Store name or code" autocomplete="off"></label><div class="store-picker-shortcuts"></div><div class="store-picker-list" role="group" aria-label="Stores"></div><p class="store-picker-count" role="status" aria-live="polite"></p><div class="store-picker-actions"><button type="button" class="secondary" data-store-cancel>Cancel</button><button type="button" class="primary" data-store-apply>Apply stores</button></div>';
 modalDoc.body.append(dialog);
 const search=dialog.querySelector('input'),list=dialog.querySelector('.store-picker-list'),count=dialog.querySelector('.store-picker-count'),apply=dialog.querySelector('[data-store-apply]'),shortcuts=dialog.querySelector('.store-picker-shortcuts');
 const items=()=>[...select.options].filter(o=>!mode(o.value)).map(o=>({value:o.value,label:o.textContent}));
 const expanded=value=>Array.isArray(value)?value:items().filter(o=>value!=='nakama'||/^NKM_/.test(o.value)).map(o=>o.value);
 function update(){
  const selected=Array.isArray(selection)?selection:[],m=mode(selection);
  title.textContent=m?.label||(selected.length===1?names.get(selected[0])||selected[0]:selected.length+' stores selected');
  detail.textContent=selected.length>1?selected.map(v=>names.get(v)||v).join(', '):'';detail.hidden=!detail.textContent;
  trigger.setAttribute('aria-label','Stores: '+title.textContent+(detail.textContent?' · '+detail.textContent:''));trigger.disabled=disabled||(!items().length&&!Array.isArray(selection));
 }
 function rows(){
  list.replaceChildren();const all=new Map(items().map(o=>[o.value,o]));for(const value of draft)if(!all.has(value))all.set(value,{value,label:names.get(value)||value,missing:true});
  const query=search.value.trim().toLowerCase();let shown=0;
  for(const item of all.values()){
   if(query&&!((item.label+' '+item.value).toLowerCase().includes(query)))continue;shown++;
   const label=modalDoc.createElement('label'),input=modalDoc.createElement('input'),text=modalDoc.createElement('span'),name=modalDoc.createElement('b'),code=modalDoc.createElement('small');
   label.className='store-picker-option';input.type='checkbox';input.value=item.value;input.checked=draft.has(item.value);name.textContent=item.label;code.textContent=item.value+(item.missing?' · No orders in the loaded period':'');text.append(name,code);label.append(input,text);list.append(label);
   input.onchange=()=>{draftMode=null;if(input.checked)draft.add(item.value);else draft.delete(item.value);status();};
  }
  if(!shown){const empty=modalDoc.createElement('p');empty.className='store-picker-empty';empty.textContent=query?'No stores match your search.':'No stores are available yet.';list.append(empty);}
  status();
 }
 function status(){count.textContent=draftMode!==null?mode(draftMode).label+' · '+draft.size+' available':draft.size+' '+(draft.size===1?'store':'stores')+' selected';if(draftMode===null&&draft.size>maxStores)count.textContent='Choose up to '+maxStores+' stores. '+draft.size+' selected.';apply.disabled=draftMode===null&&(!draft.size||draft.size>maxStores);for(const button of shortcuts.querySelectorAll('[data-store-mode]'))button.setAttribute('aria-pressed',String(button.dataset.storeMode===draftMode));}
 for(const m of modes){const button=modalDoc.createElement('button');button.type='button';button.className='secondary';button.dataset.storeMode=m.value;button.textContent=m.value==='nakama'?'Nakama stores':'Select all';button.onclick=()=>{draftMode=m.value;draft=new Set(expanded(m.value));rows();};shortcuts.append(button);}
 const clear=modalDoc.createElement('button');clear.type='button';clear.className='secondary';clear.textContent='Clear';clear.dataset.storeClear='';clear.onclick=()=>{draftMode=null;draft.clear();rows();};shortcuts.append(clear);
 function close(){if(dialog.open)dialog.close();trigger.setAttribute('aria-expanded','false');}
 function sync(){for(const o of items())names.set(o.value,o.label);update();if(dialog.open)rows();}
 function set(value,notify=false){selection=Array.isArray(value)||mode(value)?copy(value):[value];select.value=Array.isArray(selection)?selection.length===1?selection[0]:modes[0].value:selection;update();if(notify){applying=true;select.dispatchEvent(new root.Event('change',{bubbles:true}));applying=false;}}
 trigger.onclick=event=>{event.preventDefault();if(trigger.disabled)return;draftMode=Array.isArray(selection)?null:selection;draft=new Set(expanded(selection));search.value='';rows();dialog.showModal();trigger.setAttribute('aria-expanded','true');search.focus();};
 apply.onclick=()=>{if(disabled||apply.disabled)return;const value=draftMode!==null?draftMode:[...draft];close();set(value,true);};
 search.oninput=rows;dialog.querySelector('.store-picker-close').onclick=dialog.querySelector('[data-store-cancel]').onclick=close;dialog.addEventListener('close',()=>trigger.setAttribute('aria-expanded','false'));dialog.addEventListener('cancel',()=>trigger.setAttribute('aria-expanded','false'));
 select.addEventListener('change',()=>{if(!applying){selection=mode(select.value)?select.value:[select.value];sync();}});sync();
 return {value:()=>copy(selection),set,sync,disable(value){disabled=Boolean(value);if(disabled)close();update();},clear(){close();selection=defaultValue;names.clear();search.value='';draft.clear();list.replaceChildren();count.textContent='';sync();}};
}
root.NKMStorePicker={create};
})(typeof window!=='undefined'?window:globalThis);
