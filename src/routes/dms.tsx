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
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

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
          <div>
            <h1 className="font-display text-2xl font-bold">Private chats</h1>
            <p className="text-xs text-muted-foreground">1‑to‑1 conversations. Tap any Community user's avatar to start one.</p>
          </div>
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
                Head to the Community, tap another scholar's avatar or name, and send them a private message.
              </p>
              <Link
                to="/community"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-gold-foreground glow-gold hover:scale-[1.02] transition-transform"
              >
                Go to Community
              </Link>
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
    </AppShell>
  );
}
