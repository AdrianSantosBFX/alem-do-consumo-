# Além do Consumo — versão enxuta

Três destinos: **O Projeto**, **Pesquisa** e **Curso sobre Consumo Sustentável**. A apresentação de cada página usa uma tela. O conteúdo do curso será uma exceção: uma única jornada vertical, com objetivos, atividades e prova final.

O visual segue a direção indicada a partir do Story of Stuff: títulos condensados, branco predominante e desenhos próprios em traço preto. A identidade mantém o azul do Além do Consumo. O nome do projeto aparece como marca tipográfica, sem ícone no cabeçalho.

## Abrir e verificar

Requer Node.js 22 ou mais recente. Execute `npm ci` para instalar a versão fixada do Motion antes de iniciar ou gerar o site.

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

O build gera `dist/`. O arquivo `index.html` na raiz também é atualizado automaticamente e não deve ser editado manualmente. Os testes usam dados controlados sem publicar aulas ou uma prova de exemplo.

## Estado da entrega

- `/`: apresentação do projeto, dois cards de acesso e informações da iniciativa em diálogo.
- `/pesquisa/`: questionário diagnóstico com 14 perguntas opcionais em quatro seções, uma por vez. Permite responder, avançar, voltar, limpar e recomeçar.
- `/curso/`: card de apresentação do curso e explicação do formato previsto.
- `404.html`: página para endereços inexistentes.

Não há menus, páginas públicas ou links para Materiais e Publicações. A antiga apresentação demonstrativa do curso e as páginas de módulos não são publicadas.

As telas usam a altura da janela. Em condições excepcionais de tela muito baixa ou zoom elevado, o conteúdo pode rolar dentro da área principal ou do card para preservar a leitura. A jornada do curso, quando publicada, usa rolagem vertical da página inteira.

## Pesquisa com Cloudflare D1

`content/portal.json` mantém os enunciados e alternativas das 14 perguntas, os IDs estáveis e a versão do instrumento. O modo ativo é `collect`; a apresentação de participação possui versão independente em `consentVersion`. Perguntas e localização continuam opcionais. Q4 admite até três escolhas; Q6 aceita múltiplas escolhas; Q2 preserva os valores de 0 a 10.

### Fluxo de envio

As confirmações de maioridade e participação voluntária são exigidas antes de iniciar. A apresentação informa que as respostas serão armazenadas para compreender hábitos de consumo e orientar as atividades educativas, com divulgação agrupada.

O preenchimento fica somente na memória da página. Nenhuma resposta é enviada ao avançar ou voltar. Na última pergunta, **Enviar respostas** faz um único POST para `/api/pesquisa`. O formulário limpa as respostas e mostra o agradecimento apenas depois de receber a confirmação do servidor. Em erro ou timeout, mantém o preenchimento e permite tentar novamente. Os controles ficam bloqueados durante o envio. Atualizar ou sair da página descarta o preenchimento ainda não enviado; uma requisição já enviada pode terminar no servidor mesmo se a aba for fechada.

`assets/survey-client.mjs` mantém um UUID aleatório por tentativa e reutiliza esse UUID quando o mesmo preenchimento é reenviado após uma falha. O servidor compara o conteúdo e devolve o mesmo recibo sem criar outra participação. Uma alteração no preenchimento cria uma nova tentativa. Não há identificação de dispositivo ou bloqueio de várias participações por pessoa.

### Dados e validação

`functions/api/pesquisa.js` aceita somente POST JSON da mesma origem, limitado a 16 KiB. `server/survey-validation.mjs` valida versão, confirmações, perguntas conhecidas, tipos, limites, alternativas e município compatível com a UF. Campos extras são rejeitados. A gravação da participação e das respostas usa uma operação D1 batch, com todas as inserções confirmadas juntas ou revertidas em falha.

O banco guarda UUID aleatório, versão do instrumento, versão da apresentação, confirmações de maioridade e participação, UF/código IBGE opcionais, data de envio, hash para reenvio e respostas por pergunta. Não há campos para nome, e-mail, CPF, telefone, IP ou informações do navegador. As respostas não entram em cookies, armazenamento local, URLs ou mensagens de log do aplicativo. A preferência de pausar animações é independente.

Não há endpoint público para ler respostas. A administração atual ocorre no painel D1 ou pela ferramenta autenticada Wrangler. Não foram criados painel administrativo, rastreamento individual, CAPTCHA nem exclusão automática por prazo. Não existe recuperação de respostas da antiga prévia, pois ela não as armazenava.

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

