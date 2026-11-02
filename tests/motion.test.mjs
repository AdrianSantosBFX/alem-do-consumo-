import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {readFile,access} from 'node:fs/promises';
import {createPlayback} from '../assets/motion-core.mjs';

function setup(){
  const controls=[];
  const element=()=>{
    const values=new Map();
    return {style:{getPropertyValue:key=>values.get(key)||'',setProperty:(key,value)=>values.set(key,value),removeProperty:key=>values.delete(key)}};
  };
  const playback=createPlayback((elements,frames)=>{
    let resolve;const promise=new Promise(done=>{resolve=done;});
    const control={then:promise.then.bind(promise),cancelled:0,cancel(){this.cancelled++;},finish:()=>resolve()};controls.push(control);
    for(const el of elements)for(const [key,value] of Object.entries(frames))el.style.setProperty(key,String(Array.isArray(value)?value[0]:value));
    return control;
  });
  return {playback,controls,element};
}
test('Pausar encerra efeitos finitos e contínuos e restaura estilos de leitura',()=>{
  const {playback,controls,element}=setup();const title=element(),drawing=element();
  drawing.style.setProperty('transform','rotate(5deg)');
  playback.run(title,{opacity:[0,1],transform:['translateY(20px)','none']},{},{scope:'entry'});
  playback.run(drawing,{transform:['translateY(-4px)','none']},{repeat:Infinity},{scope:'ambient',hold:true});
  playback.setEnabled(false);assert.equal(playback.size,0);assert.ok(controls.every(c=>c.cancelled===1));
  assert.equal(title.style.getPropertyValue('opacity'),'');assert.equal(title.style.getPropertyValue('transform'),'');assert.equal(drawing.style.getPropertyValue('transform'),'rotate(5deg)');
  playback.run(title,{opacity:[0,1]});assert.equal(controls.length,2);
  playback.setEnabled(true);playback.run(title,{opacity:[0,1]});assert.equal(controls.length,3);
});
test('Trocas rápidas descartam transições anteriores sem cancelar os outros componentes',async()=>{
  const {playback,controls,element}=setup();const oldQuestion=element(),newQuestion=element(),drawing=element();
  playback.run(oldQuestion,{opacity:[.2,1]},{},{scope:'survey'});
  playback.run(drawing,{transform:['none','rotate(5deg)']},{},{scope:'ambient',hold:true});
  playback.clear('survey');playback.run(newQuestion,{opacity:[.3,1]},{},{scope:'survey'});
  controls[0].finish();await setImmediate();
  assert.equal(controls[0].cancelled,1);assert.equal(controls[1].cancelled,0);assert.equal(newQuestion.style.getPropertyValue('opacity'),'0.3');
  controls[2].finish();await setImmediate();assert.equal(newQuestion.style.getPropertyValue('opacity'),'');assert.equal(playback.size,1);
});
test('Interações substituem efeitos no mesmo elemento e callbacks antigos não alteram o novo',async()=>{
  const {playback,controls,element}=setup();const card=element();
  playback.run(card,{transform:['translateY(20px)','none']});
  playback.run(card,{transform:['none','translateY(-5px)']},{},{hold:true});
  assert.equal(controls[0].cancelled,1);assert.equal(playback.size,1);
  controls[0].finish();await setImmediate();assert.equal(playback.size,1);assert.equal(controls[1].cancelled,0);
  playback.clear();assert.equal(card.style.getPropertyValue('transform'),'');
});
test('Build publica o Motion e a licença localmente, sem scripts externos no layout',async()=>{
  const root=new URL('../',import.meta.url);
  await access(new URL('dist/assets/vendor/motion.mjs',root));await access(new URL('dist/assets/vendor/MOTION-LICENSE.md',root));
  const pkg=JSON.parse(await readFile(new URL('package.json',root),'utf8'));assert.equal(pkg.dependencies.motion,'14.9.0');
  const layout=await readFile(new URL('templates/layout.html',root),'utf8');assert.doesNotMatch(layout,/<script[^>]+src="https?:/);assert.doesNotMatch(layout,/<script[^>]+src="\/assets\/motion.js/);
  const runtime=await readFile(new URL('assets/motion.js',root),'utf8');assert.match(runtime,/prefers-reduced-motion/);assert.match(runtime,/visibilitychange/);assert.match(runtime,/import\('\.\/vendor\/motion.mjs'\)/);
});
