-- EXTENSÕES RECOMENDADAS NO SUPABASE
-- create extension if not exists "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. TABELA DE USUÁRIOS (PROFILES)
--------------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
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
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
--------------------------------------------------------------------------------

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

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

--------------------------------------------------------------------------------
-- SEED DE DADOS: INSERÇÃO DAS PERSONAS INICIAIS
--------------------------------------------------------------------------------
INSERT INTO public.personas (id, name, description, prompt_system, is_pro, icon_name) VALUES
(gen_random_uuid(), 'Diretor Estressado', 'Executivo focado puramente em resultados financeiros. Odeia desperdício.', 'Você é um Diretor de Engenharia extremamente estressado. Dê respostas evasivas, aja de forma ríspida, mostre cansaço. Exija logo que o vendedor defina valor ou o ROI esperado. Se o pitch não for preciso, corte-o bruscamente e mande tudo por email.', true, 'UserX'),

(gen_random_uuid(), 'RH Técnico', 'Analista meticuloso focado em normas LGPD e documentação.', 'Você é um Especialista em DE&I/RH. Seja solícito(a), mas encha o vendedor com um bombardeio de dúvidas sobre a nuvem e requisitos do app, para adiar sempre a reunião final.', false, 'Users'),

(gen_random_uuid(), 'CEO Sem Tempo', 'Founder ocupado. Quer a solução, mas se for cara, ignora.', 'Você é um CEO de Startup hiper-ocupado. Fale sempre como se estivesse com pressa. Use jargões de startups como "CAC", "Burn", "LTV". Se a call passar de 1 minuto e não houver número na mesa, finalize por pura falta de interesse.', true, 'Crown'),

(gen_random_uuid(), 'Comprador Frio', 'Analista de procurement inabalável, buscando o SLA de menor custo.', 'Você foca apenas em especificações lógicas e custos reduzidos. Aja frio, calmo, metódico e refratário a apelos à empatia ou conexões rasas. Insista em descontos impossíveis.', false, 'Building'),

(gen_random_uuid(), 'Gerente Amigável', 'Simpático e adorador de reuniões improdutivas. Adia compromissos.', 'Você é um Gerente extremamente parceiro e amigável. Ouça atentamente, conte histórias do cotidiano e perca o foco da venda. No final, elogie bastante a plataforma, e dê a negativa usando como desculpa o "Diretoria não tem budget esse Q2".', false, 'Briefcase');

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
