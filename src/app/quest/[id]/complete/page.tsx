"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

type Item = {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url: string | null;
  rarity: number;
};

function getRarityTier(rarity: number): "common" | "rare" | "ssr" {
  if (rarity >= 4) return "ssr";
  if (rarity >= 3) return "rare";
  return "common";
}

function CompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const itemStr = searchParams.get("item");
  const godMessage = searchParams.get("message") || "";
  const bondStr = searchParams.get("bond");

  let item: Item | null = null;
  if (itemStr) {
    try { item = JSON.parse(itemStr); } catch {}
  }

  let bondInfo: { god_name: string; new_level: number; level_name: string; leveled_up: boolean } | null = null;
  if (bondStr) {
    try { bondInfo = JSON.parse(bondStr); } catch {}
  }

  const rankStr = searchParams.get("rank");
  let rankInfo: { points_gained: number; total_points: number; rank: number; rank_name: string; rank_icon: string; ranked_up: boolean } | null = null;
  if (rankStr) {
    try { rankInfo = JSON.parse(rankStr); } catch {}
  }

  const [stage, setStage] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  // シェアカードURL生成
  function getShareCardUrl(): string | null {
    if (!item) return null;
    const data = btoa(JSON.stringify({
      item_name: item.name,
      item_image_url: item.image_url,
      item_rarity: item.rarity,
      god_name: bondInfo?.god_name || "",
      area_name: "",
      category: item.category,
    }));
    return `/api/share-card?data=${encodeURIComponent(data)}`;
  }

  async function handleShare() {
    if (!item) return;
    const text = `おさんぽクエストで「${item.name}」を手に入れた！ #おさんぽクエスト`;
    const url = "https://osanpo-quest.vercel.app";

    // 画像付きシェアを試行
    const cardUrl = getShareCardUrl();
    if (navigator.share && cardUrl) {
      try {
        const res = await fetch(cardUrl);
        const blob = await res.blob();
        const file = new File([blob], "osanpo-quest.png", { type: "image/png" });

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ text, url, files: [file] });
          return;
        }
      } catch {}

      // ファイルシェア非対応ならテキストのみ
      try {
        await navigator.share({ text, url });
        return;
      } catch {}
    }

    // フォールバック: クリップボード
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("クリップボードにコピーしました！");
    } catch {}
  }

  useEffect(() => {
    if (!item) return;
    const timers = [
      setTimeout(() => { setShowFlash(true); setStage(1); }, 300),
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => setShowFlash(false), 1300),
      setTimeout(() => setStage(3), 1800),
      setTimeout(() => setStage(4), 2500),
      setTimeout(() => setStage(5), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [item]);

  if (!item) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-fantasy">
        <button onClick={() => router.push("/")} className="btn-primary">ホームに戻る</button>
      </div>
    );
  }

  const tier = getRarityTier(item.rarity);
  const bgGrad = tier === "ssr"
    ? "from-[#1a1a2e] via-[#2a1a3e] to-[#1a1a2e]"
    : tier === "rare"
      ? "from-[#1a1a2e] via-[#1a2a3e] to-[#1a1a2e]"
      : "from-[#1a1a2e] via-[#16213e] to-[#1a1a2e]";

  const particleCount = tier === "ssr" ? 20 : tier === "rare" ? 12 : 6;
  const flashColor = tier === "ssr" ? "bg-[var(--color-gold)]" : tier === "rare" ? "bg-[var(--color-gold)]" : "bg-white";

  return (
    <div className={`relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b ${bgGrad} px-4`}>
      {/* パーティクル */}
      {stage >= 1 && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {Array.from({ length: particleCount }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-[float_3s_ease-in-out_infinite]"
              style={{
                left: `${10 + ((i * 37 + 13) % 80)}%`,
                top: `${10 + ((i * 53 + 7) % 80)}%`,
                animationDelay: `${(i * 0.4) % 2}s`,
                opacity: tier === "ssr" ? 0.6 : 0.3,
              }}
            >
              <span className={`text-sm ${tier === "common" ? "text-white/40" : "text-[var(--color-gold)]"}`}>
                {tier === "ssr" ? "✦" : "·"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* フラッシュ */}
      {showFlash && (
        <div className={`pointer-events-none absolute inset-0 z-10 animate-[flash_1s_ease-out_forwards] ${flashColor} ${tier === "ssr" ? "opacity-50" : "opacity-30"}`} />
      )}

      {/* メインコンテンツ */}
      <div className="relative z-20 flex w-full max-w-sm flex-col items-center">
        {/* 神様の台詞 */}
        <div className={`card-glass w-full px-5 py-4 text-center transition-all duration-700 ${stage >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <span className="text-[var(--color-gold)] opacity-50">&ldquo;</span>
          <p className="inline text-sm leading-relaxed text-[var(--color-text)]">{godMessage}</p>
          <span className="text-[var(--color-gold)] opacity-50">&rdquo;</span>
        </div>

        {/* アイテム */}
        <div className={`mt-8 text-center transition-all duration-700 ${stage >= 3 ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}>
          <p className="text-xs text-[var(--color-text-sub)]">アイテムを手に入れた！</p>

          <div className="relative mt-4">
            {/* グローリング */}
            {tier !== "common" && (
              <>
                <div className={`absolute -inset-4 animate-[glow_2s_ease-in-out_infinite] rounded-full blur-xl ${tier === "ssr" ? "bg-[var(--color-gold)]/30" : "bg-[var(--color-gold)]/15"}`} />
                {tier === "ssr" && <div className="absolute -inset-6 animate-[glowRing_2s_ease-in-out_infinite] rounded-full border border-[var(--color-gold)] opacity-30" />}
              </>
            )}
            <div className={`relative mx-auto flex h-36 w-36 items-center justify-center rounded-2xl border ${tier === "ssr" ? "border-[var(--color-gold)] shadow-[0_0_30px_rgba(232,184,73,0.3)]" : tier === "rare" ? "border-[var(--color-gold)]/50" : "border-[var(--color-border)]"} bg-[rgba(255,255,255,0.05)] backdrop-blur-sm`}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-32 w-32 rounded-xl object-cover" />
              ) : (
                <div className="h-32 w-32 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-xl bg-gradient-to-r from-[rgba(255,255,255,0.05)] via-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] bg-[length:200%_100%]" />
              )}
            </div>
          </div>

          <h2 className="font-wafuu text-gold mt-5 text-xl font-bold">{item.name}</h2>
          <div className={`mt-1 flex justify-center gap-0.5 transition-all duration-500 ${stage >= 4 ? "opacity-100" : "opacity-0"}`}>
            {Array.from({ length: item.rarity }).map((_, i) => (
              <span key={i} className="animate-[starGlow_2s_ease-in-out_infinite] text-sm text-[var(--color-gold)]" style={{ animationDelay: `${i * 0.2}s` }}>★</span>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-sub)]">{item.description}</p>
          <span className="mt-1 inline-block rounded-full bg-[rgba(255,255,255,0.08)] px-3 py-0.5 text-xs text-[var(--color-text-muted)]">
            {item.category === "material" ? "素材" : item.category === "local" ? "ご当地品" : item.category === "crafted" ? "合成品" : "秘宝"}
          </span>
        </div>

        {/* 絆情報 */}
        {bondInfo && stage >= 4 && (
          <div className={`card-glass mt-6 w-full p-3 text-center transition-all duration-500 ${stage >= 4 ? "opacity-100" : "opacity-0"}`}>
            {bondInfo.leveled_up ? (
              <>
                <p className="text-sm font-bold text-gold animate-[starGlow_1.5s_ease-in-out_infinite]">
                  💫 絆レベルが上がった！
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-sub)" }}>
                  {bondInfo.god_name}との絆: Lv.{bondInfo.new_level} {bondInfo.level_name}
                </p>
              </>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>
                💫 {bondInfo.god_name}との絆が深まった（Lv.{bondInfo.new_level} {bondInfo.level_name}）
              </p>
            )}
          </div>
        )}

        {/* ランク情報 */}
        {rankInfo && stage >= 4 && (
          <div className={`card-glass mt-3 w-full p-3 transition-all duration-500 ${stage >= 4 ? "opacity-100" : "opacity-0"}`}>
            {rankInfo.ranked_up ? (
              <div className="text-center">
                <p className="text-2xl">{rankInfo.rank_icon}</p>
                <p className="text-sm font-bold text-gold animate-[starGlow_1.5s_ease-in-out_infinite]">ランクが上がった！</p>
                <p className="font-wafuu text-xs" style={{ color: "var(--color-text-sub)" }}>{rankInfo.rank_name}</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-sub)" }}>{rankInfo.rank_icon} {rankInfo.rank_name}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(232,184,73,0.15)", color: "var(--color-gold)" }}>
                  +{rankInfo.points_gained} RP
                </span>
              </div>
            )}
          </div>
        )}

        {/* シェアカードプレビュー + ボタン */}
        <div className={`mt-6 w-full space-y-3 transition-all duration-500 ${stage >= 5 ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          {/* シェアプレビューカード */}
          <button
            onClick={handleShare}
            className="card-glass flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.98]"
          >
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" style={{ border: "1px solid var(--color-gold)" }} />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--color-card)", border: "1px solid var(--color-gold)" }}>
                <span className="text-xl">✨</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[var(--color-text)]">{item.name}</p>
              <p className="text-[10px]" style={{ color: "var(--color-gold)" }}>{"★".repeat(item.rarity)}</p>
              <p className="text-[10px]" style={{ color: "var(--color-teal)" }}>タップしてシェア →</p>
            </div>
          </button>

          <button onClick={() => router.push("/collection")} className="btn-primary w-full text-center">コレクションを見る</button>
          <button onClick={() => router.push("/")} className="btn-ghost w-full text-center text-sm">ホームに戻る</button>
        </div>
      </div>
    </div>
  );
}

export default function QuestCompletePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-fantasy">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-[var(--color-gold)] border-t-transparent" />
        </div>
      </div>
    }>
      <CompleteContent />
    </Suspense>
  );
}
