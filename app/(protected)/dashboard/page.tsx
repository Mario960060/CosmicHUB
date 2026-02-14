// CURSOR: Role-based dashboard redirect

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user role
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (!user) {
    redirect('/login');
  }

  // Redirect based on role
  switch (user.role) {
    case 'worker':
      redirect('/dashboard/worker');
    case 'project_manager':
      redirect('/dashboard/pm');
    case 'client':
      redirect('/dashboard/client');
    case 'admin':
      redirect('/dashboard/admin');
    default:
      redirect('/workstation');
  }
}
