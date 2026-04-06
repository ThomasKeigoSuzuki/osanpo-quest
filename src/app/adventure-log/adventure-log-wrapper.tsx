"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const AdventureLogView = dynamic(
  () => import("./adventure-log-view").then((m) => m.AdventureLogView),
  { ssr: false }
);

const AreaMap = dynamic(
  () => import("./area-map").then((m) => m.AreaMap),
  { ssr: false }
);

type AdventureLog = {
  quest_id: string;
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

export type AreaStat = {
  area_name: string;
  lat: number;
  lng: number;
  visit_count: number;
  last_visit: string;
  item_count: number;
};

export function AdventureLogWrapper({ logs }: { logs: AdventureLog[] }) {
  const [tab, setTab] = useState<"log" | "map">("log");

  // エリア集計
  const areaStats: AreaStat[] = (() => {
    const map = new Map<string, AreaStat>();
    for (const log of logs) {
      const key = log.start_area_name;
      const existing = map.get(key);
      if (existing) {
        existing.visit_count++;
        if (log.completed_at && log.completed_at > existing.last_visit) {
          existing.last_visit = log.completed_at;
        }
        if (log.item_name) existing.item_count++;
      } else {
        map.set(key, {
          area_name: key,
          lat: log.start_lat,
          lng: log.start_lng,
          visit_count: 1,
          last_visit: log.completed_at || log.started_at || "",
          item_count: log.item_name ? 1 : 0,
        });
      }
    }
    return Array.from(map.values());
  })();

  return (
    <div className="px-4 pt-8 pb-4">
      <h1 className="font-wafuu text-xl font-bold text-gold">冒険の記録</h1>

      {/* タブ */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setTab("log")}
          className={`card-glass flex-1 px-3 py-2.5 text-center text-xs font-medium transition ${
            tab === "log" ? "text-gold" : ""
          }`}
          style={tab === "log" ? { borderBottom: "2px solid var(--color-gold)" } : { color: "var(--color-text-muted)" }}
        >
          📖 冒険日記
        </button>
        <button
          onClick={() => setTab("map")}
          className={`card-glass flex-1 px-3 py-2.5 text-center text-xs font-medium transition ${
            tab === "map" ? "text-gold" : ""
          }`}
          style={tab === "map" ? { borderBottom: "2px solid var(--color-gold)" } : { color: "var(--color-text-muted)" }}
        >
          🗺️ エリアマップ
        </button>
      </div>

      {tab === "log" ? (
        <AdventureLogView logs={logs} />
      ) : (
        <AreaMap areas={areaStats} />
      )}
    </div>
  );
}
