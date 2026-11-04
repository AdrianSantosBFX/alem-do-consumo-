# Além do Consumo — versão enxuta

Quatro destinos: **O Projeto**, **Pesquisa**, **Curso sobre Consumo Sustentável** e **Resultados**. A apresentação de cada página usa uma tela. O conteúdo do curso é uma exceção: uma única jornada vertical, com objetivos, atividades e prova final.

O visual segue a direção indicada a partir do Story of Stuff: títulos condensados, branco predominante e desenhos próprios em traço preto. A identidade mantém o azul do Além do Consumo. O nome do projeto aparece como marca tipográfica, sem ícone no cabeçalho.

## Abrir e verificar

Requer Node.js 22 ou mais recente. Execute `npm ci` para instalar as dependências fixadas antes de iniciar ou gerar o site.

```text
npm run db:migrate:local
npm start
```

Abra http://127.0.0.1:4173. Use Ctrl+C para encerrar. As rotas devem ser abertas pelo servidor local, não diretamente como arquivos.

```text
npm run check
npm test
npm run build
```

O build gera `dist/`. O arquivo `index.html` na raiz também é atualizado automaticamente e não deve ser editado manualmente. Os testes usam dados controlados para conferir pesquisa, conteúdo, navegação e regras de aprendizagem.

## Estado da entrega

- `/`: apresentação do projeto, dois cards de acesso e informações da iniciativa em diálogo.
- `/pesquisa/`: questionário diagnóstico com 14 perguntas opcionais em quatro seções, uma por vez. Permite responder, avançar, voltar, limpar e recomeçar.
- `/curso/`: apresentação do curso e acesso à jornada de 10 minutos.
- `/curso/consumo-sustentavel/`: sete etapas de leitura, exploração, prática e avaliação final.
- `/resultados/`: panorama interpretativo das 14 perguntas, com indicadores, quatro temas e mapa de participações por UF, sem registros individuais.
- `404.html`: página para endereços inexistentes.

Não há menus, páginas públicas ou links para Materiais e Publicações. A antiga apresentação demonstrativa do curso e as páginas de módulos não são publicadas.

As telas usam a altura da janela. Em condições excepcionais de tela muito baixa ou zoom elevado, o conteúdo pode rolar dentro da área principal ou do card para preservar a leitura. A jornada do curso usa rolagem vertical da página inteira.

## Pesquisa com Cloudflare D1

`content/portal.json` mantém os enunciados e alternativas das 14 perguntas, os IDs estáveis e a versão do instrumento. O modo ativo é `collect`; a apresentação de participação possui versão independente em `consentVersion`. Perguntas e localização continuam opcionais. Q4 admite até três escolhas; Q6 aceita múltiplas escolhas; Q2 preserva os valores de 0 a 10.

### Fluxo de envio

As confirmações de maioridade e participação voluntária são exigidas antes de iniciar. A apresentação informa que as respostas serão armazenadas para compreender hábitos de consumo e orientar as atividades educativas, com divulgação agrupada.

O preenchimento fica somente na memória da página. Nenhuma resposta é enviada ao avançar ou voltar. Na última pergunta, **Enviar respostas** faz um único POST para `/api/pesquisa`. O formulário limpa as respostas e mostra o agradecimento apenas depois de receber a confirmação do servidor. Em erro ou timeout, mantém o preenchimento e permite tentar novamente. Os controles ficam bloqueados durante o envio. Atualizar ou sair da página descarta o preenchimento ainda não enviado; uma requisição já enviada pode terminar no servidor mesmo se a aba for fechada.

`assets/survey-client.mjs` mantém um UUID aleatório por tentativa e reutiliza esse UUID quando o mesmo preenchimento é reenviado após uma falha. O servidor compara o conteúdo e devolve o mesmo recibo sem criar outra participação. Uma alteração no preenchimento cria uma nova tentativa. Não há identificação de dispositivo ou bloqueio de várias participações por pessoa.

### Dados e validação

`functions/api/pesquisa.js` aceita somente POST JSON da mesma origem, limitado a 16 KiB. `server/survey-validation.mjs` valida versão, confirmações, perguntas conhecidas, tipos, limites, alternativas e município compatível com a UF. Campos extras são rejeitados. A gravação da participação e das respostas usa uma operação D1 batch, com todas as inserções confirmadas juntas ou revertidas em falha.

