import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { createPages, validateData, projectRoot } from '../build.mjs';

const data = JSON.parse(await readFile(path.join(projectRoot,'content/portal.json'),'utf8'));
const layout = await readFile(path.join(projectRoot,'templates/layout.html'),'utf8');
const home = await readFile(path.join(projectRoot,'templates/home.html'),'utf8');
const fixture = () => structuredClone(data);
const lesson = slug => ({slug,title:`Aula de teste ${slug}`,summary:'Conteúdo somente para teste, não publicado no portal.',status:'published',blocks:[{type:'p',text:'Texto controlado do teste de geração.'}]});

test('As áreas e os seis módulos existem sem inventar conteúdo publicado',()=>{
  const pages=createPages(data,layout,home);
  for (const route of ['/','/publicacoes/','/aprenda/','/pesquisa/','/materiais/','/sobre/']) assert.ok(pages.has(route),route);
  assert.equal(pages.size,14);
  assert.equal(data.articles.length,0);
  assert.equal(data.materials.length,0);
  for(const module of data.modules) {
    const html=pages.get(`/aprenda/${module.slug}/`).html;
    assert.match(html,/As aulas deste módulo estão em preparação/);
    assert.doesNotMatch(html,/id="complete-lesson"/);
  }
  assert.match(pages.get('/aprenda/').html,/Nenhuma aula publicada por enquanto/);
  assert.doesNotMatch(pages.get('/pesquisa/').html,/<form\b/);
});

test('Artigos reais geram rota, metadados, autoria, referências e escapam texto',()=>{
  const input=fixture();
  input.articles=[{slug:'texto-em-revisao',title:'Rascunho privado',status:'draft'},{slug:'artigo-de-teste',title:'Teste <editorial>',summary:'Resumo de teste.',status:'published',category:'Categoria de teste',date:'2026-11-01',author:{type:'Person',name:'Autoria de teste'},blocks:[{type:'h2',text:'Seção'},{type:'p',text:'Texto <script>alert(1)</script>'}],references:[{label:'Referência de teste',url:'https://example.org/fonte'}]}];
  const pages=createPages(input,layout,home);
  assert.ok(!pages.has('/publicacoes/texto-em-revisao/'));
  const html=pages.get('/publicacoes/artigo-de-teste/').html;
  assert.match(html,/Teste &lt;editorial&gt;/);
  assert.match(html,/Por Autoria de teste/);
  assert.match(html,/datetime="2026-11-01"/);
  assert.match(html,/https:\/\/example.org\/fonte/);
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html,/"@type":"Article"/);
  assert.match(pages.get('/').html,/\/publicacoes\/artigo-de-teste\//);
  assert.doesNotMatch(pages.get('/').html,/Rascunho privado/);
});

test('Navegação entre aulas e módulos usa somente aulas publicadas',()=>{
  const input=fixture();
  input.modules[0].lessons=[lesson('primeira'),{slug:'rascunho',title:'Aula oculta',status:'draft'}];
  input.modules[1].lessons=[lesson('segunda')];
  const pages=createPages(input,layout,home);
  const first=`/aprenda/${input.modules[0].slug}/primeira/`;
  const second=`/aprenda/${input.modules[1].slug}/segunda/`;
  assert.ok(pages.has(first)); assert.ok(pages.has(second));
  assert.ok(!pages.has(`/aprenda/${input.modules[0].slug}/rascunho/`));
  assert.ok(pages.get(first).html.includes(`href="${second}"`));
  assert.ok(pages.get(second).html.includes(`href="${first}"`));
  assert.match(pages.get(first).html,/id="complete-lesson" aria-pressed="false"/);
  assert.match(pages.get(first).html,/0 de 2 aulas concluídas/);
  assert.doesNotMatch(pages.get(first).html,/Aula oculta/);
});

