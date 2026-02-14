// CURSOR: Galactic layout - authentication check

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function GalacticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
