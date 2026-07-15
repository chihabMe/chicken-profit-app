"use client";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import { Mail, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

function ChickenLogo({ size = 84 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="chicken-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="beak-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M 45 15 C 43 8, 51 5, 53 13 C 55 9, 63 9, 61 17 C 62 16, 68 18, 66 25 Z" fill="#f43f5e" />
      <circle cx="50" cy="55" r="30" fill="url(#chicken-grad)" />
      <circle cx="60" cy="40" r="18" fill="url(#chicken-grad)" />
      <circle cx="68" cy="38" r="3.5" fill="#fff" />
      <circle cx="69" cy="38" r="1.5" fill="#000" />
      <polygon points="76,36 88,41 76,46" fill="url(#beak-grad)" />
      <path d="M 68 46 C 68 53, 75 53, 74 46 Z" fill="#f43f5e" />
      <path d="M 32 58 C 30 50, 48 50, 46 58 C 45 66, 32 66, 32 58 Z" fill="rgba(255,255,255,0.22)" />
      <line x1="44" y1="84" x2="44" y2="92" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="56" y1="84" x2="56" y2="92" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="44" y1="92" x2="38" y2="92" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
      <line x1="56" y1="92" x2="50" y2="92" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-80 items-center gap-6 py-10 shadow-lg">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <div className="animate-pulse">
            <ChickenLogo size={72} />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">Poultry Farm Pro</div>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Loading your session...
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm gap-6 py-10 shadow-lg">
          <CardHeader className="flex flex-col items-center gap-4 text-center">
            <ChickenLogo />
            <div>
              <h2 className="text-2xl font-extrabold text-foreground">Poultry Farm Pro</h2>
              <p className="mt-1 text-sm text-muted-foreground">Private access only. Please log in.</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {authError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-sm font-medium text-destructive">
                  {authError}
                </div>
              )}

              <div className="flex flex-col gap-1.5 text-left">
                <Label htmlFor="auth-email" className="text-xs font-semibold uppercase text-muted-foreground">Email Address</Label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="name@farm.com"
                    className="pl-9"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <Label htmlFor="auth-password" className="text-xs font-semibold uppercase text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoggingIn} className="mt-1 w-full gap-2">
                {isLoggingIn ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Authenticating...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} /> Secure Login
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
