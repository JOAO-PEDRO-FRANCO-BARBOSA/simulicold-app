import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/login?verified=true';
  const safeNext =
    next.startsWith('/') && !next.startsWith('//')
      ? next
      : '/login?verified=true';

  // Recovery links can arrive with PKCE verifier only available in browser storage.
  // In this case, forward parameters to the reset page and let client exchange the code.
  if (safeNext === '/reset-password') {
    const resetUrl = new URL(safeNext, origin);
    for (const [key, value] of searchParams.entries()) {
      if (key === 'next') {
        continue;
      }
      resetUrl.searchParams.append(key, value);
    }
    return NextResponse.redirect(resetUrl);
  }

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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              console.error('[AUTH_CALLBACK] Erro salvando cookies de sessao:', error);
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin));
    } else {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Nenhum_codigo_fornecido`);
}