`dist/_routes.json` limita as Pages Functions a `/api/*`; as três páginas e os recursos permanecem estáticos. `functions/` fica na raiz do repositório e é compilada pelo Pages durante a publicação. O comando de build continua `npm run build`, com saída `dist` e branch principal `main`.

### Verificações

`npm run check` verifica a sintaxe; `npm test` inclui os testes anteriores e os testes da API, SQL, validação, idempotência, concorrência, falha com reversão e reenvio. Os testes SQL usam SQLite em memória no Node.js e também são conferidos no D1 local e de testes antes de ativar a produção. Não use dados reais para testar no banco de produção.

## Curso: uma página contínua, ainda sem conteúdo

Em `course`, mantenha `status: "draft"`, `chapters: []` e `exam: null` enquanto o conteúdo estiver sendo desenvolvido. O card informa que o curso está em preparação e não oferece um botão de início sem aulas.

A estrutura de etapas interativas existente foi preservada em `learning.mjs`, `assets/journey-model.mjs` e `assets/lesson-player.mjs`. Uma etapa pode conter texto, destaque, cartões, acordeões, passos, perguntas e checkpoints. As etapas anteriores podem ser revisitadas; as seguintes são desbloqueadas conforme a conclusão das atividades obrigatórias.

Quando for criar o conteúdo, use `course.chapters` como lista única de etapas. Cada etapa possui `id`, `kind`, `title`, opcionalmente `subtitle` e `summary`, e `blocks`. Os tipos de etapa são `intro`, `content`, `interaction`, `activity` e `checkpoint`.

Exemplo de estrutura de rascunho, para substituir por conteúdo real:

```json
{
  "id": "objetivo-inicial",
  "kind": "content",
  "title": "Título da etapa revisada",
  "blocks": [{"type": "text", "text": "Conteúdo a desenvolver e revisar."}]
}
```

Em `course.exam`, a futura prova terá `minScore` (fração maior que 0 e até 1) e `questions`. Cada questão deve ter `prompt`, `options`, `answer` (índice começando em zero) e `explanation`. A nota mínima não foi inventada nesta entrega: deverá ser definida junto à prova.

O curso só pode passar a `published` se houver conteúdo e prova final válidos. O build reúne tudo em uma única rota `/curso/consumo-sustentavel/`, com a prova ao final. Não são geradas páginas separadas por módulo ou aula. A prova é obrigatória e a conclusão depende da nota definida. O progresso da jornada fica no navegador.

## Certificado

O modelo será criado depois no Canva, conforme planejado. `course.certificate.status` permanece `planned`. Não há arquivo, botão de download ou emissão simulada. A emissão, os critérios de aprovação e os dados necessários ao certificado serão definidos quando o modelo estiver pronto.

## Arquivos ativos

- `content/portal.json`: projeto, curso e instrumento versionado da pesquisa.
- `templates/layout.html` e `templates/home.html`: estrutura das telas.
- `styles.css`: layout de uma tela, componentes e responsividade.
- `assets/story-style.css`: identidade gráfica inspirada na referência.
- `assets/sketches.svg`: ilustrações próprias, sem reutilizar as figuras da referência.
- `script.js` e `assets/survey-model.mjs`: pesquisa e diálogos.
- `assets/motion.js`: preferência para pausar animações.
- `course.mjs`, `learning.mjs`, `assets/lesson-player.mjs`, `assets/journey-model.mjs`, `assets/journey.css`: futura jornada contínua e avaliação.
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

Os testes de animação verificam cancelamento, restauração de estilos e substituição de transições. A validação no navegador cobre as três páginas, diálogos, pesquisa, pausa, navegação rápida e telas menores.

## Cloudflare

As páginas permanecem estáticas e o recebimento da pesquisa usa uma Pages Function com D1. Use `npm run build` e publique o conteúdo de `dist/` no Cloudflare Pages. Domínio preparado nos metadados: `alemdoconsumo.com.br`. A publicação deve ocorrer depois das migrações necessárias; não exige mudança de DNS.

Referência visual indicada pelo responsável: [Story of Stuff](https://www.storyofstuff.org/). O projeto e sua identidade são independentes, sem vínculo oficial ou endosso da organização ou de Annie Leonard.