O build gera `server/survey-definition.mjs` a partir de `content/portal.json`, para compatibilidade com o compilador das Functions usado pela Cloudflare. Esse arquivo é ignorado pelo Git e não é servido como recurso público. Edite somente o JSON de origem.

O banco guarda UUID aleatório, versão do instrumento, versão da apresentação, confirmações de maioridade e participação, UF/código IBGE opcionais, data de envio, hash para reenvio e respostas por pergunta. Não há campos para nome, e-mail, CPF, telefone, IP ou informações do navegador. As respostas não entram em cookies, armazenamento local, URLs ou mensagens de log do aplicativo. A preferência de pausar animações é independente.

Não há endpoint público para ler participações ou respostas individuais. O endpoint de resultados retorna apenas estatísticas agregadas. A administração atual ocorre no painel D1 ou pela ferramenta autenticada Wrangler. Não foram criados painel administrativo, rastreamento individual, CAPTCHA nem exclusão automática por prazo. Não existe recuperação de respostas da antiga prévia, pois ela não as armazenava.

### Bancos e migrações

`wrangler.toml` é a configuração do Pages e vincula `DB` a bancos diferentes:

| Ambiente | Banco |
|---|---|
| Produção | `alem-do-consumo-pesquisa` |
| Preview | `alem-do-consumo-pesquisa-testes` |

Os IDs do banco são identificadores de recurso, não credenciais. Não crie `DB` como variável de texto. A configuração foi baseada no download das configurações existentes; preserva o nome, a saída `dist` e a data de compatibilidade. A implantação do arquivo passa a controlar os vínculos no painel.

`0001_survey.sql` cria `survey_versions`, `survey_submissions` e `survey_answers`, com chaves estrangeiras e índices. `0002_diagnostic_v1.sql` registra uma cópia imutável das perguntas e alternativas da versão 1. As migrações aplicadas são controladas pelo Wrangler em `d1_migrations`. Novas alterações devem usar novos arquivos SQL. Ao alterar enunciados ou a ordem das alternativas, incremente a versão e adicione uma nova definição; preserve as versões anteriores.

Desenvolvimento local, sem acesso ao banco real:

```text
npm ci
npm run db:migrate:local
npm start
```

Migrações remotas, executadas explicitamente antes de publicar uma versão que dependa delas:

```text
npm run db:migrate:test
npm run db:migrate:production
```

Esses dois comandos exigem uma sessão Cloudflare autenticada. O build não aplica migrações automaticamente. `npm run start:static` serve apenas os arquivos visuais e não grava respostas. Estado local `.wrangler/` e arquivos `.dev.vars` são ignorados pelo Git.

`dist/_routes.json` limita as Pages Functions a `/api/*`; as páginas e os recursos permanecem estáticos. `functions/` fica na raiz do repositório e é compilada pelo Pages durante a publicação. O comando de build continua `npm run build`, com saída `dist` e branch principal `main`.

### Verificações

`npm run check` verifica a sintaxe; `npm test` inclui os testes anteriores e os testes da API, SQL, validação, idempotência, concorrência, falha com reversão e reenvio. Os testes SQL usam SQLite em memória no Node.js e também são conferidos no D1 local e de testes antes de ativar a produção. Não use dados reais para testar no banco de produção.

## Mapa e resultados públicos

O menu **Resultados** abre `/resultados/`. O React Simple Maps 5.0.5 foi integrado apenas nessa página, em um componente React isolado; as demais telas mantêm sua arquitetura. `results-build.mjs` usa esbuild para gerar o JavaScript e incluir as licenças em `dist/assets/vendor/RESULTS-LICENSES.txt`. Não há CDN, serviço de mapas externo ou envio de respostas para terceiros.

`assets/brazil-states.json` contém as 27 UFs da malha simplificada oficial do IBGE, obtida pela API de Malhas v3. Fonte e transformações constam em `assets/brazil-states-source.md`. A malha é incorporada ao arquivo JavaScript publicado. Siglas e nomes ficam em `assets/states.mjs`.

