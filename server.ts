/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON body
app.use(express.json());

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
      console.warn("GEMINI_API_KEY env variable is not set. Clinical Advisor AI features will be unavailable.");
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

// API Endpoints
app.post('/api/gemini/advice', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Serviço de Inteligência Artificial temporariamente indisponível. Verifique se a chave GEMINI_API_KEY está configurada."
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
${metrics.rankingDoutoras.map((d: any, idx: number) => `  ${idx + 1}. ${d.name}: R$ ${d.earnings} / Meta R$ ${d.target} (${Math.round((d.earnings / d.target) * 100)}%)`).join('\n')}

Pergunta ou pedido do gestor: "${customQuery || 'Como posso melhorar os resultados e eficiência financeira este mês?'}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor ao consultar a IA." });
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

setupViteAndListen().catch((err) => {
  console.error("Failed to start server:", err);
});
