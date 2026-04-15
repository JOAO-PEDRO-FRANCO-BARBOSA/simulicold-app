// src/app/api/analyze/route.ts
// Rota de Avaliação de Vendas com Gemini 2.5 Flash + Structured Output (zod)
// Analisa transcrição usando SPIN Selling, Cialdini e PNL/Rapport

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

// Schema de saída estruturada — forçado via generateObject + zod
const analysisSchema = z.object({
  overall_score: z.number().min(0).max(10),
  overall_feedback: z.string(), // Resumo conciso do desempenho geral (máx 3 frases)
  messages_feedback: z.array(z.object({
    message_index: z.number(),   // Índice da mensagem do vendedor no array original
    score: z.number().min(1).max(10), // Nota de 1 a 10 para esta fala
    feedback: z.object({
      pontos_positivos: z.array(z.string()), // Ex: ["Demonstrou autoridade", "Foi direto ao ponto"]
      pontos_negativos: z.array(z.string()), // Ex: ["Faltou gatilho de escassez"]
      sugestao_alternativa: z.string(),       // Texto de como a frase poderia ter sido dita
    }),
    category: z.enum(['Abertura', 'Qualificação', 'Contorno de Objeção', 'Fechamento', 'Rapport'])
  }))
});

const BASE_SYSTEM_PROMPT = `Você é um Treinador Sênior "Black Belt" de vendas B2B com 20 anos de experiência em cold calls corporativas.
Sua especialidade é dissecar cada fala de um vendedor usando frameworks rigorosos de persuasão.

Seus PILARES de avaliação (use TODOS):
1. **SPIN Selling** (Situação → Problema → Implicação → Necessidade de Solução): Identifique se o vendedor fez perguntas de cada etapa. Se pulou etapas, aponte EXATAMENTE qual faltou.
2. **Gatilhos de Cialdini** (Reciprocidade, Escassez, Autoridade, Consistência, Prova Social, Afinidade): Identifique se algum gatilho foi ativado ou desperdiçado.
3. **Rapport e PNL**: Avalie espelhamento, tom, uso do nome do prospect, e se o vendedor criou conexão genuína ou soou robótico.

**REGRAS OBRIGATÓRIAS:**
- overall_score: nota de 0 a 10 (rigoroso — acima de 8 exige domínio técnico dos 3 pilares).
- overall_feedback: resumo geral em no máximo 3 frases, mencionando os pilares usados ou ignorados.
- messages_feedback: avalie CADA fala do vendedor (role: "user"). Use o índice correto do array.
- score: nota de 1 a 10 para cada fala.
- category: classifique em Abertura, Qualificação, Contorno de Objeção, Fechamento ou Rapport.
- feedback: é um OBJETO com 3 campos:
  * pontos_positivos: liste os acertos usando nomes dos frameworks (SPIN, Cialdini, Rapport). Pode ser vazio se a fala foi péssima.
  * pontos_negativos: liste as falhas com referência ao framework. Ex: "Faltou pergunta de Implicação (SPIN)" ou "Não usou gatilho de Escassez (Cialdini)".
  * sugestao_alternativa: reescreva O QUE o vendedor deveria ter dito. Seja específico — escreva a frase completa como exemplo. Ex: "Em vez de falar sobre o produto, deveria ter dito: 'Marcos, quanto tempo sua equipe perde por semana com esse processo manual? Isso impacta diretamente seu custo operacional.'"
- Não seja genérico. Se a fala foi ruim, diga EXATAMENTE o que deveria ter sido dito.
- Escreva TUDO em português brasileiro.`;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response('Não autenticado', { status: 401 });
    }

    let productContext = '';

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('product_context')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Erro ao buscar product_context:', profileError);
    } else if (typeof profileRow?.product_context === 'string') {
      productContext = profileRow.product_context.trim();
    }

    const contextualInstruction = productContext.length > 0
      ? `\n\nO usuário está simulando a venda do seguinte produto/serviço: ${productContext}. Avalie a performance dele baseando-se em quão bem ele apresentou o valor deste produto específico e lidou com objeções relacionadas a ele.`
      : '';

    const systemPrompt = `${BASE_SYSTEM_PROMPT}${contextualInstruction}`;

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Array de messages é obrigatório', { status: 400 });
    }

    // Formatar a transcrição para o prompt
    const transcriptText = messages.map((msg: { role: string; content: string }, i: number) => {
      const label = msg.role === 'user' ? 'VENDEDOR' : 'CLIENTE';
      return `[${i}] ${label}: ${msg.content}`;
    }).join('\n');

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: analysisSchema,
      schemaName: 'SalesAnalysis',
      schemaDescription: 'Análise estruturada de uma simulação de cold call B2B',
      system: systemPrompt,
      prompt: `Analise a seguinte transcrição de cold call B2B e forneça sua avaliação detalhada:\n\n${transcriptText}`,
      temperature: 0.2, // Temperatura baixa: respostas determinísticas e rápidas
    });

    return Response.json(object);
  } catch (error: any) {
    console.error('Erro na rota /api/analyze:', error);
    return new Response(error.message || 'Erro interno na análise', { status: 500 });
  }
}
