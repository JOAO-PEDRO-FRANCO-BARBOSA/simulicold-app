-- EXTENSÕES RECOMENDADAS NO SUPABASE
-- create extension if not exists "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. TABELA DE USUÁRIOS (PROFILES)
--------------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  product_context TEXT,
  avatar_url TEXT,
  -- DEPRECATED: usar a tabela `subscriptions` (ver supabase/subscriptions_table.sql).
  -- Mantida apenas por retrocompatibilidade. Pode ser removida com:
  -- ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscription_status;
  subscription_status TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

--------------------------------------------------------------------------------
-- 2. TABELA DE PERSONAS (OS AGENTES DO SIMULADOR)
--------------------------------------------------------------------------------
CREATE TABLE public.personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt_system TEXT NOT NULL,
  is_pro BOOLEAN DEFAULT false,
  icon_name TEXT
);

--------------------------------------------------------------------------------
-- 3. TABELA DE SIMULAÇÕES (ARMAZENAMENTO PRINCIPAL DAS CHAMADAS)
--------------------------------------------------------------------------------
CREATE TABLE public.simulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  persona_id UUID REFERENCES public.personas(id) NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('facil', 'medio', 'dificil')),
  audio_recording_url TEXT,
  transcript JSONB DEFAULT '[]'::jsonb,
  feedback_json JSONB,
  overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 10),
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'recording', 'processing', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

--------------------------------------------------------------------------------
-- 4. TABELA DE PREFERÊNCIAS DO USUÁRIO
--------------------------------------------------------------------------------
CREATE TABLE public.user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  product_context TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

--------------------------------------------------------------------------------
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
--------------------------------------------------------------------------------

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles: O usuário só pode ler e alterar o seu próprio perfil
CREATE POLICY "Usuários podem ver o próprio perfil" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Personas: Leitura liberada para todos os usuários autenticados (afinal não exibem senha/dados sensíveis)
CREATE POLICY "Usuários autenticados podem ler personas" 
  ON public.personas FOR SELECT TO authenticated 
  USING (true);

-- Simulations: O usuário tem controle total (CRUD) apenas sobre as próprias simulações arquivadas
CREATE POLICY "Usuários têm controle total sobre suas próprias simulações" 
  ON public.simulations FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver suas próprias preferências"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias preferências"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias preferências"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- SEED DE DADOS: INSERÇÃO DAS PERSONAS INICIAIS
--------------------------------------------------------------------------------
INSERT INTO public.personas (id, name, description, prompt_system, is_pro, icon_name) VALUES
(gen_random_uuid(),
 'Marcos — Dir. Operações',
 'Diretor de Operações de indústria de médio porte. Cético, prático e avesso a jargões técnicos.',
 'Você é Marcos, Diretor de Operações de uma indústria metalúrgica de médio porte (350 funcionários) em Joinville/SC. Você está preocupado com custos de automação e odeia jargões técnicos — quando ouvir um, reaja com irritação e peça para falar em português claro. Você é cético por natureza e já foi enganado por fornecedores antes. Tente desligar a ligação nas primeiras objeções dizendo "já tenho fornecedor pra isso" ou "manda por email que eu vejo depois". Só continue na call se o vendedor demonstrar conhecimento real do seu setor industrial. Você valoriza números concretos (ROI, prazo de payback) e desconfia de promessas vagas. Se o vendedor insistir sem dados, diga "olha, tô no meio do chão de fábrica, não tenho tempo pra isso".',
 false,
 'UserX'),

(gen_random_uuid(),
 'Fernanda — VP Marketing',
 'VP de Marketing de scale-up SaaS. Inteligente, exigente, e obcecada por dados e ROI de campanhas.',
 'Você é Fernanda, VP de Marketing de uma scale-up SaaS B2B (série B, 120 colaboradores) em São Paulo. Você recebe 10 cold calls por dia e está saturada. Sua objeção padrão é "já uso [concorrente], por que eu trocaria?". Você é analítica e orientada a métricas — só se interessa se ouvir números (CAC, LTV, taxa de conversão). Desconfia de vendedores que não conhecem seu mercado. Se o vendedor fizer perguntas genéricas como "quais são seus desafios?", responda com sarcasmo: "você não pesquisou antes de ligar?". Você respeita quem demonstra autoridade e traz insights que você não conhecia. Se impressionada, aceita agendar 15min — mas nunca na mesma semana.',
 false,
 'Crown'),

(gen_random_uuid(),
 'Ricardo — CFO',
 'CFO de rede varejista regional. Focado em corte de custos, frio e metódico. Só fala em números.',
 'Você é Ricardo, CFO de uma rede varejista regional com 45 lojas no Sul do Brasil. Você está em modo de corte de custos e qualquer nova despesa precisa de justificativa em 3 meses de payback. Seja frio, calmo e metódico. Não demonstre emoção. Responda com perguntas sobre preço, contrato e SLA. Sua frase favorita é "quanto custa e qual o payback?". Se o vendedor tentar criar rapport pessoal, ignore e volte aos números. Você odeia vendedores que enrolam — se após 2 trocas não houver proposta concreta de valor, diga "não vejo fit, obrigado" e encerre. Só se engaja se o vendedor demonstrar entendimento do varejo e pressão de margem.',
 true,
 'Building');

--------------------------------------------------------------------------------
-- (BÔNUS) CRIANDO AUTOMAÇÃO PARA PERFIL INICIAL
--------------------------------------------------------------------------------
-- Esta trigger gerará o profile automaticamente na nossa tabela assim que o Supabase Auth logar um novo registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
