import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SUBJECTS } from "@/lib/subjects";
import { ArrowRight, Sparkles, Brain, Flame, Trophy, BookOpen, Bot, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Scholly.AI — Your AI WAEC Study Companion" },
      { name: "description", content: "Ace WAEC/WASSCE with an AI tutor, past questions, mock exams, and gamified study streaks. Built for West African students." },
      { property: "og:title", content: "Scholly.AI — AI WAEC Companion" },
      { property: "og:description", content: "AI tutor, past questions, mock exams. Pass WAEC with confidence." },
    ],
  }),
});

function HomePage() {
  return (
    <AppShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-float" />
        <div className="absolute top-40 -left-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 right-1/3 h-72 w-72 rounded-full bg-gold/20 blur-3xl animate-float" style={{ animationDelay: "4s" }} />

        <div className="container mx-auto px-4 pt-20 pb-24 relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-widest mb-6">
              <span className="h-2 w-2 rounded-full bg-gold animate-pulse" /> Powered by advanced AI
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05]">
              Pass WAEC with your<br />
              <span className="text-gradient-gold">AI study partner</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              An adaptive tutor that explains every topic step-by-step, drills you on past questions,
              and tracks your progress to your dream grade.
            </p>
            <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
              <Link to="/tutor"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-7 py-3.5 text-base font-semibold text-gold-foreground glow-gold hover:scale-[1.03] transition-transform">
                <Sparkles className="h-5 w-5" /> Talk to Scholly
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/subjects"
                className="inline-flex items-center gap-2 rounded-full glass px-7 py-3.5 text-base font-semibold hover:bg-white/10 transition-colors">
                Browse subjects
              </Link>
            </div>

            {/* stats */}
            <div className="mt-14 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { v: "9", l: "Subjects" },
                { v: "1,635+", l: "Past questions" },
                { v: "24/7", l: "AI tutor" },
              ].map((s) => (
                <div key={s.l} className="glass rounded-2xl py-5">
                  <div className="font-display text-3xl md:text-4xl font-bold text-gradient-gold">{s.v}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-5xl font-bold">Built to make studying <span className="text-gradient-primary">click</span></h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Every feature is tuned for the WAEC syllabus and the way West African students actually learn.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Bot, title: "Conversational AI Tutor", desc: "Ask anything — algebra to literature. Step-by-step explanations with worked examples.", grad: "bg-gradient-primary" },
            { icon: Brain, title: "Adaptive Drills", desc: "Smart practice that doubles down on your weak topics until they become strong points.", grad: "bg-gradient-gold" },
            { icon: Flame, title: "Streaks & XP", desc: "Daily goals, XP, badges, and levels keep you on the grind without burning out.", grad: "bg-gradient-primary" },
            { icon: BookOpen, title: "10 Years of Past Q's", desc: "Real WAEC questions from 2015–2024 across all 9 core subjects, fully searchable.", grad: "bg-gradient-gold" },
            { icon: Trophy, title: "Mock Exams", desc: "Timed 10/20/40-question exams with grade prediction & detailed review.", grad: "bg-gradient-primary" },
            { icon: Zap, title: "Instant feedback", desc: "Streaming answers powered by frontier LLMs — no spinner, no waiting.", grad: "bg-gradient-gold" },
          ].map(({ icon: Icon, title, desc, grad }) => (
            <div key={title} className="group relative rounded-2xl bg-gradient-card p-6 border border-white/5 hover:border-white/15 transition-colors">
              <div className={`h-11 w-11 rounded-xl ${grad} grid place-items-center mb-4 glow`}>
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{desc}</p>
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </section>

      {/* SUBJECTS PREVIEW */}
      <section className="container mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-5xl font-bold">All 9 WAEC subjects</h2>
            <p className="text-muted-foreground mt-2">Tap a subject to start practicing.</p>
          </div>
          <Link to="/subjects" className="hidden md:inline-flex items-center gap-1 text-sm text-gold hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUBJECTS.slice(0, 6).map((s) => (
            <Link key={s.id} to="/subjects"
              className="group relative overflow-hidden rounded-2xl bg-gradient-card p-5 border border-white/5 hover:border-white/20 hover:-translate-y-1 transition-all">
              <div
                className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-30 blur-2xl"
                style={{ backgroundColor: s.hue }}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-3xl mb-3">{s.emoji}</div>
                  <h3 className="font-display text-xl font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.questionCount} past questions</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>
              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {s.topics.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 md:p-16 text-center border border-white/10 glow">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,_oklch(0.83_0.16_85_/_0.3),_transparent_50%)]" />
          <div className="relative">
            <h3 className="font-display text-3xl md:text-5xl font-bold">Your A1 starts with one question.</h3>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">Ask Scholly anything from the WAEC syllabus and get a clear answer in seconds.</p>
            <Link to="/tutor"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-4 text-base font-semibold text-gold-foreground glow-gold hover:scale-[1.03] transition-transform">
              <Sparkles className="h-5 w-5" /> Start free
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
