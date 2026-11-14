import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const seatAuth = z.object({ id: z.string().uuid(), seat: z.union([z.literal(0), z.literal(1)]), secret: z.string().min(20).max(200) });
const srv = () => import("./versus.server");

export const createRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(40), subjectId: z.string().max(60), timeLimit: z.union([z.literal(40), z.literal(60), z.literal(180)]) }).parse(d))
  .handler(async ({ data }) => (await srv()).createRoom(data.name, data.subjectId, data.timeLimit));

export const joinRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().trim().length(6), name: z.string().trim().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => (await srv()).joinRoom(data.code, data.name));

export const getRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d) => seatAuth.parse(d))
  .handler(async ({ data }) => (await srv()).getRoom(data.id, data.seat, data.secret));

export const answerRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d) => seatAuth.extend({ round: z.number().int().min(0).max(50), pick: z.number().int().min(-1).max(3) }).parse(d))
  .handler(async ({ data }) => (await srv()).answerRoom(data.id, data.seat, data.secret, data.round, data.pick));

export const nextRoundFn = createServerFn({ method: "POST" })
  .inputValidator((d) => seatAuth.parse(d))
  .handler(async ({ data }) => (await srv()).nextRound(data.id, data.seat, data.secret));

export const rematchFn = createServerFn({ method: "POST" })
  .inputValidator((d) => seatAuth.parse(d))
  .handler(async ({ data }) => (await srv()).rematch(data.id, data.seat, data.secret));

export const quitRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d) => seatAuth.parse(d))
  .handler(async ({ data }) => (await srv()).quitRoom(data.id, data.seat, data.secret));
