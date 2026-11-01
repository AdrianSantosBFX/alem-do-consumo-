import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {orientation} from '../content/orientation.mjs';
import {validateJourney,renderJourney} from '../learning.mjs';
import {restoreJourney,submitActivity,finishChapter,activityResult,canAdvance,journeyProgress} from '../assets/journey-model.mjs';
import {createPages,projectRoot} from '../build.mjs';
import path from 'node:path';

test('Etapas futuras não podem ser concluídas nem responder atividades antecipadamente',()=>{
  const blank=restoreJourney(orientation,null);
  assert.equal(journeyProgress(orientation,blank),0);
  assert.deepEqual(finishChapter(orientation,blank,'seguir'),blank);
  assert.deepEqual(submitActivity(orientation,blank,'retomada',[1]),blank);
  assert.deepEqual(finishChapter(orientation,blank,'explorar').done,['explorar']);
});

test('Erro, feedback, nova tentativa e desbloqueio respeitam a resposta correta',()=>{
  let state=finishChapter(orientation,restoreJourney(orientation,null),'explorar');
  state=submitActivity(orientation,state,'retomada',[0]);
  const chapter=orientation.chapters[1],block=chapter.blocks[0];
  assert.equal(activityResult(block,state.answers.retomada).correct,0);
  assert.equal(canAdvance(chapter,state),false);
  assert.equal(finishChapter(orientation,state,'participar').done.length,1);
  state=submitActivity(orientation,state,'retomada',[1]);
  assert.equal(canAdvance(chapter,state),true);
  state=finishChapter(orientation,state,'participar');
  assert.equal(state.current,'seguir');
  state=finishChapter(orientation,state,'seguir');
  assert.equal(journeyProgress(orientation,state),100);
  assert.equal(finishChapter(orientation,state,'seguir').done.length,3);
});

test('Retomada reconstrói estado, preserva resposta e reinicia ao mudar de versão',()=>{
  let state=finishChapter(orientation,restoreJourney(orientation,null),'explorar');
  state=submitActivity(orientation,state,'retomada',[1]);
  const restored=restoreJourney(orientation,JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored,state);
  assert.equal(canAdvance(orientation.chapters[1],restored),true);
  assert.equal(restoreJourney({...orientation,version:2},state).done.length,0);
  const invalid=restoreJourney(orientation,{version:1,done:['explorar','participar','seguir'],answers:{retomada:{values:[999],submitted:true}},current:'seguir'});
  assert.deepEqual(invalid.done,['explorar']);
  assert.equal(invalid.current,'participar');
});

test('Checkpoint permite nota mínima, e revisão não revoga uma aprovação',()=>{
  const def={id:'teste',version:1,chapters:[{id:'etapa',blocks:[{id:'cp',type:'checkpoint',minScore:.5,questions:[{options:['A','B'],answer:0},{options:['A','B'],answer:1}]}]}]};
  let state=restoreJourney(def,null);
  state=submitActivity(def,state,'cp',[0,0]);
  assert.equal(canAdvance(def.chapters[0],state),true);
  const review=submitActivity(def,state,'cp',[1,0]);
  assert.deepEqual(review,state);
  assert.deepEqual(finishChapter(def,state,'etapa').done,['etapa']);
});

test('Definições inválidas e atividades duplicadas não geram uma aula',()=>{
  const duplicate=structuredClone(orientation);
  duplicate.chapters[2].blocks.push(structuredClone(duplicate.chapters[1].blocks[0]));
  assert.throws(()=>validateJourney(duplicate),/duplicado/);
  const invalid=structuredClone(orientation);invalid.chapters[1].blocks[0].questions[0].answer=99;
  assert.throws(()=>validateJourney(invalid),/Alternativas/);
  const threshold=structuredClone(orientation);threshold.chapters[1].blocks[0].minScore=2;
  assert.throws(()=>validateJourney(threshold),/mínima/);
});

test('Apresentação tem conteúdo estático e não é contada entre as aulas',async()=>{
  const data=JSON.parse(await readFile(path.join(projectRoot,'content/portal.json'),'utf8'));
  const layout=await readFile(path.join(projectRoot,'templates/layout.html'),'utf8');
  const home=await readFile(path.join(projectRoot,'templates/home.html'),'utf8');
  const pages=createPages(data,layout,home);
  const html=pages.get('/aprenda/como-funciona/').html;
  assert.match(html,/data-journey/);
  assert.match(html,/Não é|não é uma aula socioambiental/);
  assert.match(html,/"lessonIds":\[\]/);
  assert.match(html,/id="etapa-explorar"/);
  assert.match(html,/aria-label="Etapas do percurso"/);
  assert.match(html,/\/assets\/lesson-player.mjs/);
  assert.match(pages.get('/aprenda/').html,/Nenhuma aula publicada por enquanto/);
  assert.match(pages.get('/').html,/role="tablist"/);
  assert.match(pages.get('/').html,/data-motion-toggle/);
});

test('Aulas novas aceitam etapas interativas sem quebrar as aulas de texto legadas',async()=>{
  const data=JSON.parse(await readFile(path.join(projectRoot,'content/portal.json'),'utf8'));
  const layout=await readFile(path.join(projectRoot,'templates/layout.html'),'utf8');
  const home=await readFile(path.join(projectRoot,'templates/home.html'),'utf8');
  data.modules[0].lessons.push({slug:'teste-interativo',title:'Teste controlado',summary:'Aula apenas de teste.',version:1,status:'published',chapters:structuredClone(orientation.chapters)});
  const pages=createPages(data,layout,home);
  const html=pages.get('/aprenda/consumo-e-consumismo/teste-interativo/').html;
  assert.match(html,/"currentLesson":"consumo-e-consumismo\/teste-interativo"/);
  assert.match(html,/"id":"consumo-e-consumismo\/teste-interativo"/);
  assert.doesNotMatch(html,/"isOrientation":true/);
  assert.match(html,/id="journey-finished-title"/);
});

test('Textos de blocos são escapados em vez de executados como HTML',()=>{
  const def=structuredClone(orientation);def.chapters[0].blocks[0].text='<img onerror=alert(1)>';
  assert.match(renderJourney(def),/&lt;img onerror=alert\(1\)&gt;/);
});
