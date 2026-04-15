import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function PasswordResetSuccessPage() {
  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.12),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f1523] border border-blue-900/30 rounded-3xl shadow-2xl relative z-10 p-8 sm:p-10 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-16 h-16 text-blue-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Senha atualizada com sucesso!</h1>
        <p className="text-slate-400 mb-8">
          Agora você já pode acessar sua conta com a nova senha.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold transition-colors"
        >
          Fazer Login
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
