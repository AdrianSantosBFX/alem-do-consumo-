import {validateJourney,renderJourney} from './learning.mjs';
import {escapeHtml as e} from './html.mjs';

export function courseDefinition(course) {
  return {id:course.id,version:course.version,title:course.title,description:course.description,durationMin:course.durationMin,certificate:{status:course.certificate.status},chapters:[...course.chapters,...(course.exam?[{id:'prova-final',kind:'checkpoint',title:'Seu olhar em prática',minutes:course.exam.minutes,theme:'final',subtitle:'Quatro situações para retomar o que você aprendeu.',summary:'Avaliação final concluída. Você pode rever as explicações a qualquer momento.',blocks:[{...course.exam,id:'avaliacao-final',type:'checkpoint',required:true,title:'Avaliação final'}]}]:[])]};
}
export function validateCourse(course) {
  if(!/^[a-z0-9-]+$/.test(course.id)||!Number.isInteger(course.version)||course.version<1)throw new Error('Identificação do curso inválida.');
  if(!['draft','published'].includes(course.status)||!Array.isArray(course.chapters))throw new Error('Configuração do curso inválida.');
  if(!course.title?.trim()||!course.description?.trim())throw new Error('Defina título e descrição do curso.');
  if(!['planned','enabled'].includes(course.certificate?.status))throw new Error('Configuração de certificado inválida.');
  if(course.status==='published' && (!course.chapters.length||!course.exam))throw new Error('O curso só pode ser publicado com conteúdo e prova final.');
  if(course.exam && (typeof course.exam.minScore!=='number'||course.exam.minScore<=0||course.exam.minScore>1))throw new Error('Defina a nota mínima da prova final.');
  if(course.durationMin!==undefined&&(!Number.isFinite(course.durationMin)||course.durationMin<=0))throw new Error('Duração estimada inválida.');
  if(course.status==='published'&&course.certificate.status==='enabled'&&!Number.isFinite(course.durationMin))throw new Error('O certificado exige duração definida.');
  if(course.references)for(const ref of course.references){let url;try{url=new URL(ref.url);}catch{throw new Error('Referência inválida.');}if(!ref.title?.trim()||url.protocol!=='https:')throw new Error('Referência inválida.');}
  if(course.chapters.length||course.exam)validateJourney(courseDefinition(course));
}
export function renderCourse(course) {
  validateCourse(course);
  if(course.status!=='published')throw new Error('Curso ainda em preparação.');
  const references=course.references?.length?`<aside class="references"><h2>Para continuar explorando</h2><p>Fontes usadas na preparação do conteúdo. A leitura complementar não entra na estimativa de 10 minutos.</p><ul>${course.references.map(ref=>`<li><a href="${e(ref.url)}" target="_blank" rel="noopener noreferrer">${e(ref.title)} ↗</a></li>`).join('')}</ul><p>Conteúdo educativo independente, inspirado nas reflexões de A História das Coisas, sem vínculo oficial com a autora ou com o Story of Stuff Project.</p></aside>`:'';
  const certificate=course.certificate.status==='enabled'?"<form class=\"certificate-form\" data-certificate-form autocomplete=\"off\" hidden><p class=\"eyebrow\">SEU CERTIFICADO</p><h3>Leve este aprendizado com você.</h3><p>Informe seu nome completo, exatamente como deseja que apareça no certificado.</p><label for=\"certificate-name\">Nome completo</label><input id=\"certificate-name\" type=\"text\" autocomplete=\"off\" autocapitalize=\"words\" spellcheck=\"false\" maxlength=\"120\" required disabled aria-describedby=\"certificate-privacy\"><p id=\"certificate-privacy\" class=\"certificate-privacy\">O nome é usado só para gerar este PDF. Ele não é enviado ao servidor nem salvo no site; ficará no arquivo que você baixar. O campo será limpo após a geração.</p><button class=\"button\" type=\"submit\" disabled>Baixar certificado em PDF ↓</button><p class=\"certificate-status\" role=\"status\" aria-live=\"polite\"></p></form>":'';
  return renderJourney(courseDefinition(course),{returnUrl:'/curso/',references})
    .replaceAll('href="/aprenda/"','href="/curso/"')
    .replace('Concluir percurso','Concluir prova final')
    .replace('<a class="button" href="/curso/">',certificate+'<a class="button" href="/curso/">')
    .replace('PERCURSO CONCLUÍDO','PERCURSO FINALIZADO')
    .replace('Um passo a mais no seu percurso.','Curso concluído.')
    .replace('Você pode voltar às etapas e rever as referências sempre que precisar.',course.certificate.status==='enabled'?'Você concluiu as etapas e a avaliação final. Seu certificado está disponível abaixo.':'Você concluiu as etapas e a avaliação final. Você pode voltar ao conteúdo sempre que quiser.');
}
