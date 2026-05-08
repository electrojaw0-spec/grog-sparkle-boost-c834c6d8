import { Link, useLocation } from "@tanstack/react-router";
import { Sparkles, Home, MessageSquare, BookOpen, Trophy } from "lucide-react";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/tutor", label: "AI Tutor", icon: MessageSquare },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
              <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-bold">Scholly<span className="text-gradient-gold">.AI</span></div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">WAEC companion</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || (to !== "/" && pathname.startsWith(to));
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
          <Link to="/tutor"
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform">
            <Sparkles className="h-4 w-4" /> Start Tutor
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <nav className="md:hidden sticky bottom-0 z-40 glass border-t">
        <div className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <Link key={to} to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}>
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
    </div>
  );
}
