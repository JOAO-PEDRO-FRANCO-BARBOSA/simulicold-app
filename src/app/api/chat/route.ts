import { createClient } from '@supabase/supabase-js';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Opcional: configurar como edge runtime para menor latência
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, persona_id, difficulty_level } = body;

    // Validação básica do corpo da requisição
    if (!persona_id || !messages) {
      return new Response('Missing persona_id or messages', { status: 400 });
    }

    // 1. Inicializar Supabase Client
    // Usaremos as variáveis de ambiente padrão do Next.js para o frontend.
    // Lembre-se de configurar .env.local na raiz do projeto
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("As credenciais do Supabase não estão configuradas no .env.local.");
    }

    // Criando o cliente standard
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Buscar o Contexto (Prompt) da Persona na tabela do Supabase
    // Isso garante que você pode alterar o comportamento da Persona sem precisar fazer deploy do código
    const { data: persona, error } = await supabase
      .from('personas')
      .select('prompt_system')
      .eq('id', persona_id)
      .single(); // Esperamos que haja apenas uma persona com este UUID

    if (error || !persona) {
      console.error('Erro ao buscar persona no Supabase:', error);
      return new Response('Persona não encontrada no Banco de Dados', { status: 404 });
    }

    // 3. Construção do Prompt Dinâmico (System Prompt)
    let basePrompt = persona.prompt_system;
    
    // Injetamos o modificador de dificuldade nas instruções diretas para o LLM
    if (difficulty_level === 'facil') {
      basePrompt += '\n\n[Regra Adicional de Dificuldade: "FÁCIL" - Você está em um dia calmo. Ouça um pouco mais a apresentação no telefone, seja receptivo, mas ainda mantenha a sua personalidade base descrita acima.]';
    } else if (difficulty_level === 'medio') {
      basePrompt += '\n\n[Regra Adicional de Dificuldade: "MÉDIO" - Aja de maneira realista, com bloqueios comuns. Faça objeções normais e típicas de Cold Calls em B2B sobre "falta de tempo", "vamos enviar um email" ou "orçamento reduzido", testando o jogo de cintura do vendedor.]';
    } else if (difficulty_level === 'dificil') {
      basePrompt += '\n\n[Regra Adicional de Dificuldade: "DIFÍCIL" - Seja EXTREMAMENTE IMPIEDOSO na ligação. Corte o vendedor na primeira pausa, demonstre clara irritação com cold calls não solicitadas e aja com frieza, querendo derrubar a ligação logo.]';
    }

    // Informar explicitamente que a conversa é uma call verbal via telefone
    basePrompt += '\n\nINSTRUÇÕES DE FORMATO: Responda diretamente ao usuário como se você estivesse falando no telefone. EVITE O USO de emojis ou texto excessivamente formatado. Mantenha as frases curtas, naturais e ritmadas, lembrando que seu texto será convertido para áudio logo depois.';

    // 4. Chamada da IA usando o Vercel AI SDK 
    // Utilizamos gpt-4o-mini pois é excelente em custo/benefício e rápido para respostas de voz
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: basePrompt,
      messages: messages,
      temperature: 0.7, // 0.7 garante um equilíbrio entre previsibilidade (script de vendas) e reações dinâmicas
    });

    // 5. Retornar o Data Stream formatado automaticamente pelo AI SDK
    // Isso enviará os chunks de texto em tempo real para o front-end
    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error('Erro na rota /api/chat:', error);
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}
