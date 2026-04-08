"use client";

import { useState, useMemo } from "react";
import type { Database } from "@/types/database";
import Link from "next/link";

type Item = Database["public"]["Tables"]["items"]["Row"];

const CATEGORIES = [
  { key: "nature", icon: "🌿", name: "自然の恵み", target: 25,
    subs: [
      { key: "flora", name: "花・植物", hint: "花壇や街路樹のそばで見つかるかも" },
      { key: "mineral", name: "石・鉱物", hint: "川辺や公園の砂利道を歩くと…" },
      { key: "water", name: "水・氷", hint: "噴水や雨上がりに出会えるかも" },
      { key: "wind", name: "風・空気", hint: "高台や開けた場所で風を感じよう" },
      { key: "creature", name: "生き物の痕跡", hint: "鳥の声や猫の足跡を探して" },
    ],
  },
  { key: "food", icon: "🍡", name: "味覚の記憶", target: 25,
    subs: [
      { key: "wagashi", name: "和菓子", hint: "和菓子屋さんの近くを歩くと…" },
      { key: "street", name: "屋台・軽食", hint: "商店街を散歩してみよう" },
      { key: "drink", name: "飲み物", hint: "カフェや自販機のそばで" },
      { key: "scent", name: "匂い", hint: "パン屋や焼き鳥の匂いを探して" },
    ],
  },
  { key: "craft", icon: "🏺", name: "職人の技", target: 25,
    subs: [
      { key: "architecture", name: "建築", hint: "古い建物や神社を訪れよう" },
      { key: "sign", name: "看板・文字", hint: "面白い看板を探してみよう" },
      { key: "tool", name: "道具", hint: "工房や市場の近くで" },
      { key: "textile", name: "布・織物", hint: "呉服店や手芸屋さんの近くで" },
    ],
  },
  { key: "mystery", icon: "🔮", name: "不思議なもの", target: 25,
    subs: [
      { key: "light", name: "光", hint: "夕暮れや朝焼けの時間に歩こう" },
      { key: "sound", name: "音", hint: "静かな場所で耳を澄ませて" },
      { key: "time", name: "時間", hint: "古い時計台や日時計を探して" },
      { key: "presence", name: "気配", hint: "人気のない路地裏で…" },
    ],
  },
  { key: "memory", icon: "🎐", name: "風景の欠片", target: 25,
    subs: [
      { key: "morning", name: "朝", hint: "早朝の散歩で手に入る" },
      { key: "noon", name: "昼", hint: "昼間の明るい時間に" },
      { key: "evening", name: "夕", hint: "夕方の散歩で出会える" },
      { key: "night", name: "夜", hint: "夜の冒険で見つかるかも" },
    ],
  },
  { key: "divine", icon: "✨", name: "神様の贈り物", target: 25,
    subs: [
      { key: "shinako", name: "シナコの贈り物", hint: "シナコのクエストをクリアしよう" },
      { key: "crafted", name: "合成品", hint: "特別な組み合わせで生まれる" },
      { key: "seasonal", name: "季節限定", hint: "季節ごとの冒険で手に入る" },
    ],
  },
] as const;

const TOTAL_TARGET = CATEGORIES.reduce((s, c) => s + c.target, 0);

