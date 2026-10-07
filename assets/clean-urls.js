(function(){
 'use strict';
 const pages=['index','about','products','find-wiper','management','stock-forecast','customer-insight','advertising','bundles'];
 const match=location.pathname.match(/^\/([^/]+)\.html$/);
 if(match&&pages.includes(match[1])){
  const path=match[1]==='index'?'/':'/'+match[1]+'/';
  history.replaceState(history.state,'',path+location.search+location.hash);
 }
})();
