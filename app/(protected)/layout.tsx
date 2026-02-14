import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import './galactic/styles/cosmic-objects.css';
import { Header } from '@/components/Header';
import { CommandPalette } from '@/components/CommandPalette';
import { LastSeenProvider } from '@/components/LastSeenProvider';
import { CommsBeaconClient } from '@/components/CommsBeacon/CommsBeaconClient';

export default async function ProtectedLayout({
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

  return (
    <>
      <LastSeenProvider />
      <Header />
      <main className="pt-16 min-h-screen bg-background">{children}</main>
      <CommandPalette />
      <CommsBeaconClient />
      <div id="modal-root" />
    </>
  );
}
