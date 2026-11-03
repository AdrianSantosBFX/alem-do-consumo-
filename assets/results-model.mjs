// Fixed colour scale: a new response darkens its state without lightening other states.
import {states} from './states.mjs';
const start=[234,246,252],end=[7,81,125];
export const intensity=count=>Math.max(0,Number(count)||0)/(Math.max(0,Number(count)||0)+10);
export function mapColor(count){const t=intensity(count);return `rgb(${start.map((v,i)=>(v+(end[i]-v)*t).toFixed(2)).join(' ')})`;}
export function validateResults(data){
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  if(!data?.ok||!count(data.total)||!count(data.located)||!count(data.unlocated)||data.total!==data.located+data.unlocated||!Array.isArray(data.byState)||data.byState.length!==27||data.byState.some(s=>!count(s.count))||!Array.isArray(data.results?.questions)||data.results.questions.length!==14)throw new Error('Resposta inválida.');
  if(new Set(data.byState.map(s=>s.uf)).size!==27||data.byState.some(s=>!states.some(state=>state.uf===s.uf))||data.byState.reduce((sum,s)=>sum+s.count,0)!==data.located||!count(data.results.sampleSize)||data.results.sampleSize>data.total||data.results.releaseSize!==5||data.results.sampleSize%5!==0)throw new Error('Resumo inválido.');
  for(const [i,q] of data.results.questions.entries())if(q.id!==`q${String(i+1).padStart(2,'0')}`||!count(q.answered)||!count(q.skipped)||q.answered+q.skipped!==data.results.sampleSize||typeof q.locked!=='boolean'||!Array.isArray(q.options)||q.locked&&q.options.length>0||!q.locked&&(q.answered<5||q.options.some(o=>!count(o.count)||o.count>q.answered||!Number.isFinite(o.percentage)||o.percentage<0||o.percentage>100)))throw new Error('Distribuição inválida.');
  return data;
}

const format=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
const clean=label=>label.replace(/[.]$/,'');
export function leaders(question){
  if(!question||question.locked)return [];
  const maximum=Math.max(0,...question.options.map(o=>o.count));
  return maximum?question.options.filter(o=>o.count===maximum):[];
}
export function leadingText(question){
  const top=leaders(question);
  if(!top.length)return null;
  return `${top.map(o=>clean(o.label)).join(' / ')}${top.length>1?' (empate)':''} — ${format(top[0].percentage)}%${top.length>1?' cada':''}`;
}
// Combine counts only within a single-choice question. Multiple-choice answers
// overlap, so their percentages must never be added to estimate unique people.
export function share(question,values){
  if(!question||question.locked||question.type==='multiple'||!question.answered)return null;
  return Math.round(question.options.filter(o=>values.includes(o.value)).reduce((sum,o)=>sum+o.count,0)/question.answered*1000)/10;
}
export function buildOverview(data){
  const questions=data?.results.questions??[];
  const q=id=>questions.find(item=>item.id===id);
  const available=questions.filter(item=>!item.locked).length;
  const knowledge=[['q08','Vida útil dos produtos'],['q09','Impactos da produção'],['q10','Transporte e distribuição'],['q11','Decisões de compra'],['q12','Descarte de eletrônicos']].map(([id,label])=>({id,label,question:q(id),percentage:share(q(id),[0])}));
  const released=knowledge.filter(item=>item.percentage!==null);
  const minimum=released.length?Math.min(...released.map(item=>item.percentage)):null;
  const weakest=released.filter(item=>item.percentage===minimum);
  let headline='Um retrato coletivo em construção.';
  let summary='As primeiras participações vão revelar hábitos, desafios e interesses de quem responde à pesquisa.';
  if(available){
    headline='O que as respostas revelam até aqui.';
    const parts=[];
    if(leaders(q('q04')).length)parts.push(`Nas decisões de compra, ${leaders(q('q04')).length>1?'os fatores mais citados são':'o fator mais citado é'} ${leadingText(q('q04'))}.`);
    if(leaders(q('q07')).length)parts.push(`Na pergunta sobre dificuldades, ${leaders(q('q07')).length>1?'as respostas mais escolhidas são':'a resposta mais escolhida é'} ${leadingText(q('q07'))}.`);
    summary=parts.join(' ')||'Já há respostas disponíveis para parte dos temas. A leitura abaixo se amplia conforme novas participações entram no conjunto publicado.';
  }
  return {q,available,headline,summary,knowledge,weakest,knowledgeComplete:released.length===knowledge.length,impulse:share(q('q03'),[3,4]),sharedResponsibility:share(q('q13'),[4]),familiarity:share(q('q01'),[2,3,4])};
}
