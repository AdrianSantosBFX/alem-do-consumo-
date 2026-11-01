# Além do Consumo — versão enxuta

Três destinos: **O Projeto**, **Pesquisa** e **Curso sobre Consumo Sustentável**. A apresentação de cada página usa uma tela. O conteúdo do curso será uma exceção: uma única jornada vertical, com objetivos, atividades e prova final.

O visual segue a direção indicada a partir do Story of Stuff: títulos condensados, branco predominante e desenhos próprios em traço preto. A identidade mantém o azul do Além do Consumo. O nome do projeto aparece como marca tipográfica, sem ícone no cabeçalho.

## Abrir e verificar

Requer Node.js 22 ou mais recente, sem bibliotecas para instalar.

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
- `/pesquisa/`: prévia editável com quatro perguntas, uma por vez. Permite responder, avançar, voltar e recomeçar.
- `/curso/`: card de apresentação do curso e explicação do formato previsto.
- `404.html`: página para endereços inexistentes.

Não há menus, páginas públicas ou links para Materiais e Publicações. A antiga apresentação demonstrativa do curso e as páginas de módulos não são publicadas.

As telas usam a altura da janela. Em condições excepcionais de tela muito baixa ou zoom elevado, o conteúdo pode rolar dentro da área principal ou do card para preservar a leitura. A jornada do curso, quando publicada, usa rolagem vertical da página inteira.

## Pesquisa: prévia, não coleta

Edite `survey.questions` em `content/portal.json`. Cada pergunta tem `id` único, `title` e `options`. Mantenha uma alternativa `Prefiro não responder.`. As quatro perguntas são uma proposta inicial editável, não um instrumento validado de pesquisa.

O fluxo exige uma seleção antes de continuar. A opção de não responder permite seguir adiante. É possível voltar para revisar a escolha. As respostas ficam somente na memória da página: **não são enviadas e não são salvas**. Recarregar recomeça a prévia. A tela final informa isso explicitamente.

O modo `preview` é o único habilitado. Uma coleta real precisará ser definida em outra etapa, com instrumento, responsável, privacidade e serviço de coleta reais. Não basta trocar um texto para começar a coletar.

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

- `content/portal.json`: projeto, curso e prévia da pesquisa.
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

## Cloudflare

A arquitetura permanece estática. Use `npm run build` e publique o conteúdo de `dist/` no Cloudflare Pages. Domínio preparado nos metadados: `alemdoconsumo.com.br`. Nenhum deploy ou alteração de DNS é feito por esta revisão.

Referência visual indicada pelo responsável: [Story of Stuff](https://www.storyofstuff.org/). O projeto e sua identidade são independentes, sem vínculo oficial ou endosso da organização ou de Annie Leonard.
