import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SUBJECTS } from "@/lib/subjects";
import { QUESTIONS, type Question } from "@/lib/questions";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Timer, Trophy, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/subjects/$subjectId")({
  component: SubjectDetail,
  notFoundComponent: () => (
    <AppShell>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Subject not found</h1>
        <Link to="/subjects" className="text-gold hover:underline mt-4 inline-block">Back to subjects</Link>
      </div>
    </AppShell>
  ),
  loader: ({ params }) => {
    const subject = SUBJECTS.find((s) => s.id === params.subjectId);
    if (!subject) throw notFound();
    return { subject };
  },
});

type Mode = "overview" | "practice" | "exam" | "result";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function SubjectDetail() {
  const { subject } = Route.useLoaderData();
  const bank = QUESTIONS[subject.id] ?? [];
  const [mode, setMode] = useState<Mode>("overview");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const startSession = (m: "practice" | "exam") => {
    const count = m === "exam" ? Math.min(10, bank.length) : bank.length;
    const qs = shuffle(bank).slice(0, count);
    setQuestions(qs);
    setAnswers(Array(qs.length).fill(-1));
    setIdx(0);
    setPicked(null);
    setRevealed(false);
    setMode(m);
    if (m === "exam") setSecondsLeft(qs.length * 60);
  };

  useEffect(() => {
    if (mode !== "exam") return;
    if (secondsLeft <= 0) { setMode("result"); return; }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [mode, secondsLeft]);

  const submit = () => {
    if (picked === null) return;
    const next = [...answers];
    next[idx] = picked;
    setAnswers(next);
    if (mode === "practice") {
      setRevealed(true);
    } else {
      advance(next);
    }
  };

  const advance = (next = answers) => {
    setRevealed(false);
    setPicked(null);
    if (idx + 1 >= questions.length) {
      setAnswers(next);
      setMode("result");
    } else {
      setIdx(idx + 1);
    }
  };

  const score = useMemo(
    () => answers.reduce((acc, a, i) => acc + (a === questions[i]?.answer ? 1 : 0), 0),
    [answers, questions]
  );

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/subjects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> All subjects
        </Link>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-card p-6 border border-white/5 mb-6">
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full opacity-30 blur-2xl" style={{ backgroundColor: subject.hue }} />
          <div className="relative flex items-center gap-4">
            <div className="text-5xl">{subject.emoji}</div>
            <div>
              <h1 className="font-display text-3xl font-bold">{subject.name}</h1>
              <p className="text-sm text-muted-foreground">{bank.length} questions available</p>
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {subject.topics.map((t: string) => (
              <span key={t} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground">{t}</span>
            ))}
          </div>
        </div>

        {mode === "overview" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <button onClick={() => startSession("practice")}
              className="group rounded-2xl bg-gradient-card border border-white/5 hover:border-white/20 p-6 text-left transition-colors">
              <Sparkles className="h-7 w-7 text-gold mb-3" />
              <h3 className="font-display text-xl font-semibold">Practice Mode</h3>
              <p className="text-sm text-muted-foreground mt-1">Untimed. See explanations after each answer.</p>
            </button>
            <button onClick={() => startSession("exam")} disabled={bank.length === 0}
              className="group rounded-2xl bg-gradient-card border border-white/5 hover:border-white/20 p-6 text-left transition-colors disabled:opacity-50">
              <Timer className="h-7 w-7 text-primary mb-3" />
              <h3 className="font-display text-xl font-semibold">Mock Exam</h3>
              <p className="text-sm text-muted-foreground mt-1">10 questions, 1 min each. Score at the end.</p>
            </button>
            <Link to="/tutor"
              className="sm:col-span-2 rounded-2xl bg-gradient-gold p-5 text-gold-foreground font-semibold flex items-center justify-between glow-gold hover:scale-[1.01] transition-transform">
              <span className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Ask Scholly about {subject.short}</span>
              <span>→</span>
            </Link>
          </div>
        )}

        {(mode === "practice" || mode === "exam") && questions[idx] && (
          <div className="rounded-2xl bg-gradient-card border border-white/5 p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
              <span>Question {idx + 1} of {questions.length}</span>
              {mode === "exam" && (
                <span className="inline-flex items-center gap-1.5 text-gold">
                  <Timer className="h-3.5 w-3.5" />
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                </span>
              )}
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-gradient-gold transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
            </div>
            <h2 className="font-display text-lg md:text-xl font-semibold mb-5">{questions[idx].q}</h2>
            <div className="space-y-2">
              {questions[idx].options.map((opt, i) => {
                const correct = i === questions[idx].answer;
                const chosen = picked === i;
                let cls = "border-white/10 hover:border-white/30 hover:bg-white/5";
                if (revealed) {
                  if (correct) cls = "border-emerald-500/60 bg-emerald-500/10";
                  else if (chosen) cls = "border-red-500/60 bg-red-500/10";
                  else cls = "border-white/5 opacity-60";
                } else if (chosen) {
                  cls = "border-primary bg-primary/10";
                }
                return (
                  <button key={i} disabled={revealed} onClick={() => setPicked(i)}
                    className={`w-full text-left rounded-xl border p-3.5 text-sm transition-colors flex items-center gap-3 ${cls}`}>
                    <span className="h-7 w-7 rounded-lg bg-white/5 grid place-items-center text-xs font-semibold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {revealed && correct && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                    {revealed && chosen && !correct && <XCircle className="h-5 w-5 text-red-400" />}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <div className="mt-4 rounded-xl bg-white/5 p-4 text-sm">
                <div className="font-semibold text-gold mb-1">Explanation</div>
                <p className="text-muted-foreground">{questions[idx].explain}</p>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              {!revealed ? (
                <button onClick={submit} disabled={picked === null}
                  className="rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-semibold text-gold-foreground glow-gold disabled:opacity-50">
                  Submit
                </button>
              ) : (
                <button onClick={() => advance()}
                  className="rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-semibold text-gold-foreground glow-gold">
                  {idx + 1 >= questions.length ? "Finish" : "Next"}
                </button>
              )}
            </div>
          </div>
        )}

        {mode === "result" && (
          <div className="rounded-2xl bg-gradient-card border border-white/5 p-8 text-center">
            <Trophy className="h-12 w-12 text-gold mx-auto mb-3" />
            <h2 className="font-display text-3xl font-bold">
              You scored <span className="text-gradient-gold">{score}/{questions.length}</span>
            </h2>
            <p className="text-muted-foreground mt-2">
              {score / questions.length >= 0.7 ? "Excellent work — A1 territory!" : score / questions.length >= 0.5 ? "Solid effort. Keep practicing." : "Don't give up — review and try again."}
            </p>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <button onClick={() => startSession(mode === "result" ? "practice" : "practice")}
                className="inline-flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
              <button onClick={() => setMode("overview")}
                className="rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground glow-gold">
                Back to subject
              </button>
            </div>
            <div className="mt-8 text-left space-y-3">
              {questions.map((q, i) => {
                const ok = answers[i] === q.answer;
                return (
                  <div key={q.id} className="rounded-xl bg-white/5 p-4">
                    <div className="flex items-start gap-2 text-sm">
                      {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> : <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
                      <div>
                        <div className="font-medium">{q.q}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Correct: <span className="text-emerald-400">{q.options[q.answer]}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
