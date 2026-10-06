(function(root){
'use strict';
const DAY=86400000,iso=d=>d.toISOString().slice(0,10),stamp=s=>Date.parse(s+'T00:00:00Z');
const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(stamp(s))&&iso(new Date(stamp(s)))===s;
const shift=(s,n)=>iso(new Date(stamp(s)+n*DAY));
const monthEnd=m=>iso(new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0)));
const today=(now=new Date())=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-');};
function range(mode,v={},day=today()){
 let from,to;
 if(mode==='yesterday')from=to=shift(day,-1);
 else if(mode==='month'){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.month||''))throw Error('Choose a month.');from=v.month+'-01';to=monthEnd(v.month);}
 else if(mode==='year'){if(!/^\d{4}$/.test(v.year||'')||Number(v.year)<1900)throw Error('Choose a year.');from=v.year+'-01-01';to=v.year+'-12-31';}
 else {from=v.from;to=v.to;}
 if(!valid(from)||!valid(to)||from>to)throw Error('Choose valid dates, with the end date on or after the start date.');
 return {from,to};
}
function previous(r,mode){if(mode==='month'){const m=shift(r.from,-1).slice(0,7);return {from:m+'-01',to:monthEnd(m)};}if(mode==='year'){const y=Number(r.from.slice(0,4))-1;return {from:y+'-01-01',to:y+'-12-31'};}const days=Math.round((stamp(r.to)-stamp(r.from))/DAY)+1;return {from:shift(r.from,-days),to:shift(r.from,-1)};}
function months(r){let m=r.from.slice(0,7),end=r.to.slice(0,7),out=[];while(m<=end){out.push(m);m=shift(monthEnd(m),1).slice(0,7);if(out.length>1200)throw Error('Choose a date range of 100 years or less.');}return out;}
const wholeMonths=r=>r.from.endsWith('-01')&&r.to===monthEnd(r.to.slice(0,7));
const storeMatch=(value,store)=>Array.isArray(value)?value.includes(store):!value||value===store;
const selectStores=(rows,value)=>rows.filter(row=>storeMatch(value,row.store));
const select=(rows,r,f={})=>rows.filter(x=>x.date>=r.from&&x.date<=r.to&&storeMatch(f.store,x.store)&&(!f.platform||x.platform===f.platform)&&(!f.status||x.status===f.status));
const totals=rows=>rows.reduce((a,r)=>({gmv:a.gmv+r.gmv,orders:a.orders+r.orders,units:a.units+r.units}),{gmv:0,orders:0,units:0});
function change(current,prior,available){if(!available)return {text:'Prior period unavailable',kind:'neutral'};if(prior===0)return {text:current===0?'No change':'No prior sales baseline',kind:'neutral'};const p=(current-prior)/prior*100;return {text:`${p>0?'+':''}${p.toFixed(1)}% vs prior period`,kind:p>0?'up':p<0?'down':'neutral'};}
function series(rows,r,metric='gmv',grain){grain??=(stamp(r.to)-stamp(r.from))/DAY>62?'month':'day';const map=new Map();for(const x of rows){const k=grain==='month'?x.date.slice(0,7):x.date;map.set(k,(map.get(k)||0)+x[metric]);}const keys=grain==='month'?months(r):Array.from({length:Math.round((stamp(r.to)-stamp(r.from))/DAY)+1},(_,i)=>shift(r.from,i));return keys.map(label=>({label,value:map.get(label)||0}));}
const api={today,range,previous,months,wholeMonths,select,totals,change,series,shift,monthEnd,valid,selectStores};root.NKMReport=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
