import { useEffect, useState } from "react";
import { Sparkles, ExternalLink, Loader2, Check, Lock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


const STORAGE_KEY = "scholly_tutor_access_until";

export function useTutorAccess() {
  const [until, setUntil] = useState<number | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (n > Date.now()) setUntil(n);
    }
  }, []);
  return {
    until,
    hasAccess: until !== null && until > Date.now(),
    grant: (ms: number) => {
      const t = Date.now() + ms;
      localStorage.setItem(STORAGE_KEY, String(t));
      setUntil(t);
    },
  };
}

export function TutorPaywall({ onUnlock }: { onUnlock: (until: number) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from("access_codes")
        .select("id, plan, used")
        .eq("code", trimmed)
        .maybeSingle();
      if (qErr) throw new Error(qErr.message);
      if (!data) throw new Error("Invalid code");
      if (data.used) throw new Error("This code has already been used");

      const ms = data.plan === "month" ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + ms).toISOString();

      const { error: uErr } = await supabase
        .from("access_codes")
        .update({ used: true, redeemed_at: new Date().toISOString(), expires_at: expiresAt })
        .eq("id", data.id);
      if (uErr) throw new Error(uErr.message);

      onUnlock(Date.now() + ms);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not redeem code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-xl">
      <div className="glass rounded-3xl p-6 md:p-8 text-center">
        <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-gold grid place-items-center glow-gold mb-4">
          <Lock className="h-7 w-7 text-gold-foreground" />
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Unlock the AI Tutor</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Pay with Wave, then enter the access code we send you on WhatsApp.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-left">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">1 week</div>
            <div className="font-display text-2xl font-bold mt-1">D10</div>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-card p-4 text-left relative">
            <div className="absolute -top-2 right-3 text-[10px] bg-gradient-gold text-gold-foreground px-2 py-0.5 rounded-full font-semibold">Best</div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">1 month</div>
            <div className="font-display text-2xl font-bold mt-1">D50</div>
          </div>
        </div>

        <div className="mt-5 inline-flex flex-col items-center gap-2 w-full rounded-2xl bg-[#0055FF]/10 border border-[#0055FF]/30 px-6 py-4 text-sm">
          <p className="font-medium text-[#0055FF]">Send on Wave to</p>
          <p className="font-display text-2xl font-bold text-white">+220 369 2876</p>
          <p className="text-xs text-muted-foreground">Include your name, then message us on WhatsApp</p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          After paying, send your payment screenshot on
          <a
            href="https://wa.me/2203692876?text=Hi%2C%20I%20just%20paid%20for%20Scholly%20AI%20Tutor%20access"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[#25D366] hover:underline font-medium ml-0.5"
          >
            <MessageCircle className="h-3 w-3" /> WhatsApp
          </a>
          {" "}to get your code.
        </p>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          <span>then</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={redeem} className="space-y-3 text-left">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Enter your access code
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={32}
              placeholder="e.g. SCHO-1234"
              className="flex-1 bg-secondary rounded-2xl px-4 h-12 text-sm tracking-wider font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="h-12 px-5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Unlock
            </button>
          </div>
          {error && <div className="text-xs text-destructive">{error}</div>}
        </form>
      </div>
    </div>
  );
}
