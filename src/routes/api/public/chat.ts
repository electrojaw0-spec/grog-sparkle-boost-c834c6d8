import { createFileRoute } from "@tanstack/react-router";
import { callAIGatewayStream, type ChatMsg } from "@/server/ai";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as { messages: ChatMsg[]; systemPrompt?: string };
          if (!Array.isArray(body?.messages)) {
            return new Response(JSON.stringify({ error: "messages required" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          const upstream = await callAIGatewayStream(body.messages, body.systemPrompt);

          // Transform OpenAI SSE into plain text chunks for the client.
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const reader = upstream.body!.getReader();
              const decoder = new TextDecoder();
              const encoder = new TextEncoder();
              let buf = "";
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  const lines = buf.split("\n");
                  buf = lines.pop() ?? "";
                  for (const line of lines) {
                    const l = line.trim();
                    if (!l.startsWith("data:")) continue;
                    const data = l.slice(5).trim();
                    if (data === "[DONE]") { controller.close(); return; }
                    try {
                      const json = JSON.parse(data);
                      const delta = json.choices?.[0]?.delta?.content;
                      if (delta) controller.enqueue(encoder.encode(delta));
                    } catch { /* skip */ }
                  }
                }
              } catch (e) {
                controller.error(e);
                return;
              }
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
              ...CORS,
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
