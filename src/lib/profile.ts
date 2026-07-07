import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Career-focused emoji avatars, 20 male/female pairs = 40 avatars.
// Ordering keeps each pair together (odd = male, even = female).
export interface AvatarDef {
  emoji: string;
  label: string;
  bg: string; // solid CSS colour behind the emoji
}

export const AVATARS: AvatarDef[] = [
  { emoji: "👨‍⚕️", label: "Doctor", bg: "#fecaca" },
  { emoji: "👩‍⚕️", label: "Doctor", bg: "#fbcfe8" },
  { emoji: "👨‍⚕️", label: "Nurse", bg: "#a5f3fc" },
  { emoji: "👩‍⚕️", label: "Nurse", bg: "#bae6fd" },
  { emoji: "👨‍🎓", label: "Student", bg: "#bfdbfe" },
  { emoji: "👩‍🎓", label: "Student", bg: "#c7d2fe" },
  { emoji: "👨‍🏫", label: "Teacher", bg: "#fde68a" },
  { emoji: "👩‍🏫", label: "Teacher", bg: "#fcd34d" },
  { emoji: "👨‍💼", label: "Banker", bg: "#e0e7ff" },
  { emoji: "👩‍💼", label: "Banker", bg: "#ddd6fe" },
  { emoji: "👨‍🔧", label: "Engineer", bg: "#e5e7eb" },
  { emoji: "👩‍🔧", label: "Engineer", bg: "#d1d5db" },
  { emoji: "👷‍♂️", label: "Builder", bg: "#fed7aa" },
  { emoji: "👷‍♀️", label: "Builder", bg: "#fdba74" },
  { emoji: "👨‍🔬", label: "Scientist", bg: "#bbf7d0" },
  { emoji: "👩‍🔬", label: "Scientist", bg: "#a7f3d0" },
  { emoji: "👨‍💻", label: "Coder", bg: "#e9d5ff" },
  { emoji: "👩‍💻", label: "Coder", bg: "#d8b4fe" },
  { emoji: "👨‍✈️", label: "Pilot", bg: "#cffafe" },
  { emoji: "👩‍✈️", label: "Pilot", bg: "#a5f3fc" },
  { emoji: "👨‍🚀", label: "Astronaut", bg: "#c7d2fe" },
  { emoji: "👩‍🚀", label: "Astronaut", bg: "#a5b4fc" },
  { emoji: "👨‍🚒", label: "Firefighter", bg: "#fecaca" },
  { emoji: "👩‍🚒", label: "Firefighter", bg: "#fca5a5" },
  { emoji: "👮‍♂️", label: "Police", bg: "#bfdbfe" },
  { emoji: "👮‍♀️", label: "Police", bg: "#93c5fd" },
  { emoji: "👨‍🌾", label: "Farmer", bg: "#d9f99d" },
  { emoji: "👩‍🌾", label: "Farmer", bg: "#bef264" },
  { emoji: "👨‍🍳", label: "Chef", bg: "#fef3c7" },
  { emoji: "👩‍🍳", label: "Chef", bg: "#fde68a" },
  { emoji: "👨‍⚖️", label: "Lawyer", bg: "#d1d5db" },
  { emoji: "👩‍⚖️", label: "Lawyer", bg: "#9ca3af" },
  { emoji: "👨‍🎨", label: "Artist", bg: "#fbcfe8" },
  { emoji: "👩‍🎨", label: "Artist", bg: "#f9a8d4" },
  { emoji: "👨‍🎤", label: "Musician", bg: "#ddd6fe" },
  { emoji: "👩‍🎤", label: "Musician", bg: "#c4b5fd" },
  { emoji: "🕵️‍♂️", label: "Detective", bg: "#d4d4d8" },
  { emoji: "🕵️‍♀️", label: "Detective", bg: "#a1a1aa" },
  { emoji: "👨‍🏭", label: "Technician", bg: "#fed7aa" },
  { emoji: "👩‍🏭", label: "Technician", bg: "#fdba74" },
];

export const AVATAR_COUNT = AVATARS.length;
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

// Wrap any avatar id (including legacy 1..100 values) into the current set.
export function getAvatar(id: number | null | undefined): AvatarDef {
  const n = typeof id === "number" && id > 0 ? id : 1;
  const idx = ((n - 1) % AVATAR_COUNT + AVATAR_COUNT) % AVATAR_COUNT;
  return AVATARS[idx];
}

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