test('Pesquisa só libera um link HTTPS com responsável e privacidade',()=>{
  const input=fixture(); input.research.diagnostic.url='https://example.org/questionario';
  assert.throws(()=>validateData(input),/Responsável/);
  Object.assign(input.research.diagnostic,{responsible:'Equipe de teste',privacy:'Informação de teste.'});
  assert.match(createPages(input,layout,home).get('/pesquisa/').html,/Abrir questionário externo/);
  input.research.diagnostic.url='javascript:alert(1)';
  assert.throws(()=>validateData(input),/HTTPS/);
});

test('Dados inconsistentes e caminhos de material inseguros interrompem a geração',()=>{
  const duplicate=fixture(); duplicate.modules[1].slug=duplicate.modules[0].slug;
  assert.throws(()=>validateData(duplicate),/duplicado/);
  const material=fixture();material.materials=[{id:'guia-teste',title:'Teste',description:'Teste',format:'PDF',status:'published',url:'/assets/../../segredo'}];
  assert.throws(()=>validateData(material));
  const incomplete=fixture(); incomplete.modules[0].lessons=[{slug:'aula',title:'Aula',summary:'Resumo',status:'published',blocks:[]}];
  assert.throws(()=>validateData(incomplete),/blocos/);
});

test('Cada página tem título, descrição, canonical, um h1 e links internos válidos',async()=>{
  const pages=createPages(data,layout,home);
  for (const [route,{html}] of pages) {
    assert.equal([...html.matchAll(/<h1\b/g)].length,1,route);
    assert.match(html,/<meta name="description" content="[^"\n]+">/);
    assert.match(html,/<link rel="canonical" href="https:\/\/alemdoconsumo.com.br/);
    assert.doesNotMatch(html,/\{\{[A-Z_]+\}\}/,route);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,route);
    for (const [,raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if(raw.startsWith('https://')) continue;
      const [target,fragment]=raw.split('#');
      if(target.startsWith('/assets/') || ['/script.js','/styles.css'].includes(target)) {
        await access(path.join(projectRoot,target)); continue;
      }
      const dest=pages.get(target || route);
      assert.ok(dest,`${route} → ${raw}`);
      if(fragment) assert.ok(dest.html.includes(`id="${fragment}"`),`${route} → ${raw}`);
    }
  }
});

test('Artefato estático tem 404 real, sitemap, fontes e nenhum conteúdo de teste',async()=>{
  const output=path.join(projectRoot,'dist');
  const error=await readFile(path.join(output,'404.html'),'utf8');
  assert.match(error,/noindex, follow/);
  const sitemap=await readFile(path.join(output,'sitemap.xml'),'utf8');
  assert.doesNotMatch(sitemap,/\/404\//);
  for(const module of data.modules) assert.ok(sitemap.includes(`/aprenda/${module.slug}/`));
  await access(path.join(output,'index.html'));
  await access(path.join(output,'assets/fonts/manrope-variable.ttf'));
  await access(path.join(output,'assets/fonts/source-serif-4-variable.ttf'));
  await assert.rejects(access(path.join(output,'assets/hero-original.png')));
  const root=await readFile(path.join(output,'index.html'),'utf8');
  assert.doesNotMatch(root,/Aula de teste|artigo-de-teste|Rascunho privado/);
});

test('Cores de texto, links e botões mantêm contraste AA sobre branco',()=>{
  const luminance = hex=>{
    const c=hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return c[0]*.2126+c[1]*.7152+c[2]*.0722;
  };
  for(const color of ['1F2937','64748B','07517D']) {
    const ratio=(1.05)/(luminance(color)+.05);
    assert.ok(ratio>=4.5,`${color}: ${ratio}`);
  }
  assert.ok(1.05/(luminance('078BD3')+.05)>=3,'Azul principal nos títulos grandes');
  assert.ok((luminance('EAF6FC')+.05)/(luminance('07517D')+.05)>=4.5,'Texto azul escuro sobre as superfícies azul claro');
});
