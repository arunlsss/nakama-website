const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('../backend/node_modules/jsdom'),root=path.resolve(__dirname,'..');
function harness(){
 const dom=new JSDOM('<div id="picker"></div>',{runScripts:'outside-only'}),w=dom.window,ctx=dom.getInternalVMContext(),calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 for(const file of ['report.js','date-range.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),ctx);
 w.NKMReport.today=()=> '2026-01-03';const picker=w.NKMDateRange.create(w.document.getElementById('picker'),{onApply:(range,mode)=>calls.push({range,mode})});picker.set({from:'2025-12-01',to:'2025-12-31'});picker.disable(false);
 return {dom,w,picker,calls,$:selector=>w.document.querySelector(selector)};
}
test('range selection highlights endpoints and dates between them, then commits only once on Apply',()=>{
 const h=harness(),{$,picker,calls,w}=h;picker.open();$('[data-date="2025-12-28"]').click();a.equal($('[data-range-apply]').disabled,true);a.equal(calls.length,0);$('[data-date="2026-01-03"]').click();a.equal($('[data-date="2025-12-30"]').getAttribute('aria-pressed'),'true');a.equal($('[data-date="2026-01-02"]').getAttribute('aria-pressed'),'true');a.equal($('[data-date="2025-12-27"]').getAttribute('aria-pressed'),'false');a.equal(calls.length,0);$('[data-range-apply]').click();a.equal(calls.length,1);a.equal(calls[0].range.from,'2025-12-28');a.equal(calls[0].range.to,'2026-01-03');a.equal($('dialog').open,false);a.match($('.date-range-trigger').textContent,/28 Dec 2025 – 3 Jan 2026/);
 picker.open();$('[data-range-apply]').click();a.equal(calls.length,1);picker.open();$('[data-date-preset="last7"]').click();$('[data-range-cancel]').click();a.equal(picker.get().from,'2025-12-28');a.equal(calls.length,1);
 picker.open();$('[data-date="2025-12-20"]').click();$('[data-date="2025-12-10"]').click();$('[data-range-apply]').click();a.equal(picker.get().from,'2025-12-10');a.equal(picker.get().to,'2025-12-20');picker.open();picker.disable(true);a.equal($('dialog').open,false);a.equal($('.date-range-trigger').disabled,true);h.dom.window.close();
});
test('presets cross years correctly and month/year selection preserves calendar-period comparisons',()=>{
 const h=harness(),{$,picker,calls}=h;for(const [key,from,to,mode] of [['today','2026-01-03','2026-01-03','custom'],['yesterday','2026-01-02','2026-01-02','custom'],['last7','2025-12-28','2026-01-03','custom'],['last30','2025-12-05','2026-01-03','custom'],['month','2026-01-01','2026-01-31','month'],['year','2026-01-01','2026-12-31','year']]){picker.open();$('[data-date-preset="'+key+'"]').click();a.equal(calls.length,['today','yesterday','last7','last30','month','year'].indexOf(key));$('[data-range-apply]').click();a.equal(picker.get().from,from);a.equal(picker.get().to,to);a.equal(calls.at(-1).mode,mode);}h.dom.window.close();
});
test('typed dates reject impossible days, reversed ranges and excessive ranges without changing applied dates',()=>{
 const h=harness(),{$,picker,calls,w}=h;picker.open();function type(selector,value){$(selector).value=value;$(selector).dispatchEvent(new w.Event('input'));}
 for(const [from,to] of [['29/02/2026','01/03/2026'],['31/04/2026','01/05/2026'],['10/01/2026','09/01/2026'],['01/01/1800','01/01/1801'],['01/01/1900','01/01/2000']]){type('[data-range-from]',from);type('[data-range-to]',to);a.equal($('[data-range-apply]').disabled,true);$('[data-range-apply]').click();a.equal(calls.length,0);}
 type('[data-range-from]','29/02/2024');type('[data-range-to]','01/03/2024');a.equal($('[data-range-apply]').disabled,false);$('[data-range-apply]').click();a.equal(picker.get().from,'2024-02-29');a.equal(picker.get().to,'2024-03-01');h.dom.window.close();
});
test('keyboard arrows cross months and month/year navigation never applies a new range',()=>{
 const h=harness(),{$,picker,calls,w}=h;picker.open();const day=$('[data-date="2025-12-31"]');day.focus();day.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));a.equal(w.document.activeElement.dataset.date,'2026-01-01');a.equal($('[data-month-select]').value,'01');a.equal($('[data-year-select]').value,'2026');$('[data-month-prev]').click();a.equal($('[data-month-select]').value,'12');a.equal($('[data-year-select]').value,'2025');$('[data-year-select]').value='2024';$('[data-year-select]').dispatchEvent(new w.Event('change'));a.equal($('[data-month-select]').value,'12');a.equal(calls.length,0);a.equal(picker.get().from,'2025-12-01');h.dom.window.close();
});
