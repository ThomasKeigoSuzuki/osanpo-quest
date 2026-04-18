"use client";

import { useState } from "react";
import type { Database } from "@/types/database";
import { CollectionView } from "../collection/collection-view";
import { CatalogWrapper } from "../catalog/catalog-wrapper";
import { AdventureLogWrapper } from "../adventure-log/adventure-log-wrapper";

type Item = Database["public"]["Tables"]["items"]["Row"];

type AdventureLog = {
  quest_id: string;
  user_id: string;
  god_type: string;
  god_name: string;
  mission_text: string;
  mission_type: string;
  start_area_name: string;
  start_lat: number;
  start_lng: number;
  goal_lat: number;
  goal_lng: number;
  route_log: { lat: number; lng: number; timestamp: string }[];
  started_at: string;
  completed_at: string | null;
  item_name: string | null;
  item_description: string | null;
  item_image_url: string | null;
  item_rarity: number | null;
};

type TabKey = "collection" | "catalog" | "log";

const TABS: { key: TabKey; label: string; emoji: string; description: string }[] = [
  { key: "collection", label: "たから", emoji: "🎁", description: "集めたアイテム" },
  { key: "catalog", label: "図鑑", emoji: "📜", description: "神さまの記録" },
  { key: "log", label: "日記", emoji: "🗺️", description: "歩いた道のり" },
];

export function LibraryView({
  initialTab,
  items,
  logs,
}: {
  initialTab?: string;
  items: Item[];
  logs: AdventureLog[];
}) {
  const defaultTab: TabKey =
    initialTab === "catalog" || initialTab === "log" ? (initialTab as TabKey) : "collection";
  const [tab, setTab] = useState<TabKey>(defaultTab);

  const currentMeta = TABS.find((t) => t.key === tab)!;

  return (
    <div className="pb-20">
      {/* ヘッダー */}
      <header className="px-4 pt-6 pb-2">
        <p className="text-[10px] tracking-[0.2em]" style={{ color: "var(--accent-gold-dark)" }}>
          OSANPO ARCHIVE
        </p>
        <h1 className="font-wafuu mt-1 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          栞
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          {currentMeta.emoji} {currentMeta.description}
        </p>
      </header>

      {/* セグメント切替 */}
      <div
        className="mx-4 mt-3 flex rounded-full p-1"
        style={{
          background: "rgba(237,228,211,0.8)",
          border: "1px solid rgba(217,164,65,0.25)",
        }}
        role="tablist"
      >
        {TABS.map((t) => {
          const isActive = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.key)}
              className="flex-1 rounded-full py-2 text-xs font-medium transition-all active:scale-[0.97]"
              style={{
                background: isActive
                  ? "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))"
                  : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: isActive ? 700 : 500,
                boxShadow: isActive ? "0 2px 8px rgba(217,164,65,0.28)" : undefined,
              }}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 中身 */}
      <div className="mt-2">
        {tab === "collection" && <CollectionView items={items} />}
        {tab === "catalog" && <CatalogWrapper items={items} />}
        {tab === "log" && <AdventureLogWrapper logs={logs} />}
      </div>
    </div>
  );
}
