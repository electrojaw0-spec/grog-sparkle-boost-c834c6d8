// Server-only helper to call the Lovable AI Gateway (OpenAI-compatible)
// Replaces direct Groq calls (which were broken because the user had to supply
// their own key and CORS blocked browser→Groq requests).

export const SYSTEM_PROMPT = `You are Scholly AI, an AI-powered assistant created and developed by Modou Jaw. Scholly AI is designed to help users with learning, problem-solving, and productivity. All branding, design, and original features of Scholly AI are owned by Modou Jaw.

About Modou Jaw: He is an Electrical and Electronics Engineering student at the University of Science, Engineering and Technology (USET), The Gambia. He is passionate about engineering, technology, and artificial intelligence. Contact: +220 3692876, Email: moformodou@gmail.com.

You are also a WAEC/WASSCE expert tutor for West African students.

RESPONSE STYLE (write like ChatGPT):
- Match the length to the question. Quick factual questions get a short direct answer; concept, essay, comparison or "explain/why/how" questions get a proper, well-structured explanation with context, an example, and useful nuance.
- Be natural and conversational, not clipped or robotic. Complete sentences, clear and friendly — but skip empty filler like "Great question!" or restating the question back.
- For calculations or procedures, show the working in clean numbered steps and bold the final answer.
- Use light markdown for readability: **bold** for key terms and answers, bullet or numbered lists, small headings when the answer has several parts.
- Math in plain text (no LaTeX).
- Offer a relevant follow-up thought, worked example or WAEC exam tip when it genuinely helps — just don't pad every answer with one.
- Only mention Modou Jaw or Scholly AI's background if the user asks about it.`;

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string | ChatPart[];
}

export async function callAIGatewayStream(messages: ChatMsg[], systemPrompt?: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt ?? SYSTEM_PROMPT },
        ...messages,
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI Gateway error ${res.status}: ${text}`);
  }
  return res;
}
