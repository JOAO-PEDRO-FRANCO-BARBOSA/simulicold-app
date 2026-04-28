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

    // Resolve voice name: fallback => busca no Supabase => usa resolved value
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

    // Escapa apenas os nós de texto, preservando tags SSML válidas
    function escapeTextPreserveTags(input: string) {
      return input.replace(/(<[^>]+>)|([^<]+)/g, (_match, tagPart, textPart) => {
        if (tagPart) return tagPart; // mantém tags intactas
        if (!textPart) return '';
        return textPart
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      });
    }

    // Normaliza e faz limpeza mínima do texto (remove caracteres de controle problemáticos)
    const cleaned = String(text || '')
      .replace(/\u0000/g, '')
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .trim();

    // Se o voice for compatível com plain text (Chirp), enviamos texto limpo sem SSML
    let inputPayload: Record<string, unknown>;
    let audioConfigPayload: Record<string, unknown>;

    if (isChirp) {
      inputPayload = { text: cleaned || ' ' };
      audioConfigPayload = { audioEncoding: 'MP3' };
    } else {
      // Prepara SSML: preserva tags, escapa texto fora das tags e garante <speak> raíz
      const preserved = escapeTextPreserveTags(cleaned);
      const hasSpeak = /^\s*<speak[\s>]/i.test(preserved) && /<\/speak>\s*$/i.test(preserved);
      const ssmlBody = hasSpeak ? preserved : `<speak>${preserved}</speak>`;

      inputPayload = { ssml: ssmlBody };
      audioConfigPayload = {
        audioEncoding: 'MP3',
        speakingRate,
        pitch,
      };
    }

    let googleResponse: Response | null = null;
    try {
      googleResponse = await fetch(
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
    } catch (fetchError) {
      console.error('[TTS] Falha no fetch para Google TTS:', fetchError);
      return new Response('Falha ao contactar Google TTS', { status: 502 });
    }

    if (!googleResponse) {
      return new Response('Resposta inválida do Google TTS', { status: 502 });
    }

    // Log detalhado quando não OK (inclui corpo da resposta, quando possível)
    if (!googleResponse.ok) {
      const respText = await googleResponse.text().catch(() => '<não foi possível ler o body>');
      console.error('[TTS] Google TTS retornou erro:', {
        status: googleResponse.status,
        statusText: googleResponse.statusText,
        body: respText,
      });
      return new Response(`Erro na API Google TTS: ${googleResponse.status}`, { status: 502 });
    }

    const json = await googleResponse.json().catch((err) => {
      console.error('[TTS] Não foi possível parsear JSON do Google TTS:', err);
      return null;
    });

    if (!json || typeof json.audioContent !== 'string') {
      console.error('[TTS] googleResponse JSON inválido:', json);
      return new Response('Google TTS retornou audioContent inválido', { status: 502 });
    }

    const audioBuffer = Buffer.from(json.audioContent, 'base64');

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
