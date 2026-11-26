/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionDeclaration, GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export const ALL_CLINIC_TOOLS: FunctionDeclaration[] = [
  {
    name: 'add_transaction',
    description:
      'Registra um novo lançamento financeiro (receita ou despesa) na clínica. Use para consultas, procedimentos, recebimentos, pagamentos, aluguel, salários, compras, etc.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        patientName: {
          type: Type.STRING,
          description: 'Nome do paciente relacionado ao lançamento, quando mencionado (opcional).',
        },
        description: {
          type: Type.STRING,
          description:
            'Descrição clara do lançamento (ex: "Consulta de avaliação", "Limpeza", "Conta de energia").',
        },
        value: {
          type: Type.NUMBER,
          description: 'Valor em reais (número positivo, ex: 350 ou 1250.5).',
        },
        type: {
          type: Type.STRING,
          description: 'Tipo do lançamento: "receita" (entrada) ou "despesa" (saída).',
        },
        category: {
          type: Type.STRING,
          description:
            'Categoria: "Consultas", "Procedimentos", "Materiais", "Laboratório", "Aluguel", "Salários", "Impostos", "Marketing", "Manutenção" ou "Outros".',
        },
        doctorName: {
          type: Type.STRING,
          description:
            'Nome da dentista responsável (use o nome exato de uma dentista cadastrada se houver) ou "Administração".',
        },
        paymentMethod: {
          type: Type.STRING,
          description:
            'Forma de pagamento: "Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Boleto" ou "Outros".',
        },
        status: {
          type: Type.STRING,
          description: 'Status do pagamento: "pago" ou "pendente". Padrão: "pago".',
        },
        date: {
          type: Type.STRING,
          description: 'Data do lançamento no formato YYYY-MM-DD. Se não informada, use a data de hoje.',
        },
        supplier: {
          type: Type.STRING,
          description: 'Nome do fornecedor, se aplicável.',
        },
      },
      required: ['description', 'value', 'type'],
    },
  },
  {
    name: 'delete_transaction',
    description: 'Exclui um lançamento financeiro existente pelo ID exato.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        transactionId: {
          type: Type.STRING,
          description: 'ID exato do lançamento listado no contexto atual.',
        },
      },
      required: ['transactionId'],
    },
  },
  {
    name: 'add_supply_item',
    description: 'Cadastra um novo material ou produto no estoque da clínica.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'Nome do item (ex: "Luva Nitrílica M", "Resina Composta A2").',
        },
        category: {
          type: Type.STRING,
          description:
            'Categoria do material (ex: "Descartáveis", "Restauradores", "Anestésicos", "Biossegurança", "Endodontia", "Ortodontia", "Outros").',
        },
        stock: {
          type: Type.NUMBER,
          description: 'Quantidade atual em estoque.',
        },
        minStock: {
          type: Type.NUMBER,
          description: 'Quantidade mínima para alerta de reposição. Padrão: 5.',
        },
        unit: {
          type: Type.STRING,
          description: 'Unidade de medida (ex: "cx", "un", "pct", "frasco", "seringa", "kit"). Padrão: "un".',
        },
        price: {
          type: Type.NUMBER,
          description: 'Preço unitário em reais. Padrão: 0.',
        },
        supplier: {
          type: Type.STRING,
          description: 'Fornecedor do item (opcional).',
        },
        location: {
          type: Type.STRING,
          description: 'Localização ou armário (opcional).',
        },
        expirationDate: {
          type: Type.STRING,
          description: 'Data de validade no formato YYYY-MM-DD (opcional).',
        },
        batchNumber: {
          type: Type.STRING,
          description: 'Número do lote (opcional).',
        },
      },
      required: ['name', 'stock'],
    },
  },
  {
    name: 'update_supply_item',
    description:
      'Edita os dados de um item já existente no estoque (nome, quantidade exata, estoque mínimo, preço, categoria, validade, lote, fornecedor ou localização).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemId: { type: Type.STRING, description: 'ID exato do item no estoque.' },
        name: { type: Type.STRING, description: 'Novo nome do item.' },
        category: { type: Type.STRING, description: 'Nova categoria.' },
        stock: { type: Type.NUMBER, description: 'Nova quantidade absoluta em estoque.' },
        minStock: { type: Type.NUMBER, description: 'Novo estoque mínimo.' },
        unit: { type: Type.STRING, description: 'Nova unidade de medida.' },
        price: { type: Type.NUMBER, description: 'Novo preço unitário em reais.' },
        supplier: { type: Type.STRING, description: 'Novo fornecedor.' },
        location: { type: Type.STRING, description: 'Nova localização/armário.' },
        expirationDate: { type: Type.STRING, description: 'Nova validade (YYYY-MM-DD).' },
        batchNumber: { type: Type.STRING, description: 'Novo número de lote.' },
      },
      required: ['itemId'],
    },
  },
  {
    name: 'adjust_supply_stock',
    description:
      'Soma (valor positivo) ou dá baixa/subtrai (valor negativo) uma quantidade no estoque de um item já cadastrado.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemId: { type: Type.STRING, description: 'ID exato do item no estoque.' },
        delta: {
          type: Type.NUMBER,
          description: 'Quantidade a adicionar (positivo, ex: 10) ou retirar/dar baixa (negativo, ex: -3).',
        },
      },
      required: ['itemId', 'delta'],
    },
  },
  {
    name: 'delete_supply_item',
    description: 'Remove um item do estoque pelo ID exato.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemId: { type: Type.STRING, description: 'ID exato do item no estoque.' },
      },
      required: ['itemId'],
    },
  },
  {
    name: 'record_purchase_expense',
    description: 'Registra uma compra de materiais/insumos nas despesas de compras.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING, description: 'Descrição da compra de materiais.' },
        value: { type: Type.NUMBER, description: 'Valor total da compra em reais.' },
        supplier: { type: Type.STRING, description: 'Nome do fornecedor ou dental (opcional).' },
        subcategory: { type: Type.STRING, description: 'Subcategoria do material (opcional).' },
        date: { type: Type.STRING, description: 'Data da compra YYYY-MM-DD (opcional, padrão hoje).' },
      },
      required: ['description', 'value'],
    },
  },
  {
    name: 'add_doctor',
    description: 'Cadastra uma nova dentista/doutora na clínica.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nome completo da dentista (ex: "Dra. Juliana Costa").' },
        specialty: {
          type: Type.STRING,
          description: 'Especialidade odontológica (ex: "Ortodontia", "Implantodontia", "Clínica Geral").',
        },
        cro: { type: Type.STRING, description: 'Número do CRO (opcional).' },
        email: { type: Type.STRING, description: 'E-mail da dentista (opcional).' },
        monthlyTarget: { type: Type.NUMBER, description: 'Meta mensal de faturamento em reais. Padrão: 0.' },
        role: { type: Type.STRING, description: 'Cargo/função. Padrão: "Dentista".' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_doctor_target',
    description: 'Atualiza a meta mensal de faturamento de uma dentista cadastrada.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        doctorId: { type: Type.STRING, description: 'ID exato da dentista.' },
        monthlyTarget: { type: Type.NUMBER, description: 'Novo valor da meta mensal em reais.' },
      },
      required: ['doctorId', 'monthlyTarget'],
    },
  },
  {
    name: 'update_doctor_stats',
    description: 'Atualiza o número de avaliações, fechamentos e/ou meta mensal de uma dentista.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        doctorId: { type: Type.STRING, description: 'ID exato da dentista.' },
        evaluations: { type: Type.NUMBER, description: 'Quantidade de avaliações no mês.' },
        closures: { type: Type.NUMBER, description: 'Quantidade de fechamentos no mês.' },
        monthlyTarget: { type: Type.NUMBER, description: 'Meta mensal em reais (apenas Gestão).' },
      },
      required: ['doctorId'],
    },
  },
  {
    name: 'set_monthly_goal',
    description: 'Define ou atualiza a meta geral de faturamento mensal da clínica.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER, description: 'Valor da meta mensal em reais (ex: 50000).' },
      },
      required: ['value'],
    },
  },
  {
    name: 'add_team_goal',
    description: 'Cria uma nova meta para a equipe ou para uma pessoa específica.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título da meta.' },
        targetValue: { type: Type.NUMBER, description: 'Valor alvo da meta.' },
        currentValue: { type: Type.NUMBER, description: 'Valor atual já atingido. Padrão: 0.' },
        deadline: { type: Type.STRING, description: 'Prazo no formato YYYY-MM-DD.' },
        assignedTo: { type: Type.STRING, description: 'Responsável pela meta.' },
      },
      required: ['title', 'targetValue'],
    },
  },
  {
    name: 'update_goal_progress',
    description: 'Adiciona progresso a uma meta de equipe existente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        goalId: { type: Type.STRING, description: 'ID exato da meta.' },
        progressDelta: { type: Type.NUMBER, description: 'Valor a somar (ou subtrair) no progresso atual.' },
      },
      required: ['goalId', 'progressDelta'],
    },
  },
  {
    name: 'add_team_member',
    description: 'Cadastra um novo funcionário ou membro na equipe da clínica.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nome completo do membro da equipe.' },
        role: { type: Type.STRING, description: 'Função/cargo (ex: "Recepcionista", "ASB").' },
        status: { type: Type.STRING, description: 'Status inicial: "Ativo", "Em plantão" ou "Ausente".' },
      },
      required: ['name', 'role'],
    },
  },
  {
    name: 'update_team_member_status',
    description: 'Altera o status de presença de um membro da equipe.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        memberId: { type: Type.STRING, description: 'ID exato do membro da equipe.' },
        status: { type: Type.STRING, description: 'Novo status: "Ativo", "Em plantão" ou "Ausente".' },
      },
      required: ['memberId', 'status'],
    },
  },
  {
    name: 'add_lab_procedure',
    description: 'Cadastra um novo trabalho/pedido para envio ao laboratório protético.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        patientName: { type: Type.STRING, description: 'Nome do paciente.' },
        procedureType: {
          type: Type.STRING,
          description:
            'Tipo de peça: "Prótese", "Coroa", "Faceta", "Implante", "Onlay/Inlay", "Placa Alinhadora/Miorrelaxante" ou "Outro".',
        },
        laboratoryName: { type: Type.STRING, description: 'Nome do laboratório parceiro.' },
        doctorName: { type: Type.STRING, description: 'Nome da dentista solicitante.' },
        expectedReturnDate: { type: Type.STRING, description: 'Previsão de entrega YYYY-MM-DD.' },
        value: { type: Type.NUMBER, description: 'Valor cobrado pelo laboratório em reais. Padrão: 0.' },
        status: {
          type: Type.STRING,
          description: 'Status inicial: "A Enviar", "No Laboratório", "Recebido", "Instalado" ou "Ajuste".',
        },
        shade: { type: Type.STRING, description: 'Cor/escala do dente (opcional).' },
        notes: { type: Type.STRING, description: 'Observações adicionais (opcional).' },
      },
      required: ['patientName', 'procedureType', 'laboratoryName'],
    },
  },
  {
    name: 'update_lab_procedure_status',
    description: 'Atualiza o status de um trabalho existente no laboratório.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        procedureId: { type: Type.STRING, description: 'ID exato do procedimento de laboratório.' },
        status: {
          type: Type.STRING,
          description: 'Novo status: "A Enviar", "No Laboratório", "Recebido", "Instalado" ou "Ajuste".',
        },
      },
      required: ['procedureId', 'status'],
    },
  },
  {
    name: 'navigate_to_tab',
    description: 'Abre diretamente uma seção/tela do aplicativo quando o usuário pedir para ir ou abrir uma tela.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tab: {
          type: Type.STRING,
          description:
            'ID da aba: "visao-geral", "financeiro", "doutora", "metas-equipe", "compras", "sanitizacao", "laboratorio", "utilitarios", "historico" ou "acessos".',
        },
      },
      required: ['tab'],
    },
  },
];

