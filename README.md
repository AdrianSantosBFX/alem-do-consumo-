# Além do Consumo

Projeto independente e gratuito de educação socioambiental, iniciado como atividade de extensão universitária.

O site tem quatro áreas: **O Projeto**, **Pesquisa**, **Curso sobre Consumo Sustentável** e **Resultados**. As páginas de apresentação são compactas; o curso oferece uma jornada vertical de aproximadamente 10 minutos, com atividades e avaliação final.

## Executar localmente

Requer Node.js 22 ou mais recente (Node.js 24 recomendado para os testes SQLite). Instale as dependências fixadas antes de executar:

```sh
npm ci
```

```sh
npm run db:migrate:local
npm start
```

Abra [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Verificar e gerar o site

```sh
npm run check
npm test
npm run build
```

A saída estática fica em `dist/`, que é gerada localmente e não é versionada. Para a hospedagem planejada na Cloudflare Pages, use `npm run build` e o diretório de saída `dist`.

## Estado atual

- Identidade visual própria, com marca tipográfica e ilustrações em traço preto.
- Pesquisa com 14 perguntas opcionais, quatro seções, confirmação de maioridade e localização opcional com municípios. O preenchimento fica na memória até o envio final; as respostas confirmadas são gravadas no D1. Falhas preservam o preenchimento e permitem tentar novamente.
- Resultados com panorama interpretativo nacional: síntese dos achados, três indicadores e quatro blocos temáticos, com mapa do Brasil por UF; atualização automática a cada minuto e divulgação em grupos de cinco.
- Curso de Consumo Sustentável com sete etapas, cards exploráveis, cenário de decisão, minijogo de classificação e avaliação final de quatro questões (mínimo de três acertos). Progresso salvo no navegador; certificado em PDF após concluir, com nome usado somente na geração local e sem registro nominal.
- HTML, CSS e JavaScript, com Pages Function para recebimento anônimo e Cloudflare D1.
- Animações com Motion: entradas em sequência, interações dos cards e transições da pesquisa. Biblioteca servida localmente, com pausa e preferência de movimento reduzido.

Consulte [LEIA-ME.md](LEIA-ME.md) para editar o questionário e o curso e conhecer os arquivos ativos. As fontes locais incluem suas respectivas licenças.

O projeto é inspirado nas reflexões de Annie Leonard em *A História das Coisas*, sem vínculo oficial ou endosso da autora ou do The Story of Stuff Project.
