import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Sparkles, Bot, User, Loader2, Lock, MessageCircle } from "lucide-react";
import { TutorPaywall, useTutorAccess } from "@/components/TutorPaywall";

export const Route = createFileRoute("/tutor")({
  component: TutorPage,
  head: () => ({
    meta: [
      { title: "AI Tutor · Scholly.AI" },
      { name: "description", content: "Chat with the Scholly AI tutor for instant WAEC explanations." },
    ],
  }),
});

interface Msg { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "Explain quadratic equations with an example",
  "What's the difference between mitosis and meiosis?",
  "Summarize Things Fall Apart chapter 1",
  "Solve: 3x + 7 = 22",
];

const FREE_LIMIT = 7;
const FREE_KEY = "scholly_tutor_free_used";

function TutorPage() {
  const access = useTutorAccess();
  const [freeUsed, setFreeUsed] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem(FREE_KEY);
    setFreeUsed(raw ? parseInt(raw, 10) || 0 : 0);
  }, []);

  const freeLeft = Math.max(0, FREE_LIMIT - freeUsed);
  const outOfFree = !access.hasAccess && freeUsed >= FREE_LIMIT;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullPaywall, setShowFullPaywall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Typewriter: target holds the full accumulated stream; liveText is what's shown.
  const targetRef = useRef<string>("");
  const streamingRef = useRef<boolean>(false);
  const [liveText, setLiveText] = useState<string>("");
  const [liveActive, setLiveActive] = useState<boolean>(false);
  const rafRef = useRef<number | null>(null);

  const stickToBottomRef = useRef<boolean>(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 40;
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, liveText, streaming]);

  useEffect(() => {
    if (outOfFree) setShowFullPaywall(true);
  }, [outOfFree]);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const startTypewriter = useCallback((onDrained: () => void) => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    let displayed = 0;
    let nextAllowedTs = performance.now();
    // ~33 chars/sec baseline (~30ms/char). Slight extra pauses at punctuation.
    const MS_PER_CHAR = 30;
    const PAUSE_AFTER: Record<string, number> = {
      ",": 120, ";": 140, ":": 120,
      ".": 220, "!": 220, "?": 220,
      "\n": 180,
    };
    const tick = (ts: number) => {
      const target = targetRef.current;
      // Advance one char at a time, honoring punctuation pauses.
      while (displayed < target.length && ts >= nextAllowedTs) {
        const ch = target[displayed];
        displayed += 1;
        // If buffer is very far ahead (network burst), gently catch up
        // by shortening the per-char delay — never skip characters.
        const backlog = target.length - displayed;
        const speedup = backlog > 200 ? 0.35 : backlog > 80 ? 0.6 : 1;
        const base = MS_PER_CHAR * speedup;
        const pause = (PAUSE_AFTER[ch] ?? 0) * speedup;
        nextAllowedTs = ts + base + pause;
      }
      setLiveText(target.slice(0, displayed));
      if (displayed < targetRef.current.length || streamingRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        onDrained();
      }

    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    if (!access.hasAccess && freeUsed >= FREE_LIMIT) {
      setShowFullPaywall(true);
      return;
    }
    setError(null);
    setInput("");
    const baseMessages: Msg[] = [...messages, { role: "user", content }];
    setMessages(baseMessages);
    stickToBottomRef.current = true;
    setStreaming(true);
    streamingRef.current = true;
    targetRef.current = "";
    setLiveText("");
    setLiveActive(true);
    if (!access.hasAccess) {
      const nu = freeUsed + 1;
      setFreeUsed(nu);
      localStorage.setItem(FREE_KEY, String(nu));
    }

    startTypewriter(() => {
      const finalText = targetRef.current;
      setLiveActive(false);
      setLiveText("");
      if (finalText) {
        setMessages((prev) => [...prev, { role: "assistant", content: finalText }]);
      }
    });

    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: baseMessages }),
      });
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        targetRef.current += decoder.decode(value, { stream: true });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setLiveActive(false);
      setLiveText("");
      targetRef.current = "";
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    } finally {
      setStreaming(false);
      streamingRef.current = false;
    }
  }, [input, streaming, freeUsed, access.hasAccess, messages, startTypewriter]);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl pb-24 md:pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center glow">
            <Bot className="h-6 w-6 text-primary-foreground" />
            <span className="absolute inset-0 rounded-2xl animate-pulse-ring" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Scholly Tutor</h1>
            <p className="text-xs text-muted-foreground">Online · Trained on the WAEC syllabus</p>
          </div>
        </div>

        {/* Prominent free trial counter */}
        {!access.hasAccess && (
          <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/5 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" />
                <span className="text-sm font-medium text-gold-foreground">
                  Free trial: <span className="font-bold text-gold">{freeLeft}</span> of {FREE_LIMIT} messages left
                </span>
              </div>
              {outOfFree ? (
                <button
                  onClick={() => setShowFullPaywall(true)}
                  className="text-sm font-bold text-gold hover:underline animate-pulse"
                >
                  Unlock →
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {freeLeft === 1 ? "1 message remaining" : `${freeLeft} messages remaining`}
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-gold transition-all duration-500"
                style={{ width: `${(freeLeft / FREE_LIMIT) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="glass rounded-3xl flex flex-col h-[calc(100dvh-16rem)] min-h-[420px] md:h-[70vh] overflow-hidden">
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="h-16 w-16 rounded-3xl bg-gradient-gold grid place-items-center glow-gold mb-4">
                  <Sparkles className="h-7 w-7 text-gold-foreground" />
                </div>
                <h2 className="font-display text-2xl font-semibold">Ask Scholly anything</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">Pick a starter or type your own question. Scholly streams answers in real-time.</p>
                <div className="mt-6 grid sm:grid-cols-2 gap-2 w-full max-w-xl">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={outOfFree}
                      className="text-left text-sm rounded-xl bg-secondary hover:bg-secondary/80 transition-colors p-3 border border-border disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 shrink-0 rounded-xl grid place-items-center ${
                  m.role === "user" ? "bg-gradient-gold" : "bg-gradient-primary"
                }`}>
                  {m.role === "user"
                    ? <User className="h-4 w-4 text-gold-foreground" />
                    : <Bot className="h-4 w-4 text-primary-foreground" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-gradient-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border rounded-tl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {liveActive && (
              <div className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-xl grid place-items-center bg-gradient-primary">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap bg-card border border-border rounded-tl-sm">
                  {liveText.length === 0 ? (
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </span>
                  ) : (
                    <>
                      {liveText}
                      <span className="inline-block w-[2px] h-4 -mb-0.5 ml-0.5 bg-primary align-middle animate-pulse" />
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                {error}
              </div>
            )}
          </div>

          {/* Input area — replaced with paywall CTA when out of free messages */}
          {outOfFree && !access.hasAccess ? (
            <div className="border-t border-border p-4 md:p-5 bg-card/50">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex items-center gap-2 text-gold">
                  <Lock className="h-5 w-5" />
                  <span className="font-semibold text-sm">You've used all {FREE_LIMIT} free messages</span>
                </div>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Unlock unlimited access to keep chatting with Scholly Tutor.
                </p>
                <button
                  onClick={() => setShowFullPaywall(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-gold px-6 py-2.5 text-sm font-bold text-gold-foreground hover:scale-[1.02] transition-transform glow-gold"
                >
                  <Sparkles className="h-4 w-4" />
                  Unlock Unlimited Tutoring
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="border-t border-border p-3 md:p-4 flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={freeLeft <= 2 && !access.hasAccess ? `Only ${freeLeft} free message${freeLeft === 1 ? "" : "s"} left…` : "Ask about any WAEC topic…"}
                rows={1}
                className="flex-1 resize-none bg-secondary rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground max-h-40"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-gold grid place-items-center text-gold-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.05] transition-transform glow-gold"
              >
                {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Full-screen paywall overlay */}
      {showFullPaywall && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowFullPaywall(false)}
              className="h-10 w-10 rounded-full bg-secondary grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          <TutorPaywall
            onUnlock={(until) => {
              access.grant(until - Date.now());
              setShowFullPaywall(false);
            }}
            reason={outOfFree ? `You've used your ${FREE_LIMIT} free messages. Unlock unlimited tutoring to keep going.` : undefined}
          />
        </div>
      )}
    </AppShell>
  );
}
