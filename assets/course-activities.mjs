import {escapeHtml as e} from '../html.mjs';
import {activityResult} from './journey-model.mjs';

// One question at a time, with an explicit next action. Feedback never disappears
// on a timer; keyboard and touch use the same controls as pointer input.
export function createSequence(host,block,{getRecord,submit,getCompleted=()=>false}){
  const isScenario=block.type==='scenario',isGame=block.type==='sort-game';
  const label=isScenario?'SITUAÇÃO DO COTIDIANO':isGame?'MINIJOGO':'RETOME AS IDEIAS';
  const needed=Math.ceil(block.questions.length*(block.minScore??1));
  let running=false;
  function shell(content){
    host.innerHTML=`<p class="eyebrow">${label}</p><h3>${e(block.title)}</h3>${content}`;
  }
  function focus(selector){host.querySelector(selector)?.focus({preventScroll:true});}
  function showResult(record){
    running=false;
    const result=activityResult(block,record);
    const selected=block.questions[0];
    const message=isScenario?(selected.feedback?.[record.values[0]]||selected.explanation):`Você acertou ${result.correct} de ${result.total}. ${result.passed?'Atividade concluída.':'O mínimo para concluir é '+needed+' de '+result.total+'. Reveja as explicações e tente novamente.'}`;
    shell(`<div class="sequence-result ${result.passed?'is-passed':'needs-review'}"><span class="result-symbol" aria-hidden="true">${result.passed?'✓':'↺'}</span><h4 tabindex="-1">${result.passed?(isScenario?'Uma escolha com mais consciência.':isGame?'Você concluiu o desafio.':'Avaliação concluída.'):'Vamos tentar mais uma vez?'}</h4><p class="sequence-feedback" role="status">${e(message)}</p>${!result.passed?'<button class="button" type="button" data-retry>Tentar novamente ↺</button>':'<p class="sequence-next-hint">'+(getCompleted()?'Etapa concluída. Você pode rever as explicações.':'Use o botão ao final da etapa para continuar.')+'</p>'}</div><details class="sequence-review"><summary>Rever respostas e explicações</summary><ol>${block.questions.map((q,i)=>`<li><strong>${e(q.prompt)}</strong><p>Sua resposta: ${e(q.options[record.values[i]])}</p><p class="review-verdict">${record.values[i]===q.answer?'Resposta correta.':'Resposta esperada: '+e(q.options[q.answer])+'.'}</p><p>${e(q.explanation)}</p></li>`).join('')}</ol></details>`);
    host.querySelector('[data-retry]')?.addEventListener('click',()=>start());
  }
  function start(){
    running=true;let index=0;const values=[];
    function showQuestion(){
      const question=block.questions[index];
      shell(`${isScenario?`<div class="scenario-context">${e(block.context||'Situação fictícia')}</div><div class="scenario-message"><span aria-hidden="true">${e((block.character||'?').slice(0,1))}</span><div><strong>${e(block.character||'Uma pessoa')}</strong><p>${e(block.situation||'')}</p></div></div>`:''}<div class="sequence-progress"><span>${isGame?'Decisão':'Questão'} ${index+1} de ${block.questions.length}</span><div aria-hidden="true">${block.questions.map((_,i)=>`<i class="${i<index?'done':i===index?'current':''}"></i>`).join('')}</div></div><h4 class="sequence-question" tabindex="-1">${e(question.prompt)}</h4><div class="sequence-options" role="group" aria-label="Escolha sua resposta">${question.options.map((option,i)=>`<button type="button" class="sequence-option" data-choice="${i}"><span aria-hidden="true">${isGame?(i===0?'↻':'→'):String.fromCharCode(65+i)}</span><span>${e(option)}</span><span class="choice-mark" aria-hidden="true"></span></button>`).join('')}</div><div class="sequence-feedback" role="status" hidden></div><button class="button sequence-next" type="button" hidden>${index+1===block.questions.length?'Ver resultado':'Continuar'} →</button>`);
      focus('.sequence-question');
      const buttons=[...host.querySelectorAll('[data-choice]')];
      buttons.forEach(button=>button.addEventListener('click',()=>{
        if(button.disabled)return;
        const value=Number(button.dataset.choice),correct=value===question.answer;
        values[index]=value;
        buttons.forEach((item,i)=>{item.disabled=true;if(i===question.answer){item.classList.add('correct');item.querySelector('.choice-mark').textContent='✓';}});
        if(!correct){button.classList.add('incorrect');button.querySelector('.choice-mark').textContent='×';}
        const feedback=host.querySelector('.sequence-feedback');feedback.hidden=false;feedback.dataset.correct=String(correct);
        feedback.textContent=(correct?'Isso mesmo. ':'Vamos retomar. ')+(question.feedback?.[value]||question.explanation);
        const next=host.querySelector('.sequence-next');next.hidden=false;
        next.addEventListener('click',()=>{index++;if(index<block.questions.length)showQuestion();else{running=false;submit([...values]);showResult(getRecord());focus('.sequence-result h4');}},{once:true});
        next.focus({preventScroll:true});
      }));
    }
    showQuestion();
  }
  return {refresh(){
    if(running)return;
    const record=getRecord();
    if(record?.submitted){showResult(record);return;}
    if(isScenario){start();return;}
    shell(`<p class="sequence-intro">${isGame?'Classifique quatro decisões. Escolha uma resposta, leia a explicação e siga para a próxima.':'Responda a quatro situações, uma de cada vez. Leia o feedback após cada escolha.'}</p><p class="sequence-rule">${needed} de ${block.questions.length} acertos para concluir · novas tentativas permitidas · sem limite de tempo</p><button class="button" type="button" data-start>${isGame?'Começar desafio':'Iniciar avaliação'} →</button>`);
    host.querySelector('[data-start]').addEventListener('click',start);
  }};
}
