import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {onRequest} from '../functions/api/pesquisa.js';
import {survey,validateSubmission} from '../server/survey-validation.mjs';
import {createSurveySender} from '../assets/survey-client.mjs';
const migrations=await Promise.all(['0001_survey.sql','0002_diagnostic_v1.sql'].map(file=>readFile(new URL('../migrations/'+file,import.meta.url),'utf8')));
const payload=()=>({id:crypto.randomUUID(),surveyId:survey.id,version:survey.version,consentVersion:survey.consentVersion,adult:true,voluntary:true,location:{uf:'SP',city:'3550308'},answers:{q01:2,q02:0,q04:[0,2,4],q06:[0,1,2,3,4,5,6]}});
function database(){
  const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const migration of migrations)sql.exec(migration);
  const DB={prepare(query){return {bind(...params){return {query,params,async first(){return sql.prepare(query).get(...params)||null;}};}};},async batch(statements){sql.exec('BEGIN');try{const results=statements.map(s=>sql.prepare(s.query).run(...s.params));sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}};
  return {sql,DB,count:table=>Number(sql.prepare(`SELECT count(*) AS n FROM ${table}`).get().n)};
}
const request=(body,options={})=>new Request('https://www.alemdoconsumo.com.br/api/pesquisa',{method:'POST',headers:{Origin:'https://www.alemdoconsumo.com.br','Content-Type':'application/json',...options.headers},body:typeof body==='string'?body:JSON.stringify(body)});
test('Migrações criam o instrumento imutável, tabelas e chaves estrangeiras',()=>{
  const {sql,count}=database();assert.equal(count('survey_submissions'),0);assert.equal(count('survey_answers'),0);
  const saved=JSON.parse(sql.prepare('SELECT definition_json FROM survey_versions').get().definition_json);
  assert.deepEqual(saved,{id:survey.id,version:survey.version,sections:survey.sections,questions:survey.questions});
  assert.throws(()=>sql.prepare('INSERT INTO survey_answers VALUES (?,?,?)').run('absent','q01','0'),/FOREIGN KEY/);
  assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(),[]);
});
test('API grava participação e respostas válidas, incluindo zero e múltiplas seleções',async()=>{
  const db=database(),body=payload();const response=await onRequest({request:request(body),env:db});assert.equal(response.status,201);
  assert.deepEqual(await response.json(),{ok:true,submissionId:body.id});assert.equal(db.count('survey_submissions'),1);assert.equal(db.count('survey_answers'),4);
  assert.equal(db.sql.prepare("SELECT value_json FROM survey_answers WHERE question_id='q02'").get().value_json,'0');
  assert.equal(db.sql.prepare("SELECT value_json FROM survey_answers WHERE question_id='q04'").get().value_json,'[0,2,4]');
  const columns=db.sql.prepare('PRAGMA table_info(survey_submissions)').all().map(c=>c.name);assert.ok(!columns.some(c=>/email|name|phone|ip|user_agent|cookie/i.test(c)));
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('Repetição e envio concorrente são idempotentes; mesmo ID com outras respostas gera conflito',async()=>{
  const db=database(),body=payload();const responses=await Promise.all([1,2].map(()=>onRequest({request:request(body),env:db})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);assert.equal(db.count('survey_submissions'),1);assert.equal(db.count('survey_answers'),4);
  const changed=structuredClone(body);changed.answers.q02=10;assert.equal((await onRequest({request:request(changed),env:db})).status,409);
  assert.equal(db.sql.prepare("SELECT value_json FROM survey_answers WHERE question_id='q02'").get().value_json,'0');
});
test('Localização e todas as respostas são opcionais',async()=>{
  const db=database(),body={...payload(),location:{uf:'',city:''},answers:{}};
  assert.equal((await onRequest({request:request(body),env:db})).status,201);assert.equal(db.count('survey_answers'),0);
  assert.deepEqual({...db.sql.prepare('SELECT uf, city_id FROM survey_submissions').get()},{uf:null,city_id:null});
});
test('Servidor rejeita campos extras, consentimento ausente, versão incorreta e alternativas inválidas',async()=>{
  const changes=[b=>b.adult=false,b=>b.voluntary=false,b=>b.version++,b=>b.consentVersion='old',b=>b.email='test@example.invalid',b=>b.location.city='3304557',b=>b.answers.q02=11,b=>b.answers.q04=[0,1,2,3],b=>b.answers.q04=[0,0],b=>b.answers.q01='2',b=>b.answers.q15=0];
  const db=database();for(const change of changes){const body=payload();change(body);assert.throws(()=>validateSubmission(body));assert.equal((await onRequest({request:request(body),env:db})).status,422);}
  assert.equal(db.count('survey_submissions'),0);
});
test('API não expõe respostas por GET e valida origem, tamanho, formato e disponibilidade',async()=>{
  const db=database();
  assert.equal((await onRequest({request:new Request('https://www.alemdoconsumo.com.br/api/pesquisa'),env:db})).status,405);
  assert.equal((await onRequest({request:request(payload(),{headers:{Origin:'https://other.invalid'}}),env:db})).status,403);
  assert.equal((await onRequest({request:request(payload(),{headers:{'Content-Type':'text/plain'}}),env:db})).status,415);
  assert.equal((await onRequest({request:request('{broken'),env:db})).status,400);
  assert.equal((await onRequest({request:request(' '.repeat(16385)),env:db})).status,413);
  assert.equal((await onRequest({request:request(payload()),env:{}})).status,503);
  assert.equal(db.count('survey_submissions'),0);
});
test('Falha em uma resposta reverte toda a participação e permite tentar novamente',async()=>{
  const db=database(),body=payload();
  db.sql.exec("CREATE TRIGGER test_failure BEFORE INSERT ON survey_answers BEGIN SELECT RAISE(ABORT, 'test only'); END;");
  const result=await onRequest({request:request(body),env:db});assert.equal(result.status,503);assert.doesNotMatch(await result.text(),/test only|SQL/);assert.equal(db.count('survey_submissions'),0);assert.equal(db.count('survey_answers'),0);
  db.sql.exec('DROP TRIGGER test_failure');assert.equal((await onRequest({request:request(body),env:db})).status,201);
});
test('Cliente conserva o ID em falhas e reenvios; só confirma recibo correspondente',async()=>{
  const calls=[];let fail=true;
  const sender=createSurveySender({fetcher:async(url,options)=>{const body=JSON.parse(options.body);calls.push({url,options,body});if(fail){fail=false;throw new TypeError('offline');}return Response.json({ok:true,submissionId:body.id});}});
  const {id,...body}=payload();await assert.rejects(sender.send(body),/continuam nesta página/);
  await sender.send(body);assert.equal(calls[0].body.id,calls[1].body.id);assert.equal(calls[1].url,'/api/pesquisa');assert.equal(calls[1].options.credentials,'omit');
  await sender.send({...body,answers:{q02:10}});assert.notEqual(calls[2].body.id,calls[1].body.id);sender.reset();await sender.send(body);assert.notEqual(calls[3].body.id,calls[1].body.id);
  const bad=createSurveySender({fetcher:async()=>Response.json({ok:true,submissionId:'wrong'})});await assert.rejects(bad.send(body),/confirmar/);
});
test('Cliente permite recuperar após timeout e ignora confirmação que não chegou',async()=>{
  const sender=createSurveySender({timeoutMs:5,fetcher:async(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError'))))});
  const {id,...body}=payload();await assert.rejects(sender.send(body),/continuam nesta página/);
});
test('Ambientes usam bancos separados e Functions só atendem /api/*',async()=>{
  const root=new URL('../',import.meta.url),config=await readFile(new URL('wrangler.toml',root),'utf8');assert.match(config,/\[\[env.preview.d1_databases\]\]/);assert.match(config,/5ebe5a91-0f36-43f8-93ef-876834ae5c4c/);assert.match(config,/a3f9446b-d054-446f-bc4e-e41e0ff907e6/);assert.doesNotMatch(config,/\[env.production.vars\]/);
  assert.deepEqual(JSON.parse(await readFile(new URL('dist/_routes.json',root),'utf8')),{version:1,include:['/api/*'],exclude:[]});
});
