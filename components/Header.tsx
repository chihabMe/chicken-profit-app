"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, TrendingUp, Database } from 'lucide-react';
import Link from 'next/link';

export function Header({ dict, lang }: { dict: any, lang: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showSettings, setShowSettings] = useState(false);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    localStorage.setItem('preferredLang', newLang);
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000`;
    
    // Replace current language in pathname
    const newPath = pathname.replace(`/${lang}`, `/${newLang}`);
    router.push(newPath || `/${newLang}`);
  };

  const handleInviteUser = async () => {
    const email = prompt("Enter the email of the user to invite:");
    if (!email) return;
    const res = await fetch('/api/users/invite', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) alert(data.message);
    else alert(data.error);
  };

  const handleChangePassword = async () => {
    const newPassword = prompt("Enter your new password (min 6 characters):");
    if (!newPassword) return;
    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ newPassword })
    });
    if (res.ok) alert("Password changed successfully!");
    else alert("Failed to change password.");
  };

  const isActive = (path: string) => pathname.includes(path);

  return (
    <header className="header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h1>Poultry Farm Pro</h1>
        <p>Advanced metrics, break-even analysis, and market trends</p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
        {/* Language Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{dict.switchLanguage || 'Language'}</span>
          <select 
            value={lang} 
            onChange={handleLanguageChange}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.4rem', borderRadius: '6px', outline: 'none' }}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
          </select>
        </div>
        
        {/* Authentication Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center' }}>
          <div style={{ padding: '0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <img src={session?.user?.image || ''} alt="avatar" style={{width: 24, height: 24, borderRadius: '50%'}} />
            <span style={{ fontSize: '0.9rem' }}>{session?.user?.name}</span>
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="btn"
            >
              ⚙️ Settings
            </button>
            {showSettings && (
              <div className="dropdown-menu">
                <button onClick={handleInviteUser} className="dropdown-item">➕ Invite New User</button>
                <button onClick={handleChangePassword} className="dropdown-item">🔑 Change Password</button>
                <div style={{ borderTop: '1px solid var(--border)', margin: '0.25rem 0' }}></div>
                <button onClick={() => signOut()} className="dropdown-item danger">🚪 Secure Logout</button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs">
          <Link href={`/${lang}/dashboard`} className={`tab-btn ${isActive('dashboard') ? 'active' : ''}`}>
            <LayoutDashboard size={18} /> {dict.dashboard || 'Dashboard'}
          </Link>
          <Link href={`/${lang}/market`} className={`tab-btn ${isActive('market') ? 'active' : ''}`}>
            <TrendingUp size={18} /> {dict.market || 'Market'}
          </Link>
          <Link href={`/${lang}/logger`} className={`tab-btn ${isActive('logger') ? 'active' : ''}`}>
            <Database size={18} /> {dict.logger || 'Logger'}
          </Link>
        </div>
      </div>
    </header>
  );
}
