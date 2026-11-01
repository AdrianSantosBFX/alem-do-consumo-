import {validateJourney,renderJourney} from './learning.mjs';

export function courseDefinition(course) {
  return {id:course.id,version:course.version,title:course.title,description:course.description,chapters:[...course.chapters,...(course.exam?[{id:'prova-final',kind:'checkpoint',title:'Prova final',subtitle:'Retome o que aprendeu e responda às questões para concluir o curso.',summary:'Prova final concluída.',blocks:[{...course.exam,id:'avaliacao-final',type:'checkpoint',required:true,title:'Avaliação de aprendizagem'}]}]:[])]};
}
export function validateCourse(course) {
  if(!/^[a-z0-9-]+$/.test(course.id)||!Number.isInteger(course.version)||course.version<1)throw new Error('Identificação do curso inválida.');
  if(!['draft','published'].includes(course.status)||!Array.isArray(course.chapters))throw new Error('Configuração do curso inválida.');
  if(!course.title?.trim()||!course.description?.trim())throw new Error('Defina título e descrição do curso.');
  if(course.certificate?.status!=='planned')throw new Error('A emissão do certificado será configurada quando o modelo estiver pronto.');
  if(course.status==='published' && (!course.chapters.length||!course.exam))throw new Error('O curso só pode ser publicado com conteúdo e prova final.');
  if(course.exam && (typeof course.exam.minScore!=='number'||course.exam.minScore<=0||course.exam.minScore>1))throw new Error('Defina a nota mínima da prova final.');
  if(course.chapters.length||course.exam)validateJourney(courseDefinition(course));
}
export function renderCourse(course) {
  validateCourse(course);
  if(course.status!=='published')throw new Error('Curso ainda em preparação.');
  return renderJourney(courseDefinition(course),{returnUrl:'/curso/'})
    .replaceAll('href="/aprenda/"','href="/curso/"')
    .replace('Concluir percurso','Concluir prova final')
    .replace('PERCURSO CONCLUÍDO','CURSO CONCLUÍDO')
    .replace('Um passo a mais no seu percurso.','Curso concluído.')
    .replace('Você pode voltar às etapas e rever as referências sempre que precisar.','Você concluiu as etapas e a prova final. O modelo do certificado ainda está em preparação; a emissão será disponibilizada em uma próxima etapa.');
}
