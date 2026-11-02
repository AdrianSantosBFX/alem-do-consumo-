import {validateSubmission,submissionHash,InvalidSubmission} from '../../server/survey-validation.mjs';

const MAX_BYTES=16384;
const reply=(status,value)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Allow':'POST'}});
async function readPayload(request){
  if(Number(request.headers.get('Content-Length'))>MAX_BYTES)return null;
  const reader=request.body?.getReader();if(!reader)throw new SyntaxError();
  const chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();return null;}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function onRequest({request,env}){
  if(request.method!=='POST')return reply(405,{ok:false,error:'Método não permitido.'});
  const origin=request.headers.get('Origin');
  if(origin!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return reply(403,{ok:false,error:'Origem não permitida.'});
  if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')return reply(415,{ok:false,error:'Use JSON.'});
  let payload;
  try{payload=await readPayload(request);}catch{return reply(400,{ok:false,error:'JSON inválido.'});}
  if(payload===null)return reply(413,{ok:false,error:'Requisição muito grande.'});
  let value;
  try{value=validateSubmission(payload);}catch(error){if(error instanceof InvalidSubmission)return reply(422,{ok:false,error:'Revise as respostas e a versão do questionário.'});throw error;}
  if(!env.DB?.prepare||!env.DB?.batch)return reply(503,{ok:false,error:'Pesquisa temporariamente indisponível.'});
  try{
    const hash=await submissionHash(value);
    const existing=()=>env.DB.prepare('SELECT payload_hash FROM survey_submissions WHERE id = ?').bind(value.id).first();
    const receipt=record=>record.payload_hash===hash?reply(200,{ok:true,submissionId:value.id}):reply(409,{ok:false,error:'Identificador já utilizado.'});
    const previous=await existing();if(previous)return receipt(previous);
    const statements=[env.DB.prepare('INSERT INTO survey_submissions (id,survey_id,survey_version,consent_version,adult_confirmed,voluntary_confirmed,uf,city_id,payload_hash) VALUES (?,?,?,?,?,?,?,?,?)').bind(value.id,value.surveyId,value.version,value.consentVersion,1,1,value.location.uf||null,value.location.city||null,hash)];
    for(const [question,answer] of Object.entries(value.answers))statements.push(env.DB.prepare('INSERT INTO survey_answers (submission_id,question_id,value_json) VALUES (?,?,?)').bind(value.id,question,JSON.stringify(answer)));
    try{await env.DB.batch(statements);}catch(error){const concurrent=await existing();if(concurrent)return receipt(concurrent);throw error;}
    return reply(201,{ok:true,submissionId:value.id});
  }catch{
    // Neither payloads nor database errors are written to logs or returned to visitors.
    return reply(503,{ok:false,error:'Não foi possível registrar agora. Tente novamente.'});
  }
}
