// src/app/api/tts/route.ts
// Rota de Text-to-Speech usando ElevenLabs API
// Recebe texto + personaId, retorna áudio MP3 de alta qualidade

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, personaId } = body;

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

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2', // Suporta pt-BR com qualidade alta
          voice_settings: {
            stability: 0.4,          // Menos estabilidade = mais expressividade
            similarity_boost: 0.8,   // Alta fidelidade à voz original
            style: 0.15,             // Leve estilo emocional
            use_speaker_boost: true,
          },
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

    // Retornar o áudio binário diretamente ao cliente
    const audioArrayBuffer = await elevenLabsResponse.arrayBuffer();

    return new Response(audioArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioArrayBuffer.byteLength.toString(),
        'Cache-Control': 'no-store', // Cada fala é única, não cachear
      },
    });
  } catch (error: any) {
    console.error('Erro na rota /api/tts:', error);
    return new Response(error.message || 'Erro interno no TTS', { status: 500 });
  }
}
