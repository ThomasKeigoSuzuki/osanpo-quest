"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getDistanceMeters } from "@/lib/geo";

const MiniMap = dynamic(
  () => import("@/components/minimap").then((m) => m.MiniMap),
  { ssr: false }
);

type QuestData = {
  id: string;
  god_name: string;
  god_type: string;
  god_image_url: string | null;
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
  const isTutorialQuest = quest ? quest.goal_radius_meters >= 9999 : false;
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isInRange, setIsInRange] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState("");
  const [geoError, setGeoError] = useState("");
  const [fetchError, setFetchError] = useState(false);
  const [missionExpanded, setMissionExpanded] = useState(true);
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);

  const routeBuffer = useRef<{ lat: number; lng: number; timestamp: string }[]>([]);
  const watchId = useRef<number | null>(null);
  const hasFixRef = useRef(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let retries = 0;
    async function fetchQuest() {
      try {
        const res = await fetch(`/api/quest/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status !== "active") { router.push("/"); return; }
          setQuest(data); setFetchError(false);
        } else throw new Error();
      } catch {
        if (retries < 2) { retries++; setTimeout(fetchQuest, 1000); }
        else { setFetchError(true); setError("クエストの読み込みに失敗しました"); }
      }
    }
    fetchQuest();
  }, [id, router]);

  useEffect(() => {
    if (!quest || quest.status !== "active") return;
    if (!navigator.geolocation) { setGeoError("位置情報がサポートされていません"); return; }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        hasFixRef.current = true;
        setGeoError("");
        const np = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(np); setRoutePoints((p) => [...p, np]);
        if (quest.goal_radius_meters >= 9999) {
          setDistance(0); setIsInRange(true);
        } else {
          const d = getDistanceMeters(np.lat, np.lng, quest.goal_lat, quest.goal_lng);
          setDistance(Math.round(d)); setIsInRange(d <= quest.goal_radius_meters);
        }
        routeBuffer.current.push({ ...np, timestamp: new Date().toISOString() });
      },
      (e) => {
        // 許可拒否は常にブロッキング表示。それ以外(POSITION_UNAVAILABLE/TIMEOUT)は
        // 初回フィックス取得前のみフルエラー化し、以降は無視して watchPosition の再試行に任せる。
        if (e.code === 1) {
          setGeoError("位置情報が許可されていません");
        } else if (!hasFixRef.current) {
          setGeoError(e.code === 2 ? "GPSを確認してください" : "位置情報の取得に時間がかかっています");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
  }, [quest, retryKey]);

  useEffect(() => {
    if (!quest) return;
    const i = setInterval(async () => {
      if (routeBuffer.current.length === 0) return;
      const p = [...routeBuffer.current]; routeBuffer.current = [];
      try { await fetch("/api/quest/update-route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quest_id: id, positions: p }) }); }
      catch { routeBuffer.current = [...p, ...routeBuffer.current]; }
    }, 30000);
    return () => clearInterval(i);
  }, [quest, id]);

  const handleComplete = useCallback(async () => {
    const pos = userPos || (isTutorialQuest && quest ? { lat: quest.goal_lat, lng: quest.goal_lng } : null);
    if (!pos || (!isInRange && !isTutorialQuest) || completing) return;
    setCompleting(true); setError("");
    try {
      if (routeBuffer.current.length > 0) {
        await fetch("/api/quest/update-route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quest_id: id, positions: routeBuffer.current }) }).catch(() => {});
        routeBuffer.current = [];
      }
      const res = await fetch("/api/quest/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quest_id: id, lat: pos.lat, lng: pos.lng }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `サーバーエラー (${res.status})`);
        setCompleting(false);
        return;
      }
      if (data.success) {
        let url = `/quest/${id}/complete?item=${encodeURIComponent(JSON.stringify(data.item))}&message=${encodeURIComponent(data.god_message)}`;
        if (data.bond_info) url += `&bond=${encodeURIComponent(JSON.stringify(data.bond_info))}`;
        if (data.rank_info) url += `&rank=${encodeURIComponent(JSON.stringify(data.rank_info))}`;
        if (data.shinako_reveal) url += `&reveal=${encodeURIComponent(JSON.stringify(data.shinako_reveal))}`;
        if (data.tutorial_offering) url += `&tutorial=true`;
        router.push(url);
      }
      else { setError(data.error || "クリア判定に失敗"); setCompleting(false); }
    } catch (e) { setError(`通信エラー: ${e instanceof Error ? e.message : "不明"}`); setCompleting(false); }
  }, [userPos, isInRange, isTutorialQuest, completing, id, router, quest]);

  const handleAbandon = useCallback(async () => {
    if (abandoning || !confirm("クエストを放棄しますか？")) return;
    setAbandoning(true);
    try { await fetch("/api/quest/abandon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quest_id: id }) }); } catch {}
    router.push("/");
  }, [abandoning, id, router]);

  function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const la1 = (lat1 * Math.PI) / 180, la2 = (lat2 * Math.PI) / 180;
    return (((Math.atan2(Math.sin(dLng) * Math.cos(la2), Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng)) * 180) / Math.PI) + 360) % 360;
  }
  function bearingToDir(b: number) { return ["北","北東","東","南東","南","南西","西","北西"][Math.round(b / 45) % 8]; }

  const avatarSrc = "/shinako-face.webp";

  if (fetchError) return (
    <div className="flex min-h-dvh items-center justify-center bg-fantasy px-4">
      <div className="w-full max-w-xs text-center">
        <p className="text-4xl">😥</p>
        <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-6 w-full">再読み込み</button>
        <button onClick={() => router.push("/")} className="btn-ghost mt-2 w-full text-sm">ホームに戻る</button>
      </div>
    </div>
  );

  if (!quest) return (
    <div className="flex min-h-dvh items-center justify-center bg-fantasy">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-[var(--color-gold)] border-t-transparent opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-[var(--color-gold)]" /></div>
      </div>
    </div>
  );

  const bearing = userPos ? getBearing(userPos.lat, userPos.lng, quest.goal_lat, quest.goal_lng) : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-fantasy">
      {/* シナコ コンパニオンバー */}
      <div className="card-glass mx-3 mt-8 rounded-2xl p-3">
        <div className="flex items-start gap-3">
          <img src={avatarSrc} alt="シナコ" className="h-11 w-11 shrink-0 rounded-full border-2 border-[var(--color-gold)] object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-wafuu text-gold text-sm font-bold">シナコ</span>
              <span className="rounded-full bg-[rgba(232,184,73,0.2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-gold)]">
                {quest.mission_type === "direction" ? "方角・距離" : quest.mission_type === "discovery" ? "発見" : "体験"}
              </span>
            </div>
            <button onClick={() => setMissionExpanded((v) => !v)} aria-expanded={missionExpanded} className="mt-1.5 w-full text-left">
              <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(237,228,211,0.75)", border: "1px solid rgba(217,164,65,0.18)" }}>
                <p className={`text-sm leading-relaxed transition-all duration-300 ${missionExpanded ? "" : "line-clamp-1"}`} style={{ color: "var(--text-primary)" }}>
                  {quest.mission_text}
                </p>
                <span className="mt-1 block text-right text-[10px] opacity-70" style={{ color: "var(--accent-gold-dark)" }}>
                  {missionExpanded ? "タップで閉じる" : "タップで全文表示"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ミニマップ */}
      <div className="flex flex-1 flex-col items-center justify-center">
        {isTutorialQuest ? (
          /* チュートリアル: マップ不要、即クリア可能 */
          <div className="text-center px-8">
            <p className="text-4xl">🌟</p>
            <p className="mt-4 text-sm font-bold text-gold">ミッションを達成しよう</p>
            <p className="mt-2 text-xs" style={{ color: "var(--color-text-sub)" }}>
              移動は不要です。上のミッション内容を確認して、達成したら下のボタンを押してください。
            </p>
          </div>
        ) : userPos ? (
          <>
            <MiniMap
              lat={userPos.lat}
              lng={userPos.lng}
              bearing={bearing}
              distance={distance}
              direction={bearingToDir(bearing)}
              isInRange={isInRange}
              routePoints={routePoints}
              goalLat={quest.goal_lat}
              goalLng={quest.goal_lng}
              goalRadiusMeters={quest.goal_radius_meters}
            />
            {geoError && (
              <div className="mt-2 rounded-full px-3 py-1.5 text-[11px] backdrop-blur-md" style={{ background: "rgba(255,253,247,0.88)", color: "var(--text-secondary)", border: "1px solid rgba(217,164,65,0.25)" }}>
                📡 {geoError}
              </div>
            )}
            {isInRange && (
              <div className="mt-3 animate-[fadeInUp_0.5s_ease-out] text-center">
                <p className="animate-pulse text-sm font-bold text-[var(--color-success)]">「達成！」ボタンを押してクリアしよう</p>
              </div>
            )}
          </>
        ) : geoError ? (
          <div className="w-full max-w-xs px-4 text-center">
            <p className="text-4xl">📡</p>
            <p className="mt-4 text-sm text-[var(--color-text-sub)]">{geoError}</p>
            <button
              onClick={() => { setGeoError(""); hasFixRef.current = false; setRetryKey((k) => k + 1); }}
              className="btn-secondary mt-4"
            >
              位置情報を再取得
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="relative mx-auto h-12 w-12">
              <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-[var(--color-gold)] border-t-transparent opacity-60" />
            </div>
            <p className="mt-4 text-sm text-[var(--color-text-sub)]">位置情報を取得中...</p>
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="px-4 pb-6 safe-bottom">
        {error && <p className="mb-3 text-center text-sm text-[var(--color-danger)]" role="alert">{error}</p>}
        <button onClick={handleComplete} disabled={(!isInRange && !isTutorialQuest) || completing}
          className={`min-h-[52px] w-full rounded-xl text-center text-lg font-bold transition active:scale-[0.97] ${
            (isInRange || isTutorialQuest) ? "btn-primary" : "cursor-not-allowed rounded-xl bg-[rgba(237,228,211,0.75)] py-3.5 text-[var(--text-muted)] border border-[rgba(217,164,65,0.2)]"
          }`}
        >
          {completing ? "アイテム生成中..." : isTutorialQuest ? "ミッション達成！" : isInRange ? "達成！" : "ゴールへ向かおう"}
        </button>
        <button onClick={handleAbandon} disabled={abandoning} className="btn-ghost mt-2 min-h-[44px] w-full text-xs">
          {abandoning ? "放棄中..." : "放棄する"}
        </button>
      </div>
    </div>
  );
}
