"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { calculateGoalPosition } from "@/lib/geo";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; OpenStreetMap";
const ARROW_COLOR = "#D4A574";

function createUserIcon() {
  return L.divIcon({
    html: '<span style="font-size:28px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">🏮</span>',
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createArrowIcon() {
  return L.divIcon({
    html: `<svg width="18" height="18" viewBox="0 0 18 18" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">
      <path d="M3 9h10M10 5l4 4-4 4" stroke="${ARROW_COLOR}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function createPulseIcon() {
  return L.divIcon({
    html: `<div style="position:relative;width:60px;height:60px">
      <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #6B8E7B;animation:pulseRing 1.5s ease-out infinite;opacity:0"></div>
      <div style="position:absolute;inset:8px;border-radius:50%;border:2px solid #6B8E7B;animation:pulseRing 1.5s ease-out 0.4s infinite;opacity:0"></div>
    </div>`,
    className: "",
    iconSize: [60, 60],
    iconAnchor: [30, 30],
  });
}

export function MiniMap({
  lat,
  lng,
  bearing,
  distance,
  direction,
  isInRange,
}: {
  lat: number;
  lng: number;
  bearing: number;
  distance: number | null;
  direction: string;
  isInRange: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const arrowRef = useRef<L.Marker | null>(null);
  const pulseRef = useRef<L.Marker | null>(null);

  // 初期化
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 18,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });

    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
    }).addTo(map);

    const marker = L.marker([lat, lng], { icon: createUserIcon() }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      lineRef.current = null;
      arrowRef.current = null;
      pulseRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 位置・方角・状態更新
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    map.setView([lat, lng], 18, { animate: true, duration: 0.5 });
    marker.setLatLng([lat, lng]);

    // 既存の矢印ラインとパルスを削除
    if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }
    if (arrowRef.current) {
      map.removeLayer(arrowRef.current);
      arrowRef.current = null;
    }
    if (pulseRef.current) {
      map.removeLayer(pulseRef.current);
      pulseRef.current = null;
    }

    if (isInRange) {
      // ゴール圏内: パルスリング
      pulseRef.current = L.marker([lat, lng], {
        icon: createPulseIcon(),
        interactive: false,
      }).addTo(map);
    } else {
      // ゴール圏外: 方角矢印ライン
      const arrowEnd = calculateGoalPosition(lat, lng, bearing, 200);

      lineRef.current = L.polyline(
        [
          [lat, lng],
          [arrowEnd.lat, arrowEnd.lng],
        ],
        {
          color: ARROW_COLOR,
          weight: 3,
          opacity: 0.8,
          dashArray: "8, 12",
          lineCap: "round",
          interactive: false,
        }
      ).addTo(map);

      arrowRef.current = L.marker([arrowEnd.lat, arrowEnd.lng], {
        icon: createArrowIcon(),
        interactive: false,
      }).addTo(map);

      // 矢印マーカーを方角に回転
      const el = arrowRef.current.getElement();
      if (el) {
        el.style.transformOrigin = "center";
        el.style.transform += ` rotate(${bearing}deg)`;
      }
    }
  }, [lat, lng, bearing, isInRange]);

  function formatDistance(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${meters}m`;
  }

  return (
    <div className="w-full px-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#C4B59E] bg-[#F5EDE0] shadow-[0_4px_16px_rgba(139,126,106,0.25),inset_0_1px_0_rgba(255,255,255,0.5)]">
        {/* 巻物の上辺装飾 */}
        <div className="h-1.5 bg-gradient-to-r from-[#D4C5B0] via-[#E8DFD0] to-[#D4C5B0]" />
        <div
          ref={containerRef}
          className="h-[300px] w-full"
          style={{
            background: "#F5EDE0",
            filter: "sepia(0.4) saturate(0.7) brightness(1.05)",
            opacity: 0.85,
          }}
        />
        {/* 巻物の下辺装飾 */}
        <div className="h-1.5 bg-gradient-to-r from-[#D4C5B0] via-[#E8DFD0] to-[#D4C5B0]" />

        {/* 距離オーバーレイバッジ */}
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
          <div
            className={`rounded-full px-4 py-1.5 backdrop-blur-sm shadow-sm ${
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
