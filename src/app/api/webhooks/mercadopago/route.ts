import { NextRequest, NextResponse } from 'next/server';
import { preApprovalClient, PLANS, PlanType } from '@/lib/mercadopago';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Rota pública — chamada automaticamente pelo Mercado Pago via IPN/Webhook.
 * Nunca deve exigir autenticação.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WEBHOOK MP] Notificação recebida:', JSON.stringify(body));

    // Mercado Pago envia type + data.id
    const { type, data } = body as {
      type: string;
      data?: { id?: string };
      id?: string;
    };

    // Aceitar tanto IPN (type=preapproval) quanto notificações antigas (id direto)
    if (type !== 'preapproval' && type !== 'subscription_preapproval') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const preapprovalId = data?.id;
    if (!preapprovalId) {
      return NextResponse.json(
        { error: 'ID da notificação ausente.' },
        { status: 400 }
      );
    }

    // 1. Buscar detalhes completos da assinatura no Mercado Pago
    const preApproval = await preApprovalClient.get({ id: preapprovalId });

    console.log('[WEBHOOK MP] Status da assinatura:', preApproval.status);
    console.log('[WEBHOOK MP] external_reference:', preApproval.external_reference);

    // 2. Validar que foi aprovada
    if (preApproval.status !== 'authorized') {
      // Pode ser cancelled, paused, pending — registrar mas não ativar
      const supabaseAdmin = createSupabaseAdminClient();
      if (preApproval.external_reference) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: preApproval.status ?? 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('mp_preapproval_id', preapprovalId);
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 3. Extrair dados necessários
    const userId = preApproval.external_reference; // user_id do Supabase
    if (!userId) {
      console.error('[WEBHOOK MP] external_reference ausente — não é possível identificar o usuário.');
      return NextResponse.json({ error: 'external_reference ausente.' }, { status: 422 });
    }

    // 4. Determinar o plano pelo valor da transação
    const transactionAmount = preApproval.auto_recurring?.transaction_amount;
    let planType: PlanType = 'mensal';
    if (transactionAmount === PLANS.semestral.price) planType = 'semestral';
    else if (transactionAmount === PLANS.trimestral.price) planType = 'trimestral';
    else planType = 'mensal';

    // 5. Calcular current_period_end
    const frequencyMonths = PLANS[planType].frequency;
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + frequencyMonths);

    // 6. Upsert na tabela subscriptions via Admin client (bypassa RLS)
    const supabaseAdmin = createSupabaseAdminClient();
    const { error: dbError } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan_type: planType,
          status: 'active',
          mp_preapproval_id: preapprovalId,
          mp_payer_id: String(preApproval.payer_id ?? ''),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'mp_preapproval_id',
        }
      );

    if (dbError) {
      console.error('[WEBHOOK MP] Erro ao salvar no Supabase:', dbError);
      // Retorna 500 para que o MP tente reenviar a notificação
      return NextResponse.json({ error: 'Erro ao salvar assinatura.' }, { status: 500 });
    }

    console.log(`[WEBHOOK MP] Assinatura ${planType} ativada para user ${userId}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('[WEBHOOK MP] Erro não tratado:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
