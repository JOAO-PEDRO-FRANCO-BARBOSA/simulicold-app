import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthorizationToken } from '@/lib/supabase-server';
import { preApprovalClient, PLANS, PlanType } from '@/lib/mercadopago';

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
        { error: 'Não autenticado. Faça login para assinar.' },
        { status: 401 }
      );
    }

    // 3. Extrair e validar o plano do body
    const body = await request.json();
    const planType = body.planType as PlanType;

    if (!planType || !['mensal', 'trimestral', 'semestral'].includes(planType)) {
      return NextResponse.json(
        { error: 'Plano inválido. Use: mensal, trimestral ou semestral.' },
        { status: 400 }
      );
    }

    const plan = PLANS[planType];
    const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

    if (!checkoutUser.email) {
      return NextResponse.json(
        { error: 'Conta sem e-mail válido para gerar assinatura no Mercado Pago.' },
        { status: 400 }
      );
    }

    // 4. Criar PreApproval (assinatura recorrente) no Mercado Pago
    const preApproval = await preApprovalClient.create({
      body: {
        reason: plan.label,
        auto_recurring: {
          frequency: plan.frequency,
          frequency_type: 'months',
          transaction_amount: plan.price,
          currency_id: 'BRL',
        },
        back_url: `${siteUrl}/login?payment=success`,
        // external_reference mapeia o user_id do Supabase para o webhook
        external_reference: checkoutUser.id,
        payer_email: checkoutUser.email,
        status: 'pending',
      },
    });

    if (!preApproval.init_point) {
      throw new Error('Mercado Pago não retornou um link de pagamento.');
    }

    return NextResponse.json({ init_point: preApproval.init_point });
  } catch (error: unknown) {
    console.error('[CHECKOUT] Erro ao criar PreApproval:', error);
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
