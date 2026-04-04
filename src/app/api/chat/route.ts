// src/app/api/chat/route.ts
import { createClient } from '@supabase/supabase-js';
import { streamText } from 'ai';
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

    let basePrompt = persona.prompt_system;

    // Injeção de dificuldade baseada no seu schema
    const difficultyRules = {
      facil: '\n\n[Dificuldade: FÁCIL - Seja mais receptivo e ouça o pitch.]',
      medio: '\n\n[Dificuldade: MÉDIO - Faça objeções comuns de B2B.]',
      dificil: '\n\n[Dificuldade: DIFÍCIL - Seja ríspido e queira desligar rápido.]'
    };
    basePrompt += difficultyRules[difficulty_level as keyof typeof difficultyRules] || '';

    // Chamada para o Gemini 2.5 Flash-Lite conforme sua decisão
    const result = streamText({
      model: google('gemini-2.5-flash-lite'), // Modelo ultra rápido que você escolheu
      system: basePrompt,
      messages: messages,
      temperature: 0.8,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}