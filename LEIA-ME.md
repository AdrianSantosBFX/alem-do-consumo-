# Além do Consumo — versão enxuta

Três destinos: **O Projeto**, **Pesquisa** e **Curso sobre Consumo Sustentável**. A apresentação de cada página usa uma tela. O conteúdo do curso será uma exceção: uma única jornada vertical, com objetivos, atividades e prova final.

O visual segue a direção indicada a partir do Story of Stuff: títulos condensados, branco predominante e desenhos próprios em traço preto. A identidade mantém o azul do Além do Consumo. O nome do projeto aparece como marca tipográfica, sem ícone no cabeçalho.

## Abrir e verificar

Requer Node.js 22 ou mais recente. Execute `npm ci` para instalar a versão fixada do Motion antes de iniciar ou gerar o site.

```text
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

## Pesquisa: diagnóstico sem coleta

Edite `survey` em `content/portal.json`. O instrumento tem identificador e versão, quatro seções e 14 perguntas. Cada pergunta possui `id` estável, `section`, `title` e `type` (`single`, `multiple` ou `scale`). As opções ficam em `options`; a escala usa `min: 0` e `max: 10`; Q4 usa `maxSelections: 3`. Q6 permite todas as alternativas. As demais perguntas aceitam uma escolha. Não há gabarito no diagnóstico.

Os enunciados e alternativas seguem o planejamento do questionário. Não acrescente alternativas de não resposta ao instrumento: todas as perguntas já são opcionais, e o botão **Limpar resposta** permite retirar uma escolha. **Próxima** permite continuar sem responder. A barra indica perguntas percorridas; o contador mostra quantas têm resposta. A conclusão requer percorrer as 14 perguntas, sem obrigar a responder.

Antes de iniciar, as confirmações de 18 anos ou mais e participação voluntária são obrigatórias. A localização é opcional. `assets/localities.mjs` contém uma cópia estática das 27 UFs e dos 5.571 municípios retornados pela [API de localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades), obtida em 01/11/2026. Não há consulta ao IBGE durante a visita; a cidade é filtrada no próprio navegador e apagada ao mudar de UF. O catálogo precisará ser atualizado manualmente se a divisão municipal mudar.

### Estado e privacidade

`assets/survey-model.mjs` contém as funções puras de validação e navegação; `assets/survey-view.mjs` compartilha a apresentação entre build e navegador; `script.js` controla a interface; `assets/survey.css` estende somente os componentes da pesquisa, usando as cores e fontes já existentes.

As respostas ficam em uma variável privada da página, com `step`, `adult`, `voluntary`, `location` e `answers`. Não há banco, endpoint, envio, cookies ou armazenamento do preenchimento no navegador. Atualizar, sair da página, concluir ou reiniciar descarta os dados. A restauração pelo cache de navegação também reinicia o formulário. Formulários usam `autocomplete="off"`. Os dados não aparecem na URL, em registros do aplicativo ou em estatísticas.

A preferência existente de pausar animações é independente do questionário e não armazena respostas.

### Estrutura para integração futura

Os IDs do questionário, das perguntas e dos municípios e a versão do instrumento permitem uma futura camada de persistência separada. As alternativas são representadas por índices: mantenha a ordem dentro da mesma versão; altere a versão ao revisar enunciados ou alternativas. Respostas múltiplas são listas de índices, escala é número e ausência de resposta é um campo ausente. Não é gerado identificador de participante nesta versão.

A integração com D1 exigirá uma decisão explícita e uma nova camada de serviço, com contrato, validação no servidor e política de dados. Nenhum adaptador, função de envio, endpoint ou esquema de banco foi criado agora. O modo `preview` é o único permitido e não habilita coleta real.

### Verificações

`npm run check` verifica a sintaxe. `npm test` gera o site e verifica instrumento, maioridade, localização, navegação, respostas opcionais, escala, limite de seleção, revisão, conclusão, limpeza e ausência de APIs de persistência/envio no código da pesquisa, além das regressões das páginas e do curso. Os testes não gravam respostas reais. A interface também deve ser conferida em desktop e celular, com teclado, antes de futuras alterações.

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

Os testes de animação verificam cancelamento, restauração de estilos e substituição de transições. A validação no navegador cobre as três páginas, diálogos, pesquisa, pausa, navegação rápida e telas menores.

## Cloudflare

A arquitetura permanece estática. Use `npm run build` e publique o conteúdo de `dist/` no Cloudflare Pages. Domínio preparado nos metadados: `alemdoconsumo.com.br`. Nenhum deploy ou alteração de DNS é feito por esta revisão.

Referência visual indicada pelo responsável: [Story of Stuff](https://www.storyofstuff.org/). O projeto e sua identidade são independentes, sem vínculo oficial ou endosso da organização ou de Annie Leonard.
