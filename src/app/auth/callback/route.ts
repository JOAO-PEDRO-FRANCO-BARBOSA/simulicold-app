import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/reset-password';

  const safeNext =
    next && next.startsWith('/') && !next.startsWith('//')
      ? next
      : '/reset-password';

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
      return NextResponse.redirect(new URL(safeNext, origin));
    } else {
      console.error('[AUTH_CALLBACK] Erro trocando token:', error);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
