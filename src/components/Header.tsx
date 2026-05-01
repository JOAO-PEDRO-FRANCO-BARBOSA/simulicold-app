'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, User, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUserSimulations } from '@/hooks/useUserSimulations';

interface HeaderProps {
  onExitSimulator?: () => void;
}

export function Header({ onExitSimulator }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { simulations } = useUserSimulations();

  useEffect(() => {
    async function loadData() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const authAvatarUrl = (authData.user.user_metadata?.avatar_url as string | undefined) ?? null;
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', authData.user.id)
          .single();
        setAvatarUrl(profileRow?.avatar_url || authAvatarUrl);
      }
    }
    loadData();

    const refreshInterval = setInterval(loadData, 30000);

    const handleProfileUpdate = (event: Event) => {
      const profileEvent = event as CustomEvent<{ avatar_url?: string }>;
      if (profileEvent.detail?.avatar_url) {
        setAvatarUrl(profileEvent.detail.avatar_url);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  return (
    <header className="flex items-center justify-between p-4 px-6 border-b border-border/50 bg-background relative z-50">
      <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Link href="/">
          <img src="/SIMULICOLD_LOGO.png" alt="Simulicold" className="h-14 sm:h-16 w-auto object-contain block" />
        </Link>
      </div>

      <div className="flex items-center gap-6 text-sm text-foreground/80">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-accent font-semibold">
          <span>🪙</span>
          <span>{simulations ?? 0} simulações restantes</span>
        </div>

        <Link href="/history" className="flex items-center gap-2 hover:text-foreground transition-colors group cursor-pointer">
          <History className="w-5 h-5 group-hover:-rotate-45 transition-transform" />
          <span>Histórico</span>
        </Link>

        {/* Menu de Configurações Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="hover:text-foreground transition-colors p-1 cursor-pointer rounded-full border border-transparent hover:border-border"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border border-border bg-foreground/5 text-foreground/70">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar do usuário" className="h-full w-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </span>
          </button>

          {isMenuOpen && (
            <>
              {/* Overlay fantasma para fechar o modal clickando fora */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />

              {/* Caixa suspensa do menu */}
              <div className="absolute right-0 top-full mt-3 w-48 bg-panel border border-border rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <Link
                  href="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-background/80 transition-colors cursor-pointer text-foreground font-medium"
                >
                  <User className="w-4 h-4 text-accent" />
                  Perfil da Conta
                </Link>

                <div className="h-px w-full bg-border/50 my-1" />

                <Link
                  href="/"
                  onClick={() => {
                    onExitSimulator?.();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer text-foreground font-medium"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Sair do Simulador
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
