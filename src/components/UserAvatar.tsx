import { avatarUrl } from "@/lib/profile";

interface Props {
  avatarId?: number | null;
  name?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  ring?: boolean;
}

export function UserAvatar({ avatarId, name, size = 36, className = "", onClick, ring }: Props) {
  const id = avatarId && avatarId > 0 ? avatarId : 1;
  const initials = (name || "?").trim().slice(0, 2).toUpperCase();
  const style = { width: size, height: size };
  const base = `shrink-0 rounded-full bg-secondary overflow-hidden grid place-items-center text-xs font-semibold text-muted-foreground ${
    ring ? "ring-2 ring-primary/40" : ""
  } ${onClick ? "cursor-pointer hover:ring-2 hover:ring-gold/50 transition-shadow" : ""} ${className}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={name ? `${name}'s avatar` : "avatar"}
      className={base}
      style={style}
    >
      <img
        src={avatarUrl(id)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <span className="absolute pointer-events-none opacity-0">{initials}</span>
    </button>
  );
}
