import { createServiceClient } from "@/lib/supabase/server";

const BASE_STYLE = `Japanese watercolor style illustration of a small mystical item on a pure white background.
Soft, translucent colors. Delicate brushstrokes. Studio Ghibli inspired aesthetic.
Simple, elegant, collectible card game item art. No text. No border.`;

/**
 * アイテム画像を生成し、Supabase Storageにアップロードする。
 * OPENAI_API_KEY が未設定の場合はnullを返す（モック動作）。
 */
export async function generateItemImage(
  imagePromptHint: string,
  itemId: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // OPENAI_API_KEY not set
    return null;
  }

  const prompt = `${BASE_STYLE} The item is: ${imagePromptHint}`;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "low",
        output_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateItemImage] OpenAI API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[generateItemImage] No b64_json in response:", JSON.stringify(data).slice(0, 300));
      return null;
    }

    const imageBuffer = Buffer.from(b64, "base64");

    const serviceClient = await createServiceClient();
    const filePath = `items/${itemId}.png`;

    const { error: uploadError } = await serviceClient.storage
      .from("item-images")
      .upload(filePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generateItemImage] Storage upload failed:", uploadError);
      return null;
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from("item-images").getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error("[generateItemImage] Unexpected error:", err);
    return null;
  }
}

/**
 * ご当地神のイラストを生成し、Supabase Storageにアップロードする。
 */
export async function generateGodImage(
  appearance: string,
  godId: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = `Anime-style character portrait of a Japanese local deity. ${appearance}. Soft watercolor background. Modern anime gacha game illustration style like Mahjong Soul. Upper body portrait, high quality.`;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateGodImage] OpenAI API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[generateGodImage] No b64_json in response:", JSON.stringify(data).slice(0, 300));
      return null;
    }

    const imageBuffer = Buffer.from(b64, "base64");

    const serviceClient = await createServiceClient();
    const filePath = `gods/${godId}.png`;

    const { error: uploadError } = await serviceClient.storage
      .from("item-images")
      .upload(filePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generateGodImage] Storage upload failed:", uploadError);
      return null;
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from("item-images").getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error("[generateGodImage] Unexpected error:", err);
    return null;
  }
}
