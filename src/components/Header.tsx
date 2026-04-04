'use client';

import { useState } from 'react';
import Link from 'next/link';
import { History, Settings, PhoneForwarded, User, LogOut } from 'lucide-react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between p-4 px-6 border-b border-border/50 bg-background relative z-50">
      <div className="flex items-center gap-2">
        <div className="bg-primary/20 p-2 rounded-lg">
          <PhoneForwarded className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold tracking-wider text-foreground">SIMULADOR B2B</h1>
      </div>
      
      <div className="flex items-center gap-6 text-sm text-foreground/80">
        <button className="flex items-center gap-2 hover:text-foreground transition-colors group cursor-pointer">
          <History className="w-5 h-5 group-hover:-rotate-45 transition-transform" />
          <span>Histórico</span>
        </button>
        
        {/* Menu de Configurações Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="hover:text-foreground transition-colors p-1 cursor-pointer"
          >
            <Settings className="w-5 h-5" />
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
                  onClick={() => setIsMenuOpen(false)}
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
