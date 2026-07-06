import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { ChatImage } from "@/components/ChatImage";
import { ImageAttachButtons, ImagePreview } from "@/components/ImageComposer";
import { useProfile, fetchProfile, type Profile } from "@/lib/profile";
import { uploadChatImage, deleteChatImage } from "@/lib/chatImage";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, ArrowLeft, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dms/$threadId")({
  component: DmThread,
  head: () => ({
    meta: [
      { title: "Private chat · Scholly.AI" },
      { name: "description", content: "Private 1‑to‑1 conversation on Scholly.AI." },
    ],
  }),
});

interface DmMsg {
  id: string;
  thread_id: string;
  author_id: string;
  content: string | null;
  image_path: string | null;
  created_at: string;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function DmThread() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const { uid, profile, loading: profileLoading } = useProfile();
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DmMsg[]>([]);
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  // Load thread + messages, verify current user is a participant
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: thread } = await supabase
        .from("dm_threads")
        .select("id, user_a, user_b")
        .eq("id", threadId)
        .maybeSingle();
      if (cancelled) return;
      if (!thread || (thread.user_a !== uid && thread.user_b !== uid)) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }
      const otherId = thread.user_a === uid ? thread.user_b : thread.user_a;
      const [{ data: msgs }, otherProfile] = await Promise.all([
        supabase
          .from("dm_messages")
          .select("id, thread_id, author_id, content, image_path, created_at")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true })
          .limit(500),
        fetchProfile(otherId),
      ]);
      if (cancelled) return;
      setMessages((msgs ?? []) as DmMsg[]);
      setOther(otherProfile);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, uid]);

  // Realtime new messages
  useEffect(() => {
    const channel = supabase
      .channel(`dm_thread_${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as DmMsg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.old as { id: string };
          setMessages((prev) => prev.filter((x) => x.id !== m.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

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

  const send = async () => {
    if (!profile) return;
    const content = input.trim();
    if ((!content && !pendingFile) || sending) return;
    setSending(true);
    setError(null);
    stickRef.current = true;
    try {
      let image_path: string | null = null;
      if (pendingFile) image_path = await uploadChatImage(pendingFile, uid);
      const { error } = await supabase.from("dm_messages").insert({
        thread_id: threadId,
        author_id: uid,
        content: content ? content.slice(0, 2000) : null,
        image_path,
      });
      if (error) throw error;
      setInput("");
      setPendingFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (m: DmMsg) => {
    if (m.author_id !== uid) return;
    if (!confirm("Delete this message?")) return;
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    if (m.image_path) await deleteChatImage(m.image_path);
    await supabase.from("dm_messages").delete().eq("id", m.id).eq("author_id", uid);
  };

  if (profileLoading || (loading && !notAllowed)) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (notAllowed) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <h2 className="font-display text-xl font-semibold">Conversation not found</h2>
          <p className="text-sm text-muted-foreground mt-2">This chat doesn't exist or isn't yours.</p>
          <Link
            to="/dms"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-gold-foreground glow-gold"
          >
            Back to inbox
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-3xl pb-24 md:pb-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate({ to: "/dms" })}
            className="h-10 w-10 grid place-items-center rounded-full bg-secondary hover:bg-secondary/70"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <UserAvatar avatarId={other?.avatar_id} name={other?.display_name} size={44} ring />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold truncate">
              {other?.display_name ?? "Scholar"}
            </h1>
            <p className="text-xs text-muted-foreground">Private chat</p>
          </div>
        </div>

        <div className="glass rounded-3xl flex flex-col h-[calc(100dvh-14rem)] min-h-[420px] md:h-[70vh] overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <h2 className="font-display text-lg font-semibold">Say hello 👋</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  This is the start of your conversation with {other?.display_name ?? "this scholar"}.
                </p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.author_id === uid;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="pt-1">
                    <UserAvatar
                      avatarId={mine ? profile?.avatar_id : other?.avatar_id}
                      name={mine ? profile?.display_name : other?.display_name}
                      size={28}
                    />
                  </div>
                  <div className={`flex flex-col min-w-0 max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                    <div className="text-[11px] text-muted-foreground mb-1 px-1 flex items-center gap-2">
                      <span>{timeLabel(m.created_at)}</span>
                      {mine && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(m)}
                          className="text-destructive hover:opacity-80"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 items-start">
                      {m.image_path && (
                        <ChatImage
                          path={m.image_path}
                          mine={mine}
                          onDelete={mine ? () => deleteMessage(m) : undefined}
                        />
                      )}
                      {m.content && (
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                            mine
                              ? "bg-gradient-primary text-primary-foreground rounded-tr-sm"
                              : "bg-card border border-border rounded-tl-sm"
                          }`}
                        >
                          {m.content}
                        </div>
                      )}
                    </div>
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
            className="border-t border-border p-3 md:p-4 flex flex-col gap-2"
          >
            {pendingFile && (
              <ImagePreview file={pendingFile} uploading={sending} onClear={() => setPendingFile(null)} />
            )}
            <div className="flex items-end gap-2">
              <ImageAttachButtons disabled={sending} onPick={setPendingFile} />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Message…"
                rows={1}
                maxLength={2000}
                className="flex-1 resize-none bg-secondary rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground max-h-40"
              />
              <button
                type="submit"
                disabled={sending || (!input.trim() && !pendingFile)}
                className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-gold grid place-items-center text-gold-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.05] transition-transform glow-gold"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
