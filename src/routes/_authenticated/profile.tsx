import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AvatarPicker } from "@/components/AvatarPicker";
import { useMyProfile } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your Profile · Scholly.AI" },
      { name: "description", content: "Edit your Scholly display name and avatar." },
    ],
  }),
});

function ProfilePage() {
  const { profile, loading, save } = useMyProfile();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [avatarId, setAvatarId] = useState(1);
  const [school, setSchool] = useState("");
  const [course, setCourse] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setAvatarId(profile.avatar_id);
      setSchool(profile.school ?? "");
      setCourse(profile.course ?? "");
    }
  }, [profile]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await save({ display_name: displayName, avatar_id: avatarId, school, course });
      setMsg("Saved!");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-10 max-w-lg pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold">Your profile</h1>
          <Link to="/community" className="text-sm text-gold hover:underline">
            ← Feed
          </Link>
        </div>

        <form onSubmit={onSave} className="glass rounded-3xl p-6 space-y-5">
          <AvatarPicker value={avatarId} onChange={setAvatarId} />

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              required
              className="mt-1 w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              School / University
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              maxLength={80}
              placeholder="e.g. USET, The Gambia"
              className="mt-1 w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Course / Department
            </label>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              maxLength={80}
              placeholder="e.g. Electrical Engineering"
              className="mt-1 w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {err && <div className="rounded-lg bg-destructive/10 border border-destructive/40 p-3 text-xs">{err}</div>}
          {msg && <div className="rounded-lg bg-primary/10 border border-primary/40 p-3 text-xs">{msg}</div>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-gradient-gold py-3 text-sm font-semibold text-gold-foreground glow-gold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save profile
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
