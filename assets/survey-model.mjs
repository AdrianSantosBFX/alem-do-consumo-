export function validateSurvey(survey) {
  if(survey.mode!=='preview')throw new Error('Esta versão permite somente prévia sem coleta de respostas.');
  if(!Array.isArray(survey.questions)||!survey.questions.length)throw new Error('A prévia precisa de perguntas.');
  const ids=new Set();
  for(const question of survey.questions) {
    if(!/^[a-z0-9-]+$/.test(question.id)||ids.has(question.id))throw new Error('Identificador de pergunta inválido ou repetido.');
    ids.add(question.id);
    if(typeof question.title!=='string'||!question.title.trim())throw new Error('Pergunta sem título.');
    if(!Array.isArray(question.options)||question.options.length<2)throw new Error('Pergunta sem alternativas.');
    if(question.options.some(value=>typeof value!=='string'||!value.trim()))throw new Error('Alternativa vazia.');
    if(!question.options.includes('Prefiro não responder.'))throw new Error('Inclua a opção de não responder.');
  }
}
export const newSurvey=()=>({step:-1,answers:{}});
export const startSurvey=()=>({step:0,answers:{}});
export function selectAnswer(survey,state,index) {
  const question=survey.questions[state.step];
  if(!question||!Number.isInteger(index)||index<0||index>=question.options.length)return state;
  return {...state,answers:{...state.answers,[question.id]:index}};
}
export const canContinue=(survey,state)=>{
  const question=survey.questions[state.step];
  const index=question && state.answers[question.id];
  return Number.isInteger(index)&&index>=0&&index<question.options.length;
};
export function nextQuestion(survey,state) {
  return canContinue(survey,state)?{...state,step:Math.min(state.step+1,survey.questions.length)}:state;
}
export const previousQuestion=state=>({...state,step:Math.max(-1,state.step-1)});
