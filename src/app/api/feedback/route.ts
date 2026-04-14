// src/app/api/feedback/route.ts
// Rota de envio de feedback por e-mail via Resend API

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

function escapeHtml(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'O campo "message" é obrigatório.' },
        { status: 400 }
      );
    }

    const safeMessage = escapeHtml(message);

    const { data, error } = await resend.emails.send({
      from: 'Simulicold <onboarding@resend.dev>',
      to: 'joaobarbosa@conselt.com.br',
      subject: 'Novo Feedback Anônimo - Simulicold',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Novo Feedback Recebido
          </h2>
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="white-space: pre-wrap; line-height: 1.6; color: #333;">${safeMessage}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Enviado automaticamente pelo Simulicold.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[FEEDBACK] Erro Resend ao enviar e-mail:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Falha ao enviar e-mail pelo Resend.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback enviado com sucesso!',
      id: data?.id,
    });
  } catch (error: unknown) {
    console.error('[FEEDBACK] Exceção inesperada ao enviar e-mail:', error);

    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Erro interno ao enviar feedback';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
