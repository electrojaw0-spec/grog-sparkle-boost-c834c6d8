import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SUBJECTS } from "@/lib/subjects";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/subjects")({
  component: SubjectsPage,
  head: () => ({
    meta: [
      { title: "WAEC Subjects · Scholly.AI" },
      { name: "description", content: "All 9 WAEC subjects with topics, past questions, and AI explanations." },
    ],
  }),
});

function SubjectsPage() {
  const location = useLocation();

  if (location.pathname !== "/subjects") {
    return <Outlet />;
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold">WAEC <span className="text-gradient-gold">Subjects</span></h1>
          <p className="text-muted-foreground mt-2">Pick a subject and let Scholly walk you through every topic.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUBJECTS.map((s) => (
            <Link key={s.id} to="/subjects/$subjectId" params={{ subjectId: s.id }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-card p-6 border border-border hover:border-primary/30 hover:-translate-y-1 transition-all">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-30 blur-2xl" style={{ backgroundColor: s.hue }} />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="text-4xl">{s.emoji}</div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">{s.questionCount} Q</span>
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold">{s.name}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.topics.map((t) => (
                    <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                  ))}
                </div>
                <span className="mt-5 inline-flex items-center gap-1 text-sm text-gold">
                  Open subject <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
