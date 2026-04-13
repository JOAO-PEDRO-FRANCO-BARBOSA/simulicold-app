import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/login');

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // NÃO redirecionar usuário autenticado na página de login para /dashboard.
  // O login/page.tsx agora verifica o status da assinatura antes de decidir
  // a rota corretamente (dashboard, checkout, ou /#preco).
  // Redirecionar cegamente causava loop:
  //   middleware → /dashboard → (protected)/layout verifica assinatura → /#preco → login → repeat

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/history/:path*',
    '/analysis/:path*',
    '/profile/:path*',
    '/simulador/:path*',
    '/login'
  ],
};
