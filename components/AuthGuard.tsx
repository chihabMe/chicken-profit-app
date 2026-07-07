"use client";
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { Mail, Lock, ShieldCheck } from "lucide-react";

// Growing Chicken Loader Component
function ChickenGrowLoader() {
  const stages = ["🥚", "🐣", "🐥", "🐔", "🐓"];
  const stageNames = [
    "Incubating session...", 
    "Hatching authentication...", 
    "Growing connection...", 
    "Feeding dashboard...", 
    "Flock ready!"
  ];
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % stages.length);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--bg-color)',
      fontFamily: 'var(--font-sans), sans-serif'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        padding: '3rem',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        width: '320px',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '5rem',
          height: '6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'chickenGrowBounce 1.2s infinite ease-in-out',
        }}>
          {stages[stage]}
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Poultry Farm Pro
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', height: '1rem' }} className="animate-pulse">
            {stageNames[stage]}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes chickenGrowBounce {
          0%, 100% { transform: scale(0.9) translateY(0); }
          50% { transform: scale(1.1) translateY(-12px); }
        }
      `}</style>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setAuthError('');
    if (!authEmail || !authPassword) {
      setAuthError("Enter email and password!");
      return;
    }
    setIsLoggingIn(true);
    const res = await signIn('credentials', { 
      email: authEmail, 
      password: authPassword,
      redirect: false
    });
    
    setIsLoggingIn(false);
    if (res?.error) {
      setAuthError("Invalid email or password");
    }
  };

  if (status === "loading") {
    return <ChickenGrowLoader />;
  }

  if (!session) {
    return (
      <div className="auth-container" style={{ fontFamily: 'var(--font-sans), sans-serif' }}>
        <div className="auth-card" style={{ padding: '2.5rem 2rem', maxHeight: '90vh', overflowY: 'auto' }}>
          
          {/* Geometric Custom Chicken Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="84" height="84">
              <defs>
                <linearGradient id="chicken-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#be123c" />
                </linearGradient>
                <linearGradient id="beak-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              {/* Comb */}
              <path d="M 45 15 C 43 8, 51 5, 53 13 C 55 9, 63 9, 61 17 C 62 16, 68 18, 66 25 Z" fill="#be123c" />
              {/* Body */}
              <circle cx="50" cy="55" r="30" fill="url(#chicken-grad)" />
              {/* Head circle cutout overlay */}
              <circle cx="60" cy="40" r="18" fill="url(#chicken-grad)" />
              {/* Eye */}
              <circle cx="68" cy="38" r="3.5" fill="#fff" />
              <circle cx="69" cy="38" r="1.5" fill="#000" />
              {/* Beak */}
              <polygon points="76,36 88,41 76,46" fill="url(#beak-grad)" />
              {/* Wattle */}
              <path d="M 68 46 C 68 53, 75 53, 74 46 Z" fill="#9f1239" />
              {/* Wing */}
              <path d="M 32 58 C 30 50, 48 50, 46 58 C 45 66, 32 66, 32 58 Z" fill="rgba(255,255,255,0.22)" />
              {/* Legs */}
              <line x1="44" y1="84" x2="44" y2="92" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="56" y1="84" x2="56" y2="92" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="44" y1="92" x2="38" y2="92" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
              <line x1="56" y1="92" x2="50" y2="92" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 className="auth-title" style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Poultry Farm Pro</h2>
            <p className="auth-subtitle" style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>Private access only. Please log in.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {authError && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--danger)', 
                padding: '0.8rem', 
                borderRadius: '12px', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                textAlign: 'center', 
                fontSize: '0.9rem', 
                fontWeight: 500 
              }}>
                {authError}
              </div>
            )}
            
            {/* Email Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  placeholder="name@farm.com" 
                  className="input-field" 
                  value={authEmail} 
                  onChange={e => setAuthEmail(e.target.value)} 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="input-field" 
                  value={authPassword} 
                  onChange={e => setAuthPassword(e.target.value)} 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleLogin();
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button 
              onClick={handleLogin} 
              disabled={isLoggingIn}
              className="btn primary" 
              style={{ 
                width: '100%', 
                marginTop: '0.75rem', 
                padding: '0.85rem', 
                fontSize: '1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              {isLoggingIn ? (
                <>Authenticating...</>
              ) : (
                <>
                  <ShieldCheck size={18} /> Secure Login
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
