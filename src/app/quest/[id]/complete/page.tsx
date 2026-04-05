"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

function CompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const itemStr = searchParams.get("item");
  const godMessage = searchParams.get("message") || "";

  const item = itemStr
    ? (JSON.parse(itemStr) as {
        id: string;
        name: string;
        description: string;
        category: string;
        image_url: string | null;
        rarity: number;
      })
    : null;

  // 段階的な演出用ステート
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!item) return;
    const timers = [
      setTimeout(() => setStage(1), 300),   // 光エフェクト
      setTimeout(() => setStage(2), 800),   // 台詞表示
      setTimeout(() => setStage(3), 1500),  // アイテム表示
      setTimeout(() => setStage(4), 2200),  // ボタン表示
    ];
    return () => timers.forEach(clearTimeout);
  }, [item]);

  if (!item) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-[#6B8E7B] px-6 py-3 text-white"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#FFF8F0] px-4">
      {/* 背景パーティクル */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {stage >= 1 &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-[float_3s_ease-in-out_infinite]"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.3 + Math.random() * 0.4,
              }}
            >
              <span className="text-lg">✦</span>
            </div>
          ))}
      </div>

      {/* 光のフラッシュ */}
      {stage >= 1 && (
        <div className="pointer-events-none absolute inset-0 animate-[flash_1s_ease-out_forwards] bg-white" />
      )}

      {/* クリア台詞 */}
      <div
        className={`relative text-center transition-all duration-700 ${
          stage >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-[#8B7E6A]">
          {godMessage}
        </p>
      </div>

      {/* アイテム獲得演出 */}
      <div
        className={`relative mt-8 text-center transition-all duration-700 ${
          stage >= 3 ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
      >
        <p className="text-xs text-[#B0A898]">アイテムを手に入れた！</p>

        {/* アイテム画像（光の円環付き） */}
        <div className="relative mt-4">
          <div className="absolute -inset-4 animate-[glow_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-yellow-200/30 via-amber-100/20 to-yellow-200/30 blur-xl" />
          <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-2xl bg-white shadow-xl ring-2 ring-yellow-200/50">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="h-32 w-32 rounded-xl object-cover"
              />
            ) : (
              <div className="h-32 w-32 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-xl bg-gradient-to-r from-[#E8DFD0] via-[#F5EDE0] to-[#E8DFD0] bg-[length:200%_100%]" />
            )}
          </div>
        </div>

        <h2 className="mt-5 text-xl font-bold text-[#6B8E7B]">{item.name}</h2>
        <div className="mt-1 flex justify-center gap-0.5">
          {Array.from({ length: item.rarity }).map((_, i) => (
            <span
              key={i}
              className="animate-[starPop_0.3s_ease-out_forwards] text-sm text-yellow-500"
              style={{ animationDelay: `${2.2 + i * 0.15}s`, opacity: 0 }}
            >
              ★
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#5A5A5A]">
          {item.description}
        </p>
        <p className="mt-1 text-xs text-[#B0A898]">
          {item.category === "material"
            ? "素材"
            : item.category === "local"
              ? "ご当地品"
              : item.category === "crafted"
                ? "合成品"
                : "秘宝"}
        </p>
      </div>

      {/* ボタン */}
      <div
        className={`mt-10 w-full max-w-xs space-y-3 transition-all duration-500 ${
          stage >= 4 ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <button
          onClick={() => router.push("/collection")}
          className="w-full rounded-2xl bg-[#6B8E7B] px-8 py-4 text-center font-bold text-white shadow-lg transition hover:bg-[#5A7D6A] active:scale-[0.98]"
        >
          コレクションを見る
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full rounded-xl border border-[#D4C5B0] px-4 py-3 text-center text-sm font-medium text-[#8B7E6A] transition hover:bg-white"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  );
}

export default function QuestCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#E8DFD0] border-t-[#6B8E7B]" />
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
