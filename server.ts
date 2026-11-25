/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON body
app.use(express.json({ limit: '2mb' }));

// Allow Firebase Google Auth popup window.opener communication across browsers
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Lazy load Gemini AI Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY env variable is not set. AI features will be unavailable.');
      return null;
    }
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

// Tool declarations for AI command execution inside the clinic app
const ALL_CLINIC_TOOLS: FunctionDeclaration[] = [
  {
    name: 'add_transaction',
    description:
      'Registra um novo lançamento financeiro (receita ou despesa) na clínica. Use para consultas, procedimentos, recebimentos, pagamentos, aluguel, salários, compras, etc.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        description: {
          type: Type.STRING,
          description: 'Descrição clara do lançamento (ex: "Consulta de avaliação - Maria Silva", "Conta de energia").',
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
        itemId: {
          type: Type.STRING,
          description: 'ID exato do item no estoque.',
        },
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
        itemId: {
          type: Type.STRING,
          description: 'ID exato do item no estoque.',
        },
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
        itemId: {
          type: Type.STRING,
          description: 'ID exato do item no estoque.',
        },
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
        description: {
          type: Type.STRING,
          description: 'Descrição da compra de materiais.',
        },
        value: {
          type: Type.NUMBER,
          description: 'Valor total da compra em reais.',
        },
        supplier: {
          type: Type.STRING,
          description: 'Nome do fornecedor ou dental (opcional).',
        },
        subcategory: {
          type: Type.STRING,
          description: 'Subcategoria do material (opcional).',
        },
        date: {
          type: Type.STRING,
          description: 'Data da compra YYYY-MM-DD (opcional, padrão hoje).',
        },
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
        name: {
          type: Type.STRING,
          description: 'Nome completo da dentista (ex: "Dra. Juliana Costa").',
        },
        specialty: {
          type: Type.STRING,
          description: 'Especialidade odontológica (ex: "Ortodontia", "Implantodontia", "Clínica Geral").',
        },
        cro: {
          type: Type.STRING,
          description: 'Número do CRO (ex: "CRO-SP 123456"). Se não informado, deixe "A informar".',
        },
        email: {
          type: Type.STRING,
          description: 'E-mail da dentista (opcional).',
        },
        monthlyTarget: {
          type: Type.NUMBER,
          description: 'Meta mensal de faturamento em reais. Padrão: 0.',
        },
        role: {
          type: Type.STRING,
          description: 'Cargo/função (ex: "Dentista Especialista"). Padrão: "Dentista".',
        },
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
        doctorId: {
          type: Type.STRING,
          description: 'ID exato da dentista.',
        },
        monthlyTarget: {
          type: Type.NUMBER,
          description: 'Novo valor da meta mensal em reais.',
        },
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
        doctorId: {
          type: Type.STRING,
          description: 'ID exato da dentista.',
        },
        evaluations: {
          type: Type.NUMBER,
          description: 'Quantidade de avaliações no mês.',
        },
        closures: {
          type: Type.NUMBER,
          description: 'Quantidade de fechamentos no mês.',
        },
        monthlyTarget: {
          type: Type.NUMBER,
          description: 'Meta mensal em reais (apenas Gestão).',
        },
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
        value: {
          type: Type.NUMBER,
          description: 'Valor da meta mensal em reais (ex: 50000).',
        },
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
        title: {
          type: Type.STRING,
          description: 'Título da meta (ex: "Alcançar 40 avaliações no mês").',
        },
        targetValue: {
          type: Type.NUMBER,
          description: 'Valor alvo da meta.',
        },
        currentValue: {
          type: Type.NUMBER,
          description: 'Valor atual já atingido. Padrão: 0.',
        },
        deadline: {
          type: Type.STRING,
          description: 'Prazo no formato YYYY-MM-DD.',
        },
        assignedTo: {
          type: Type.STRING,
          description: 'Responsável pela meta (ex: "Toda a Equipe", nome da dentista ou setor).',
        },
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
        goalId: {
          type: Type.STRING,
          description: 'ID exato da meta.',
        },
        progressDelta: {
          type: Type.NUMBER,
          description: 'Valor a somar (ou subtrair) no progresso atual.',
        },
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
        name: {
          type: Type.STRING,
          description: 'Nome completo do membro da equipe.',
        },
        role: {
          type: Type.STRING,
          description: 'Função/cargo (ex: "Recepcionista", "ASB", "Auxiliar Administrativo").',
        },
        status: {
          type: Type.STRING,
          description: 'Status inicial: "Ativo", "Em plantão" ou "Ausente". Padrão: "Ativo".',
        },
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
        memberId: {
          type: Type.STRING,
          description: 'ID exato do membro da equipe.',
        },
        status: {
          type: Type.STRING,
          description: 'Novo status: "Ativo", "Em plantão" ou "Ausente".',
        },
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
        patientName: {
          type: Type.STRING,
          description: 'Nome do paciente.',
        },
        procedureType: {
          type: Type.STRING,
          description:
            'Tipo de peça: "Prótese", "Coroa", "Faceta", "Implante", "Onlay/Inlay", "Placa Alinhadora/Miorrelaxante" ou "Outro".',
        },
        laboratoryName: {
          type: Type.STRING,
          description: 'Nome do laboratório parceiro.',
        },
        doctorName: {
          type: Type.STRING,
          description: 'Nome da dentista solicitante.',
        },
        expectedReturnDate: {
          type: Type.STRING,
          description: 'Previsão de entrega no formato YYYY-MM-DD.',
        },
        value: {
          type: Type.NUMBER,
          description: 'Valor cobrado pelo laboratório em reais. Padrão: 0.',
        },
        status: {
          type: Type.STRING,
          description: 'Status inicial: "A Enviar", "No Laboratório", "Recebido", "Instalado" ou "Ajuste". Padrão: "A Enviar".',
        },
        shade: {
          type: Type.STRING,
          description: 'Cor/escala do dente (ex: "A1", "A2", "BL2") - opcional.',
        },
        notes: {
          type: Type.STRING,
          description: 'Observações adicionais (opcional).',
        },
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
        procedureId: {
          type: Type.STRING,
          description: 'ID exato do procedimento de laboratório.',
        },
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
  if (role === 'gestao') {
    return ALL_CLINIC_TOOLS;
  }
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
  // dentista
  const allowed = new Set([
    'update_doctor_stats',
    'add_lab_procedure',
    'update_lab_procedure_status',
    'navigate_to_tab',
  ]);
  return ALL_CLINIC_TOOLS.filter(t => t.name && allowed.has(t.name));
}

// Command Execution Endpoint (Gemini Function Calling)
app.post('/api/gemini/command', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'Serviço de Inteligência Artificial indisponível no momento. Verifique a configuração da chave GEMINI_API_KEY em Settings > Secrets.',
      });
    }

    const { prompt, context, history } = req.body as {
      prompt?: string;
      context?: Record<string, any>;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Digite um pedido para que a IA possa executar.' });
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
7. Se o usuário apenas fizer uma pergunta de consulta (ex: "quanto faturamos?", "o que está acabando no estoque?"), responda de forma direta, clara e cordial em português do Brasil com base nos dados atuais.
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

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
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

    return res.json({
      text: response.text || '',
      functionCalls,
    });
  } catch (error: any) {
    console.error('Error calling Gemini Command API:', error);
    const msg = String(error?.message || '');
    if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || error?.status === 403) {
      return res.status(403).json({
        error: 'Chave da API Gemini inválida ou sem permissão. Verifique em Settings > Secrets.',
      });
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      return res.status(429).json({
        error: 'Limite temporário de solicitações atingido. Aguarde alguns instantes e tente novamente.',
      });
    }
    return res.status(500).json({
      error: error?.message || 'Erro interno ao processar seu pedido com a IA.',
    });
  }
});

