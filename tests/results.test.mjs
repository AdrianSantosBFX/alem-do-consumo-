import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {onRequest} from '../functions/api/resultados.js';
import {survey} from '../server/survey-definition.mjs';
import {intensity,mapColor,validateResults,buildOverview,leaders,leadingText,share} from '../assets/results-model.mjs';
import {states} from '../assets/states.mjs';
const migrations=await Promise.all(['0001_survey.sql','0002_diagnostic_v1.sql'].map(file=>readFile(new URL('../migrations/'+file,import.meta.url),'utf8')));
function fixture(){
  const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');migrations.forEach(m=>sql.exec(m));
  const DB={prepare(query){return {bind(...params){return {query,params};}};},async batch(statements){sql.exec('BEGIN');try{const output=statements.map(s=>({results:sql.prepare(s.query).all(...s.params)}));sql.exec('COMMIT');return output;}catch(error){sql.exec('ROLLBACK');throw error;}}};
  const ids=[];
  function add({uf='SP',answers={q01:0,q02:0,q04:[0,1]},version=survey.version}={}){
    const id=crypto.randomUUID();ids.push(id);
    sql.prepare('INSERT INTO survey_submissions (id,survey_id,survey_version,consent_version,adult_confirmed,voluntary_confirmed,uf,city_id,payload_hash) VALUES (?,?,?,?,?,?,?,?,?)').run(id,survey.id,version,survey.consentVersion,1,1,uf,uf==='SP'?'3550308':null,'test-hash');
    for(const [q,value]of Object.entries(answers))sql.prepare('INSERT INTO survey_answers VALUES (?,?,?)').run(id,q,JSON.stringify(value));
  }
  return {sql,DB,add,ids};
}
const request=()=>new Request('https://www.alemdoconsumo.com.br/api/resultados');
const get=async db=>{const response=await onRequest({request:request(),env:db});assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');return response.json();};
test('Mapa vazio apresenta 27 UFs com zero e gráficos bloqueados sem inventar resultados',async()=>{
  const db=fixture(),data=await get(db);assert.equal(data.total,0);assert.equal(data.byState.length,27);assert.equal(data.located,0);assert.equal(data.unlocated,0);assert.equal(data.results.sampleSize,0);assert.equal(data.results.questions.length,14);assert.ok(data.results.questions.every(q=>q.locked&&q.options.length===0));assert.doesNotThrow(()=>validateResults(data));
});
test('Cada participação com UF entra no mapa; sem UF permanece apenas no total nacional',async()=>{
  const db=fixture();db.add();db.add({uf:'RJ'});db.add({uf:null});
  const data=await get(db);assert.equal(data.total,3);assert.equal(data.located,2);assert.equal(data.unlocated,1);assert.equal(data.byState.find(s=>s.uf==='SP').count,1);assert.equal(data.byState.find(s=>s.uf==='RJ').count,1);assert.equal(data.results.sampleSize,0);assert.ok(data.results.questions.every(q=>q.options.length===0));
});
test('Resultados nacionais só mudam em grupos completos de cinco, sem divulgar uma resposta isolada',async()=>{
  const db=fixture();for(let i=0;i<5;i++)db.add();
  const first=await get(db);assert.equal(first.results.sampleSize,5);assert.equal(first.results.questions[0].options[0].count,5);
  db.add({answers:{q01:4,q02:10,q04:[4]}});const sixth=await get(db);assert.equal(sixth.total,6);assert.equal(sixth.byState.find(s=>s.uf==='SP').count,6);assert.deepEqual(sixth.results,first.results);
  for(let i=0;i<4;i++)db.add({answers:{q01:4,q02:10,q04:[4]}});
  const tenth=await get(db);assert.equal(tenth.results.sampleSize,10);assert.equal(tenth.results.questions[0].options[0].count,5);assert.equal(tenth.results.questions[0].options[4].count,5);assert.equal(tenth.results.questions[1].average,5);
});
test('Percentuais múltiplos usam quem respondeu à pergunta; escala preserva zero e perguntas opcionais são protegidas',async()=>{
  const db=fixture();for(let i=0;i<5;i++)db.add();const data=await get(db);
  const multiple=data.results.questions.find(q=>q.id==='q04');assert.equal(multiple.answered,5);assert.equal(multiple.options[0].percentage,100);assert.equal(multiple.options[1].percentage,100);assert.equal(multiple.options.reduce((n,o)=>n+o.percentage,0),200);
  const scale=data.results.questions.find(q=>q.id==='q02');assert.equal(scale.average,0);assert.equal(scale.options.length,11);assert.equal(scale.options[0].count,5);
  const optional=data.results.questions.find(q=>q.id==='q03');assert.equal(optional.answered,0);assert.equal(optional.skipped,5);assert.equal(optional.locked,true);assert.deepEqual(optional.options,[]);
});
test('Nenhum identificador, município, horário, hash ou resposta individual sai da API pública',async()=>{
  const db=fixture();for(let i=0;i<5;i++)db.add();const data=await get(db),body=JSON.stringify(data);
  for(const id of db.ids)assert.ok(!body.includes(id));assert.doesNotMatch(body,/3550308|test-hash|city_id|submission_id|submitted_at|payload_hash/);
  assert.deepEqual(Object.keys(data).sort(),['ok','surveyId','version','total','located','unlocated','byState','results'].sort());
  assert.deepEqual(Object.keys(data.byState[0]).sort(),['count','uf']);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM survey_submissions').get().n,5);
});
test('API rejeita filtros e escrita, e falhas não são apresentadas como contagens zero',async()=>{
  const db=fixture();assert.equal((await onRequest({request:new Request(request().url+'?uf=SP'),env:db})).status,400);assert.equal((await onRequest({request:new Request(request().url,{method:'POST'}),env:db})).status,405);assert.equal((await onRequest({request:request(),env:{}})).status,503);
  const failure=await onRequest({request:request(),env:{DB:{prepare:()=>({bind:()=>({})}),batch:()=>{throw new Error('private schema');}}}});assert.equal(failure.status,503);assert.doesNotMatch(await failure.text(),/private schema/);
});
test('Escala azul fixa aumenta com a contagem e metadados do mapa cobrem as 27 UFs',async()=>{
  assert.equal(intensity(0),0);assert.ok(intensity(1)<intensity(2));assert.ok(intensity(5)<intensity(100));assert.notEqual(mapColor(1),mapColor(2));assert.equal(mapColor(0),'rgb(234.00 246.00 252.00)');
  const map=JSON.parse(await readFile(new URL('../assets/brazil-states.json',import.meta.url),'utf8'));assert.equal(map.features.length,27);assert.equal(new Set(map.features.map(f=>f.id)).size,27);assert.deepEqual(map.features.map(f=>f.id).sort(),states.map(s=>s.uf).sort());assert.ok(map.features.every(f=>f.geometry.coordinates.length&&f.properties.labelPoint.length===2));
});

test('Panorama não interpreta perguntas bloqueadas nem inventa indicadores em uma base vazia',async()=>{
  const overview=buildOverview(await get(fixture()));
  assert.equal(overview.available,0);assert.equal(overview.impulse,null);assert.equal(overview.sharedResponsibility,null);assert.equal(overview.familiarity,null);
  assert.ok(overview.knowledge.every(item=>item.percentage===null));assert.equal(overview.knowledgeComplete,false);
  assert.match(overview.headline,/construção/);assert.deepEqual(leaders({locked:true,options:[{count:100,label:'Oculto'}]}),[]);
  assert.equal(buildOverview(null).available,0);
});

test('Panorama combina contagens da mesma pergunta com base própria e preserva zero real',async()=>{
  const db=fixture();
  for(let i=0;i<10;i++)db.add({answers:i<6?{q02:0,q03:i<2?3:i<4?4:0,q13:0,q01:i<2?2:i<4?3:4}: {}});
  const overview=buildOverview(await get(db));
  assert.equal(overview.q('q03').answered,6);assert.equal(overview.q('q03').skipped,4);
  assert.equal(overview.impulse,66.7);assert.equal(overview.sharedResponsibility,0);assert.equal(overview.familiarity,100);assert.equal(overview.q('q02').average,0);
  assert.equal(share({type:'multiple',locked:false,answered:5,options:[{value:0,count:5},{value:1,count:5}]},[0,1]),null);
});

test('Síntese mantém empates e não transforma a opção sem dificuldades em uma barreira',async()=>{
  const db=fixture();for(let i=0;i<10;i++)db.add({answers:{q04:[0,1],q07:5,q14:i<5?0:1}});
  const overview=buildOverview(await get(db));
  assert.equal(leaders(overview.q('q04')).length,2);assert.match(overview.summary,/Preço \/ Necessidade \(empate\)/);
  assert.match(overview.summary,/resposta mais escolhida é Não encontro dificuldades/);
  assert.match(leadingText(overview.q('q14')),/Consumismo e publicidade \/ Produção e meio ambiente \(empate\) — 50% cada/);
});

test('Comparação de aprendizagem exige cinco temas liberados e preserva bases diferentes',async()=>{
  const db=fixture();for(let i=0;i<10;i++)db.add({answers:{q08:i<5?0:1,q09:0,q10:0,q11:0,...(i<5?{q12:0}:{})}});
  const overview=buildOverview(await get(db));assert.equal(overview.knowledgeComplete,true);assert.deepEqual(overview.weakest.map(item=>item.id),['q08']);
  assert.equal(overview.knowledge.find(item=>item.id==='q12').percentage,100);assert.equal(overview.knowledge.find(item=>item.id==='q12').question.answered,5);
  const partial=fixture();for(let i=0;i<5;i++)partial.add({answers:{q08:0}});
  assert.equal(buildOverview(await get(partial)).knowledgeComplete,false);
});
