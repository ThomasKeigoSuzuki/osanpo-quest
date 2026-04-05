"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Step = "permission" | "select" | "loading" | "error";

const MAX_RETRIES = 2;

export default function QuestStartPage() {
  const [step, setStep] = useState<Step>("permission");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [error, setError] = useState("");
  const [retryPreference, setRetryPreference] = useState<
    "wanderer" | "local" | "random" | null
  >(null);
  const router = useRouter();

  function requestLocation() {
    if (!navigator.geolocation) {
      setError("お使いのブラウザは位置情報に対応していません。");
      setStep("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setStep("select");
      },
      (err) => {
        if (err.code === 1) {
          setError(
            "位置情報の使用が許可されませんでした。ブラウザの設定から位置情報を許可してください。"
          );
        } else if (err.code === 2) {
          setError(
            "位置情報が利用できません。Wi-Fi や GPS を有効にしてください。"
          );
        } else {
          setError("位置情報の取得がタイムアウトしました。もう一度お試しください。");
        }
        setStep("error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }

  const startQuest = useCallback(
    async (
      preference: "wanderer" | "local" | "random",
      retry = 0
    ) => {
      if (!position) return;
      setStep("loading");
      setRetryPreference(preference);

      try {
        const res = await fetch("/api/quest/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: position.lat,
            lng: position.lng,
            god_preference: preference,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "クエストの開始に失敗しました");
        }

        const data = await res.json();
        router.push(`/quest/${data.quest_id}`);
      } catch (err) {
        if (retry < MAX_RETRIES) {
          // 自動リトライ（1秒待機）
          await new Promise((r) => setTimeout(r, 1000));
          return startQuest(preference, retry + 1);
        }
        setError(
          err instanceof Error
            ? err.message
            : "クエストの開始に失敗しました。通信環境を確認して再度お試しください。"
        );
        setStep("error");
      }
    },
    [position, router]
  );

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      {step === "permission" && (
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#E8DFD0]">
            <span className="text-4xl">📍</span>
          </div>
          <h2 className="mt-6 text-lg font-bold text-[#6B8E7B]">
            位置情報を使用します
          </h2>
          <p className="mt-2 text-sm text-[#8B7E6A]">
            クエストの生成に現在地が必要です
          </p>
          <button
            onClick={requestLocation}
            className="mt-8 w-full max-w-xs rounded-2xl bg-[#6B8E7B] px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-[#5A7D6A] active:scale-[0.98]"
          >
            位置情報を許可する
          </button>
          <button
            onClick={() => router.push("/")}
            className="mt-3 text-sm text-[#B0A898] transition hover:text-[#8B7E6A]"
          >
            ホームに戻る
          </button>
        </div>
      )}

      {step === "select" && (
        <div className="w-full max-w-xs text-center">
          <h2 className="text-lg font-bold text-[#6B8E7B]">
            どの神様に会いますか？
          </h2>
          <p className="mt-2 text-sm text-[#8B7E6A]">
            神様を選んでクエストを始めよう
          </p>
          <div className="mt-8 space-y-3">
            <button
              onClick={() => startQuest("wanderer")}
              className="w-full rounded-xl bg-white px-4 py-4 text-left shadow-sm transition hover:shadow-md"
            >
              <span className="text-lg">🌬️</span>
              <span className="ml-3 font-medium text-[#5A5A5A]">
                シナコにおまかせ
              </span>
              <p className="ml-9 mt-1 text-xs text-[#B0A898]">
                放浪の風神がミッションを出すよ
              </p>
            </button>
            <button
              onClick={() => startQuest("local")}
              className="w-full rounded-xl bg-white px-4 py-4 text-left shadow-sm transition hover:shadow-md"
            >
              <span className="text-lg">⛩️</span>
              <span className="ml-3 font-medium text-[#5A5A5A]">
                この土地の神様に会う
              </span>
              <p className="ml-9 mt-1 text-xs text-[#B0A898]">
                ご当地の神様が現れるかも
              </p>
            </button>
            <button
              onClick={() => startQuest("random")}
              className="w-full rounded-xl bg-[#6B8E7B] px-4 py-4 text-center font-bold text-white shadow-lg transition hover:bg-[#5A7D6A] active:scale-[0.98]"
            >
              おまかせ！
            </button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-[#E8DFD0] border-t-[#6B8E7B]" />
          <p className="mt-6 text-sm text-[#8B7E6A]">
            神様を呼んでいます...
          </p>
          <p className="mt-1 text-xs text-[#B0A898]">
            少しお待ちください
          </p>
        </div>
      )}

      {step === "error" && (
        <div className="w-full max-w-xs text-center">
          <p className="text-4xl">😥</p>
          <p className="mt-4 text-sm text-red-500">{error}</p>
          <div className="mt-6 space-y-2">
            {retryPreference && position && (
              <button
                onClick={() => startQuest(retryPreference)}
                className="w-full rounded-xl bg-[#6B8E7B] px-6 py-3 font-medium text-white"
              >
                もう一度試す
              </button>
            )}
            <button
              onClick={() => {
                setError("");
                setStep(position ? "select" : "permission");
              }}
              className="w-full rounded-xl border border-[#D4C5B0] px-6 py-3 text-sm font-medium text-[#8B7E6A]"
            >
              {position ? "神様を選び直す" : "位置情報を再取得"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-2 text-sm text-[#B0A898] transition hover:text-[#8B7E6A]"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
