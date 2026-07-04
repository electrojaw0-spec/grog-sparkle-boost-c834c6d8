import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Trophy, Crown, Medal } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
  head: () => ({
    meta: [
      { title: "Leaderboard · Scholly.AI" },
      { name: "description", content: "Top WAEC scholars on Scholly this week." },
    ],
  }),
});

const TOP = [
  { name: "Adaeze O.", xp: 12480, school: "Lagos", avatar: "🦁" },
  { name: "Kwame B.", xp: 11920, school: "Accra", avatar: "🦅" },
  { name: "Fatima S.", xp: 10755, school: "Abuja", avatar: "🐆" },
  { name: "Chidi N.", xp: 9870, school: "Enugu", avatar: "🐯" },
  { name: "Aisha M.", xp: 9510, school: "Kano", avatar: "🦊" },
  { name: "Tunde A.", xp: 9120, school: "Ibadan", avatar: "🐺" },
  { name: "Ama K.", xp: 8740, school: "Kumasi", avatar: "🐬" },
  { name: "Ifeanyi U.", xp: 8480, school: "Port H.", avatar: "🐉" },
];

function LeaderboardPage() {
  const [first, second, third, ...rest] = TOP;
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-10 pb-24 md:pb-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-widest mb-4">
            <Trophy className="h-3.5 w-3.5 text-gold" /> This week
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold">Top <span className="text-gradient-gold">Scholars</span></h1>
        </div>

        {/* Podium */}
        <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto items-end mb-12">
          {[second, first, third].map((u, i) => {
            const heights = ["h-32", "h-40", "h-24"];
            const ranks = [2, 1, 3];
            const icons = [<Medal key="m" className="h-6 w-6 text-zinc-300" />, <Crown key="c" className="h-7 w-7 text-gold" />, <Medal key="b" className="h-6 w-6 text-amber-700" />];
            return (
              <div key={u.name} className="flex flex-col items-center">
                <div className="text-4xl mb-2 animate-float" style={{ animationDelay: `${i * 0.4}s` }}>{u.avatar}</div>
                <div className="font-semibold text-sm">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.xp.toLocaleString()} XP</div>
                <div className={`mt-3 w-full ${heights[i]} rounded-t-2xl ${ranks[i] === 1 ? "bg-gradient-gold glow-gold" : "bg-gradient-card border border-border"} grid place-items-center`}>
                  <div className="flex flex-col items-center gap-1">
                    {icons[i]}
                    <span className={`font-display text-2xl font-bold ${ranks[i] === 1 ? "text-gold-foreground" : ""}`}>{ranks[i]}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* List */}
        <div className="max-w-2xl mx-auto glass rounded-2xl divide-y divide-white/5">
          {rest.map((u, i) => (
            <div key={u.name} className="flex items-center gap-4 p-4">
              <div className="w-8 text-center font-display text-lg text-muted-foreground">{i + 4}</div>
              <div className="text-2xl">{u.avatar}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.school}</div>
              </div>
              <div className="text-sm font-semibold text-gold">{u.xp.toLocaleString()} XP</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
