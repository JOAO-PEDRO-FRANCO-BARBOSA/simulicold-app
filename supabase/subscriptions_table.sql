--------------------------------------------------------------------------------
-- TABELA DE ASSINATURAS (SUBSCRIPTIONS)
-- Execute este script no SQL Editor do Supabase Dashboard.
-- Ele cria a tabela que o código já referencia em:
--   • (protected)/layout.tsx
--   • login/page.tsx
--   • api/webhooks/mercadopago/route.ts
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Referência ao usuário (1 assinatura por usuário)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Tipo do plano contratado
  plan_type TEXT NOT NULL CHECK (plan_type IN ('mensal', 'trimestral', 'semestral')),

  -- Status da assinatura (espelha os estados do Mercado Pago)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'active', 'paused', 'cancelled')),

  -- IDs do Mercado Pago para rastreabilidade
  mp_preapproval_id TEXT UNIQUE,  -- usado como onConflict no webhook upsert
  mp_payer_id TEXT,

  -- Fim do período atual — usado para validar se a assinatura ainda está vigente
  current_period_end TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para buscas rápidas por user_id (já é UNIQUE, mas explicitamos)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Índice para buscas pelo webhook (upsert por mp_preapproval_id)
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_preapproval_id ON public.subscriptions(mp_preapproval_id);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
--------------------------------------------------------------------------------

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuário autenticado pode ler apenas a própria assinatura
CREATE POLICY "Usuários podem ver a própria assinatura"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Bloqueado via anon/authenticated — apenas service_role (webhook) insere
-- Não criamos policy de INSERT para authenticated, o que significa que
-- o client-side NÃO consegue inserir. O webhook usa service_role que bypassa RLS.

-- UPDATE: Idem — apenas service_role atualiza
-- Não criamos policy de UPDATE para authenticated.

-- DELETE: Idem — apenas service_role deleta
-- Não criamos policy de DELETE para authenticated.

--------------------------------------------------------------------------------
-- (OPCIONAL) Remover coluna redundante da tabela profiles
-- Descomente e execute se quiser limpar:
--------------------------------------------------------------------------------
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscription_status;
