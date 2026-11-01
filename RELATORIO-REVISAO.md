# Relatório de revisão — Além do Consumo

> Histórico da revisão 2.0. A atualização visual e de aprendizagem da versão 2.1 está documentada em `ATUALIZACAO-EXPERIENCIA.md`.

Data: 1 de novembro de 2026.

## 1. Problemas identificados

A primeira versão era uma página de apresentação de um movimento, com verde, terracota, fundo de papel e tipografia diferente da identidade agora definida. O destaque fotográfico e os convites à participação ocupavam o lugar de uma estrutura editorial e educacional.

Não havia páginas próprias para publicações, curso, pesquisa, materiais e apresentação institucional. A participação se limitava a um compromisso pessoal salvo no navegador e ao compartilhamento de um convite. O servidor só atendia a página inicial e seus recursos, sem estrutura de publicação periódica ou navegação entre aulas.

## 2. Identidade visual revisada

- Fundo branco predominante, azul principal `#078BD3`, azul escuro `#07517D` e azul claro `#EAF6FC`.
- Texto principal `#1F2937` e texto secundário `#64748B`.
- Manrope em títulos, navegação e controles; Source Serif 4 nas leituras longas, como a página Sobre e os modelos de artigos e aulas.
- Fontes incluídas no próprio projeto, com licenças OFL, sem chamadas a serviços externos durante a leitura.
- Hierarquia editorial, espaços em branco, bordas discretas e transições breves, respeitando a preferência por movimento reduzido.
- Símbolo e ilustração vetorial originais. Não foram copiadas a capa, a marca ou as ilustrações de A História das Coisas.

Os botões com texto branco usam o azul escuro para manter contraste adequado. O azul principal aparece em títulos grandes, detalhes e elementos de identidade. A fotografia da versão anterior foi preservada no código-fonte, mas retirada da interface e do pacote público gerado.

## 3. Estrutura e funcionalidades

Foi mantida a base em HTML, CSS e JavaScript, sem framework, dependências de produção, banco de dados ou autenticação. O menu acessível, o atalho para o conteúdo, o suporte a teclado e a lógica de armazenamento local foram aproveitados e adaptados ao novo escopo. O servidor local foi estendido para atender às novas rotas e responder com uma página 404 real.

O portal tem cinco áreas de conteúdo e uma página inicial:

| Área | Entrega |
| --- | --- |
| Página inicial | Propósito do projeto, curso, acesso à pesquisa, publicações recentes, materiais e origem da iniciativa. |
| Publicações | Lista editorial e geração de artigos com título, data, categoria, autoria, texto e referências. Estado vazio explícito enquanto não há textos publicados. |
| Aprenda | Seis módulos, páginas próprias, organização de aulas, navegação anterior/próxima e progresso local para as aulas que forem publicadas. |
| Pesquisa | Diagnóstico e avaliação posterior, objetivos, participação voluntária e orientações de privacidade. Sem coleta ou simulação de envio. |
| Materiais | Biblioteca com identificação, descrição e acesso a arquivos ou recursos externos quando publicados. |
| Sobre | Origem na extensão universitária, missão, objetivos, metodologia proposta, independência e referência à obra de Annie Leonard, sem sugerir vínculo ou endosso. |

Artigos, aulas, materiais e integrações são organizados em `content/portal.json`. Rascunhos não entram nas listas nem geram páginas de leitura. A publicação de dados incompletos interrompe o build com uma mensagem de validação. Os exemplos de conteúdo utilizados nos testes ficam isolados dos dados do portal.

O antigo compromisso pessoal e o convite de compartilhamento foram retirados por não fazerem parte do escopo atualizado. O armazenamento local agora serve ao progresso das aulas. A conclusão pode ser marcada e desmarcada, persiste ao recarregar e ignora identificadores de aulas removidas. Se o armazenamento estiver bloqueado, a leitura continua disponível e a limitação é informada.

O build gera HTML por rota, metadados próprios, canonical para o domínio planejado, sitemap, robots.txt, página 404 e cabeçalhos estáticos. A saída fica em `dist/`, preparada para Cloudflare Pages com o comando `npm run build`. A compatibilidade foi conferida contra a [documentação de HTML estático](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) e de [rotas e páginas 404](https://developers.cloudflare.com/pages/configuration/serving-pages/).

## 4. Pendências reais

- Desenvolver e revisar o conteúdo das aulas. Os seis módulos têm estrutura, mas nenhuma aula completa foi inventada para preenchê-los.
- Redigir, revisar e publicar os primeiros artigos, com autoria, datas e referências reais.
- Produzir e disponibilizar as cartilhas, guias e demais arquivos da biblioteca.
- Definir os questionários, os responsáveis e as informações de privacidade antes de incluir links para serviços reais de coleta.
- Publicar o portal na Cloudflare e conectar o domínio `alemdoconsumo.com.br` em etapa futura. Esta revisão não modifica DNS nem publica o site.

O portal final tem **zero artigos publicados, zero aulas publicadas, zero materiais publicados e nenhuma coleta ativa**, de forma deliberada e visível. A preparação dessas áreas não é apresentada como conteúdo disponível. O progresso não anuncia aulas concluíveis enquanto não houver aulas publicadas.

## 5. Testes e build

- Verificação de sintaxe de JavaScript e dos scripts do projeto: aprovada.
- Build estático: aprovado, com **13 páginas HTML** — página inicial, cinco áreas, seis módulos e página de erro.
- **10 testes automatizados aprovados**, sem falhas: áreas obrigatórias; artigos e referências; exclusão de rascunhos; navegação entre aulas; validação de pesquisa; rejeição de dados inválidos; links internos e metadados; saída estática; contraste de texto e botões; persistência, reversibilidade e tolerância a falhas do progresso.
- Verificação HTTP local: **12 páginas públicas com resposta 200**, fontes e recursos disponíveis, erro 404 em endereços inexistentes e no código-fonte privado à saída, redirecionamento de rotas sem barra e bloqueio de POST no servidor estático.
- Navegador: navegação pelas cinco áreas, abertura de módulo, estados de conteúdo em preparação e confirmação de carregamento das duas fontes.
- Responsividade: páginas verificadas em larguras de **320, 768 e 1280 pixels**, com revisão adicional em 390 pixels. Uma rolagem horizontal na lista de módulos foi identificada e corrigida; as páginas verificadas ficaram sem transbordamento horizontal.
- Menu de celular: abertura, navegação e fechamento por Escape conferidos. Sem erros de JavaScript registrados na prévia revisada.

Os testes de artigos, aulas e progresso usam dados controlados, que não aparecem no portal entregue. A verificação de hospedagem foi local e estrutural; não houve deploy real na Cloudflare nesta revisão.

## Uso e manutenção

Na pasta do projeto, execute `npm start` e abra http://127.0.0.1:4173. Não é necessário instalar bibliotecas. O arquivo `LEIA-ME.md` descreve como publicar artigos, aulas, materiais e configurar links de pesquisa.

A versão anterior foi preservada em uma cópia de segurança separada, antes das alterações.

Referência de inspiração verificada: [página oficial de The Story of Stuff](https://www.storyofstuff.org/movies/story-of-stuff/).
