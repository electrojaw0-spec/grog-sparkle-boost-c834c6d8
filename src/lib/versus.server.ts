import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { QUESTIONS } from "./questions";
import { sha256 } from "./guest.server";

const ROUNDS = 5;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randStr(set: string, n: number) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, (x) => set[x % set.length]).join("");
}
function newSecret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
}
function shuffleIdx(n: number, take: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, take);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clean(r: any) {
  if (!r) return null;
  const { p1_secret_hash: _a, p2_secret_hash: _b, ...rest } = r;
  return rest;
}

async function authRoom(id: string, seat: number, secret: string) {
  const { data } = await supabaseAdmin.from("versus_rooms").select("*").eq("id", id).maybeSingle();
  if (!data) throw new Error("Room not found");
  const stored = seat === 0 ? data.p1_secret_hash : data.p2_secret_hash;
  if (!stored || stored !== (await sha256(secret))) throw new Error("Not allowed");
  return data;
}

export async function createRoom(name: string, subjectId: string, timeLimit: number) {
  const pool = QUESTIONS[subjectId];
  if (!pool?.length) throw new Error("Unknown subject");
  const secret = newSecret();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabaseAdmin.from("versus_rooms").insert({
      code: randStr(CODE_CHARS, 6), subject_id: subjectId, player1_name: name.trim().slice(0, 40),
      question_indexes: shuffleIdx(pool.length, ROUNDS), phase: "answer", time_limit_seconds: timeLimit,
      p1_secret_hash: await sha256(secret),
    }).select().single();
    if (!error && data) return { room: clean(data), secret };
  }
  throw new Error("Could not create room");
}

export async function joinRoom(code: string, name: string) {
  const { data: found } = await supabaseAdmin.from("versus_rooms").select("id, status, player2_name")
    .eq("code", code.trim().toUpperCase()).maybeSingle();
  if (!found) throw new Error("Room not found");
  if (found.status === "done") throw new Error("This battle has finished. Ask for a new room code.");
  if (found.player2_name) throw new Error("Room is full");
  const secret = newSecret();
  const { data } = await supabaseAdmin.from("versus_rooms").update({
    player2_name: name.trim().slice(0, 40), status: "playing", phase: "answer",
    updated_at: new Date().toISOString(), p2_secret_hash: await sha256(secret),
  }).eq("id", found.id).eq("status", "waiting").is("player2_name", null).select().maybeSingle();
  if (!data) throw new Error("Could not join");
  return { room: clean(data), secret };
}

export async function getRoom(id: string, seat: number, secret: string) {
  return clean(await authRoom(id, seat, secret));
}

export async function answerRoom(id: string, seat: number, secret: string, round: number, pick: number) {
  const r = await authRoom(id, seat, secret);
  const q = QUESTIONS[r.subject_id]?.[r.question_indexes[round]];
  if (!q) return clean(r);
  const { data, error } = await supabaseAdmin.rpc("submit_versus_answer", {
    p_room: id, p_round: round, p_seat: seat, p_pick: pick, p_correct: q.answer,
  });
  if (error) throw new Error("Could not save answer");
  return clean(data);
}

export async function nextRound(id: string, seat: number, secret: string) {
  const r = await authRoom(id, seat, secret);
  if (r.phase !== "reveal") return clean(r);
  const last = r.current_round >= r.question_indexes.length - 1;
  const now = new Date().toISOString();
  const { data } = await supabaseAdmin.from("versus_rooms").update(last
    ? { phase: "done", status: "done", updated_at: now }
    : { current_round: r.current_round + 1, phase: "answer", p1_pick: null, p2_pick: null, last_pick: null, updated_at: now })
    .eq("id", id).eq("phase", "reveal").eq("current_round", r.current_round).select().maybeSingle();
  return clean(data ?? r);
}

export async function rematch(id: string, seat: number, secret: string) {
  const r = await authRoom(id, seat, secret);
  if (r.status !== "done" || !r.player2_name) return clean(r);
  const { data } = await supabaseAdmin.from("versus_rooms").update({
    question_indexes: shuffleIdx((QUESTIONS[r.subject_id] ?? []).length, ROUNDS),
    current_round: 0, current_turn: 0, scores: [0, 0], phase: "answer", p1_pick: null, p2_pick: null,
    last_pick: null, status: "playing", updated_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "done").select().maybeSingle();
  return clean(data ?? r);
}

export async function quitRoom(id: string, seat: number, secret: string) {
  await authRoom(id, seat, secret);
  await supabaseAdmin.from("versus_rooms").update({ status: "done", phase: "done", updated_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}
