const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('../backend/node_modules/jsdom');
test('manual scrolling highlights the visible section; smooth jumps keep their destination until complete',()=>{
 const dom=new JSDOM('<section id="summary-view"></section><section id="overview-view"></section><section id="customers-view"></section>',{runScripts:'outside-only'}),w=dom.window;
 let tops=[-100,70,900],active=[],scrolls=[],enabled=true;w.requestAnimationFrame=fn=>fn();w.matchMedia=()=>({matches:false});
 ['summary','overview','customers'].forEach((section,i)=>{const node=w.document.getElementById(section+'-view');node.getBoundingClientRect=()=>({top:tops[i]});node.scrollIntoView=args=>scrolls.push({section,...args});});
 vm.runInContext(fs.readFileSync(require.resolve('../assets/section-navigation.js'),'utf8'),dom.getInternalVMContext());
 const navigation=w.NKMSectionNavigation.create({sections:['summary','overview','customers'],enabled:()=>enabled,onActive:section=>active.push(section)});
 w.dispatchEvent(new w.Event('scroll'));assert.equal(active.at(-1),'overview');
 navigation.scroll('customers');assert.equal(scrolls.at(-1).behavior,'smooth');w.dispatchEvent(new w.Event('scroll'));assert.equal(active.length,1);
 tops=[-1800,-1500,24];w.dispatchEvent(new w.Event('scrollend'));assert.equal(active.at(-1),'customers');
 enabled=false;tops=[24,500,1500];w.dispatchEvent(new w.Event('scroll'));assert.equal(active.at(-1),'customers');
 w.matchMedia=()=>({matches:true});navigation.scroll('summary');assert.equal(scrolls.at(-1).behavior,'instant');navigation.clear();dom.window.close();
});
