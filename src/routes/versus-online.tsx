import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SUBJECTS } from "@/lib/subjects";
import { QUESTIONS } from "@/lib/questions";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Crown, Trophy, RotateCcw, ChevronRight, Copy, Wifi, Loader2, Check } from "lucide-react";

export const Route = createFileRoute("/versus-online")({
  component: OnlineVersusPage,
  head: () => ({
    meta: [
      { title: "Online Versus — Scholly.AI" },
      { name: "description", content: "Challenge any classmate online. Share a 6-letter room code and battle in real time." },
      { property: "og:title", content: "Online Versus — Scholly.AI" },
      { property: "og:description", content: "Real-time WAEC quiz duels. Share a code, beat your friend." },
    ],
  }),
});

const ROUNDS = 5;

type Room = {
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
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
function shuffleIdx(n: number, take: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, take);
}

function OnlineVersusPage() {
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [seat, setSeat] = useState<0 | 1 | null>(null); // 0 = player1, 1 = player2
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const lockRef = useRef(false);

  // realtime subscription
  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "versus_rooms", filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as Room),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  const subject = useMemo(
    () => SUBJECTS.find((s) => s.id === (room?.subject_id ?? subjectId))!,
    [room?.subject_id, subjectId],
  );
  const pool = room ? QUESTIONS[room.subject_id] ?? [] : [];
  const current = room ? pool[room.question_indexes[room.current_round]] : null;
  const isMyTurn = room && seat === room.current_turn;

  async function createRoom() {
    if (!name.trim()) return setErr("Enter your name");
    setErr(null);
    setBusy(true);
    const code = makeCode();
    const indexes = shuffleIdx((QUESTIONS[subjectId] ?? []).length, ROUNDS);
    const { data, error } = await supabase
      .from("versus_rooms")
      .insert({
        code,
        subject_id: subjectId,
        player1_name: name.trim(),
        question_indexes: indexes,
      })
      .select()
      .single();
    setBusy(false);
    if (error || !data) return setErr(error?.message ?? "Could not create room");
    setRoom(data as Room);
    setSeat(0);
  }

  async function joinRoom() {
    if (!name.trim()) return setErr("Enter your name");
    if (joinCode.trim().length !== 6) return setErr("Code must be 6 letters");
    setErr(null);
    setBusy(true);
    const code = joinCode.trim().toUpperCase();
    const { data: found, error: findErr } = await supabase
      .from("versus_rooms")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (findErr || !found) {
      setBusy(false);
      return setErr("Room not found");
    }
    if (found.player2_name && found.player2_name !== name.trim()) {
      setBusy(false);
      return setErr("Room is full");
    }
    const { data, error } = await supabase
      .from("versus_rooms")
      .update({ player2_name: name.trim(), status: "playing", updated_at: new Date().toISOString() })
      .eq("id", found.id)
      .select()
      .single();
    setBusy(false);
    if (error || !data) return setErr(error?.message ?? "Could not join");
    setRoom(data as Room);
    setSeat(1);
  }

  async function answer(i: number) {
    if (!room || !current || lockRef.current) return;
    if (room.phase !== "answer" || !isMyTurn) return;
    lockRef.current = true;
    const correct = i === current.answer;
    const nextScores = [...room.scores];
    if (correct) nextScores[room.current_turn] += 1;
    const { error } = await supabase
      .from("versus_rooms")
      .update({ phase: "reveal", last_pick: i, scores: nextScores, updated_at: new Date().toISOString() })
      .eq("id", room.id);
    lockRef.current = false;
    if (error) setErr(error.message);
  }

  async function startTurn() {
    if (!room || lockRef.current) return;
    lockRef.current = true;
    await supabase
      .from("versus_rooms")
      .update({ phase: "answer", last_pick: null, updated_at: new Date().toISOString() })
      .eq("id", room.id);
    lockRef.current = false;
  }

  async function nextTurn() {
    if (!room || lockRef.current) return;
    lockRef.current = true;
    const isLastTurn = room.current_turn === 1;
    const isLastRound = room.current_round === ROUNDS - 1;
    if (isLastTurn && isLastRound) {
      await supabase
        .from("versus_rooms")
        .update({ phase: "done", status: "done", updated_at: new Date().toISOString() })
        .eq("id", room.id);
    } else if (isLastTurn) {
      await supabase
        .from("versus_rooms")
        .update({
          current_round: room.current_round + 1,
          current_turn: 0,
          phase: "ready",
          last_pick: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", room.id);
    } else {
      await supabase
        .from("versus_rooms")
        .update({
          current_turn: 1,
          phase: "ready",
          last_pick: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", room.id);
    }
    lockRef.current = false;
  }

  async function rematch() {
    if (!room) return;
    const indexes = shuffleIdx((QUESTIONS[room.subject_id] ?? []).length, ROUNDS);
    await supabase
      .from("versus_rooms")
      .update({
        question_indexes: indexes,
        current_round: 0,
        current_turn: 0,
        scores: [0, 0],
        phase: "ready",
        last_pick: null,
        status: "playing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id);
  }

  function leaveRoom() {
    setRoom(null);
    setSeat(null);
    setMode("home");
    setJoinCode("");
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
            Create a room, share the 6-letter code with a friend, and play in real time on two phones.
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
            <div className="mt-2 text-xs text-muted-foreground">{subject.emoji} {subject.name}</div>
            <button onClick={leaveRoom} className="mt-6 text-xs text-muted-foreground underline">
              Cancel room
            </button>
          </div>
        )}

        {/* PLAYING */}
        {room && room.status === "playing" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 transition-all ${
                    room.current_turn === i && room.phase !== "reveal"
                      ? "border-gold bg-gold/10 glow-gold"
                      : "border-border bg-gradient-card"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {seat === i ? "You" : "Opponent"}
                    {room.current_turn === i && room.phase !== "reveal" ? " · turn" : ""}
                  </div>
                  <div className="font-display font-bold text-lg truncate">{names[i]}</div>
                  <div className="text-3xl font-display font-bold text-gradient-gold">{room.scores[i]}</div>
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-muted-foreground mb-3">
              Round {room.current_round + 1} of {ROUNDS} · {subject.emoji} {subject.name} · Code{" "}
              <span className="font-semibold">{room.code}</span>
            </div>

            {room.phase === "ready" && (
              <div className="rounded-3xl bg-gradient-card border border-border p-8 text-center">
                <div className="text-5xl mb-4">{isMyTurn ? "🎯" : "⏳"}</div>
                <h2 className="font-display text-2xl font-bold">
                  {isMyTurn ? "Your turn" : `${names[room.current_turn]}'s turn`}
                </h2>
                <p className="text-muted-foreground text-sm mt-2">
                  {isMyTurn ? "Tap to reveal the question" : "Waiting for them to start…"}
                </p>
                {isMyTurn && (
                  <button
                    onClick={startTurn}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform"
                  >
                    Show question <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {(room.phase === "answer" || room.phase === "reveal") && current && (
              <div className="rounded-3xl bg-gradient-card border border-border p-6">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{current.topic}</div>
                <h2 className="font-display text-lg md:text-xl font-semibold leading-snug">{current.q}</h2>
                <div className="mt-5 space-y-2">
                  {current.options.map((opt, i) => {
                    const isAnswer = i === current.answer;
                    const isPicked = i === room.last_pick;
                    let cls = "border-border bg-secondary";
                    if (room.phase === "answer" && isMyTurn) cls += " hover:border-gold/40 cursor-pointer";
                    if (room.phase === "reveal") {
                      if (isAnswer) cls = "border-emerald-500 bg-emerald-500/10";
                      else if (isPicked) cls = "border-destructive bg-destructive/10";
                      else cls = "border-border bg-secondary opacity-60";
                    }
                    return (
                      <button
                        key={i}
                        disabled={room.phase !== "answer" || !isMyTurn}
                        onClick={() => answer(i)}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ${cls}`}
                      >
                        <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {room.phase === "answer" && !isMyTurn && (
                  <div className="mt-4 text-center text-xs text-muted-foreground inline-flex items-center gap-2 justify-center w-full">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {names[room.current_turn]} is answering…
                  </div>
                )}

                {room.phase === "reveal" && (
                  <div className="mt-5 rounded-xl bg-secondary border border-border p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gold mb-1">
                      {room.last_pick === current.answer
                        ? `✓ Correct! +1 for ${names[room.current_turn]}`
                        : "✗ Wrong"}
                    </div>
                    <p className="text-sm text-muted-foreground">{current.explain}</p>
                    <button
                      onClick={nextTurn}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.01] transition-transform"
                    >
                      {room.current_round === ROUNDS - 1 && room.current_turn === 1 ? "See the winner" : "Next turn"}{" "}
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
                onClick={leaveRoom}
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
