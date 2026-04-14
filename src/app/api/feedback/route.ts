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
    const { message } = body as { message?: string };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'O campo "message" é obrigatório.' },
        { status: 400 }
      );
    }

    const safeMessage = escapeHtml(message.trim());

    const { data, error } = await resend.emails.send({
      from: 'Simulicold <contato@simulicold.conselt.com.br>',
      to: 'joaobarbosa@conselt.com.br',
      subject: 'Novo Feedback - Simulicold',
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #1e40af; margin: 0 0 8px 0;">Novo Feedback Recebido</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 18px 0;">Mensagem enviada pelo formulário de suporte da plataforma Simulicold.</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 10px;">
            <p style="white-space: pre-wrap; line-height: 1.7; color: #111827; margin: 0;">${safeMessage}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Enviado automaticamente pelo Simulicold.</p>
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

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback enviado com sucesso!',
        id: data?.id,
      },
      { status: 200 }
    );
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
