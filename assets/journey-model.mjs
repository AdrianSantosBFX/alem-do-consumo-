// State and progression rules, kept independent from the browser for verification.
export const interactive = block => ['quiz','checkpoint','scenario','sort-game'].includes(block.type);
export const activityResult = (block, record) => {
  const total = block.questions.length;
  const correct = block.questions.reduce((sum,q,index)=>sum+(record?.values?.[index]===q.answer?1:0),0);
  return {correct,total,score:correct/total,passed:!!record?.submitted && correct/total >= (block.minScore ?? 1)};
};
export const canAdvance = (chapter,state) => chapter.blocks.filter(b=>interactive(b)&&b.required!==false).every(b=>activityResult(b,state.answers[b.id]).passed);
export function restoreJourney(definition, raw) {
  const blank={version:definition.version,done:[],answers:{},current:definition.chapters[0].id};
  if (!raw || raw.version!==definition.version) return blank;
  for(const block of definition.chapters.flatMap(c=>c.blocks).filter(interactive)) {
    const stored=raw.answers?.[block.id];
    if (!stored || !Array.isArray(stored.values)) continue;
    const values=block.questions.map((q,index)=>Number.isInteger(stored.values[index]) && stored.values[index]>=0 && stored.values[index]<q.options.length ? stored.values[index] : null);
    blank.answers[block.id]={values,submitted:stored.submitted===true};
  }
  for (const chapter of definition.chapters) {
    if (!Array.isArray(raw.done) || !raw.done.includes(chapter.id) || !canAdvance(chapter,blank)) break;
    blank.done.push(chapter.id);
  }
  const max=Math.min(blank.done.length,definition.chapters.length-1);
  const requested=definition.chapters.findIndex(c=>c.id===raw.current);
  blank.current=definition.chapters[requested>=0 && requested<=max?requested:max].id;
  return blank;
}
export function submitActivity(definition,state,blockId,values) {
  const chapter=definition.chapters.find(c=>c.blocks.some(b=>b.id===blockId));
  if(!chapter || definition.chapters.indexOf(chapter)>state.done.length) return state;
  const block=chapter.blocks.find(b=>b.id===blockId && interactive(b));
  if(!block || !Array.isArray(values) || values.length!==block.questions.length || values.some((v,i)=>!Number.isInteger(v)||v<0||v>=block.questions[i].options.length)) return state;
  // Passing an activity stays valid; later reviews cannot relock completed stages.
  if(activityResult(block,state.answers[blockId]).passed) return state;
  return {...state,answers:{...state.answers,[blockId]:{values:[...values],submitted:true}}};
}
export function finishChapter(definition,state,chapterId) {
  const index=definition.chapters.findIndex(c=>c.id===chapterId);
  if(index<0 || index>state.done.length || !canAdvance(definition.chapters[index],state)) return state;
  const done=[...new Set([...state.done,chapterId])];
  return {...state,done,current:definition.chapters[Math.min(done.length,definition.chapters.length-1)].id};
}
export const journeyProgress=(definition,state)=>Math.round(state.done.length/definition.chapters.length*100);
