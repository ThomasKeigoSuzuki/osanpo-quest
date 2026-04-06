"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

type Step = "permission" | "select" | "loading" | "error";
const MAX_RETRIES = 2;
const LOADING_MESSAGES = [
  "位置を確認中...",
  "神様を呼んでいます...",
  "クエストを組み立て中...",
  "もう少し...",
];

export default function QuestStartPage() {
  const [step, setStep] = useState<Step>("permission");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [retryPref, setRetryPref] = useState<"wanderer" | "local" | "random" | null>(null);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (step !== "loading") { setLoadingIdx(0); return; }
    const i = setInterval(() => setLoadingIdx((v) => Math.min(v + 1, LOADING_MESSAGES.length - 1)), 2000);
    return () => clearInterval(i);
  }, [step]);

  function requestLocation() {
    if (!navigator.geolocation) { setError("位置情報に対応していません"); setStep("error"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }); setStep("select"); },
      (e) => {
        setError(e.code === 1 ? "位置情報を許可してください" : e.code === 2 ? "GPS を有効にしてください" : "取得がタイムアウトしました");
        setStep("error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }

  const startQuest = useCallback(async (pref: "wanderer" | "local" | "random", retry = 0) => {
    if (!position) return;
    setStep("loading"); setRetryPref(pref);
    try {
      const res = await fetch("/api/quest/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: position.lat, lng: position.lng, god_preference: pref }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "失敗しました"); }
      const d = await res.json();
      router.push(`/quest/${d.quest_id}`);
    } catch (err) {
      if (retry < MAX_RETRIES) { await new Promise((r) => setTimeout(r, 1000)); return startQuest(pref, retry + 1); }
      setError(err instanceof Error ? err.message : "クエスト開始に失敗しました"); setStep("error");
    }
  }, [position, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-fantasy px-4">
      {step === "permission" && (
        <div className="text-center">
          {/* コンパスアイコン */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[var(--color-gold)] bg-[rgba(232,184,73,0.1)]">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="var(--color-gold)" strokeWidth="1.5" opacity="0.5" />
              <circle cx="24" cy="24" r="3" fill="var(--color-gold)" />
              <path d="M24 8L26 20H22L24 8Z" fill="var(--color-gold)" />
              <path d="M24 40L22 28H26L24 40Z" fill="var(--color-text-sub)" opacity="0.5" />
              <path d="M8 24L20 22V26L8 24Z" fill="var(--color-text-sub)" opacity="0.5" />
              <path d="M40 24L28 26V22L40 24Z" fill="var(--color-gold)" />
            </svg>
          </div>
          <h2 className="text-gold mt-6 text-xl font-bold">冒険の準備</h2>
          <p className="mt-2 text-sm text-[var(--color-text-sub)]">クエスト生成に現在地が必要です</p>
          <button onClick={requestLocation} className="btn-primary mt-8 w-full max-w-xs">位置情報を許可する</button>
          <button onClick={() => router.push("/")} className="btn-ghost mt-3 text-sm">ホームに戻る</button>
        </div>
      )}

      {step === "select" && (
        <div className="w-full max-w-xs text-center">
          <h2 className="font-wafuu text-gold text-xl font-bold">どの神様に会いますか？</h2>
          <p className="mt-2 text-sm text-[var(--color-text-sub)]">神様を選んでクエストを始めよう</p>
          <div className="mt-8 space-y-3">
            {/* シナコ */}
            <button onClick={() => startQuest("wanderer")} className="card-glass flex w-full items-center gap-4 p-4 text-left transition hover:border-[var(--color-gold)]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(78,205,196,0.15)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 8c3-3 6-1 9-4s6 1 9 4" stroke="var(--color-teal)" strokeWidth="2" strokeLinecap="round"/><path d="M5 14c2-2 5 0 7-3s5 1 7 3" stroke="var(--color-teal)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/></svg>
              </div>
              <div>
                <p className="font-wafuu font-bold text-[var(--color-text)]">シナコにおまかせ</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">風の神が方角と発見のクエストを出す</p>
              </div>
            </button>
            {/* ご当地 */}
            <button onClick={() => startQuest("local")} className="card-glass flex w-full items-center gap-4 p-4 text-left transition hover:border-[var(--color-gold)]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(244,162,97,0.15)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 6L8 10h8L12 6ZM8 10L5 14h14L17 10M7 14v6h10v-6" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <p className="font-wafuu font-bold text-[var(--color-text)]">この土地の神様に会う</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">ご当地の神様がミッションを出す</p>
              </div>
            </button>
            {/* おまかせ */}
            <button onClick={() => startQuest("random")} className="btn-primary relative mt-2 w-full text-center text-base">
              おまかせ！
              <span className="mt-0.5 block text-xs font-normal opacity-70">ランダムに神様が選ばれる</span>
            </button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="text-center">
          {/* 魔法陣風スピナー */}
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-[var(--color-gold)] border-t-transparent opacity-60" />
            <div className="absolute inset-2 animate-[spin_2s_linear_infinite_reverse] rounded-full border border-[var(--color-gold-light)] border-b-transparent opacity-40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-[var(--color-gold)] shadow-[0_0_12px_var(--color-gold)]" />
            </div>
          </div>
          <p className="mt-6 text-sm text-[var(--color-text)]">{LOADING_MESSAGES[loadingIdx]}</p>
        </div>
      )}

      {step === "error" && (
        <div className="w-full max-w-xs text-center">
          <p className="text-4xl">😥</p>
          <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p>
          <div className="mt-6 space-y-2">
            {retryPref && position && <button onClick={() => startQuest(retryPref)} className="btn-primary w-full">もう一度試す</button>}
            <button onClick={() => { setError(""); setStep(position ? "select" : "permission"); }} className="btn-secondary w-full">{position ? "神様を選び直す" : "位置情報を再取得"}</button>
            <button onClick={() => router.push("/")} className="btn-ghost w-full text-sm">ホームに戻る</button>
          </div>
        </div>
      )}
    </div>
  );
}
