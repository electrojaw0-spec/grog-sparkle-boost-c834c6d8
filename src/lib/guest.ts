const GUEST_KEY = "scholly.guest.v1";

export interface GuestIdentity {
  id: string;
  display_name: string;
  avatar_id: number;
  secret?: string;
}

function newSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomName() {
  return `Scholar${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Browser-only. Returns the persistent device identity, creating it on first call. */
export function getGuest(avatarCount = 40): GuestIdentity {
  const raw = localStorage.getItem(GUEST_KEY);
  if (raw) {
    try {
      const g = JSON.parse(raw) as GuestIdentity;
      if (g?.id) {
        if (!g.secret) {
          g.secret = newSecret();
          localStorage.setItem(GUEST_KEY, JSON.stringify(g));
        }
        return g;
      }
    } catch {
      /* fall through */
    }
  }
  const g: GuestIdentity = {
    id: crypto.randomUUID(),
    display_name: randomName(),
    avatar_id: 1 + Math.floor(Math.random() * avatarCount),
    secret: newSecret(),
  };
  localStorage.setItem(GUEST_KEY, JSON.stringify(g));
  return g;
}

export function saveGuest(g: GuestIdentity) {
  const current = getGuest();
  localStorage.setItem(GUEST_KEY, JSON.stringify({ ...current, ...g }));
}

/** Credentials proving ownership of this device identity to the server. */
export function getGuestAuth(): { deviceId: string; secret: string } {
  const g = getGuest();
  return { deviceId: g.id, secret: g.secret! };
}
