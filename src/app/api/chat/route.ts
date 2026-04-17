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

    // REGRA ABSOLUTA de realismo de cold call — prepended antes de qualquer persona
    const coldCallRule = `REGRA ABSOLUTA E INQUEBRÁVEL: Você está em uma cold call telefônica real. Responda em no máximo 1 ou 2 frases curtas. Seja direto, reativo e não faça discursos. Imite a pressa de um executivo ocupado que foi interrompido. NUNCA escreva parágrafos longos.\n\n`;

    const ssmlRule = `IMPORTANTE: Você deve responder utilizando a formatação SSML para parecer humano. Use a tag <break time='Xms'/> para simular pausas de respiração, hesitação ou pensamento. Exemplo de resposta: 'Olha... <break time='600ms'/> eu não sei se isso faz sentido para nós agora. <break time='400ms'/> Quanto custaria?'. Não inclua a tag <speak>; retorne apenas texto com tags SSML internas como <break/>.\nSe a conversa chegar a um fim natural (por exemplo, quando o cliente disser que vai desligar, pedir para encerrar, confirmar que não há interesse ou quando ambos se despedirem), você DEVE adicionar a exata tag [FIM_DA_LIGACAO] no final da sua resposta SSML.\n\n`;

    let basePrompt = ssmlRule + coldCallRule + persona.prompt_system;

    // Injeção de dificuldade baseada no seu schema
    const difficultyRules = {
      facil: '\n\n[Dificuldade: FÁCIL - Seja mais receptivo e ouça o pitch, mas ainda assim dê respostas curtas.]',
      medio: '\n\n[Dificuldade: MÉDIO - Faça objeções comuns de B2B. Respostas secas e curtas.]',
      dificil: '\n\n[Dificuldade: DIFÍCIL - Seja ríspido, impaciente e queira desligar rápido. Máximo 1 frase.]'
    };
    basePrompt += difficultyRules[difficulty_level as keyof typeof difficultyRules] || '';

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