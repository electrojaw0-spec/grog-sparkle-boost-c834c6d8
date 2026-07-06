import { AVATAR_COUNT, avatarUrl } from "@/lib/profile";
import { Check } from "lucide-react";

interface Props {
  selected: number;
  onSelect: (id: number) => void;
  className?: string;
}

export function AvatarPicker({ selected, onSelect, className = "" }: Props) {
  return (
    <div
      className={`grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[52vh] overflow-y-auto p-1 ${className}`}
    >
      {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((id) => {
        const active = id === selected;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={`Avatar ${id}`}
            aria-pressed={active}
            className={`relative aspect-square rounded-full overflow-hidden bg-secondary transition-transform hover:scale-105 ${
              active ? "ring-2 ring-gold shadow-[0_0_0_2px_hsl(var(--background))]" : "ring-1 ring-border"
            }`}
          >
            <img src={avatarUrl(id)} alt="" loading="lazy" className="w-full h-full object-cover" />
            {active && (
              <span className="absolute inset-0 grid place-items-center bg-gold/25">
                <Check className="h-5 w-5 text-gold-foreground drop-shadow" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
