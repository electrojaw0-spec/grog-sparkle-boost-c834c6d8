import { getAvatar } from "@/lib/profile";

interface Props {
  avatarId?: number | null;
  name?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  ring?: boolean;
}

export function UserAvatar({ avatarId, name, size = 36, className = "", onClick, ring }: Props) {
  const av = getAvatar(avatarId ?? 1);
  const style = { width: size, height: size, backgroundColor: av.bg, fontSize: Math.round(size * 0.6) };
  const base = `shrink-0 rounded-full overflow-hidden grid place-items-center leading-none select-none ${
    ring ? "ring-2 ring-primary/40" : ""
  } ${onClick ? "cursor-pointer hover:ring-2 hover:ring-gold/50 transition-shadow" : ""} ${className}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={name ? `${name}'s avatar (${av.label})` : `${av.label} avatar`}
      title={name ? `${name} · ${av.label}` : av.label}
      className={base}
      style={style}
    >
      <span aria-hidden="true">{av.emoji}</span>
    </button>
  );
}
