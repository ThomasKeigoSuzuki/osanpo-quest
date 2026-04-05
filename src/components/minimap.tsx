"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_URL =
  "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg";

function createUserIcon() {
  return L.divIcon({
    html: '<span style="font-size:28px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">🏮</span>',
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function MiniMap({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

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
    }).addTo(map);

    const marker = L.marker([lat, lng], { icon: createUserIcon() }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 位置更新
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    mapRef.current.setView([lat, lng], 18, { animate: true, duration: 0.5 });
    markerRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  return (
    <div className="w-full px-4">
      <div className="overflow-hidden rounded-2xl border-2 border-[#C4B59E] bg-[#F5EDE0] shadow-[0_4px_16px_rgba(139,126,106,0.25),inset_0_1px_0_rgba(255,255,255,0.5)]">
        {/* 巻物の上辺装飾 */}
        <div className="h-1.5 bg-gradient-to-r from-[#D4C5B0] via-[#E8DFD0] to-[#D4C5B0]" />
        <div
          ref={containerRef}
          className="h-[200px] w-full"
          style={{ background: "#F5EDE0" }}
        />
        {/* 巻物の下辺装飾 */}
        <div className="h-1.5 bg-gradient-to-r from-[#D4C5B0] via-[#E8DFD0] to-[#D4C5B0]" />
      </div>
    </div>
  );
}
