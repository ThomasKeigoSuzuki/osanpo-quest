"use client";

import { useState, useEffect, useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showModal) return;
    setLoading(true);
    setPhase("select");
    setSelectedIdx(0);
    fetch("/api/offering/available?god_name=シナコ")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, [showModal]);

  async function handleOffer() {
    const item = items[selectedIdx];
    if (!item) return;

    setPhase("offering");

    // 奉納アニメーション待ち
    await new Promise((r) => setTimeout(r, 1500));

    try {
      const res = await fetch("/api/offering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, god_name: "シナコ" }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.shinako_unlocked) {
          // 完全解放
          setPhase("reveal");
          setTimeout(() => setMisuStage(5), 500);
          setTimeout(() => window.location.reload(), 4000);
        } else {
          // 通常奉納リアクション
          setReactionQuote(OFFERING_QUOTES[Math.floor(Math.random() * OFFERING_QUOTES.length)]);
          setPhase("reaction");
          setTimeout(() => {
            setShowModal(false);
            setPhase("select");
          }, 2500);
        }
      }
    } catch {
      setPhase("select");
    }
  }

  const selectedItem = items[selectedIdx];

  // ===== 完全解放演出 =====
  if (phase === "reveal") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95">
        <div className="relative mx-auto h-[300px] w-[260px] overflow-hidden rounded-2xl" style={{ border: "2px solid var(--color-gold)", boxShadow: "0 0 60px rgba(232,184,73,0.4)" }}>
          <MisuOverlay stage={misuStage} characterSrc="/shinako-full.png" characterAlt="シナコ" type="shinako" />
        </div>
        <p className="font-wafuu mt-6 text-xl font-bold text-gold animate-[starGlow_1.5s_ease-in-out_infinite]">
          ✨ シナコが姿を現した！
        </p>
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
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95" onClick={() => phase === "select" && setShowModal(false)}>
          <div className="flex flex-1 flex-col" onClick={(e) => e.stopPropagation()}>

            {/* 上部: 御簾とシナコのシルエット */}
            <div className="relative mx-auto mt-8 h-[180px] w-[160px] overflow-hidden rounded-xl" style={{ border: "1px solid rgba(232,184,73,0.3)", boxShadow: "0 0 30px rgba(232,184,73,0.1)" }}>
              <MisuOverlay stage={1} characterSrc="/shinako-full.png" characterAlt="シナコ" type="shinako" />
            </div>

            <h2 className="font-wafuu mt-4 text-center text-lg font-bold text-gold">奉納の儀</h2>
            <p className="mt-1 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
              アイテムを選んで神前に捧げましょう
            </p>

            {/* 中央: カルーセル */}
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-[var(--color-gold)] border-t-transparent" />
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8">
                <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  奉納できるアイテムがありません。<br />クエストで冒険してアイテムを手に入れよう！
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center">
                {/* 三方（さんぽう）イメージの台座 */}
                <div className="relative">
                  {/* 奉納アニメーション: アイテムが浮き上がる */}
                  <div
                    className={`transition-all duration-[1.5s] ${
                      phase === "offering" ? "translate-y-[-80px] scale-75 opacity-0" : ""
                    }`}
                  >
                    {/* アイテムカード */}
                    <div className="relative rounded-2xl p-1" style={{ background: "linear-gradient(135deg, rgba(232,184,73,0.3), rgba(232,184,73,0.1))" }}>
                      <div className="rounded-xl p-4" style={{ background: "var(--color-bg-primary)" }}>
                        {selectedItem?.image_url ? (
                          <img src={selectedItem.image_url} alt={selectedItem.name} className="mx-auto h-28 w-28 rounded-xl object-cover" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }} />
                        ) : (
                          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-xl" style={{ background: "var(--color-card)" }}>
                            <span className="text-4xl">✨</span>
                          </div>
                        )}
                        <p className="mt-3 text-center text-sm font-bold text-[var(--color-text)]">{selectedItem?.name}</p>
                        <p className="mt-0.5 text-center text-xs" style={{ color: "var(--color-gold)" }}>
                          {"★".repeat(selectedItem?.rarity || 1)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 奉納中の光パーティクル */}
                  {phase === "offering" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="absolute h-2 w-2 rounded-full"
                          style={{
                            background: "var(--color-gold)",
                            boxShadow: "0 0 8px var(--color-gold)",
                            animation: `windParticle 1.5s ease-out forwards ${i * 0.2}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* 横スワイプインジケーター（複数アイテム時） */}
                {items.length > 1 && phase === "select" && (
                  <div ref={scrollRef} className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                      disabled={selectedIdx === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition"
                      style={{ background: selectedIdx > 0 ? "var(--color-card)" : "transparent", color: selectedIdx > 0 ? "var(--color-text)" : "var(--color-text-muted)" }}
                    >
                      ‹
                    </button>
                    <div className="flex gap-1.5">
                      {items.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedIdx(i)}
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: i === selectedIdx ? 16 : 8,
                            background: i === selectedIdx ? "var(--color-gold)" : "var(--color-border)",
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setSelectedIdx((i) => Math.min(items.length - 1, i + 1))}
                      disabled={selectedIdx === items.length - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition"
                      style={{ background: selectedIdx < items.length - 1 ? "var(--color-card)" : "transparent", color: selectedIdx < items.length - 1 ? "var(--color-text)" : "var(--color-text-muted)" }}
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* リアクション表示 */}
            {phase === "reaction" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                <div className="animate-[fadeInUp_0.5s_ease-out] text-center px-8">
                  <p className="text-4xl">🎐</p>
                  <p className="font-wafuu mt-3 text-sm text-gold">「{reactionQuote}」</p>
                  <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>— シナコ</p>
                </div>
              </div>
            )}

            {/* 下部ボタン */}
            <div className="px-6 pb-6 safe-bottom">
              {phase === "select" && items.length > 0 && (
                <button
                  onClick={handleOffer}
                  className="w-full rounded-xl py-4 text-center text-sm font-bold transition active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold-light))", color: "var(--color-bg-primary)", boxShadow: "0 4px 20px rgba(232,184,73,0.4)" }}
                >
                  奉納する
                </button>
              )}
              {phase === "select" && (
                <button
                  onClick={() => setShowModal(false)}
                  className="mt-2 w-full py-3 text-center text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  戻る
                </button>
              )}
              {phase === "offering" && (
                <p className="text-center text-xs animate-pulse" style={{ color: "var(--color-gold)" }}>
                  奉納しています…
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
