import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Home, MessageSquare, BookOpen, Swords, Users, LogIn, LogOut } from "lucide-react";
import schollyLogo from "@/assets/scholly-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/lib/profile";
import { UserAvatar } from "@/components/UserAvatar";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/tutor", label: "Tutor", icon: MessageSquare },
  { to: "/community", label: "Community", icon: Users },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/versus", label: "Versus", icon: Swords },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useMyProfile();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    if (menuOpen) window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 gap-2">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={schollyLogo} alt="Scholly AI logo" className="h-10 w-10 rounded-xl object-contain bg-white" />
            <div className="leading-tight">
              <div className="font-display text-lg font-bold">
                Scholly<span className="text-gradient-gold">AI</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">WAEC companion</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || (to !== "/" && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>

          {user ? (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-secondary"
                aria-label="Open account menu"
              >
                <UserAvatar avatarId={profile?.avatar_id ?? 1} name={profile?.display_name} size={32} />
                <span className="hidden sm:inline text-xs font-semibold max-w-[100px] truncate">
                  {profile?.display_name ?? "Scholar"}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl glass border border-border p-1 z-50">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                    onClick={() => setMenuOpen(false)}
                  >
                    <UserAvatar avatarId={profile?.avatar_id ?? 1} size={20} /> Profile
                  </Link>
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary text-left"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform"
            >
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <nav className="md:hidden sticky bottom-0 z-40 glass border-t">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="hidden md:block py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Scholly.AI · Built for West African scholars
      </footer>

      {/* Suppress unused import warning */}
      <span className="hidden"><Sparkles /></span>
    </div>
  );
}
