import { Exam, ExamQuestion } from './types';

export interface ExamTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  passing_score: number;
  max_attempts: number;
  questions: Omit<ExamQuestion, 'exam_id'>[];
}

export const EXAM_TEMPLATES: ExamTemplate[] = [
  {
    id: 'template-atendimento',
    category: 'Vendas & Atendimento',
    title: 'Avaliação Prática de Atendimento ao Cliente e Vendas',
    description: 'Teste de competências para lidar com clientes, resolução de reclamações e técnicas de vendas.',
    time_limit_minutes: 15,
    passing_score: 70,
    max_attempts: 2,
    questions: [
      {
        id: 'q1',
        question_text: 'Qual deve ser a primeira atitude ao receber um cliente insatisfeito no balcão?',
        question_type: 'multiple_choice',
        options: [
          'Interromper e explicar que a culpa não foi da empresa',
          'Ouvir com atenção e empatia, mantendo a calma e demonstrando interesse em resolver',
          'Pedir imediatamente para o cliente falar com a gerência',
          'Dizer ao cliente que ele precisa de preencher um formulário por escrito'
        ],
        correct_answer: 'Ouvir com atenção e empatia, mantendo a calma e demonstrando interesse em resolver',
        explanation: 'A escuta ativa e a empatia acalmam o cliente e criam confiança para encontrar uma solução eficaz.',
        points: 20,
        is_required: true
      },
      {
        id: 'q2',
        question_text: 'Em vendas, o termo "Upselling" refere-se a:',
        question_type: 'multiple_choice',
        options: [
          'Oferecer um product de valor ou versão superior ao que o cliente pretendia comprar',
          'Vender produtos com defeito com desconto',
          'Cobrar juros adicionais nas compras a prazo',
          'Recusar a venda por falta de troco'
        ],
        correct_answer: 'Oferecer um product de valor ou versão superior ao que o cliente pretendia comprar',
        explanation: 'Upselling é a técnica de sugerir uma versão mais completa ou superior que atenda ainda melhor as necessidades do comprador.',
        points: 20,
        is_required: true
      },
      {
        id: 'q3',
        question_text: 'A pontualidade e apresentação pessoal cuidada são essenciais no atendimento presencial.',
        question_type: 'true_false',
        options: ['Verdadeiro', 'Falso'],
        correct_answer: 'Verdadeiro',
        explanation: 'A imagem pessoal e o cumprimento de horários transmitem o profissionalismo e o respeito pela marca.',
        points: 20,
        is_required: true
      },
      {
        id: 'q4',
        question_text: 'Quando um product solicitado pelo cliente está esgotado no armazém, o que deve fazer?',
        question_type: 'multiple_choice',
        options: [
          'Dizer apenas "não temos" e aguardar o próximo cliente',
          'Informar cordialmente sobre a previsão de reposição ou sugerir uma alternativa equivalente',
          'Aconselhar o cliente a procurar na concorrência',
          'Ignorar o pedido do cliente'
        ],
        correct_answer: 'Informar cordialmente sobre a previsão de reposição ou sugerir uma alternativa equivalente',
        explanation: 'Oferecer alternativas viáveis retém o cliente e valoriza o atendimento.',
        points: 20,
        is_required: true
      },
      {
        id: 'q5',
        question_text: 'Como se define a sigla SAC no relacionamento com clientes?',
        question_type: 'multiple_choice',
        options: [
          'Serviço de Apoio ao Cliente',
          'Sistema de Auditoria Contábil',
          'Sector de Armazenamento e Cargas',
          'Sociedade Angolana de Comércio'
        ],
        correct_answer: 'Serviço de Apoio ao Cliente',
        explanation: 'SAC é o canal dedicado a tirar dúvidas, receber reclamações e prestar assistência pós-venda.',
        points: 20,
        is_required: true
      }
    ]
  },
  {
    id: 'template-caixa',
    category: 'Finanças & Caixa',
    title: 'Teste de Operador de Caixa & Controlo Financeiro',
    description: 'Avaliação de conferência de trocos, notas bancárias, fecho de caixa e organização contábil.',
    time_limit_minutes: 20,
    passing_score: 75,
    max_attempts: 2,
    questions: [
      {
        id: 'c1',
        question_text: 'Um cliente faz uma compra de 13.450 Kz e paga com duas notas de 10.000 Kz (total 20.000 Kz). Qual o troco exato a devolver?',
        question_type: 'multiple_choice',
        options: [
          '6.550 Kz',
          '6.450 Kz',
          '7.550 Kz',
          '5.550 Kz'
        ],
        correct_answer: '6.550 Kz',
        explanation: '20.000 Kz - 13.450 Kz = 6.550 Kz.',
        points: 20,
        is_required: true
      },
      {
        id: 'c2',
        question_text: 'O que se deve fazer antes de iniciar o turno de trabalho num ponto de venda (POS)?',
        question_type: 'multiple_choice',
        options: [
          'Conferir o fundo de maneio (valor inicial para troco) e verificar o rolo térmico da impressora',
          'Começar a vender sem verificar o valor que está na gaveta',
          'Alterar a palavra-passe do sistema informático',
          'Ligar para o banco para pedir empréstimo'
        ],
        correct_answer: 'Conferir o fundo de maneio (valor inicial para troco) e verificar o rolo térmico da impressora',
        explanation: 'A conferência do fundo de caixa garante que não haverá faltas nem sobras injustificadas no fecho.',
        points: 20,
        is_required: true
      },
      {
        id: 'c3',
        question_text: 'Ao receber um pagamento por TPA (Multicaixa), é obrigatório entregar o comprovativo do cliente e guardar o talão do comerciante para conferência.',
        question_type: 'true_false',
        options: ['Verdadeiro', 'Falso'],
        correct_answer: 'Verdadeiro',
        explanation: 'O talão do comerciante é o comprovativo contábil indispensável para a conciliação bancária do fecho de contas.',
        points: 20,
        is_required: true
      },
      {
        id: 'c4',
        question_text: 'Se no final do dia o caixa apresentar uma divergência (sobra ou quebra), qual o procedimento correto?',
        question_type: 'multiple_choice',
        options: [
          'Ocultar a diferença e retirar dinheiro do próprio bolso',
          'Registar a diferença no relatório de fecho de caixa e comunicar imediatamente à supervisão',
          'Deixar a gaveta aberta para o dia seguinte',
          'Alterar as faturas emitidas para bater o valor'
        ],
        correct_answer: 'Registar a diferença no relatório de fecho de caixa e comunicar imediatamente à supervisão',
        explanation: 'A transparência e o registo de fecho com assinatura são regras éticas fundamentais em qualquer empresa.',
        points: 20,
        is_required: true
      },
      {
        id: 'c5',
        question_text: 'Qual o elemento de segurança oficial para identificar notas falsas do Kwanza angolano?',
        question_type: 'multiple_choice',
        options: [
          'Marca de água, fita de segurança magnética e relevo tátil nas figuras',
          'O cheiro da tinta apenas',
          'O tamanho da nota deve ser igual ao do dólar',
          'Apenas a cor da moldura'
        ],
        correct_answer: 'Marca de água, fita de segurança magnética e relevo tátil nas figuras',
        explanation: 'As notas do Banco Nacional de Angola (BNA) contêm marca de água, elementos fluorescentes e relevos táteis.',
        points: 20,
        is_required: true
      }
    ]
  },
  {
    id: 'template-informatica',
    category: 'Tecnologia & Escritório',
    title: 'Exame de Informática Administrativa & Ferramentas Office',
    description: 'Avaliação de conhecimentos em Word, Excel, correio eletrónico profissional e segurança da informação.',
    time_limit_minutes: 20,
    passing_score: 70,
    max_attempts: 2,
    questions: [
      {
        id: 'inf1',
        question_text: 'No Microsoft Excel, qual fórmula é utilizada para calcular a soma dos valores das células A1 até A10?',
        question_type: 'multiple_choice',
        options: [
          '=SOMA(A1:A10)',
          '=ADICIONAR(A1..A10)',
          '=TOTAL(A1-A10)',
          '=CALCULAR(A1+A10)'
        ],
        correct_answer: '=SOMA(A1:A10)',
        explanation: 'A fórmula =SOMA(A1:A10) é o padrão em português para totalizar o intervalo selecionado.',
        points: 20,
        is_required: true
      },
      {
        id: 'inf2',
        question_text: 'Qual o formato de ficheiro mais adequado para enviar um documento oficial ou proposta sem que seja desformatado?',
        question_type: 'multiple_choice',
        options: [
          'PDF (.pdf)',
          'Bloco de Notas (.txt)',
          'Ficheiro executável (.exe)',
          'Ficheiro temporário (.tmp)'
        ],
        correct_answer: 'PDF (.pdf)',
        explanation: 'O formato PDF (Portable Document Format) preserva o layout, fontes e imagens em qualquer dispositivo.',
        points: 20,
        is_required: true
      },
      {
        id: 'inf3',
        question_text: 'Ao receber um e-mail suspeito com um link a pedir a confirmação da palavra-passe bancária ou de email, o que deve fazer?',
        question_type: 'multiple_choice',
        options: [
          'Clicar imediatamente para não perder o acesso',
          'Eliminar a mensagem e não clicar em nenhum link (tentativa de phishing)',
          'Reencaminhar para todos os colegas da empresa',
          'Responder ao email enviando os dados solicitados'
        ],
        correct_answer: 'Eliminar a mensagem e não clicar em nenhum link (tentativa de phishing)',
        explanation: 'Nunca se devem fornecer credenciais através de links de e-mail; trata-se de um ataque cibernético (phishing).',
        points: 20,
        is_required: true
      },
      {
        id: 'inf4',
        question_text: 'O atalho de teclado padrão para guardar um documento no Microsoft Word e Excel (em português) é:',
        question_type: 'multiple_choice',
        options: [
          'Ctrl + B (ou Ctrl + S)',
          'Ctrl + Z',
          'Alt + F4',
          'Ctrl + Esc'
        ],
        correct_answer: 'Ctrl + B (ou Ctrl + S)',
        explanation: 'Ctrl + B é o atalho em Office versão Português (e Ctrl + S em versões internacionais).',
        points: 20,
        is_required: true
      },
      {
        id: 'inf5',
        question_text: 'O serviço de armazenamento em nuvem permite guardar ficheiros na Internet e partilhá-los em tempo real com colegas de trabalho.',
        question_type: 'true_false',
        options: ['Verdadeiro', 'Falso'],
        correct_answer: 'Verdadeiro',
        explanation: 'Google Drive, OneDrive e Dropbox são exemplos comuns de plataformas de nuvem colaborativa.',
        points: 20,
        is_required: true
      }
    ]
  },
  {
    id: 'template-logistica',
    category: 'Logística & Armazém',
    title: 'Teste de Gestão de Armazém, Cargas & Stock',
    description: 'Avaliação de conferência de mercadorias, fichas de stock (FIFO/PEPS) e segurança ocupacional.',
    time_limit_minutes: 15,
    passing_score: 70,
    max_attempts: 2,
    questions: [
      {
        id: 'log1',
        question_text: 'O método PEPS / FIFO na gestão de stocks estabelece que:',
        question_type: 'multiple_choice',
        options: [
          'O primeiro product a entrar no armazém deve ser o primeiro a sair para venda',
          'O product mais barato deve sair primeiro',
          'O product que chegou por último é vendido primeiro',
          'Os produtos não perecíveis têm prioridade absoluta'
        ],
        correct_answer: 'O primeiro product a entrar no armazém deve ser o primeiro a sair para venda',
        explanation: 'PEPS (Primeiro a Entrar, Primeiro a Sair) evita que produtos mais antigos atinjam o prazo de validade no armazém.',
        points: 25,
        is_required: true
      },
      {
        id: 'log2',
        question_text: 'O documento emitido pelo fornecedor que discrimina a quantidade e a descrição dos produtos transportados chama-se:',
        question_type: 'multiple_choice',
        options: [
          'Guia de Remessa / Guia de Transporte',
          'Contrato de Trabalho',
          'Extrato Bancário',
          'Boletim Meteorológico'
        ],
        correct_answer: 'Guia de Remessa / Guia de Transporte',
        explanation: 'A Guia de Remessa acompanha a mercadoria em trânsito e é confrontada com o product na receção.',
        points: 25,
        is_required: true
      },
      {
        id: 'log3',
        question_text: 'O uso de Equipamento de Proteção Individual (EPI), como botas com biqueira de aço e colete refletor, é obrigatório na movimentação de cargas pesadas.',
        question_type: 'true_false',
        options: ['Verdadeiro', 'Falso'],
        correct_answer: 'Verdadeiro',
        explanation: 'Os EPIs previnem acidentes de trabalho graves e cumprem as normas de segurança e saúde no trabalho em Angola.',
        points: 25,
        is_required: true
      },
      {
        id: 'log4',
        question_text: 'Ao verificar avarias em caixas durante a descarga do camião, qual deve ser a providência imediata?',
        question_type: 'multiple_choice',
        options: [
          'Aceitar a carga e guardar o segredo',
          'Registar a avaria na Guia de Remessa e comunicar ao encarregado antes da assinatura',
          'Colocar os produtos avariados à venda com preço normal',
          'Despejar as caixas no lixo sem informar'
        ],
        correct_answer: 'Registar a avaria na Guia de Remessa e comunicar ao encarregado antes da assinatura',
        explanation: 'O registo imediato resguarda a responsabilidade da empresa e permite o reembolso ou substituição da mercadoria.',
        points: 25,
        is_required: true
      }
    ]
  },
  {
    id: 'template-conducao',
    category: 'Condução & Transporte',
    title: 'Avaliação de Condução Defensiva & Código de Estrada',
    description: 'Teste para motoristas profissionais, distribuidores e condutores de veículos comerciais no Cunene.',
    time_limit_minutes: 20,
    passing_score: 75,
    max_attempts: 2,
    questions: [
      {
        id: 'mot1',
        question_text: 'Em condições de chuva intensa ou estradas de terra com piso escorregadio, o condutor deve:',
        question_type: 'multiple_choice',
        options: [
          'Aumentar a velocidade para chegar mais depressa ao destino',
          'Reduzir a velocidade, acender os médios e aumentar a distância de segurança em relação ao veículo da frente',
          'Travar bruscamente e desligar o motor',
          'Conduzir colado à berma sem luzes'
        ],
        correct_answer: 'Reduzir a velocidade, acender os médios e aumentar a distância de segurança em relação ao veículo da frente',
        explanation: 'A distância de travagem duplica com piso molhado; a velocidade moderada e visibilidade evitam colisões.',
        points: 25,
        is_required: true
      },
      {
        id: 'mot2',
        question_text: 'O uso do cinto de segurança é obrigatório para todos os passageiros e o condutor.',
        question_type: 'true_false',
        options: ['Verdadeiro', 'Falso'],
        correct_answer: 'Verdadeiro',
        explanation: 'O Código de Estrada em Angola exige o cinto de segurança em todas as vias e reduz em 50% o risco de fatalidades.',
        points: 25,
        is_required: true
      },
      {
        id: 'mot3',
        question_text: 'Antes de iniciar uma viagem longa no trajeto Ondjiva - Lubango ou Ondjiva - Santa Clara, quais os itens que devem ser inspecionados no veículo?',
        question_type: 'multiple_choice',
        options: [
          'Nível de óleo do motor, água do radiador, pressão dos pneus (incluindo o sobressalente) e triângulo/colete',
          'Apenas a rádio do carro',
          'Apenas a cor dos estofos',
          'Não é necessária nenhuma inspeção'
        ],
        correct_answer: 'Nível de óleo do motor, água do radiador, pressão dos pneus (incluindo o sobressalente) e triângulo/colete',
        explanation: 'A manutenção preventiva antes da viagem previne avarias graves e paragens perigosas na estrada.',
        points: 25,
        is_required: true
      },
      {
        id: 'mot4',
        question_text: 'Qual é o comportamento correto ao aproximar-se de uma passagem de peões (passadeira)?',
        question_type: 'multiple_choice',
        options: [
          'Buzinar para os peões correrem',
          'Abrandar a marcha e parar se houver peões a atravessar ou com intenção de atravessar',
          'Acelerar para passar antes deles',
          'Ultrapassar os outros veículos parados na passadeira'
        ],
        correct_answer: 'Abrandar a marcha e parar se houver peões a atravessar ou com intenção de atravessar',
        explanation: 'O peão tem sempre prioridade absoluta na passadeira segundo a legislação rodoviária angolana.',
        points: 25,
        is_required: true
      }
    ]
  }
];

// Simulados públicos livres para treino e capacitação no Cunene
export const FREE_PRACTICE_EXAMS: Exam[] = EXAM_TEMPLATES.map((t, idx) => ({
  id: 'free-' + t.id,
  job_id: 'practice-general',
  title: t.title + ' (Simulado Livre)',
  description: t.description + ' Faça este teste preparatório para valorizar o seu currículo.',
  time_limit_minutes: t.time_limit_minutes,
  passing_score: t.passing_score,
  max_attempts: 99,
  is_required: false,
  is_simulated: true,
  questions: t.questions.map((q, qIdx) => ({
    ...q,
    id: `free-${t.id}-q${qIdx + 1}`,
    exam_id: 'free-' + t.id
  })),
  created_at: new Date().toISOString()
}));
