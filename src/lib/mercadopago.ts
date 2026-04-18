import MercadoPagoConfig, { Payment, PreApproval, Preference } from 'mercadopago';
import { ADDON_PRICING, type AddonType, PLAN_PRICING, type PlanType } from '@/lib/pricing';

// Instância global reutilizável do SDK Mercado Pago
export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 5000 },
});

export const preApprovalClient = new PreApproval(mpClient);
export const preferenceClient = new Preference(mpClient);
export const paymentClient = new Payment(mpClient);

export type { AddonType, PlanType } from '@/lib/pricing';

export interface PlanConfig {
  label: string;
  price: number;
  frequency: number; // em meses
  description: string;
  monthlySimulations: number;
}

export interface AddonConfig {
  label: string;
  description: string;
  price: number;
  simulations: number;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  mensal: {
    label: 'Plano Mensal — Simulicold',
    price: PLAN_PRICING.mensal.price,
    // price: 0.5, // preço de teste - R$1,00
    frequency: PLAN_PRICING.mensal.frequency,
    description: 'Acesso mensal ao Simulicold — renovação automática',
    monthlySimulations: PLAN_PRICING.mensal.monthlySimulations,
  },
  trimestral: {
    label: 'Plano Trimestral — Simulicold',
    price: PLAN_PRICING.trimestral.price,
    frequency: PLAN_PRICING.trimestral.frequency,
    description: 'Acesso por 3 meses ao Simulicold — renovação automática',
    monthlySimulations: PLAN_PRICING.trimestral.monthlySimulations,
  },
  semestral: {
    label: 'Plano Semestral — Simulicold',
    price: PLAN_PRICING.semestral.price,
    frequency: PLAN_PRICING.semestral.frequency,
    description: 'Acesso por 6 meses ao Simulicold — renovação automática',
    monthlySimulations: PLAN_PRICING.semestral.monthlySimulations,
  },
};

export const ADDON_PACKAGES: Record<AddonType, AddonConfig> = {
  'simulacoes-20': {
    label: 'Pacote Avulso +20 Simulações — Simulicold',
    description: 'Recarga avulsa de 20 simulações para continuar treinando agora',
    price: ADDON_PRICING['simulacoes-20'].price,
    simulations: ADDON_PRICING['simulacoes-20'].simulations,
  },
};