O mapa usa uma escala azul contínua e fixa, derivada das cores existentes: mais participações na UF intensificam sua cor sem clarear outras UFs. O mapa inclui somente participações com UF informada; as demais permanecem no total nacional. O número representa envios concluídos, não pessoas únicas nem proporção da população. Seleção por clique, toque, teclado ou lista de UFs mostra somente a contagem daquela UF, sem filtrar respostas.

### Privacidade da divulgação

`GET /api/resultados` executa consultas agregadas no D1 para a versão atual do instrumento. Não retorna UUIDs de participação, municípios, datas individuais, hashes ou registros brutos. Não aceita filtros por UF, cidade, período ou participante. Não faz alterações no banco e não exige nova migração.

O total nacional e as contagens por UF acompanham cada participação confirmada. Os resultados das perguntas são divulgados em grupos completos de cinco participações: 5, 10, 15 e assim por diante. A consulta usa a ordem interna de inserção, sem publicar essa ordem. Entre dois grupos completos, as respostas dos gráficos permanecem estáveis, reduzindo a exposição da contribuição de um envio isolado. Cada pergunta ainda exige pelo menos cinco respostas no conjunto publicado para liberar sua distribuição.

Respostas opcionais são contabilizadas como não respondidas dentro do conjunto publicado. Percentuais de múltipla seleção usam a quantidade de participações que responderam à pergunta como denominador, podendo somar mais de 100%. A API mantém a distribuição da escala de 0 a 10; o panorama destaca sua média declarada, sem tratá-la como nota de prova.

### Atualização e interface

A consulta é refeita a cada minuto enquanto a aba está visível, ao retornar à aba e pelo botão **Atualizar**. O servidor envia `Cache-Control: no-store`. Em erro, a interface conserva a última consulta identificada; se não houver consulta anterior, mostra indisponibilidade em vez de números fictícios.

A página apresenta uma síntese automática das frequências, três indicadores (conhecimento declarado, compras não planejadas e responsabilidade compartilhada) e quatro blocos: hábitos, dificuldades, conhecimento socioambiental e interesses. O seletor de perguntas foi removido. No computador, o mapa acompanha os temas em uma coluna lateral; no celular, todos os blocos aparecem em sequência. A área principal tem rolagem contínua, sem rolagem interna dos cards. Os controles têm rótulos acessíveis e as transições respeitam pausa e movimento reduzido.

`assets/results-model.mjs` calcula a leitura a partir dos dados agregados já publicados. Os indicadores combinados usam contagens de alternativas exclusivas da mesma pergunta, nunca somas de múltiplas escolhas. Rankings preservam empates, inclusive na terceira posição. A comparação de conhecimento só sugere temas a aprofundar quando as cinco perguntas têm base suficiente; a alternativa de referência é identificada na explicação de cada barra. Não se calcula uma nota individual ou um índice geral de sustentabilidade.

A interpretação descreve apenas o grupo participante e não atribui causas nem representatividade populacional. Bases e omissões acompanham cada indicador; as perguntas opcionais podem ter denominadores diferentes. Bases insuficientes mantêm traços e textos de espera. Os testes adicionais verificam empates, percentuais combinados sem erro de arredondamento, zeros reais, bases diferentes e bloqueio da comparação incompleta.

`tests/results.test.mjs` verifica mapa vazio, contagem com e sem UF, divulgação em grupos de cinco, cálculo dos percentuais e média, ausência de campos identificadores, rejeição de filtros e falha sem estatísticas fictícias. Dados de demonstração devem ser inseridos somente no D1 local ou no banco de testes; a produção usa as participações reais.

## Curso: cerca de 10 minutos, em uma jornada contínua

O curso está disponível em `/curso/consumo-sustentavel/`, com acesso pelo card de `/curso/`. A estrutura segue a dinâmica do player Universidade Contabilita v0.2.1 fornecido como referência: jornada vertical, desbloqueio sequencial, exploração, prática, feedback e retomada. O conteúdo e a identidade visual são próprios do Além do Consumo.

