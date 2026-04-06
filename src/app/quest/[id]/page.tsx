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
    if (!quest || quest.god_type !== "local" || quest.god_image_url) return;
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      if (attempts > 6) { clearInterval(poll); return; }
      try {
        const res = await fetch(`/api/quest/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.god_image_url) { setQuest((prev) => prev ? { ...prev, god_image_url: data.god_image_url } : prev); clearInterval(poll); }
        }
      } catch {}
    }, 8000);
    return () => clearInterval(poll);
  }, [quest?.god_type, quest?.god_image_url, id]);

  useEffect(() => {
    if (!quest || quest.status !== "active") return;
    if (!navigator.geolocation) { setGeoError("位置情報がサポートされていません"); return; }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError("");
        const np = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(np); setRoutePoints((p) => [...p, np]);
        const d = getDistanceMeters(np.lat, np.lng, quest.goal_lat, quest.goal_lng);
        setDistance(Math.round(d)); setIsInRange(d <= quest.goal_radius_meters);
        routeBuffer.current.push({ ...np, timestamp: new Date().toISOString() });
      },
      (e) => setGeoError(e.code === 1 ? "位置情報が許可されていません" : e.code === 2 ? "GPSを確認してください" : "タイムアウトしました"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
  }, [quest]);

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
    if (!userPos || !isInRange || completing) return;
    setCompleting(true); setError("");
    try {
      if (routeBuffer.current.length > 0) {
        await fetch("/api/quest/update-route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quest_id: id, positions: routeBuffer.current }) }).catch(() => {});
        routeBuffer.current = [];
      }
      const res = await fetch("/api/quest/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quest_id: id, lat: userPos.lat, lng: userPos.lng }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success) router.push(`/quest/${id}/complete?item=${encodeURIComponent(JSON.stringify(data.item))}&message=${encodeURIComponent(data.god_message)}`);
      else { setError(data.error || "クリア判定に失敗"); setCompleting(false); }
    } catch { setError("通信エラーです"); setCompleting(false); }
  }, [userPos, isInRange, completing, id, router]);

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

  function getAvatarSrc() {
    if (quest?.god_type === "wanderer") return "/shinako.png";
    return quest?.god_image_url || null;
  }
  function getPlaceholderColor(name: string) {
    const c = ["#e8b849","#4ecdc4","#f4a261","#e76f51","#2ec4b6","#9b59b6"];
    return c[(name.charCodeAt(0) || 0) % c.length];
  }

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
  const avatarSrc = getAvatarSrc();

  return (
    <div className="flex min-h-dvh flex-col bg-fantasy">
      {/* 神様コンパニオンバー */}
      <div className="card-glass mx-3 mt-8 rounded-2xl p-3">
        <div className="flex items-start gap-3">
          {avatarSrc ? (
            <img src={avatarSrc} alt={quest.god_name} className="h-11 w-11 shrink-0 rounded-full border-2 border-[var(--color-gold)] object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-gold)]" style={{ backgroundColor: getPlaceholderColor(quest.god_name) }}>
              <span className="text-lg font-bold text-white">{quest.god_name.charAt(0)}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-wafuu text-gold text-sm font-bold">{quest.god_name}</span>
              <span className="rounded-full bg-[rgba(232,184,73,0.2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-gold)]">
                {quest.mission_type === "direction" ? "方角・距離" : quest.mission_type === "discovery" ? "発見" : "体験"}
              </span>
            </div>
            <button onClick={() => setMissionExpanded((v) => !v)} aria-expanded={missionExpanded} className="mt-1.5 w-full text-left">
              <div className="rounded-xl bg-[rgba(0,0,0,0.3)] px-3 py-2.5">
                <p className={`text-sm leading-relaxed text-[var(--color-text)] transition-all duration-300 ${missionExpanded ? "" : "line-clamp-1"}`}>
                  {quest.mission_text}
                </p>
                <span className="mt-1 block text-right text-[10px] text-[var(--color-gold)] opacity-60">
                  {missionExpanded ? "タップで閉じる" : "タップで全文表示"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ミニマップ */}
      <div className="flex flex-1 flex-col items-center justify-center">
        {geoError ? (
          <div className="w-full max-w-xs px-4 text-center">
            <p className="text-4xl">📡</p>
            <p className="mt-4 text-sm text-[var(--color-text-sub)]">{geoError}</p>
            <button onClick={() => { setGeoError(""); setQuest({ ...quest }); }} className="btn-secondary mt-4">位置情報を再取得</button>
          </div>
        ) : userPos ? (
          <>
            <MiniMap lat={userPos.lat} lng={userPos.lng} bearing={bearing} distance={distance} direction={bearingToDir(bearing)} isInRange={isInRange} routePoints={routePoints} />
            {isInRange && (
              <div className="mt-3 animate-[fadeInUp_0.5s_ease-out] text-center">
                <p className="animate-pulse text-sm font-bold text-[var(--color-success)]">「達成！」ボタンを押してクリアしよう</p>
              </div>
            )}
          </>
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
        <button onClick={handleComplete} disabled={!isInRange || completing}
          className={`min-h-[52px] w-full rounded-xl text-center text-lg font-bold transition active:scale-[0.97] ${
            isInRange ? "btn-primary" : "cursor-not-allowed rounded-xl bg-[rgba(255,255,255,0.08)] py-3.5 text-[var(--color-text-muted)]"
          }`}
        >
          {completing ? "アイテム生成中..." : isInRange ? "達成！" : "ゴールへ向かおう"}
        </button>
        <button onClick={handleAbandon} disabled={abandoning} className="btn-ghost mt-2 min-h-[44px] w-full text-xs">
          {abandoning ? "放棄中..." : "放棄する"}
        </button>
      </div>
    </div>
  );
}
