'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);

  // Redireciona o usuário para o dashboard após submeter qualquer coisa (somente para testes)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      
      {/* Decoração de fundo sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Container Principal de Autenticação */}
      <div className="w-full max-w-md bg-panel border border-border/80 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        
        <div className="p-8 sm:p-10">
          {/* Logo / Header do Form */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-background border border-accent/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner shadow-accent/10">
              {isLogin ? (
                <LogIn className="w-8 h-8 text-accent" />
              ) : (
                <UserPlus className="w-8 h-8 text-accent" />
              )}
            </div>
            <h2 className="text-3xl font-serif font-bold text-foreground">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-foreground/50 text-sm mt-2 text-center">
              {isLogin 
                ? 'Insira suas credenciais para acessar o simulador.' 
                : 'Junte-se à plataforma número 1 de treinamento B2B.'}
            </p>
          </div>

          {/* Wrapper que anima a troca dos forms usando CSS simples e animate-in */}
          <div className="relative">
            <form 
              onSubmit={handleSubmit}
              className={`flex flex-col gap-5 transition-all duration-500 ease-in-out ${
                isLogin ? 'opacity-100 translate-x-0 relative' : 'opacity-0 absolute inset-0 pointer-events-none -translate-x-10'
              }`}
            >
              <div className="space-y-4">
                {/* Campo Email */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                    <input 
                      type="email" 
                      placeholder="seu@email.com"
                      className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                      required
                    />
                  </div>
                </div>

                {/* Campo Senha */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">Senha</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                      required
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button type="button" className="text-xs text-accent/80 hover:text-accent font-semibold transition-colors cursor-pointer">
                      Esqueci minha senha
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                Entrar
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>


            <form 
              onSubmit={handleSubmit}
              className={`flex flex-col gap-5 transition-all duration-500 ease-in-out ${
                !isLogin ? 'opacity-100 translate-x-0 relative' : 'opacity-0 absolute inset-0 pointer-events-none translate-x-10'
              }`}
            >
              <div className="space-y-4">
                {/* Campo Email (Cadastro) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                    <input 
                      type="email" 
                      placeholder="seu@email.com"
                      className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                      required
                    />
                  </div>
                </div>

                {/* Campo Senha (Cadastro) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">Senha</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                    <input 
                      type="password" 
                      placeholder="Mínimo de 8 caracteres"
                      className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                      required
                    />
                  </div>
                </div>

                {/* Campo Confirmação (Cadastro) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">Confirme a Senha</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                    <input 
                      type="password" 
                      placeholder="Repita sua senha"
                      className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                      required
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-accent hover:bg-yellow-400 text-zinc-950 py-3.5 rounded-xl font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-accent/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                Criar Conta
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Rodapé Alternador do Modal */}
        <div className="bg-background border-t border-border/50 p-6 flex justify-center">
          {isLogin ? (
            <p className="text-sm text-foreground/60">
              Ainda não tem conta?{' '}
              <button 
                onClick={() => setIsLogin(false)}
                className="text-accent font-bold hover:underline underline-offset-4 pointer-events-auto cursor-pointer"
              >
                Cadastre-se aqui
              </button>
            </p>
          ) : (
            <p className="text-sm text-foreground/60">
              Já possui uma conta?{' '}
              <button 
                onClick={() => setIsLogin(true)}
                className="text-primary hover:text-primary-hover font-bold hover:underline underline-offset-4 pointer-events-auto cursor-pointer"
              >
                Faça login
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
