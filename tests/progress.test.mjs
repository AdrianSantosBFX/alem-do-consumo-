import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../script.js',import.meta.url),'utf8');
function page({store=new Map(),blocked=false,ids=['m/a','m/b'],current='m/a'}={}) {
  let click;
  const label={textContent:''},meter={},storageStatus={textContent:''},lessonStatus={textContent:''};
  const button={textContent:'',attributes:{},setAttribute(name,value){this.attributes[name]=value;},addEventListener(name,fn){if(name==='click')click=fn;}};
  const checks=ids.map(id=>({dataset:{lessonCheck:id},textContent:''}));
  const document={
    querySelector(){return null;},
    getElementById(id){return {'course-data':{textContent:JSON.stringify({lessonIds:ids,currentLesson:current})},'complete-lesson':button,'lesson-status':lessonStatus}[id]||null;},
    querySelectorAll(selector){return {'[data-progress-label]':[label],'[data-course-progress]':[meter],'[data-storage-status]':[storageStatus],'[data-lesson-check]':checks}[selector]||[];}
  };
  const localStorage={getItem(key){if(blocked)throw new Error('Storage blocked');return store.get(key)||null;},setItem(key,value){if(blocked)throw new Error('Storage blocked');store.set(key,value);}};
  vm.runInNewContext(source,{document,localStorage});
  return {label,meter,storageStatus,lessonStatus,button,checks,click};
}

test('Progresso é reversível, persiste ao recarregar e ignora aulas removidas',()=>{
  const store=new Map([['alem-do-consumo:course:v1','["aula-removida"]']]);
  const first=page({store});
  assert.equal(first.label.textContent,'0 de 2 aulas concluídas');
  first.click();
  assert.equal(first.button.attributes['aria-pressed'],'true');
  assert.equal(first.meter.value,1);
  assert.equal(first.checks[0].textContent,'✓ Concluída');
  const reloaded=page({store});
  assert.equal(reloaded.label.textContent,'1 de 2 aulas concluídas');
  assert.equal(reloaded.button.textContent,'Desmarcar conclusão');
  reloaded.click();
  assert.equal(page({store}).meter.value,0);
});

test('Armazenamento bloqueado ou corrompido não impede ler ou marcar uma aula',()=>{
  const blocked=page({blocked:true});
  blocked.click();
  assert.equal(blocked.meter.value,1);
  assert.match(blocked.storageStatus.textContent,/indisponível/);
  assert.match(blocked.lessonStatus.textContent,/marcada/);
  const corrupt=page({store:new Map([['alem-do-consumo:course:v1','invalid json']])});
  assert.equal(corrupt.meter.value,0);
  corrupt.click();
  assert.equal(corrupt.meter.value,1);
  assert.equal(corrupt.storageStatus.textContent,'');
});