function getAllowedToolsForRole(role: string): FunctionDeclaration[] {
  if (role === 'gestao') return ALL_CLINIC_TOOLS;
  if (role === 'funcionario') {
    const allowed = new Set([
      'add_supply_item',
      'update_supply_item',
      'adjust_supply_stock',
      'delete_supply_item',
      'record_purchase_expense',
      'add_lab_procedure',
      'update_lab_procedure_status',
      'navigate_to_tab',
    ]);
    return ALL_CLINIC_TOOLS.filter(t => t.name && allowed.has(t.name));
  }
  const allowed = new Set([
    'update_doctor_stats',
    'add_lab_procedure',
    'update_lab_procedure_status',
    'navigate_to_tab',
  ]);
  return ALL_CLINIC_TOOLS.filter(t => t.name && allowed.has(t.name));
}

function isTransientOverload(error: any): boolean {
  const status = Number(error?.status || error?.code || 0);
  const msg = String(error?.message || '').toLowerCase();
  return (
    status === 503 ||
    status === 500 ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('timeout') ||
    msg.includes('503')
  );
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const err: any = new Error(`Timeout after ${ms}ms (${label})`);
        err.status = 503;
        reject(err);
      }, ms);
    }),
  ]);
}

async function generateWithFallback(
  ai: GoogleGenAI,
  params: { contents: any; config: any }
) {
  const attempts: Array<{ model: string; thinkingLevel?: ThinkingLevel; timeoutMs: number }> = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 5500 },
    { model: 'gemini-3.1-flash-lite', timeoutMs: 9000 },
  ];

  let lastError: any = null;
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    if (i > 0) {
      await sleep(250);
    }
    try {
      const mergedConfig = attempt.thinkingLevel
        ? {
            ...params.config,
            thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
          }
        : params.config;

      return await withTimeout(
        ai.models.generateContent({
          model: attempt.model,
          contents: params.contents,
          config: mergedConfig,
        }),
        attempt.timeoutMs,
        attempt.model
      );
    } catch (err: any) {
      lastError = err;
      if (!isTransientOverload(err)) {
        throw err;
      }
      console.warn(`[Gemini] Modelo ${attempt.model} indisponível/lento, tentando alternativa...`);
    }
  }
  throw lastError;
}

