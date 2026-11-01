import {restoreJourney,activityResult,canAdvance,submitActivity,finishChapter} from './journey-model.mjs';

const host=document.querySelector('[data-journey]');
if(host) {
  const definition=JSON.parse(document.getElementById('journey-data').textContent);
  const key=`alem-do-consumo:journey:${definition.id}:v${definition.version}`;
  let raw=null,storageAvailable=true;
  try {raw=JSON.parse(localStorage.getItem(key)||'null');}catch{storageAvailable=false;}
  let state=restoreJourney(definition,raw);
  const chapters=[...host.querySelectorAll('.journey-chapter')];
  const links=[...host.querySelectorAll('[data-journey-link]')];
  const forms=[...host.querySelectorAll('[data-activity]')];
  const outline=host.querySelector('.journey-outline');
  const smallScreen=matchMedia('(max-width: 800px)');
  outline.open=!smallScreen.matches;
  smallScreen.addEventListener('change',event=>{outline.open=!event.matches;});
  function save() {
    try {localStorage.setItem(key,JSON.stringify(state));storageAvailable=true;}
    catch {storageAvailable=false;}
  }
  function announceCompletion() {
    if(!definition.isOrientation && state.done.length===definition.chapters.length) {
      document.dispatchEvent(new CustomEvent('course:completed',{detail:{lessonId:definition.id}}));
    }
  }
  function showActivity(form,block) {
    const record=state.answers[block.id];
    if(!record?.submitted)return;
    const result=activityResult(block,record);
    form.classList.toggle('is-passed',result.passed);
    const groups=[...form.querySelectorAll('fieldset')];
    groups.forEach((group,index)=>{
      const chosen=record.values[index];
      group.querySelectorAll('input').forEach(input=>{input.checked=Number(input.value)===chosen;input.disabled=result.passed;});
      const correct=chosen===block.questions[index].answer;
      const feedback=group.querySelector('[data-question-feedback]');
      feedback.hidden=false;
      feedback.textContent=(correct?'Isso mesmo. ':'Vamos retomar. ')+block.questions[index].explanation;
    });
    const message=form.querySelector('.activity-feedback');
    message.textContent=result.passed?'Atividade concluída. A próxima etapa está pronta para você.':`Você acertou ${result.correct} de ${result.total}. Releia o feedback e tente novamente.`;
    const submit=form.querySelector('button[type="submit"]');
    submit.disabled=result.passed;
    submit.textContent=result.passed?'Resposta conferida ✓':'Tentar novamente →';
  }
  function refresh() {
    const maxUnlocked=Math.min(state.done.length,chapters.length-1);
    chapters.forEach((section,index)=>{
      const chapter=definition.chapters[index];
      const unlocked=index<=maxUnlocked;
      const done=state.done.includes(chapter.id);
      section.hidden=index>maxUnlocked+1;
      section.classList.toggle('is-complete',done);
      section.querySelector('.chapter-content').hidden=!unlocked;
      section.querySelector('.chapter-lock').hidden=unlocked;
      const actions=section.querySelector('.chapter-actions');
      actions.hidden=!unlocked||done;
      const button=section.querySelector('[data-finish-chapter]');
      button.disabled=!canAdvance(chapter,state);
      section.querySelector('.chapter-hint').textContent=button.disabled?'Participe da atividade e confira sua resposta para continuar.':'';
      section.querySelector('.chapter-completed').hidden=!done;
      links[index].setAttribute('aria-disabled',String(!unlocked));
      links[index].tabIndex=unlocked?0:-1;
      links[index].classList.toggle('is-done',done);
      if(chapter.id===state.current)links[index].setAttribute('aria-current','step');else links[index].removeAttribute('aria-current');
      links[index].querySelector('.journey-link-status').textContent=done?'✓':unlocked?'→':'·';
      links[index].setAttribute('aria-label',`${chapter.title}${done?' — concluída':!unlocked?' — conclua a etapa anterior':''}`);
    });
    host.querySelectorAll('.journey-meter progress').forEach(bar=>{bar.value=state.done.length;bar.textContent=`${state.done.length} de ${chapters.length}`;});
    host.querySelector('[data-journey-count]').textContent=`${state.done.length} de ${chapters.length} etapas`;
    host.querySelector('.journey-storage').textContent=storageAvailable?'Progresso salvo só neste navegador.':'Não foi possível salvar neste navegador. Seu progresso vale apenas durante esta visita.';
    host.querySelector('.journey-finished').hidden=state.done.length!==chapters.length;
    forms.forEach(form=>showActivity(form,definition.chapters.flatMap(c=>c.blocks).find(b=>b.id===form.dataset.activity)));
    resume.hidden=state.done.length===0||state.done.length===chapters.length;
  }
  function moveTo(node) {
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off';
    node.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
    node.focus({preventScroll:true});
  }
  const resume=document.createElement('button');
  resume.type='button';resume.className='journey-resume text-link';resume.textContent='Retomar minha etapa ↓';
  host.querySelector('.journey-meter').after(resume);
  resume.addEventListener('click',()=>moveTo(chapters[definition.chapters.findIndex(c=>c.id===state.current)].querySelector('.chapter-heading h2')));
  forms.forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();
    const block=definition.chapters.flatMap(c=>c.blocks).find(b=>b.id===form.dataset.activity);
    const data=new FormData(form);
    const values=block.questions.map((_,index)=>data.get(`${block.id}-${index}`)).map(value=>value===null?null:Number(value));
    state=submitActivity(definition,state,block.id,values);save();refresh();
  }));
  host.querySelectorAll('[data-finish-chapter]').forEach(button=>button.addEventListener('click',()=>{
    const index=Number(button.dataset.finishChapter);
    const before=state.done.length;
    state=finishChapter(definition,state,definition.chapters[index].id);
    if(state.done.length===before)return;
    save();refresh();announceCompletion();
    const target=state.done.length===chapters.length?host.querySelector('#journey-finished-title'):chapters[index+1].querySelector('.chapter-heading h2');
    moveTo(target);
  }));
  links.forEach((link,index)=>link.addEventListener('click',event=>{
    event.preventDefault();
    if(index>state.done.length)return;
    state.current=definition.chapters[index].id;save();refresh();
    if(smallScreen.matches)outline.open=false;
    moveTo(chapters[index].querySelector('.chapter-heading h2'));
  }));
  // Scroll updates the journey marker but never moves or captures the reader's scroll.
  if('IntersectionObserver'in window) {
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting && !entry.target.closest('[hidden]')){
        const index=Number(entry.target.closest('[data-chapter-index]').dataset.chapterIndex);
        if(index>state.done.length)continue;
        state.current=definition.chapters[index].id;
        links.forEach((link,i)=>{if(i===index)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
      }
    },{rootMargin:'-10% 0px -55% 0px',threshold:0});
    chapters.forEach(section=>observer.observe(section.querySelector('.chapter-heading')));
  }
  refresh();announceCompletion();
}
