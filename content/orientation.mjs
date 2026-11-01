// A presentation of the learning format, not a curricular or scientific lesson.
export const orientation = {
  id:'apresentacao',version:1,title:'Antes de começar',
  description:'Experimente o jeito de aprender do Além do Consumo.',
  isOrientation:true,
  chapters:[
    {id:'explorar',kind:'intro',title:'Ler. Explorar. Fazer uma pausa.',subtitle:'O conhecimento não precisa chegar todo de uma vez. Aqui, o percurso acontece em pequenas etapas.',summary:'Você conheceu a organização da experiência.',blocks:[
      {type:'text',text:'Esta é uma apresentação interativa do formato do curso. Ela não é uma aula socioambiental e não entra no progresso dos seis módulos, que continuam em preparação.'},
      {type:'cards',title:'Toque para descobrir',items:[
        {title:'Leia',text:'Textos divididos em etapas, com espaço para leitura e referências.'},
        {title:'Explore',text:'Cartões, perguntas e outros blocos ajudam a examinar cada ideia.'},
        {title:'Retome',text:'O navegador guarda as etapas concluídas. Você pode sair e continuar depois no mesmo dispositivo.'}
      ]},
      {type:'highlight',text:'O tempo de aprender é seu. As etapas já concluídas continuam disponíveis para consulta.'}
    ]},
    {id:'participar',kind:'activity',title:'Agora, experimente participar.',subtitle:'Uma pergunta simples para conhecer o feedback das atividades. Você pode tentar novamente.',summary:'Você experimentou uma atividade com feedback.',blocks:[
      {type:'quiz',id:'retomada',title:'E se você precisar fazer uma pausa?',minScore:1,questions:[
        {prompt:'Ao sair de uma atividade e voltar depois, como funciona a retomada?',options:['É preciso criar uma conta para continuar.','As etapas concluídas ficam guardadas neste navegador.','O progresso é enviado automaticamente à pesquisa.'],answer:1,explanation:'As etapas são salvas apenas neste navegador. Não há cadastro nem envio desse progresso à pesquisa. Se você limpar os dados do navegador, a marcação será apagada.'}
      ]}
    ]},
    {id:'seguir',kind:'content',title:'Cada passo abre o próximo.',subtitle:'Você acabou de conhecer o formato. Agora, pode explorar a proposta dos seis módulos.',summary:'Apresentação do percurso concluída.',blocks:[
      {type:'steps',title:'Quando as aulas estiverem disponíveis',items:[{title:'Entre em um módulo',text:'As aulas serão publicadas aos poucos, após desenvolvimento e revisão.'},{title:'Percorra as etapas',text:'Leia, explore os blocos e participe das atividades indicadas.'},{title:'Continue de onde parou',text:'Seu progresso fica no navegador, sem cadastro.'}]},
      {type:'accordion',title:'Uma observação antes de seguir',items:[{title:'Atividades do curso e pesquisa são coisas diferentes',text:'As atividades desta experiência ficam apenas no navegador. A participação em pesquisa será voluntária e dependerá de um formulário real, com informações próprias de privacidade.'},{title:'E se meu navegador não puder salvar?',text:'A leitura e as atividades continuam funcionando durante a visita. Um aviso informa quando não é possível guardar as marcações para depois.'}]}
    ]}
  ]
};
