'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { User, Mail, ChevronLeft, CreditCard, Shield, Award } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
        <Link href="/dashboard" className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors mb-8 w-max cursor-pointer">
           <ChevronLeft className="w-5 h-5" />
           <span className="font-semibold text-sm">Voltar para o Dashboard</span>
        </Link>
        
        <h1 className="text-3xl font-bold font-serif mb-8 text-foreground tracking-wide">Minha Conta</h1>
        
        {/* Card Principal de Perfil */}
        <div className="bg-panel border border-border p-8 rounded-[2rem] flex flex-col md:flex-row items-center md:items-start gap-8 mt-4 shadow-sm relative overflow-hidden">
           
           <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

           <div className="w-28 h-28 bg-background rounded-full flex items-center justify-center border border-accent/30 shadow-inner shadow-accent/10 shrink-0">
               <User className="w-12 h-12 text-accent" />
           </div>
           
           <div className="flex flex-col justify-center items-center md:items-start flex-1 mt-2">
              <h2 className="text-2xl font-bold text-foreground">Vendedor Teste</h2>
              <p className="flex items-center gap-2 text-foreground/60 mt-2 font-mono text-sm">
                 <Mail className="w-4 h-4" /> sdr@startup.com.br
              </p>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <div className="bg-background border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                  <Award className="w-5 h-5 text-accent mb-1" />
                  <span className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Simulações</span>
                  <span className="text-xl font-black">12</span>
                </div>
                <div className="bg-background border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                  <Shield className="w-5 h-5 text-accent mb-1" />
                  <span className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Plano</span>
                  <span className="text-lg font-black text-accent">PRO</span>
                </div>
                <div className="bg-background border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                  <CreditCard className="w-5 h-5 text-foreground mb-1" />
                  <span className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Faturamento</span>
                  <span className="text-sm font-semibold">Em breve</span>
                </div>
              </div>

           </div>
        </div>
      </main>
    </div>
  );
}
