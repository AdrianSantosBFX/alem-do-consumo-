import {escapeHtml as e} from './html.mjs';

const durationLabel=minutes=>minutes<1?`${Math.round(minutes*60)} s`:`${new Intl.NumberFormat('pt-BR').format(minutes)} min`;
const kinds={intro:'Para começar',content:'Leitura',interaction:'Explore',activity:'Na prática',checkpoint:'Retome as ideias'};
const safeId=value=>typeof value==='string' && /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(value);
const required=(value,label)=>{if(typeof value!=='string'||!value.trim())throw new Error(`${label}: texto obrigatório.`);};
export function validateJourney(definition) {
  if(!safeId(definition.id)||!Number.isInteger(definition.version)||definition.version<1)throw new Error('Identificação ou versão do percurso inválida.');
  required(definition.title,'Título do percurso');required(definition.description,'Descrição do percurso');
  if(!Array.isArray(definition.chapters)||!definition.chapters.length)throw new Error('Percurso sem etapas.');
  const chapterIds=new Set(),blockIds=new Set();
  for(const chapter of definition.chapters) {
    if(!safeId(chapter.id)||chapterIds.has(chapter.id))throw new Error('Identificador de etapa inválido ou duplicado.');chapterIds.add(chapter.id);
    required(chapter.title,'Título da etapa');
    if(chapter.minutes!==undefined&&(!Number.isFinite(chapter.minutes)||chapter.minutes<=0))throw new Error('Duração da etapa inválida.');
    if(chapter.theme&&!['hero','white','light','blue','final'].includes(chapter.theme))throw new Error('Tema de etapa inválido.');
    if(!(chapter.kind in kinds))throw new Error('Tipo de etapa inválido.');
    if(!Array.isArray(chapter.blocks)||!chapter.blocks.length)throw new Error('Etapa sem blocos.');
    for(const block of chapter.blocks) {
      if(['text','highlight'].includes(block.type)) required(block.text,'Texto do bloco');
      else if(['cards','flashcards','accordion','steps'].includes(block.type)) {
        if(!Array.isArray(block.items)||!block.items.length)throw new Error('Bloco sem itens.');
        block.items.forEach(item=>{required(item.title,'Título do item');required(item.text,'Texto do item');});
      } else if(['quiz','checkpoint','scenario','sort-game'].includes(block.type)) {
        if(!safeId(block.id)||blockIds.has(block.id))throw new Error('Identificador de atividade inválido ou duplicado.');blockIds.add(block.id);
        if(!Array.isArray(block.questions)||!block.questions.length)throw new Error('Atividade sem perguntas.');
        if(block.minScore!==undefined && (typeof block.minScore!=='number'||block.minScore<=0||block.minScore>1))throw new Error('Nota mínima inválida.');
        block.questions.forEach(q=>{
          required(q.prompt,'Pergunta');required(q.explanation,'Explicação');
          if(!Array.isArray(q.options)||q.options.length<2||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)throw new Error('Alternativas ou resposta inválidas.');
          q.options.forEach(option=>required(option,'Alternativa'));
          if(q.feedback && (!Array.isArray(q.feedback)||q.feedback.length!==q.options.length||q.feedback.some(value=>typeof value!=='string'||!value.trim())))throw new Error('Feedback das alternativas inválido.');
        });
      } else throw new Error(`Bloco de percurso não suportado: ${block.type}`);
    }
  }
}
function renderBlock(block) {
  const title=block.title?`<h3>${e(block.title)}</h3>`:'';
  if(block.type==='text')return `<div class="journey-text reading-body"><p>${e(block.text)}</p></div>`;
  if(block.type==='highlight')return `<aside class="journey-highlight"><span aria-hidden="true">↳</span><p>${e(block.text)}</p></aside>`;
  if(block.type==='flashcards')return `<div class="journey-block flashcard-block">${title}<p class="block-instruction">Toque em uma pergunta para revelar a resposta.</p><div class="flashcard-grid">${block.items.map(item=>`<details class="flashcard"><summary>${e(item.title)}<span aria-hidden="true">↗</span></summary><p>${e(item.text)}</p></details>`).join('')}</div></div>`;
  if(['scenario','sort-game','checkpoint'].includes(block.type))return `<section class="journey-interactive ${block.type}" data-sequence="${e(block.id)}" aria-label="${e(block.title||'Atividade interativa')}"><p>Ative JavaScript para participar desta atividade.</p></section>`;
  if(block.type==='cards')return `<div class="journey-block">${title}<div class="discovery-cards">${block.items.map((item,index)=>`<details class="discovery-card"><summary><span class="discovery-number">0${index+1}</span><span>${e(item.title)}</span><span class="discovery-plus" aria-hidden="true">+</span></summary><p>${e(item.text)}</p></details>`).join('')}</div></div>`;
  if(block.type==='accordion')return `<div class="journey-block journey-accordion">${title}${block.items.map(item=>`<details><summary>${e(item.title)}<span aria-hidden="true">+</span></summary><p>${e(item.text)}</p></details>`).join('')}</div>`;
  if(block.type==='steps')return `<div class="journey-block">${title}<ol class="journey-steps">${block.items.map((item,index)=>`<li><span>${String(index+1).padStart(2,'0')}</span><div><h4>${e(item.title)}</h4><p>${e(item.text)}</p></div></li>`).join('')}</ol></div>`;
  return `<form class="journey-quiz" data-activity="${block.id}"><p class="eyebrow">${block.type==='checkpoint'?'CHECKPOINT':'EXPERIMENTE'} · ${block.required===false?'OPCIONAL':'ATIVIDADE DA ETAPA'}</p>${title}${block.questions.map((q,index)=>`<fieldset><legend>${e(q.prompt)}</legend>${q.options.map((option,i)=>`<label class="quiz-option"><input type="radio" name="${block.id}-${index}" value="${i}" required><span class="option-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span>${e(option)}</span></label>`).join('')}<p class="question-explanation" data-question-feedback="${index}" hidden></p></fieldset>`).join('')}<button class="button" type="submit">Conferir resposta <span aria-hidden="true">→</span></button><p class="activity-feedback" role="status" aria-live="polite"></p></form>`;
}
export function renderJourney(definition,{returnUrl='/aprenda/',references='',lessonNavigation=''}={}) {
  validateJourney(definition);
  const total=definition.chapters.length;
  return `<div class="journey-shell" data-journey><div class="journey-topbar section-shell"><a href="${returnUrl}" class="back-link">← Voltar ao curso</a><span>${definition.isOrientation?'APRESENTAÇÃO DO FORMATO':'PERCURSO DE APRENDIZAGEM'} · ${definition.durationMin?`CERCA DE ${e(definition.durationMin)} MIN · `:''}NO SEU TEMPO</span></div><div class="journey-layout section-shell"><aside class="journey-aside"><p class="eyebrow">${definition.isOrientation?'ANTES DE COMEÇAR':'SEU PERCURSO'}</p><h2>${e(definition.title)}</h2><p class="journey-disclaimer">${definition.isOrientation?'Esta apresentação não entra no progresso dos seis módulos.':'Seu progresso fica somente neste navegador.'}</p><div class="journey-meter"><progress value="0" max="${total}" aria-label="Etapas concluídas"></progress><span data-journey-count>0 de ${total} etapas</span></div><details class="journey-outline" open><summary>Etapas <span aria-hidden="true">⌄</span></summary><nav aria-label="Etapas do percurso"><ol>${definition.chapters.map((chapter,index)=>`<li><a href="#etapa-${chapter.id}" data-journey-link="${index}"><span class="journey-step-index">${String(index+1).padStart(2,'0')}</span><span>${e(chapter.title)}</span><span class="journey-link-status" aria-hidden="true"></span></a></li>`).join('')}</ol></nav></details><p class="journey-storage small-note" role="status"></p></aside><div class="journey-chapters"><header class="journey-heading"><p class="eyebrow">${definition.isOrientation?'CONHEÇA A EXPERIÊNCIA':'LEITURA E PARTICIPAÇÃO'}</p><h1>${e(definition.title)}<span class="heading-period">.</span></h1><p>${e(definition.description)}</p><div class="journey-chips"><span>${definition.durationMin?`≈ ${e(definition.durationMin)} minutos`:'No seu tempo'}</span><span>${total} etapas</span><span>Leitura + prática</span></div></header><noscript><p class="editorial-note">Os textos estão disponíveis abaixo. Ative JavaScript para usar as atividades e guardar seu progresso.</p></noscript>${definition.chapters.map((chapter,index)=>`<section class="journey-chapter kind-${chapter.kind} theme-${chapter.theme||'white'}" id="etapa-${chapter.id}" data-chapter-index="${index}"><div class="chapter-content"><header class="chapter-heading"><p class="eyebrow"><span>${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span>${kinds[chapter.kind]}${chapter.minutes?`<span class="chapter-duration">≈ ${durationLabel(chapter.minutes)}</span>`:''}</p><h2 tabindex="-1">${e(chapter.title)}</h2>${chapter.subtitle?`<p>${e(chapter.subtitle)}</p>`:''}</header><div class="chapter-blocks">${chapter.blocks.map(renderBlock).join('')}</div><div class="chapter-completed" hidden><span aria-hidden="true">✓</span><p>${e(chapter.summary || 'Etapa concluída. Você pode revisitar este conteúdo quando quiser.')}</p></div><div class="chapter-actions" hidden><p class="chapter-hint" role="status"></p><button class="button" type="button" data-finish-chapter="${index}">${index===total-1?'Concluir percurso':index===0?'Começar minha jornada':'Concluir etapa e continuar'} <span aria-hidden="true">${index===total-1?'✓':'↓'}</span></button></div></div><div class="chapter-lock" hidden><span class="lock-symbol" aria-hidden="true">↳</span><div><p class="eyebrow">PRÓXIMA ETAPA</p><h2>${e(chapter.title)}</h2><p>Conclua a etapa anterior para continuar.</p></div></div></section>`).join('')}<section class="journey-finished" hidden aria-labelledby="journey-finished-title"><span class="finished-mark" aria-hidden="true">✓</span><p class="eyebrow">${definition.isOrientation?'FORMATO EXPLORADO':'PERCURSO CONCLUÍDO'}</p><h2 id="journey-finished-title" tabindex="-1">${definition.isOrientation?'Agora você conhece o caminho.':'Um passo a mais no seu percurso.'}</h2><p>${definition.isOrientation?'Os seis módulos estão em preparação. Você já pode conhecer os temas que vão compor o curso.':'Você pode voltar às etapas e rever as referências sempre que precisar.'}</p><a class="button" href="/aprenda/">${definition.isOrientation?'Conheça os seis módulos':'Voltar ao curso'} <span aria-hidden="true">→</span></a></section>${references}${lessonNavigation}</div></div><script id="journey-data" type="application/json">${JSON.stringify(definition).replace(/</g,'\\u003c')}</script><script type="module" src="/assets/lesson-player.mjs"></script></div>`;
}
