import MercadoPagoConfig, { Payment, PreApproval, Preference } from 'mercadopago';

// Instância global reutilizável do SDK Mercado Pago
export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 5000 },
});

export const preApprovalClient = new PreApproval(mpClient);
export const preferenceClient = new Preference(mpClient);
export const paymentClient = new Payment(mpClient);

export type PlanType = 'mensal' | 'trimestral' | 'semestral';

export interface PlanConfig {
  label: string;
  price: number;
  frequency: number; // em meses
  description: string;
  monthlyCredits: number;
}

export type AddonType = 'creditos-20';

export interface AddonConfig {
  label: string;
  description: string;
  price: number;
  credits: number;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  mensal: {
    label: 'Plano Mensal — Simulicold',
    price: 247,
    frequency: 1,
    description: 'Acesso mensal ao Simulicold — renovação automática',
    monthlyCredits: 40,
  },
  trimestral: {
    label: 'Plano Trimestral — Simulicold',
    price: 597,
    frequency: 3,
    description: 'Acesso por 3 meses ao Simulicold — renovação automática',
    monthlyCredits: 120,
  },
  semestral: {
    label: 'Plano Semestral — Simulicold',
    price: 997,
    frequency: 6,
    description: 'Acesso por 6 meses ao Simulicold — renovação automática',
    monthlyCredits: 240,
  },
};

export const ADDON_PACKAGES: Record<AddonType, AddonConfig> = {
  'creditos-20': {
    label: 'Pacote Avulso +20 Créditos — Simulicold',
    description: 'Recarga avulsa de 20 créditos para continuar treinando agora',
    price: 97,
    credits: 20,
  },
};
