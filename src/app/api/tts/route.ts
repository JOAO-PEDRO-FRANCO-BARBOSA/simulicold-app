// src/app/api/tts/route.ts
// Rota de Text-to-Speech usando Google Cloud TTS REST
// Recebe texto + personaId e retorna áudio MP3 para playback
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthorizationToken } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { text, personaId, speakingRate = 1.0, pitch = 0.0 } = await req.json();

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

    if (!text || typeof text !== 'string') {
      return new Response('O campo "text" é obrigatório.', { status: 400 });
    }

    if (!personaId || typeof personaId !== 'string') {
      return new Response('O campo "personaId" é obrigatório.', { status: 400 });
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

    let resolvedVoiceName = 'pt-BR-Chirp3-HD-Achernar';
    const { data: personaRow, error: personaError } = await supabase
      .from('personas')
      .select('voice_name')
      .eq('id', personaId)
      .maybeSingle();

    if (personaError) {
      console.warn('[TTS] Falha ao buscar voice_name da persona, usando fallback:', personaError);
    }

    if (personaRow && typeof (personaRow as { voice_name?: unknown }).voice_name === 'string') {
      const dbVoiceName = (personaRow as { voice_name?: string }).voice_name?.trim();
      if (dbVoiceName) {
        resolvedVoiceName = dbVoiceName;
      }
    }

    const isChirp = resolvedVoiceName.includes('Chirp3');
    const sanitizedText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const safeText = sanitizedText || text.replace(/<[^>]*>/g, '').trim() || text;

    const inputPayload = isChirp
      ? { text: safeText }
      : { ssml: `<speak>${text}</speak>` };

    const audioConfigPayload = isChirp
      ? { audioEncoding: 'MP3' }
      : {
          audioEncoding: 'MP3',
          speakingRate,
          pitch,
        };

    const googleResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: inputPayload,
          voice: {
            languageCode: 'pt-BR',
            name: resolvedVoiceName,
          },
          audioConfig: audioConfigPayload,
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
