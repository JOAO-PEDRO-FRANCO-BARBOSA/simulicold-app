import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthorizationToken } from '@/lib/supabase-server';
import { ADDON_PACKAGES, AddonType, preferenceClient } from '@/lib/mercadopago';

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
    'Erro ao gerar checkout de simulações no Mercado Pago.';

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
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: cookieAuthError,
    } = await supabase.auth.getUser();

    let checkoutUser = user;

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
        { error: 'Não autenticado. Faça login para comprar simulações.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const addonType = (body.addonType ?? 'simulacoes-20') as AddonType;

    if (!Object.prototype.hasOwnProperty.call(ADDON_PACKAGES, addonType)) {
      return NextResponse.json(
        { error: 'Pacote inválido.' },
        { status: 400 }
      );
    }

    const addon = ADDON_PACKAGES[addonType];
    const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

    if (!checkoutUser.email) {
      return NextResponse.json(
        { error: 'Conta sem e-mail válido para gerar cobrança no Mercado Pago.' },
        { status: 400 }
      );
    }

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: addonType,
            title: addon.label,
            description: addon.description,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: addon.price,
          },
        ],
        payer: {
          email: checkoutUser.email,
        },
        external_reference: checkoutUser.id,
        metadata: {
          flow: 'addon_purchase',
          addonType,
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
      throw new Error('Mercado Pago não retornou um link de pagamento para o pacote avulso.');
    }

    return NextResponse.json({ init_point: preference.init_point });
  } catch (error: unknown) {
    console.error('[CHECKOUT-ADDON] Erro ao criar Preference:', error);
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
