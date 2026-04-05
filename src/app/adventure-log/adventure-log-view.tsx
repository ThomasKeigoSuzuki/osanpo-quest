"use client";

import { useState } from "react";

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

export function AdventureLogView({ logs }: { logs: AdventureLog[] }) {
  const [selected, setSelected] = useState<AdventureLog | null>(null);

  // 日付でグルーピング
  const grouped = logs.reduce<Record<string, AdventureLog[]>>((acc, log) => {
    const date = log.completed_at
      ? new Date(log.completed_at).toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "不明";
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="px-4 pt-8 pb-4">
      <h1 className="text-xl font-bold text-[#6B8E7B]">冒険日記</h1>
      <p className="mt-1 text-sm text-[#B0A898]">
        これまでの冒険: {logs.length}件
      </p>

      {logs.length === 0 ? (
        <div className="mt-20 text-center text-[#B0A898]">
          <p className="text-4xl">📖</p>
          <p className="mt-3 text-sm">
            まだ冒険の記録がありません。
            <br />
            最初のクエストに出かけよう！
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <h2 className="mb-3 text-xs font-medium text-[#B0A898]">
                {date}
              </h2>
              <div className="space-y-3">
                {entries.map((log) => (
                  <button
                    key={log.quest_id}
                    onClick={() => setSelected(log)}
                    className="w-full rounded-xl bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {log.god_type === "wanderer" ? "🌬️" : "⛩️"}
                        </span>
                        <span className="text-sm font-medium text-[#6B8E7B]">
                          {log.god_name}
                        </span>
                      </div>
                      <span className="text-xs text-[#B0A898]">
                        {log.completed_at
                          ? new Date(log.completed_at).toLocaleTimeString(
                              "ja-JP",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : ""}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#5A5A5A]">
                      {log.mission_text}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-[#B0A898]">
                        {log.start_area_name}
                      </span>
                      {/* ルートのミニ表示 */}
                      {log.route_log && log.route_log.length > 1 && (
                        <RoutePreview route={log.route_log} size={40} />
                      )}
                    </div>
                    {log.item_name && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#FFF8F0] p-2">
                        {log.item_image_url ? (
                          <img
                            src={log.item_image_url}
                            alt={log.item_name}
                            className="h-6 w-6 rounded object-cover"
                          />
                        ) : (
                          <span className="text-sm">✨</span>
                        )}
                        <span className="text-xs font-medium text-[#8B7E6A]">
                          {log.item_name}
                        </span>
                        {log.item_rarity && (
                          <span className="ml-auto text-[10px] text-yellow-500">
                            {"★".repeat(log.item_rarity)}
                          </span>
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
            className="w-full max-w-md animate-[fadeInUp_0.3s_ease-out] rounded-t-3xl bg-[#FFF8F0] p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D4C5B0]" />

            {/* ヘッダー */}
            <div className="flex items-center gap-2">
              <span>
                {selected.god_type === "wanderer" ? "🌬️" : "⛩️"}
              </span>
              <span className="font-bold text-[#6B8E7B]">
                {selected.god_name}
              </span>
              <span className="ml-auto text-xs text-[#B0A898]">
                {selected.completed_at
                  ? new Date(selected.completed_at).toLocaleDateString("ja-JP")
                  : ""}
              </span>
            </div>

            {/* ミッション */}
            <p className="mt-3 text-sm leading-relaxed text-[#5A5A5A]">
              {selected.mission_text}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-[#E8DFD0] px-2 py-0.5 text-xs text-[#8B7E6A]">
                {selected.mission_type === "direction"
                  ? "方角・距離"
                  : selected.mission_type === "discovery"
                    ? "発見"
                    : "体験"}
              </span>
              <span className="text-xs text-[#B0A898]">
                {selected.start_area_name}
              </span>
            </div>

            {/* ルートマップ */}
            {selected.route_log && selected.route_log.length > 1 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[#8B7E6A]">
                  歩いたルート
                </p>
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <RoutePreview
                    route={selected.route_log}
                    startLat={selected.start_lat}
                    startLng={selected.start_lng}
                    goalLat={selected.goal_lat}
                    goalLng={selected.goal_lng}
                    size={200}
                    showMarkers
                  />
                </div>
              </div>
            )}

            {/* アイテム */}
            {selected.item_name && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                {selected.item_image_url ? (
                  <img
                    src={selected.item_image_url}
                    alt={selected.item_name}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#E8DFD0]">
                    <span className="text-2xl">✨</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#5A5A5A]">
                    {selected.item_name}
                  </p>
                  {selected.item_rarity && (
                    <p className="text-xs text-yellow-500">
                      {"★".repeat(selected.item_rarity)}
                    </p>
                  )}
                  {selected.item_description && (
                    <p className="mt-0.5 text-xs text-[#B0A898]">
                      {selected.item_description}
                    </p>
                  )}
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

/** ルートをSVGで描画するコンポーネント */
function RoutePreview({
  route,
  startLat,
  startLng,
  goalLat,
  goalLng,
  size,
  showMarkers = false,
}: {
  route: RoutePoint[];
  startLat?: number;
  startLng?: number;
  goalLat?: number;
  goalLng?: number;
  size: number;
  showMarkers?: boolean;
}) {
  if (route.length < 2) return null;

  const lats = route.map((p) => p.lat);
  const lngs = route.map((p) => p.lng);

  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);

  if (startLat !== undefined && startLng !== undefined) {
    minLat = Math.min(minLat, startLat);
    maxLat = Math.max(maxLat, startLat);
    minLng = Math.min(minLng, startLng);
    maxLng = Math.max(maxLng, startLng);
  }
  if (goalLat !== undefined && goalLng !== undefined) {
    minLat = Math.min(minLat, goalLat);
    maxLat = Math.max(maxLat, goalLat);
    minLng = Math.min(minLng, goalLng);
    maxLng = Math.max(maxLng, goalLng);
  }

  const padding = 0.15;
  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;
  const padLat = latRange * padding;
  const padLng = lngRange * padding;

  function toX(lng: number) {
    return ((lng - minLng + padLng) / (lngRange + padLng * 2)) * size;
  }
  function toY(lat: number) {
    return size - ((lat - minLat + padLat) / (latRange + padLat * 2)) * size;
  }

  const pathData = route
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.lng)},${toY(p.lat)}`)
    .join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      {/* ルート線 */}
      <path
        d={pathData}
        fill="none"
        stroke="#6B8E7B"
        strokeWidth={showMarkers ? 2.5 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      {showMarkers && (
        <>
          {/* スタート地点 */}
          {startLat !== undefined && startLng !== undefined && (
            <circle
              cx={toX(startLng)}
              cy={toY(startLat)}
              r={5}
              fill="#6B8E7B"
              stroke="white"
              strokeWidth={2}
            />
          )}
          {/* ゴール地点 */}
          {goalLat !== undefined && goalLng !== undefined && (
            <circle
              cx={toX(goalLng)}
              cy={toY(goalLat)}
              r={5}
              fill="#E85D4A"
              stroke="white"
              strokeWidth={2}
            />
          )}
        </>
      )}
    </svg>
  );
}
