import * as fs from "fs";
import * as path from "path";

const PROMPT = `Anime-style character portrait of a young Japanese wind goddess girl named Shinako. She has long dark brown hair flowing in the wind, bright green eyes, wearing a traditional green travel kimono (旅装束) with gold accents. Cheerful and slightly mischievous expression. Soft watercolor background with wind swirls. Studio Ghibli meets modern anime gacha game style like Mahjong Soul. Upper body portrait, high quality illustration.`;

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set");
    process.exit(1);
  }

  console.log("Generating Shinako illustration...");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: PROMPT,
      n: 1,
      size: "1024x1024",
      quality: "high",
    }),
  });

  if (!response.ok) {
    console.error("Generation failed:", await response.text());
    process.exit(1);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    console.error("No image data in response");
    process.exit(1);
  }

  const outputPath = path.join(process.cwd(), "public", "shinako.png");
  fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));
  console.log(`Saved to ${outputPath}`);

  // Supabase Storageにもアップロード（オプション）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const imageBuffer = fs.readFileSync(outputPath);
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/item-images/gods/shinako.png`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "image/png",
          "x-upsert": "true",
        },
        body: imageBuffer,
      }
    );
    if (uploadRes.ok) {
      console.log("Also uploaded to Supabase Storage");
    }
  }
}

main();
