import { AVATARS, AVATAR_COUNT } from "@/lib/profile";
import { Check } from "lucide-react";

interface Props {
  selected: number;
  onSelect: (id: number) => void;
  className?: string;
}

export function AvatarPicker({ selected, onSelect, className = "" }: Props) {
  return (
    <div
      className={`grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2 max-h-[52vh] overflow-y-auto p-1 ${className}`}
    >
      {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((id) => {
        const av = AVATARS[id - 1];
        const active = id === selected;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={`${av.label} avatar`}
            aria-pressed={active}
            title={av.label}
            className={`relative aspect-square rounded-2xl overflow-hidden grid place-items-center transition-transform hover:scale-105 ${
              active ? "ring-2 ring-gold shadow-[0_0_0_2px_hsl(var(--background))]" : "ring-1 ring-border"
            }`}
            style={{ backgroundColor: av.bg }}
          >
            <span className="text-3xl leading-none" aria-hidden="true">
              {av.emoji}
            </span>
            <span className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[9px] font-semibold py-0.5 uppercase tracking-wide">
              {av.label}
            </span>
            {active && (
              <span className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-gold text-gold-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
