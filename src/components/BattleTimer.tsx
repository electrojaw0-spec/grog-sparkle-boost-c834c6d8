import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BATTLE_TIMES, formatTime } from "@/lib/versusRules";

export function BattleTimePicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <fieldset className="space-y-2">
    <legend className="text-sm font-semibold">Time per question</legend>
    <div className="flex gap-2" role="group" aria-label="Time per question">
      {BATTLE_TIMES.map((seconds) => <Button key={seconds} type="button" variant={value === seconds ? "default" : "outline"} aria-pressed={value === seconds} onClick={() => onChange(seconds)}>
        <Timer className="h-4 w-4" />{seconds === 40 ? "40s" : seconds === 60 ? "1min" : "3min"}
      </Button>)}
    </div>
  </fieldset>;
}

export function BattleTimer({ remaining }: { remaining: number }) {
  return <div role="timer" aria-label="Time remaining" className={`flex items-center justify-center gap-2 mb-4 font-semibold tabular-nums ${remaining <= 10 ? "text-destructive" : "text-foreground"}`}>
    <Timer className="h-5 w-5" />{formatTime(remaining)}
  </div>;
}