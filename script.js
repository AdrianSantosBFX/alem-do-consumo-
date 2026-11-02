import {createSurveySender} from './assets/survey-client.mjs';
import {animateSurvey,animateSelection,animateDialog} from './assets/motion.js';
import {escapeHtml as e} from './html.mjs';
import {newSurvey,startSurvey,setConsent,setLocation,selectAnswer,clearAnswer,canContinue,nextQuestion,previousQuestion,answeredCount} from './assets/survey-model.mjs';
import {renderSurveyIntro} from './assets/survey-view.mjs';

document.querySelectorAll('[data-open-dialog]').forEach(button=>button.addEventListener('click',()=>{const dialog=document.getElementById(button.dataset.openDialog);dialog.showModal();animateDialog(dialog);}));
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));

const surveyData=document.getElementById('survey-data');
if(surveyData){
  const {localities}=await import('./assets/localities.mjs');
  const survey=JSON.parse(surveyData.textContent),card=document.getElementById('survey-card'),screen=document.querySelector('.research-screen');
  let state=newSurvey(),renderedStep=state.step,submitting=false,epoch=0;
  const sender=createSurveySender();
  const countLabel=()=>`${answeredCount(state)} respondida${answeredCount(state)===1?'':'s'}`;
  const actions=label=>`<div class="survey-actions"><button type="button" class="text-link" data-previous-question>← Anterior</button><button class="button" type="submit">${label} <span aria-hidden="true">→</span></button></div>`;
  function render({focus=true}={}){
    screen.classList.toggle('is-started',state.step>=-1);
    if(state.step===-2)card.innerHTML=renderSurveyIntro(survey,state);
    else if(state.step===-1){
      card.innerHTML=`<p class="eyebrow">LOCALIZAÇÃO OPCIONAL</p><h2 tabindex="-1">De onde você participa?</h2><p class="survey-description">Você pode deixar os dois campos em branco e seguir para as perguntas.</p><form id="location-form" autocomplete="off"><div class="survey-location"><label class="survey-field" for="survey-uf">Estado (UF) — opcional<select id="survey-uf" name="uf"><option value="">Prefiro não informar</option>${localities.map(s=>`<option value="${s.uf}"${state.location.uf===s.uf?' selected':''}>${e(s.name)} (${s.uf})</option>`).join('')}</select></label><label class="survey-field" for="survey-city">Cidade — opcional<select id="survey-city" name="city" aria-describedby="city-hint"></select></label><p class="survey-hint" id="city-hint">Escolha um estado para ver os municípios. A cidade também pode ficar em branco.</p></div>${actions('Próxima')}</form><p class="survey-local-note">A localização será enviada junto com as respostas somente ao concluir.</p>`;
      renderCities();
    }else if(state.step>=survey.questions.length){
      card.innerHTML=`<div class="survey-finish"><span class="finish-mark" aria-hidden="true">✓</span><p class="eyebrow">PESQUISA CONCLUÍDA</p><h2 tabindex="-1">Obrigado por participar!</h2><div class="survey-progress"><span>${survey.questions.length} de ${survey.questions.length} perguntas percorridas</span><span>100%</span></div><progress max="${survey.questions.length}" value="${survey.questions.length}" aria-label="Progresso da pesquisa"></progress><p class="survey-description">Suas respostas foram enviadas e registradas para a pesquisa do Além do Consumo, sem identificação pessoal solicitada. O preenchimento foi apagado desta página.</p><p class="survey-description">O Além do Consumo está preparando novas atividades educativas sobre sustentabilidade e consumo consciente.</p><a class="button" href="/">Voltar à página inicial <span aria-hidden="true">→</span></a><a class="text-link" href="/resultados/">Ver resultados gerais <span aria-hidden="true">↗</span></a><button type="button" class="text-link" data-restart-survey>Reiniciar pesquisa <span aria-hidden="true">↻</span></button></div>`;
    }else{
      const q=survey.questions[state.step],answer=state.answers[q.id],section=survey.sections.find(s=>s.id===q.section);
      const options=q.type==='scale'?Array.from({length:q.max-q.min+1},(_,i)=>q.min+i):q.options;
      const hint=q.type==='multiple'?(q.maxSelections?`Escolha até ${q.maxSelections} alternativas.`:'Você pode escolher mais de uma alternativa.'):(q.type==='scale'?'Escolha um número de 0 a 10.':'Escolha uma alternativa.');
      card.innerHTML=`<div class="survey-progress"><span>Pergunta ${state.step+1} de ${survey.questions.length}</span><span id="answered-count">${countLabel()}</span></div><progress max="${survey.questions.length}" value="${state.step}" aria-label="Perguntas percorridas"></progress><p class="eyebrow survey-section">${e(section.title)}</p><form id="question-form" autocomplete="off"><fieldset aria-describedby="question-hint question-error"><legend><h2 tabindex="-1">${e(q.title)}</h2></legend><p class="survey-hint" id="question-hint">${hint} Resposta opcional.</p><div class="survey-options${q.type==='scale'?' survey-scale':''}">${options.map((option,i)=>{const value=q.type==='scale'?option:i;const checked=q.type==='multiple'?answer?.includes(value):answer===value;return `<label class="survey-option"><input type="${q.type==='multiple'?'checkbox':'radio'}" name="answer" value="${value}"${checked?' checked':''}><span>${e(String(option))}</span></label>`;}).join('')}</div></fieldset><p id="question-error" class="survey-error" role="alert" aria-atomic="true"></p><button class="text-link survey-clear" type="button" data-clear-answer${answer===undefined||Array.isArray(answer)&&!answer.length?' disabled':''}>Limpar resposta</button>${actions(state.step===survey.questions.length-1?'Enviar respostas':'Próxima')}<p id="survey-submit-error" class="survey-error" role="alert" tabindex="-1"></p></form><p class="survey-local-note">Perguntas opcionais. As respostas serão enviadas somente ao concluir.</p>`;
    }
    card.scrollTop=0;
    const direction=state.step<renderedStep?-1:1;renderedStep=state.step;
    if(focus)animateSurvey(card,{direction});
    if(focus)card.querySelector('h2').focus({preventScroll:true});
  }
  function renderCities(){
    const select=card.querySelector('#survey-city'),uf=localities.find(s=>s.uf===state.location.uf);
    select.disabled=!uf;
    select.innerHTML='<option value="">Prefiro não informar</option>'+(uf?uf.cities.map(c=>`<option value="${c.id}"${state.location.city===c.id?' selected':''}>${e(c.name)}</option>`).join(''):'');
  }
  function updateAnswerUI(){
    const q=survey.questions[state.step],answer=state.answers[q.id];
    card.querySelectorAll('input[name="answer"]').forEach(input=>{input.checked=q.type==='multiple'?Boolean(answer?.includes(Number(input.value))):answer===Number(input.value);});
    card.querySelector('[data-clear-answer]').disabled=answer===undefined||Array.isArray(answer)&&!answer.length;
    card.querySelector('#answered-count').textContent=countLabel();
  }
  card.addEventListener('click',event=>{
    if(submitting)return;
    if(event.target.closest('[data-restart-survey]')){epoch++;sender.reset();state=newSurvey();render();}
    if(event.target.closest('[data-previous-question]')){state=previousQuestion(state);render();}
    if(event.target.closest('[data-clear-answer]')){state=clearAnswer(survey,state);updateAnswerUI();card.querySelector('#question-error').textContent='';card.querySelector('input[name="answer"]').focus();}
  });
  card.addEventListener('change',event=>{
    if(submitting)return;
    const input=event.target;
    if(['adult','voluntary'].includes(input.name)){state=setConsent(state,input.name,input.checked);return;}
    if(input.name==='uf'||input.name==='city'){state=setLocation(state,localities,input.name,input.value);if(input.name==='uf')renderCities();return;}
    if(input.name!=='answer')return;
    const next=selectAnswer(survey,state,Number(input.value));
    card.querySelector('#question-error').textContent=next===state?`Você pode selecionar até ${survey.questions[state.step].maxSelections} alternativas. Desmarque uma para escolher outra.`:'';
    const invalid=next===state;state=next;updateAnswerUI();
    animateSelection(input.closest('.survey-option'),{invalid});
  });
  card.addEventListener('submit',async event=>{
    // Prevent native form navigation even when optional answers are blank.
    event.preventDefault();
    if(submitting)return;
    if(event.target.id==='intro-form'){
      const next=startSurvey(state);if(next===state)return;state=next;render();return;
    }
    if(!canContinue(survey,state))return;
    if(state.step===survey.questions.length-1){
      submitting=true;const current=epoch;
      const controls=[...card.querySelectorAll('input,select,button')].map(element=>[element,element.disabled]);
      controls.forEach(([element])=>{element.disabled=true;});
      const button=card.querySelector('button[type="submit"]'),label=button.innerHTML,error=card.querySelector('#survey-submit-error');
      error.textContent='';button.textContent='Enviando…';card.setAttribute('aria-busy','true');
      try{
        await sender.send({surveyId:survey.id,version:survey.version,consentVersion:survey.consentVersion,adult:state.adult,voluntary:state.voluntary,location:state.location,answers:state.answers});
        if(current!==epoch)return;
        state=nextQuestion(survey,state);sender.reset();render();
      }catch(problem){if(current===epoch){error.textContent=problem.message;error.focus({preventScroll:true});}}
      finally{if(current===epoch){submitting=false;card.removeAttribute('aria-busy');for(const [element,disabled] of controls)if(element.isConnected)element.disabled=disabled;if(button.isConnected)button.innerHTML=label;}}
      return;
    }
    state=nextQuestion(survey,state);render();
  });
  // BFCache must not restore a completed or abandoned participation.
  window.addEventListener('pagehide',()=>{epoch++;sender.reset();submitting=false;card.removeAttribute('aria-busy');state=newSurvey();render({focus:false});});
  window.addEventListener('pageshow',event=>{if(event.persisted){epoch++;sender.reset();submitting=false;card.removeAttribute('aria-busy');state=newSurvey();render({focus:false});}});
  render({focus:false});
}
