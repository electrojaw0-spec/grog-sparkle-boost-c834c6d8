import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { SUBJECTS } from "@/lib/subjects";
import { QUESTIONS } from "@/lib/questions";
import { answerRoomFn, createRoomFn, getRoomFn, joinRoomFn, nextRoundFn, quitRoomFn, rematchFn } from "@/lib/versus.functions";
import { BattleTimePicker, BattleTimer } from "@/components/BattleTimer";
import { formatTime, secondsLeft, TIMED_OUT } from "@/lib/versusRules";
import { Swords, Crown, Trophy, RotateCcw, ChevronRight, Copy, Wifi, Loader2, Check, LogOut } from "lucide-react";

export const Route = createFileRoute("/versus-online")({
  component: OnlineVersusPage,
  head: () => ({
    meta: [
      { title: "Online Versus — Scholly.AI" },
      { name: "description", content: "Challenge any classmate online. Share a 6-letter room code and battle in real time." },
      { property: "og:title", content: "Online Versus — Scholly.AI" },
      { property: "og:description", content: "Real-time WAEC quiz duels. Share a code, beat your friend." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ROUNDS = 5;

type Room = {
  time_limit_seconds: number;
  round_deadline: string | null;
  id: string;
  code: string;
  subject_id: string;
  status: "waiting" | "playing" | "done";
  phase: "ready" | "answer" | "reveal" | "done";
  player1_name: string;
  player2_name: string | null;
  question_indexes: number[];
  current_round: number;
  current_turn: number;
  scores: number[];
  last_pick: number | null;
  p1_pick: number | null;
  p2_pick: number | null;
};


const SAVE_KEY = "scholly-versus-online-v1";

function OnlineVersusPage() {
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [seat, setSeat] = useState<0 | 1 | null>(null); // 0 = player1, 1 = player2
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const lockRef = useRef(false);
  const [timeLimit, setTimeLimit] = useState(60);
  const [now, setNow] = useState(Date.now());

  // Rejoin an in-progress room after navigating away / refreshing
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as { id: string; seat: 0 | 1; secret?: string };
        if (!saved?.id || !saved.secret) { localStorage.removeItem(SAVE_KEY); return; }
        const data = await getRoomFn({ data: { id: saved.id, seat: saved.seat, secret: saved.secret } }).catch(() => null);
        if (!cancelled && data) {
          setRoom(data as Room);
          setSeat(saved.seat);
          setSecret(saved.secret);
        } else if (!cancelled) {
          localStorage.removeItem(SAVE_KEY);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      if (room && seat !== null && secret) localStorage.setItem(SAVE_KEY, JSON.stringify({ id: room.id, seat, secret }));
    } catch {
      /* ignore */
    }
  }, [room?.id, seat, secret]);



  const subject = useMemo(
    () => SUBJECTS.find((s) => s.id === (room?.subject_id ?? subjectId)) ?? SUBJECTS[0],
    [room?.subject_id, subjectId],
  );
  const pool = room ? QUESTIONS[room.subject_id] ?? [] : [];
  const current = room ? pool[room.question_indexes[room.current_round]] : null;
  const myPick = room && seat !== null ? (seat === 0 ? room.p1_pick : room.p2_pick) : null;
  const oppPick = room && seat !== null ? (seat === 0 ? room.p2_pick : room.p1_pick) : null;
  const bothAnswered = room ? room.p1_pick !== null && room.p2_pick !== null : false;

  async function createRoom() {
    if (!name.trim()) return setErr("Enter your name");
    setErr(null);
    setBusy(true);
    try {
      const res = await createRoomFn({ data: { name: name.trim(), subjectId, timeLimit: timeLimit as 40 | 60 | 180 } });
      setSecret(res.secret);
      setRoom(res.room as Room);
      setSeat(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create room");
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    if (!name.trim()) return setErr("Enter your name");
    if (joinCode.trim().length !== 6) return setErr("Code must be 6 letters");
    setErr(null);
    setBusy(true);
    try {
      const res = await joinRoomFn({ data: { code: joinCode.trim().toUpperCase(), name: name.trim() } });
      setSecret(res.secret);
      setRoom(res.room as Room);
      setSeat(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not join");
    } finally {
      setBusy(false);
    }
  }

  const remaining = secondsLeft(room?.round_deadline ? Date.parse(room.round_deadline) : null, now);

  // Reconcile after lost realtime events, reconnects and tab suspension.
  useEffect(() => {
    if (!room || seat === null || !secret) return;
    let cancelled = false;
    let fetching = false;
    const id = room.id;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      let data: Room | null = null; let error = false;
      try { data = (await getRoomFn({ data: { id, seat, secret } })) as Room; } catch { error = true; }
      fetching = false;
      if (!cancelled && data) setRoom(data as Room);
      if (!cancelled && error) setErr("Connection interrupted. Retrying your battle…");
    };
    const poll = window.setInterval(refresh, 1500);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    void refresh();
    return () => { cancelled = true; clearInterval(poll); window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh); };
  }, [room?.id, seat, secret]);

  async function answer(i: number) {
    if (!room || !current || lockRef.current || seat === null || room.status !== "playing" || room.phase !== "answer") return;
    if (i !== TIMED_OUT && myPick !== null) return;
    lockRef.current = true;
    try {
      let data: Room | null = null; let error = false;
      try { data = (await answerRoomFn({ data: { id: room.id, seat, secret: secret ?? "", round: room.current_round, pick: i } })) as Room; } catch { error = true; }
      if (error) setErr("Could not save your answer. Please retry; your battle is still saved.");
      else if (data) { setRoom(data as Room); setErr(null); }
    } finally { lockRef.current = false; }
  }

  useEffect(() => {
    if (room?.status !== "playing" || room.phase !== "answer") return;
    const tick = () => {
      setNow(Date.now());
      if (room.round_deadline && Date.now() >= Date.parse(room.round_deadline)) void answer(TIMED_OUT);
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [room, seat]);

  async function nextRound() {
    if (!room || room.phase !== "reveal" || lockRef.current) return;
    lockRef.current = true;
    let data: Room | null = null; let error = false;
    try { data = (await nextRoundFn({ data: { id: room.id, seat: seat ?? 0, secret: secret ?? "" } })) as Room; } catch { error = true; }
    lockRef.current = false;
    if (error) setErr("Could not advance the round. Please retry.");
    else if (data) { setRoom(data as Room); setNow(Date.now()); setErr(null); }
  }

  async function rematch() {
    if (!room || room.status !== "done" || lockRef.current) return;
    lockRef.current = true;
    let data: Room | null = null; let error = false;
    try { data = (await rematchFn({ data: { id: room.id, seat: seat ?? 0, secret: secret ?? "" } })) as Room; } catch { error = true; }
    lockRef.current = false;
    if (error) setErr("Could not start a rematch. Please retry.");
    else if (data) { setRoom(data as Room); setNow(Date.now()); }
  }

  async function leaveRoom() {
    if (room && room.status !== "done") {
      if (!confirm("Quit this battle for both players?")) return;
      let error = false;
      try { await quitRoomFn({ data: { id: room.id, seat: seat ?? 0, secret: secret ?? "" } }); } catch { error = true; }
      if (error) return setErr("Could not quit while disconnected. Please retry.");
    }
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    setRoom(null); setSeat(null); setSecret(null); setMode("home"); setJoinCode("");
  }

  function copyCode() {
    if (!room) return;
    navigator.clipboard?.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const names: [string, string] = room ? [room.player1_name, room.player2_name ?? "Waiting…"] : ["", ""];

  return (
    <AppShell>
      <section className="container mx-auto px-4 py-10 max-w-2xl">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium mb-4">
            <Wifi className="h-4 w-4 text-gold" /> Online versus
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold">
            Battle a friend <span className="text-gradient-gold">online</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-sm md:text-base">
            Both players answer the same question — the correct answer stays hidden until you both lock in.
          </p>
        </header>

        {/* HOME */}
        {!room && mode === "home" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode("create")}
              className="rounded-3xl bg-gradient-card border border-border p-6 text-left hover:border-gold/40 transition-all"
            >
              <Swords className="h-8 w-8 text-gold mb-3" />
              <div className="font-display text-xl font-bold">Create a room</div>
              <p className="text-sm text-muted-foreground mt-1">Pick a subject, get a code, share with a friend.</p>
            </button>
            <button
              onClick={() => setMode("join")}
              className="rounded-3xl bg-gradient-card border border-border p-6 text-left hover:border-gold/40 transition-all"
            >
              <Wifi className="h-8 w-8 text-gold mb-3" />
              <div className="font-display text-xl font-bold">Join a room</div>
              <p className="text-sm text-muted-foreground mt-1">Got a 6-letter code? Type it in to play.</p>
            </button>
          </div>
        )}

        {/* CREATE */}
        {!room && mode === "create" && (
          <div className="rounded-3xl bg-gradient-card border border-border p-6 md:p-8 space-y-5">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ada"
                maxLength={20}
                className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubjectId(s.id)}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      subjectId === s.id ? "border-gold bg-gold/10" : "border-border bg-secondary hover:border-gold/40"
                    }`}
                  >
                    <div className="text-xl">{s.emoji}</div>
                    <div className="text-[11px] mt-1 font-medium leading-tight">{s.short}</div>
                  </button>
                ))}
              </div>
            </div>
            <BattleTimePicker value={timeLimit} onChange={setTimeLimit} />
            {err && <div className="text-sm text-destructive">{err}</div>}
            <div className="flex gap-3">
              <button
                onClick={() => setMode("home")}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Back
              </button>
              <button
                disabled={busy}
                onClick={createRoom}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                Create room
              </button>
            </div>
          </div>
        )}

        {/* JOIN */}
        {!room && mode === "join" && (
          <div className="rounded-3xl bg-gradient-card border border-border p-6 md:p-8 space-y-5">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tunde"
                maxLength={20}
                className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room code</span>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="ABC123"
                className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-center text-2xl font-display font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            {err && <div className="text-sm text-destructive">{err}</div>}
            <div className="flex gap-3">
              <button
                onClick={() => setMode("home")}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Back
              </button>
              <button
                disabled={busy}
                onClick={joinRoom}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                Join
              </button>
            </div>
          </div>
        )}

        {/* WAITING for player 2 */}
        {room && room.status === "waiting" && (
          <div className="rounded-3xl bg-gradient-card border border-border p-8 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Share this code</div>
            <div className="font-display text-5xl font-bold tracking-[0.3em] text-gradient-gold mb-3">{room.code}</div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-semibold hover:bg-secondary transition-colors mb-6"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy code"}
            </button>
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Waiting for opponent to join…
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{subject.emoji} {subject.name} · {formatTime(room.time_limit_seconds)} per question</div>
            <button onClick={() => leaveRoom()} className="mt-6 text-xs text-muted-foreground underline">
              Cancel room
            </button>
          </div>
        )}

        {/* PLAYING */}
        {room && room.status === "playing" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[0, 1].map((i) => {
                const playerPick = i === 0 ? room.p1_pick : room.p2_pick;
                const answered = playerPick !== null;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border p-4 transition-all ${
                      seat === i ? "border-gold bg-gold/10 glow-gold" : "border-border bg-gradient-card"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {seat === i ? "You" : "Opponent"}
                      {room.phase === "answer" && answered ? " · answered" : ""}
                    </div>
                    <div className="font-display font-bold text-lg truncate">{names[i]}</div>
                    <div className="text-3xl font-display font-bold text-gradient-gold">{room.scores[i]}</div>
                  </div>
                );
              })}
            </div>

            <div className="text-center text-xs text-muted-foreground mb-3">
              Round {room.current_round + 1} of {ROUNDS} · {subject.emoji} {subject.name} · Code{" "}
              <span className="font-semibold">{room.code}</span>
            </div>

            <div className="flex justify-center mb-4">
              <Button variant="outline" size="sm" onClick={() => leaveRoom()}>
                <LogOut aria-hidden="true" /> Quit battle
              </Button>
            </div>

            {err && <p role="alert" className="text-sm text-destructive text-center mb-3">{err}</p>}
            {room.phase === "answer" && <BattleTimer remaining={remaining} />}
            {(room.phase === "answer" || room.phase === "reveal") && current && (
              <div className="rounded-3xl bg-gradient-card border border-border p-6">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{current.topic}</div>
                <h2 className="font-display text-lg md:text-xl font-semibold leading-snug">{current.q}</h2>
                <div className="mt-5 space-y-2">
                  {current.options.map((opt, i) => {
                    const isAnswer = i === current.answer;
                    const isMyPick = myPick === i;
                    const isOppPick = oppPick === i;
                    let cls = "border-border bg-secondary";
                    if (room.phase === "answer") {
                      if (isMyPick) cls = "border-gold bg-gold/10";
                      else if (myPick === null) cls += " hover:border-gold/40 cursor-pointer";
                      else cls += " opacity-60";
                    }
                    if (room.phase === "reveal") {
                      if (isAnswer) cls = "border-emerald-500 bg-emerald-500/10";
                      else if (isMyPick || isOppPick) cls = "border-destructive bg-destructive/10";
                      else cls = "border-border bg-secondary opacity-60";
                    }
                    return (
                      <button
                        key={i}
                        disabled={room.phase !== "answer" || myPick !== null || remaining === 0}
                        onClick={() => answer(i)}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ${cls}`}
                      >
                        <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                        {room.phase === "reveal" && (isMyPick || isOppPick) && (
                          <span className="ml-2 text-[11px] font-semibold text-gold">
                            {isMyPick && isOppPick
                              ? "← both of you"
                              : isMyPick
                                ? "← you"
                                : "← opponent"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {room.phase === "answer" && myPick !== null && !bothAnswered && (
                  <div className="mt-4 text-center text-xs text-muted-foreground inline-flex items-center gap-2 justify-center w-full">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for opponent to answer…
                  </div>
                )}

                {room.phase === "reveal" && (
                  <div className="mt-5 rounded-xl bg-secondary border border-border p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gold mb-2">
                      {names[0]}: {room.p1_pick === current.answer ? "✓ +1" : "✗"} · {names[1]}:{" "}
                      {room.p2_pick === current.answer ? "✓ +1" : "✗"}
                    </div>
                    {(room.p1_pick === TIMED_OUT || room.p2_pick === TIMED_OUT) && <p className="text-sm mb-2">{room.p1_pick === TIMED_OUT && room.p2_pick === TIMED_OUT ? "Both players ran out of time. No points awarded." : `${names[room.p1_pick === TIMED_OUT ? 0 : 1]} ran out of time. ${names[room.p1_pick === TIMED_OUT ? 1 : 0]} gets +1 point.`}</p>}
                    <p className="text-sm text-muted-foreground">{current.explain}</p>
                    <button
                      onClick={nextRound}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.01] transition-transform"
                    >
                      {room.current_round === ROUNDS - 1 ? "See the winner" : "Next round"}{" "}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* DONE */}
        {room && room.status === "done" && (
          <div className="rounded-3xl bg-gradient-card border border-border p-8 text-center">
            {room.scores[0] === room.scores[1] ? (
              <>
                <Trophy className="h-12 w-12 mx-auto text-gold mb-3" />
                <h2 className="font-display text-3xl font-bold">It's a tie!</h2>
                <p className="text-muted-foreground mt-2">
                  {names[0]} and {names[1]} both scored {room.scores[0]}.
                </p>
              </>
            ) : (
              <>
                <Crown className="h-12 w-12 mx-auto text-gold mb-3" />
                <h2 className="font-display text-3xl font-bold">
                  {names[room.scores[0] > room.scores[1] ? 0 : 1]} wins!
                </h2>
                <p className="text-muted-foreground mt-2">
                  Final — {names[0]}: {room.scores[0]} · {names[1]}: {room.scores[1]}
                </p>
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={rematch}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform"
              >
                <RotateCcw className="h-4 w-4" /> Rematch
              </button>
              <button
                onClick={() => leaveRoom()}
                className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Leave room
              </button>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
