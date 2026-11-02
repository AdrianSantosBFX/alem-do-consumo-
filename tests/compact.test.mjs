import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {createPages,projectRoot} from '../build.mjs';
const data=JSON.parse(await readFile(path.join(projectRoot,'content/portal.json'),'utf8'));
const layout=await readFile(path.join(projectRoot,'templates/layout.html'),'utf8');
const home=await readFile(path.join(projectRoot,'templates/home.html'),'utf8');
const results=await readFile(path.join(projectRoot,'templates/results.html'),'utf8');
const pages=createPages(data,layout,home,results);

test('O Projeto, Pesquisa, Curso e Resultados são gerados como destinos públicos',()=>{
  assert.deepEqual([...pages.keys()],['/','/pesquisa/','/curso/','/resultados/','/404/']);
  for(const [route,{html}]of pages){const nav=html.match(/<nav aria-label="Navegação principal">([\s\S]*?)<\/nav>/)[1];assert.match(nav,/>O Projeto</);assert.match(nav,/>Pesquisa</);assert.match(nav,/>Curso</);assert.match(nav,/>Resultados</);assert.doesNotMatch(nav,/Materiais|Publicações|Aprenda|Sobre/);assert.equal([...nav.matchAll(/aria-current="page"/g)].length,route==='/404/'?0:1);}
});
test('O nome do projeto é uma marca tipográfica, sem ícone no cabeçalho',()=>{
  const header=pages.get('/').html.match(/<header class="site-header[\s\S]*?<\/header>/)[0];
  assert.doesNotMatch(header,/<svg|<img|brand-symbol/);assert.match(header,/além do consumo/);
  assert.match(home,/destination-card research-destination/);assert.match(home,/destination-card course-destination/);
});
test('Rascunhos não geram um curso ou certificado funcional',()=>{
  assert.ok(!pages.has('/curso/consumo-sustentavel/'));
  const html=pages.get('/curso/').html;assert.match(html,/As aulas ainda estão sendo preparadas/);assert.doesNotMatch(html,/Iniciar curso|download=/);
  assert.doesNotMatch(pages.get('/').html,/publicacoes\/|materiais\/|aprenda\//);
});
test('Páginas preservam metadados, um h1, diálogos e links internos válidos',async()=>{
  for(const [route,{html}]of pages){
    assert.equal([...html.matchAll(/<h1\b/g)].length,1,route);assert.match(html,/<meta name="description"/);assert.match(html,/<link rel="canonical"/);assert.doesNotMatch(html,/\{\{[A-Z_]+\}\}/);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,route);
    for(const[,raw]of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(raw.startsWith('https://'))continue;const[target,fragment]=raw.split('#');if(target.startsWith('/assets/')||['/styles.css','/script.js','/html.mjs'].includes(target)){await access(path.join(projectRoot,target==='/assets/results.bundle.js'?'dist/assets/results.bundle.js':target));if(fragment){const asset=await readFile(path.join(projectRoot,target),'utf8');assert.ok(asset.includes(`id="${fragment}"`));}continue;}assert.ok(pages.has(target||route),`${route} → ${raw}`);if(fragment)assert.ok(html.includes(`id="${fragment}"`));}
  }
});
test('Saída enxuta não publica rotas ou recursos antigos',async()=>{
  const output=path.join(projectRoot,'dist');
  for(const file of ['index.html','pesquisa/index.html','curso/index.html','404.html','assets/story-style.css','assets/sketches.svg','assets/fonts/barlow-condensed-extrabold.ttf'])await access(path.join(output,file));
  for(const file of ['materiais','publicacoes','aprenda','assets/editorial.css','assets/hero-original.png','assets/lesson-player.mjs'])await assert.rejects(access(path.join(output,file)));
  const map=await readFile(path.join(output,'sitemap.xml'),'utf8');assert.equal([...map.matchAll(/<loc>/g)].length,4);
  const css=await readFile(path.join(projectRoot,'styles.css'),'utf8');assert.match(css,/height:100svh/);assert.match(css,/\.page-journey\{height:auto/);
});
