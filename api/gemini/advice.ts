/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
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

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Método não permitido.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'A chave GEMINI_API_KEY não está configurada no servidor. Adicione GEMINI_API_KEY nas variáveis de ambiente.',
      });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Corpo da requisição inválido.' });
      }
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

    const attempts: Array<{ model: string; thinkingLevel?: ThinkingLevel; timeoutMs: number }> = [
      { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 5500 },
      { model: 'gemini-3.1-flash-lite', timeoutMs: 9000 },
    ];

    let response: any = null;
    let lastError: any = null;
    for (const attempt of attempts) {
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: attempt.model,
            contents: prompt,
            config: attempt.thinkingLevel
              ? { systemInstruction, thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
              : { systemInstruction },
          }),
          attempt.timeoutMs,
          attempt.model
        );
        break;
      } catch (err: any) {
        lastError = err;
        if (!isTransientOverload(err)) throw err;
      }
    }

    if (!response) throw lastError;
    return res.status(200).json({ text: response.text || '' });
  } catch (error: any) {
    console.error('[Vercel /api/gemini/advice] Error:', error);
    return res.status(500).json({
      error: 'Não foi possível consultar a IA agora. Tente novamente em instantes.',
    });
  }
}
