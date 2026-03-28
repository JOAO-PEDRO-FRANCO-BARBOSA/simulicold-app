# Contexto do Projeto: Simulador de Telemarketing Ativo (Brasil)

Você é o Arquiteto Líder deste projeto. Nosso objetivo é criar uma plataforma onde vendedores (SDRs/BDRs) pratiquem chamadas contra agentes de IA que simulam clientes brasileiros reais.

## Tech Stack Obrigatória
- Frontend: Next.js (App Router), Tailwind CSS, Lucide React.
- Backend/Database/Auth: Supabase.
- Orquestração de IA: Vercel AI SDK ou LangChain (se necessário).
- Áudio: Web Audio API para gravação e OpenAI Whisper para transcrição.

## Estrutura de Agentes (A Lógica)
1. Agente Cliente: Deve assumir personas variadas (o "estressado", o "interessado mas sem tempo", o "técnico"). Deve falar como um brasileiro real (gírias corporativas, interrupções).
2. Agente Avaliador: O "Coach". Ele não julga apenas o texto, mas a técnica. Ele usa RIGOROSAMENTE as metodologias:
   - SPIN Selling (Situação, Problema, Implicação, Necessidade de Solução).
   - BANT (Budget, Authority, Need, Timeline).
   - Gatilhos Mentais de Cialdini (Reciprocidade, Autoridade, Escassez, etc).

## Regras de Interface (UI/UX)
- Design limpo, estilo Dashboard SaaS moderno.
- Visualização de chat estilo WhatsApp para a transcrição.
- Feedback lateral com "cards de insights" (Nota, Ponto Positivo, Ponto Negativo, Sugestão).