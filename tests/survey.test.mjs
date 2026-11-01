import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSurvey,newSurvey,startSurvey,selectAnswer,canContinue,nextQuestion,previousQuestion} from '../assets/survey-model.mjs';
const {survey}=JSON.parse(await readFile(new URL('../content/portal.json',import.meta.url),'utf8'));

test('A prévia tem quatro perguntas editáveis e opção de não responder',()=>{
  assert.doesNotThrow(()=>validateSurvey(survey));assert.equal(survey.questions.length,4);
  for(const question of survey.questions)assert.ok(question.options.includes('Prefiro não responder.'));
  assert.equal(newSurvey().step,-1);
});
test('Não avança sem seleção ou com uma resposta inválida',()=>{
  const state=startSurvey();assert.equal(canContinue(survey,state),false);
  assert.equal(nextQuestion(survey,state),state);
  for(const value of [-1,100,null,1.5])assert.equal(selectAnswer(survey,state,value),state);
});
test('Uma pergunta por vez, revisão de resposta e conclusão local',()=>{
  let state=startSurvey();state=selectAnswer(survey,state,0);state=nextQuestion(survey,state);
  assert.equal(state.step,1);assert.equal(state.answers.planejamento,0);
  state=previousQuestion(state);assert.equal(state.step,0);
  state=selectAnswer(survey,state,2);state=nextQuestion(survey,state);assert.equal(state.answers.planejamento,2);
  while(state.step<survey.questions.length){const q=survey.questions[state.step];state=selectAnswer(survey,state,q.options.length-1);state=nextQuestion(survey,state);}
  assert.equal(state.step,4);assert.equal(Object.keys(state.answers).length,4);
  assert.deepEqual(startSurvey(),{step:0,answers:{}});
});
test('Configuração não permite fingir coleta nem perguntas repetidas',()=>{
  assert.throws(()=>validateSurvey({...survey,mode:'live'}),/prévia/);
  const duplicate=structuredClone(survey);duplicate.questions[1].id=duplicate.questions[0].id;assert.throws(()=>validateSurvey(duplicate),/repetido/);
  const missing=structuredClone(survey);missing.questions[0].options=['Sim','Não'];assert.throws(()=>validateSurvey(missing),/não responder/);
});
test('O controlador da prévia não persiste ou transmite respostas',async()=>{
  const client=await readFile(new URL('../script.js',import.meta.url),'utf8');
  assert.doesNotMatch(client,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon/);
  assert.match(client,/Nenhuma resposta foi enviada ou salva/);
});
