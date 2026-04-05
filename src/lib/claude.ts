import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  if (block.type === "text") {
    return block.text;
  }
  throw new Error("Unexpected response from Claude API");
}

export async function generateSimple(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type === "text") {
    return block.text;
  }
  throw new Error("Unexpected response from Claude API");
}

/** Claude API レスポンスからJSONを抽出 */
export function extractJSON<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  return JSON.parse(match[0]) as T;
}
