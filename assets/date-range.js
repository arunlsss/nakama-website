(function(root){
'use strict';
const R=root.NKMReport;
const monthNames=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat('en-GB',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,i,1))));
const dateFormat=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const date=s=>new Date(s+'T00:00:00Z');
const monthShift=(m,n)=>new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7))-1+n,1)).toISOString().slice(0,7);
function label(r){
 if(!r)return 'Choose dates';
 const a=date(r.from),b=date(r.to),short=d=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(d);
 if(r.from===r.to)return dateFormat.format(a);
 if(r.from.slice(0,7)===r.to.slice(0,7))return a.getUTCDate()+'–'+dateFormat.format(b);
 return a.getUTCFullYear()===b.getUTCFullYear()?short(a)+' – '+dateFormat.format(b):dateFormat.format(a)+' – '+dateFormat.format(b);
}
function mode(r){if(r.from.slice(0,4)===r.to.slice(0,4)&&r.from.endsWith('-01-01')&&r.to.endsWith('-12-31'))return 'year';if(r.from.slice(0,7)===r.to.slice(0,7)&&R.wholeMonths(r))return 'month';return 'custom';}
function preset(name,today=R.today()){
 if(name==='yesterday')return R.range('yesterday',{},today);
 if(name==='last7'||name==='last30')return {from:R.shift(today,name==='last7'?-6:-29),to:today};
 if(name==='month')return R.range('month',{month:today.slice(0,7)});
 if(name==='year')return R.range('year',{year:today.slice(0,4)});
 return null;
}
const edit=s=>s?s.split('-').reverse().join('/'):'',parse=s=>{if(R.valid(s))return s;const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';};
let sequence=0;
function create(host,{onApply,applyLabel='Apply dates'}={}){
 const uid='nkm-range-'+host.id+'-'+(++sequence),embedded=document.documentElement.dataset.embedded==='true',modalDocument=embedded?root.parent.document:document;
 let committed=null,draft={from:'',to:''},visibleMonth=R.today().slice(0,7),pickingEnd=false,selectedPreset='custom',reportYears=[],focusDay='',disabled=true;
 host.classList.add('date-range-control');
 host.innerHTML=`<span class="date-range-label" id="${uid}-label">Date range</span><button type="button" class="date-range-trigger" aria-labelledby="${uid}-label ${uid}-value" aria-haspopup="dialog" aria-controls="${uid}" aria-expanded="false" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/></svg><b id="${uid}-value">Choose dates</b><span class="date-range-chevron" aria-hidden="true">⌄</span></button>`;
 const trigger=host.querySelector('button'),value=host.querySelector('b'),dialog=modalDocument.createElement('dialog');
 if(embedded){trigger.removeAttribute('aria-controls');dialog.dataset.workspaceDialog='true';root.addEventListener('pagehide',()=>dialog.remove(),{once:true});}
 dialog.id=uid;dialog.className='date-range-dialog';dialog.setAttribute('aria-labelledby',uid+'-title');
 dialog.innerHTML=`<div class="date-range-heading"><div><span class="eyebrow">REPORTING PERIOD</span><h2 id="${uid}-title">Choose a date range</h2></div><button type="button" class="date-range-close" aria-label="Close date picker">×</button></div><div class="date-range-presets" role="group" aria-label="Quick date ranges">${[['yesterday','Yesterday'],['last7','Last 7 days'],['last30','Last 30 days'],['month','This month'],['year','This year'],['custom','Custom']].map(([key,title])=>`<button type="button" data-date-preset="${key}" aria-pressed="false">${title}</button>`).join('')}</div><div class="date-range-inputs"><label>Start date<input data-range-from type="text" inputmode="numeric" placeholder="DD/MM/YYYY" aria-describedby="${uid}-hint" autocomplete="off"></label><label>End date<input data-range-to type="text" inputmode="numeric" placeholder="DD/MM/YYYY" aria-describedby="${uid}-hint" autocomplete="off"></label></div><p id="${uid}-hint" class="date-range-hint">DD/MM/YYYY · Bangkok time</p><div class="date-range-navigation"><button type="button" data-month-prev aria-label="Previous month">‹</button><div><select data-month-select aria-label="Calendar month">${monthNames.map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('')}</select><select data-year-select aria-label="Calendar year"></select></div><button type="button" data-month-next aria-label="Next month">›</button></div><div class="date-range-calendars"></div><p class="date-range-selection" role="status" aria-live="polite"></p><p class="date-range-error" role="alert" hidden></p><div class="date-range-actions"><button type="button" class="secondary" data-range-cancel>Cancel</button><button type="button" class="primary" data-range-apply>${applyLabel}</button></div>`;
 modalDocument.body.append(dialog);
 const from=dialog.querySelector('[data-range-from]'),to=dialog.querySelector('[data-range-to]'),calendars=dialog.querySelector('.date-range-calendars'),status=dialog.querySelector('.date-range-selection'),error=dialog.querySelector('.date-range-error'),apply=dialog.querySelector('[data-range-apply]'),monthSelect=dialog.querySelector('[data-month-select]'),yearSelect=dialog.querySelector('[data-year-select]');
 function validDraft(){return R.valid(draft.from)&&R.valid(draft.to)&&draft.from>= '1900-01-01'&&draft.to<='9998-12-31'&&draft.from<=draft.to&&(Number(draft.to.slice(0,4))-Number(draft.from.slice(0,4)))*12+Number(draft.to.slice(5,7))-Number(draft.from.slice(5,7))<1200;}
 function showError(message=''){error.textContent=message;error.hidden=!message;for(const input of [from,to])input.setAttribute('aria-invalid',String(Boolean(message)));}
 function render({inputs=true}={}){
  if(inputs){from.value=edit(draft.from);to.value=edit(draft.to);}
  const year=Number(visibleMonth.slice(0,4)),now=Number(R.today().slice(0,4)),years=[...new Set([...reportYears,year,now,Number(draft.from.slice(0,4)),Number(draft.to.slice(0,4))].filter(y=>y>=1900&&y<=9998))],lo=Math.max(1900,Math.min(now-10,...years)),hi=Math.min(9998,Math.max(now+5,...years));
  yearSelect.replaceChildren();for(let y=lo;y<=hi;y++){const option=document.createElement('option');option.value=option.textContent=String(y);yearSelect.append(option);}yearSelect.value=String(year);monthSelect.value=visibleMonth.slice(5,7);for(const [i,option] of [...monthSelect.options].entries())option.textContent=root.matchMedia?.('(max-width:600px)').matches?monthNames[i].slice(0,3):monthNames[i];
  dialog.querySelector('[data-month-prev]').disabled=visibleMonth==='1900-01';dialog.querySelector('[data-month-next]').disabled=visibleMonth==='9998-12';
  for(const b of dialog.querySelectorAll('[data-date-preset]'))b.setAttribute('aria-pressed',String(b.dataset.datePreset===selectedPreset));
  const today=R.today();if(!focusDay||focusDay.slice(0,7)!==visibleMonth)focusDay=R.valid(draft.from)&&draft.from.slice(0,7)===visibleMonth?draft.from:visibleMonth+'-01';
  calendars.innerHTML=[visibleMonth,monthShift(visibleMonth,1)].map((month,i)=>{
   const start=month+'-01',offset=(date(start).getUTCDay()+6)%7,last=Number(R.monthEnd(month).slice(8)),monthLabel=monthNames[Number(month.slice(5,7))-1]+' '+month.slice(0,4);
   return `<section class="date-range-month${i?' date-range-next-month':''}" aria-label="${monthLabel}"><h3>${monthLabel}</h3><div class="date-range-weekdays" aria-hidden="true">${['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=>'<span>'+d+'</span>').join('')}</div><div class="date-range-days">${'<span></span>'.repeat(offset)}${Array.from({length:last},(_,n)=>{const s=month+'-'+String(n+1).padStart(2,'0'),endpoint=s===draft.from||s===draft.to,inRange=validDraft()&&s>=draft.from&&s<=draft.to;return `<button type="button" data-date="${s}" class="${endpoint?'range-endpoint ':''}${inRange?'range-selected ':''}${s===today?'range-today':''}" aria-label="${dateFormat.format(date(s))}${s===draft.from?', start date':''}${s===draft.to?', end date':''}" aria-pressed="${inRange}" ${s===today?'aria-current="date"':''} tabindex="${s===focusDay?'0':'-1'}">${n+1}</button>`;}).join('')}</div></section>`;
  }).join('');
  status.textContent=pickingEnd?'Start: '+dateFormat.format(date(draft.from))+'. Choose an end date.':validDraft()?label(draft):'Choose a start date, then an end date.';
  apply.disabled=!validDraft()||pickingEnd;
 }
 function close(){dialog.close();trigger.setAttribute('aria-expanded','false');if(!disabled)trigger.focus();}
 function open(){if(disabled)return;draft=committed?{...committed}:{from:'',to:''};visibleMonth=(draft.from||R.today()).slice(0,7);pickingEnd=false;selectedPreset='custom';focusDay=draft.from||visibleMonth+'-01';showError();render();dialog.showModal();trigger.setAttribute('aria-expanded','true');}
 function choose(s){selectedPreset='custom';showError();focusDay=s;if(!pickingEnd){draft={from:s,to:''};pickingEnd=true;}else{draft={from:s<draft.from?s:draft.from,to:s<draft.from?draft.from:s};pickingEnd=false;}render();calendars.querySelector(`[data-date="${s}"]`)?.focus();}
 trigger.onclick=open;dialog.querySelector('.date-range-close').onclick=dialog.querySelector('[data-range-cancel]').onclick=close;dialog.addEventListener('close',()=>trigger.setAttribute('aria-expanded','false'));dialog.addEventListener('cancel',()=>trigger.setAttribute('aria-expanded','false'));
 for(const b of dialog.querySelectorAll('[data-date-preset]'))b.onclick=()=>{selectedPreset=b.dataset.datePreset;pickingEnd=false;showError();const range=preset(selectedPreset);if(range){draft=range;visibleMonth=draft.from.slice(0,7);focusDay=draft.from;}render();if(!range)from.focus();};
 function move(n){visibleMonth=monthShift(visibleMonth,n);focusDay=visibleMonth+'-01';render();}
 dialog.querySelector('[data-month-prev]').onclick=()=>move(-1);dialog.querySelector('[data-month-next]').onclick=()=>move(1);
 monthSelect.onchange=yearSelect.onchange=()=>{visibleMonth=yearSelect.value+'-'+monthSelect.value;focusDay=visibleMonth+'-01';render();};
 calendars.onclick=e=>{const b=e.target.closest('[data-date]');if(b)choose(b.dataset.date);};
 calendars.onkeydown=e=>{const b=e.target.closest('[data-date]');if(!b)return;const steps={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7},s=b.dataset.date;let next;if(e.key in steps)next=R.shift(s,steps[e.key]);else if(e.key==='Home')next=R.shift(s,-((date(s).getUTCDay()+6)%7));else if(e.key==='End')next=R.shift(s,6-((date(s).getUTCDay()+6)%7));else if(e.key==='PageUp'||e.key==='PageDown'){const m=monthShift(s.slice(0,7),e.key==='PageUp'?-1:1);next=m+'-'+String(Math.min(Number(s.slice(8)),Number(R.monthEnd(m).slice(8)))).padStart(2,'0');}else return;e.preventDefault();if(next<'1900-01-01'||next>'9998-12-31')return;focusDay=next;visibleMonth=next.slice(0,7);render();calendars.querySelector(`[data-date="${next}"]`)?.focus();};
 for(const input of [from,to])input.addEventListener('input',()=>{draft={from:parse(from.value),to:parse(to.value)};pickingEnd=false;selectedPreset='custom';showError(from.value&&to.value&&!validDraft()?'Enter valid dates. The end date must be on or after the start date.':'');if(R.valid(draft.from))visibleMonth=draft.from.slice(0,7);render({inputs:false});});
 for(const input of [from,to])input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!apply.disabled)apply.click();}});
 apply.onclick=()=>{if(!validDraft()||pickingEnd)return;const range={...draft},changed=!committed||range.from!==committed.from||range.to!==committed.to;committed=range;value.textContent=label(range);close();if(changed)onApply?.({...range},mode(range));};
 return {set(range){committed=range?R.range('custom',range):null;value.textContent=label(committed);},setYears(months){reportYears=(months||[]).map(m=>Number(m.slice(0,4)));},disable(value){disabled=Boolean(value);trigger.disabled=disabled;if(disabled&&dialog.open)close();},open,clear(){committed=null;draft={from:'',to:''};value.textContent=label(null);if(dialog.open)close();},get:()=>committed?{...committed}:null};
}
root.NKMDateRange={create,label,preset,mode};
})(typeof self!=='undefined'?self:globalThis);
