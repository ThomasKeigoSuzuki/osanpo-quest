"use client";

import { useState, useEffect, useCallback } from "react";
import type { Database } from "@/types/database";
import { getBondLevel, BOND_LEVELS } from "@/lib/bond-system";
import { getNextGodRevealThreshold } from "@/lib/god-reveal";
import { MisuOverlay } from "@/components/misu-overlay";
import Link from "next/link";

type Bond = Database["public"]["Tables"]["god_bonds"]["Row"];
type AvailableItem = { id: string; name: string; image_url: string | null; rarity: number; category: string };

export function BondsWrapper({ bonds }: { bonds: Bond[] }) {
  const [selected, setSelected] = useState<Bond | null>(null);
  const [modalTab, setModalTab] = useState<"bond" | "offering">("bond");
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [localRevealStage, setLocalRevealStage] = useState<number | null>(null);
  const [localOfferingsCount, setLocalOfferingsCount] = useState<number | null>(null);
  const [flashRevealed, setFlashRevealed] = useState(false);

  // 奉納タブ切替時にアイテム取得
  useEffect(() => {
    if (modalTab !== "offering" || !selected) return;
    setLoadingItems(true);
    fetch(`/api/offering/available?god_name=${encodeURIComponent(selected.god_name)}`)
      .then((r) => r.json())
      .then((d) => setAvailableItems(d.items || []))
      .finally(() => setLoadingItems(false));
  }, [modalTab, selected]);

  // モーダルを開いた時にリセット
  useEffect(() => {
    if (selected) {
      setModalTab("bond");
      setLocalRevealStage(null);
      setLocalOfferingsCount(null);
      setFlashRevealed(false);
    }
  }, [selected]);

  const handleOffer = useCallback(async (itemId: string, itemName: string) => {
    if (!selected || !confirm(`「${itemName}」を奉納しますか？\n（コレクションからは消えません）`)) return;
    setOfferingId(itemId);
    try {
      const res = await fetch("/api/offering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, god_name: selected.god_name }),
      });
      const data = await res.json();
      if (data.success) {
        setAvailableItems((prev) => prev.filter((i) => i.id !== itemId));
        setLocalOfferingsCount(data.offerings_count);
        if (data.stage_changed) {
          setLocalRevealStage(data.new_stage);
          if (data.new_stage === 5) {
            setFlashRevealed(true);
            setTimeout(() => setFlashRevealed(false), 2000);
          }
        }
      }
    } catch {}
    setOfferingId(null);
  }, [selected]);

  const revealStage = (s: Bond) => localRevealStage ?? s.reveal_stage;
  const offeringsCount = (s: Bond) => localOfferingsCount ?? s.offerings_count;

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="btn-ghost !px-2 !py-1 text-sm">←</Link>
        <h1 className="font-wafuu text-xl font-bold text-gold">💫 神様との絆</h1>
      </div>

      {bonds.length === 0 ? (
        <div className="card-glass mt-16 p-6 text-center">
          <p className="text-4xl">💫</p>
          <p className="mt-3 text-sm" style={{ color: "var(--color-text-sub)" }}>まだ神様と出会っていません。<br />クエストに出かけよう！</p>
          <Link href="/quest/start" className="btn-primary mt-4 inline-block">クエストを始める</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bonds.map((bond) => {
            const bl = getBondLevel(bond.bond_exp);
            const days = Math.floor((Date.now() - new Date(bond.first_met_at).getTime()) / 86400000);
            return (
              <button key={bond.id} onClick={() => setSelected(bond)} className="card-glass flex w-full items-center gap-4 p-4 text-left transition active:scale-[0.99]">
                {bond.god_image_url || bond.god_type === "wanderer" ? (
                  <img src={bond.god_type === "wanderer" ? "/shinako-face.webp" : bond.god_image_url!} alt={bond.god_name} className="h-14 w-14 shrink-0 rounded-full object-cover" style={{ border: `${Math.min(4, bl.level)}px solid var(--color-gold)` }} />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--color-card)", border: `${Math.min(4, bl.level)}px solid var(--color-gold)` }}>
                    <span className="text-xl font-bold text-[var(--color-gold)]">{bond.god_name.charAt(0)}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-wafuu text-sm font-bold text-gold">{bond.god_name}</span>
                    {bond.reveal_stage >= 5 && <span className="text-[9px]" style={{ color: "var(--color-success)" }}>✨顕現</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span key={i} className="text-[10px]" style={{ color: i < bl.level ? "var(--color-gold)" : "var(--color-text-muted)" }}>{i < bl.level ? "★" : "☆"}</span>
                    ))}
                    <span className="ml-1 text-xs" style={{ color: "var(--color-text-sub)" }}>{bl.name}</span>
                  </div>
                  {/* 御簾進捗ドット */}
                  <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < bond.reveal_stage ? "var(--color-gold)" : "var(--color-border)" }} />
                    ))}
                    <span className="ml-1 text-[9px]" style={{ color: "var(--color-text-muted)" }}>奉納{bond.offerings_count}</span>
                  </div>
                  <div className="mt-1 flex gap-3 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    <span>{days}日</span><span>{bond.total_quests}回冒険</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 詳細モーダル */}
      {selected && (() => {
        const bl = getBondLevel(selected.bond_exp);
        const nextLevel = BOND_LEVELS.find((l) => l.level === bl.level + 1);
        const days = Math.floor((Date.now() - new Date(selected.first_met_at).getTime()) / 86400000);
        const rs = revealStage(selected);
        const oc = offeringsCount(selected);
        const nextThreshold = getNextGodRevealThreshold(rs);

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <div className="card-glass max-h-[90dvh] w-full max-w-md animate-[fadeInUp_0.3s_ease-out] overflow-y-auto rounded-t-3xl p-6 safe-bottom" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--color-border)" }} />

              {/* タブ */}
              <div className="mb-4 flex gap-2">
                <button onClick={() => setModalTab("bond")} className={`flex-1 rounded-lg py-2 text-center text-xs font-medium transition ${modalTab === "bond" ? "text-gold" : ""}`} style={modalTab === "bond" ? { background: "rgba(232,184,73,0.15)", borderBottom: "2px solid var(--color-gold)" } : { color: "var(--color-text-muted)", background: "var(--color-card)" }}>
                  💫 絆情報
                </button>
                <button onClick={() => setModalTab("offering")} className={`flex-1 rounded-lg py-2 text-center text-xs font-medium transition ${modalTab === "offering" ? "text-gold" : ""}`} style={modalTab === "offering" ? { background: "rgba(232,184,73,0.15)", borderBottom: "2px solid var(--color-gold)" } : { color: "var(--color-text-muted)", background: "var(--color-card)" }}>
                  🎁 奉納
                </button>
              </div>

              {modalTab === "bond" ? (
                /* ===== 絆タブ ===== */
                <div className="flex flex-col items-center">
                  {selected.god_image_url || selected.god_type === "wanderer" ? (
                    <img src={selected.god_type === "wanderer" ? "/shinako-face.webp" : selected.god_image_url!} alt={selected.god_name} className="h-24 w-24 rounded-full object-cover" style={{ border: "3px solid var(--color-gold)" }} />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "var(--color-card)", border: "3px solid var(--color-gold)" }}>
                      <span className="text-3xl font-bold text-[var(--color-gold)]">{selected.god_name.charAt(0)}</span>
                    </div>
                  )}
                  <h2 className="font-wafuu mt-3 text-xl font-bold text-gold">{selected.god_name}</h2>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (<span key={i} className="text-sm" style={{ color: i < bl.level ? "var(--color-gold)" : "var(--color-text-muted)" }}>{i < bl.level ? "★" : "☆"}</span>))}
                  </div>
                  <p className="text-sm font-medium text-gold">{bl.name}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>{bl.description}</p>
                  {!bl.isMax && (
                    <div className="mt-3 w-full max-w-[200px]">
                      <div className="flex justify-between text-[10px]" style={{ color: "var(--color-text-muted)" }}><span>EXP</span><span>{bl.currentExp}/{bl.nextLevelExp}</span></div>
                      <div className="mt-0.5 h-2 overflow-hidden rounded-full" style={{ background: "var(--color-card)" }}><div className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold)]" style={{ width: `${bl.progress * 100}%` }} /></div>
                    </div>
                  )}
                  {nextLevel && (
                    <div className="card-glass mt-4 w-full p-3 text-center">
                      <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>次のレベル</p>
                      <p className="text-sm font-medium text-gold">Lv.{nextLevel.level} {nextLevel.name}</p>
                    </div>
                  )}
                  <div className="mt-4 flex gap-6 text-center">
                    <div><p className="text-lg font-bold text-gold">{days}</p><p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>日数</p></div>
                    <div><p className="text-lg font-bold text-gold">{selected.total_quests}</p><p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>冒険</p></div>
                    <div><p className="text-lg font-bold text-gold">{oc}</p><p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>奉納</p></div>
                  </div>
                </div>
              ) : (
                /* ===== 奉納タブ ===== */
                <div>
                  {/* 顕現フラッシュ */}
                  {flashRevealed && <div className="animate-[flashGold_2s_ease-out_forwards] fixed inset-0 z-50 bg-[var(--color-gold)]" style={{ opacity: 0.4 }} />}

                  {/* 御簾 + 神様 */}
                  <div className="mx-auto mb-4 h-[200px] w-[200px] overflow-hidden rounded-xl" style={{ border: "1px solid rgba(232,184,73,0.3)" }}>
                    <MisuOverlay
                      stage={rs}
                      characterSrc={selected.god_type === "wanderer" ? "/shinako-full.webp" : (selected.god_image_url || "/shinako-face.webp")}
                      characterAlt={selected.god_name}
                      type={selected.god_type === "wanderer" ? "shinako" : "local"}
                    />
                  </div>

                  {rs === 5 && flashRevealed && (
                    <p className="mb-3 text-center font-wafuu text-sm font-bold text-gold animate-[starGlow_1.5s_ease-in-out_infinite]">
                      ✨ {selected.god_name}が顕現しました！
                    </p>
                  )}

                  {/* 進捗 */}
                  <div className="card-glass mb-4 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-3 w-3 rounded-full transition-all duration-500" style={{ background: i < rs ? "var(--color-gold)" : "var(--color-border)", boxShadow: i < rs ? "0 0 6px var(--color-gold)" : "none" }} />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs" style={{ color: "var(--color-text-sub)" }}>
                      {rs >= 5 ? "完全顕現！" : `奉納 ${oc} / ${nextThreshold ?? "?"}`}
                    </p>
                  </div>

                  {/* アイテム一覧 */}
                  {loadingItems ? (
                    <div className="py-8 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>読み込み中...</div>
                  ) : availableItems.length === 0 ? (
                    <div className="py-8 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>奉納できるアイテムがありません。<br />クエストで冒険しよう！</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleOffer(item.id, item.name)}
                          disabled={offeringId === item.id}
                          className={`card-glass flex flex-col items-center p-2 transition active:scale-[0.95] ${offeringId === item.id ? "animate-pulse opacity-50" : ""}`}
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
                </div>
              )}

              <button onClick={() => setSelected(null)} className="btn-ghost mt-5 w-full text-center text-sm" style={{ border: "1px solid var(--color-border)" }}>閉じる</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
