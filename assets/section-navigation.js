(function(){
 'use strict';
 window.NKMSectionNavigation={create({sections,enabled,onActive}){
  let target=null,timer=null,scheduled=false;
  const nodes=sections.map(section=>({section,node:document.getElementById(section+'-view')}));
  const release=()=>{target=null;clearTimeout(timer);};
  const update=()=>{
   scheduled=false;if(!enabled()||target)return;
   const visible=nodes.filter(({node})=>node&&!node.hidden&&!node.closest('[hidden]'));
   const section=visible.filter(({node})=>node.getBoundingClientRect().top<=120).at(-1)||visible[0];
   if(section)onActive(section.section);
  };
  const schedule=()=>{if(!scheduled){scheduled=true;(window.requestAnimationFrame||window.setTimeout)(update);}};
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('scrollend',()=>{release();schedule();});
  for(const event of ['wheel','touchstart','keydown'])window.addEventListener(event,release,{passive:true});
  return {scroll(section){
   const node=nodes.find(item=>item.section===section)?.node;if(!node)return;
   release();target=section;
   node.scrollIntoView?.({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   // Older browsers have no scrollend event; allow manual scrolling again.
   timer=setTimeout(release,1500);
  },clear:release};
 }};
})();
