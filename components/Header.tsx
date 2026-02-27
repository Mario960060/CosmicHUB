'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { NotificationBell } from './NotificationBell';
import { LogOut, Settings, Users } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const navStyle = {
  background: 'none',
  border: 'none',
  color: '#00d9ff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '8px 12px',
  textDecoration: 'none',
} as const;

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [showMenu]);

  if (!user) return null;

  const menuDropdown = showMenu && (
    <div style={{
      position: 'fixed',
      top: `${menuPosition.top}px`,
      right: `${menuPosition.right}px`,
      width: '220px',
      background: 'rgba(21, 27, 46, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0, 217, 255, 0.3)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 0 30px rgba(0, 217, 255, 0.2)',
      zIndex: 99999,
      padding: '8px',
    }}>
      <button 
        onClick={() => { router.push('/settings/profile'); setShowMenu(false); }}
        onMouseEnter={() => setHoveredMenuItem('settings')}
        onMouseLeave={() => setHoveredMenuItem(null)}
        style={{ 
          width: '100%', 
          padding: '12px 16px', 
          background: hoveredMenuItem === 'settings' ? 'rgba(0, 217, 255, 0.1)' : 'none', 
          border: hoveredMenuItem === 'settings' ? '1px solid rgba(0, 217, 255, 0.3)' : '1px solid transparent',
          borderRadius: '8px',
          color: '#00d9ff', 
          textAlign: 'left', 
          cursor: 'pointer', 
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.2s ease',
        }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: hoveredMenuItem === 'settings' ? '0 0 20px rgba(0, 217, 255, 0.4)' : '0 0 10px rgba(0, 217, 255, 0.2)',
          transition: 'all 0.2s ease',
        }}>
          <Settings size={16} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 4px #00d9ff)' }} />
        </div>
        Settings
      </button>
      
      <button 
        onClick={() => { router.push('/team'); setShowMenu(false); }}
        onMouseEnter={() => setHoveredMenuItem('team')}
        onMouseLeave={() => setHoveredMenuItem(null)}
        style={{ 
          width: '100%', 
          padding: '12px 16px', 
          background: hoveredMenuItem === 'team' ? 'rgba(0, 217, 255, 0.1)' : 'none', 
          border: hoveredMenuItem === 'team' ? '1px solid rgba(0, 217, 255, 0.3)' : '1px solid transparent',
          borderRadius: '8px',
          color: '#00d9ff', 
          textAlign: 'left', 
          cursor: 'pointer', 
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.2s ease',
        }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: hoveredMenuItem === 'team' ? '0 0 20px rgba(0, 217, 255, 0.4)' : '0 0 10px rgba(0, 217, 255, 0.2)',
          transition: 'all 0.2s ease',
        }}>
          <Users size={16} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 4px #00d9ff)' }} />
        </div>
        Team
      </button>
      
      <div style={{ borderTop: '1px solid rgba(0, 217, 255, 0.2)', margin: '8px 0' }} />
      
      <button 
        onClick={() => {
          setShowMenu(false);
          signOut();
        }}
        onMouseEnter={() => setHoveredMenuItem('signout')}
        onMouseLeave={() => setHoveredMenuItem(null)}
        style={{ 
          width: '100%', 
          padding: '12px 16px', 
          background: hoveredMenuItem === 'signout' ? 'rgba(239, 68, 68, 0.1)' : 'none', 
          border: hoveredMenuItem === 'signout' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
          borderRadius: '8px',
          color: '#ef4444', 
          textAlign: 'left', 
          cursor: 'pointer', 
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.2s ease',
        }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2), transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: hoveredMenuItem === 'signout' ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 10px rgba(239, 68, 68, 0.2)',
          transition: 'all 0.2s ease',
        }}>
          <LogOut size={16} style={{ color: '#ef4444', filter: 'drop-shadow(0 0 4px #ef4444)' }} />
        </div>
        Sign Out
      </button>
    </div>
  );

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(21, 27, 46, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 217, 255, 0.3)',
        zIndex: 40
      }}>
        <div style={{
          height: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          
          {/* LEWO */}
          <Link href="/dashboard" prefetch
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: '24px' }}>🌌</span>
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#00d9ff', fontWeight: 600 }}>
              Cosmic Hub
            </span>
          </Link>

          {/* PRAWO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            
            {/* Navigation – Link zamiast button+router.push, żeby uniknąć zawieszania przy szybkich klikach */}
            <nav style={{ display: 'flex', gap: '24px' }}>
              <Link href="/dashboard" prefetch style={{ ...navStyle, color: pathname === '/dashboard' ? '#00f0ff' : '#00d9ff' }}>
                Dashboard
              </Link>
              <Link href="/workstation" prefetch style={{ ...navStyle, color: pathname?.startsWith('/workstation') ? '#00f0ff' : '#00d9ff' }}>
                Workstation
              </Link>
              <Link href="/galactic" prefetch style={{ ...navStyle, color: pathname?.startsWith('/galactic') ? '#00f0ff' : '#00d9ff' }}>
                Galactic
              </Link>
              {['project_manager', 'admin'].includes(user.role) && (
                <Link href="/pm/projects" prefetch style={{ ...navStyle, color: pathname?.startsWith('/pm/projects') ? '#00f0ff' : '#00d9ff' }}>
                  Projects
                </Link>
              )}
            </nav>

            {/* Bell */}
            <NotificationBell />
            
            {/* User */}
            <button ref={buttonRef} onClick={() => setShowMenu(!showMenu)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 217, 255, 0.2)',
                border: '2px solid rgba(0, 217, 255, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#00d9ff', fontSize: '14px', fontWeight: 700
              }}>
                {user.full_name.charAt(0)}
              </div>
              <span style={{ color: '#00d9ff', fontSize: '14px', fontWeight: 500 }}>
                {user.full_name}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Portal - renderuje dropdown POZA headerem */}
      {typeof window !== 'undefined' && createPortal(menuDropdown, document.body)}
    </>
  );
}