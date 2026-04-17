// src/app/api/chat/route.ts
import { generateText } from 'ai';
import { google } from '@ai-sdk/google'; // Alterado de openai para google
import { createSupabaseServerClient, getAuthorizationToken } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, persona_id, difficulty_level, sessionId } = body;

    const supabase = await createSupabaseServerClient();

    const token = getAuthorizationToken(req);
    const userResponse = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    const {
      data: { user },
      error: userError,
    } = userResponse;

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'sessionId obrigatório.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Busca o prompt da persona no banco
    const { data: persona, error } = await supabase
      .from('personas')
      .select('prompt_system')
      .eq('id', persona_id)
      .single();

    if (error || !persona) {
      return new Response(JSON.stringify({ error: 'Persona não encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const globalVoiceRule = `REGRA OBRIGATÓRIA: NUNCA use tags SSML como <break>. Use EXCLUSIVAMENTE pontuação natural para ritmo e emoção. Se o cliente encerrar a ligação, use a tag [FIM_DA_LIGACAO] no final.\n\n`;

    // REGRA ABSOLUTA de realismo de cold call — prepended antes de qualquer persona
    const coldCallRule = `REGRA ABSOLUTA E INQUEBRÁVEL: Você está em uma cold call telefônica real. Responda como uma pessoa real, de forma natural, direta e reativa ao contexto da ligação. Evite discursos longos e mantenha tom conversacional.\n\n`;

    let difficultyInstructions = 'Cliente padrão B2B. Use pausas com reticências (...).';

    switch (difficulty_level) {
      case 'facil':
        difficultyInstructions = 'Cliente receptivo e calmo. Fale com frases longas e pacientes.';
        break;
      case 'dificil':
        difficultyInstructions = 'Cliente impaciente e ríspido. Use frases curtas, secas e muitas reticências (...) para criar silêncios constrangedores.';
        break;
      case 'medio':
      default:
        difficultyInstructions = 'Cliente padrão B2B. Use pausas com reticências (...).';
        break;
    }

    const basePrompt =
      globalVoiceRule +
      coldCallRule +
      `Nível de dificuldade atual: ${difficulty_level || 'medio'}. ${difficultyInstructions}\n\n` +
      persona.prompt_system;

    const { data: canProceed, error: chargeError } = await supabase.rpc('charge_simulation', {
      user_uid: user.id,
      session_uid: sessionId,
    });

    if (chargeError || canProceed === false) {
      if (chargeError) {
        console.error('[CHAT] Erro ao cobrar simulação:', chargeError);
      }
      return new Response(JSON.stringify({ error: 'Simulações esgotadas' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno no chat';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}