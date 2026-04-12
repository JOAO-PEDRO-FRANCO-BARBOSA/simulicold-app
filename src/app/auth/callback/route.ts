import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  // URL alvo (fallback pro painel se não houver)
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
               // Em rotas app router as vezes ignorar o setAll server side para leitura de cache faz sentido, mas o SSR cuida
            }
          },
        },
      }
    );
    
    // Troca do code recebido no link de email por Sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error('[AUTH_CALLBACK] Erro trocando token:', error);
    }
  }

  // Falhou -> devolve pro login com erro silencioso na url opcional
  return NextResponse.redirect(`${origin}/login?error=invalid_token`);
}
