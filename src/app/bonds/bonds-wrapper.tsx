"use client";

import type { Database } from "@/types/database";

type Bond = Database["public"]["Tables"]["god_bonds"]["Row"];

// Inline to avoid dynamic import issues
export function BondsWrapper({ bonds }: { bonds: Bond[] }) {
  return <BondsView bonds={bonds} />;
}

import { useState } from "react";
import { getBondLevel, BOND_LEVELS } from "@/lib/bond-system";
import Link from "next/link";

function BondsView({ bonds }: { bonds: Bond[] }) {
  const [selected, setSelected] = useState<Bond | null>(null);

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="btn-ghost !px-2 !py-1 text-sm">←</Link>
        <h1 className="font-wafuu text-xl font-bold text-gold">💫 神様との絆</h1>
      </div>

      {bonds.length === 0 ? (
        <div className="card-glass mt-16 p-6 text-center">
          <p className="text-4xl">💫</p>
          <p className="mt-3 text-sm" style={{ color: "var(--color-text-sub)" }}>
            まだ神様と出会っていません。<br />クエストに出かけよう！
          </p>
          <Link href="/quest/start" className="btn-primary mt-4 inline-block">クエストを始める</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bonds.map((bond) => {
            const bl = getBondLevel(bond.bond_exp);
            const daysSinceMet = Math.floor(
              (Date.now() - new Date(bond.first_met_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return (
              <button
                key={bond.id}
                onClick={() => setSelected(bond)}
                className="card-glass flex w-full items-center gap-4 p-4 text-left transition active:scale-[0.99]"
              >
                {/* アバター */}
                {bond.god_image_url || bond.god_type === "wanderer" ? (
                  <img
                    src={bond.god_type === "wanderer" ? "/shinako.png" : bond.god_image_url!}
                    alt={bond.god_name}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                    style={{
                      border: `${Math.min(4, bl.level)}px solid var(--color-gold)`,
                      boxShadow: bl.level >= 5 ? "0 0 12px rgba(232,184,73,0.4)" : "none",
                    }}
                  />
                ) : (
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "var(--color-card)",
                      border: `${Math.min(4, bl.level)}px solid var(--color-gold)`,
                    }}
                  >
                    <span className="text-xl font-bold text-[var(--color-gold)]">{bond.god_name.charAt(0)}</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-wafuu text-sm font-bold text-gold">{bond.god_name}</span>
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {bond.god_type === "wanderer" ? "放浪神" : "ご当地神"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span key={i} className="text-[10px]" style={{ color: i < bl.level ? "var(--color-gold)" : "var(--color-text-muted)" }}>
                        {i < bl.level ? "★" : "☆"}
                      </span>
                    ))}
                    <span className="ml-1 text-xs" style={{ color: "var(--color-text-sub)" }}>{bl.name}</span>
                  </div>
                  {/* EXPバー */}
                  {!bl.isMax && (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: "var(--color-card)" }}>
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold)]" style={{ width: `${bl.progress * 100}%` }} />
                    </div>
                  )}
                  <div className="mt-1 flex gap-3 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    <span>出会って{daysSinceMet}日</span>
                    <span>{bond.total_quests}回冒険</span>
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
        const daysSinceMet = Math.floor((Date.now() - new Date(selected.first_met_at).getTime()) / (1000 * 60 * 60 * 24));

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <div className="card-glass w-full max-w-md animate-[fadeInUp_0.3s_ease-out] rounded-t-3xl p-6 safe-bottom" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--color-border)" }} />

              <div className="flex flex-col items-center">
                {/* アバター */}
                {selected.god_image_url || selected.god_type === "wanderer" ? (
                  <img
                    src={selected.god_type === "wanderer" ? "/shinako.png" : selected.god_image_url!}
                    alt={selected.god_name}
                    className="h-24 w-24 rounded-full object-cover"
                    style={{ border: "3px solid var(--color-gold)", boxShadow: "0 0 20px rgba(232,184,73,0.3)" }}
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "var(--color-card)", border: "3px solid var(--color-gold)" }}>
                    <span className="text-3xl font-bold text-[var(--color-gold)]">{selected.god_name.charAt(0)}</span>
                  </div>
                )}

                <h2 className="font-wafuu mt-3 text-xl font-bold text-gold">{selected.god_name}</h2>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {selected.god_type === "wanderer" ? "放浪の風神" : "ご当地神"}
                </p>

                {/* 絆レベル */}
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <span key={i} className="text-sm" style={{ color: i < bl.level ? "var(--color-gold)" : "var(--color-text-muted)" }}>
                      {i < bl.level ? "★" : "☆"}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-medium text-gold">{bl.name}</p>
                <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>{bl.description}</p>

                {/* EXPバー */}
                {!bl.isMax && (
                  <div className="mt-3 w-full max-w-[200px]">
                    <div className="flex justify-between text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      <span>EXP</span>
                      <span>{bl.currentExp}/{bl.nextLevelExp}</span>
                    </div>
                    <div className="mt-0.5 h-2 overflow-hidden rounded-full" style={{ background: "var(--color-card)" }}>
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold)]" style={{ width: `${bl.progress * 100}%` }} />
                    </div>
                  </div>
                )}

                {/* 次のレベル */}
                {nextLevel && (
                  <div className="card-glass mt-4 w-full p-3 text-center">
                    <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>次のレベル</p>
                    <p className="text-sm font-medium text-gold">Lv.{nextLevel.level} {nextLevel.name}</p>
                    <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>{nextLevel.description}</p>
                  </div>
                )}

                {/* 統計 */}
                <div className="mt-4 flex gap-6 text-center">
                  <div>
                    <p className="text-lg font-bold text-gold">{daysSinceMet}</p>
                    <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>出会って日数</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gold">{selected.total_quests}</p>
                    <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>一緒に冒険</p>
                  </div>
                </div>
              </div>

              <button onClick={() => setSelected(null)} className="btn-ghost mt-6 w-full text-center text-sm" style={{ border: "1px solid var(--color-border)" }}>閉じる</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
