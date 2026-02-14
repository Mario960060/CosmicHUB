// CURSOR: Admin-only layout protection

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
