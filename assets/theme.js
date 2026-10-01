(function(){
'use strict';
const key='nakama-theme',media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):null;
let mode='auto';try{const saved=localStorage.getItem(key);if(['auto','light','dark'].includes(saved))mode=saved;}catch{}
function apply(){document.documentElement.dataset.theme=mode==='auto'?(media?.matches?'dark':'light'):mode;document.documentElement.dataset.themeMode=mode;for(const b of document.querySelectorAll('[data-theme-mode]'))b.setAttribute('aria-pressed',String(b.dataset.themeMode===mode));}
function bind(){for(const b of document.querySelectorAll('[data-theme-mode]'))b.onclick=()=>{mode=b.dataset.themeMode;try{localStorage.setItem(key,mode);}catch{}apply();};apply();}
apply();media?.addEventListener?.('change',()=>{if(mode==='auto')apply();});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
