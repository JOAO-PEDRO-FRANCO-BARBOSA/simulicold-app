import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Inicialização e sync de cookies com NextRequest
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Lê a sessão do usuário de forma segura
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A) O usuário está logado? Se não, redireciona para login.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // B) Se está logado, ele possui acesso pago?
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[Middleware] Erro ao buscar assinatura:', error.message);
  }

  const isAuthorized = subscription?.status === 'authorized' || subscription?.status === 'active';
  
  let isValidPeriod = false;
  if (subscription?.current_period_end) {
    isValidPeriod = new Date(subscription.current_period_end) > new Date();
  }

  // Se o usuário não tiver assinatura ativa/vigente, recua para a landing page -> #preco
  if (!subscription || !isAuthorized || !isValidPeriod) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.hash = 'preco';
    return NextResponse.redirect(url);
  }

  // Passou em tudo: permite acesso.
  return supabaseResponse;
}

// Interceptar rotas privadas do SaaS
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/history/:path*',
    '/analysis/:path*',
    '/profile/:path*',
    '/simulador/:path*'
  ],
};
