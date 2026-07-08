import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Career-focused emoji avatars — 20 male/female pairs = 40 avatars.
export interface AvatarDef {
  emoji: string;
  label: string;
  bg: string;
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

export function getAvatar(id: number | null | undefined): AvatarDef {
  const n = typeof id === "number" && id > 0 ? id : 1;
  const idx = ((n - 1) % AVATAR_COUNT + AVATAR_COUNT) % AVATAR_COUNT;
  return AVATARS[idx];
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_id: number;
  school: string | null;
  course: string | null;
}

const profileCache = new Map<string, Profile>();
const pending = new Map<string, Promise<Profile | null>>();

export async function fetchProfile(id: string): Promise<Profile | null> {
  if (profileCache.has(id)) return profileCache.get(id)!;
  if (pending.has(id)) return pending.get(id)!;
  const p: Promise<Profile | null> = (async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_id, school, course")
      .eq("id", id)
      .maybeSingle();
    if (data) profileCache.set(id, data as Profile);
    pending.delete(id);
    return (data as Profile | null) ?? null;
  })();
  pending.set(id, p);
  return p;
}

export function primeProfile(p: Profile) {
  profileCache.set(p.id, p);
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return { user, loading };
}

export function useMyProfile() {
  const { user, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const p = await fetchProfile(user.id);
      if (cancelled) return;
      setProfile(p);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, sessionLoading]);

  const save = useCallback(
    async (data: { display_name: string; avatar_id: number; school?: string | null; course?: string | null }): Promise<Profile> => {
      if (!user) throw new Error("Not signed in");
      const row = {
        id: user.id,
        display_name: data.display_name.trim().slice(0, 40) || "Scholar",
        avatar_id: data.avatar_id,
        school: data.school?.trim() || null,
        course: data.course?.trim() || null,
      };
      const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
      if (error) throw error;
      profileCache.set(user.id, row);
      setProfile(row);
      return row;
    },
    [user],
  );

  return { user, profile, loading: loading || sessionLoading, save };
}
