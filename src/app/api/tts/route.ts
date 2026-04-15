// src/app/api/tts/route.ts
// Rota de Text-to-Speech usando ElevenLabs API — STREAMING
// Recebe texto + personaId, retorna stream de áudio MP3 para playback imediato
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Mapeamento de vozes ElevenLabs por tipo de persona
// Vozes padrão disponíveis em todas as contas ElevenLabs
const VOICE_MAP: Record<string, string> = {
  default: 'pNInz6obpgDQGcFmaJgB',        // Adam — voz masculina padrão
  masculino: 'pNInz6obpgDQGcFmaJgB',       // Adam
  feminino: 'EXAVITQu4vr4xnSDxMaL',        // Bella — voz feminina
  assertivo: 'VR6AewLTigWG4xSOukaG',       // Arnold — voz firme/grave
  jovem: 'ErXwobaYiN019PkySvjV',           // Antoni — voz jovem masculina
};

function getAuthorizationToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;

  return token;
}

async function readUserBalanceSafely(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[TTS] Falha na leitura de creditos:', error);
      return null;
    }

    if (!data || typeof data.balance !== 'number') {
      return 0;
    }

    return data.balance;
  } catch (error) {
    console.error('[TTS] Excecao ao ler creditos:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, personaId } = body;

    const token = getAuthorizationToken(req);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const balance = await readUserBalanceSafely(supabase, user.id);
    if (balance === null || balance <= 0) {
      return new Response(JSON.stringify({ error: 'Créditos esgotados' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!text || typeof text !== 'string') {
      return new Response('O campo "text" é obrigatório.', { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response(
        'ELEVENLABS_API_KEY não configurada no .env.local',
        { status: 500 }
      );
    }

    // Selecionar voz: usa mapeamento ou default (Adam)
    const voiceId = VOICE_MAP[personaId] || VOICE_MAP.default;

    // Usar endpoint de STREAMING da ElevenLabs para menor latência
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5', // Menor latência + cadência mais rápida para conversação
          voice_settings: {
            stability: 0.4,          // Menos estabilidade = mais expressividade
            similarity_boost: 0.8,   // Alta fidelidade à voz original
            style: 0.15,             // Leve estilo emocional
            use_speaker_boost: true,
          },
          // optimize_streaming_latency: 3 = máxima otimização de latência
          optimize_streaming_latency: 3,
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.text();
      console.error('ElevenLabs API error:', elevenLabsResponse.status, errorBody);
      return new Response(
        `Erro na API ElevenLabs: ${elevenLabsResponse.status}`,
        { status: 502 }
      );
    }

    // STREAMING: Pipe o ReadableStream do ElevenLabs direto para o cliente
    // O frontend pode começar a decodificar e tocar enquanto ainda chega mais dados
    if (!elevenLabsResponse.body) {
      return new Response('ElevenLabs retornou corpo vazio', { status: 502 });
    }

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

    return new Response(elevenLabsResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-store', // Cada fala é única, não cachear
      },
    });
  } catch (error: unknown) {
    console.error('Erro na rota /api/tts:', error);
    const message = error instanceof Error ? error.message : 'Erro interno no TTS';
    return new Response(message, { status: 500 });
  }
}
