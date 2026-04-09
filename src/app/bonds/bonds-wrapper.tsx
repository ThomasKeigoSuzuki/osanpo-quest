"use client";

import type { Database } from "@/types/database";
import { getBondLevel, BOND_LEVELS } from "@/lib/bond-system";
import { SHINAKO_MEMORIES, getNextMemory } from "@/lib/shinako-memories";
import Link from "next/link";

type Bond = Database["public"]["Tables"]["god_bonds"]["Row"];
type RecentQuest = { id: string; mission_text: string; start_area_name: string; completed_at: string | null };

export function BondsWrapper({ bond, recentQuests }: { bond: Bond | null; recentQuests: RecentQuest[] }) {
  const bl = bond ? getBondLevel(bond.bond_exp) : null;
  const nextLevel = bl ? BOND_LEVELS.find((l) => l.level === bl.level + 1) : null;
  const days = bond ? Math.floor((Date.now() - new Date(bond.first_met_at).getTime()) / 86400000) : 0;

  return (
    <div className="min-h-dvh bg-fantasy px-4 pt-8 pb-20">
      <div className="flex items-center gap-2">
        <Link href="/" className="btn-ghost !px-2 !py-1 text-sm">←</Link>
        <h1 className="font-wafuu text-xl font-bold text-gold">💫 シナコとの絆</h1>
      </div>

      {!bond ? (
        <div className="card-glass mt-16 p-6 text-center">
          <p className="text-4xl">💫</p>
          <p className="mt-3 text-sm" style={{ color: "var(--color-text-sub)" }}>まだシナコと出会っていません。<br />クエストに出かけよう！</p>
          <Link href="/quest/start" className="btn-primary mt-4 inline-block">クエストを始める</Link>
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-sm">
          {/* シナコ全身画像 */}
          <div className="relative mx-auto h-[300px] w-[220px] overflow-hidden rounded-2xl" style={{ border: "2px solid rgba(232,184,73,0.4)", boxShadow: "0 0 30px rgba(232,184,73,0.15)" }}>
            <img src="/shinako-full.webp" alt="シナコ" className="h-full w-full object-cover" style={{ objectPosition: "center 5%" }} />
          </div>

          {/* 絆レベル */}
          <div className="mt-5 text-center">
            <h2 className="font-wafuu text-2xl font-bold text-gold">シナコ</h2>
            <div className="mt-2 flex items-center justify-center gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} className="text-sm" style={{ color: i < (bl?.level ?? 0) ? "var(--color-gold)" : "var(--color-text-muted)" }}>
                  {i < (bl?.level ?? 0) ? "★" : "☆"}
                </span>
              ))}
            </div>
            <p className="mt-1 text-base font-medium text-gold">{bl?.name ?? "出会い"}</p>
            <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>{bl?.description}</p>

            {/* EXPバー */}
            {bl && !bl.isMax && (
              <div className="mx-auto mt-3 w-full max-w-[240px]">
                <div className="flex justify-between text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  <span>EXP</span>
                  <span>{bl.currentExp}/{bl.nextLevelExp}</span>
                </div>
                <div className="mt-0.5 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--color-card)" }}>
                  <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold)]" style={{ width: `${bl.progress * 100}%` }} />
                </div>
              </div>
            )}
            {nextLevel && (
              <div className="card-glass mx-auto mt-3 w-full max-w-[260px] p-3 text-center">
                <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>次のレベルで解放</p>
                <p className="mt-1 text-xs text-gold">
                  Lv.{nextLevel.level} {nextLevel.name}
                </p>
                {getNextMemory(bl?.level ?? 0) && (
                  <p className="mt-0.5 text-[10px] text-gold">
                    🔓 新しい記憶 「{getNextMemory(bl?.level ?? 0)?.title}」
                  </p>
                )}
                {nextLevel.level === 4 && <p className="mt-0.5 text-[10px] text-gold">💫 シナコの呼び方が変わる…</p>}
                {nextLevel.level === 5 && <p className="mt-0.5 text-[10px] text-gold">💫 シナコの一人称が変わる…</p>}
                {nextLevel.level === 6 && <p className="mt-0.5 text-[10px] text-gold">💫 名前で呼んでくれるようになる…</p>}
              </div>
            )}
          </div>

          {/* ステータス */}
          <div className="card-glass mt-5 flex justify-around p-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gold">{days}</p>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>出会って</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gold">{bond.total_quests}</p>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>冒険</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gold">{bond.offerings_count}</p>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>奉納</p>
            </div>
          </div>

          {/* これまでの軌跡 */}
          <div className="mt-6">
            <h3 className="font-wafuu text-sm font-bold text-gold">これまでの軌跡</h3>
            {recentQuests.length === 0 ? (
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>まだ冒険の記録がありません</p>
            ) : (
              <div className="mt-2 space-y-2">
                {recentQuests.map((q) => (
                  <div key={q.id} className="card-glass flex items-center gap-3 p-3">
                    <span className="text-lg">🗺️</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-[var(--color-text)]">{q.mission_text}</p>
                      <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                        {q.start_area_name} · {q.completed_at ? new Date(q.completed_at).toLocaleDateString("ja-JP") : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* シナコの記憶 */}
          <div className="mt-6">
            <h3 className="font-wafuu text-sm font-bold text-gold">シナコの記憶</h3>
            <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              絆を深めると、シナコの過去が少しずつ見えてくる
            </p>
            <div className="mt-3 space-y-2">
              {SHINAKO_MEMORIES.map((memory) => {
                const unlocked = bl && memory.unlockBondLevel <= bl.level;
                return (
                  <div key={memory.id} className="card-glass p-3" style={{ opacity: unlocked ? 1 : 0.4 }}>
                    {unlocked ? (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="font-wafuu text-xs font-bold text-gold">{memory.title}</p>
                          <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>Lv.{memory.unlockBondLevel}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--color-text-sub)" }}>
                          「{memory.text}」
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🔒</span>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Lv.{memory.unlockBondLevel}で解放</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
