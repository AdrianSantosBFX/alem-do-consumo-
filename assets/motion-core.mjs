// Playback ownership keeps interrupted transitions from hiding content or leaking loops.
export function createPlayback(animate){
  const active=new Set();
  let enabled=true;
  function stop(record){
    if(!active.delete(record))return;
    record.control.cancel();
    for(const [element,styles] of record.styles)for(const [property,value] of styles){
      if(value)element.style.setProperty(property,value);else element.style.removeProperty(property);
    }
  }
  function clear(scope){for(const record of [...active])if(!scope||record.scope===scope)stop(record);}
  function run(subject,keyframes,options={},settings={}){
    const elements=(Array.isArray(subject)?subject:[subject]).filter(Boolean);
    if(!enabled||!elements.length)return;
    for(const record of [...active])if(record.styles.some(([element])=>elements.includes(element)))stop(record);
    const styles=elements.map(element=>[element,Object.keys(keyframes).map(property=>[property,element.style.getPropertyValue(property)])]);
    const control=animate(elements,keyframes,options);
    const record={control,styles,scope:settings.scope};active.add(record);
    if(!settings.hold)Promise.resolve(control).then(()=>stop(record),()=>stop(record));
    return record;
  }
  return {run,clear,setEnabled(value){enabled=value;if(!value)clear();},get size(){return active.size;}};
}
