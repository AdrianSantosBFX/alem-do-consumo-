import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {certificateEligible,normalizeCertificateName,certificateDate} from '../assets/certificate-model.mjs';
import {certificatePdf} from '../assets/certificate-pdf.mjs';
import {courseDefinition} from '../course.mjs';
import {restoreJourney,submitActivity,finishChapter,interactive} from '../assets/journey-model.mjs';
const data=JSON.parse(await readFile(new URL('../content/portal.json',import.meta.url),'utf8'));
test('Nome completo aceita acentos, apóstrofos e hifens, sem aceitar um nome isolado ou marcação',()=>{
  assert.equal(normalizeCertificateName('  Ana\n  Cláudia   D’Ávila-Santos  '),'Ana Cláudia D’Ávila-Santos');
  assert.equal(normalizeCertificateName('Jose\u0301 da Silva'),'José da Silva');
  for(const name of ['', 'Maria','Maria 123','<img src=x> Silva','A'.repeat(121)+' Silva'])assert.throws(()=>normalizeCertificateName(name),/nome completo/);
});
test('Emissão usa o dia de São Paulo mesmo perto da mudança de data UTC',()=>{
  assert.equal(certificateDate(new Date('2026-11-04T01:00:00Z')),'3 de novembro de 2026');
  assert.equal(certificateDate(new Date('2026-11-04T04:00:00Z')),'4 de novembro de 2026');
});
test('Certificado exige todas as etapas e aprovação, preservando o progresso sem dados pessoais',()=>{
  const definition=courseDefinition(data.course);let state=restoreJourney(definition,null);
  assert.equal(certificateEligible(definition,state),false);
  assert.equal(certificateEligible(definition,{...state,done:definition.chapters.map(c=>c.id)}),false);
  for(const chapter of definition.chapters){for(const block of chapter.blocks.filter(interactive))state=submitActivity(definition,state,block.id,block.questions.map(q=>q.answer));state=finishChapter(definition,state,chapter.id);}
  assert.equal(certificateEligible(definition,state),true);
  const clean=restoreJourney(definition,{...state,name:'Nome de Teste',certificate:{fullName:'Nome de Teste'}});
  assert.deepEqual(Object.keys(clean).sort(),['answers','current','done','version']);assert.ok(!JSON.stringify(clean).includes('Nome de Teste'));
  assert.equal(certificateEligible({...definition,certificate:{status:'planned'}},state),false);
});
test('Módulos de certificado não contêm persistência, envio de dados ou identificação no nome do arquivo',async()=>{
  const source=(await Promise.all(['certificate.mjs','certificate-model.mjs','certificate-pdf.mjs'].map(file=>readFile(new URL('../assets/'+file,import.meta.url),'utf8')))).join('\n');
  assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|console\./);
  assert.match(source,/link.download='certificado-alem-do-consumo.pdf'/);assert.match(source,/input.value=''/);
});
test('PDF usa offsets e comprimentos em bytes sem metadados nominais',async()=>{
  const pdf=certificatePdf(new Uint8Array([255,216,255,217]),10,20),bytes=new Uint8Array(await pdf.arrayBuffer());
  const source=new TextDecoder('latin1').decode(bytes);assert.equal(pdf.type,'application/pdf');assert.match(source,/^%PDF-1.4/);assert.match(source,/\/MediaBox \[0 0 841.89 595.28\]/);
  const xref=Number(source.match(/startxref\n(\d+)/)[1]);assert.equal(new TextDecoder().decode(bytes.slice(xref,xref+4)),'xref');assert.doesNotMatch(source,/\/Author|\/JavaScript|\/URI|\/EmbeddedFiles/);
  assert.throws(()=>certificatePdf(new Uint8Array([0,1]),10,20),/inválida/);
});
