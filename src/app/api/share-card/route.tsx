import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const GOLD = "#e8b849";
const BG1 = "#1a1a2e";
const BG2 = "#16213e";

export async function GET(req: NextRequest) {
  const dataParam = req.nextUrl.searchParams.get("data");
  if (!dataParam) {
    return new Response("Missing data param", { status: 400 });
  }

  let params: {
    item_name: string;
    item_image_url: string | null;
    item_rarity: number;
    god_name: string;
    area_name: string;
    category: string;
  };

  try {
    params = JSON.parse(atob(dataParam));
  } catch {
    return new Response("Invalid data", { status: 400 });
  }

  // フォント取得
  const fontData = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap"
  ).then((res) => res.text())
    .then((css) => {
      const match = css.match(/src: url\((.+?)\) format/);
      return match ? fetch(match[1]).then((r) => r.arrayBuffer()) : null;
    });

  const stars = "★".repeat(Math.min(5, Math.max(1, params.item_rarity)));

  const categoryLabels: Record<string, string> = {
    nature: "🌿 自然の恵み",
    food: "🍡 味覚の記憶",
    craft: "🏺 職人の技",
    mystery: "🔮 不思議なもの",
    memory: "🎐 風景の欠片",
    divine: "✨ 神様の贈り物",
    material: "素材",
    local: "シナコの贈り物",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: `linear-gradient(135deg, ${BG1} 0%, ${BG2} 100%)`,
          border: `2px solid ${GOLD}40`,
          fontFamily: fontData ? "Noto Sans JP" : "sans-serif",
        }}
      >
        {/* 左: アイテム画像 */}
        <div
          style={{
            width: 480,
            height: 630,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 60,
          }}
        >
          {params.item_image_url ? (
            <img
              src={params.item_image_url}
              width={320}
              height={320}
              style={{
                borderRadius: 24,
                border: `3px solid ${GOLD}`,
                objectFit: "cover",
                boxShadow: `0 0 40px ${GOLD}30`,
              }}
            />
          ) : (
            <div
              style={{
                width: 320,
                height: 320,
                borderRadius: 24,
                border: `3px solid ${GOLD}`,
                background: `${GOLD}10`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
              }}
            >
              ✨
            </div>
          )}
        </div>

        {/* 右: テキスト情報 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 60px 60px 0",
          }}
        >
          {/* ロゴ */}
          <div style={{ display: "flex", fontSize: 22, color: GOLD, marginBottom: 16 }}>
            おさんぽクエスト
          </div>

          {/* アイテム名 */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#f0f0f0",
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            {params.item_name}
          </div>

          {/* 星 */}
          <div style={{ display: "flex", fontSize: 28, color: GOLD, marginBottom: 20 }}>
            {stars}
          </div>

          {/* カテゴリ */}
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "#ffffff90",
              marginBottom: 8,
            }}
          >
            {categoryLabels[params.category] || params.category}
          </div>

          {/* 神様 + エリア */}
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "#ffffff60",
              marginBottom: 40,
            }}
          >
            シナコより
            {params.area_name ? ` · ${params.area_name}` : ""}
          </div>

          {/* URL */}
          <div style={{ display: "flex", fontSize: 16, color: GOLD }}>
            osanpo-quest.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fontData
        ? {
            fonts: [
              {
                name: "Noto Sans JP",
                data: fontData,
                style: "normal",
                weight: 700,
              },
            ],
          }
        : {}),
    }
  );
}
