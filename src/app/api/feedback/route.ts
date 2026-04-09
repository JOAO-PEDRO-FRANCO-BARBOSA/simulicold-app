// src/app/api/feedback/route.ts
// Rota de envio de feedback por e-mail via SMTP (Nodemailer)

import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, userEmail } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response('O campo "message" é obrigatório.', { status: 400 });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.error('Variáveis SMTP não configuradas no .env.local');
      return new Response('Configuração de e-mail ausente no servidor.', { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"Simulicold Feedback" <${user}>`,
      to: 'projetos@conselt.com.br',
      subject: '📩 Novo Feedback — Simulicold',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Novo Feedback Recebido
          </h2>
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="white-space: pre-wrap; line-height: 1.6; color: #333;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          ${userEmail ? `<p style="color: #666; font-size: 14px;">Enviado por: <strong>${userEmail}</strong></p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Enviado automaticamente pelo Simulicold.</p>
        </div>
      `,
    });

    return Response.json({ success: true, message: 'Feedback enviado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao enviar feedback:', error);
    return new Response(
      error.message || 'Erro interno ao enviar feedback',
      { status: 500 }
    );
  }
}
