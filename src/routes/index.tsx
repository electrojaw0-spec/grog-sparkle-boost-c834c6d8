import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SUBJECTS } from "@/lib/subjects";
import { ArrowRight, Sparkles, MessageSquare, BookOpen, Trophy, CheckCircle2, GraduationCap, Swords } from "lucide-react";
import heroBg from "@/assets/hero-bg.png";

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

const ACTIONS = [
  {
    n: 1,
    icon: MessageSquare,
    title: "Ask a question",
    desc: "Stuck on a topic? Ask Scholly and get a clear answer step by step.",
    to: "/tutor",
    cta: "Open AI Tutor",
  },
  {
    n: 2,
    icon: BookOpen,
    title: "Practice past papers",
    desc: "Pick any subject and try real WAEC questions with instant feedback.",
    to: "/subjects",
    cta: "Choose a subject",
  },
  {
    n: 3,
    icon: Trophy,
    title: "Take a mock exam",
    desc: "Sit a timed mock and see the grade you would get today.",
    to: "/subjects",
    cta: "Start a mock",
  },
  {
    n: 4,
    icon: Swords,
    title: "Challenge a friend",
    desc: "Versus mode — go head-to-head with a classmate and see who scores highest.",
    to: "/versus",
    cta: "Start a battle",
  },
] as const;

function HomePage() {
  return (
    <AppShell>
      {/* HERO — what the app is, in one glance */}
      <section
        className="relative bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-background/70" />
        <div className="container mx-auto px-4 pt-14 pb-16 relative">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium mb-6">
              <GraduationCap className="h-4 w-4 text-gold" />
              Made for WAEC & WASSCE students
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05]">
              Your <span className="text-gradient-gold">free AI tutor</span> for WAEC.
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground">
              Scholly helps you study smarter — ask any question, practice real past papers,
              and take mock exams. All in one place, on any phone.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <Link
                to="/tutor"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-base font-semibold text-gold-foreground glow-gold hover:scale-[1.03] transition-transform"
              >
                <Sparkles className="h-5 w-5" /> Start studying free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/subjects"
                className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-base font-semibold hover:bg-secondary transition-colors"
              >
                <BookOpen className="h-4 w-4" /> Browse subjects
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No sign-up needed · 100% free · Works on slow internet
            </p>
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN DO — 3 clear actions */}
      <section className="container mx-auto px-4 py-14">
        <div className="text-center mb-10 max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-gold mb-2 font-semibold">What you can do</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold">Three simple ways to study</h2>
          <p className="text-sm text-muted-foreground mt-3">Pick whichever helps you most today.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {ACTIONS.map(({ n, icon: Icon, title, desc, to, cta }) => (
            <Link
              key={n}
              to={to}
              className="group relative rounded-2xl bg-gradient-card p-6 border border-border hover:border-gold/40 transition-all hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-gold grid place-items-center text-gold-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">STEP {n}</span>
              </div>
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{desc}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-gold">
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
            <h2 className="font-display text-2xl md:text-3xl font-bold">Pick a subject</h2>
            <p className="text-sm text-muted-foreground mt-1">Tap any subject to start practicing.</p>
          </div>
          <Link to="/subjects" className="hidden md:inline-flex items-center gap-1 text-sm text-gold hover:underline">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUBJECTS.slice(0, 6).map((s) => (
            <Link
              key={s.id}
              to="/subjects/$subjectId"
              params={{ subjectId: s.id }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-card p-5 border border-border hover:border-primary/30 hover:-translate-y-1 transition-all"
            >
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
          See all subjects <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* WHY — quick bullets */}
      <section className="container mx-auto px-4 py-12">
        <div className="rounded-3xl bg-gradient-card border border-border p-8 md:p-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">Why students love Scholly</h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              "100% free — no card, no sign-up",
              "Real WAEC past questions (2015–2024)",
              "Step-by-step answers, not just results",
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 md:p-14 text-center border border-border glow">
          <div className="relative">
            <h3 className="font-display text-2xl md:text-4xl font-bold">Ready to start?</h3>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm md:text-base">
              Ask your first question — Scholly replies in seconds.
            </p>
            <Link
              to="/tutor"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-3.5 text-base font-semibold text-gold-foreground glow-gold hover:scale-[1.03] transition-transform"
            >
              <Sparkles className="h-5 w-5" /> Start now — it's free
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
