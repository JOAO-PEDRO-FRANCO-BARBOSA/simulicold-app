import { NextResponse } from 'next/server';
import { ADDON_PACKAGES, PLANS, PlanType } from '@/lib/mercadopago';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

type WebhookBody = {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string };
  id?: string;
};

type PaymentMetadata = {
  flow?: string;
  planType?: string;
  addonType?: string;
  simulations?: number;
  durationDays?: number;
};

type MercadoPagoPayment = {
  id: string | number;
  status?: string;
  external_reference?: string;
  transaction_amount?: number | null;
  payer_id?: string | number | null;
  metadata?: PaymentMetadata;
};

type FulfillmentPackage = {
  simulations: number;
  durationDays: number;
  planType: PlanType | null;
};

type ExtractedWebhookData = {
  paymentId: string | null;
  notificationType: string | null;
  source: 'query' | 'body' | 'none';
  parsedBody?: WebhookBody;
};

async function extractWebhookData(request: Request): Promise<ExtractedWebhookData> {
  const { searchParams } = new URL(request.url);

  let paymentId = searchParams.get('data.id') || searchParams.get('id');
  let notificationType = searchParams.get('type') || searchParams.get('topic');
  let source: ExtractedWebhookData['source'] = paymentId ? 'query' : 'none';

  let parsedBody: WebhookBody | undefined;

  if (!paymentId || !notificationType) {
    const textBody = await request.text();
    if (textBody) {
      try {
        parsedBody = JSON.parse(textBody) as WebhookBody;
      } catch (parseError) {
        console.error('[WEBHOOK MP] Body inválido (não JSON):', parseError);
      }
    }

    const bodyPaymentId = parsedBody?.data?.id || parsedBody?.id;
    const bodyType = parsedBody?.type || parsedBody?.topic || parsedBody?.action;

    if (!paymentId && bodyPaymentId) {
      paymentId = bodyPaymentId;
      source = 'body';
    }

    if (!notificationType && bodyType) {
      notificationType = bodyType;
      if (source === 'none') source = 'body';
    }
  }

  return {
    paymentId,
    notificationType,
    source,
    parsedBody,
  };
}

async function getPaymentFromApi(paymentId: string): Promise<MercadoPagoPayment | null> {
  const accessToken = process.env.MP_ACCESS_TOKEN ?? process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[WEBHOOK MP] Access token ausente (MP_ACCESS_TOKEN/MERCADOPAGO_ACCESS_TOKEN).');
    return null;
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    console.error('[WEBHOOK MP] Falha ao buscar payment na API:', response.status, payload);
    return null;
  }

  return (await response.json()) as MercadoPagoPayment;
}

function resolveFulfillmentPackage(payment: MercadoPagoPayment): FulfillmentPackage | null {
  const metadata = payment.metadata;

  if (metadata?.planType && metadata.planType in PLANS) {
    const planType = metadata.planType as PlanType;
    const plan = PLANS[planType];
    return {
      planType,
      simulations: typeof metadata.simulations === 'number' ? metadata.simulations : plan.monthlySimulations,
      durationDays: typeof metadata.durationDays === 'number' ? metadata.durationDays : plan.frequency * 30,
    };
  }

  if (metadata?.addonType && metadata.addonType in ADDON_PACKAGES) {
    const addonType = metadata.addonType as keyof typeof ADDON_PACKAGES;
    return {
      planType: null,
      simulations: ADDON_PACKAGES[addonType].simulations,
      durationDays: 0,
    };
  }

  const transactionAmount = payment.transaction_amount;
  const normalizedAmount =
    typeof transactionAmount === 'number' ? Number(transactionAmount.toFixed(2)) : null;

  const matchedPlanEntry = (Object.entries(PLANS) as Array<[PlanType, (typeof PLANS)[PlanType]]>)
    .find(([, config]) => Number(config.price.toFixed(2)) === normalizedAmount);

  if (!matchedPlanEntry) {
    return null;
  }

  const [planType, plan] = matchedPlanEntry;
  return {
    planType,
    simulations: plan.monthlySimulations,
    durationDays: plan.frequency * 30,
  };
}

async function addSimulationsToUser(
  userId: string,
  amount: number,
  supabaseAdmin = createSupabaseAdminClient()
) {
  const { data: currentSimulations, error: readError } = await supabaseAdmin
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError && readError.code !== 'PGRST116') {
    return { error: readError };
  }

  const nextBalance = Math.max(0, (currentSimulations?.balance ?? 0) + amount);

  return supabaseAdmin
    .from('user_credits')
    .upsert(
      {
        user_id: userId,
        balance: nextBalance,
      },
      {
        onConflict: 'user_id',
      }
    );
}

async function updateSubscriptionPeriod(
  userId: string,
  planType: PlanType,
  payerId: string,
  durationDays: number,
  supabaseAdmin = createSupabaseAdminClient()
) {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + durationDays);

  return supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_type: planType,
        status: 'active',
        mp_payer_id: payerId,
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );
}

/**
 * Rota pública — chamada automaticamente pelo Mercado Pago via IPN/Webhook.
 * Nunca deve exigir autenticação.
 */
export async function POST(request: Request) {
  try {
    const extracted = await extractWebhookData(request);

    console.log('[WEBHOOK MP] Evento recebido:', {
      paymentId: extracted.paymentId,
      notificationType: extracted.notificationType,
      source: extracted.source,
    });

    if (
      !extracted.paymentId ||
      (extracted.notificationType !== 'payment' && extracted.notificationType !== 'payment.updated')
    ) {
      console.log('[WEBHOOK MP] Webhook ignorado: Não é payment/payment.updated ou ID ausente.');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const paymentId = extracted.paymentId;

    const payment = await getPaymentFromApi(paymentId);
    if (!payment) {
      console.error('[WEBHOOK MP] Não foi possível consultar pagamento na API do MP:', paymentId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    console.log('[WEBHOOK MP] Payment consultado:', {
      paymentId,
      status: payment.status,
      externalReference: payment.external_reference,
    });

    if (payment.status !== 'approved') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const userId = payment.external_reference;
    if (!userId) {
      console.error(`[WEBHOOK MP] ERRO: Pagamento ${paymentId} não possui external_reference.`);
      return NextResponse.json({ error: 'Missing external_reference' }, { status: 400 });
    }

    const fulfillment = resolveFulfillmentPackage(payment);
    if (!fulfillment) {
      console.error('[WEBHOOK MP] payment aprovado sem pacote reconhecido:', {
        paymentId,
        transactionAmount: payment.transaction_amount,
        metadata: payment.metadata,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error: simulationsError } = await addSimulationsToUser(userId, fulfillment.simulations, supabaseAdmin);

    if (simulationsError) {
      console.error('[WEBHOOK MP] Erro ao creditar simulações:', simulationsError);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (fulfillment.planType && fulfillment.durationDays > 0) {
      const { error: subscriptionError } = await updateSubscriptionPeriod(
        userId,
        fulfillment.planType,
        String(payment.payer_id ?? ''),
        fulfillment.durationDays,
        supabaseAdmin
      );

      if (subscriptionError) {
        console.error('[WEBHOOK MP] Erro ao atualizar assinatura/expiração:', subscriptionError);
        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    console.log(
      `[WEBHOOK MP] Fulfillment aplicado user ${userId} (+${fulfillment.simulations} simulações, ${fulfillment.durationDays} dias, payment ${paymentId})`
    );
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('[WEBHOOK MP] Erro fatal no Webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
