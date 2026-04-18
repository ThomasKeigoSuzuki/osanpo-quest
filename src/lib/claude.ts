import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-6";

export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
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
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type === "text") {
    return block.text;
  }
  throw new Error("Unexpected response from Claude API");
}

/**
 * Claude API レスポンスからJSONを抽出し、Zod スキーマで検証する。
 * 平衡括弧でオブジェクトを切り出すため、前後にテキストがあっても安全。
 */
export function extractJSON<T>(text: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(text));
  } catch { /* not pure JSON, try extraction */ }

  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON found in Claude response");

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        return schema.parse(JSON.parse(candidate));
      }
    }
  }
  throw new Error("Unbalanced JSON in Claude response");
}
