import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Bot, User, Loader2 } from "lucide-react";

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

function TutorPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }, { role: "assistant", content: "" }];
    setMessages(next);
    setStreaming(true);

    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(0, -1) }),
      });
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl">
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

        <div className="glass rounded-3xl flex flex-col h-[70vh] overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="h-16 w-16 rounded-3xl bg-gradient-gold grid place-items-center glow-gold mb-4">
                  <Sparkles className="h-7 w-7 text-gold-foreground" />
                </div>
                <h2 className="font-display text-2xl font-semibold">Ask Scholly anything</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">Pick a starter or type your own question. Scholly streams answers in real-time.</p>
                <div className="mt-6 grid sm:grid-cols-2 gap-2 w-full max-w-xl">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left text-sm rounded-xl bg-secondary hover:bg-secondary transition-colors p-3 border border-border">
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
                  {m.content || (streaming && i === messages.length - 1
                    ? <span className="inline-flex gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" /><span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} /><span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} /></span>
                    : "")}
                </div>
              </div>
            ))}

            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                {error}
              </div>
            )}
          </div>

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
              placeholder="Ask about any WAEC topic…"
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
        </div>
      </div>
    </AppShell>
  );
}
