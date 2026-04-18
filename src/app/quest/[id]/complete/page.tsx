"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { tutorialCompleteDialogues } from "@/lib/shinako-dialogue";
import { BondLevelUpOverlay } from "@/components/bond-level-up-overlay";

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
  if (rankStr) { try { rankInfo = JSON.parse(rankStr); } catch {} }

  const isTutorial = searchParams.get("tutorial") === "true";

  const revealStr = searchParams.get("reveal");
  let revealInfo: { new_stage: number; message: string } | null = null;
  if (revealStr) { try { revealInfo = JSON.parse(revealStr); } catch {} }

  const [stage, setStage] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [offeringDone, setOfferingDone] = useState(false);
  const [offeringLoading, setOfferingLoading] = useState(false);
  const [tutorialDialogueIdx, setTutorialDialogueIdx] = useState(0);
  const [misuLowering, setMisuLowering] = useState(false);
  const [tutorialReady, setTutorialReady] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // 絆Lvアップ演出
  useEffect(() => {
    if (!bondInfo?.leveled_up) return;
    const timer = setTimeout(() => setShowLevelUp(true), 1500);
    return () => clearTimeout(timer);
  }, [bondInfo]);

  // チュートリアル完了演出のタイマー管理
  useEffect(() => {
    if (!offeringDone || !isTutorial) return;
    const timers = [
      setTimeout(() => setTutorialDialogueIdx(1), 2000),
      setTimeout(() => setMisuLowering(true), 4000),
      setTimeout(() => setTutorialReady(true), 6200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [offeringDone, isTutorial]);

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
    if (!itemStr) return;
    const timers = [
      setTimeout(() => { setShowFlash(true); setStage(1); }, 300),
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => setShowFlash(false), 1300),
      setTimeout(() => setStage(3), 1800),
      setTimeout(() => setStage(4), 2500),
      setTimeout(() => setStage(5), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [itemStr]);

  if (!item) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-fantasy">
        <button onClick={() => router.push("/")} className="btn-primary">ホームに戻る</button>
      </div>
    );
  }

  const tier = getRarityTier(item.rarity);
  const bgGrad = tier === "ssr"
    ? "from-[#FFFDF7] via-[#F7EAD0] to-[#F1EAD8]"
    : tier === "rare"
      ? "from-[#FFFDF7] via-[#F3ECDA] to-[#F1EAD8]"
      : "from-[#FFFDF7] via-[#F7F2E8] to-[#F1EAD8]";

  const particleCount = tier === "ssr" ? 20 : tier === "rare" ? 12 : 6;
  const flashColor = tier === "ssr" ? "bg-[var(--accent-gold)]" : tier === "rare" ? "bg-[var(--accent-gold-light)]" : "bg-[var(--surface-raised)]";

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
              <span className={`text-sm ${tier === "common" ? "text-[var(--text-muted)] opacity-50" : "text-[var(--color-gold)]"}`}>
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
            <div className={`relative mx-auto flex h-36 w-36 items-center justify-center rounded-2xl border ${tier === "ssr" ? "border-[var(--accent-gold)] shadow-[0_0_30px_rgba(217,164,65,0.35)]" : tier === "rare" ? "border-[var(--accent-gold)]/55" : "border-[rgba(217,164,65,0.25)]"} bg-[rgba(255,253,247,0.9)] backdrop-blur-sm`}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-32 w-32 rounded-xl object-cover" />
              ) : (
                <div className="h-32 w-32 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-xl bg-gradient-to-r from-[rgba(237,228,211,0.5)] via-[rgba(217,164,65,0.2)] to-[rgba(237,228,211,0.5)] bg-[length:200%_100%]" />
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
          <span className="mt-1 inline-block rounded-full bg-[rgba(237,228,211,0.75)] px-3 py-0.5 text-xs text-[var(--color-text-muted)]">
            {item.category === "material" ? "素材" : item.category === "crafted" ? "合成品" : "シナコの贈り物"}
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
                  シナコとの絆: Lv.{bondInfo.new_level} {bondInfo.level_name}
                </p>
              </>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>
                💫 シナコとの絆が深まった（Lv.{bondInfo.new_level} {bondInfo.level_name}）
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

        {/* 御簾解放演出 */}
        {revealInfo && stage >= 4 && (
          <div className={`card-glass mt-3 w-full p-3 text-center transition-all duration-500 ${stage >= 4 ? "opacity-100" : "opacity-0"}`}>
            {revealInfo.new_stage === 5 ? (
              <>
                <p className="text-sm font-bold text-gold animate-[starGlow_1.5s_ease-in-out_infinite]">
                  ✨ シナコが姿を現した！
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-sub)" }}>「{revealInfo.message}」</p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>御簾が少し上がった…</p>
                <p className="mt-0.5 text-[10px]" style={{ color: "var(--color-text-sub)" }}>「{revealInfo.message}」</p>
              </>
            )}
          </div>
        )}

        {/* ボタン */}
        <div className={`mt-6 w-full space-y-3 transition-all duration-500 ${stage >= 5 ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          {isTutorial && !offeringDone ? (
            /* チュートリアル: 奉納ボタン */
            <>
              {offeringDone ? null : (
                <button
                  onClick={async () => {
                    if (!item || offeringLoading) return;
                    setOfferingLoading(true);
                    try {
                      const res = await fetch("/api/offering", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ item_id: item.id }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setOfferingDone(true);
                      }
                    } catch {}
                    setOfferingLoading(false);
                  }}
                  disabled={offeringLoading}
                  className="btn-primary w-full text-center"
                >
                  {offeringLoading ? "奉納中..." : "🎁 シナコにアイテムを奉納する"}
                </button>
              )}
            </>
          ) : offeringDone ? (
            /* 奉納完了後: チュートリアル完了セリフ → 御簾降下 → 続けるボタン */
            <div className="text-center">
              {/* セリフ順次表示 */}
              <div className="mx-auto mb-6 flex flex-col gap-3" style={{ maxWidth: 300 }}>
                {tutorialCompleteDialogues.map((line, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,253,247,0.94)",
                      border: "1px solid rgba(217,164,65,0.3)",
                      boxShadow: "0 2px 10px rgba(42,37,32,0.06)",
                      opacity: i <= tutorialDialogueIdx ? 1 : 0,
                      animation: i <= tutorialDialogueIdx ? "dialogueFadeIn 0.6s ease-out forwards" : undefined,
                    }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>「{line}」</p>
                    <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>— シナコ</p>
                  </div>
                ))}
              </div>

              {/* 御簾降下アニメーション */}
              {misuLowering && (
                <div className="relative mx-auto mb-4 h-[400px] w-[300px] overflow-hidden rounded-2xl" style={{ border: "2px solid rgba(232,184,73,0.4)", boxShadow: "0 0 40px rgba(232,184,73,0.2)" }}>
                  <img
                    src="/shinako-full.webp"
                    alt="シナコ"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: "center 5%", filter: "brightness(0.8)" }}
                  />
                  <img
                    src="/misu.webp"
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    style={{
                      objectPosition: "center top",
                      animation: "misuLowering 2s ease-in forwards",
                    }}
                  />
                </div>
              )}

              {tutorialReady && (
                <div style={{ animation: "dialogueFadeIn 0.5s ease-out forwards" }}>
                  <p className="font-wafuu text-sm font-bold text-gold">
                    次に会う時は、正装で待っているわ…
                  </p>
                  <button onClick={() => window.location.href = "/"} className="btn-primary mt-6 w-full text-center">
                    続ける
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 通常フロー */
            <>
              <button onClick={handleShare} className="card-glass flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.98]">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" style={{ border: "1px solid var(--color-gold)" }} />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--color-card)", border: "1px solid var(--color-gold)" }}><span className="text-xl">✨</span></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--color-text)]">{item.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--color-gold)" }}>{"★".repeat(item.rarity)}</p>
                  <p className="text-[10px]" style={{ color: "var(--color-teal)" }}>タップしてシェア →</p>
                </div>
              </button>
              <button onClick={() => router.push("/collection")} className="btn-primary w-full text-center">コレクションを見る</button>
              <button onClick={() => router.push("/")} className="btn-ghost w-full text-center text-sm">ホームに戻る</button>
            </>
          )}
        </div>
      </div>

      {showLevelUp && bondInfo && (
        <BondLevelUpOverlay
          newLevel={bondInfo.new_level}
          levelName={bondInfo.level_name}
          onClose={() => setShowLevelUp(false)}
        />
      )}
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