// Strategic Advice Endpoint
app.post('/api/gemini/advice', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'Serviço de Inteligência Artificial temporariamente indisponível. Verifique se a chave GEMINI_API_KEY está configurada.',
      });
    }

    const { metrics, customQuery } = req.body;

    const systemInstruction = `Você é um Consultor Estratégico especialista em Gestão de Clínicas Odontológicas e Finanças para Dentistas.
Dê recomendações pragmáticas, profissionais, encorajadoras e baseadas em dados em língua portuguesa (Brasil).
Mantenha as respostas curtas, com formatação limpa em Markdown usando tópicos e termos em negrito.
Foque em reduzir o custo de materiais (alvo ideal: abaixo de 18% do faturamento), motivar a equipe e atingir as metas pendentes.`;

    const prompt = `Analise os seguintes dados atuais da clínica:
- Faturamento do Mês: R$ ${metrics.faturamento}
- Meta Geral do Mês: R$ ${metrics.metaGeral} (${metrics.porcentagemMeta}% atingida)
- Gasto com Materiais: R$ ${metrics.gastoMateriais} (${metrics.porcentagemGastoMateriais}% do faturamento)
- Margem de Lucro: R$ ${metrics.margemLucro} (${metrics.porcentagemMargem}% do faturamento)
- Ranking das Doutoras:
${metrics.rankingDoutoras
  .map(
    (d: any, idx: number) =>
      `  ${idx + 1}. ${d.name}: R$ ${d.earnings} / Meta R$ ${d.target} (${d.target > 0 ? Math.round((d.earnings / d.target) * 100) : 0}%)`
  )
  .join('\n')}

Pergunta ou pedido do gestor: "${customQuery || 'Como posso melhorar os resultados e eficiência financeira este mês?'}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor ao consultar a IA.' });
  }
});

// Setup Vite or static serving
async function setupViteAndListen() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve client router fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Clinica] Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

setupViteAndListen().catch(err => {
  console.error('Failed to start server:', err);
});