export function formatGeminiError(error: any): { status: number; message: string } {
  const msg = String(error?.message || '');
  const status = Number(error?.status || 0);

  if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || status === 403 || status === 400) {
    return {
      status: 403,
      message: 'Chave da API Gemini inválida ou sem permissão. Verifique a variável GEMINI_API_KEY nas configurações.',
    };
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || status === 429) {
    return {
      status: 429,
      message: 'Limite temporário de pedidos atingido. Aguarde alguns segundos e tente novamente.',
    };
  }
  if (isTransientOverload(error)) {
    return {
      status: 503,
      message: 'A IA está com alta demanda no momento. Aguarde alguns segundos e envie novamente.',
    };
  }
  return {
    status: 500,
    message: 'Não foi possível processar seu pedido com a IA agora. Tente novamente em instantes.',
  };
}

export async function runClinicCommand(body: {
  prompt?: string;
  context?: Record<string, any>;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
}): Promise<{ status: number; payload: Record<string, any> }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      status: 503,
      payload: {
        error:
          'A chave GEMINI_API_KEY não está configurada no servidor. Adicione GEMINI_API_KEY nas variáveis de ambiente para ativar a IA.',
      },
    };
  }

  const { prompt, context, history } = body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return {
      status: 400,
      payload: { error: 'Digite um pedido para que a IA possa executar.' },
    };
  }

  const userRole = context?.userRole || 'funcionario';
  const tools = getAllowedToolsForRole(userRole);
  const todayDate = context?.todayDate || new Date().toISOString().split('T')[0];

  const roleRules =
    userRole === 'gestao'
      ? 'O usuário é da Gestão e tem permissão total no sistema.'
      : userRole === 'funcionario'
      ? 'O usuário tem perfil Funcionário: pode gerenciar estoque/compras, registrar compras de materiais, gerenciar pedidos de laboratório e abrir suas telas permitidas (compras, doutora, sanitizacao, laboratorio, utilitarios). NÃO tem permissão para criar/excluir lançamentos financeiros gerais, alterar metas ou cadastrar dentistas/equipe.'
      : 'O usuário tem perfil Dentista: pode atualizar avaliações/fechamentos da própria dentista vinculada, gerenciar pedidos de laboratório e abrir suas telas permitidas (doutora, sanitizacao, laboratorio, utilitarios). NÃO tem permissão para alterar estoque, financeiro geral ou metas da clínica.';

  const systemInstruction = `Você é o assistente operacional da clínica odontológica "Seja Mais Odontologia".
Seu papel é EXECUTAR diretamente os pedidos do usuário dentro do aplicativo usando as ferramentas (function calls) disponíveis.

Regras obrigatórias:
1. Sempre que o usuário pedir para cadastrar, adicionar, registrar, lançar, editar, atualizar, dar baixa, excluir ou abrir uma tela, CHAME imediatamente a(s) ferramenta(s) correspondente(s). Você pode chamar múltiplas ferramentas no mesmo pedido se o usuário pedir várias ações juntas.
2. Nunca finja que executou uma ação sem chamar a ferramenta.
3. Ao editar, ajustar estoque ou excluir um item/dentista/meta/lançamento/laboratório, use o ID exato encontrado nos DADOS ATUAIS DO APP abaixo (faça correspondência inteligente mesmo com pequenas diferenças de acento ou abreviação).
4. Se o usuário pedir para dar baixa ou retirar itens do estoque (ex: "tire 5 luvas" ou "usei 2 resinas"), use adjust_supply_stock com delta negativo (-5, -2). Se pedir para definir uma quantidade exata (ex: "mude o estoque de luva para 30"), use update_supply_item com stock: 30.
5. Para datas relativas ("hoje", "ontem", "amanhã", "daqui a 7 dias"), calcule a data YYYY-MM-DD com base na data de hoje: ${todayDate}.
6. Use valores padrão sensatos para campos opcionais não mencionados (ex: status "pago", forma de pagamento "Pix" ou "Outros", unidade "un", minStock 5). Só peça esclarecimento se faltar uma informação essencial impossível de deduzir (por exemplo, registrar lançamento sem informar nenhum valor em reais).
7. Se o usuário apenas fizer uma pergunta ou cumprimento (ex: "oi", "quanto faturamos?", "o que está acabando no estoque?"), responda de forma direta, cordial e natural em português do Brasil com base nos dados atuais.
8. Respeite estritamente o perfil de acesso: ${roleRules} Se o usuário pedir algo fora do perfil dele, explique de forma educada e direta que aquela ação é restrita à Gestão.
9. Seja breve, objetivo e fale em português natural (Brasil), sem termos técnicos.

DADOS ATUAIS DO APP:
${JSON.stringify(context || {}, null, 0)}`;

  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  const contents = [
    ...recentHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    {
      role: 'user',
      parts: [{ text: prompt.trim() }],
    },
  ];

  try {
    const response = await generateWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: tools }],
      },
    });

    const functionCalls = (response.functionCalls || []).map(fc => ({
      name: fc.name || '',
      args: (fc.args || {}) as Record<string, any>,
    }));

    return {
      status: 200,
      payload: {
        text: response.text || '',
        functionCalls,
      },
    };
  } catch (error: any) {
    console.error('Error calling Gemini Command API:', error);
    const formatted = formatGeminiError(error);
    return {
      status: formatted.status,
      payload: { error: formatted.message },
    };
  }
}

