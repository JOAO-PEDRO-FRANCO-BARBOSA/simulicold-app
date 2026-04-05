'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, UserPlus, LogIn, AlertCircle, CheckCircle, RefreshCw, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);

  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);

  const clearErrors = () => setErrorMsg('');

  // Handler Real do Login via Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  // Handler Real do Cadastro vis Auth
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setRegistrationSuccess(true);
      setLoading(false);
    }
  };

  const handleResendConfirm = async () => {
    if (resendCooldown) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setResendCooldown(true);
      alert('E-mail de confirmação reenviado para ' + email);
      setTimeout(() => setResendCooldown(false), 30000); // 30s cooldown
    }
  };

  const toggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    clearErrors();
    setRegistrationSuccess(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-panel border border-border/80 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        <div className="p-8 sm:p-10">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-background border border-accent/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner shadow-accent/10 transition-colors">
              {registrationSuccess ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : isLogin ? (
                <LogIn className="w-8 h-8 text-accent" />
              ) : (
                <UserPlus className="w-8 h-8 text-accent" />
              )}
            </div>
            <h2 className="text-3xl font-serif font-bold text-foreground text-center">
              {registrationSuccess ? 'Conta Criada!' : isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-foreground/50 text-sm mt-2 text-center">
              {registrationSuccess 
                ? 'Enviamos o link de ativação para você.' 
                : isLogin 
                  ? 'Insira suas credenciais para acessar o simulador.' 
                  : 'Junte-se à plataforma número 1 de treinamento B2B.'}
            </p>
          </div>

          {/* Banner de Erro Global */}
          {errorMsg && !registrationSuccess && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-500">{errorMsg}</p>
            </div>
          )}

          <div className="relative">
            {/* ESTADO DE SUCESSO (CADASTRO CONCLUIDO) */}
            {registrationSuccess ? (
              <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500 text-center">
                <div className="bg-green-500/10 p-5 rounded-2xl border border-green-500/20 w-full mb-2">
                  <p className="text-sm text-green-500 font-medium">E-mail de confirmação enviado para:<br/><strong className="text-foreground">{email}</strong></p>
                </div>
                
                <p className="text-sm text-foreground/60 leading-relaxed px-4">
                  Por favor, verifique sua caixa de entrada ou aba de spam e clique no link para ativar sua conta.
                </p>

                <div className="flex flex-col gap-3 w-full mt-4">
                  <button 
                    onClick={handleResendConfirm}
                    disabled={loading || resendCooldown}
                    className="w-full bg-background border border-border hover:border-foreground/20 text-foreground py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {resendCooldown ? 'Aguarde para reenviar...' : 'Reenviar E-mail'}
                  </button>
                  <button 
                    onClick={() => toggleMode(true)}
                    className="w-full text-foreground/50 hover:text-foreground text-sm font-semibold transition-colors mt-2"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* FORMULÁRIO DE LOGIN */}
                <form 
                  onSubmit={handleLogin}
                  className={`flex flex-col gap-5 transition-all duration-500 ease-in-out ${
                    isLogin ? 'opacity-100 translate-x-0 relative' : 'opacity-0 absolute inset-0 pointer-events-none -translate-x-10'
                  }`}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">E-mail</label>
                      <div className="relative">
                        <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input 
                          type="email" 
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">Senha</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                          required
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
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
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processando...' : 'Entrar'}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                {/* FORMULÁRIO DE CADASTRO */}
                <form 
                  onSubmit={handleRegister}
                  className={`flex flex-col gap-5 transition-all duration-500 ease-in-out ${
                    !isLogin ? 'opacity-100 translate-x-0 relative' : 'opacity-0 absolute inset-0 pointer-events-none translate-x-10'
                  }`}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">E-mail</label>
                      <div className="relative">
                        <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input 
                          type="email" 
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">Senha</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="Mínimo de 8 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                          required
                          minLength={8}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">Confirme a Senha</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input 
                          type={showConfirmPassword ? 'text' : 'password'} 
                          placeholder="Repita sua senha"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30"
                          required
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent hover:bg-yellow-400 text-zinc-950 py-3.5 rounded-xl font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-accent/20 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processando...' : 'Criar Conta'}
                    {!loading && <UserPlus className="w-4 h-4" />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Rodapé Alternador do Modal - Some quando o cadastro da certo */}
        {!registrationSuccess && (
          <div className="bg-background border-t border-border/50 p-6 flex justify-center">
            {isLogin ? (
              <p className="text-sm text-foreground/60">
                Ainda não tem conta?{' '}
                <button 
                  onClick={() => toggleMode(false)}
                  disabled={loading}
                  className="text-accent font-bold hover:underline underline-offset-4 pointer-events-auto cursor-pointer"
                >
                  Cadastre-se aqui
                </button>
              </p>
            ) : (
              <p className="text-sm text-foreground/60">
                Já possui uma conta?{' '}
                <button 
                  onClick={() => toggleMode(true)}
                  disabled={loading}
                  className="text-primary hover:text-primary-hover font-bold hover:underline underline-offset-4 pointer-events-auto cursor-pointer"
                >
                  Faça login
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
