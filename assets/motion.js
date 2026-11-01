'use strict';
(() => {
  const root=document.documentElement,preference=matchMedia('(prefers-reduced-motion: reduce)'),toggle=document.querySelector('[data-motion-toggle]');
  let paused=false;
  try{paused=localStorage.getItem('alem-do-consumo:motion')==='off';}catch{}
  function render(){
    const disabled=preference.matches||paused;
    root.dataset.motion=disabled?'off':'on';
    if(toggle){toggle.disabled=preference.matches;toggle.setAttribute('aria-pressed',String(disabled));toggle.textContent=preference.matches?'Movimento reduzido':paused?'Ativar animações ↗':'Pausar animações Ⅱ';}
  }
  toggle?.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('alem-do-consumo:motion',paused?'off':'on');}catch{}render();});
  preference.addEventListener('change',render);render();
})();
