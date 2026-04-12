import MercadoPagoConfig, { PreApproval } from 'mercadopago';

// Instância global reutilizável do SDK Mercado Pago
export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 5000 },
});

export const preApprovalClient = new PreApproval(mpClient);

export type PlanType = 'mensal' | 'trimestral' | 'semestral';

export interface PlanConfig {
  label: string;
  price: number;
  frequency: number; // em meses
  description: string;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  mensal: {
    label: 'Plano Mensal — Simulicold',
    price: 60,
    frequency: 1,
    description: 'Acesso mensal ao Simulicold — renovação automática',
  },
  trimestral: {
    label: 'Plano Trimestral — Simulicold',
    price: 170,
    frequency: 3,
    description: 'Acesso por 3 meses ao Simulicold — renovação automática',
  },
  semestral: {
    label: 'Plano Semestral — Simulicold',
    price: 335,
    frequency: 6,
    description: 'Acesso por 6 meses ao Simulicold — renovação automática',
  },
};