`content/portal.json` contém o curso na versão 2, com duração estimada de 10 minutos. Não há limite de tempo. A estimativa cobre leitura e participação; a duração real varia com o ritmo e as tentativas.

| Etapa | Dinâmica | Tempo estimado |
| --- | --- | --- |
| Toda escolha tem uma história | Abertura e objetivos em cards | 30 s |
| Antes e depois da vitrine | Caminho de um produto e cards de perguntas | 1,5 min |
| Uma pausa antes do clique | Cenário de decisão sobre uma promoção | 1,5 min |
| Mais uso, menos descarte | Classificação de quatro decisões | 2 min |
| Essa mudança é coletiva | Leitura, acordeões e verdadeiro ou falso | 1,5 min |
| Leve uma ideia para a semana | Reflexão sobre uma ação possível | 30 s |
| Seu olhar em prática | Avaliação final de quatro questões | 2,5 min |

O cenário e a atividade de verdadeiro ou falso precisam de uma resposta correta. O minijogo e a avaliação final exigem três acertos em quatro questões. Em erro, o participante recebe explicação e pode tentar novamente. Cada questão permanece na tela até a pessoa escolher continuar, sem avanço automático ou tempo de resposta.

As etapas anteriores podem ser revisitadas; atividades aprovadas mantêm o resultado e disponibilizam as explicações. O progresso de etapas e os resultados concluídos ficam somente no localStorage deste navegador, vinculados ao ID e à versão do curso. Uma atividade em andamento é reiniciada se a página for atualizada antes do resultado. Não há envio das respostas do curso ao banco da pesquisa. Se o armazenamento estiver indisponível, a jornada funciona durante a visita e informa essa limitação.

`course.mjs` valida os metadados e referências. `learning.mjs` gera a página; `assets/lesson-player.mjs` coordena a jornada; `assets/course-activities.mjs` apresenta cenários, minijogo e avaliação; `assets/journey-model.mjs` verifica tentativas, desbloqueio e restauração de progresso. Os tipos de bloco disponíveis incluem text, highlight, cards, flashcards, accordion, steps, quiz, scenario, sort-game e checkpoint.

As fontes de preparação estão no próprio curso: Ministério do Meio Ambiente, Story of Stuff, Prefeitura de Belo Horizonte e SINIR. Os links complementares não integram o tempo estimado. A versão do instrumento da pesquisa permanece independente da versão do curso.

O build reúne o curso em uma única rota. Para retirar temporariamente sua disponibilização, use `course.status: "draft"`; para mudanças de conteúdo que invalidem o progresso, incremente `course.version`. O certificado está habilitado após concluir todas as etapas e a avaliação final.

## Certificado em PDF sem registro nominal

`course.certificate.status` é `enabled`. O formulário de nome completo aparece somente quando o estado da jornada, restaurado e validado, confirma a conclusão de todas as etapas e a aprovação na avaliação. Quem já concluiu a versão atual pode gerar o documento sem refazer o curso. Antes disso, o formulário permanece oculto e seus controles desabilitados.

O participante informa o nome completo em um campo sem preenchimento automático. A validação aceita nomes com acentos, apóstrofos e hifens, em até 120 caracteres. O valor é normalizado e usado somente na memória da página; não é acrescentado ao estado da jornada, localStorage, sessionStorage, cookies, URL, logs ou banco de dados. O formulário não possui campos nominais de submissão nem endpoint de envio. A emissão não usa requisições de rede com o nome.

O PDF é produzido integralmente no navegador, em uma página A4 horizontal, com a identidade visual do Além do Consumo. Inclui nome, curso, duração estimada de 10 minutos e data de emissão no fuso America/Sao_Paulo. O nome se ajusta ao espaço disponível. Não há assinatura fictícia, número de registro ou consulta pública de certificados. O documento informa que a emissão é automática e não possui registro nominal.

Após gerar o arquivo, o campo é limpo. Ao sair da página, ele também é apagado; o arquivo temporário em memória é liberado após o início do download. O nome passa a existir apenas no PDF que o participante escolhe guardar. A própria interface explica essa diferença.

