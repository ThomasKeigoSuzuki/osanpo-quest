"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getDistanceMeters } from "@/lib/geo";

type RoutePoint = { lat: number; lng: number; timestamp: string };

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
  route_log: RoutePoint[];
  started_at: string;
  completed_at: string | null;
  item_name: string | null;
  item_description: string | null;
  item_image_url: string | null;
  item_rarity: number | null;
};

/** ルートの総距離をメートルで計算 */
function calcRouteDistance(route: RoutePoint[]): number {
  if (!route || route.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += getDistanceMeters(route[i - 1].lat, route[i - 1].lng, route[i].lat, route[i].lng);
  }
  return Math.round(total);
}

function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${m}m`;
}

export function AdventureLogView({ logs }: { logs: AdventureLog[] }) {
  const [selected, setSelected] = useState<AdventureLog | null>(null);

  // Escキーでモーダルを閉じる
  const handleClose = useCallback(() => setSelected(null), []);
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, handleClose]);

  // 各ログに距離を付与
  const logsWithDist = useMemo(
    () => logs.map((l) => ({ ...l, distance: calcRouteDistance(l.route_log) })),
    [logs]
  );

  // 日付でグルーピング
  const grouped = useMemo(() => {
    const g: { date: string; entries: (AdventureLog & { distance: number })[]; totalDist: number }[] = [];
    const map = new Map<string, (AdventureLog & { distance: number })[]>();

    for (const log of logsWithDist) {
      const date = log.completed_at
        ? new Date(log.completed_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
        : "不明";
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(log);
    }

    for (const [date, entries] of map) {
      g.push({ date, entries, totalDist: entries.reduce((s, e) => s + e.distance, 0) });
    }
    return g;
  }, [logsWithDist]);

  const totalDistance = logsWithDist.reduce((s, l) => s + l.distance, 0);

  return (
    <div className="px-4 pt-8 pb-4">
      <h1 className="font-wafuu text-xl font-bold text-[#6B8E7B]">冒険日記</h1>
      <div className="mt-1 flex items-center gap-3 text-sm text-[#B0A898]">
        <span>{logs.length}件の冒険</span>
        {totalDistance > 0 && (
          <>
            <span>·</span>
            <span>累計 {formatDist(totalDistance)}</span>
          </>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="mt-20 text-center text-[#B0A898]">
          <p className="text-4xl">📖</p>
          <p className="mt-3 text-sm">
            まだ冒険の記録がありません。<br />最初のクエストに出かけよう！
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map(({ date, entries, totalDist }) => (
            <div key={date}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-medium text-[#B0A898]">{date}</h2>
                {totalDist > 0 && (
                  <span className="text-xs text-[#B0A898]">🚶 {formatDist(totalDist)}</span>
                )}
              </div>
              <div className="space-y-3">
                {entries.map((log) => (
                  <button
                    key={log.quest_id}
                    onClick={() => setSelected(log)}
                    className="w-full rounded-xl bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{log.god_type === "wanderer" ? "🌬️" : "⛩️"}</span>
                        <span className="font-wafuu text-sm font-medium text-[#6B8E7B]">{log.god_name}</span>
                      </div>
                      <span className="text-xs text-[#B0A898]">
                        {log.completed_at ? new Date(log.completed_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#5A5A5A]">{log.mission_text}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-[#B0A898]">{log.start_area_name}</span>
                      {log.distance > 0 && (
                        <span className="text-xs text-[#6B8E7B]">🚶 {formatDist(log.distance)}</span>
                      )}
                    </div>
                    {log.item_name && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#FFF8F0] p-2">
                        {log.item_image_url ? (
                          <img src={log.item_image_url} alt={log.item_name} className="h-6 w-6 rounded object-cover" />
                        ) : (
                          <span className="text-sm">✨</span>
                        )}
                        <span className="text-xs font-medium text-[#8B7E6A]">{log.item_name}</span>
                        {log.item_rarity && (
                          <span className="ml-auto text-[10px] text-yellow-500">{"★".repeat(log.item_rarity)}</span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 詳細モーダル */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md animate-[fadeInUp_0.3s_ease-out] overflow-y-auto rounded-t-3xl bg-[#FFF8F0] p-6 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D4C5B0]" />

            <div className="flex items-center gap-2">
              <span>{selected.god_type === "wanderer" ? "🌬️" : "⛩️"}</span>
              <span className="font-wafuu font-bold text-[#6B8E7B]">{selected.god_name}</span>
              <span className="ml-auto text-xs text-[#B0A898]">
                {selected.completed_at ? new Date(selected.completed_at).toLocaleDateString("ja-JP") : ""}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[#5A5A5A]">{selected.mission_text}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-[#E8DFD0] px-2 py-0.5 text-xs text-[#8B7E6A]">
                {selected.mission_type === "direction" ? "方角・距離" : selected.mission_type === "discovery" ? "発見" : "体験"}
              </span>
              <span className="text-xs text-[#B0A898]">{selected.start_area_name}</span>
              {calcRouteDistance(selected.route_log) > 0 && (
                <span className="ml-auto text-xs text-[#6B8E7B]">
                  🚶 {formatDist(calcRouteDistance(selected.route_log))}
                </span>
              )}
            </div>

            {/* Leafletルートマップ */}
            {selected.route_log && selected.route_log.length > 1 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[#8B7E6A]">歩いたルート</p>
                <RouteMapMapbox
                  route={selected.route_log}
                  startLat={selected.start_lat}
                  startLng={selected.start_lng}
                  goalLat={selected.goal_lat}
                  goalLng={selected.goal_lng}
                />
              </div>
            )}

            {selected.item_name && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                {selected.item_image_url ? (
                  <img src={selected.item_image_url} alt={selected.item_name} className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#E8DFD0]">
                    <span className="text-2xl">✨</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#5A5A5A]">{selected.item_name}</p>
                  {selected.item_rarity && <p className="text-xs text-yellow-500">{"★".repeat(selected.item_rarity)}</p>}
                  {selected.item_description && <p className="mt-0.5 text-xs text-[#B0A898]">{selected.item_description}</p>}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
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

/** Mapbox を使ったルートマップ */
function RouteMapMapbox({
  route,
  startLat,
  startLng,
  goalLat,
  goalLng,
}: {
  route: RoutePoint[];
  startLat: number;
  startLng: number;
  goalLat: number;
  goalLng: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const coords = route.map((p) => [p.lng, p.lat] as [number, number]);
    const allLngs = [...coords.map((c) => c[0]), startLng, goalLng];
    const allLats = [...coords.map((c) => c[1]), startLat, goalLat];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [(Math.min(...allLngs) + Math.max(...allLngs)) / 2, (Math.min(...allLats) + Math.max(...allLats)) / 2],
      zoom: 14,
      interactive: true,
      attributionControl: false,
      dragRotate: false,
      scrollZoom: false,
    });

    map.on("load", () => {
      // ルートライン
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: { "line-color": "#6B8E7B", "line-width": 3, "line-opacity": 0.8 },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // 全体が見えるようにフィット
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      bounds.extend([startLng, startLat]);
      bounds.extend([goalLng, goalLat]);
      map.fitBounds(bounds, { padding: 30 });
    });

    // スタートマーカー
    const startEl = document.createElement("div");
    startEl.innerHTML = '<div style="width:12px;height:12px;background:#6B8E7B;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>';
    new mapboxgl.Marker({ element: startEl }).setLngLat([startLng, startLat]).addTo(map);

    // ゴールマーカー
    const goalEl = document.createElement("div");
    goalEl.innerHTML = '<div style="width:12px;height:12px;background:#E85D4A;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>';
    new mapboxgl.Marker({ element: goalEl }).setLngLat([goalLng, goalLat]).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="overflow-hidden rounded-xl border border-[#D4C5B0] shadow-sm"
      style={{ filter: "sepia(0.3) saturate(0.8) brightness(1.05)" }}
    >
      <div ref={containerRef} className="h-[200px] w-full" style={{ background: "#F5EDE0" }} />
    </div>
  );
}
