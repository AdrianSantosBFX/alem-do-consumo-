import {readFile,writeFile,mkdir,cp,rm,lstat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {escapeHtml as e} from './html.mjs';
import {validateCourse,renderCourse} from './course.mjs';
import {validateSurvey} from './assets/survey-model.mjs';
import {renderSurveyIntro} from './assets/survey-view.mjs';

export const projectRoot=path.dirname(fileURLToPath(import.meta.url));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
export function validateData(data) {
  assert(data.site.title?.trim()&&data.site.description?.trim(),'Defina título e descrição.');
  const url=new URL(data.site.url);assert(url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/','Defina o domínio HTTPS do portal.');
  validateCourse(data.course);validateSurvey(data.survey);
}
const courseScreen=course=>`<section class="screen course-screen section-shell" aria-labelledby="course-title"><div class="screen-intro"><p class="eyebrow"><span class="blue-line"></span> CURSO GRATUITO</p><h1 id="course-title">Curso sobre<br> <span>Consumo Sustentável.</span></h1><p class="intro-description">Uma página para aprender, participar e seguir em frente. Cada etapa abre o próximo passo.</p></div><article class="course-card"><div class="card-top"><span class="status-tag">${course.status==='published'?'Disponível':'Em preparação'}</span><svg class="course-sketch" aria-hidden="true"><use href="/assets/sketches.svg#learning"/></svg></div><h2>Seu percurso</h2><ol class="course-overview"><li><span>01</span>Objetivos e conteúdos educativos</li><li><span>02</span>Atividades e avanço por etapas</li><li><span>03</span>Prova final e certificado</li></ol><div class="course-card-actions">${course.status==='published'?`<a class="button" href="/curso/${course.id}/">Iniciar curso <span aria-hidden="true">↗</span></a>`:'<span class="availability">As aulas ainda estão sendo preparadas.</span>'}<button type="button" class="text-link" data-open-dialog="course-dialog">Como vai funcionar <span aria-hidden="true">↗</span></button></div><p class="small-note">O modelo do certificado e a emissão serão preparados depois.</p></article></section>`;
const researchScreen=survey=>`<section class="screen research-screen section-shell" aria-labelledby="research-title"><div class="screen-intro research-intro"><p class="eyebrow"><span class="blue-line"></span> QUESTIONÁRIO SOCIOAMBIENTAL</p><h1 id="research-title">Pesquisa<br>Além do Consumo<span class="heading-period">.</span></h1><p class="intro-description">Uma pergunta de cada vez.<br>Um olhar para os seus hábitos.</p><span class="preview-note">Participação anônima · perguntas opcionais.</span></div><div class="survey-card" id="survey-card" aria-label="Questionário sobre hábitos de consumo">${renderSurveyIntro(survey,{ready:false})}</div><script type="application/json" id="survey-data">${JSON.stringify(survey).replace(/</g,'\\u003c')}</script></section>`;
export function createPages(data,layout,home) {
  validateData(data);
  const pages=new Map();
  const navigation=[['/','O Projeto'],['/pesquisa/','Pesquisa'],['/curso/','Curso']];
  function add(route,title,description,content,{noindex=false,journey=false}={}) {
    const values={TITLE:e(`${title} | Além do Consumo`),DESCRIPTION:e(description),CANONICAL:e(data.site.url.replace(/\/$/,'')+route),ROBOTS:noindex?'noindex, follow':'index, follow',CONTENT:content,BODY_CLASS:journey?'page-journey':'page-screen',EXTRA_ASSETS:journey?'<link rel="stylesheet" href="/assets/journey.css">':route==='/pesquisa/'?'<link rel="stylesheet" href="/assets/survey.css">':'',NAV:navigation.map(([href,label])=>`<a href="${href}"${(route==='/'?href==='/':href!=='/'&&route.startsWith(href))?' aria-current="page"':''}>${label}</a>`).join('')};
    const html=layout.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{assert(key in values,`Marcador desconhecido: ${key}`);return values[key];});
    pages.set(route,{html,noindex});
  }
  add('/','O Projeto',data.site.description,home);
  add('/pesquisa/','Pesquisa','Pesquisa anônima sobre consumo e conhecimento socioambiental. 14 perguntas opcionais para compreender hábitos de consumo e conhecimentos socioambientais.',researchScreen(data.survey));
  add('/curso/','Curso sobre Consumo Sustentável',data.course.description,courseScreen(data.course));
  if(data.course.status==='published')add(`/curso/${data.course.id}/`,data.course.title,data.course.description,renderCourse(data.course),{journey:true});
  add('/404/','Página não encontrada','O endereço solicitado não foi encontrado.',`<section class="screen error-screen section-shell"><div><p class="eyebrow">ERRO 404</p><h1>Esta página<br>não existe.</h1><a class="button" href="/">Voltar ao projeto <span aria-hidden="true">→</span></a></div></section>`,{noindex:true});
  return pages;
}
export async function build() {
  const [raw,layout,home]=await Promise.all([readFile(path.join(projectRoot,'content/portal.json'),'utf8'),readFile(path.join(projectRoot,'templates/layout.html'),'utf8'),readFile(path.join(projectRoot,'templates/home.html'),'utf8')]);
  const data=JSON.parse(raw),pages=createPages(data,layout,home);
  const assets=['styles.css','script.js','html.mjs','assets/sketches.svg','assets/story-style.css','assets/fonts','assets/motion.js','assets/motion-core.mjs','assets/motion.css','assets/survey-model.mjs','assets/survey-client.mjs','assets/survey-view.mjs','assets/survey.css','assets/localities.mjs'];
  if(data.course.status==='published')assets.push('assets/journey.css','assets/lesson-player.mjs','assets/journey-model.mjs');
  const fingerprint=createHash('sha256').update(raw).update(layout).update(home);
  for(const file of [...assets.filter(file=>/\.(css|m?js)$/.test(file)),'package-lock.json'])fingerprint.update(await readFile(path.join(projectRoot,file)));
  const assetVersion=fingerprint.digest('hex').slice(0,12);
  const output=path.resolve(projectRoot,'dist');
  assert(path.dirname(output)===projectRoot&&path.basename(output)==='dist','Saída fora da pasta do projeto.');
  try{assert(!(await lstat(output)).isSymbolicLink(),'A saída não pode ser um link simbólico.');}catch(error){if(error.code!=='ENOENT')throw error;}
  await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
  for(const [route,page] of pages){page.html=page.html.replace(/(href|src)="(\/[^"?]+\.(?:css|m?js))"/g,(_,attribute,url)=>`${attribute}="${url}?v=${assetVersion}"`);const target=route==='/404/'?path.join(output,'404.html'):path.join(output,route,'index.html');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,page.html);}
  for(const file of assets){
    const target=path.join(output,file);await mkdir(path.dirname(target),{recursive:true});
    if(/\.m?js$/.test(file)){
      const client=await readFile(path.join(projectRoot,file),'utf8');
      await writeFile(target,client.replace(/(['"])(\.{1,2}\/[^'"]+\.m?js)\1/g,(_,quote,url)=>`${quote}${url}?v=${assetVersion}${quote}`));
    }else await cp(path.join(projectRoot,file),target,{recursive:true});
  }
  const vendor=path.join(output,'assets/vendor');await mkdir(vendor,{recursive:true});
  await cp(path.join(projectRoot,'node_modules/motion/dist/motion.js'),path.join(vendor,'motion.mjs'));
  await cp(path.join(projectRoot,'node_modules/motion/LICENSE.md'),path.join(vendor,'MOTION-LICENSE.md'));
  await writeFile(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
  await writeFile(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...pages].filter(([,page])=>!page.noindex).map(([route])=>`<url><loc>${e(data.site.url.replace(/\/$/,'')+route)}</loc></url>`).join('')}</urlset>`);
  await writeFile(path.join(output,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${data.site.url}/sitemap.xml\n`);
  await writeFile(path.join(output,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n');
  await writeFile(path.join(output,'_headers'),[...pages.keys()].map(route=>`${route==='/404/'?'/404.html':route}\n  Cache-Control: no-cache\n`).join('\n'),{flag:'a'});
  await writeFile(path.join(projectRoot,'index.html'),pages.get('/').html);
  console.log(`Build concluído: ${pages.size} páginas HTML; ${data.survey.questions.length} perguntas de diagnóstico; curso ${data.course.status==='published'?'publicado':'em preparação'}.`);
  return {data,pages,output};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();




