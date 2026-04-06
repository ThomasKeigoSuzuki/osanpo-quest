"use client";

import { useState, useEffect } from "react";
import { MisuOverlay } from "@/components/misu-overlay";

type AvailableItem = { id: string; name: string; image_url: string | null; rarity: number };

export function HomeOfferingButton() {
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<AvailableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState(false);
  const [done, setDone] = useState(false);
  const [misuStage, setMisuStage] = useState(1);

  useEffect(() => {
    if (!showModal) return;
    setLoading(true);
    fetch("/api/offering/available?god_name=シナコ")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, [showModal]);

  async function handleOffer(itemId: string) {
    setOffering(true);
    try {
      const res = await fetch("/api/offering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, god_name: "シナコ" }),
      });
      const data = await res.json();
      if (data.success && data.shinako_unlocked) {
        setDone(true);
        setTimeout(() => setMisuStage(5), 300);
        // ページをリロードして御簾なし状態にする
        setTimeout(() => window.location.reload(), 3000);
      }
    } catch {}
    setOffering(false);
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-[280px] text-center">
          <div className="mx-auto h-[250px] w-[250px] overflow-hidden rounded-2xl" style={{ border: "2px solid var(--color-gold)", boxShadow: "0 0 40px rgba(232,184,73,0.3)" }}>
            <MisuOverlay stage={misuStage} characterSrc="/shinako-full.png" characterAlt="シナコ" type="shinako" />
          </div>
          <p className="font-wafuu mt-4 text-lg font-bold text-gold animate-[starGlow_1.5s_ease-in-out_infinite]">
            ✨ シナコが姿を現した！
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-sub)" }}>
            「これがあたしよ。あんたにだけ見せてあげるんだから。…光栄に思いなさい」
          </p>
        </div>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="card-glass max-h-[70dvh] w-full max-w-md animate-[fadeInUp_0.3s_ease-out] overflow-y-auto rounded-t-3xl p-5 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--color-border)" }} />
            <h2 className="font-wafuu text-center text-sm font-bold text-gold">シナコにアイテムを奉納</h2>
            <p className="mt-1 text-center text-[10px]" style={{ color: "var(--color-text-sub)" }}>
              アイテムを1つ選んで奉納すると御簾が上がります
            </p>

            {loading ? (
              <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>読み込み中...</p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>奉納できるアイテムがありません。<br />まずクエストをクリアしよう！</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleOffer(item.id)}
                    disabled={offering}
                    className="card-glass flex flex-col items-center p-2 transition active:scale-[0.95]"
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg" style={{ background: "var(--color-card)" }}><span className="text-lg">✨</span></div>
                    )}
                    <p className="mt-1 w-full truncate text-center text-[9px] text-[var(--color-text)]">{item.name}</p>
                    <p className="text-[8px]" style={{ color: "var(--color-gold)" }}>{"★".repeat(item.rarity)}</p>
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => setShowModal(false)} className="btn-ghost mt-4 w-full text-center text-xs" style={{ border: "1px solid var(--color-border)" }}>閉じる</button>
          </div>
        </div>
      )}
    </>
  );
}
