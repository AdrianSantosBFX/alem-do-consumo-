import {escapeHtml as e} from './html.mjs';
import {newSurvey,startSurvey,selectAnswer,canContinue,nextQuestion,previousQuestion} from './assets/survey-model.mjs';

document.querySelectorAll('[data-open-dialog]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.openDialog).showModal()));
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));

const surveyData=document.getElementById('survey-data');
if(surveyData) {
  const survey=JSON.parse(surveyData.textContent),card=document.getElementById('survey-card'),screen=document.querySelector('.research-screen');
  let state=newSurvey();
  function render({focus=true}={}) {
    screen.classList.toggle('is-started',state.step>=0);
    if(state.step>=survey.questions.length) {
      card.innerHTML='<div class="survey-finish"><span class="finish-mark" aria-hidden="true">✓</span><p class="eyebrow">FIM DA PRÉVIA</p><h2 tabindex="-1">Você percorreu<br>as perguntas.</h2><p class="survey-description">Nenhuma resposta foi enviada ou salva. O questionário final e a coleta serão definidos em outra etapa.</p><button type="button" class="button" data-restart-survey>Recomeçar prévia <span aria-hidden="true">↻</span></button><a class="text-link" href="/">Voltar ao projeto <span aria-hidden="true">→</span></a></div>';
    } else if(state.step>=0) {
      const question=survey.questions[state.step];
      card.innerHTML=`<div class="survey-progress"><span>Pergunta ${state.step+1} de ${survey.questions.length}</span><span>Prévia local</span></div><progress max="${survey.questions.length}" value="${state.step}" aria-label="Perguntas percorridas"></progress><form id="question-form"><fieldset><legend><h2 tabindex="-1">${e(question.title)}</h2></legend><div class="survey-options">${question.options.map((option,index)=>`<label class="survey-option"><input type="radio" name="answer" value="${index}" required${state.answers[question.id]===index?' checked':''}><span>${e(option)}</span></label>`).join('')}</div></fieldset><div class="survey-actions"><button type="button" class="text-link" data-previous-question>← Voltar</button><button class="button" type="submit"${canContinue(survey,state)?'':' disabled'}>${state.step===survey.questions.length-1?'Concluir prévia':'Continuar'} <span aria-hidden="true">→</span></button></div></form><p class="survey-local-note">Você pode escolher não responder. Nenhuma resposta é enviada.</p>`;
    } else {location.reload();return;}
    card.scrollTop=0;
    if(focus)card.querySelector('h2').focus({preventScroll:true});
  }
  card.addEventListener('click',event=>{
    if(event.target.closest('[data-start-survey]')){state=startSurvey();render();}
    if(event.target.closest('[data-restart-survey]')){state=startSurvey();render();}
    if(event.target.closest('[data-previous-question]')){state=previousQuestion(state);render();}
  });
  card.addEventListener('change',event=>{
    if(!event.target.matches('input[name="answer"]'))return;
    state=selectAnswer(survey,state,Number(event.target.value));
    card.querySelector('button[type="submit"]').disabled=!canContinue(survey,state);
  });
  card.addEventListener('submit',event=>{event.preventDefault();const next=nextQuestion(survey,state);if(next!==state){state=next;render();}});
}
