"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Database } from "@/types/database";

type Item = Database["public"]["Tables"]["items"]["Row"];

export function CollectionView({ items }: { items: Item[] }) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Escキーでモーダルを閉じる
  const handleClose = useCallback(() => setSelectedItem(null), []);
  useEffect(() => {
    if (!selectedItem) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedItem, handleClose]);

  // エリア別にグルーピング
  const tabs = useMemo(() => {
    const areas = new Map<string, Item[]>();
    const shinako: Item[] = [];

    for (const item of items) {
      if (item.god_name === "シナコ") {
        shinako.push(item);
      } else {
        const area = item.area_name || "その他";
        if (!areas.has(area)) areas.set(area, []);
        areas.get(area)!.push(item);
      }
    }

    const result: { key: string; label: string; items: Item[] }[] = [
      { key: "all", label: "すべて", items },
    ];
    if (shinako.length > 0) {
      result.push({ key: "shinako", label: "シナコの贈り物", items: shinako });
    }
    for (const [area, areaItems] of areas) {
      result.push({ key: area, label: area, items: areaItems });
    }
    return result;
  }, [items]);

  const currentItems =
    tabs.find((t) => t.key === activeTab)?.items || items;

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-wafuu text-xl font-bold text-gold">コレクション</h1>
        <Link href="/catalog" className="text-xs text-[var(--color-teal)] hover:underline">図鑑を見る →</Link>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--color-text-sub)" }}>
        集めたアイテム: {items.length}個
      </p>

      {items.length === 0 ? (
        <div className="card-glass mt-20 p-6 text-center">
          <p className="text-4xl">📦</p>
          <p className="mt-3 text-sm" style={{ color: "var(--color-text-sub)" }}>
            まだアイテムがありません。
            <br />
            クエストをクリアして最初のアイテムを手に入れよう！
          </p>
          <p className="mt-4 text-xs italic text-gold">
            「まだ何も持ってないの？ ふふ、最初の冒険に出かけてみなよ！」
            <br />
            <span className="font-wafuu not-italic">—シナコ</span>
          </p>
        </div>
      ) : (
        <>
          {/* エリアタブ */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`card-glass shrink-0 px-4 py-2 text-xs font-medium transition ${
                  activeTab === tab.key
                    ? "text-gold border-b-2"
                    : ""
                }`}
                style={
                  activeTab === tab.key
                    ? { borderBottomColor: "var(--color-gold)" }
                    : { color: "var(--color-text-muted)" }
                }
              >
                {tab.label}
                <span className="ml-1 opacity-60">{tab.items.length}</span>
              </button>
            ))}
          </div>

          {/* アイテムグリッド */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {currentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`card-glass flex flex-col items-center p-2.5 transition active:scale-[0.97] ${
                  item.rarity >= 4 ? "glow-gold" : ""
                }`}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg" style={{ background: "var(--color-card)" }}>
                    <span className="text-3xl">✨</span>
                  </div>
                )}
                <p className="mt-1.5 w-full truncate text-center text-xs font-medium" style={{ color: "var(--color-text)" }}>
                  {item.name}
                </p>
                <div className="mt-0.5 flex">
                  {Array.from({ length: item.rarity }).map((_, i) => (
                    <span
                      key={i}
                      className="text-[8px]"
                      style={{
                        color: "var(--color-gold)",
                        animation: "starGlow 2s ease-in-out infinite",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* アイテム詳細モーダル */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="card-glass w-full max-w-md animate-[fadeInUp_0.3s_ease-out] rounded-t-3xl p-6 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ハンドル */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--color-border)" }} />

            <div className="flex flex-col items-center">
              {selectedItem.image_url ? (
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="h-40 w-40 rounded-2xl object-cover shadow-lg"
                  style={{ border: "2px solid var(--color-gold)", boxShadow: "0 0 20px rgba(232,184,73,0.3)" }}
                />
              ) : (
                <div
                  className="flex h-40 w-40 items-center justify-center rounded-2xl shadow-lg"
                  style={{ background: "var(--color-card)", border: "2px solid var(--color-gold)" }}
                >
                  <span className="text-6xl">✨</span>
                </div>
              )}

              <h2 className="mt-4 text-xl font-bold text-gold">
                {selectedItem.name}
              </h2>

              <div className="mt-1 flex">
                {Array.from({ length: selectedItem.rarity }).map((_, i) => (
                  <span
                    key={i}
                    className="text-sm"
                    style={{
                      color: "var(--color-gold)",
                      animation: "starGlow 2s ease-in-out infinite",
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>

              <p className="mt-3 text-center text-sm leading-relaxed" style={{ color: "var(--color-text-sub)" }}>
                {selectedItem.description}
              </p>

              <div className="mt-4 space-y-1.5 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                <p>
                  {selectedItem.category === "material"
                    ? "素材"
                    : selectedItem.category === "crafted"
                      ? "合成品"
                      : "シナコの贈り物"}
                  {" · "}
                  <span className="font-wafuu text-gold">シナコ</span>より
                </p>
                {selectedItem.area_name && (
                  <p>📍 {selectedItem.area_name}</p>
                )}
                <p>
                  🗓{" "}
                  {new Date(selectedItem.obtained_at).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="btn-ghost mt-6 w-full text-center text-sm"
              style={{ border: "1px solid var(--color-border)" }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
