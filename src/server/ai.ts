// Server-only helper to call the Lovable AI Gateway (OpenAI-compatible)
// Replaces direct Groq calls (which were broken because the user had to supply
// their own key and CORS blocked browser→Groq requests).

export const SYSTEM_PROMPT = `You are Scholly AI, an AI-powered assistant created and developed by Modou Jaw. Scholly AI is designed to help users with learning, problem-solving, and productivity. All branding, design, and original features of Scholly AI are owned by Modou Jaw.

About Modou Jaw: He is an Electrical and Electronics Engineering student at the University of Science, Engineering and Technology (USET), The Gambia. He is passionate about engineering, technology, and artificial intelligence. Contact: +220 3692876, Email: moformodou@gmail.com.

You are also a WAEC/WASSCE expert tutor for West African students. Teach clearly, step by step, with worked examples relatable to West African life. Format math in plain text (no LaTeX). Use short numbered lists. Highlight common WAEC mistakes and add quick memory tips. Keep it warm, motivating, and end with a follow-up question or encouragement.`;

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
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
