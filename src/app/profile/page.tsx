'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { User, Mail, ChevronLeft, CreditCard, Shield, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const [profile, setProfile] = useState<{ fullName: string, email: string, subStatus: string, avatarUrl: string, productContext: string } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      // 1. Pegar o usuário logado no Auth
      const { data: authData } = await supabase.auth.getUser();
      
      if (authData?.user) {
        // 2. Com o user.id, puxar os metadados e os campos da tabela public.profiles
        const { data: profileRow, error } = await supabase
          .from('profiles')
          .select('full_name, subscription_status, avatar_url, product_context')
          .eq('id', authData.user.id)
          .single();

        if (error) {
          console.error('Erro ao carregar perfil:', error);
        }

        setProfile({
          email: authData.user.email || 'Não encontrado',
          fullName: profileRow?.full_name || 'Vendedor Autenticado',
          subStatus: profileRow?.subscription_status === 'pro' ? 'PRO' : 'FREE',
          avatarUrl: profileRow?.avatar_url || '',
          productContext: profileRow?.product_context || ''
        });
        if (profileRow?.avatar_url) {
          setAvatarPreview(profileRow.avatar_url);
        }
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSuccessMsg("");

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setSaving(false);
      return;
    }

    let updatedAvatarUrl = profile.avatarUrl;

    if (avatarFile) {
      const filePath = `${authData.user.id}/avatar.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        updatedAvatarUrl = publicUrlData.publicUrl + '?t=' + Date.now(); // Cache busting para atualizar imagem via mesma url
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: profile.fullName,
        avatar_url: updatedAvatarUrl,
        product_context: profile.productContext,
      }, {
        onConflict: 'id',
      });

    if (!updateError) {
      setSuccessMsg("Perfil salvo com sucesso!");
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatar_url: updatedAvatarUrl } }));
      setTimeout(() => setSuccessMsg(""), 3000);
    }
    
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
        <Link href="/dashboard" className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors mb-8 w-max cursor-pointer">
           <ChevronLeft className="w-5 h-5" />
           <span className="font-semibold text-sm">Voltar para o Dashboard</span>
        </Link>
        
        <h1 className="text-3xl font-bold font-serif mb-8 text-foreground tracking-wide">Minha Conta</h1>
        
        {loading ? (
          <div className="bg-panel border border-border p-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 mt-4 shadow-sm min-h-[300px]">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="text-foreground/60 text-sm font-semibold">Carregando perfil...</p>
          </div>
        ) : (
          <div className="bg-panel border border-border p-8 rounded-[2rem] flex flex-col md:flex-row items-center md:items-start gap-8 mt-4 shadow-sm relative overflow-hidden">
             
             <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

             <div className="w-28 h-28 bg-background rounded-full flex items-center justify-center border border-accent/30 shadow-inner shadow-accent/10 shrink-0 relative overflow-hidden group">
                 {avatarPreview ? (
                   <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   <User className="w-12 h-12 text-accent" />
                 )}
                 <label className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer z-20">
                   <span className="text-xs font-semibold">Alterar</span>
                   <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         setAvatarFile(file);
                         setAvatarPreview(URL.createObjectURL(file));
                       }
                     }} 
                   />
                 </label>
             </div>
             
             <div className="flex flex-col justify-center items-center md:items-start flex-1 mt-2 z-10 w-full">
                <input 
                  type="text" 
                  value={profile?.fullName || ''}
                  onChange={(e) => setProfile(p => p ? {...p, fullName: e.target.value} : null)}
                  className="text-2xl font-bold text-foreground bg-transparent border-b border-border/50 focus:border-accent outline-none text-center md:text-left transition-colors pb-1 w-full max-w-sm"
                  placeholder="Seu Nome Completo"
                />
                <p className="flex items-center gap-2 text-foreground/60 mt-2 font-mono text-sm">
                   <Mail className="w-4 h-4" /> {profile?.email}
                </p>
                <div className="w-full mt-5">
                  <label className="block text-sm font-semibold text-foreground/80 mb-2">
                    Contexto do Produto/Serviço
                  </label>
                  <textarea
                    value={profile?.productContext || ''}
                    onChange={(e) => setProfile(p => p ? { ...p, productContext: e.target.value } : null)}
                    placeholder="Ex: Vendo um software de gestão para clínicas médicas. O ticket médio é R$ 500/mês. As principais objeções são preço e tempo de implantação..."
                    className="w-full min-h-[140px] rounded-xl border border-border bg-background/70 text-foreground placeholder:text-foreground/40 p-4 outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/30 transition-colors resize-y"
                  />
                </div>
                <div className="mt-4 w-full flex justify-center md:justify-start">
                   <div className="flex items-center gap-4">
                     <button 
                       onClick={handleSave} 
                       disabled={saving}
                       aria-busy={saving}
                       className="bg-accent text-accent-foreground font-bold py-2 px-6 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                       {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                       {saving ? 'Salvando...' : 'Salvar Alterações'}
                     </button>
                     {successMsg && <span className="text-green-500 text-sm font-medium animate-in fade-in">{successMsg}</span>}
                   </div>
                </div>
                
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full relative z-10">
                  <div className="bg-background border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                    <Award className="w-5 h-5 text-accent mb-1" />
                    <span className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Simulações</span>
                    <span className="text-xl font-black">-</span>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                    <Shield className="w-5 h-5 text-accent mb-1" />
                    <span className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Plano</span>
                    <span className={`text-lg font-black ${profile?.subStatus === 'PRO' ? 'text-accent' : 'text-foreground'}`}>
                      {profile?.subStatus}
                    </span>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                    <CreditCard className="w-5 h-5 text-foreground mb-1" />
                    <span className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Faturamento</span>
                    <span className="text-sm font-semibold">Em breve</span>
                  </div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
