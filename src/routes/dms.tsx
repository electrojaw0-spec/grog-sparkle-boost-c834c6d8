import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProfileSetup } from "@/components/ProfileSetup";
import { UserAvatar } from "@/components/UserAvatar";
import { useProfile, fetchProfile, type Profile } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Inbox, Plus, X, Search } from "lucide-react";

export const Route = createFileRoute("/dms")({
  component: DmsInbox,
  head: () => ({
    meta: [
      { title: "Private Chats · Scholly.AI" },
      { name: "description", content: "Your private conversations with other Scholly scholars." },
    ],
  }),
});

interface Thread {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  last_preview: string | null;
  other?: Profile | null;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function DmsInbox() {
  const { uid, profile, loading: profileLoading, save } = useProfile();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scholars, setScholars] = useState<Profile[]>([]);
  const [scholarsLoading, setScholarsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setPickerError(null);
    if (scholars.length > 0) return;
    setScholarsLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("uid, display_name, avatar_id")
      .neq("uid", uid)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) setPickerError(error.message);
    else setScholars((data ?? []) as Profile[]);
    setScholarsLoading(false);
  }, [uid, scholars.length]);

  const startChat = useCallback(
    async (other: Profile) => {
      if (!uid || other.uid === uid) return;
      setStarting(other.uid);
      setPickerError(null);
      const [a, b] = [uid, other.uid].sort();
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
          setPickerError(error?.message ?? "Could not start conversation");
          setStarting(null);
          return;
        }
        threadId = created.id;
      }
      setStarting(null);
      setPickerOpen(false);
      navigate({ to: "/dms/$threadId", params: { threadId } });
    },
    [uid, navigate],
  );

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("dm_threads")
        .select("id, user_a, user_b, last_message_at, last_preview")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order("last_message_at", { ascending: false });
      if (cancelled) return;
      const rows = (data ?? []) as Thread[];
      const withProfiles = await Promise.all(
        rows.map(async (t) => {
          const otherId = t.user_a === uid ? t.user_b : t.user_a;
          const other = await fetchProfile(otherId);
          return { ...t, other };
        }),
      );
      if (!cancelled) {
        setThreads(withProfiles);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Realtime updates on thread list (new/updated threads bump to top)
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel("dm_threads_inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_threads" },
        async (payload) => {
          const row = (payload.new ?? payload.old) as Thread;
          if (!row) return;
          if (row.user_a !== uid && row.user_b !== uid) return;
          const otherId = row.user_a === uid ? row.user_b : row.user_a;
          const other = await fetchProfile(otherId);
          setThreads((prev) => {
            const without = prev.filter((t) => t.id !== row.id);
            if (payload.eventType === "DELETE") return without;
            return [{ ...(payload.new as Thread), other }, ...without].sort(
              (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
            );
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

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
        title="Set up your profile"
        subtitle="Choose a display name and avatar so other scholars can recognise you in private chats."
        onSave={async (data) => {
          await save(data);
        }}
        ctaLabel="Continue to private chats"
      />
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-2xl pb-24 md:pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center glow">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold">Private chats</h1>
            <p className="text-xs text-muted-foreground">Message any scholar 1‑to‑1. Text, images, all private.</p>
          </div>
          <button
            type="button"
            onClick={openPicker}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>

        <div className="glass rounded-3xl overflow-hidden">
          {loading && (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && threads.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center px-6 py-16">
              <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
              <h2 className="font-display text-xl font-semibold">No conversations yet</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Tap <b>New chat</b> to pick a scholar and start typing — or open the Community and DM someone from there.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={openPicker}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform"
                >
                  <Plus className="h-4 w-4" /> Start new chat
                </button>
                <Link
                  to="/community"
                  className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  Browse Community
                </Link>
              </div>
            </div>
          )}

          {!loading && threads.length > 0 && (
            <ul className="divide-y divide-border">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    to="/dms/$threadId"
                    params={{ threadId: t.id }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <UserAvatar
                      avatarId={t.other?.avatar_id}
                      name={t.other?.display_name}
                      size={44}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold truncate">
                          {t.other?.display_name ?? "Unknown scholar"}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatWhen(t.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {t.last_preview ?? "Start the conversation"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4"
          onClick={() => setPickerOpen(false)}>
          <div
            className="w-full sm:max-w-lg max-h-[85dvh] bg-background border border-border rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold">Start a new chat</h3>
                <p className="text-xs text-muted-foreground">Pick a scholar to message privately.</p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-full bg-secondary hover:bg-secondary/70"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search scholars…"
                  className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {scholarsLoading && (
                <div className="grid place-items-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
              {pickerError && (
                <div className="m-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                  {pickerError}
                </div>
              )}
              {!scholarsLoading && scholars.length === 0 && !pickerError && (
                <div className="text-center py-10 text-sm text-muted-foreground px-6">
                  No other scholars yet — invite a friend or post in the Community first.
                </div>
              )}
              {!scholarsLoading && scholars.length > 0 && (
                <ul className="divide-y divide-border">
                  {scholars
                    .filter((s) =>
                      query.trim()
                        ? s.display_name.toLowerCase().includes(query.trim().toLowerCase())
                        : true,
                    )
                    .map((s) => (
                      <li key={s.uid}>
                        <button
                          type="button"
                          disabled={starting === s.uid}
                          onClick={() => startChat(s)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left disabled:opacity-60"
                        >
                          <UserAvatar avatarId={s.avatar_id} name={s.display_name} size={40} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{s.display_name}</div>
                            <div className="text-xs text-muted-foreground">Tap to open chat</div>
                          </div>
                          {starting === s.uid ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
