import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCourse,courseDefinition,renderCourse} from '../course.mjs';
import {restoreJourney,submitActivity,finishChapter,canAdvance,journeyProgress} from '../assets/journey-model.mjs';
const data=JSON.parse(await readFile(new URL('../content/portal.json',import.meta.url),'utf8'));
function fixture(){return {...structuredClone(data.course),status:'published',chapters:[{id:'objetivo',kind:'content',title:'Etapa controlada de teste',blocks:[{type:'text',text:'Texto exclusivamente de teste.'}]}],exam:{minScore:1,required:false,questions:[{prompt:'Questão controlada de teste',options:['A','B'],answer:1,explanation:'Explicação de teste.'}]}};}

test('Nenhuma aula ou prova é inventada no conteúdo entregue',()=>{
  assert.equal(data.course.status,'draft');assert.deepEqual(data.course.chapters,[]);assert.equal(data.course.exam,null);assert.equal(data.course.certificate.status,'planned');
  assert.doesNotThrow(()=>validateCourse(data.course));assert.throws(()=>renderCourse(data.course),/preparação/);
});
test('Publicação exige conteúdo e prova final com nota definida',()=>{
  assert.throws(()=>validateCourse({...data.course,status:'published'}),/conteúdo e prova/);
  const course=fixture();assert.doesNotThrow(()=>validateCourse(course));course.exam.minScore=0;assert.throws(()=>validateCourse(course),/nota mínima/);
});
test('Uma página inclui objetivos, atividades e prova final obrigatória',()=>{
  const course=fixture(),definition=courseDefinition(course),html=renderCourse(course);
  assert.equal(definition.chapters.length,2);assert.equal(definition.chapters.at(-1).id,'prova-final');assert.equal(definition.chapters.at(-1).blocks[0].required,true);
  assert.match(html,/id="etapa-objetivo"/);assert.match(html,/id="etapa-prova-final"/);assert.doesNotMatch(html,/href="\/aprenda\//);
  assert.match(html,/modelo do certificado ainda está em preparação/);assert.doesNotMatch(html,/download|certificado\.pdf/);
});
test('Objetivos desbloqueiam a prova, e erro não permite concluir o curso',()=>{
  const definition=courseDefinition(fixture());let state=restoreJourney(definition,null);
  assert.equal(finishChapter(definition,state,'prova-final'),state);
  state=finishChapter(definition,state,'objetivo');assert.equal(canAdvance(definition.chapters[1],state),false);
  state=submitActivity(definition,state,'avaliacao-final',[0]);assert.equal(finishChapter(definition,state,'prova-final').done.length,1);
  state=submitActivity(definition,state,'avaliacao-final',[1]);state=finishChapter(definition,state,'prova-final');assert.equal(journeyProgress(definition,state),100);
  assert.deepEqual(restoreJourney(definition,JSON.parse(JSON.stringify(state))),state);
});
