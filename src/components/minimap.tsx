"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { calculateGoalPosition } from "@/lib/geo";

const ARROW_COLOR = "#D4A574";
const TRAIL_COLOR = "#6B8E7B";

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
  const pulseRef = useRef<HTMLDivElement | null>(null);
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

    // 提灯マーカー
    const markerEl = document.createElement("div");
    markerEl.innerHTML =
      '<span style="font-size:28px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">🏮</span>';
    markerEl.style.lineHeight = "1";

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
        paint: {
          "line-color": TRAIL_COLOR,
          "line-width": 2,
          "line-opacity": 0.5,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // 方角矢印ライン ソース
      map.addSource("arrow-line", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: "arrow-line-layer",
        type: "line",
        source: "arrow-line",
        paint: {
          "line-color": ARROW_COLOR,
          "line-width": 3,
          "line-opacity": 0.8,
          "line-dasharray": [2, 3],
        },
        layout: { "line-cap": "round" },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      arrowMarkerRef.current = null;
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
        geometry: {
          type: "LineString",
          coordinates: routePoints.map((p) => [p.lng, p.lat]),
        },
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

    // パルスリング管理
    if (pulseRef.current) {
      pulseRef.current.remove();
      pulseRef.current = null;
    }
    // 矢印マーカー管理
    if (arrowMarkerRef.current) {
      arrowMarkerRef.current.remove();
      arrowMarkerRef.current = null;
    }

    if (isInRange) {
      // パルスリング
      const pulseEl = document.createElement("div");
      pulseEl.innerHTML = `
        <div style="position:relative;width:60px;height:60px">
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #6B8E7B;animation:pulseRing 1.5s ease-out infinite;opacity:0"></div>
          <div style="position:absolute;inset:8px;border-radius:50%;border:2px solid #6B8E7B;animation:pulseRing 1.5s ease-out 0.4s infinite;opacity:0"></div>
        </div>`;
      new mapboxgl.Marker({ element: pulseEl })
        .setLngLat([lng, lat])
        .addTo(map);
      pulseRef.current = pulseEl;

      // 矢印ラインを非表示
      const src = map.getSource("arrow-line") as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
      }
    } else {
      // 方角矢印ライン
      const arrowEnd = calculateGoalPosition(lat, lng, bearing, 200);
      const src = map.getSource("arrow-line") as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [lng, lat],
              [arrowEnd.lng, arrowEnd.lat],
            ],
          },
        });
      }

      // 矢印マーカー
      const arrowEl = document.createElement("div");
      arrowEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));transform:rotate(${bearing}deg)">
        <path d="M3 9h10M10 5l4 4-4 4" stroke="${ARROW_COLOR}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
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
    <div className="w-full px-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#C4B59E] bg-[#F5EDE0] shadow-[0_4px_16px_rgba(139,126,106,0.25),inset_0_1px_0_rgba(255,255,255,0.5)]">
        <div className="h-1.5 bg-gradient-to-r from-[#D4C5B0] via-[#E8DFD0] to-[#D4C5B0]" />
        <div
          ref={containerRef}
          className="h-[300px] w-full"
          style={{
            background: "#F5EDE0",
            filter: "sepia(0.3) saturate(0.8) brightness(1.05)",
          }}
        />
        <div className="h-1.5 bg-gradient-to-r from-[#D4C5B0] via-[#E8DFD0] to-[#D4C5B0]" />

        {/* 距離オーバーレイバッジ */}
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
          <div
            className={`rounded-full px-4 py-1.5 shadow-sm backdrop-blur-sm ${
              isInRange
                ? "bg-[#6B8E7B]/90 text-white"
                : "bg-[#FFF8F0]/90 text-[#5A5A5A]"
            }`}
          >
            <span className="text-sm font-bold">
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
