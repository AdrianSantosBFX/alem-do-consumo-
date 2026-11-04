import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCourse,courseDefinition,renderCourse} from '../course.mjs';
import {restoreJourney,submitActivity,finishChapter,canAdvance,journeyProgress} from '../assets/journey-model.mjs';
const data=JSON.parse(await readFile(new URL('../content/portal.json',import.meta.url),'utf8'));
function fixture(){return {...structuredClone(data.course),status:'published',chapters:[{id:'objetivo',kind:'content',title:'Etapa controlada de teste',blocks:[{type:'text',text:'Texto exclusivamente de teste.'}]}],exam:{minScore:1,required:false,questions:[{prompt:'Questão controlada de teste',options:['A','B'],answer:1,explanation:'Explicação de teste.'}]}};}

test('Curso de 10 minutos tem conteúdo, atividades e avaliação; certificado disponível após aprovação',()=>{
  const definition=courseDefinition(data.course);
  assert.equal(data.course.status,'published');assert.equal(definition.chapters.length,7);assert.equal(data.course.certificate.status,'enabled');
  assert.equal(definition.chapters.reduce((sum,c)=>sum+c.minutes,0),10);
  assert.equal(data.course.durationMin,10);assert.equal(data.course.exam.questions.length,4);assert.equal(data.course.exam.minScore,.75);
  assert.ok(definition.chapters.flatMap(c=>c.blocks).some(b=>b.type==='scenario'));assert.ok(definition.chapters.flatMap(c=>c.blocks).some(b=>b.type==='sort-game'));
  assert.doesNotThrow(()=>validateCourse(data.course));assert.match(renderCourse(data.course),/data-sequence="avaliacao-final"/);
  const draft={...data.course,status:'draft',chapters:[],exam:null};assert.doesNotThrow(()=>validateCourse(draft));assert.throws(()=>renderCourse(draft),/preparação/);
});
test('Publicação exige conteúdo e prova final com nota definida',()=>{
  assert.throws(()=>validateCourse({...data.course,status:'published',chapters:[],exam:null}),/conteúdo e prova/);
  const course=fixture();assert.doesNotThrow(()=>validateCourse(course));course.exam.minScore=0;assert.throws(()=>validateCourse(course),/nota mínima/);
});

test('Cenário, minijogo e avaliação respeitam bloqueio, tentativas e limite de três acertos',()=>{
  const definition=courseDefinition(data.course);let state=restoreJourney(definition,null);
  assert.equal(submitActivity(definition,state,'desafio-do-uso',[0,1,0,1]),state);
  for(const chapter of definition.chapters){
    for(const block of chapter.blocks.filter(b=>['quiz','scenario','sort-game','checkpoint'].includes(b.type))){
      assert.equal(canAdvance(chapter,state),false);
      const wrong=block.questions.map(q=>(q.answer+1)%q.options.length);
      state=submitActivity(definition,state,block.id,wrong);assert.equal(canAdvance(chapter,state),false);
      const values=block.questions.map(q=>q.answer);
      if(block.id==='avaliacao-final')values[0]=(values[0]+1)%block.questions[0].options.length;
      state=submitActivity(definition,state,block.id,values);assert.equal(canAdvance(chapter,state),true);
      const passed=state;assert.equal(submitActivity(definition,state,block.id,wrong),passed);
    }
    state=finishChapter(definition,state,chapter.id);
    state=restoreJourney(definition,JSON.parse(JSON.stringify(state)));
  }
  assert.equal(journeyProgress(definition,state),100);assert.equal(state.done.length,7);
});

test('Restauração descarta progresso incompatível e não avança após uma atividade reprovada',()=>{
  const definition=courseDefinition(data.course),blank=restoreJourney(definition,null);
  assert.deepEqual(restoreJourney(definition,{version:1,done:definition.chapters.map(c=>c.id)}),blank);
  const raw={version:definition.version,done:definition.chapters.map(c=>c.id),answers:{'escolha-da-mochila':{values:[0],submitted:true}},current:'prova-final'};
  const restored=restoreJourney(definition,raw);assert.deepEqual(restored.done,['um-novo-olhar','caminho-dos-produtos']);assert.equal(restored.current,'pausa-antes-da-compra');
});

test('Referências e metadados rejeitam endereços e tempos inválidos',()=>{
  assert.throws(()=>validateCourse({...data.course,references:[{title:'X',url:'javascript:alert(1)'}]}),/Referência/);
  assert.throws(()=>validateCourse({...data.course,durationMin:-1}),/Duração/);
  const bad=structuredClone(data.course);bad.chapters[0].theme='" onclick="alert(1)';assert.throws(()=>validateCourse(bad),/Tema/);
});
test('Uma página inclui objetivos, atividades e prova final obrigatória',()=>{
  const course=fixture(),definition=courseDefinition(course),html=renderCourse(course);
  assert.equal(definition.chapters.length,2);assert.equal(definition.chapters.at(-1).id,'prova-final');assert.equal(definition.chapters.at(-1).blocks[0].required,true);
  assert.match(html,/id="etapa-objetivo"/);assert.match(html,/id="etapa-prova-final"/);assert.doesNotMatch(html,/href="\/aprenda\//);
  assert.match(html,/data-certificate-form/);assert.match(html,/Baixar certificado em PDF/);assert.match(html,/id="certificate-name"[^>]*disabled/);
});
test('Objetivos desbloqueiam a prova, e erro não permite concluir o curso',()=>{
  const definition=courseDefinition(fixture());let state=restoreJourney(definition,null);
  assert.equal(finishChapter(definition,state,'prova-final'),state);
  state=finishChapter(definition,state,'objetivo');assert.equal(canAdvance(definition.chapters[1],state),false);
  state=submitActivity(definition,state,'avaliacao-final',[0]);assert.equal(finishChapter(definition,state,'prova-final').done.length,1);
  state=submitActivity(definition,state,'avaliacao-final',[1]);state=finishChapter(definition,state,'prova-final');assert.equal(journeyProgress(definition,state),100);
  assert.deepEqual(restoreJourney(definition,JSON.parse(JSON.stringify(state))),state);
});
