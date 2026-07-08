import { AVATARS, getAvatar } from "@/lib/profile";
import { Check } from "lucide-react";

interface Props {
  value: number;
  onChange: (id: number) => void;
}

export function AvatarPicker({ value, onChange }: Props) {
  const current = getAvatar(value);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="h-16 w-16 rounded-2xl grid place-items-center text-4xl leading-none ring-2 ring-primary/50"
          style={{ backgroundColor: current.bg }}
          aria-label={`Selected avatar: ${current.label}`}
        >
          <span aria-hidden="true">{current.emoji}</span>
        </div>
        <div>
          <p className="text-sm font-semibold">{current.label}</p>
          <p className="text-xs text-muted-foreground">Pick a career avatar</p>
        </div>
      </div>
      <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
        {AVATARS.map((a, i) => {
          const id = i + 1;
          const selected = id === value;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              title={a.label}
              aria-label={a.label}
              aria-pressed={selected}
              className={`relative aspect-square rounded-xl grid place-items-center text-2xl leading-none transition-transform hover:scale-110 ${
                selected ? "ring-2 ring-primary" : "ring-1 ring-border"
              }`}
              style={{ backgroundColor: a.bg }}
            >
              <span aria-hidden="true">{a.emoji}</span>
              {selected && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary grid place-items-center">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
