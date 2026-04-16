// src/app/api/tts/route.ts
// Rota de Text-to-Speech usando Google Cloud TTS REST
// Recebe texto + personaId e retorna áudio MP3 para playback
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthorizationToken } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const VOICE_MAP: Record<string, string> = {
  default: 'pt-BR-Neural2-B',
  masculino: 'pt-BR-Neural2-B',
  feminino: 'pt-BR-Neural2-C',
  assertivo: 'pt-BR-Neural2-B',
  jovem: 'pt-BR-Neural2-B',
};

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
      console.error('[TTS] Falha na leitura de creditos:', error);
      return { balance: null, dbError: true };
    }

    if (!data || typeof data.balance !== 'number') {
      return { balance: 0, dbError: false };
    }

    return { balance: data.balance, dbError: false };
  } catch (error) {
    console.error('[TTS] Excecao ao ler creditos:', error);
    return { balance: null, dbError: true };
  }
}

export async function POST(req: Request) {
  try {
    const { text, voiceType, personaId, speakingRate = 1.0, pitch = 0.0 } = await req.json();

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

    if (!text || typeof text !== 'string') {
      return new Response('O campo "text" é obrigatório.', { status: 400 });
    }

    if (typeof speakingRate !== 'number' || Number.isNaN(speakingRate)) {
      return new Response('O campo "speakingRate" deve ser numérico.', { status: 400 });
    }

    if (typeof pitch !== 'number' || Number.isNaN(pitch)) {
      return new Response('O campo "pitch" deve ser numérico.', { status: 400 });
    }

    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
    if (!apiKey) {
      return new Response('GOOGLE_CLOUD_TTS_API_KEY não configurada no .env.local', {
        status: 500,
      });
    }

    const voiceName = VOICE_MAP[voiceType] || VOICE_MAP[personaId] || VOICE_MAP.default;

    const googleResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { ssml: `<speak>${text}</speak>` },
          voice: {
            languageCode: 'pt-BR',
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate,
            pitch,
          },
        }),
      }
    );

    if (!googleResponse.ok) {
      const errorBody = await googleResponse.text();
      console.error('Google TTS API error:', googleResponse.status, errorBody);
      return new Response(`Erro na API Google TTS: ${googleResponse.status}`, {
        status: 502,
      });
    }

    const data = (await googleResponse.json()) as { audioContent?: string };
    if (!data.audioContent || typeof data.audioContent !== 'string') {
      return new Response('Google TTS retornou audioContent inválido', {
        status: 502,
      });
    }

    const audioBuffer = Buffer.from(data.audioContent, 'base64');

    const { error: decrementError } = await supabase.rpc('decrement_credit', {
      user_uid: user.id,
    });

    if (decrementError) {
      console.error('[TTS] Erro ao decrementar crédito:', decrementError);
      return new Response(JSON.stringify({ error: 'Erro ao debitar crédito.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Erro na rota /api/tts:', error);
    const message = error instanceof Error ? error.message : 'Erro interno no TTS';
    return new Response(message, { status: 500 });
  }
}
