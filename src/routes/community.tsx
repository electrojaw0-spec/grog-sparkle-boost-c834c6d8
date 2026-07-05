import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Users, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/community")({
  component: CommunityPage,
  head: () => ({
    meta: [
      { title: "Community Chat · Scholly.AI" },
      { name: "description", content: "Chat with other WAEC students. Ask for help, share ideas, study together." },
      { property: "og:title", content: "Community Chat · Scholly.AI" },
      { property: "og:description", content: "Chat with other WAEC students. Ask for help, share ideas, study together." },
    ],
  }),
});

interface Msg {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

const NAME_KEY = "scholly_community_name";
const UID_KEY = "scholly_community_uid";

function ensureUid(): string {
  if (typeof window === "undefined") return "";
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(UID_KEY, uid);
  }
  return uid;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CommunityPage() {
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    setUid(ensureUid());
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) setName(saved);
  }, []);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("community_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (error) setError(error.message);
      else setMessages((data ?? []) as Msg[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("community_messages_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = distance < 80;
  }, []);

  useEffect(() => {
    if (!stickRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const saveName = () => {
    const n = nameDraft.trim().slice(0, 40);
    if (!n) return;
    localStorage.setItem(NAME_KEY, n);
    setName(n);
  };

  const send = async () => {
    const content = input.trim();
    if (!content || sending || !name) return;
    setSending(true);
    setError(null);
    stickRef.current = true;
    const { error } = await supabase.from("community_messages").insert({
      author_id: uid,
      author_name: name,
      content: content.slice(0, 1000),
    });
    if (error) setError(error.message);
    else setInput("");
    setSending(false);
  };

  // Name gate
  if (!name) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-10 pb-24 md:pb-10 max-w-md">
          <div className="glass rounded-3xl p-6 md:p-8 text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-primary grid place-items-center glow mb-4">
              <Users className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">Join the Community</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Pick a display name to chat with other WAEC scholars. Ask questions, share tips, study together.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                placeholder="Your name (e.g. Ada from Lagos)"
                maxLength={40}
                className="bg-secondary rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={saveName}
                disabled={!nameDraft.trim()}
                className="rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-bold text-gold-foreground disabled:opacity-40 hover:scale-[1.02] transition-transform glow-gold"
              >
                Enter Chat
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl pb-24 md:pb-10">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center glow">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Community</h1>
              <p className="text-xs text-muted-foreground">
                Chatting as <span className="text-gold font-semibold">{name}</span> ·{" "}
                <button className="underline hover:text-foreground" onClick={() => setName("")}>
                  change
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl flex flex-col h-[calc(100dvh-16rem)] min-h-[420px] md:h-[70vh] overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3"
          >
            {loading && (
              <div className="h-full grid place-items-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <h2 className="font-display text-xl font-semibold">Be the first to say hi</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  Ask a question, share a study tip, or start a discussion about any WAEC subject.
                </p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.author_id === uid;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div className="text-[11px] text-muted-foreground mb-1 px-1">
                    <span className={mine ? "text-gold font-semibold" : "font-semibold text-foreground"}>
                      {mine ? "You" : m.author_name}
                    </span>{" "}
                    · {timeLabel(m.created_at)}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                      mine
                        ? "bg-gradient-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-border p-3 md:p-4 flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask for help or share an idea…"
              rows={1}
              maxLength={1000}
              className="flex-1 resize-none bg-secondary rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground max-h-40"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-gold grid place-items-center text-gold-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.05] transition-transform glow-gold"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
