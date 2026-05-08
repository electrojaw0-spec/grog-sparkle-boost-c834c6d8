import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SUBJECTS } from "@/lib/subjects";
import { ArrowRight, Sparkles, MessageSquare, BookOpen, Trophy, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Scholly.AI — Your AI WAEC Study Companion" },
      { name: "description", content: "A simple AI study app for WAEC. Ask questions, practice past papers, take mock exams." },
      { property: "og:title", content: "Scholly.AI — AI WAEC Companion" },
      { property: "og:description", content: "Ask. Practice. Pass." },
    ],
  }),
});

const STEPS = [
  { n: 1, icon: MessageSquare, title: "Ask Scholly", desc: "Type any WAEC question. Get a clear, step-by-step answer in seconds.", to: "/tutor", cta: "Open AI Tutor" },
  { n: 2, icon: BookOpen, title: "Practice a subject", desc: "Pick a subject and answer real past questions with instant feedback.", to: "/subjects", cta: "Browse subjects" },
  { n: 3, icon: Trophy, title: "Take a mock exam", desc: "Timed mock exam to see your predicted grade before the real thing.", to: "/subjects", cta: "Start mock exam" },
] as const;

function HomePage() {
  return (
    <AppShell>
      {/* HERO — simple and clear */}
      <section className="relative">
        <div className="container mx-auto px-4 pt-16 pb-12 relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-widest mb-6">
              <span className="h-2 w-2 rounded-full bg-gold animate-pulse" /> WAEC / WASSCE study buddy
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.1]">
              Pass WAEC the <span className="text-gradient-gold">simple way</span>.
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Ask. Practice. Pass. Three things — that's the whole app.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <Link to="/tutor"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-base font-semibold text-gold-foreground glow-gold hover:scale-[1.03] transition-transform">
                <Sparkles className="h-5 w-5" /> Ask a question
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/subjects"
                className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-base font-semibold hover:bg-white/10 transition-colors">
                <BookOpen className="h-4 w-4" /> Pick a subject
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — 3 numbered steps */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest text-gold mb-2">How it works</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold">3 steps to a better grade</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map(({ n, icon: Icon, title, desc, to, cta }) => (
            <Link key={n} to={to}
              className="group relative rounded-2xl bg-gradient-card p-6 border border-white/5 hover:border-gold/40 transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-gold grid place-items-center font-display text-xl font-bold text-gold-foreground">
                  {n}
                </div>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold">
                {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* SUBJECTS PREVIEW */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Choose a subject</h2>
            <p className="text-sm text-muted-foreground mt-1">Tap any subject to start practicing.</p>
          </div>
          <Link to="/subjects" className="hidden md:inline-flex items-center gap-1 text-sm text-gold hover:underline">
            See all 9 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUBJECTS.slice(0, 6).map((s) => (
            <Link key={s.id} to="/subjects/$subjectId" params={{ subjectId: s.id }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-card p-5 border border-white/5 hover:border-white/20 hover:-translate-y-1 transition-all">
              <div
                className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-25 blur-2xl"
                style={{ backgroundColor: s.hue }}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-3xl mb-3">{s.emoji}</div>
                  <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.questionCount} past questions</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
        <Link to="/subjects" className="md:hidden mt-6 inline-flex items-center gap-1 text-sm text-gold hover:underline">
          See all 9 subjects <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* WHY — quick bullets */}
      <section className="container mx-auto px-4 py-12">
        <div className="rounded-3xl bg-gradient-card border border-white/5 p-8 md:p-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">Why students love it</h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              "Free to start — no card needed",
              "Real WAEC past questions (2015–2024)",
              "Step-by-step answers, not just the result",
              "Works on any phone, even on slow internet",
            ].map((p) => (
              <div key={p} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                <span className="text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 md:p-14 text-center border border-white/10 glow">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,_oklch(0.83_0.16_85_/_0.3),_transparent_50%)]" />
          <div className="relative">
            <h3 className="font-display text-2xl md:text-4xl font-bold">Ready? Ask your first question.</h3>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm md:text-base">It takes 10 seconds. Scholly will reply right away.</p>
            <Link to="/tutor"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-3.5 text-base font-semibold text-gold-foreground glow-gold hover:scale-[1.03] transition-transform">
              <Sparkles className="h-5 w-5" /> Start now — it's free
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
