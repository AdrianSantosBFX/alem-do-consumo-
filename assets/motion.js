import {createPlayback} from './motion-core.mjs';

const root=document.documentElement;
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const toggle=document.querySelector('[data-motion-toggle]');
let paused=false,suspended=false,playback,Motion;
const interactions=new Map();
try{paused=localStorage.getItem('alem-do-consumo:motion')==='off';}catch{}
const enabled=()=>!preference.matches&&!paused&&!suspended&&!document.hidden;
const visible=elements=>[...elements].filter(element=>{const r=element.getBoundingClientRect();return element.isConnected&&r.width>3&&r.height>3;});
const spring={type:'spring',duration:.45,bounce:.22};
const ease=[.22,1,.36,1];

function renderPreference(){
  root.dataset.motion=enabled()?'on':'off';
  if(toggle){toggle.disabled=preference.matches;toggle.setAttribute('aria-pressed',String(preference.matches||paused));toggle.textContent=preference.matches?'Movimento reduzido':paused?'Ativar animações ↗':'Pausar animações Ⅱ';}
  playback?.setEnabled(enabled());
}
function ambient(){
  playback?.clear('ambient');
  if(!enabled()||!playback)return;
  visible(document.querySelectorAll('.card-doodle,.course-sketch')).forEach((element,i)=>{
    playback.run(element,{transform:['translateY(0px) rotate(5deg)','translateY(-4px) rotate(1deg)','translateY(0px) rotate(5deg)']},{duration:4.8+i*.7,repeat:Infinity,ease:'easeInOut',delay:i*.35},{scope:'ambient',hold:true});
  });
}
function reveal(subject,{distance=20,delay=0,duration=.6,scope='entry'}={}){
  if(!enabled()||!playback)return;
  const elements=visible(subject);if(!elements.length)return;
  playback.run(elements,{opacity:[0,1],transform:[`translateY(${distance}px)`,'translateY(0px)']},{duration,delay,ease},{scope});
}
function enterPage(){
  if(!enabled()||!playback)return;
  reveal(document.querySelectorAll('.brand,.site-header nav'),{distance:-8,duration:.45,delay:Motion.stagger(.07)});
  reveal(document.querySelectorAll('.screen-intro>.eyebrow'),{distance:10,duration:.45});
  reveal(document.querySelectorAll('.screen-intro h1'),{distance:26,duration:.72,delay:.05});
  reveal(document.querySelectorAll('.screen-intro .intro-description,.project-more,.preview-note'),{distance:14,delay:Motion.stagger(.07,{startDelay:.16})});
  reveal(document.querySelectorAll('.destination-card,.course-card,#survey-card,.error-screen .button'),{distance:26,delay:Motion.stagger(.1,{startDelay:.12}),duration:.65});
  reveal(document.querySelectorAll('.course-overview li'),{distance:10,duration:.45,delay:Motion.stagger(.07,{startDelay:.3})});
  const underline=document.querySelector('.project-screen h1>span');
  if(underline)playback.run(underline,{'--underline-progress':[0,1]},{delay:.3,duration:.6,ease},{scope:'entry'});
  ambient();
}

// Called after a render; no waiting, cloning of form content or interception of navigation.
export function animateSurvey(card,{direction=1}={}){
  playback?.clear('survey');
  if(Motion)bindInteractions(card);
  if(!enabled()||!playback)return;
  const headline=card.querySelector('h2');
  if(headline)playback.run(headline,{opacity:[.2,1],transform:[`translateX(${direction*14}px)`,'translateX(0px)']},{duration:.32,ease},{scope:'survey'});
  reveal(card.querySelectorAll('.survey-section,.survey-description,.survey-location,.survey-privacy,.survey-consent,.survey-actions'),{distance:8,duration:.28,scope:'survey'});
  const options=visible(card.querySelectorAll('.survey-option'));
  if(options.length)playback.run(options,{opacity:[.3,1],transform:[`translateX(${direction*9}px)`,'translateX(0px)']},{duration:.26,delay:Motion.stagger(.025),ease},{scope:'survey'});
  const mark=card.querySelector('.finish-mark');
  if(mark)playback.run(mark,{opacity:[0,1],transform:['scale(.65) rotate(-12deg)','scale(1) rotate(0deg)']},spring,{scope:'survey'});
}
export function animateSelection(element,{invalid=false}={}){
  playback?.clear('selection');
  if(!enabled()||!playback||!element)return;
  playback.run(element,{transform:invalid?['translateX(0px)','translateX(-4px)','translateX(4px)','translateX(0px)']:['scale(.985)','scale(1)']},{duration:invalid ? .24 : .2,ease},{scope:'selection'});
}
export function animateDialog(dialog){
  playback?.clear('dialog');
  if(!enabled()||!playback)return;
  playback.run(dialog,{opacity:[0,1],transform:['translateY(18px) scale(.98)','translateY(0px) scale(1)']},{duration:.3,ease},{scope:'dialog'});
}

function bindInteractions(container=document){
  for(const [element,cleanup] of interactions)if(!element.isConnected){cleanup();interactions.delete(element);playback.clear(element);}
  for(const element of container.querySelectorAll('.destination-card,.button,.project-more')){
    if(interactions.has(element))continue;
    const scope=element;
    const rest='translateY(0px) scale(1) rotate(0deg)';
    let current=rest;
    function move(transform,hold=false){
      if(!enabled()||element.matches(':disabled'))return;
      playback.clear(scope);
      playback.run(element,{transform:[current,transform]},spring,{scope,hold});
      current=transform;
    }
    let hovering=false,focused=false;
    const settle=()=>move(hovering||focused?(element.matches('.destination-card')?'translateY(-5px) scale(1) rotate(-.5deg)':'translateY(-2px) scale(1) rotate(0deg)'):rest,hovering||focused);
    const stopHover=Motion.hover(element,()=>{hovering=true;settle();return ()=>{hovering=false;settle();};});
    const focus=()=>{focused=element.matches(':focus-visible');settle();};
    const blur=()=>{focused=false;settle();};
    element.addEventListener('focus',focus);element.addEventListener('blur',blur);
    const stopPress=Motion.press(element,()=>{move('translateY(1px) scale(.98) rotate(0deg)',true);return settle;});
    interactions.set(element,()=>{stopHover();stopPress();element.removeEventListener('focus',focus);element.removeEventListener('blur',blur);});
  }
}

toggle?.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('alem-do-consumo:motion',paused?'off':'on');}catch{}renderPreference();ambient();});
preference.addEventListener('change',()=>{renderPreference();ambient();});
document.addEventListener('visibilitychange',()=>{renderPreference();ambient();});
window.addEventListener('pagehide',()=>{suspended=true;renderPreference();});
window.addEventListener('pageshow',()=>{suspended=false;renderPreference();ambient();});
renderPreference();

// The official, pinned browser bundle is copied locally by the build. Failure is cosmetic.
import('./vendor/motion.mjs').then(()=>{
  Motion=globalThis.Motion;
  playback=createPlayback(Motion.animate);
  root.dataset.motionReady='true';
  renderPreference();bindInteractions();enterPage();
}).catch(()=>{
  for(const cleanup of interactions.values())cleanup();interactions.clear();
  playback?.setEnabled(false);playback=undefined;Motion=undefined;
  root.dataset.motionReady='false';
});
