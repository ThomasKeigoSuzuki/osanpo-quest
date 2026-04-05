"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDistanceMeters } from "@/lib/geo";

type QuestData = {
  id: string;
  god_name: string;
  god_type: string;
  mission_text: string;
  mission_type: string;
  goal_lat: number;
  goal_lng: number;
  goal_radius_meters: number;
  expires_at: string;
  status: string;
};

export default function QuestProgressPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [quest, setQuest] = useState<QuestData | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [distance, setDistance] = useState<number | null>(null);
  const [isInRange, setIsInRange] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState("");
  const [geoError, setGeoError] = useState("");
  const [fetchError, setFetchError] = useState(false);

  const routeBuffer = useRef<{ lat: number; lng: number; timestamp: string }[]>(
    []
  );
  const watchId = useRef<number | null>(null);

  // クエストデータ取得 (リトライ付き)
  useEffect(() => {
    let retries = 0;
    async function fetchQuest() {
      try {
        const res = await fetch(`/api/quest/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status !== "active") {
            router.push("/");
            return;
          }
          setQuest(data);
          setFetchError(false);
        } else {
          throw new Error("Quest not found");
        }
      } catch {
        if (retries < 2) {
          retries++;
          setTimeout(fetchQuest, 1000);
        } else {
          setFetchError(true);
          setError("クエストの読み込みに失敗しました");
        }
      }
    }
    fetchQuest();
  }, [id, router]);

  // 位置情報の追跡
  useEffect(() => {
    if (!quest || quest.status !== "active") return;

    if (!navigator.geolocation) {
      setGeoError("位置情報がサポートされていません");
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError("");
        const newPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserPos(newPos);

        const dist = getDistanceMeters(
          newPos.lat,
          newPos.lng,
          quest.goal_lat,
          quest.goal_lng
        );
        setDistance(Math.round(dist));
        setIsInRange(dist <= quest.goal_radius_meters);

        routeBuffer.current.push({
          ...newPos,
          timestamp: new Date().toISOString(),
        });
      },
      (err) => {
        if (err.code === 1) {
          setGeoError("位置情報が許可されていません");
        } else if (err.code === 2) {
          setGeoError("位置情報が利用できません。GPS を確認してください");
        } else {
          setGeoError("位置情報の取得がタイムアウトしました");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [quest]);

  // ルートログの定期送信 (30秒ごと)
  useEffect(() => {
    if (!quest) return;

    const interval = setInterval(async () => {
      if (routeBuffer.current.length === 0) return;
      const positions = [...routeBuffer.current];
      routeBuffer.current = [];

      try {
        await fetch("/api/quest/update-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quest_id: id, positions }),
        });
      } catch {
        // ルートログ送信失敗はバッファに戻す
        routeBuffer.current = [...positions, ...routeBuffer.current];
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [quest, id]);

  // 有効期限チェック
  useEffect(() => {
    if (!quest) return;
    const expiresAt = new Date(quest.expires_at).getTime();
    const checkInterval = setInterval(() => {
      if (Date.now() > expiresAt) {
        setError("クエストの有効期限が切れました");
        clearInterval(checkInterval);
      }
    }, 30000);
    return () => clearInterval(checkInterval);
  }, [quest]);

  const handleComplete = useCallback(async () => {
    if (!userPos || !isInRange || completing) return;
    setCompleting(true);
    setError("");

    try {
      // 残りのルートログを送信
      if (routeBuffer.current.length > 0) {
        await fetch("/api/quest/update-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quest_id: id,
            positions: routeBuffer.current,
          }),
        }).catch(() => {}); // ルートログ失敗はクリアをブロックしない
        routeBuffer.current = [];
      }

      const res = await fetch("/api/quest/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quest_id: id,
          lat: userPos.lat,
          lng: userPos.lng,
        }),
      });

      if (!res.ok) {
        throw new Error("サーバーエラーが発生しました");
      }

      const data = await res.json();
      if (data.success) {
        router.push(
          `/quest/${id}/complete?item=${encodeURIComponent(JSON.stringify(data.item))}&message=${encodeURIComponent(data.god_message)}`
        );
      } else {
        setError(data.error || "クリア判定に失敗しました");
        setCompleting(false);
      }
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
      setCompleting(false);
    }
  }, [userPos, isInRange, completing, id, router]);

  const handleAbandon = useCallback(async () => {
    if (abandoning) return;
    if (!confirm("本当にクエストを放棄しますか？")) return;
    setAbandoning(true);

    try {
      await fetch("/api/quest/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest_id: id }),
      });
    } catch {
      // 放棄失敗しても画面遷移する
    }
    router.push("/");
  }, [abandoning, id, router]);

  // 方角を計算
  function getBearing(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const la1 = (lat1 * Math.PI) / 180;
    const la2 = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(la2);
    const x =
      Math.cos(la1) * Math.sin(la2) -
      Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
    return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
  }

  function bearingToDirection(bearing: number): string {
    const dirs = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
    return dirs[Math.round(bearing / 45) % 8];
  }

  function formatDistance(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${meters}m`;
  }

  // エラー画面（初期読み込み失敗）
  if (fetchError) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-xs text-center">
          <p className="text-4xl">😥</p>
          <p className="mt-4 text-sm text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl bg-[#6B8E7B] px-6 py-3 font-medium text-white"
          >
            再読み込み
          </button>
          <button
            onClick={() => router.push("/")}
            className="mt-2 w-full py-2 text-sm text-[#B0A898]"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // ローディング
  if (!quest) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#E8DFD0] border-t-[#6B8E7B]" />
      </div>
    );
  }

  const bearing =
    userPos
      ? getBearing(userPos.lat, userPos.lng, quest.goal_lat, quest.goal_lng)
      : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-[#FFF8F0]">
      {/* 上部: 神様の台詞 */}
      <div className="bg-white/80 px-4 pb-4 pt-8 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {quest.god_type === "wanderer" ? "🌬️" : "⛩️"}
          </span>
          <span className="text-sm font-bold text-[#6B8E7B]">
            {quest.god_name}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[#5A5A5A]">
          {quest.mission_text}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-[#E8DFD0] px-2 py-0.5 text-xs text-[#8B7E6A]">
            {quest.mission_type === "direction"
              ? "方角・距離"
              : quest.mission_type === "discovery"
                ? "発見"
                : "体験"}
          </span>
        </div>
      </div>

      {/* 中央: 方角と距離 */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {geoError ? (
          <div className="w-full max-w-xs text-center">
            <p className="text-4xl">📡</p>
            <p className="mt-4 text-sm text-[#8B7E6A]">{geoError}</p>
            <button
              onClick={() => {
                setGeoError("");
                // watchPosition を再起動するためにquestを再セット
                setQuest({ ...quest });
              }}
              className="mt-4 rounded-xl bg-[#6B8E7B] px-6 py-2 text-sm font-medium text-white"
            >
              位置情報を再取得
            </button>
          </div>
        ) : userPos ? (
          <>
            {/* コンパス風の方角表示 */}
            <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-4 border-[#D4C5B0] bg-white shadow-inner">
              <div
                className="absolute transition-transform duration-500"
                style={{ transform: `rotate(${bearing}deg)` }}
              >
                <div className="flex flex-col items-center">
                  <div className="-mt-16 h-16 w-1 rounded-full bg-[#6B8E7B]" />
                  <div className="-mt-1 h-3 w-3 rotate-45 border-l-2 border-t-2 border-[#6B8E7B]" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#6B8E7B]">
                  {distance !== null ? formatDistance(distance) : "..."}
                </p>
                <p className="text-xs text-[#B0A898]">
                  {bearingToDirection(bearing)}
                </p>
              </div>
            </div>

            {isInRange && (
              <div className="mt-4 animate-[fadeInUp_0.5s_ease-out] text-center">
                <p className="animate-pulse text-sm font-bold text-[#6B8E7B]">
                  ゴール圏内に入りました！
                </p>
                <p className="mt-1 text-xs text-[#B0A898]">
                  「達成！」ボタンを押してクリアしよう
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#E8DFD0] border-t-[#6B8E7B]" />
            <p className="mt-4 text-sm text-[#8B7E6A]">
              位置情報を取得中...
            </p>
          </div>
        )}
      </div>

      {/* 下部: ボタン */}
      <div className="px-4 pb-8">
        {error && (
          <p className="mb-3 text-center text-sm text-red-500">{error}</p>
        )}
        <button
          onClick={handleComplete}
          disabled={!isInRange || completing}
          className={`w-full rounded-2xl px-8 py-4 text-center text-lg font-bold shadow-lg transition active:scale-[0.98] ${
            isInRange
              ? "bg-[#6B8E7B] text-white hover:bg-[#5A7D6A]"
              : "cursor-not-allowed bg-[#D4C5B0] text-white/70"
          }`}
        >
          {completing
            ? "アイテム生成中..."
            : isInRange
              ? "達成！"
              : "ゴールへ向かおう"}
        </button>
        <button
          onClick={handleAbandon}
          disabled={abandoning}
          className="mt-3 w-full py-2 text-center text-sm text-[#B0A898] transition hover:text-[#8B7E6A]"
        >
          {abandoning ? "放棄中..." : "クエストを放棄する"}
        </button>
      </div>
    </div>
  );
}
