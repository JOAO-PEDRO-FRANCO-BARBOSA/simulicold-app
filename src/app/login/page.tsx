'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, UserPlus, AlertCircle, RefreshCw, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DEV_BYPASS_EMAIL = 'francojoao512@gmail.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLogin, setIsLogin] = useState(() => {
    return !searchParams.has('register');
  });
  const [isRecovering, setIsRecovering] = useState(false);

  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');
  const [registerEmailError, setRegisterEmailError] = useState('');
  const [registerPasswordError, setRegisterPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);

  const isEmailVerified = searchParams.get('verified') === 'true';
  const paymentSuccess = searchParams.get('payment') === 'success';

  const clearAllErrors = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoginEmailError('');
    setLoginPasswordError('');
    setRegisterEmailError('');
    setRegisterPasswordError('');
    setConfirmPasswordError('');
  };

  const validateEmail = (rawEmail: string): string | null => {
    const normalizedEmail = rawEmail.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return 'Digite um e-mail valido antes de continuar.';
    }

    return null;
  };

  const validateStrongPassword = (rawPassword: string): string | null => {
    if (!STRONG_PASSWORD_REGEX.test(rawPassword)) {
      return 'A senha deve ter no minimo 8 caracteres, com letras e numeros.';
    }

    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  const checkSubscriptionAndCredits = async (userId: string): Promise<{ hasSubscription: boolean; hasCredits: boolean }> => {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subscription) return { hasSubscription: false, hasCredits: false };

    const isAuthorized = subscription.status === 'authorized' || subscription.status === 'active';
    const isValidPeriod = subscription.current_period_end
      ? new Date(subscription.current_period_end) > new Date()
      : false;

    if (!isAuthorized || !isValidPeriod) {
      return { hasSubscription: false, hasCredits: false };
    }

    const { data: creditRow } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      hasSubscription: true,
      hasCredits: (creditRow?.balance ?? 0) > 0,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLER: LOGIN
  // ─────────────────────────────────────────────────────────────────────────────
  // Fluxo pós-login:
  //   1. signInWithPassword
  //   2. Consultar tabela `subscriptions`
  //   3. Se VÁLIDA → /dashboard
  //   4. Se INVÁLIDA → /checkout
  // ─────────────────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAllErrors();

    const emailValidationError = validateEmail(email);
    let hasValidationError = false;

    if (emailValidationError) {
      setLoginEmailError(emailValidationError);
      hasValidationError = true;
    }

    if (!password) {
      setLoginPasswordError('Digite sua senha para continuar.');
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    // Passo 1: Autenticar
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // Passo 2: Obter dados do usuário
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Fallback improvável — login ok mas getUser falhou
      setErrorMsg('Erro ao recuperar dados do usuário.');
      setLoading(false);
      return;
    }

    if (user.email?.toLowerCase() === DEV_BYPASS_EMAIL) {
      router.push('/dashboard');
      return;
    }

    // Passo A: Checar assinatura
    const accessStatus = await checkSubscriptionAndCredits(user.id);

    // Passo B: Se VÁLIDA → Dashboard
    if (accessStatus.hasSubscription && accessStatus.hasCredits) {
      router.push('/dashboard');
      return;
    }

    if (accessStatus.hasSubscription && !accessStatus.hasCredits) {
      router.push('/checkout-addon');
      return;
    }

    // Passo C: Se INVÁLIDA / INEXISTENTE
    // Sempre vai para o checkout para escolher o plano sem cair na landing.
    router.push('/checkout');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLER: CADASTRO
  // ─────────────────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAllErrors();

    const emailValidationError = validateEmail(email);
    const passwordValidationError = validateStrongPassword(password);
    let hasValidationError = false;

    if (emailValidationError) {
      setRegisterEmailError(emailValidationError);
      hasValidationError = true;
    }

    if (passwordValidationError) {
      setRegisterPasswordError(passwordValidationError);
      hasValidationError = true;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('As senhas digitadas não coincidem.');
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    setLoading(true);

    const redirectUrl = new URL(`${window.location.origin}/auth/callback`);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const checkEmailResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!checkEmailResponse.ok) {
        setErrorMsg('Nao foi possivel validar seu e-mail agora. Tente novamente.');
        return;
      }

      const checkEmailData = (await checkEmailResponse.json()) as { exists?: boolean };

      if (checkEmailData.exists) {
        setRegisterEmailError('Este e-mail já está registrado. Por favor, faça o login.');
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl.toString(),
        },
      });

      if (error) {
        console.error('[REGISTER] Erro ao criar conta:', error);
        const errorMessage = error.message || 'Erro inesperado ao criar conta.';

        if (
          errorMessage.toLowerCase().includes('email') ||
          errorMessage.toLowerCase().includes('e-mail') ||
          errorMessage.toLowerCase().includes('already') ||
          errorMessage.toLowerCase().includes('exists')
        ) {
          setRegisterEmailError(errorMessage);
        } else {
          setErrorMsg(errorMessage);
        }

        setLoading(false);
        return;
      }

      setEmail(normalizedEmail);
      setRegistrationSuccess(true);
    } catch (error) {
      console.error('[REGISTER] Excecao inesperada no cadastro:', error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao criar conta. Verifique sua conexao e tente novamente.'
      );
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirm = async () => {
    if (resendCooldown) return;

    setSuccessMsg('');
    setErrorMsg('');

    if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
      setRegisterEmailError('Digite um e-mail valido antes de reenviar a confirmacao.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setResendCooldown(true);
      setSuccessMsg(`E-mail de confirmacao reenviado para ${email.trim().toLowerCase()}.`);
      setTimeout(() => setResendCooldown(false), 30000); // 30s cooldown
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAllErrors();

    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setLoginEmailError(emailValidationError);
      return;
    }

    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccessMsg('Se este e-mail estiver cadastrado, você receberá um link em instantes.');
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel enviar o link de recuperacao agora. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setIsRecovering(false);
    clearAllErrors();
    setRegistrationSuccess(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-panel border border-border/80 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        <div className="p-8 sm:p-10">
          
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6 flex justify-center">
              <img src="/SIMULICOLD_LOGO.png" alt="Simulicold" className="h-20 sm:h-24 w-auto object-contain" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-foreground text-center">
              {registrationSuccess
                ? 'Conta Criada!'
                : isRecovering
                  ? 'Recuperar Senha'
                  : isLogin
                    ? 'Bem-vindo!'
                    : 'Crie sua conta'}
            </h2>
            <p className="text-foreground/50 text-sm mt-2 text-center">
              {registrationSuccess 
                ? 'Verifique seu e-mail para confirmar a conta.' 
                : isRecovering
                  ? 'Informe seu e-mail para receber o link de recuperacao.'
                : isLogin 
                  ? 'Insira suas credenciais para acessar o simulador.' 
                  : 'Junte-se à plataforma número 1 de treinamento B2B.'}
            </p>
            {(isEmailVerified || paymentSuccess) && !registrationSuccess && (
              <div className="mt-4 w-full rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                {isEmailVerified
                  ? 'E-mail confirmado com sucesso. Faça login para continuar.'
                  : 'Pagamento detectado. Faça login novamente para sincronizar sua assinatura.'}
              </div>
            )}
          </div>

          {/* Banner de Erro Global */}
          {errorMsg && !registrationSuccess && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-500">{errorMsg}</p>
            </div>
          )}

          {successMsg && !registrationSuccess && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-sm font-medium text-green-400">{successMsg}</p>
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
                    isLogin && !isRecovering
                      ? 'opacity-100 translate-x-0 relative'
                      : 'opacity-0 absolute inset-0 pointer-events-none -translate-x-10'
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
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setLoginEmailError('');
                          }}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30 autofill:shadow-[inset_0_0_0_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]"
                          required
                        />
                      </div>
                      {loginEmailError && <p className="text-red-500 text-sm mt-1">{loginEmailError}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">Senha</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setLoginPasswordError('');
                          }}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30 autofill:shadow-[inset_0_0_0_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]"
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
                      {loginPasswordError && <p className="text-red-500 text-sm mt-1">{loginPasswordError}</p>}
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRecovering(true);
                            clearAllErrors();
                            setLoginPasswordError('');
                          }}
                          className="text-xs text-accent/80 hover:text-accent font-semibold transition-colors cursor-pointer"
                        >
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

                {/* FORMULÁRIO DE RECUPERAÇÃO */}
                <form
                  onSubmit={handlePasswordRecovery}
                  className={`flex flex-col gap-5 transition-all duration-500 ease-in-out ${
                    isRecovering
                      ? 'opacity-100 translate-x-0 relative'
                      : 'opacity-0 absolute inset-0 pointer-events-none -translate-x-10'
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
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setLoginEmailError('');
                          }}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30 autofill:shadow-[inset_0_0_0_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]"
                          required
                        />
                      </div>
                      {loginEmailError && <p className="text-red-500 text-sm mt-1">{loginEmailError}</p>}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                {/* FORMULÁRIO DE CADASTRO */}
                <form 
                  onSubmit={handleRegister}
                  className={`flex flex-col gap-5 transition-all duration-500 ease-in-out ${
                    !isLogin && !isRecovering
                      ? 'opacity-100 translate-x-0 relative'
                      : 'opacity-0 absolute inset-0 pointer-events-none translate-x-10'
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
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setRegisterEmailError('');
                          }}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30 autofill:shadow-[inset_0_0_0_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]"
                          required
                        />
                      </div>
                      {registerEmailError && <p className="text-red-500 text-sm mt-1">{registerEmailError}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">Senha</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="Mínimo de 8 caracteres"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setRegisterPasswordError('');
                          }}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30 autofill:shadow-[inset_0_0_0_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]"
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
                      {registerPasswordError && <p className="text-red-500 text-sm mt-1">{registerPasswordError}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block ml-1">Confirme a Senha</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input 
                          type={showConfirmPassword ? 'text' : 'password'} 
                          placeholder="Repita sua senha"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setConfirmPasswordError('');
                          }}
                          className="w-full bg-background border border-border/60 text-foreground text-sm rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-foreground/30 autofill:shadow-[inset_0_0_0_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]"
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
                      {confirmPasswordError && <p className="text-red-500 text-sm mt-1">{confirmPasswordError}</p>}
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
            {isRecovering ? (
              <p className="text-sm text-foreground/60">
                Lembrou sua senha?{' '}
                <button
                  onClick={() => {
                    setIsRecovering(false);
                    setIsLogin(true);
                    clearAllErrors();
                  }}
                  disabled={loading}
                  className="text-primary hover:text-primary-hover font-bold hover:underline underline-offset-4 pointer-events-auto cursor-pointer"
                >
                  Voltar para o login
                </button>
              </p>
            ) : isLogin ? (
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

      {/* CONSELT Logo no canto inferior direito */}
      <a 
        href="https://www.conselt.com.br" 
        target="_blank" 
        rel="noreferrer" 
        className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 z-20 group hover:opacity-80 transition-opacity"
      >
        <img 
          src="/CONSELT_LOGO.png" 
          alt="CONSELT" 
          className="h-16 sm:h-24 w-auto object-contain drop-shadow-xl" 
        />
      </a>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
      <AuthContent />
    </Suspense>
  );
}
