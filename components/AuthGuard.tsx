"use client";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = async () => {
    setAuthError('');
    if (!authEmail || !authPassword) {
      setAuthError("Enter email and password!");
      return;
    }
    const res = await signIn('credentials', { 
      email: authEmail, 
      password: authPassword,
      redirect: false
    });
    
    if (res?.error) {
      setAuthError("Invalid email or password");
    }
  };

  if (status === "loading") {
    return <div style={{display:'flex', height:'100vh', justifyContent:'center', alignItems:'center', color:'var(--text-muted)'}}>Checking authentication...</div>;
  }

  if (!session) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{textAlign:'center', marginBottom:'1.5rem'}}>
            <h2 className="auth-title">Poultry Farm Pro</h2>
            <p className="auth-subtitle">Private access only. Please log in.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {authError && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.8rem', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '0.95rem', fontWeight: 500 }}>{authError}</div>}
            <input type="email" placeholder="Email" className="input-field" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="input-field" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
            <button onClick={handleLogin} className="btn primary" style={{ width: '100%', marginTop: '0.5rem', padding: '1rem', fontSize: '1.1rem' }}>Secure Login</button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
