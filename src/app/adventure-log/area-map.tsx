"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import type { AreaStat } from "./adventure-log-wrapper";

export function AreaMap({ areas }: { areas: AreaStat[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [selectedArea, setSelectedArea] = useState<AreaStat | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || areas.length === 0) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [areas[0].lng, areas[0].lat],
      zoom: 12,
      attributionControl: false,
    });

    map.on("load", () => {
      // 全エリアが収まるように fitBounds
      const bounds = new mapboxgl.LngLatBounds();
      areas.forEach((a) => bounds.extend([a.lng, a.lat]));
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });

      // マーカーを追加
      areas.forEach((area) => {
        const size = area.visit_count >= 5 ? 20 : area.visit_count >= 3 ? 16 : 12;

        const el = document.createElement("div");
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "50%";
        el.style.background = "var(--color-gold)";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 0 12px rgba(232,184,73,0.5)";
        el.style.cursor = "pointer";
        el.style.animation = "pulseRing 3s ease-in-out infinite";

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedArea(area);
        });

        new mapboxgl.Marker({ element: el })
          .setLngLat([area.lng, area.lat])
          .addTo(map);
      });
    });

    map.on("click", () => setSelectedArea(null));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas]);

  // 統計
  const totalVisits = areas.reduce((s, a) => s + a.visit_count, 0);
  const mostVisited = areas.length > 0
    ? areas.reduce((max, a) => (a.visit_count > max.visit_count ? a : max), areas[0])
    : null;

  if (areas.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-4xl">🗺️</p>
        <p className="mt-3 text-sm" style={{ color: "var(--color-text-sub)" }}>
          まだ冒険の記録がありません。<br />クエストに出かけて地図を埋めよう！
        </p>
        <Link href="/quest/start" className="btn-primary mt-4 inline-block">クエストを始める</Link>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* マップ */}
      <div className="relative overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(232,184,73,0.3)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 0 20px rgba(232,184,73,0.05)" }}>
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-50" />
        <div ref={containerRef} className="h-[400px] w-full" style={{ background: "#16213e" }} />
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-30" />

        {/* 四隅の光ドット */}
        <div className="pointer-events-none absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] opacity-40 shadow-[0_0_6px_var(--color-gold)]" />
        <div className="pointer-events-none absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] opacity-40 shadow-[0_0_6px_var(--color-gold)]" />
        <div className="pointer-events-none absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] opacity-40 shadow-[0_0_6px_var(--color-gold)]" />
        <div className="pointer-events-none absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] opacity-40 shadow-[0_0_6px_var(--color-gold)]" />

        {/* エリアポップアップ */}
        {selectedArea && (
          <div
            className="pointer-events-none absolute left-4 right-4 top-4 z-10 animate-[fadeInUp_0.2s_ease-out]"
          >
            <div className="card-glass pointer-events-auto mx-auto max-w-xs p-3">
              <p className="font-wafuu text-sm font-bold text-gold">{selectedArea.area_name}</p>
              <div className="mt-1.5 flex gap-4 text-[10px]" style={{ color: "var(--color-text-sub)" }}>
                <span>📍 {selectedArea.visit_count}回訪問</span>
                <span>💎 {selectedArea.item_count}個獲得</span>
              </div>
              <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                最終訪問: {selectedArea.last_visit ? new Date(selectedArea.last_visit).toLocaleDateString("ja-JP") : "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 統計サマリー */}
      <div className="mt-4 flex gap-3">
        <div className="card-glass flex flex-1 flex-col items-center py-3">
          <span className="text-base">🗺️</span>
          <p className="text-gold mt-0.5 text-lg font-bold">{areas.length}</p>
          <p className="text-[9px]" style={{ color: "var(--color-text-sub)" }}>エリア</p>
        </div>
        <div className="card-glass flex flex-1 flex-col items-center py-3">
          <span className="text-base">📍</span>
          <p className="text-gold mt-0.5 truncate text-center text-xs font-bold" style={{ maxWidth: 80 }}>
            {mostVisited?.area_name || "—"}
          </p>
          <p className="text-[9px]" style={{ color: "var(--color-text-sub)" }}>最多訪問</p>
        </div>
        <div className="card-glass flex flex-1 flex-col items-center py-3">
          <span className="text-base">🏆</span>
          <p className="text-gold mt-0.5 text-lg font-bold">{totalVisits}</p>
          <p className="text-[9px]" style={{ color: "var(--color-text-sub)" }}>総クエスト</p>
        </div>
      </div>
    </div>
  );
}
