(function(root){
'use strict';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currency=new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0});
const compact=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
const label=m=>new Intl.DateTimeFormat('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-01T00:00:00Z'));
function aggregate(months,reports,today=root.NKMReport.today()){
 const imported=[...new Set(months)].filter(m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m)).sort();
 if(!imported.length)return [];
 const keys=root.NKMReport.months({from:imported[0]+'-01',to:root.NKMReport.monthEnd(imported.at(-1))});
 const rows=keys.map(month=>{
  const report=reports.get(month),available=Boolean(report&&!report.failed);
  const gmv=available?root.NKMEngine.filter(report.daily||[],{}).filter(r=>r.date?.slice(0,7)===month).reduce((sum,r)=>sum+Number(r.gmv||0),0):null;
  return {month,gmv,available,imported:imported.includes(month),partial:month===today.slice(0,7)&&today!==root.NKMReport.monthEnd(month)};
 });
 return rows.map((row,i)=>{
  const prior=rows[i-1];let growth=null,reason='No prior month';
  if(!row.available)reason=row.imported?'Report unavailable':'No imported report';
  else if(prior?.available&&prior.gmv>0){growth=(row.gmv-prior.gmv)/prior.gmv*100;reason=(growth>0?'+':'')+growth.toFixed(1)+'%';}
  else if(prior?.available)reason='No baseline';
  else if(prior)reason='Prior unavailable';
  return {...row,growth,growthLabel:reason};
 });
}
function render(el,rows){
 const max=Math.max(1,...rows.filter(r=>r.available).map(r=>r.gmv));
 el.innerHTML=rows.length?'<div class="monthly-gmv-scroll" tabindex="0" role="region" aria-label="Monthly GMV bars. Scroll horizontally for more months."><div class="monthly-gmv-bars" style="--month-count:'+rows.length+'">'+rows.map(r=>{
  const height=Math.max(0,r.gmv||0)/max*190;
  const rateClass=r.growth>0?'positive':r.growth<0?'negative':'neutral';
  const description=label(r.month)+': '+(r.available?currency.format(r.gmv):r.growthLabel)+'. '+(r.growth===null?r.growthLabel:r.growthLabel+' growth versus the previous calendar month')+(r.partial?'. Month to date; compared with a full prior month.':'');
  return '<div class="monthly-gmv-column" tabindex="0" aria-label="'+esc(description)+'" title="'+esc(description)+'" data-month="'+r.month+'" data-gmv="'+(r.gmv??'')+'"><div class="monthly-gmv-plot"><div class="monthly-gmv-top" style="bottom:'+height+'px"><strong class="monthly-gmv-growth '+rateClass+'">'+esc(r.growthLabel)+'</strong><span class="monthly-gmv-value">'+(r.available?'฿'+compact.format(r.gmv):'Unavailable')+'</span></div><div class="monthly-gmv-bar '+(!r.available?'missing':'')+'" style="height:'+height+'px"></div></div><div class="monthly-gmv-month">'+label(r.month)+(r.partial?'<small>Month to date</small>':'')+'</div></div>';
 }).join('')+'</div></div>':'<p class="monthly-gmv-empty">Upload orders to see monthly GMV.</p>';
}
function create(section){
 const chart=section.querySelector('[data-monthly-chart]'),status=section.querySelector('[data-monthly-status]');
 let epoch=0;
 function clear(){epoch++;section.hidden=true;chart.replaceChildren();status.textContent='';section.removeAttribute('aria-busy');}
 async function load(api,state){
  const token=++epoch;section.hidden=false;section.setAttribute('aria-busy','true');chart.replaceChildren();status.textContent='Loading all imported months…';
  const months=[...new Set(state?.months||[])].sort(),reports=new Map();let index=0;
  async function worker(){while(index<months.length&&token===epoch){const month=months[index++];try{const report=await api.loadMonth(state,month,{dailyOnly:true});if(token!==epoch)return;reports.set(month,report);}catch(e){if(token!==epoch)return;reports.set(month,{failed:true});}}}
  await Promise.all(Array.from({length:Math.min(2,months.length)},worker));
  if(token!==epoch)return;
  try{const rows=aggregate(months,reports);render(chart,rows);const failed=months.filter(m=>reports.get(m)?.failed);status.textContent=failed.length?'Some reports could not load: '+failed.join(', ')+'. Tap Refresh to retry.':rows.some(r=>r.partial)?'Growth compares imported month-to-date GMV with the full previous month.':'Growth compares each month with the previous calendar month.';}
  catch(e){status.textContent='Monthly GMV unavailable. Tap Refresh to retry.';}
  section.removeAttribute('aria-busy');
 }
 return {load,clear};
}
root.NKMMonthlyGMV={aggregate,render,create};
})(typeof self!=='undefined'?self:globalThis);