export async function runClinicAdvice(body: {
  metrics?: any;
  customQuery?: string;
}): Promise<{ status: number; payload: Record<string, any> }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      status: 503,
      payload: {
        error:
          'A chave GEMINI_API_KEY não está configurada no servidor. Adicione GEMINI_API_KEY nas variáveis de ambiente.',
      },
    };
  }

  const { metrics, customQuery } = body || {};

  const systemInstruction = `Você é um Consultor Estratégico especialista em Gestão de Clínicas Odontológicas e Finanças para Dentistas.
Dê recomendações pragmáticas, profissionais, encorajadoras e baseadas em dados em língua portuguesa (Brasil).
Mantenha as respostas curtas, com formatação limpa em Markdown usando tópicos e termos em negrito.
Foque em reduzir o custo de materiais (alvo ideal: abaixo de 18% do faturamento), motivar a equipe e atingir as metas pendentes.`;

  const prompt = `Analise os seguintes dados atuais da clínica:
- Faturamento do Mês: R$ ${metrics?.faturamento ?? 0}
- Meta Geral do Mês: R$ ${metrics?.metaGeral ?? 0} (${metrics?.porcentagemMeta ?? 0}% atingida)
- Gasto com Materiais: R$ ${metrics?.gastoMateriais ?? 0} (${metrics?.porcentagemGastoMateriais ?? 0}% do faturamento)
- Margem de Lucro: R$ ${metrics?.margemLucro ?? 0} (${metrics?.porcentagemMargem ?? 0}% do faturamento)
- Ranking das Doutoras:
${(metrics?.rankingDoutoras || [])
  .map(
    (d: any, idx: number) =>
      `  ${idx + 1}. ${d.name}: R$ ${d.earnings} / Meta R$ ${d.target} (${d.target > 0 ? Math.round((d.earnings / d.target) * 100) : 0}%)`
  )
  .join('\n')}

Pergunta ou pedido do gestor: "${customQuery || 'Como posso melhorar os resultados e eficiência financeira este mês?'}"`;

  try {
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: { systemInstruction },
    });

    return {
      status: 200,
      payload: { text: response.text || '' },
    };
  } catch (error: any) {
    console.error('Error calling Gemini Advice API:', error);
    const formatted = formatGeminiError(error);
    return {
      status: formatted.status,
      payload: { error: formatted.message },
    };
  }
}
