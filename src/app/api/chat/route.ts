// src/app/api/chat/route.ts
import { generateText } from 'ai';
import { google } from '@ai-sdk/google'; // Alterado de openai para google
import { createSupabaseServerClient, getAuthorizationToken } from '@/lib/supabase-server';

export const runtime = 'edge';

async function readUserBalanceSafely(supabase: any, userId: string): Promise<{
  balance: number | null;
  dbError: boolean;
}> {
  try {
    const { data, error } = (await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single()) as { data: { balance: number } | null; error: any };

    if (error) {
      console.error('[CHAT] Falha na leitura de creditos:', error);
      return { balance: null, dbError: true };
    }

    if (!data || typeof data.balance !== 'number') {
      return { balance: 0, dbError: false };
    }

    return { balance: data.balance, dbError: false };
  } catch (error) {
    console.error('[CHAT] Excecao ao ler creditos:', error);
    return { balance: null, dbError: true };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, persona_id, difficulty_level } = body;

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

    const { balance, dbError } = await readUserBalanceSafely(supabase as any, user.id);
    if (dbError) {
      return new Response(
        JSON.stringify({ error: 'Falha de comunicação com o banco de dados.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!balance || balance <= 0) {
      return new Response(JSON.stringify({ error: 'Créditos esgotados' }), {
        status: 402,
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

    const { error: decrementError } = await supabase.rpc('decrement_credit', {
      user_uid: user.id,
    });

    if (decrementError) {
      console.error('[CHAT] Erro ao decrementar crédito:', decrementError);
      return new Response(JSON.stringify({ error: 'Erro ao debitar crédito.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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