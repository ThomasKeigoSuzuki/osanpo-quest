"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { calculateGoalPosition } from "@/lib/geo";

export function MiniMap({
  lat,
  lng,
  bearing,
  distance,
  direction,
  isInRange,
  routePoints = [],
}: {
  lat: number;
  lng: number;
  bearing: number;
  distance: number | null;
  direction: string;
  isInRange: boolean;
  routePoints?: { lat: number; lng: number }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const pulseMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const arrowMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const initRef = useRef(false);

  // 初期化
  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    initRef.current = true;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [lng, lat],
      zoom: 17,
      interactive: false,
      attributionControl: false,
    });

    // ユーザーマーカー — グローする丸ピン
    const markerEl = document.createElement("div");
    markerEl.innerHTML = `
      <div style="position:relative;width:40px;height:40px">
        <div style="position:absolute;inset:6px;border-radius:50%;background:rgba(107,142,123,0.25);animation:pulseRing 2s ease-out infinite"></div>
        <div style="position:absolute;inset:10px;width:20px;height:20px;border-radius:50%;background:#6B8E7B;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>
      </div>`;
    const marker = new mapboxgl.Marker({ element: markerEl })
      .setLngLat([lng, lat])
      .addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    map.on("load", () => {
      // 軌跡ソース
      map.addSource("trail", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        paint: { "line-color": "#6B8E7B", "line-width": 3, "line-opacity": 0.6 },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // 方角矢印ライン — グロー（太い半透明の下地）
      map.addSource("arrow-line", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: "arrow-line-glow",
        type: "line",
        source: "arrow-line",
        paint: { "line-color": "#FF6B35", "line-width": 10, "line-opacity": 0.2, "line-blur": 6 },
        layout: { "line-cap": "round" },
      });
      map.addLayer({
        id: "arrow-line-layer",
        type: "line",
        source: "arrow-line",
        paint: {
          "line-color": "#FF6B35",
          "line-width": 4,
          "line-opacity": 0.9,
          "line-dasharray": [1.5, 2],
        },
        layout: { "line-cap": "round" },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      arrowMarkerRef.current = null;
      pulseMarkerRef.current = null;
      initRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 軌跡更新
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routePoints.length < 2) return;
    const src = map.getSource("trail") as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: routePoints.map((p) => [p.lng, p.lat]) },
      });
    }
  }, [routePoints]);

  // 位置・方角・状態更新
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    map.easeTo({ center: [lng, lat], zoom: 17, duration: 500 });
    marker.setLngLat([lng, lat]);

    // 既存の補助マーカーを削除
    if (pulseMarkerRef.current) { pulseMarkerRef.current.remove(); pulseMarkerRef.current = null; }
    if (arrowMarkerRef.current) { arrowMarkerRef.current.remove(); arrowMarkerRef.current = null; }

    const arrowSrc = map.getSource("arrow-line") as mapboxgl.GeoJSONSource | undefined;

    if (isInRange) {
      // ゴール圏内 — 大きなパルスリング
      const pulseEl = document.createElement("div");
      pulseEl.innerHTML = `
        <div style="position:relative;width:80px;height:80px">
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #6B8E7B;animation:pulseRing 1.5s ease-out infinite;opacity:0"></div>
          <div style="position:absolute;inset:12px;border-radius:50%;border:2px solid #6B8E7B;animation:pulseRing 1.5s ease-out 0.5s infinite;opacity:0"></div>
        </div>`;
      pulseMarkerRef.current = new mapboxgl.Marker({ element: pulseEl })
        .setLngLat([lng, lat])
        .addTo(map);

      if (arrowSrc) {
        arrowSrc.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
      }
    } else {
      // ゴール圏外 — 方角矢印
      const arrowEnd = calculateGoalPosition(lat, lng, bearing, 200);
      if (arrowSrc) {
        arrowSrc.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [[lng, lat], [arrowEnd.lng, arrowEnd.lat]] },
        });
      }

      // 矢印先端マーカー — 大きな三角形
      const arrowEl = document.createElement("div");
      arrowEl.innerHTML = `<svg width="32" height="32" viewBox="0 0 32 32" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));transform:rotate(${bearing + 90}deg)">
        <polygon points="6,8 26,16 6,24" fill="#FF6B35" stroke="white" stroke-width="2" stroke-linejoin="round"/>
      </svg>`;
      arrowMarkerRef.current = new mapboxgl.Marker({ element: arrowEl })
        .setLngLat([arrowEnd.lng, arrowEnd.lat])
        .addTo(map);
    }
  }, [lat, lng, bearing, isInRange]);

  function formatDistance(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${meters}m`;
  }

  return (
    <div className="w-full px-3">
      <div className="relative overflow-hidden rounded-2xl border border-[rgba(232,184,73,0.3)] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_0_20px_rgba(232,184,73,0.05)]">
        {/* ゴールドのトップライン */}
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-50" />
        <div
          ref={containerRef}
          className="h-[280px] w-full"
          style={{ background: "#16213e" }}
        />
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-30" />

        {/* 四隅の光ドット */}
        <div className="pointer-events-none absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] opacity-40 shadow-[0_0_6px_var(--color-gold)]" />
        <div className="pointer-events-none absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] opacity-40 shadow-[0_0_6px_var(--color-gold)]" />
        <div className="pointer-events-none absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] opacity-40 shadow-[0_0_6px_var(--color-gold)]" />
        <div className="pointer-events-none absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] opacity-40 shadow-[0_0_6px_var(--color-gold)]" />

        {/* 距離オーバーレイバッジ */}
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
          <div
            className={`rounded-full px-5 py-2 shadow-lg backdrop-blur-md ${
              isInRange
                ? "bg-[var(--color-success)]/90 text-white"
                : "bg-[rgba(26,26,46,0.85)] text-[var(--color-text)] border border-[var(--color-border)]"
            }`}
          >
            <span className={`text-sm font-bold ${!isInRange && distance !== null ? "text-gold" : ""}`}>
              {isInRange
                ? "ゴール圏内！"
                : distance !== null
                  ? `${direction}へ ${formatDistance(distance)}`
                  : "取得中..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