export function CatalogView({ items }: { items: Item[] }) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // カテゴリごとの集計
  const stats = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const cat = item.category || "mystery";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [items]);

  const totalCollected = items.length;
  const activeCat = CATEGORIES.find((c) => c.key === selectedCat);

  if (activeCat) {
    const catItems = stats.get(activeCat.key) || [];
    const subMap = new Map<string, Item[]>();
    for (const item of catItems) {
      const sub = item.sub_category || "other";
      if (!subMap.has(sub)) subMap.set(sub, []);
      subMap.get(sub)!.push(item);
    }

    return (
      <div className="px-4 pt-8 pb-4">
        {/* 戻る */}
        <button onClick={() => setSelectedCat(null)} className="btn-ghost mb-4 !px-3 !py-2 text-sm">
          ← 図鑑に戻る
        </button>

        <div className="flex items-center gap-3">
          <span className="text-2xl">{activeCat.icon}</span>
          <div>
            <h2 className="font-wafuu text-lg font-bold text-gold">{activeCat.name}</h2>
            <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>{catItems.length}/{activeCat.target}</p>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="card-glass mt-3 h-2 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold)]"
            style={{ width: `${Math.min(100, (catItems.length / activeCat.target) * 100)}%`, transition: "width 0.5s" }}
          />
        </div>

        {/* サブカテゴリ */}
        <div className="mt-6 space-y-6">
          {activeCat.subs.map((sub) => {
            const subItems = subMap.get(sub.key) || [];
            return (
              <div key={sub.key}>
                <h3 className="mb-2 text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>
                  {sub.name}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {/* 入手済み */}
                  {subItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="card-glass flex flex-col items-center p-2 transition active:scale-[0.97]"
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg" style={{ background: "var(--color-card)" }}>
                          <span className="text-xl">✨</span>
                        </div>
                      )}
                      <p className="mt-1 w-full truncate text-center text-[10px]" style={{ color: "var(--color-text)" }}>{item.name}</p>
                      <div className="flex">
                        {Array.from({ length: item.rarity }).map((_, i) => (
                          <span key={i} className="text-[7px]" style={{ color: "var(--color-gold)" }}>★</span>
                        ))}
                      </div>
                    </button>
                  ))}
                  {/* 未入手プレースホルダー */}
                  {subItems.length === 0 && (
                    <div className="flex flex-col items-center rounded-2xl border border-dashed p-3" style={{ borderColor: "var(--color-border)" }}>
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <span className="text-xl" style={{ color: "var(--color-text-muted)" }}>？</span>
                      </div>
                      <p className="mt-1 text-center text-[9px]" style={{ color: "var(--color-text-muted)" }}>{sub.hint}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* アイテム詳細モーダル */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
            <div className="card-glass w-full max-w-md animate-[fadeInUp_0.3s_ease-out] rounded-t-3xl p-6 safe-bottom" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--color-border)" }} />
              <div className="flex flex-col items-center">
                {selectedItem.image_url ? (
                  <img src={selectedItem.image_url} alt={selectedItem.name} className="h-36 w-36 rounded-2xl object-cover" style={{ border: "2px solid var(--color-gold)" }} />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-2xl" style={{ background: "var(--color-card)", border: "2px solid var(--color-gold)" }}>
                    <span className="text-5xl">✨</span>
                  </div>
                )}
                <h3 className="font-wafuu mt-4 text-xl font-bold text-gold">{selectedItem.name}</h3>
                <div className="mt-1 flex">
                  {Array.from({ length: selectedItem.rarity }).map((_, i) => (
                    <span key={i} className="text-sm" style={{ color: "var(--color-gold)" }}>★</span>
                  ))}
                </div>
                <p className="mt-3 text-center text-sm leading-relaxed" style={{ color: "var(--color-text-sub)" }}>{selectedItem.description}</p>
                <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  シナコより{selectedItem.area_name ? ` · ${selectedItem.area_name}` : ""}
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="btn-ghost mt-6 w-full text-center text-sm" style={{ border: "1px solid var(--color-border)" }}>閉じる</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // メイン: カテゴリ一覧
  return (
    <div className="px-4 pt-8 pb-4">
      <h1 className="font-wafuu text-xl font-bold text-gold">📖 冒険図鑑</h1>

      {/* 全体進捗 */}
      <div className="card-glass mt-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--color-text-sub)" }}>コンプリート率</p>
          <p className="text-sm font-bold text-gold">{totalCollected}/{TOTAL_TARGET} ({Math.round((totalCollected / TOTAL_TARGET) * 100)}%)</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--color-card)" }}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold-light)]"
            style={{ width: `${Math.min(100, (totalCollected / TOTAL_TARGET) * 100)}%`, transition: "width 0.5s" }}
          />
        </div>
      </div>

      {/* カテゴリグリッド */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => {
          const count = stats.get(cat.key)?.length || 0;
          const pct = Math.min(100, (count / cat.target) * 100);
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCat(cat.key)}
              className="card-glass p-4 text-left transition active:scale-[0.97]"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{cat.icon}</span>
                <span className="font-wafuu text-sm font-bold" style={{ color: "var(--color-text)" }}>{cat.name}</span>
              </div>
              <p className="mt-2 text-xs text-gold">{count}/{cat.target}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--color-card)" }}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* コレクションへのリンク */}
      <Link href="/collection" className="btn-ghost mt-6 block w-full text-center text-sm" style={{ border: "1px solid var(--color-border)" }}>
        コレクションを見る →
      </Link>
    </div>
  );
}
