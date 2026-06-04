import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Loader2, Plus, Trash2, RefreshCw, Copy, Check, Ban } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin · Scholly.AI" }, { name: "robots", content: "noindex" }] }),
});

// Change this passphrase to whatever you want — only people who know it can manage codes.
const ADMIN_PASSWORD = "scholly-admin-2026";
const AUTH_KEY = "scholly_admin_ok";

type Code = {
  id: string;
  code: string;
  plan: string;
  used: boolean;
  redeemed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

function randomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "SCHO-";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(AUTH_KEY) === "1") setAuthed(true);
  }, []);

  if (!authed) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-12 max-w-sm">
          <div className="glass rounded-3xl p-6 text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-gold grid place-items-center glow-gold mb-4">
              <Lock className="h-6 w-6 text-gold-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">Admin</h1>
            <p className="text-xs text-muted-foreground mt-1">Enter the admin passphrase</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pwd === ADMIN_PASSWORD) {
                  localStorage.setItem(AUTH_KEY, "1");
                  setAuthed(true);
                } else setErr("Wrong passphrase");
              }}
              className="mt-5 space-y-3"
            >
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Passphrase"
                className="w-full bg-secondary rounded-2xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold">
                Unlock
              </button>
              {err && <div className="text-xs text-destructive">{err}</div>}
            </form>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CodesManager onLogout={() => { localStorage.removeItem(AUTH_KEY); setAuthed(false); }} />
    </AppShell>
  );
}

function CodesManager({ onLogout }: { onLogout: () => void }) {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "available" | "used">("all");
  const [genPlan, setGenPlan] = useState<"week" | "month">("week");
  const [genCount, setGenCount] = useState(5);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    else setCodes((data as Code[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    setBusy(true); setMsg(null);
    try {
      const rows = Array.from({ length: Math.max(1, Math.min(100, genCount)) }, () => ({
        code: randomCode(), plan: genPlan,
      }));
      const { error } = await supabase.from("access_codes").insert(rows);
      if (error) throw error;
      setMsg(`Generated ${rows.length} ${genPlan} code(s)`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to generate");
    } finally { setBusy(false); }
  }

  async function deactivate(c: Code) {
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from("access_codes")
      .update({ used: true, redeemed_at: c.redeemed_at ?? new Date().toISOString() })
      .eq("id", c.id);
    if (error) setMsg(error.message); else await load();
    setBusy(false);
  }

  async function reactivate(c: Code) {
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from("access_codes")
      .update({ used: false, redeemed_at: null, expires_at: null })
      .eq("id", c.id);
    if (error) setMsg(error.message); else await load();
    setBusy(false);
  }

  async function regenerate(c: Code) {
    setBusy(true); setMsg(null);
    const newCode = randomCode();
    const { error } = await supabase
      .from("access_codes")
      .update({ code: newCode, used: false, redeemed_at: null, expires_at: null })
      .eq("id", c.id);
    if (error) setMsg(error.message); else await load();
    setBusy(false);
  }

  async function remove(c: Code) {
    if (!confirm(`Delete code ${c.code}?`)) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.from("access_codes").delete().eq("id", c.id);
    if (error) setMsg(error.message); else await load();
    setBusy(false);
  }

  async function copy(c: Code) {
    await navigator.clipboard.writeText(c.code);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId((id) => (id === c.id ? null : id)), 1200);
  }

  const filtered = codes.filter((c) =>
    filter === "all" ? true : filter === "used" ? c.used : !c.used
  );

  const stats = {
    total: codes.length,
    available: codes.filter((c) => !c.used).length,
    used: codes.filter((c) => c.used).length,
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Access Codes</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total} total · {stats.available} available · {stats.used} used
          </p>
        </div>
        <button onClick={onLogout} className="text-xs text-muted-foreground hover:text-foreground underline">
          Sign out
        </button>
      </div>

      <div className="glass rounded-3xl p-4 md:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Plan</label>
            <select
              value={genPlan}
              onChange={(e) => setGenPlan(e.target.value as "week" | "month")}
              className="block mt-1 bg-secondary rounded-xl px-3 h-10 text-sm focus:outline-none"
            >
              <option value="week">1 week (D10)</option>
              <option value="month">1 month (D50)</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Quantity</label>
            <input
              type="number" min={1} max={100}
              value={genCount}
              onChange={(e) => setGenCount(parseInt(e.target.value || "1", 10))}
              className="block mt-1 w-24 bg-secondary rounded-xl px-3 h-10 text-sm focus:outline-none"
            />
          </div>
          <button
            disabled={busy}
            onClick={generate}
            className="h-10 px-4 rounded-xl bg-gradient-primary text-primary-foreground font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Generate
          </button>
          <div className="ml-auto flex gap-1 bg-secondary rounded-xl p-1">
            {(["all", "available", "used"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 h-8 text-xs rounded-lg capitalize ${
                  filter === f ? "bg-card text-foreground" : "text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {msg && <div className="text-xs text-muted-foreground mt-3">{msg}</div>}
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No codes yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 p-3 md:p-4">
                <button
                  onClick={() => copy(c)}
                  className="font-mono text-sm tracking-wider bg-secondary rounded-lg px-3 py-1.5 inline-flex items-center gap-2 hover:bg-secondary/70"
                  title="Copy"
                >
                  {c.code}
                  {copiedId === c.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 opacity-60" />}
                </button>
                <span className="text-xs px-2 py-0.5 rounded-full bg-card border border-border capitalize">
                  {c.plan}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    c.used ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                  }`}
                >
                  {c.used ? "used" : "available"}
                </span>
                {c.expires_at && (
                  <span className="text-[11px] text-muted-foreground">
                    exp {new Date(c.expires_at).toLocaleDateString()}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  {c.used ? (
                    <button
                      disabled={busy} onClick={() => reactivate(c)}
                      className="text-xs px-3 h-8 rounded-lg bg-secondary hover:bg-secondary/70"
                      title="Mark as available again"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      disabled={busy} onClick={() => deactivate(c)}
                      className="text-xs px-3 h-8 rounded-lg bg-secondary hover:bg-secondary/70 inline-flex items-center gap-1"
                    >
                      <Ban className="h-3 w-3" /> Deactivate
                    </button>
                  )}
                  <button
                    disabled={busy} onClick={() => regenerate(c)}
                    className="text-xs px-3 h-8 rounded-lg bg-secondary hover:bg-secondary/70 inline-flex items-center gap-1"
                    title="Replace with a new code"
                  >
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </button>
                  <button
                    disabled={busy} onClick={() => remove(c)}
                    className="text-xs px-2 h-8 rounded-lg text-destructive hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
