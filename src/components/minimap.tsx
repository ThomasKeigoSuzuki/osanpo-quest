"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { calculateGoalPosition } from "@/lib/geo";

function circleGeoJSON(lat: number, lng: number, radiusMeters: number, steps = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const km = radiusMeters / 1000;
  const dX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const dY = km / 110.574;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    coords.push([lng + dX * Math.cos(t), lat + dY * Math.sin(t)]);
  }
  coords.push(coords[0]);
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

export function MiniMap({
  lat,
  lng,
  bearing,
  distance,
  direction,
  isInRange,
  routePoints = [],
  goalLat,
  goalLng,
  goalRadiusMeters,
}: {
  lat: number;
  lng: number;
  bearing: number;
  distance: number | null;
  direction: string;
  isInRange: boolean;
  routePoints?: { lat: number; lng: number }[];
  goalLat: number;
  goalLng: number;
  goalRadiusMeters: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const goalMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pulseMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const arrowMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const styleLoadedRef = useRef(false);
  const initRef = useRef(false);

  // 初期化
  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    initRef.current = true;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: 17,
      interactive: false,
      attributionControl: false,
    });

    // ユーザーマーカー — 浅葱色のグロー
    const markerEl = document.createElement("div");
    markerEl.innerHTML = `
      <div style="position:relative;width:40px;height:40px">
        <div style="position:absolute;inset:6px;border-radius:50%;background:rgba(107,167,181,0.25);animation:pulseRing 2s ease-out infinite"></div>
        <div style="position:absolute;inset:10px;width:20px;height:20px;border-radius:50%;background:#6BA7B5;border:3px solid white;box-shadow:0 2px 8px rgba(42,37,32,0.2)"></div>
      </div>`;
    const marker = new mapboxgl.Marker({ element: markerEl })
      .setLngLat([lng, lat])
      .addTo(map);

    // ゴールピン
    const goalEl = document.createElement("div");
    goalEl.innerHTML = `
      <div style="position:relative;width:44px;height:52px;pointer-events:none">
        <div style="position:absolute;left:50%;bottom:0;width:10px;height:10px;border-radius:50%;background:rgba(42,37,32,0.25);filter:blur(2px);transform:translateX(-50%)"></div>
        <div style="position:absolute;left:50%;bottom:6px;transform:translateX(-50%);width:32px;height:32px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#D9A441,#B88730);border:2px solid #FFFDF7;box-shadow:0 4px 10px rgba(42,37,32,0.2);transform-origin:50% 100%;rotate:-45deg"></div>
        <div style="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);font-size:14px;color:#2A2520;font-weight:bold">⚑</div>
      </div>`;
    const goalMarker = new mapboxgl.Marker({ element: goalEl, anchor: "bottom" })
      .setLngLat([goalLng, goalLat])
      .addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    goalMarkerRef.current = goalMarker;

    map.on("load", () => {
      styleLoadedRef.current = true;
      // 軌跡ソース
      map.addSource("trail", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        paint: { "line-color": "#6BA7B5", "line-width": 3, "line-opacity": 0.7 },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // ゴール圏内を示す円
      map.addSource("goal-radius", {
        type: "geojson",
        data: circleGeoJSON(goalLat, goalLng, goalRadiusMeters),
      });
      map.addLayer({
        id: "goal-radius-fill",
        type: "fill",
        source: "goal-radius",
        paint: { "fill-color": "#D9A441", "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: "goal-radius-line",
        type: "line",
        source: "goal-radius",
        paint: { "line-color": "#D9A441", "line-width": 1.5, "line-opacity": 0.7, "line-dasharray": [2, 2] },
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
        paint: { "line-color": "#C65E4A", "line-width": 10, "line-opacity": 0.2, "line-blur": 6 },
        layout: { "line-cap": "round" },
      });
      map.addLayer({
        id: "arrow-line-layer",
        type: "line",
        source: "arrow-line",
        paint: {
          "line-color": "#C65E4A",
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
      goalMarkerRef.current = null;
      arrowMarkerRef.current = null;
      pulseMarkerRef.current = null;
      styleLoadedRef.current = false;
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

    marker.setLngLat([lng, lat]);

    // ユーザーとゴールの両方が映るようにfitBounds（ただし近距離時はmaxZoomで抑制）
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([lng, lat]);
    bounds.extend([goalLng, goalLat]);
    map.fitBounds(bounds, {
      padding: { top: 50, bottom: 70, left: 50, right: 50 },
      maxZoom: 17,
      duration: 500,
      linear: false,
    });

    // 既存の補助マーカーを削除
    if (pulseMarkerRef.current) { pulseMarkerRef.current.remove(); pulseMarkerRef.current = null; }
    if (arrowMarkerRef.current) { arrowMarkerRef.current.remove(); arrowMarkerRef.current = null; }

    const arrowSrc = map.getSource("arrow-line") as mapboxgl.GeoJSONSource | undefined;

    if (isInRange) {
      // ゴール圏内 — 大きなパルスリング
      const pulseEl = document.createElement("div");
      pulseEl.innerHTML = `
        <div style="position:relative;width:80px;height:80px">
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #8FA86B;animation:pulseRing 1.5s ease-out infinite;opacity:0"></div>
          <div style="position:absolute;inset:12px;border-radius:50%;border:2px solid #8FA86B;animation:pulseRing 1.5s ease-out 0.5s infinite;opacity:0"></div>
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

      // 矢印先端マーカー — 三角形が元々 +x 方向を指しているので bearing - 90 で補正
      const arrowEl = document.createElement("div");
      arrowEl.innerHTML = `<svg width="32" height="32" viewBox="0 0 32 32" style="filter:drop-shadow(0 2px 4px rgba(42,37,32,0.28));transform:rotate(${bearing - 90}deg)">
        <polygon points="6,8 26,16 6,24" fill="#C65E4A" stroke="#FFFDF7" stroke-width="2" stroke-linejoin="round"/>
      </svg>`;
      arrowMarkerRef.current = new mapboxgl.Marker({ element: arrowEl })
        .setLngLat([arrowEnd.lng, arrowEnd.lat])
        .addTo(map);
    }
  }, [lat, lng, bearing, isInRange, goalLat, goalLng]);

  function formatDistance(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${meters}m`;
  }

  return (
    <div className="w-full px-3">
      <div className="relative overflow-hidden rounded-2xl border border-[rgba(217,164,65,0.28)] shadow-[0_4px_20px_rgba(42,37,32,0.08)]">
        {/* 山吹のトップライン */}
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent-gold)] to-transparent opacity-60" />
        <div
          ref={containerRef}
          className="h-[280px] w-full"
          style={{ background: "#EDE4D3" }}
        />
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent-gold)] to-transparent opacity-40" />

        {/* 四隅の光ドット */}
        <div className="pointer-events-none absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)] opacity-50 shadow-[0_0_6px_rgba(217,164,65,0.5)]" />
        <div className="pointer-events-none absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)] opacity-50 shadow-[0_0_6px_rgba(217,164,65,0.5)]" />
        <div className="pointer-events-none absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)] opacity-50 shadow-[0_0_6px_rgba(217,164,65,0.5)]" />
        <div className="pointer-events-none absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)] opacity-50 shadow-[0_0_6px_rgba(217,164,65,0.5)]" />

        {/* 距離オーバーレイバッジ */}
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
          <div
            className={`rounded-full px-5 py-2 shadow-lg backdrop-blur-md ${
              isInRange
                ? "bg-[var(--accent-wakaba)]/90 text-[var(--text-inverse)]"
                : "bg-[rgba(255,253,247,0.92)] text-[var(--text-primary)] border border-[var(--border-soft)]"
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
