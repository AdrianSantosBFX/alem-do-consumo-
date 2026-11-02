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
