import { GoogleGenAI } from "@google/genai";

export const getFinancialInsights = async (
  summaryData: string
): Promise<string> => {
  // Acessamos process.env.API_KEY aqui. O vite.config.ts garante que isso não quebre o app.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return "Funcionalidade indisponível: Chave de API não configurada no ambiente.";
  }

  try {
    // Inicializa o cliente apenas quando necessário
    const ai = new GoogleGenAI({ apiKey });
    
    const model = 'gemini-2.5-flash';
    const prompt = `
      Atue como um consultor financeiro sênior para um escritório de contabilidade.
      Analise os seguintes dados do mês atual e forneça um resumo executivo curto (máximo 3 parágrafos) com:
      1. Saúde financeira atual.
      2. Riscos identificados (foco em inadimplência e estouro de limites).
      3. Uma recomendação de ação imediata.

      Dados:
      ${summaryData}

      Responda em Português do Brasil, com tom profissional e direto.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro ao consultar Gemini:", error);
    return "Erro ao conectar com o serviço de inteligência artificial. Verifique sua conexão.";
  }
};