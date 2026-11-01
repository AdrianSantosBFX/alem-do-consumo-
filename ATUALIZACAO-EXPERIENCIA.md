# Atualização da experiência — versão 2.1

> Histórico. A versão atual e enxuta está descrita em `ATUALIZACAO-ENXUTA.md` e no `LEIA-ME.md`.

A nova direção usa o recibo como uma peça editorial: uma compra cotidiana pode abrir perguntas sobre origem, escolhas e destino. A composição trabalha escala tipográfica, anotações de margem e um objeto interativo, mantendo branco e azul, Manrope nos títulos e Source Serif 4 nas leituras.

## O que mudou no portal

- Abertura com três momentos interativos: Antes, Agora e Depois.
- Recibo com movimento leve, resposta ao ponteiro em computadores e perguntas que mudam por clique ou teclado.
- Títulos com entrada sequenciada, revelação de conteúdo durante a rolagem, linha de acompanhamento da página e respostas visuais a links e botões.
- Controle para pausar e reativar as animações, persistido no navegador. A preferência de movimento reduzido do dispositivo tem prioridade.
- Nova composição das áreas de curso, pesquisa, publicações, materiais e apresentação da iniciativa. As rotas e a base estática foram mantidas.

## O formato da Universidade Contabilità

O arquivo fornecido foi examinado como referência de implementação. O padrão aproveitado é o player vertical orientado a dados: etapas curtas, mapa do percurso, blocos exploráveis, atividades com feedback, conclusão sequencial e retomada local.

O Além do Consumo agora tem esse modelo de jornada, com conteúdo próprio e a identidade do portal. Foram preparados blocos de texto, destaque, cartões, acordeões, passos, perguntas de múltipla escolha e checkpoints. As atividades podem ter nota mínima e novas tentativas. O texto continua gerado estaticamente, e as interações são aplicadas pelo navegador.

## Uma experiência que pode ser testada agora

Acesse **Aprenda → Experimentar o percurso**, ou a rota `/aprenda/como-funciona/`.

A apresentação tem três etapas reais sobre o funcionamento do portal, com uma atividade para experimentar o feedback e o avanço. Ela não é uma aula socioambiental, não compõe os seis módulos e não altera o progresso curricular.

Não foram inventadas aulas científicas. Artigos, materiais e questionários continuam aguardando conteúdos e serviços reais. Não foi adicionada autenticação, banco de dados ou coleta de respostas.

## Validação

- Verificação de sintaxe e build estático aprovados: 14 páginas, incluindo a nova apresentação e a página 404.
- 18 testes automatizados aprovados: validações editoriais, aulas legadas, novas aulas por etapas, respostas, notas mínimas, bloqueio de etapas futuras, novas tentativas, restauração de estado, mudança de versão, progresso e exclusão de rascunhos.
- Navegador: perguntas do recibo por mouse e teclado; pausa e persistência das animações; cartões; resposta incorreta; nova tentativa; aprovação; avanço; retomada após recarregar; conclusão e conferência de que a apresentação não altera o progresso dos módulos.
- Páginas principais, apresentação e um módulo verificados em 320, 768 e 1280 pixels, sem rolagem horizontal. Menu e mapa do percurso também conferidos em 390 pixels.
- A arquitetura continua sem bibliotecas adicionais, com saída em `dist/` para hospedagem estática. Não houve publicação ou alteração de DNS.

As orientações para criar aulas com `chapters` estão no final do `LEIA-ME.md`. A cópia de segurança anterior à alteração foi preservada separadamente.
