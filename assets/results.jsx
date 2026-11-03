import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ComposableMap,Geographies,Geography,Marker} from 'react-simple-maps/core';
import geography from './brazil-states.json';
import {states} from './states.mjs';
import {mapColor,intensity,validateResults,buildOverview,leadingText} from './results-model.mjs';

const number=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
const percent=n=>n===null?'—':`${number(n)}%`;
const clean=s=>s.replace(/[.]$/,'');

function Base({question}){
  return <p className="insight-base">{question&&!question.locked?`${number(question.answered)} respostas · ${number(question.skipped)} sem resposta${question.type==='multiple'?' · múltipla escolha':''}`:'Aguardando pelo menos 5 respostas no conjunto publicado.'}</p>;
}
function Ranking({question,label}){
  if(!question||question.locked)return <p className="insight-pending">Este tema ainda está em formação.</p>;
  const sorted=[...question.options].sort((a,b)=>b.count-a.count);
  // Keep ties at the cutoff rather than arbitrarily hiding an equally cited option.
  const cutoff=sorted[Math.min(2,sorted.length-1)]?.count??0;
  const options=sorted.filter(o=>o.count>0&&o.count>=cutoff);
  return <><ul className="overview-bars" aria-label={label}>{options.map(option=><li key={option.value}><div><span>{clean(option.label)}</span><strong>{number(option.percentage)}%</strong></div><div className="overview-track" aria-hidden="true"><i style={{width:`${option.percentage}%`}}/></div></li>)}</ul><Base question={question}/><p className="ranking-note">{options.length<question.options.length?'Até três opções mais citadas, incluindo empates.':'Todas as opções citadas.'}{question.type==='multiple'?' Cada percentual considera quem respondeu; a soma pode superar 100%.':''}</p></>;
}
function Finding({label,question}){
  return <div className="insight-finding"><span>{label}</span><p>{leadingText(question)||'Ainda sem base suficiente para uma leitura.'}</p><Base question={question}/></div>;
}
function Metric({value,suffix,label,description,question}){
  return <article className="overview-metric"><p className="metric-label">{label}</p><strong className="metric-value">{value}<small>{suffix}</small></strong><p>{description}</p><Base question={question}/></article>;
}
function Participation({data}){
  const [selected,setSelected]=useState(''),[hovered,setHovered]=useState('');
  const countFor=uf=>data?.byState.find(s=>s.uf===uf)?.count??null;
  const activeState=states.find(s=>s.uf===(hovered||selected));
  const countLabel=count=>count===null?'dados indisponíveis':`${number(count)} ${count===1?'participação':'participações'}`;
  return <section className="participation-card" aria-labelledby="participation-title">
    <p className="eyebrow">ALCANCE DA PESQUISA</p><h2 id="participation-title">Quem participa<br/>desse retrato?</h2>
    <div className="participation-stats"><div><strong>{data?number(data.total):'—'}</strong><span>participações</span></div><div><strong>{data?number(data.byState.filter(s=>s.count>0).length):'—'}</strong><span>UFs com respostas</span></div></div>
    <figure className="results-map">
      <ComposableMap width={560} height={520} projection="geoMercator" projectionConfig={{center:[-54,-14.5],scale:635}} role="group" aria-label="Mapa interativo das participações por unidade federativa">
        <Geographies geography={geography}>{({geographies})=>geographies.map(geo=>{
          const {uf,name}=geo.properties,count=countFor(uf);
          return <Geography key={geo.rsmKey} geography={geo} fill={mapColor(count||0)} role="button" aria-label={`${name} (${uf}): ${countLabel(count)}`} aria-pressed={selected===uf} onClick={()=>setSelected(uf)} onMouseEnter={()=>setHovered(uf)} onMouseLeave={()=>setHovered('')} onFocus={()=>setHovered(uf)} onBlur={()=>setHovered('')} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(uf);}}}><title>{name}: {countLabel(count)}</title></Geography>;
        })}</Geographies>
        {geography.features.filter(f=>!['DF','SE','AL','ES','RJ'].includes(f.id)).map(feature=><Marker key={feature.id} coordinates={feature.properties.labelPoint} aria-hidden="true"><text className="map-label" textAnchor="middle" dominantBaseline="middle" style={{fill:intensity(countFor(feature.id)||0)>.5?'var(--white)':'var(--blue-dark)',stroke:intensity(countFor(feature.id)||0)>.5?'var(--blue-dark)':'var(--white)'}}>{feature.id}</text></Marker>)}
      </ComposableMap>
      <figcaption><p>Mais azul, mais participações.</p><div className="results-legend">{[0,1,5,20,100].map(n=><span key={n}><i aria-hidden="true" style={{background:mapColor(n)}}/>{n===0?'0':number(n)}</span>)}</div></figcaption>
    </figure>
    <label className="state-selector" htmlFor="results-state">Consultar participação por UF<select id="results-state" value={selected} onChange={event=>{setSelected(event.target.value);setHovered('');}}><option value="">Selecione um estado</option>{states.map(s=><option key={s.uf} value={s.uf}>{s.name} ({s.uf})</option>)}</select></label>
    <p className="state-count" aria-live="polite" aria-atomic="true">{activeState?<><strong>{activeState.name}</strong><span>{countLabel(countFor(activeState.uf))}</span></>:data?.total===0?'Aguardando as primeiras participações.':'Toque no mapa ou escolha uma UF.'}</p>
    <p className="results-method">{data?`${number(data.unlocated)} participações sem UF informada, incluídas no total nacional. `:''}O mapa mostra volume de envios, não pessoas únicas nem proporção da população. A seleção de UF não filtra a síntese nacional. Malha simplificada do <a href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3">IBGE</a>.</p>
  </section>;
}
function App(){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[updated,setUpdated]=useState(null);
  const refreshRef=useRef(()=>{});
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
  const overview=buildOverview(data),{q}=overview;
  const average=q('q02')&&!q('q02').locked?q('q02').average:null;
  return <div className="results-app">
    <div className="overview-toolbar"><span className="overview-status"><i aria-hidden="true"/>{data?`${number(data.results.sampleSize)} participações na base publicada`:error?'Consulta indisponível':'Consultando resultados'}</span><div className="results-update"><span>{updated?`Consulta às ${updated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:''}</span><button className="text-link" type="button" disabled={loading} onClick={()=>refreshRef.current()}>{loading?'Atualizando…':'Atualizar ↻'}</button></div></div>
    <p className="results-error" role="status">{error}{error&&data?' Os números exibidos são da última consulta bem-sucedida.':''}</p>
    <section className="overview-lead" aria-labelledby="overview-title"><div><p className="eyebrow">LEITURA DO CONJUNTO</p><h2 id="overview-title">{!data?(error?'Resultados indisponíveis.':'Preparando o panorama…'):overview.headline}</h2><p>{!data?(error?'Use Atualizar para tentar novamente.':'A síntese será exibida após a consulta às respostas da pesquisa.'):overview.summary}</p></div><div className="overview-scope"><span>UM OLHAR SOBRE</span><strong>Hábitos.<br/>Escolhas.<br/>Possibilidades.</strong><p>Respostas de quem participa.<br/>Pistas para aprender e agir.</p></div></section>
    {data&&!overview.available&&<p className="results-notice">Os temas são liberados a partir de 5 respostas por pergunta no conjunto publicado. Até lá, nenhum percentual ou conclusão é estimado. <a href="/pesquisa/">Participar da pesquisa ↗</a></p>}
    {data&&<><section className="overview-metrics" aria-label="Indicadores do panorama">
      <Metric value={average===null?'—':number(average)} suffix={average===null?'':'/ 10'} label="Conhecimento declarado" description="Média da familiaridade declarada com os impactos do consumo; não é uma nota de avaliação." question={q('q02')}/>
      <Metric value={percent(overview.impulse)} label="Compras não planejadas" description="Dizem comprar sem planejamento frequentemente ou sempre." question={q('q03')}/>
      <Metric value={percent(overview.sharedResponsibility)} label="Responsabilidade coletiva" description="Consideram compartilhada a responsabilidade pelos impactos do consumo." question={q('q13')}/>
    </section>
    <div className="overview-layout"><div className="overview-themes">
      <article className="insight-card"><header><span className="insight-index">01</span><div><p className="eyebrow">HÁBITOS E ESCOLHAS</p><h2>O que orienta o consumo</h2></div></header><p className="insight-intro">Os fatores mais citados ajudam a entender o que pesa na decisão de compra.</p><Ranking question={q('q04')} label="Fatores mais citados nas decisões de compra"/><Finding label="Quando um produto apresenta defeito" question={q('q05')}/><Finding label="Destino mais citado para produtos sem uso" question={q('q06')}/></article>
      <article className="insight-card"><header><span className="insight-index">02</span><div><p className="eyebrow">DESAFIOS DA MUDANÇA</p><h2>O que dificulta avançar</h2></div></header><p className="insight-intro">As respostas sobre dificuldades mostram quais condições merecem atenção ao incentivar hábitos mais sustentáveis.</p><Ranking question={q('q07')} label="Respostas mais citadas sobre dificuldades"/><div className="insight-takeaway"><span>PARA A PRÁTICA</span><p>{q('q07')&&!q('q07').locked?'As dificuldades relatadas podem orientar ações educativas e de apoio. Elas não explicam, sozinhas, os hábitos de compra.':'Com mais respostas, será possível identificar os desafios mais relatados por este grupo.'}</p></div></article>
      <article className="insight-card"><header><span className="insight-index">03</span><div><p className="eyebrow">CONHECIMENTO SOCIOAMBIENTAL</p><h2>Do produto ao impacto</h2></div></header><p className="insight-intro">Proporção que reconhece a prática ou o impacto esperado em cada tema.</p><ul className="knowledge-bars" aria-label="Reconhecimento por tema socioambiental">{overview.knowledge.map(item=><li key={item.id}><div><span>{item.label}</span><strong>{percent(item.percentage)}</strong></div><div className="overview-track" aria-hidden="true"><i style={{width:`${item.percentage??0}%`}}/></div><span className="knowledge-base">{item.percentage===null?'Base ainda insuficiente':`${number(item.question.answered)} respostas`}</span></li>)}</ul><div className="insight-takeaway"><span>OPORTUNIDADE DE APRENDIZAGEM</span><p>{overview.knowledgeComplete?(overview.weakest.length===5?'Os cinco temas têm o mesmo percentual de reconhecimento. Não há um tema isolado com menor resultado.':`${overview.weakest.map(item=>item.label).join(' / ')} ${overview.weakest.length>1?'têm os menores percentuais':'tem o menor percentual'} de reconhecimento (${percent(overview.weakest[0].percentage)}). Vale aprofundar ${overview.weakest.length>1?'esses temas':'esse tema'} nas atividades educativas.`):'A comparação entre os cinco temas será apresentada quando todos tiverem base suficiente.'}</p></div><details className="knowledge-method"><summary>Como ler esta comparação</summary><p>Cada barra considera apenas quem respondeu àquela pergunta. As bases podem variar; não é uma avaliação individual.</p><ul>{overview.knowledge.filter(item=>item.percentage!==null).map(item=><li key={item.id}><strong>{item.label}:</strong> {item.question.options.find(o=>o.value===0)?.label}</li>)}</ul></details></article>
      <article className="insight-card"><header><span className="insight-index">04</span><div><p className="eyebrow">INTERESSES DO GRUPO</p><h2>Por onde continuar</h2></div></header><p className="insight-intro">Os assuntos mais escolhidos indicam possíveis caminhos para os próximos conteúdos educativos.</p><Ranking question={q('q14')} label="Assuntos de maior interesse"/><div className="insight-finding"><span>Contato com A História das Coisas</span><p>{overview.familiarity===null?'Ainda sem base suficiente para uma leitura.':`${percent(overview.familiarity)} já assistiram ao vídeo, leram o livro ou tiveram contato com ambos.`}</p><Base question={q('q01')}/></div></article>
    </div><aside className="overview-aside"><Participation data={data}/><section className="reading-note"><p className="eyebrow">COMO LER ESTE RETRATO</p><h2>Uma pesquisa aberta.<br/>Uma leitura situada.</h2><p>A participação é voluntária. Os resultados descrevem quem respondeu à pesquisa e não representam toda a população brasileira.</p><p>As sínteses usam frequências e médias das respostas, sem cruzamentos entre participantes ou afirmações de causa e efeito.</p><a href="/pesquisa/" className="text-link">Sua participação amplia esse olhar ↗</a></section></aside></div></>}
    <details className="results-methodology"><summary>Base da pesquisa e critérios de leitura</summary><div><p>{data?`A síntese utiliza ${number(data.results.sampleSize)} de ${number(data.total)} participações. ${overview.available} das 14 perguntas têm resultados liberados.`:'A base será informada após uma consulta bem-sucedida.'} Novas respostas são incorporadas em grupos de cinco. Cada pergunta exige ao menos cinco respostas no conjunto publicado.</p><p>Perguntas são opcionais. Os percentuais usam o total de respostas à respectiva pergunta; múltiplas escolhas podem somar mais de 100%. Empates são apresentados sem escolher um vencedor. Diferenças pequenas não indicam, por si só, diferenças estatisticamente significativas.</p><p>Os dados são nacionais e agregados. A consulta é atualizada automaticamente a cada minuto enquanto a página está visível.</p></div></details>
  </div>;
}
createRoot(document.getElementById('results-root')).render(<App/>);
