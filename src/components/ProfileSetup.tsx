import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AvatarPicker } from "@/components/AvatarPicker";
import { UserAvatar } from "@/components/UserAvatar";
import { Loader2, Sparkles } from "lucide-react";
import type { Profile } from "@/lib/profile";

interface Props {
  initial?: Partial<Profile>;
  title?: string;
  subtitle?: string;
  onSave: (data: { display_name: string; avatar_id: number }) => Promise<void>;
  ctaLabel?: string;
}

export function ProfileSetup({ initial, title, subtitle, onSave, ctaLabel }: Props) {
  const [name, setName] = useState(initial?.display_name ?? "");
  const [avatarId, setAvatarId] = useState(initial?.avatar_id ?? 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const n = name.trim();
    if (n.length < 2) {
      setErr("Please enter a name (at least 2 characters).");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await onSave({ display_name: n, avatar_id: avatarId });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-12 max-w-2xl">
        <div className="glass rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <UserAvatar avatarId={avatarId} name={name} size={64} ring />
            <div>
              <h1 className="font-display text-2xl font-bold">{title ?? "Set up your profile"}</h1>
              <p className="text-sm text-muted-foreground">
                {subtitle ?? "Pick a display name and one of 100 avatars. You can change them later."}
              </p>
            </div>
          </div>

          <label className="text-sm font-medium">Display name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ada from Lagos"
            maxLength={40}
            className="mt-2 w-full bg-secondary rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">Choose your avatar</label>
              <span className="text-xs text-muted-foreground">#{avatarId} of 100</span>
            </div>
            <div className="mt-2 rounded-2xl border border-border bg-background/30 p-2">
              <AvatarPicker selected={avatarId} onSelect={setAvatarId} />
            </div>
          </div>

          {err && (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
              {err}
            </div>
          )}

          <button
            onClick={submit}
            disabled={saving || name.trim().length < 2}
            className="mt-6 w-full rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-bold text-gold-foreground disabled:opacity-40 hover:scale-[1.01] transition-transform glow-gold flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {ctaLabel ?? "Save profile"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
