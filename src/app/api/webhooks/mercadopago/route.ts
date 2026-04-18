import { NextRequest, NextResponse } from 'next/server';
import { ADDON_PACKAGES, PLANS, PlanType } from '@/lib/mercadopago';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

type WebhookBody = {
  type?: string;
  topic?: string;
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

async function getPaymentFromApi(paymentId: string): Promise<MercadoPagoPayment | null> {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[WEBHOOK MP] MP_ACCESS_TOKEN ausente.');
    return null;
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WEBHOOK MP] Notificação recebida:', JSON.stringify(body));

    const { type, topic, data } = body as WebhookBody;
    const notificationType = type ?? topic;

    if (!notificationType) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    if (notificationType !== 'payment') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const paymentId = data?.id ?? body.id;
    if (!paymentId) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const payment = await getPaymentFromApi(paymentId);
    if (!payment) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    if (payment.status !== 'approved') {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const userId = payment.external_reference;
    if (!userId) {
      console.error('[WEBHOOK MP] external_reference ausente — não é possível identificar o usuário.');
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const fulfillment = resolveFulfillmentPackage(payment);
    if (!fulfillment) {
      console.error('[WEBHOOK MP] payment aprovado sem pacote reconhecido:', {
        paymentId,
        transactionAmount: payment.transaction_amount,
        metadata: payment.metadata,
      });
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error: simulationsError } = await addSimulationsToUser(userId, fulfillment.simulations, supabaseAdmin);

    if (simulationsError) {
      console.error('[WEBHOOK MP] Erro ao creditar simulações:', simulationsError);
      return NextResponse.json({ success: true }, { status: 200 });
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
        return NextResponse.json({ success: true }, { status: 200 });
      }
    }

    console.log(
      `[WEBHOOK MP] Fulfillment aplicado user ${userId} (+${fulfillment.simulations} simulações, ${fulfillment.durationDays} dias, payment ${paymentId})`
    );
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('[WEBHOOK MP] Erro não tratado:', error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
