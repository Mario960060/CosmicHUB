// CURSOR: PM layout - ensures user is PM or Admin

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  console.log('🔐 [PM LAYOUT] User:', authUser?.id, authUser?.email);

  if (!authUser) {
    console.log('❌ [PM LAYOUT] No user, redirecting to login');
    redirect('/login');
  }

  // Get user role
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  console.log('👤 [PM LAYOUT] User role:', user?.role);

  // Only PM and Admin can access
  if (!user || !['project_manager', 'admin'].includes(user.role)) {
    console.log('⛔ [PM LAYOUT] Access denied, role:', user?.role, '- redirecting to workstation');
    redirect('/workstation');
  }

  console.log('✅ [PM LAYOUT] Access granted');

  return <>{children}</>;
}
