import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const normalizedEmail =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: 'O campo email é obrigatório.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Formato de e-mail inválido.' },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const pageSize = 200;
    let page = 1;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: pageSize,
      });

      if (error) {
        console.error('[CHECK_EMAIL] listUsers error:', error);
        return NextResponse.json(
          { error: 'Falha ao verificar e-mail.' },
          { status: 500 }
        );
      }

      const users = data?.users ?? [];
      const exists = users.some((user: { email?: string | null }) => {
        return (user.email || '').trim().toLowerCase() === normalizedEmail;
      });

      if (exists) {
        return NextResponse.json({ exists: true }, { status: 200 });
      }

      if (users.length < pageSize) {
        break;
      }

      page += 1;
    }

    return NextResponse.json({ exists: false }, { status: 200 });
  } catch (error) {
    console.error('[CHECK_EMAIL] unexpected error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao verificar e-mail.' },
      { status: 500 }
    );
  }
}
