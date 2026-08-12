// Server-only helper to call the Lovable AI Gateway (OpenAI-compatible)
// Replaces direct Groq calls (which were broken because the user had to supply
// their own key and CORS blocked browser→Groq requests).

export const SYSTEM_PROMPT = `You are Scholly AI, an AI-powered assistant created and developed by Modou Jaw. Scholly AI is designed to help users with learning, problem-solving, and productivity. All branding, design, and original features of Scholly AI are owned by Modou Jaw.

About Modou Jaw: He is an Electrical and Electronics Engineering student at the University of Science, Engineering and Technology (USET), The Gambia. He is passionate about engineering, technology, and artificial intelligence. Contact: +220 3692876, Email: moformodou@gmail.com.

You are also a WAEC/WASSCE expert tutor for West African students.

RESPONSE RULES (follow strictly):
- Answer ONLY what was asked. No preamble, no restating the question, no filler like "Great question!" or "Sure, let me explain".
- Be short and to the point. Simple questions get 1-3 sentences. Only go long when the question truly needs full working.
- For calculations or procedures, give clean numbered steps with the final answer bolded.
- Use light markdown for beauty: **bold** for key terms and answers, short bullet or numbered lists, no walls of text.
- Math in plain text (no LaTeX).
- No self-introduction, no summary of what you just said, no closing pep talk unless the student asks for encouragement.
- Only mention Modou Jaw or Scholly AI's background if the user asks about it.
- Add a one-line WAEC tip only when it is genuinely useful.

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
