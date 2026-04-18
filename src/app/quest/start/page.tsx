"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDailyQuestConfig, getCategoryBonusLabel } from "@/lib/daily-quest";

type Step = "permission" | "loading" | "error";
const MAX_RETRIES = 2;
const LOADING_MESSAGES = [
  "いまの空気を読んでいます…",
  "神無子が、風に耳をすましています…",
  "今日の小さな目的地をえらんでいます…",
  "もう少しだけ…",
];

function QuestStartContent() {
  const searchParams = useSearchParams();
  const isDaily = searchParams.get("daily") === "true";
  const dailyConfig = isDaily ? getDailyQuestConfig() : null;

  const [step, setStep] = useState<Step>("permission");
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [retryPos, setRetryPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (step !== "loading") { setLoadingIdx(0); return; }
    const i = setInterval(() => setLoadingIdx((v) => Math.min(v + 1, LOADING_MESSAGES.length - 1)), 2000);
    return () => clearInterval(i);
  }, [step]);

  async function startQuest(pos: { lat: number; lng: number }, retry = 0) {
    let distancePreference: "short" | "medium" | "long" | undefined;
    try {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("oq_distance_preference") : null;
      if (saved === "short" || saved === "medium" || saved === "long") distancePreference = saved;
    } catch {}
    try {
      const res = await fetch("/api/quest/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng, is_daily: isDaily, distance_preference: distancePreference }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "失敗しました"); }
      const d = await res.json();
      router.push(`/quest/${d.quest_id}`);
    } catch (err) {
      if (retry < MAX_RETRIES) { await new Promise((r) => setTimeout(r, 1000)); return startQuest(pos, retry + 1); }
      setError(err instanceof Error ? err.message : "クエスト開始に失敗しました");
      setCanRetry(true);
      setRetryPos(pos);
      setStep("error");
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) { setError("位置情報に対応していません"); setStep("error"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        setStep("loading");
        startQuest(pos);
      },
      (e) => {
        setError(e.code === 1 ? "位置情報を許可してください" : e.code === 2 ? "GPS を有効にしてください" : "取得がタイムアウトしました");
        setStep("error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }

  const catLabel = dailyConfig?.categoryBonus ? getCategoryBonusLabel(dailyConfig.categoryBonus) : "";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-fantasy px-4">
      {isDaily && dailyConfig && step !== "error" && (
        <div className="card-glass mb-6 w-full max-w-xs p-4 text-center">
          <p className="text-xs text-[var(--color-text-sub)]">📅 デイリークエスト</p>
          <p className="font-wafuu mt-1 text-lg font-bold text-gold">{dailyConfig.name}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {catLabel && <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(244,162,97,0.15)", color: "var(--color-accent)" }}>{catLabel}ボーナス</span>}
            {dailyConfig.rarityBonus > 0 && <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(232,184,73,0.2)", color: "var(--color-gold)" }}>レアリティ+{dailyConfig.rarityBonus}</span>}
          </div>
        </div>
      )}

      {step === "permission" && (
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[var(--color-gold)] bg-[rgba(232,184,73,0.1)]">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="var(--color-gold)" strokeWidth="1.5" opacity="0.5" />
              <circle cx="24" cy="24" r="3" fill="var(--color-gold)" />
              <path d="M24 8L26 20H22L24 8Z" fill="var(--color-gold)" />
              <path d="M24 40L22 28H26L24 40Z" fill="var(--color-text-sub)" opacity="0.5" />
            </svg>
          </div>
          <h2 className="text-gold mt-6 font-wafuu text-xl font-bold">{isDaily ? "今日のデイリーへ" : "一歩、ふみだしましょうか"}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-sub)]">神無子があなたの居場所に合わせて、<br />今日のちいさな目的地をえらびます。</p>
          <button onClick={requestLocation} className="btn-primary mt-8 w-full max-w-xs">位置情報を許可する</button>
          <button onClick={() => router.push("/")} className="btn-ghost mt-3 text-sm">ホームに戻る</button>
        </div>
      )}

      {step === "loading" && (
        <div className="text-center">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-[var(--color-gold)] border-t-transparent opacity-60" />
            <div className="absolute inset-2 animate-[spin_2s_linear_infinite_reverse] rounded-full border border-[var(--color-gold-light)] border-b-transparent opacity-40" />
            <div className="absolute inset-0 flex items-center justify-center"><div className="h-3 w-3 rounded-full bg-[var(--color-gold)] shadow-[0_0_12px_var(--color-gold)]" /></div>
          </div>
          <p className="mt-6 text-sm text-[var(--color-text)]">{LOADING_MESSAGES[loadingIdx]}</p>
        </div>
      )}

      {step === "error" && (
        <div className="w-full max-w-xs text-center">
          <p className="text-4xl">🌬️</p>
          <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p>
          <div className="mt-6 space-y-2">
            {canRetry && retryPos && <button onClick={() => { setStep("loading"); setCanRetry(false); startQuest(retryPos); }} className="btn-primary w-full">もう一度試す</button>}
            <button onClick={() => { setError(""); setStep("permission"); }} className="btn-secondary w-full">やり直す</button>
            <button onClick={() => router.push("/")} className="btn-ghost w-full text-sm">ホームに戻る</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestStartPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-fantasy">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-[var(--color-gold)] border-t-transparent" />
        </div>
      </div>
    }>
      <QuestStartContent />
    </Suspense>
  );
}
