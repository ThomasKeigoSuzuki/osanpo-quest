"use client";

import { useState, useEffect } from "react";
import { MisuOverlay } from "@/components/misu-overlay";

type AvailableItem = { id: string; name: string; image_url: string | null; rarity: number };

const OFFERING_QUOTES = [
  "…ふん。受け取ってあげるわ",
  "…しょうがないわね。ありがたく頂くわ",
  "…あんたのセンス、まぁ…悪くないわね",
  "…こういうの、嫌いじゃないわ。…べ、別に嬉しくなんてないけど",
];

export function HomeOfferingButton() {
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<AvailableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [phase, setPhase] = useState<"select" | "offering" | "reaction" | "reveal">("select");
  const [misuStage, setMisuStage] = useState(1);
  const [reactionQuote, setReactionQuote] = useState("");

  useEffect(() => {
    if (!showModal) return;
    setLoading(true);
    setPhase("select");
    setSelectedIdx(0);
    fetch("/api/offering/available")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, [showModal]);

  async function handleOffer() {
    const item = items[selectedIdx];
    if (!item) return;
    setPhase("offering");
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const res = await fetch("/api/offering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.shinako_unlocked) {
          setPhase("reveal");
          setTimeout(() => setMisuStage(5), 500);
          setTimeout(() => window.location.reload(), 4000);
        } else {
          setReactionQuote(OFFERING_QUOTES[Math.floor(Math.random() * OFFERING_QUOTES.length)]);
          setPhase("reaction");
          setTimeout(() => { setShowModal(false); setPhase("select"); }, 2500);
        }
      }
    } catch { setPhase("select"); }
  }

  const selectedItem = items[selectedIdx];

  if (phase === "reveal") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95">
        <div className="relative mx-auto h-[300px] w-[260px] overflow-hidden rounded-2xl" style={{ border: "2px solid var(--color-gold)", boxShadow: "0 0 60px rgba(232,184,73,0.4)" }}>
          <MisuOverlay stage={misuStage} characterSrc="/shinako-full.webp" characterAlt="シナコ" type="shinako" />
        </div>
        <p className="font-wafuu mt-6 text-xl font-bold text-gold animate-[starGlow_1.5s_ease-in-out_infinite]">✨ シナコが姿を現した！</p>
        <p className="mt-3 max-w-[280px] text-center text-sm leading-relaxed" style={{ color: "var(--color-text-sub)" }}>
          「これがあたしよ。あんたにだけ見せてあげるんだから。…光栄に思いなさい」
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="z-20 w-full rounded-xl py-2.5 text-center text-xs font-bold transition active:scale-[0.97]"
        style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))", color: "var(--color-bg-primary)", boxShadow: "0 2px 12px rgba(232,184,73,0.4)" }}
      >
        🎁 奉納して御簾を上げる
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex flex-col" onClick={() => phase === "select" && setShowModal(false)}>
          {/* 背景: 神社画像 + 暗いオーバーレイ */}
          <img src="/bg-shrine.webp" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: "brightness(0.15) saturate(0.5)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center top, rgba(232,184,73,0.08) 0%, transparent 60%)" }} />

          <div className="relative z-10 flex flex-1 flex-col" onClick={(e) => e.stopPropagation()}>

            {/* 上部: 御簾+燭台の光 */}
            <div className="relative mx-auto mt-6 flex items-end justify-center">
              {/* 左の燭台光 */}
              <div className="mb-4 mr-3 h-1.5 w-1.5 rounded-full animate-[glow_3s_ease-in-out_infinite]" style={{ background: "var(--color-gold)", boxShadow: "0 0 12px 4px rgba(232,184,73,0.6)" }} />

              <div className="h-[150px] w-[130px] overflow-hidden rounded-lg" style={{ border: "1px solid rgba(232,184,73,0.4)", boxShadow: "0 0 24px rgba(232,184,73,0.15)" }}>
                <MisuOverlay stage={1} characterSrc="/shinako-full.webp" characterAlt="シナコ" type="shinako" />
              </div>

              {/* 右の燭台光 */}
              <div className="mb-4 ml-3 h-1.5 w-1.5 rounded-full animate-[glow_3s_ease-in-out_infinite_0.5s]" style={{ background: "var(--color-gold)", boxShadow: "0 0 12px 4px rgba(232,184,73,0.6)" }} />
            </div>

            <p className="font-wafuu mt-3 text-center text-base font-bold text-gold">奉納の儀</p>

            {/* 中央: アイテム表示エリア */}
            <div className="flex flex-1 flex-col items-center justify-center px-8">
              {loading ? (
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-[var(--color-gold)] border-t-transparent" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  奉納できるアイテムがありません。<br />クエストで冒険しよう！
                </p>
              ) : (
                <>
                  {/* 三方（台座）+ アイテム */}
                  <div className="relative w-full max-w-[240px]">
                    {/* 奉納アニメーション */}
                    <div className={`transition-all duration-[1.5s] ease-out ${phase === "offering" ? "-translate-y-20 scale-90 opacity-0" : ""}`}>
                      {/* アイテムカード */}
                      <div className="overflow-hidden rounded-xl" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(232,184,73,0.25)" }}>
                        <div className="p-4">
                          {selectedItem?.image_url ? (
                            <img src={selectedItem.image_url} alt={selectedItem.name} className="mx-auto h-24 w-24 rounded-lg object-cover" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.6)" }} />
                          ) : (
                            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg" style={{ background: "rgba(232,184,73,0.08)" }}>
                              <span className="text-3xl">✨</span>
                            </div>
                          )}
                          <p className="mt-2.5 text-center text-sm font-bold text-[var(--color-text)]">{selectedItem?.name}</p>
                          <p className="mt-0.5 text-center text-xs" style={{ color: "var(--color-gold)" }}>{"★".repeat(selectedItem?.rarity || 1)}</p>
                        </div>
                      </div>

                      {/* 三方の台座ライン */}
                      <div className="mx-auto mt-1 h-1 w-[80%] rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(232,184,73,0.3), transparent)" }} />
                    </div>

                    {/* 奉納中のパーティクル */}
                    {phase === "offering" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="absolute h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-gold)", boxShadow: "0 0 6px var(--color-gold)", animation: `windParticle 1.2s ease-out forwards ${i * 0.15}s` }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ページネーション */}
                  {items.length > 1 && phase === "select" && (
                    <div className="mt-4 flex items-center gap-4">
                      <button onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))} disabled={selectedIdx === 0} className="flex h-8 w-8 items-center justify-center rounded-full text-sm" style={{ background: selectedIdx > 0 ? "rgba(232,184,73,0.15)" : "transparent", color: selectedIdx > 0 ? "var(--color-gold)" : "var(--color-text-muted)" }}>‹</button>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{selectedIdx + 1} / {items.length}</span>
                      <button onClick={() => setSelectedIdx((i) => Math.min(items.length - 1, i + 1))} disabled={selectedIdx === items.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full text-sm" style={{ background: selectedIdx < items.length - 1 ? "rgba(232,184,73,0.15)" : "transparent", color: selectedIdx < items.length - 1 ? "var(--color-gold)" : "var(--color-text-muted)" }}>›</button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* リアクション */}
            {phase === "reaction" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                <div className="animate-[fadeInUp_0.5s_ease-out] text-center px-8">
                  <p className="text-3xl">🎐</p>
                  <p className="font-wafuu mt-3 text-base text-gold">「{reactionQuote}」</p>
                  <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>— シナコ</p>
                </div>
              </div>
            )}

            {/* 下部ボタン */}
            <div className="px-6 pb-4 safe-bottom">
              {phase === "select" && items.length > 0 && (
                <button onClick={handleOffer} className="w-full rounded-xl py-3.5 text-center text-sm font-bold transition active:scale-[0.97]" style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold-light))", color: "var(--color-bg-primary)", boxShadow: "0 4px 20px rgba(232,184,73,0.35)" }}>
                  奉納する
                </button>
              )}
              {phase === "select" && (
                <button onClick={() => setShowModal(false)} className="mt-2 w-full py-2.5 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>戻る</button>
              )}
              {phase === "offering" && (
                <p className="py-3 text-center text-xs animate-pulse" style={{ color: "var(--color-gold)" }}>奉納しています…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
