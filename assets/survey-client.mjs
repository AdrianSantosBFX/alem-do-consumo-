export function createSurveySender({fetcher=globalThis.fetch,makeId=()=>crypto.randomUUID(),timeoutMs=15000}={}){
  let attempt,controller;
  return {
    reset(){attempt=undefined;controller?.abort();},
    async send(payload){
      const signature=JSON.stringify(payload);
      if(attempt?.signature!==signature)attempt={signature,id:makeId()};
      const id=attempt.id,active=new AbortController();controller=active;
      const timer=setTimeout(()=>active.abort(),timeoutMs);
      try{
        const response=await fetcher('/api/pesquisa',{method:'POST',mode:'same-origin',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...payload}),signal:active.signal});
        if(!response.ok)throw new Error(response.status===422?'Revise o preenchimento e tente novamente.':'Não foi possível confirmar o envio. Suas respostas continuam nesta página. Tente novamente.');
        const receipt=await response.json();
        if(receipt.ok!==true||receipt.submissionId!==id)throw new Error('Não foi possível confirmar o envio. Tente novamente.');
        return receipt;
      }catch(error){
        if(error.name==='AbortError'||error instanceof TypeError)throw new Error('A conexão falhou ou demorou. Suas respostas continuam nesta página. Tente novamente.');
        throw error;
      }finally{clearTimeout(timer);}
    }
  };
}
