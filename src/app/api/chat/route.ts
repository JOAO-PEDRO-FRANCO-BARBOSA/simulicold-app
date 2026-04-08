// src/app/api/chat/route.ts
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google'; // Alterado de openai para google

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, persona_id, difficulty_level } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Busca o prompt da persona no banco
    const { data: persona, error } = await supabase
      .from('personas')
      .select('prompt_system')
      .eq('id', persona_id)
      .single();

    if (error || !persona) return new Response('Persona não encontrada', { status: 404 });

    // REGRA ABSOLUTA de realismo de cold call — prepended antes de qualquer persona
    const coldCallRule = `REGRA ABSOLUTA E INQUEBRÁVEL: Você está em uma cold call telefônica real. Responda em no máximo 1 ou 2 frases curtas. Seja direto, reativo e não faça discursos. Imite a pressa de um executivo ocupado que foi interrompido. NUNCA escreva parágrafos longos.\n\n`;

    let basePrompt = coldCallRule + persona.prompt_system;

    // Injeção de dificuldade baseada no seu schema
    const difficultyRules = {
      facil: '\n\n[Dificuldade: FÁCIL - Seja mais receptivo e ouça o pitch, mas ainda assim dê respostas curtas.]',
      medio: '\n\n[Dificuldade: MÉDIO - Faça objeções comuns de B2B. Respostas secas e curtas.]',
      dificil: '\n\n[Dificuldade: DIFÍCIL - Seja ríspido, impaciente e queira desligar rápido. Máximo 1 frase.]'
    };
    basePrompt += difficultyRules[difficulty_level as keyof typeof difficultyRules] || '';

    // Chamada para o Gemini 2.5 Flash
    const { text } = await generateText({
      model: google('gemini-2.5-flash'), // Modelo atualizado
      system: basePrompt,
      messages: messages,
      temperature: 0.8,
    });

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}