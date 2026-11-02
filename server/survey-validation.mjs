import portal from '../content/portal.json' with {type:'json'};
import {localities} from '../assets/localities.mjs';
import {isValidAnswer} from '../assets/survey-model.mjs';

export const survey=portal.survey;
export class InvalidSubmission extends Error {}
const assert=(condition)=>{if(!condition)throw new InvalidSubmission('Preenchimento inválido.');};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const only=(value,keys)=>object(value)&&Object.keys(value).every(key=>keys.includes(key));
export function validateSubmission(input){
  assert(only(input,['id','surveyId','version','consentVersion','adult','voluntary','location','answers']));
  assert(typeof input.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id));
  assert(input.surveyId===survey.id&&input.version===survey.version&&input.consentVersion===survey.consentVersion);
  assert(input.adult===true&&input.voluntary===true);
  assert(only(input.location,['uf','city']));
  const {uf,city}=input.location;
  assert(typeof uf==='string'&&typeof city==='string');
  const state=localities.find(state=>state.uf===uf);
  assert(uf===''||Boolean(state));assert(city===''||Boolean(state?.cities.some(c=>c.id===city)));
  assert(only(input.answers,survey.questions.map(q=>q.id)));
  const answers={};
  for(const q of survey.questions){
    const answer=input.answers[q.id];assert(isValidAnswer(q,answer));
    if(answer!==undefined&&(!Array.isArray(answer)||answer.length))answers[q.id]=Array.isArray(answer)?[...answer].sort((a,b)=>a-b):answer;
  }
  return {id:input.id.toLowerCase(),surveyId:survey.id,version:survey.version,consentVersion:survey.consentVersion,adult:true,voluntary:true,location:{uf,city},answers};
}
export async function submissionHash(value){
  const {id,...payload}=value;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
  return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
