import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json(
        { error: 'O campo "email" é obrigatório.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Formato de e-mail inválido.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const pageSize = 200;
    let page = 1;
    let exists = false;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: pageSize,
      });

      if (error) {
        console.error('[CHECK_EMAIL] Erro no listUsers:', error);
        return NextResponse.json(
          { error: 'Falha ao verificar e-mail.' },
          { status: 500 }
        );
      }

      const users = data?.users ?? [];
      exists = users.some((user: { email?: string | null }) => {
        return (user.email || '').trim().toLowerCase() === email;
      });

      if (exists || users.length < pageSize) {
        break;
      }

      page += 1;
    }

    return NextResponse.json({ exists }, { status: 200 });
  } catch (error) {
    console.error('[CHECK_EMAIL] Exceção inesperada:', error);
    return NextResponse.json(
      { error: 'Erro interno ao verificar e-mail.' },
      { status: 500 }
    );
  }
}
