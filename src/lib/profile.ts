import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const AVATAR_COUNT = 100;
const UID_KEY = "scholly_community_uid";
const NAME_KEY = "scholly_community_name";
const AVATAR_KEY = "scholly_avatar_id";

export interface Profile {
  uid: string;
  display_name: string;
  avatar_id: number;
}

export function ensureUid(): string {
  if (typeof window === "undefined") return "";
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(UID_KEY, uid);
  }
  return uid;
}

// Deterministic colorful avatars (100 unique). No auth, browser-cached SVGs.
export function avatarUrl(id: number): string {
  const seed = `scholly-${((id % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT || AVATAR_COUNT}`;
  const bg = "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,d8f3dc,fdf7c3,ffe5d9";
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&backgroundType=gradientLinear&radius=50`;
}

// Cache of uid -> profile (reduces refetches when rendering many messages).
const profileCache = new Map<string, Profile>();
const pending = new Map<string, Promise<Profile | null>>();

export async function fetchProfile(uid: string): Promise<Profile | null> {
  if (profileCache.has(uid)) return profileCache.get(uid)!;
  if (pending.has(uid)) return pending.get(uid)!;
  const p: Promise<Profile | null> = (async () => {
    const { data } = await supabase
      .from("profiles")
      .select("uid, display_name, avatar_id")
      .eq("uid", uid)
      .maybeSingle();
    if (data) profileCache.set(uid, data as Profile);
    pending.delete(uid);
    return (data as Profile | null) ?? null;
  })();
  pending.set(uid, p);
  return p;
}

export function primeProfile(p: Profile) {
  profileCache.set(p.uid, p);
}

export function useProfile() {
  const [uid, setUid] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = ensureUid();
    setUid(u);
    (async () => {
      const remote = await fetchProfile(u);
      if (remote) {
        setProfile(remote);
      } else {
        // Migrate any legacy localStorage-only profile.
        const legacyName = localStorage.getItem(NAME_KEY);
        const legacyAvatar = Number(localStorage.getItem(AVATAR_KEY) || 0);
        if (legacyName) {
          setProfile({ uid: u, display_name: legacyName, avatar_id: legacyAvatar || 1 });
        }
      }
      setLoading(false);
    })();
  }, []);

  const save = useCallback(
    async (data: { display_name: string; avatar_id: number }): Promise<Profile> => {
      const u = uid || ensureUid();
      const row = { uid: u, display_name: data.display_name.trim().slice(0, 40), avatar_id: data.avatar_id };
      const { error } = await supabase.from("profiles").upsert(row, { onConflict: "uid" });
      if (error) throw error;
      localStorage.setItem(NAME_KEY, row.display_name);
      localStorage.setItem(AVATAR_KEY, String(row.avatar_id));
      profileCache.set(u, row);
      setProfile(row);
      return row;
    },
    [uid],
  );

  return { uid, profile, loading, save, setProfile };
}
