"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, TrendingUp, Settings2, UserPlus, 
  KeyRound, LogOut, ChevronDown, X 
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Settings Dropdown State
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom Dialog Modals State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    setIsInviting(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: inviteEmail })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Invitation sent successfully!");
        setInviteEmail('');
        setIsInviteOpen(false);
      } else {
        toast.error(data.error || "Failed to send invitation");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        toast.success("Password changed successfully!");
        setNewPassword('');
        setIsPasswordOpen(false);
      } else {
        toast.error("Failed to change password.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isActive = (path: string) => pathname.includes(path);

  return (
    <>
      <header className="header no-print" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Poultry Farm Pro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Advanced metrics, break-even analysis, and market trends</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
          {/* Authentication & Settings Menu */}
          {session && (
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.35rem 0.5rem', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center' }}>
              <div style={{ padding: '0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                {session.user?.image ? (
                  <img src={session.user.image} alt="avatar" style={{width: 24, height: 24, borderRadius: '50%'}} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                    {session.user?.name?.slice(0, 2) || 'US'}
                  </div>
                )}
                <span className="text-xs font-semibold text-foreground/90">{session.user?.name}</span>
              </div>

              <div style={{ position: 'relative' }}>
                <Button 
                  onClick={() => setShowSettings(!showSettings)}
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 pr-1.5 border-border hover:bg-accent font-medium text-xs rounded-lg cursor-pointer"
                >
                  <Settings2 size={13} /> Settings <ChevronDown size={12} className={`transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} />
                </Button>
                
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl p-1 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                    <button 
                      onClick={() => { setIsInviteOpen(true); setShowSettings(false); }} 
                      className="w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-accent text-left transition-colors cursor-pointer"
                    >
                      <UserPlus size={14} className="mr-2.5 text-muted-foreground" /> Invite New User
                    </button>
                    <button 
                      onClick={() => { setIsPasswordOpen(true); setShowSettings(false); }} 
                      className="w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-accent text-left transition-colors cursor-pointer"
                    >
                      <KeyRound size={14} className="mr-2.5 text-muted-foreground" /> Change Password
                    </button>
                    <div className="border-t border-border my-1"></div>
                    <button 
                      onClick={() => { signOut(); setShowSettings(false); }} 
                      className="w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg text-destructive hover:bg-destructive/10 text-left transition-colors cursor-pointer"
                    >
                      <LogOut size={14} className="mr-2.5 text-destructive/80" /> Secure Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="tabs">
            <Link href="/dashboard" className={`tab-btn ${isActive('dashboard') ? 'active' : ''}`}>
              <LayoutDashboard size={16} /> Dashboard
            </Link>
            <Link href="/market" className={`tab-btn ${isActive('market') ? 'active' : ''}`}>
              <TrendingUp size={16} /> Market
            </Link>
          </div>
        </div>
      </header>

      {/* Invite User Dialog Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="w-full max-w-md p-6 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <UserPlus className="text-primary" size={20} /> Invite New User
              </h3>
              <button 
                onClick={() => setIsInviteOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-accent transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleInviteUser}>
              <div className="flex flex-col gap-1.5 mb-6">
                <Label htmlFor="invite-email" className="text-xs font-semibold text-muted-foreground uppercase">Email Address</Label>
                <Input 
                  id="invite-email" 
                  type="email"
                  placeholder="partner@farm.com" 
                  value={inviteEmail} 
                  onChange={e => setInviteEmail(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  An email invitation will register this account securely for flock management.
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isInviting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {isInviting ? 'Inviting...' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Dialog Modal */}
      {isPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="w-full max-w-md p-6 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <KeyRound className="text-primary" size={20} /> Change Password
              </h3>
              <button 
                onClick={() => setIsPasswordOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-accent transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword}>
              <div className="flex flex-col gap-1.5 mb-6">
                <Label htmlFor="new-password" className="text-xs font-semibold text-muted-foreground uppercase">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password"
                  placeholder="Min 6 characters" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  autoFocus
                  required
                  minLength={6}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Please specify a strong password containing letters and numbers.
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsPasswordOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {isChangingPassword ? 'Updating...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
