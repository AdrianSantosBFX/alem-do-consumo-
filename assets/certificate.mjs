import {certificateEligible,normalizeCertificateName,certificateDate} from './certificate-model.mjs';
import {certificatePdf} from './certificate-pdf.mjs';

function wrapName(context,name,maxWidth){
  const words=name.split(' '),lines=[];let line='';
  for(const word of words){const next=line?`${line} ${word}`:word;if(line&&context.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);return lines;
}
export async function createCertificate(name,definition,date=new Date()){
  name=normalizeCertificateName(name);
  const canvas=document.createElement('canvas');canvas.width=2526;canvas.height=1786;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar o certificado.');
  const scale=3;ctx.scale(scale,scale);
  const w=842,h=1786/scale,blue='#07517d',bright='#078bd3',ink='#1f2937';
  try{
    await Promise.all([document.fonts.load('800 44px "Barlow Condensed"'),document.fonts.load('600 22px Manrope')]);
    ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    ctx.fillStyle=blue;ctx.fillRect(0,0,22,h);ctx.fillStyle=bright;ctx.fillRect(22,0,5,h);
    ctx.strokeStyle='#c7dce8';ctx.lineWidth=.7;ctx.strokeRect(42,28,w-70,h-56);
    ctx.fillStyle='#eaf6fc';ctx.beginPath();ctx.moveTo(w-28,h-28);ctx.lineTo(w-28,h-140);ctx.lineTo(w-148,h-28);ctx.closePath();ctx.fill();
    ctx.textBaseline='alphabetic';ctx.textAlign='left';
    ctx.fillStyle=blue;ctx.font='800 25px "Barlow Condensed", sans-serif';ctx.fillText('ALÉM DO CONSUMO.',68,76);
    ctx.fillStyle='#64748b';ctx.font='600 7px Manrope, sans-serif';ctx.fillText('EDUCAÇÃO SOCIOAMBIENTAL',68,91);
    ctx.textAlign='right';ctx.font='600 8px Manrope, sans-serif';ctx.fillText('CERTIFICADO DE CONCLUSÃO',w-55,76);
    ctx.textAlign='center';ctx.fillStyle=blue;ctx.font='800 53px "Barlow Condensed", sans-serif';ctx.fillText('CERTIFICADO',w/2+8,169);
    ctx.fillStyle=bright;ctx.fillRect(w/2-27,183,70,3);
    ctx.fillStyle=ink;ctx.font='400 13px Manrope, sans-serif';ctx.fillText('Certificamos que',w/2+8,223);
    let fontSize=32,lines;
    do{ctx.font=`600 ${fontSize}px Manrope, sans-serif`;lines=wrapName(ctx,name,690);if(lines.length<=2&&lines.every(line=>ctx.measureText(line).width<=690))break;fontSize--;}while(fontSize>=12);
    if(lines.length>2||lines.some(line=>ctx.measureText(line).width>690))throw new Error('Não foi possível ajustar este nome ao certificado.');
    ctx.fillStyle=blue;lines.forEach((line,index)=>ctx.fillText(line,w/2+8,267+(index-(lines.length-1)/2)*(fontSize+8)));
    ctx.strokeStyle='#b5d5e7';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(112,306);ctx.lineTo(w-96,306);ctx.stroke();
    ctx.fillStyle=ink;ctx.font='400 13px Manrope, sans-serif';ctx.fillText('concluiu o microcurso',w/2+8,338);
    ctx.fillStyle=blue;ctx.font='800 31px "Barlow Condensed", sans-serif';ctx.fillText(definition.title.toLocaleUpperCase('pt-BR'),w/2+8,377);
    ctx.fillStyle=ink;ctx.font='400 11px Manrope, sans-serif';
    ctx.fillText(`com duração estimada de ${definition.durationMin} minutos, após concluir as etapas`,w/2+8,404);
    ctx.fillText('de aprendizagem e obter aprovação na avaliação final.',w/2+8,422);
    ctx.font='500 10px Manrope, sans-serif';ctx.fillText(`Emitido em ${certificateDate(date)}.`,w/2+8,454);
    ctx.strokeStyle=ink;ctx.beginPath();ctx.moveTo(w/2-94,497);ctx.lineTo(w/2+110,497);ctx.stroke();
    ctx.fillStyle=blue;ctx.font='800 19px "Barlow Condensed", sans-serif';ctx.fillText('ALÉM DO CONSUMO',w/2+8,519);
    ctx.fillStyle='#64748b';ctx.font='400 8px Manrope, sans-serif';ctx.fillText('Iniciativa independente de educação socioambiental',w/2+8,536);
    ctx.font='400 7px Manrope, sans-serif';ctx.fillText('Emissão automática no navegador. Sem registro nominal ou verificação pública.',w/2+8,563);
    const image=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar o arquivo.')),'image/jpeg',.97));
    return certificatePdf(new Uint8Array(await image.arrayBuffer()),canvas.width,canvas.height);
  }finally{ctx.clearRect(0,0,w,h);canvas.width=canvas.height=0;name='';}
}

export function initCertificate(host,definition,getState){
  const form=host.querySelector('[data-certificate-form]');if(!form)return {refresh(){}};
  const input=form.querySelector('input'),button=form.querySelector('button'),message=form.querySelector('[role="status"]');
  let busy=false,disposed=false;const urls=new Map();
  const clear=()=>{input.value='';input.setCustomValidity('');};
  const eligible=()=>certificateEligible(definition,getState());
  const refresh=()=>{const enabled=eligible();form.hidden=!enabled;input.disabled=button.disabled=!enabled||busy;if(!enabled)clear();};
  input.addEventListener('input',()=>{input.setCustomValidity('');message.textContent='';});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!eligible())return;
    let name;try{name=normalizeCertificateName(input.value);}catch(error){input.setCustomValidity(error.message);input.reportValidity();return;}
    busy=true;refresh();button.textContent='Gerando certificado…';message.textContent='';
    try{
      const pdf=await createCertificate(name,definition);name='';
      if(disposed||!eligible())return;
      const url=URL.createObjectURL(pdf),link=document.createElement('a');link.href=url;link.download='certificado-alem-do-consumo.pdf';link.hidden=true;
      form.append(link);link.click();link.remove();clear();
      // Keep the download alive briefly, then release the in-memory file.
      const timer=setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},10000);urls.set(url,timer);
      message.textContent='Certificado gerado. O nome foi limpo deste formulário. Confira o arquivo nos downloads.';
    }catch{clear();message.textContent='Não foi possível gerar o certificado. Informe o nome novamente e tente outra vez.';}
    finally{name='';busy=false;button.textContent='Baixar certificado em PDF ↓';refresh();}
  });
  window.addEventListener('pagehide',()=>{disposed=true;clear();for(const [url,timer]of urls){clearTimeout(timer);URL.revokeObjectURL(url);}urls.clear();});
  window.addEventListener('pageshow',()=>{disposed=false;clear();});
  refresh();return {refresh};
}
