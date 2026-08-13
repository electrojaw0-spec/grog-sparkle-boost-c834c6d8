import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deleteCode, generateCodes, listCodes, redeem, updateCode } from "./accessCodes.server";

const pass = z.object({ passphrase: z.string().min(1).max(200) });

export const redeemCodeFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().min(1).max(32) }).parse(d))
  .handler(async ({ data }) => redeem(data.code));

export const adminListCodesFn = createServerFn({ method: "POST" })
  .inputValidator((d) => pass.parse(d))
  .handler(async ({ data }) => listCodes(data.passphrase));

export const adminGenerateCodesFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    pass.extend({ plan: z.enum(["week", "month"]), count: z.number().int() }).parse(d),
  )
  .handler(async ({ data }) => generateCodes(data.passphrase, data.plan, data.count));

export const adminUpdateCodeFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    pass
      .extend({
        id: z.string().uuid(),
        action: z.enum(["deactivate", "reactivate", "regenerate"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => updateCode(data.passphrase, data.id, data.action));

export const adminDeleteCodeFn = createServerFn({ method: "POST" })
  .inputValidator((d) => pass.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => deleteCode(data.passphrase, data.id));
