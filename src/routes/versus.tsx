import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SUBJECTS } from "@/lib/subjects";
import { QUESTIONS, type Question } from "@/lib/questions";
import { Swords, Trophy, RotateCcw, ChevronRight, Crown } from "lucide-react";

export const Route = createFileRoute("/versus")({
  component: VersusPage,
  head: () => ({
    meta: [
      { title: "Versus Mode — Scholly.AI" },
      { name: "description", content: "Challenge a classmate. Take turns answering WAEC questions and see who wins." },
      { property: "og:title", content: "Versus — Scholly.AI" },
      { property: "og:description", content: "Pass the phone, answer the question, settle the score." },
    ],
  }),
});

const ROUNDS = 5;

type Phase = "setup" | "ready" | "answer" | "reveal" | "done";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function VersusPage() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [subjectId, setSubjectId] = useState<string>(SUBJECTS[0].id);
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [round, setRound] = useState(0); // 0..ROUNDS-1
  const [turn, setTurn] = useState<0 | 1>(0); // 0 = p1, 1 = p2
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [picked, setPicked] = useState<number | null>(null);

  const subject = useMemo(() => SUBJECTS.find((s) => s.id === subjectId)!, [subjectId]);
  const names: [string, string] = [p1.trim() || "Player 1", p2.trim() || "Player 2"];
  const current = questions[round];

  const start = () => {
    const pool = QUESTIONS[subjectId] ?? [];
    if (pool.length === 0) return;
    setQuestions(shuffle(pool).slice(0, ROUNDS));
    setRound(0);
    setTurn(0);
    setScores([0, 0]);
    setPicked(null);
    setPhase("ready");
  };

  const answer = (i: number) => {
    if (phase !== "answer" || !current) return;
    setPicked(i);
    const correct = i === current.answer;
    if (correct) {
      const next: [number, number] = [...scores] as [number, number];
      next[turn] += 1;
      setScores(next);
    }
    setPhase("reveal");
  };

  const next = () => {
    const isLastTurn = turn === 1;
    const isLastRound = round === ROUNDS - 1;
    if (isLastTurn && isLastRound) {
      setPhase("done");
      return;
    }
    if (isLastTurn) {
      setRound((r) => r + 1);
      setTurn(0);
    } else {
      setTurn(1);
    }
    setPicked(null);
    setPhase("ready");
  };

  const reset = () => {
    setPhase("setup");
    setQuestions([]);
    setScores([0, 0]);
    setPicked(null);
    setRound(0);
    setTurn(0);
  };

  return (
    <AppShell>
      <section className="container mx-auto px-4 py-10 max-w-2xl">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium mb-4">
            <Swords className="h-4 w-4 text-gold" /> Versus mode
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold">
            Challenge a <span className="text-gradient-gold">classmate</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-sm md:text-base">
            Two players, one phone. Take turns answering {ROUNDS} questions each. Highest score wins.
          </p>
        </header>

        {/* SETUP */}
        {phase === "setup" && (
          <div className="rounded-3xl bg-gradient-card border border-border p-6 md:p-8 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Player 1</span>
                <input
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  placeholder="Name"
                  className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Player 2</span>
                <input
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  placeholder="Name"
                  className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubjectId(s.id)}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      subjectId === s.id
                        ? "border-gold bg-gold/10"
                        : "border-border bg-secondary hover:border-gold/40"
                    }`}
                  >
                    <div className="text-xl">{s.emoji}</div>
                    <div className="text-[11px] mt-1 font-medium leading-tight">{s.short}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={start}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3.5 text-base font-semibold text-gold-foreground glow-gold hover:scale-[1.01] transition-transform"
            >
              <Swords className="h-5 w-5" /> Start the battle
            </button>
          </div>
        )}

        {/* SCOREBOARD (during play) */}
        {(phase === "ready" || phase === "answer" || phase === "reveal") && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 transition-all ${
                    turn === i && phase !== "reveal"
                      ? "border-gold bg-gold/10 glow-gold"
                      : "border-border bg-gradient-card"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {turn === i && phase !== "reveal" ? "Your turn" : "Player " + (i + 1)}
                  </div>
                  <div className="font-display font-bold text-lg truncate">{names[i]}</div>
                  <div className="text-3xl font-display font-bold text-gradient-gold">{scores[i]}</div>
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-muted-foreground mb-3">
              Round {round + 1} of {ROUNDS} · {subject.emoji} {subject.name}
            </div>

            {/* READY screen — pass the phone */}
            {phase === "ready" && (
              <div className="rounded-3xl bg-gradient-card border border-border p-8 text-center">
                <div className="text-5xl mb-4">📱➡️</div>
                <h2 className="font-display text-2xl font-bold">Pass the phone to {names[turn]}</h2>
                <p className="text-muted-foreground text-sm mt-2">Ready to answer?</p>
                <button
                  onClick={() => setPhase("answer")}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform"
                >
                  I'm ready <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* QUESTION */}
            {(phase === "answer" || phase === "reveal") && current && (
              <div className="rounded-3xl bg-gradient-card border border-border p-6">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{current.topic}</div>
                <h2 className="font-display text-lg md:text-xl font-semibold leading-snug">{current.q}</h2>
                <div className="mt-5 space-y-2">
                  {current.options.map((opt, i) => {
                    const isAnswer = i === current.answer;
                    const isPicked = i === picked;
                    let cls = "border-border bg-secondary hover:border-gold/40";
                    if (phase === "reveal") {
                      if (isAnswer) cls = "border-emerald-500 bg-emerald-500/10";
                      else if (isPicked) cls = "border-destructive bg-destructive/10";
                      else cls = "border-border bg-secondary opacity-60";
                    }
                    return (
                      <button
                        key={i}
                        disabled={phase !== "answer"}
                        onClick={() => answer(i)}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ${cls}`}
                      >
                        <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {phase === "reveal" && (
                  <div className="mt-5 rounded-xl bg-secondary border border-border p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gold mb-1">
                      {picked === current.answer ? `✓ Correct! +1 for ${names[turn]}` : "✗ Wrong"}
                    </div>
                    <p className="text-sm text-muted-foreground">{current.explain}</p>
                    <button
                      onClick={next}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.01] transition-transform"
                    >
                      {round === ROUNDS - 1 && turn === 1 ? "See the winner" : "Next turn"}{" "}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* DONE */}
        {phase === "done" && (
          <div className="rounded-3xl bg-gradient-card border border-border p-8 text-center">
            {scores[0] === scores[1] ? (
              <>
                <Trophy className="h-12 w-12 mx-auto text-gold mb-3" />
                <h2 className="font-display text-3xl font-bold">It's a tie!</h2>
                <p className="text-muted-foreground mt-2">{names[0]} and {names[1]} both scored {scores[0]}.</p>
              </>
            ) : (
              <>
                <Crown className="h-12 w-12 mx-auto text-gold mb-3" />
                <h2 className="font-display text-3xl font-bold">
                  {names[scores[0] > scores[1] ? 0 : 1]} wins!
                </h2>
                <p className="text-muted-foreground mt-2">
                  Final score — {names[0]}: {scores[0]} · {names[1]}: {scores[1]}
                </p>
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={start}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform"
              >
                <RotateCcw className="h-4 w-4" /> Rematch
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Change players
              </button>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
