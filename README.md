# Além do Consumo

Projeto independente e gratuito de educação socioambiental, iniciado como atividade de extensão universitária.

O site tem três áreas: **O Projeto**, **Pesquisa** e **Curso sobre Consumo Sustentável**. As páginas de apresentação são compactas; o curso terá uma jornada vertical com atividades e prova final.

## Executar localmente

Requer Node.js 22 ou mais recente. Não há dependências para instalar.

```sh
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
- Pesquisa com quatro perguntas de prévia, uma por vez. As respostas não são enviadas nem salvas.
- Curso, prova e certificado em preparação, sem conteúdos ou emissão simulados.
- Base em HTML, CSS e JavaScript, sem autenticação ou banco de dados.

Consulte [LEIA-ME.md](LEIA-ME.md) para editar o questionário, preparar o curso e conhecer os arquivos ativos. As fontes locais incluem suas respectivas licenças.

O projeto é inspirado nas reflexões de Annie Leonard em *A História das Coisas*, sem vínculo oficial ou endosso da autora ou do The Story of Stuff Project.
