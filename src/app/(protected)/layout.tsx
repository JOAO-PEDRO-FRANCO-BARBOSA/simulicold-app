import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SimulationsUpsellModal } from '@/components/SimulationsUpsellModal';

const DEV_BYPASS_EMAIL = 'francojoao512@gmail.com';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Layouts Server Components can't set cookies natively this way easily without breaking SSR,
          // Middleware already refreshed the token in its step, so this is safe.
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: simulations } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasCredits = (simulations?.balance ?? 0) > 0 || user.email?.toLowerCase() === DEV_BYPASS_EMAIL;

  return (
    <>
      {children}
      {!hasCredits && (
        <SimulationsUpsellModal
          isOpen
          message="Você está sem créditos. Compre um novo pacote para continuar usando a plataforma."
        />
      )}
    </>
  );
}
