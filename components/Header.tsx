"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, TrendingUp, Settings2, UserPlus,
  KeyRound, LogOut, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "./ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "./ui/dialog";
import { toast } from "sonner";

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/market', label: 'Market', icon: TrendingUp },
];

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();

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
      <header className="print:hidden flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
            Poultry Farm Pro
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Advanced metrics, break-even analysis, and market trends</p>
        </div>

        <div className="flex flex-col gap-3 items-end">
          {session && (
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-2 py-1.5 shadow-xs">
              <div className="flex items-center gap-2 px-1.5">
                <Avatar size="sm">
                  <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? "User"} />
                  <AvatarFallback className="text-[10px] font-bold uppercase bg-primary/15 text-primary">
                    {session.user?.name?.slice(0, 2) || 'US'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-foreground/90">{session.user?.name}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 pr-1.5 rounded-lg text-xs font-medium"
                    />
                  }
                >
                  <Settings2 size={13} /> Settings <ChevronDown size={12} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setIsInviteOpen(true)}>
                    <UserPlus size={14} className="text-muted-foreground" /> Invite New User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsPasswordOpen(true)}>
                    <KeyRound size={14} className="text-muted-foreground" /> Change Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                    <LogOut size={14} /> Secure Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <nav className="inline-flex gap-1 bg-muted p-1 rounded-xl border border-border">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive(href)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <Icon size={16} /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="text-primary" size={18} /> Invite New User
            </DialogTitle>
            <DialogDescription>
              An email invitation will register this account securely for flock management.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="text-primary" size={18} /> Change Password
            </DialogTitle>
            <DialogDescription>
              Please specify a strong password containing letters and numbers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Updating...' : 'Change Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
