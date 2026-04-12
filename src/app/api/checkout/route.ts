import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { preApprovalClient, PLANS, PlanType } from '@/lib/mercadopago';

export async function POST(request: NextRequest) {
  try {
    // 1. Recuperar sessão do usuário via cookies (padrão @supabase/ssr)
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado. Faça login para assinar.' },
        { status: 401 }
      );
    }

    // 2. Extrair e validar o plano do body
    const body = await request.json();
    const planType = body.planType as PlanType;

    if (!planType || !['mensal', 'trimestral', 'semestral'].includes(planType)) {
      return NextResponse.json(
        { error: 'Plano inválido. Use: mensal, trimestral ou semestral.' },
        { status: 400 }
      );
    }

    const plan = PLANS[planType];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // 3. Criar PreApproval (assinatura recorrente) no Mercado Pago
    const preApproval = await preApprovalClient.create({
      body: {
        reason: plan.label,
        auto_recurring: {
          frequency: plan.frequency,
          frequency_type: 'months',
          transaction_amount: plan.price,
          currency_id: 'BRL',
        },
        back_url: `${siteUrl}/dashboard?status=check`,
        // external_reference mapeia o user_id do Supabase para o webhook
        external_reference: user.id,
        payer_email: user.email,
        status: 'pending',
      },
    });

    if (!preApproval.init_point) {
      throw new Error('Mercado Pago não retornou um link de pagamento.');
    }

    return NextResponse.json({ init_point: preApproval.init_point });
  } catch (error: unknown) {
    console.error('[CHECKOUT] Erro ao criar PreApproval:', error);
    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
