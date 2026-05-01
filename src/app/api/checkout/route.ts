import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthorizationToken } from '@/lib/supabase-server';
import { preferenceClient } from '@/lib/mercadopago';

function normalizeSiteUrl(raw: string | undefined): string {
  const fallback = 'http://localhost:3000';
  if (!raw) return fallback;

  const trimmed = raw.trim().replace(/^['\"]|['\"]$/g, '').replace(/\/+$/, '');
  return trimmed || fallback;
}

function extractCheckoutError(error: unknown): {
  message: string;
  status: number;
  debug?: Record<string, unknown>;
} {
  const err = error as {
    message?: string;
    status?: number;
    cause?: Array<{ code?: string | number; description?: string }>;
    response?: { status?: number; data?: unknown };
  };

  const causeItem = Array.isArray(err?.cause) ? err.cause[0] : undefined;
  const statusFromError =
    (typeof err?.status === 'number' ? err.status : undefined) ??
    (typeof err?.response?.status === 'number' ? err.response.status : undefined);

  const status = statusFromError && statusFromError >= 400 && statusFromError <= 599
    ? statusFromError
    : 500;

  const message =
    causeItem?.description ||
    err?.message ||
    'Erro ao gerar cobrança no Mercado Pago.';

  if (process.env.NODE_ENV === 'production') {
    return { message, status };
  }

  return {
    message,
    status,
    debug: {
      statusFromError,
      cause: err?.cause,
      response: err?.response?.data,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Recuperar sessão do usuário via cookies (padrão @supabase/ssr)
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: cookieAuthError,
    } = await supabase.auth.getUser();

    let checkoutUser = user;

    // 2. Fallback por bearer token quando a sincronização de cookies ainda não ocorreu
    if (!checkoutUser) {
      const token = getAuthorizationToken(request);
      if (token) {
        const {
          data: { user: bearerUser },
        } = await supabase.auth.getUser(token);
        checkoutUser = bearerUser;
      }
    }

    if (cookieAuthError || !checkoutUser) {
      return NextResponse.json(
        { error: 'Não autenticado. Faça login para comprar créditos.' },
        { status: 401 }
      );
    }

    // 3. Extrair e validar o pacote (payload vindo do frontend)
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const unit_price = typeof body.unit_price === 'number' ? body.unit_price : Number(body.unit_price);
    const packageName = typeof body.package === 'string' ? body.package.trim() : '';
    const credits = typeof body.credits === 'number' ? body.credits : Number(body.credits);

    if (!title) {
      return NextResponse.json({ error: 'Campo "title" é obrigatório.' }, { status: 400 });
    }

    if (!unit_price || Number.isNaN(unit_price) || unit_price <= 0) {
      return NextResponse.json({ error: 'Campo "unit_price" inválido.' }, { status: 400 });
    }

    if (!credits || Number.isNaN(credits) || credits <= 0) {
      return NextResponse.json({ error: 'Campo "credits" inválido.' }, { status: 400 });
    }

    const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

    if (!checkoutUser.email) {
      return NextResponse.json({ error: 'Conta sem e-mail válido para gerar cobrança no Mercado Pago.' }, { status: 400 });
    }

    // Monta payload da Preference para pagamento único (Package)
    const externalReference = JSON.stringify({ userId: checkoutUser.id, package: packageName || title, credits });

    // Criar preferência para Checkout Pro (pagamento único de pacote de créditos)
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: packageName || title || 'pacote-simulicold',
            title,
            quantity: 1,
            currency_id: 'BRL',
            unit_price,
          },
        ],
        payer: {
          email: checkoutUser.email,
        },
        external_reference: externalReference,
        metadata: {
          userId: checkoutUser.id,
          package: packageName || title,
          credits,
          flow: 'one_time_package',
        },
        back_urls: {
          success: `${siteUrl}/dashboard`,
          pending: `${siteUrl}/dashboard`,
          failure: `${siteUrl}/dashboard`,
        },
        auto_return: 'approved',
        notification_url: `${siteUrl}/api/webhooks/mercadopago`,
      },
    });

    if (!preference.init_point) {
      throw new Error('Mercado Pago não retornou um link de pagamento.');
    }

    return NextResponse.json({ init_point: preference.init_point, url: preference.init_point });
  } catch (error: unknown) {
    console.error('[CHECKOUT] Erro ao criar Preference:', error);
    const extracted = extractCheckoutError(error);
    return NextResponse.json(
      {
        error: extracted.message,
        ...(extracted.debug ? { debug: extracted.debug } : {}),
      },
      { status: extracted.status }
    );
  }
}
