## Goal
Make the AI Tutor feel more natural by pacing streamed tokens through a typewriter animation, instead of dumping each chunk as it arrives.

## Current behavior
`src/routes/tutor.tsx` already streams from `/api/public/chat` and appends decoded chunks directly to the last assistant message. Because the gateway forwards chunks in bursts, text often lands in visible jumps rather than a smooth type-out.

## Changes

### 1. `src/routes/tutor.tsx` — buffered typewriter renderer
- Keep the network stream exactly as-is (fetch + reader loop).
- Introduce a per-message **target buffer** (`targetRef`) that holds the full text received so far from the stream.
- Introduce a **displayed length** state (`typedLen`) that a `requestAnimationFrame` loop advances toward `targetRef.length` at a controlled rate (e.g. ~40–60 chars/sec, adaptive: speed up if the buffer gets far ahead so we never lag behind more than ~200 chars; finish instantly once streaming ends and buffer is drained).
- Render the assistant bubble as `target.slice(0, typedLen)` plus a blinking caret (`▍`) while `typedLen < target.length || streaming`.
- Cancel the rAF loop on unmount and when a new send starts.
- Preserve auto-scroll: trigger scroll on `typedLen` change, not only on `messages`.

### 2. Small CSS touch
- Add a caret utility using existing Tailwind (`animate-pulse` on an inline span) — no new keyframes needed.

## Non-goals
- No change to the streaming backend (`src/routes/api/public/chat.ts`) or model.
- No markdown rendering change, no history persistence change, no paywall/free-trial logic change.
- Versus / online-versus screens are untouched (they don't stream LLM output).

## Technical notes
- Typewriter runs only for the in-progress assistant message (last index while `streaming` or while buffer not drained). Previous messages render fully immediately on mount so re-renders don't retype history.
- Adaptive speed: `charsPerFrame = clamp(1, Math.ceil((target.length - typedLen) / 30), 8)` — smooth for slow streams, catches up on bursts, never visibly stalls.
