import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSurvey,newSurvey,startSurvey,setConsent,setLocation,selectAnswer,clearAnswer,canContinue,nextQuestion,previousQuestion,answeredCount} from '../assets/survey-model.mjs';
import {renderSurveyIntro} from '../assets/survey-view.mjs';
import {localities} from '../assets/localities.mjs';
const {survey}=JSON.parse(await readFile(new URL('../content/portal.json',import.meta.url),'utf8'));
const eligible=()=>startSurvey(setConsent(setConsent(newSurvey(),'adult',true),'voluntary',true));
const at=step=>({...eligible(),step});

test('14 perguntas versionadas nas quatro seções, escala e múltiplas seleções corretas',()=>{
  assert.doesNotThrow(()=>validateSurvey(survey));assert.equal(survey.questions.length,14);
  assert.deepEqual(survey.sections.map(s=>survey.questions.filter(q=>q.section===s.id).length),[2,5,5,2]);
  assert.deepEqual(survey.questions.filter(q=>q.type==='multiple').map(q=>q.id),['q04','q06']);
  assert.equal(survey.questions[3].maxSelections,3);assert.equal(survey.questions[1].type,'scale');
  assert.equal(survey.questions[13].options.length,6);
});
test('Maioridade e participação voluntária são exigidas, sem dados de identificação',()=>{
  let state=newSurvey();assert.equal(startSurvey(state),state);assert.equal(canContinue(survey,state),false);
  state=setConsent(state,'adult',true);assert.equal(startSurvey(state),state);
  state=setConsent(state,'voluntary',true);assert.equal(startSurvey(state).step,-1);
  const html=renderSurveyIntro(survey,{ready:false});assert.match(html,/name="adult" required/);assert.match(html,/name="voluntary" required/);assert.match(html,/type="submit" disabled/);
  assert.doesNotMatch(html,/type="email"|type="tel"|name="name"/);
});
test('Localização opcional: 27 UFs, municípios filtrados e cidade apagada ao trocar UF',()=>{
  assert.equal(localities.length,27);assert.equal(new Set(localities.map(s=>s.uf)).size,27);
  const cities=localities.flatMap(s=>s.cities);assert.ok(cities.length>=5570);assert.equal(new Set(cities.map(c=>c.id)).size,cities.length);
  assert.ok(localities.every(s=>s.cities.length));
  let state=eligible();assert.equal(nextQuestion(survey,state).step,0);
  state=setLocation(state,localities,'uf','SP');state=setLocation(state,localities,'city','3550308');assert.equal(state.location.city,'3550308');
  assert.equal(setLocation(state,localities,'city','3304557'),state);
  state=setLocation(state,localities,'uf','RJ');assert.deepEqual(state.location,{uf:'RJ',city:''});
  assert.equal(setLocation(state,localities,'uf','ZZ'),state);
  state=previousQuestion(nextQuestion(survey,state));assert.equal(state.location.uf,'RJ');
});
test('Escala aceita 0 e 10 sem selecionar automaticamente um valor',()=>{
  let state=at(1);assert.equal(state.answers.q02,undefined);
  for(const invalid of [-1,11,0.5,null,'5'])assert.equal(selectAnswer(survey,state,invalid),state);
  state=selectAnswer(survey,state,0);assert.equal(state.answers.q02,0);assert.equal(answeredCount(state),1);
  state=selectAnswer(survey,state,10);assert.equal(state.answers.q02,10);
});
test('Q4 aceita até três escolhas e bloqueia a quarta sem perder respostas',()=>{
  let state=at(3);for(const i of [0,1,2])state=selectAnswer(survey,state,i);
  assert.deepEqual(state.answers.q04,[0,1,2]);assert.equal(selectAnswer(survey,state,3),state);
  state=selectAnswer(survey,state,1);state=selectAnswer(survey,state,3);assert.deepEqual(state.answers.q04,[0,2,3]);
  const corrupted={...state,answers:{q04:[0,1,2,3]}};assert.equal(canContinue(survey,corrupted),false);assert.equal(nextQuestion(survey,corrupted),corrupted);
});
test('Q6 permite todas as alternativas, limpar resposta e seguir sem responder',()=>{
  let state=at(5);for(let i=0;i<7;i++)state=selectAnswer(survey,state,i);
  assert.equal(state.answers.q06.length,7);state=clearAnswer(survey,state);assert.equal(state.answers.q06,undefined);assert.equal(answeredCount(state),0);assert.equal(nextQuestion(survey,state).step,6);
});
test('Percurso completo, voltar, alterar e concluir apagam todos os dados',()=>{
  let state=nextQuestion(survey,eligible());state=selectAnswer(survey,state,2);state=nextQuestion(survey,state);
  state=previousQuestion(state);assert.equal(state.answers.q01,2);state=selectAnswer(survey,state,4);state=nextQuestion(survey,state);assert.equal(state.answers.q01,4);
  while(state.step<14){state=selectAnswer(survey,state,0);assert.equal(canContinue(survey,state),true);state=nextQuestion(survey,state);}
  assert.deepEqual(state,{...newSurvey(),step:14});assert.equal(nextQuestion(survey,state),state);
  state=newSurvey();assert.deepEqual(state.answers,{});assert.deepEqual(state.location,{uf:'',city:''});assert.equal(state.adult,false);
});
test('Todas as perguntas podem ficar sem resposta, sem adicionar alternativas ao instrumento',()=>{
  let state=eligible();while(state.step<14)state=nextQuestion(survey,state);assert.equal(state.step,14);assert.deepEqual(state.answers,{});
  assert.equal(selectAnswer(survey,at(0),100).answers.q01,undefined);
});
test('Validação rejeita IDs repetidos, modo de coleta, limites e configuração inválidos',()=>{
  assert.throws(()=>validateSurvey({...survey,mode:'live'}),/prévia/);
  const duplicate=structuredClone(survey);duplicate.questions[1].id='q01';assert.throws(()=>validateSurvey(duplicate),/repetido/);
  const invalid=structuredClone(survey);invalid.questions[3].maxSelections=9;assert.throws(()=>validateSurvey(invalid),/Limite/);
  const scale=structuredClone(survey);scale.questions[1].max=11;assert.throws(()=>validateSurvey(scale),/Escala/);
});
test('Controlador e modelo não persistem nem transmitem respostas; saída e BFCache limpam o estado',async()=>{
  for(const file of ['script.js','assets/survey-model.mjs','assets/survey-view.mjs','assets/localities.mjs']){
    const source=await readFile(new URL('../'+file,import.meta.url),'utf8');
    assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|WebSocket|https?:\/\/(?!servicodados\.ibge\.gov\.br\/api\/docs\/localidades)/);
  }
  const client=await readFile(new URL('../script.js',import.meta.url),'utf8');
  assert.match(client,/event\.preventDefault\(\)/);assert.match(client,/pagehide/);assert.match(client,/event\.persisted/);
  assert.match(client,/não foram armazenadas nem enviadas/);
});
