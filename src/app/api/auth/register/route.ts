import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

type RegisterPayload = {
  email?: string;
  password?: string;
  emailRedirectTo?: string;
};

export async function POST(request: Request) {
  try {
    const { email, password, emailRedirectTo } = (await request.json()) as RegisterPayload;

    const normalizedEmail = email?.trim().toLowerCase() || '';
    const normalizedPassword = password || '';

    if (!EMAIL_REGEX.test(normalizedEmail) || !STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
      return NextResponse.json(
        { error: 'Formato de credenciais invalido.' },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    const { data: existingUser, error: existingUserError } = await adminClient
      .schema('auth')
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUserError) {
      console.error('[AUTH_REGISTER] Erro ao validar e-mail existente:', existingUserError);
      return NextResponse.json(
        { error: 'Falha ao validar o cadastro.' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Conflito: e-mail ja cadastrado.' },
        { status: 409 }
      );
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: signUpError } = await anonClient.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });

    if (signUpError) {
      const message = signUpError.message.toLowerCase();
      if (message.includes('already') || message.includes('exists') || message.includes('registered')) {
        return NextResponse.json(
          { error: 'Conflito: e-mail ja cadastrado.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[AUTH_REGISTER] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar conta.' },
      { status: 500 }
    );
  }
}