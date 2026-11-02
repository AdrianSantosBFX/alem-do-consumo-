import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ComposableMap,Geographies,Geography,Marker} from 'react-simple-maps/core';
import geography from './brazil-states.json';
import {states} from './states.mjs';
import {mapColor,intensity,validateResults} from './results-model.mjs';

const number=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
const sections={previo:'Conhecimento prévio',habitos:'Hábitos de consumo',socioambiental:'Conhecimento socioambiental',percepcoes:'Percepções e interesses'};
function App(){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [updated,setUpdated]=useState(null),[selected,setSelected]=useState(''),[hovered,setHovered]=useState(''),[questionIndex,setQuestionIndex]=useState(0),[tab,setTab]=useState('map');
  const refreshRef=useRef(()=>{}),contentRef=useRef(null);
  useEffect(()=>{
    let disposed=false,busy=false,controller;
    async function refresh(){
      if(busy||disposed)return;busy=true;setLoading(true);controller=new AbortController();const active=controller,timer=setTimeout(()=>active.abort(),15000);
      try{const response=await fetch('/api/resultados',{credentials:'omit',cache:'no-store',mode:'same-origin',signal:active.signal});if(!response.ok)throw new Error();const result=validateResults(await response.json());if(!disposed){setData(result);setError('');setUpdated(new Date());}}
      catch{if(!disposed)setError('Não foi possível atualizar os resultados. Tente novamente.');}
      finally{clearTimeout(timer);busy=false;if(!disposed)setLoading(false);}
    }
    refreshRef.current=refresh;refresh();
    const interval=setInterval(()=>{if(!document.hidden)refresh();},60000);
    const visible=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',visible);
    return ()=>{disposed=true;controller?.abort();clearInterval(interval);document.removeEventListener('visibilitychange',visible);};
  },[]);
  useEffect(()=>{if(contentRef.current)contentRef.current.scrollTop=0;},[questionIndex]);
  const countFor=uf=>data?.byState.find(s=>s.uf===uf)?.count??null;
  const activeState=states.find(s=>s.uf===(hovered||selected));
  const question=data?.results.questions[questionIndex];
  const reached=data?data.byState.filter(s=>s.count>0).length:null;
  const countLabel=count=>count===null?'dados indisponíveis':`${number(count)} ${count===1?'participação':'participações'}`;
  return <div className="results-app">
    <div className="results-summary" aria-label="Resumo das participações">
      <div className="results-stat"><strong>{data?number(data.total):'—'}</strong><span>participações</span></div>
      <div className="results-stat"><strong>{data?number(reached):'—'}</strong><span>UFs alcançadas</span></div>
      <div className="results-stat"><strong>{data?number(data.unlocated):'—'}</strong><span>sem UF informada</span></div>
      <div className="results-update"><span>{updated?`Consulta às ${updated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Consulta ao banco'}</span><button className="text-link" type="button" disabled={loading} onClick={()=>refreshRef.current()}>{loading?'Atualizando…':'Atualizar ↻'}</button></div>
    </div>
    <p className="results-error" role="status">{error}{error&&data?' Os números exibidos são da última consulta bem-sucedida.':''}</p>
    <div className="results-mobile-tabs" role="group" aria-label="Visualização dos resultados"><button id="map-tab" type="button" aria-pressed={tab==='map'} aria-controls="participation-panel" onClick={()=>setTab('map')}>Mapa do Brasil</button><button id="answers-tab" type="button" aria-pressed={tab==='answers'} aria-controls="answers-panel" onClick={()=>setTab('answers')}>Respostas gerais</button></div>
    <div className="results-grid">
      <section className="results-panel" id="participation-panel" data-mobile-hidden={tab!=='map'} aria-labelledby="participation-title">
        <h2 id="participation-title">Participação pelo Brasil</h2>
        <p className="results-caption">Quanto mais intenso o azul, mais pesquisas respondidas na UF.</p>
        <figure className="results-map">
          <ComposableMap width={560} height={520} projection="geoMercator" projectionConfig={{center:[-54,-14.5],scale:635}} role="group" aria-label="Mapa interativo das participações por unidade federativa">
            <Geographies geography={geography}>{({geographies})=>geographies.map(geo=>{
              const {uf,name}=geo.properties,count=countFor(uf);
              return <Geography key={geo.rsmKey} geography={geo} fill={mapColor(count||0)} role="button" aria-label={`${name} (${uf}): ${countLabel(count)}`} aria-pressed={selected===uf} onClick={()=>setSelected(uf)} onMouseEnter={()=>setHovered(uf)} onMouseLeave={()=>setHovered('')} onFocus={()=>setHovered(uf)} onBlur={()=>setHovered('')} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(uf);}}}><title>{name}: {countLabel(count)}</title></Geography>;
            })}</Geographies>
            {geography.features.filter(f=>!['DF','SE','AL','ES','RJ'].includes(f.id)).map(feature=><Marker key={feature.id} coordinates={feature.properties.labelPoint} aria-hidden="true"><text className="map-label" textAnchor="middle" dominantBaseline="middle" style={{fill:intensity(countFor(feature.id)||0)>.5?'var(--white)':'var(--blue-dark)',stroke:intensity(countFor(feature.id)||0)>.5?'var(--blue-dark)':'var(--white)'}}>{feature.id}</text></Marker>)}
          </ComposableMap>
          <figcaption className="map-overlays">
        <div className="results-legend" aria-label="Escala de cores, em participações">{[0,1,5,20,100].map(n=><span className="legend-item" key={n}><i aria-hidden="true" style={{background:mapColor(n)}}/>{n===0?'Nenhuma':number(n)}</span>)}</div>
        <div className="state-selector"><label htmlFor="results-state">Consultar uma UF<select id="results-state" value={selected} onChange={event=>{setSelected(event.target.value);setHovered('');}}><option value="">Selecione um estado</option>{states.map(s=><option key={s.uf} value={s.uf}>{s.name} ({s.uf}) — {data?number(countFor(s.uf)):'—'}</option>)}</select></label><p className="state-count" aria-live="polite" aria-atomic="true">{activeState?<><strong>{activeState.name}</strong><br/>{countLabel(countFor(activeState.uf))}</>:data?.total===0?'Aguardando as primeiras participações.':'Selecione ou toque em uma UF.'}</p></div>
          </figcaption>
        </figure>
        <p className="results-method">Sem UF informada, a participação conta no total nacional. Malha simplificada do <a href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3">IBGE</a>. O mapa mostra volume, não taxa por população.</p>
      </section>
      <section className="results-panel" id="answers-panel" data-mobile-hidden={tab!=='answers'} aria-label="Resultados nacionais das perguntas">
        <div className="results-question-header"><label htmlFor="results-question">Respostas gerais<select className="results-question-select" id="results-question" value={questionIndex} onChange={event=>setQuestionIndex(Number(event.target.value))} disabled={!data}>{data?data.results.questions.map((q,i)=><option key={q.id} value={i}>{i+1}. {q.title}</option>):<option value={0}>Carregando perguntas…</option>}</select></label><div className="results-question-nav"><button type="button" aria-label="Pergunta anterior" disabled={!data||questionIndex===0} onClick={()=>setQuestionIndex(i=>i-1)}>←</button><button type="button" aria-label="Próxima pergunta" disabled={!data||questionIndex===13} onClick={()=>setQuestionIndex(i=>i+1)}>→</button></div></div>
        <div className={`results-question-content${question?.type==='scale'?' results-scale':''}`} ref={contentRef}>
          {question?<><p className="eyebrow">{sections[question.section]} · {questionIndex+1} de 14</p><h2 aria-live="polite">{question.title}</h2>
            {question.locked?<div className="results-empty"><strong>Resultados em formação.</strong>Os gráficos precisam de pelo menos {data.results.releaseSize} respostas a esta pergunta no conjunto publicado. Novas participações entram nos gráficos em grupos de {data.results.releaseSize}, para reduzir a exposição de respostas isoladas.</div>:<>
              {question.type!=='scale'&&<p className="results-question-meta">{number(question.answered)} respostas · {number(question.skipped)} sem resposta no conjunto publicado.{question.type==='multiple'?' Múltiplas escolhas: os percentuais podem somar mais de 100%.':''}</p>}
              {question.type==='scale'?<><p className="results-average"><strong>{number(question.average)}</strong><span>Média declarada em uma escala de 0 a 10.<br/>{number(question.answered)} respostas · {number(question.skipped)} sem resposta.</span></p><ul className="results-histogram" aria-label="Distribuição das notas, por quantidade de respostas">{question.options.map(option=><li key={option.value} aria-label={`Nota ${option.value}: ${number(option.count)} respostas, ${number(option.percentage)}%`} title={`Nota ${option.value}: ${number(option.count)} respostas (${number(option.percentage)}%)`}><strong>{number(option.count)}</strong><div className="scale-column" aria-hidden="true"><i style={{height:`${option.count/Math.max(1,...question.options.map(o=>o.count))*100}%`}}/></div><span aria-hidden="true">{option.value}</span></li>)}</ul></>:<ul className="results-bars" aria-label="Distribuição das respostas">{question.options.map(option=><li key={option.value}><div className="result-option-line"><span>{option.label}</span><strong>{number(option.count)} · {number(option.percentage)}%</strong></div><div className="result-bar-track" aria-hidden="true"><div className="result-bar-fill" style={{'--bar-width':`${option.percentage}%`}}/></div></li>)}</ul>}
            </>}
          </>:<div className="results-empty"><strong>{error?'Resultados indisponíveis.':'Consultando a pesquisa…'}</strong>{error?'Use Atualizar para tentar novamente.':'Os dados serão apresentados assim que a consulta terminar.'}</div>}
        </div>
        <div className="results-method"><p>{data?`Base dos gráficos: ${number(data.results.sampleSize)} de ${number(data.total)} participações.`:'Dados agregados da pesquisa.'}</p><details><summary>Sobre estes resultados</summary><p>Resultados nacionais, sem identificação, municípios ou cruzamentos por UF. Os gráficos são atualizados em grupos de cinco participações e cada pergunta exige ao menos cinco respostas. Atualização automática da consulta a cada minuto. Participação voluntária; os resultados representam quem respondeu à pesquisa.</p></details></div>
      </section>
    </div>
  </div>;
}
createRoot(document.getElementById('results-root')).render(<App/>);
