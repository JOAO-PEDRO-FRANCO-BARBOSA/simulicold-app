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
  user_id?: string;
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

async function getMerchantOrderFromApi(orderId: string): Promise<any | null> {
  const accessToken = process.env.MP_ACCESS_TOKEN ?? process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[WEBHOOK MP] Access token ausente (MP_ACCESS_TOKEN/MERCADOPAGO_ACCESS_TOKEN).');
    return null;
  }

  const response = await fetch(`https://api.mercadopago.com/merchant_orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    console.error('[WEBHOOK MP] Falha ao buscar merchant_order na API:', response.status, payload);
    return null;
  }

  return await response.json();
}

function resolveFulfillmentPackage(payment: MercadoPagoPayment): FulfillmentPackage | null {
  // Prefer metadata explicitamente enviado na Preference
  const metadata = payment.metadata;
  if (metadata && typeof metadata === 'object') {
    const m = metadata as PaymentMetadata;
    if (typeof m.simulations === 'number' && m.simulations > 0) {
      return { planType: (m.planType as PlanType) ?? null, simulations: m.simulations, durationDays: m.durationDays ?? 0 };
    }
  }

  // Tenta extrair do external_reference quando for JSON com user_id e simulations
  if (payment.external_reference) {
    try {
      const parsed = JSON.parse(String(payment.external_reference));
      if (parsed && typeof parsed.simulations === 'number') {
        return { planType: null, simulations: parsed.simulations, durationDays: 0 };
      }
    } catch (_e) {
      // external_reference pode ser apenas um userId; ignoramos nesse caso aqui
    }
  }

  // Fallback: tentar casar pelo amount com pacotes conhecidos (ADDON_PACKAGES ou PLANS)
  const transactionAmount = payment.transaction_amount;
  const normalizedAmount = typeof transactionAmount === 'number' ? Number(transactionAmount.toFixed(2)) : null;

  if (normalizedAmount != null) {
    // checar ADDON_PACKAGES
    for (const p of Object.values(ADDON_PACKAGES)) {
      if (Number(p.price.toFixed(2)) === normalizedAmount) {
        return { planType: null, simulations: p.simulations, durationDays: 0 };
      }
    }

    // checar PLANS
    for (const [key, cfg] of Object.entries(PLANS)) {
      if (Number(cfg.price.toFixed(2)) === normalizedAmount) {
        const planType = key as PlanType;
        return { planType, simulations: cfg.monthlySimulations, durationDays: cfg.frequency * 30 };
      }
    }
  }

  return null;
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
  durationDays: number,
  supabaseAdmin = createSupabaseAdminClient()
) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(now.getDate() + durationDays);

  const subscriptionPayload = {
    user_id: userId,
    status: 'active',
    plan_type: planType,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  };

  return supabaseAdmin
    .from('subscriptions')
    .upsert(subscriptionPayload, {
      onConflict: 'user_id',
    });
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

    if (!extracted.paymentId || !extracted.notificationType) {
      console.log('[WEBHOOK MP] Webhook ignorado: ID ou tipo ausente.');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const notificationType = extracted.notificationType;
    const id = extracted.paymentId;

    // Processar apenas notificações 'payment.updated' (aprovadas)
    if (!extracted.notificationType || !extracted.notificationType.includes('payment.updated')) {
      console.log('[WEBHOOK MP] Evento ignorado: não é payment.updated.');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Suportar events 'payment' e 'merchant_order' quando vierem como payment.updated
    const paymentsToProcess: MercadoPagoPayment[] = [];

    if (notificationType.includes('merchant_order')) {
      const order = await getMerchantOrderFromApi(id as string);
      if (!order) {
        console.error('[WEBHOOK MP] merchant_order não encontrado:', id);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // merchant_order pode conter array de payments
      const payments = Array.isArray(order.payments) ? order.payments : [];
      for (const p of payments) {
        paymentsToProcess.push(p as MercadoPagoPayment);
      }
    } else {
      // assume payment
      const payment = await getPaymentFromApi(id as string);
      if (!payment) {
        console.error('[WEBHOOK MP] Não foi possível consultar pagamento na API do MP:', id);
        return NextResponse.json({ received: true }, { status: 200 });
      }
      paymentsToProcess.push(payment);
    }

    const supabaseAdmin = createSupabaseAdminClient();

    for (const payment of paymentsToProcess) {
      try {
        console.log('[WEBHOOK MP] Payment consultado:', {
          paymentId: payment.id,
          status: payment.status,
          externalReference: payment.external_reference,
          metadata: payment.metadata,
        });

        if (payment.status !== 'approved') {
          console.log('[WEBHOOK MP] Payment não aprovado — ignorando:', payment.id, payment.status);
          continue; // processamos apenas pagos aprovados
        }

        // Extrair informações do external_reference no formato { userId, package, credits }
        let userId: string | null = null;
        let credits: number | null = null;
        let packageName: string | null = null;

        if (payment.external_reference) {
          try {
            const parsed = JSON.parse(String(payment.external_reference));
            if (parsed) {
              if (parsed.userId) userId = String(parsed.userId);
              if (typeof parsed.credits === 'number') credits = parsed.credits;
              if (parsed.package) packageName = String(parsed.package);
            }
          } catch (_e) {
            // external_reference may be a plain userId string
            if (!userId) userId = String(payment.external_reference);
          }
        }

        // Fallback: tentar ler metadata (compatibilidade retroativa)
        if ((!userId || !credits) && payment.metadata && typeof payment.metadata === 'object') {
          const m = payment.metadata as PaymentMetadata;
          if (!userId && m.user_id) userId = String(m.user_id);
          if (!credits && typeof m.simulations === 'number') credits = m.simulations;
        }

        // Fallback: tentar resolver pelo amount se ainda não tivermos credits
        if (!credits) {
          const fulfillment = resolveFulfillmentPackage(payment);
          if (fulfillment) credits = fulfillment.simulations;
        }

        if (!userId) {
          console.error(`[WEBHOOK MP] Impossível identificar user_id para payment ${payment.id}`);
          continue;
        }

        if (!credits || credits <= 0) {
          console.error(`[WEBHOOK MP] Credits inválido para payment ${payment.id}`, { credits });
          continue;
        }

        // Chamar RPC supabase para creditar créditos (nome exigido: increment_user_credits)
        const rpcName = 'increment_user_credits';
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(rpcName, {
          user_id: userId,
          credits,
        } as any);

        if (rpcError) {
          console.error('[WEBHOOK MP] Erro ao executar RPC increment_user_credits:', rpcError, { paymentId: payment.id, userId, credits });
          continue;
        }

        console.log(`[WEBHOOK MP] Créditos adicionados para user ${userId}: +${credits} (payment ${payment.id})`);

        // Registrar transação em package_purchases
        try {
          const { error: insertError } = await supabaseAdmin.from('package_purchases').insert([
            {
              user_id: userId,
              package_name: packageName ?? null,
              credits,
              payment_id: String(payment.id),
              amount: payment.transaction_amount ?? null,
              status: payment.status ?? 'approved',
              created_at: new Date().toISOString(),
            },
          ]);

          if (insertError) {
            console.error('[WEBHOOK MP] Erro ao inserir package_purchases:', insertError, { paymentId: payment.id, userId, credits });
          } else {
            console.log('[WEBHOOK MP] Registro em package_purchases criado para', userId);
          }
        } catch (err) {
          console.error('[WEBHOOK MP] Exceção ao inserir package_purchases:', err);
        }
      } catch (err) {
        console.error('[WEBHOOK MP] Erro processando payment dentro do loop:', err);
        continue;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('[WEBHOOK MP] Erro fatal no Webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
