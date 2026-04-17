import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

  if (user.email?.toLowerCase() !== DEV_BYPASS_EMAIL) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAuthorized =
      subscription?.status === 'authorized' || subscription?.status === 'active';
    let isValidPeriod = false;

    if (subscription?.current_period_end) {
      isValidPeriod = new Date(subscription.current_period_end) > new Date();
    }

    if (!subscription || !isAuthorized || !isValidPeriod) {
      redirect('/checkout');
    }
  }

  const { data: simulations } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if ((simulations?.balance ?? 0) <= 0) {
    redirect('/checkout-addon');
  }

  return <>{children}</>;
}
