import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// ISSO É VITAL: Impede a Vercel de fazer cache dessa rota
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/reset-password'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }) },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      // Agora vamos ver o motivo real, sem mensagens genéricas!
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }
  
  return NextResponse.redirect(`${origin}/login?error=Nenhum_codigo_encontrado_na_URL`)
}