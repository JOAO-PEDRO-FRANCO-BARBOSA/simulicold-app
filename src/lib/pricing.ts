export const PLAN_TYPES = ['mensal', 'trimestral', 'semestral'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export interface PublicPlanPricing {
  price: number;
  frequency: number;
  monthlySimulations: number;
}

export const PLAN_PRICING: Record<PlanType, PublicPlanPricing> = {
  mensal: {
    price: 97,
    frequency: 1,
    monthlySimulations: 105,
  },
  trimestral: {
    price: 227,
    frequency: 3,
    monthlySimulations: 315,
  },
  semestral: {
    price: 397,
    frequency: 6,
    monthlySimulations: 630,
  },
};

export const ADDON_TYPES = ['simulacoes-20'] as const;
export type AddonType = (typeof ADDON_TYPES)[number];

export interface PublicAddonPricing {
  price: number;
  simulations: number;
}

export const ADDON_PRICING: Record<AddonType, PublicAddonPricing> = {
  'simulacoes-20': {
    price: 97,
    simulations: 20,
  },
};

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
