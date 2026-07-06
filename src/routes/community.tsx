import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProfileSetup } from "@/components/ProfileSetup";
import { UserAvatar } from "@/components/UserAvatar";
import { ChatImage } from "@/components/ChatImage";
import { ImageAttachButtons, ImagePreview } from "@/components/ImageComposer";
import { useProfile, fetchProfile, primeProfile, type Profile } from "@/lib/profile";
import { uploadChatImage, deleteChatImage } from "@/lib/chatImage";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Users, MessageCircle, Loader2, Trash2, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/community")({
  component: CommunityPage,
  head: () => ({
    meta: [
      { title: "Community Chat · Scholly.AI" },
      { name: "description", content: "Chat with other WAEC students. Share notes, ask questions, help each other study." },
      { property: "og:title", content: "Community Chat · Scholly.AI" },
      { property: "og:description", content: "Chat with other WAEC students. Share notes, ask questions, help each other study." },
    ],
  }),
});

interface Msg {
  id: string;
  author_id: string;
  author_name: string;
  content: string | null;
  image_path: string | null;
  created_at: string;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CommunityPage() {
  const { uid, profile, loading: profileLoading, save } = useProfile();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorAvatars, setAuthorAvatars] = useState<Record<string, Profile>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("community_messages")
        .select("id, author_id, author_name, content, image_path, created_at")
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

  // Prime avatar lookups for message authors
  useEffect(() => {
    const missing = Array.from(new Set(messages.map((m) => m.author_id))).filter(
      (id) => id && id !== uid && !authorAvatars[id],
    );
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(missing.map((id) => fetchProfile(id)));
      if (cancelled) return;
      const next: Record<string, Profile> = {};
      results.forEach((p, i) => {
        if (p) next[missing[i]] = p;
      });
      if (Object.keys(next).length) setAuthorAvatars((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, uid, authorAvatars]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("community_messages_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (payload) => {
        const m = payload.old as { id: string };
        setMessages((prev) => prev.filter((x) => x.id !== m.id));
      })
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

  const openDm = useCallback(
    async (otherUid: string, otherName: string, otherAvatar: number) => {
      if (!profile) return;
      if (otherUid === uid) return;
      const [a, b] = [uid, otherUid].sort();
      // Ensure the other user has a profile row we can reference in the inbox
      await supabase
        .from("profiles")
        .upsert({ uid: otherUid, display_name: otherName, avatar_id: otherAvatar }, { onConflict: "uid" });
      const { data: existing } = await supabase
        .from("dm_threads")
        .select("id")
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();
      let threadId = existing?.id;
      if (!threadId) {
        const { data: created, error } = await supabase
          .from("dm_threads")
          .insert({ user_a: a, user_b: b })
          .select("id")
          .single();
        if (error || !created) {
          setError(error?.message ?? "Could not start conversation");
          return;
        }
        threadId = created.id;
      }
      navigate({ to: "/dms/$threadId", params: { threadId } });
    },
    [uid, profile, navigate],
  );

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
      const { error } = await supabase.from("community_messages").insert({
        author_id: uid,
        author_name: profile.display_name,
        content: content ? content.slice(0, 1000) : null,
        image_path,
      });
      if (error) throw error;
      setInput("");
      setPendingFile(null);
      // Refresh own profile in case name/avatar changed
      primeProfile(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (m: Msg) => {
    if (m.author_id !== uid) return;
    if (!confirm("Delete this message?")) return;
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    if (m.image_path) await deleteChatImage(m.image_path);
    await supabase.from("community_messages").delete().eq("id", m.id).eq("author_id", uid);
  };

  if (profileLoading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <ProfileSetup
        title="Join the Community"
        subtitle="Pick a display name and choose one of 100 avatars to start chatting with other scholars."
        onSave={async (data) => {
          await save(data);
        }}
        ctaLabel="Enter Chat"
      />
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
                Chatting as <span className="text-gold font-semibold">{profile.display_name}</span>
              </p>
            </div>
          </div>
          <UserAvatar
            avatarId={profile.avatar_id}
            name={profile.display_name}
            size={40}
            ring
            onClick={() => navigate({ to: "/profile" })}
          />
        </div>

        <div className="glass rounded-3xl flex flex-col h-[calc(100dvh-16rem)] min-h-[420px] md:h-[70vh] overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
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
              const otherProfile = authorAvatars[m.author_id];
              const avatarId = mine ? profile.avatar_id : otherProfile?.avatar_id;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="pt-5">
                    <UserAvatar
                      avatarId={avatarId}
                      name={m.author_name}
                      size={32}
                      onClick={
                        mine
                          ? undefined
                          : () =>
                              openDm(m.author_id, m.author_name, otherProfile?.avatar_id ?? 1)
                      }
                    />
                  </div>
                  <div className={`flex flex-col min-w-0 max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                    <div className="text-[11px] text-muted-foreground mb-1 px-1 flex items-center gap-2">
                      <span
                        className={mine ? "text-gold font-semibold" : "font-semibold text-foreground cursor-pointer hover:underline"}
                        onClick={
                          mine
                            ? undefined
                            : () => openDm(m.author_id, m.author_name, otherProfile?.avatar_id ?? 1)
                        }
                      >
                        {mine ? "You" : m.author_name}
                      </span>
                      <span>· {timeLabel(m.created_at)}</span>
                      {!mine && (
                        <button
                          type="button"
                          onClick={() =>
                            openDm(m.author_id, m.author_name, otherProfile?.avatar_id ?? 1)
                          }
                          className="ml-1 text-primary hover:underline inline-flex items-center gap-1"
                          aria-label={`Message ${m.author_name} privately`}
                        >
                          <MessageSquare className="h-3 w-3" /> DM
                        </button>
                      )}
                      {mine && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(m)}
                          className="ml-1 text-destructive hover:opacity-80"
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
                placeholder="Ask for help or share an idea…"
                rows={1}
                maxLength={1000}
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
