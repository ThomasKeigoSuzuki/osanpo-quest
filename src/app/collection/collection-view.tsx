"use client";

import { useState, useMemo } from "react";
import type { Database } from "@/types/database";

type Item = Database["public"]["Tables"]["items"]["Row"];

export function CollectionView({ items }: { items: Item[] }) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

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
      <h1 className="text-xl font-bold text-[#6B8E7B]">コレクション</h1>
      <p className="mt-1 text-sm text-[#B0A898]">
        集めたアイテム: {items.length}個
      </p>

      {items.length === 0 ? (
        <div className="mt-20 text-center text-[#B0A898]">
          <p className="text-4xl">📦</p>
          <p className="mt-3 text-sm">
            まだアイテムがありません。
            <br />
            クエストをクリアして最初のアイテムを手に入れよう！
          </p>
          <p className="mt-4 text-xs italic text-[#B0A898]">
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
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === tab.key
                    ? "bg-[#6B8E7B] text-white"
                    : "bg-white text-[#8B7E6A] shadow-sm"
                }`}
              >
                {tab.label}
                <span className="ml-1 opacity-60">{tab.items.length}</span>
              </button>
            ))}
          </div>

          {/* 神棚風グリッド */}
          <div className="mt-4">
            {/* 棚板デザイン */}
            <div className="rounded-t-2xl border border-b-0 border-[#D4C5B0] bg-gradient-to-b from-[#F5EDE0] to-[#EDE4D4] p-4">
              <div className="grid grid-cols-3 gap-3">
                {currentItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="flex flex-col items-center rounded-xl bg-white/80 p-2.5 shadow-sm transition hover:shadow-md active:scale-[0.97]"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8DFD0] to-[#D4C5B0]">
                        <span className="text-3xl">✨</span>
                      </div>
                    )}
                    <p className="mt-1.5 w-full truncate text-center text-[10px] font-medium text-[#5A5A5A]">
                      {item.name}
                    </p>
                    <div className="mt-0.5 flex">
                      {Array.from({ length: item.rarity }).map((_, i) => (
                        <span key={i} className="text-[8px] text-yellow-500">
                          ★
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {/* 棚板の影 */}
            <div className="h-3 rounded-b-lg bg-gradient-to-b from-[#C4B59E] to-[#D4C5B0] shadow-md" />
          </div>
        </>
      )}

      {/* アイテム詳細モーダル */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-md animate-[fadeInUp_0.3s_ease-out] rounded-t-3xl bg-[#FFF8F0] p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ハンドル */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D4C5B0]" />

            <div className="flex flex-col items-center">
              {selectedItem.image_url ? (
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="h-40 w-40 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8DFD0] to-[#D4C5B0] shadow-lg">
                  <span className="text-6xl">✨</span>
                </div>
              )}

              <h2 className="mt-4 text-xl font-bold text-[#6B8E7B]">
                {selectedItem.name}
              </h2>

              <div className="mt-1 flex">
                {Array.from({ length: selectedItem.rarity }).map((_, i) => (
                  <span key={i} className="text-sm text-yellow-500">
                    ★
                  </span>
                ))}
              </div>

              <p className="mt-3 text-center text-sm leading-relaxed text-[#5A5A5A]">
                {selectedItem.description}
              </p>

              <div className="mt-4 flex items-center gap-4 text-xs text-[#B0A898]">
                <span>
                  {selectedItem.category === "material"
                    ? "素材"
                    : selectedItem.category === "local"
                      ? "ご当地品"
                      : selectedItem.category === "crafted"
                        ? "合成品"
                        : "秘宝"}
                </span>
                <span>·</span>
                <span>{selectedItem.god_name}より</span>
                {selectedItem.area_name && (
                  <>
                    <span>·</span>
                    <span>{selectedItem.area_name}</span>
                  </>
                )}
              </div>

              <p className="mt-1 text-xs text-[#B0A898]">
                {new Date(selectedItem.obtained_at).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="mt-6 w-full rounded-xl border border-[#D4C5B0] px-4 py-3 text-center text-sm font-medium text-[#8B7E6A] transition hover:bg-white"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