`assets/certificate.mjs` desenha e inicia o download; `assets/certificate-pdf.mjs` monta o arquivo PDF; `assets/certificate-model.mjs` valida nome, data e condição de emissão. Não há nova biblioteca externa, serviço de emissão, cadastro ou migração de banco. `tests/certificate.test.mjs` verifica os critérios de liberação, validação do nome, fuso da data, isolamento do estado, ausência de chamadas de persistência/envio e estrutura do PDF.

## Arquivos ativos

- `content/portal.json`: projeto, curso e instrumento versionado da pesquisa.
- `templates/layout.html` e `templates/home.html`: estrutura das telas.
- `styles.css`: layout de uma tela, componentes e responsividade.
- `assets/story-style.css`: identidade gráfica inspirada na referência.
- `assets/sketches.svg`: ilustrações próprias, sem reutilizar as figuras da referência.
- `script.js` e `assets/survey-model.mjs`: pesquisa e diálogos.
- `assets/motion.js`: preferência para pausar animações.
- `course.mjs`, `learning.mjs`, `assets/lesson-player.mjs`, `assets/journey-model.mjs`, `assets/course-activities.mjs`, `assets/journey.css`: jornada contínua e avaliação.
- `assets/certificate.mjs`, `assets/certificate-model.mjs`, `assets/certificate-pdf.mjs`, `assets/certificate.css`: emissão local do certificado e apresentação do formulário.
- `build.mjs`: valida e gera somente as páginas e os recursos necessários.
- `server.mjs`: prévia local.
- `tests/compact.test.mjs`, `tests/survey.test.mjs`, `tests/course.test.mjs`: testes ativos desta versão.

Arquivos das versões anteriores foram preservados no código-fonte, mas não são carregados nem copiados para a saída pública quando não fazem parte desta versão. O build recria `dist/` para evitar a permanência das rotas antigas.

As fontes são locais e incluem suas licenças: Barlow Condensed nos títulos e na marca; Manrope na interface; Source Serif 4 nas leituras longas. Não há consulta a serviços de fontes durante a visita.

## Animações com Motion

A biblioteca [Motion](https://motion.dev/docs/quick-start) está fixada em `motion@14.9.0`, com `package-lock.json`. O build copia o bundle oficial para `dist/assets/vendor/motion.mjs`, acompanhado da licença MIT. Não há requisição ao CDN nem dependência de React no navegador. A instalação usa `npm ci`; o restante do site continua estático.

`assets/motion.js` coordena a entrada de títulos e cards, o sublinhado do título, o movimento suave dos desenhos, interações por ponteiro e teclado, abertura dos diálogos e transições direcionais da pesquisa. `assets/motion.css` evita conflitos com os efeitos CSS anteriores, sem alterar a identidade visual. `assets/motion-core.mjs` controla o cancelamento e a restauração dos estilos.

O botão do rodapé interrompe também os movimentos contínuos. A preferência do sistema por movimento reduzido tem prioridade. A animação não bloqueia respostas nem links, não clona formulários e não recebe o estado da pesquisa. Trocas rápidas cancelam os efeitos anteriores; abas ocultas e páginas abandonadas encerram os movimentos. Se o bundle não carregar, a navegação e a pesquisa continuam funcionando.

O build adiciona uma versão por conteúdo aos links CSS/JavaScript e a todos os imports locais, inclusive o Motion. Isso impede misturar módulos antigos e novos no cache do navegador. As páginas HTML recebem `Cache-Control: no-cache` para revalidar a versão publicada; nenhuma configuração de DNS é alterada.

Os testes de animação verificam cancelamento, restauração de estilos e substituição de transições. A validação no navegador cobre as quatro páginas, diálogos, pesquisa, pausa, navegação rápida e telas menores.

## Cloudflare

As páginas permanecem estáticas e o recebimento da pesquisa usa uma Pages Function com D1. Use `npm run build` e publique o conteúdo de `dist/` no Cloudflare Pages. Domínio preparado nos metadados: `alemdoconsumo.com.br`. A publicação deve ocorrer depois das migrações necessárias; não exige mudança de DNS.

Referência visual indicada pelo responsável: [Story of Stuff](https://www.storyofstuff.org/). O projeto e sua identidade são independentes, sem vínculo oficial ou endosso da organização ou de Annie Leonard.
