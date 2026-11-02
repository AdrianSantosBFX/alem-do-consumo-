// Pure questionnaire state. No storage, networking, DOM or submission side effects.
export function validateSurvey(survey) {
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  assert(survey.mode==='preview','Esta versão permite somente prévia sem coleta de respostas.');
  assert(/^[a-z0-9-]+$/.test(survey.id)&&Number.isInteger(survey.version)&&survey.version>0,'Questionário sem identificador ou versão.');
  assert(Array.isArray(survey.sections)&&survey.sections.length>0,'Defina as seções.');
  const sections=new Set();
  for(const section of survey.sections){assert(section.id&&!sections.has(section.id)&&section.title?.trim(),'Seção inválida ou repetida.');sections.add(section.id);}
  assert(Array.isArray(survey.questions)&&survey.questions.length>0,'Defina as perguntas.');
  const ids=new Set();
  for(const q of survey.questions){
    assert(/^[a-z0-9-]+$/.test(q.id)&&!ids.has(q.id),'Identificador de pergunta inválido ou repetido.');ids.add(q.id);
    assert(typeof q.title==='string'&&q.title.trim()&&sections.has(q.section),'Pergunta sem título ou seção válida.');
    assert(['single','multiple','scale'].includes(q.type),'Tipo de pergunta inválido.');
    if(q.type==='scale')assert(Number.isInteger(q.min)&&Number.isInteger(q.max)&&q.min===0&&q.max===10,'Escala inválida.');
    else {
      assert(Array.isArray(q.options)&&q.options.length>=2&&q.options.every(o=>typeof o==='string'&&o.trim()),'Alternativas inválidas.');
      assert(new Set(q.options).size===q.options.length,'Alternativas repetidas.');
      if(q.maxSelections!==undefined)assert(q.type==='multiple'&&Number.isInteger(q.maxSelections)&&q.maxSelections>0&&q.maxSelections<=q.options.length,'Limite de seleção inválido.');
    }
  }
}
export const newSurvey=()=>({step:-2,adult:false,voluntary:false,location:{uf:'',city:''},answers:{}});
export const startSurvey=state=>state.adult&&state.voluntary?{...state,step:-1}:state;
export function setConsent(state,field,value){return ['adult','voluntary'].includes(field)?{...state,[field]:value===true}:state;}
export function setLocation(state,catalog,field,value){
  if(field==='uf')return value===''||catalog.some(s=>s.uf===value)?{...state,location:{uf:value,city:''}}:state;
  if(field==='city')return value===''||catalog.find(s=>s.uf===state.location.uf)?.cities.some(c=>c.id===value)?{...state,location:{...state.location,city:value}}:state;
  return state;
}
export function selectAnswer(survey,state,value){
  const q=survey.questions[state.step];
  if(!q||!Number.isInteger(value))return state;
  if(q.type==='scale')return value>=q.min&&value<=q.max?{...state,answers:{...state.answers,[q.id]:value}}:state;
  if(value<0||value>=q.options.length)return state;
  if(q.type==='single')return {...state,answers:{...state.answers,[q.id]:value}};
  const old=state.answers[q.id]||[];
  const selected=old.includes(value)?old.filter(v=>v!==value):[...old,value].sort((a,b)=>a-b);
  if(selected.length>(q.maxSelections??q.options.length))return state;
  return {...state,answers:{...state.answers,[q.id]:selected}};
}
export function clearAnswer(survey,state){
  const q=survey.questions[state.step];if(!q)return state;
  const answers={...state.answers};delete answers[q.id];return {...state,answers};
}
export function isValidAnswer(q,value){
  if(value===undefined)return true; // Every diagnostic question is optional.
  if(q.type==='multiple')return Array.isArray(value)&&new Set(value).size===value.length&&value.length<=(q.maxSelections??q.options.length)&&value.every(v=>Number.isInteger(v)&&v>=0&&v<q.options.length);
  return Number.isInteger(value)&&(q.type==='scale'?value>=q.min&&value<=q.max:value>=0&&value<q.options.length);
}
export function canContinue(survey,state){
  if(!state.adult||!state.voluntary)return false;
  if(state.step===-1)return true;
  const q=survey.questions[state.step];return Boolean(q)&&isValidAnswer(q,state.answers[q.id]);
}
export const answeredCount=state=>Object.values(state.answers).filter(v=>Array.isArray(v)?v.length>0:v!==undefined).length;
export function nextQuestion(survey,state){
  if(!canContinue(survey,state))return state;
  const step=state.step+1;
  // Completion discards all answers and location immediately.
  return step===survey.questions.length?{...newSurvey(),step}: {...state,step};
}
export const previousQuestion=state=>({...state,step:Math.max(-2,state.step-1)});
