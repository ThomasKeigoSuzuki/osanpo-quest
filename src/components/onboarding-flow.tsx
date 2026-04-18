"use client";

/**
 * おさんぽクエスト オンボーディング
 *
 * 7ステップのうち、ホーム→クエスト出発までの 4 ステップをこのコンポーネントで扱う。
 *   1. ようこそ（神社に着いた）
 *   2. シナコとの出会い
 *   3. 距離の好み
 *   4. 位置情報のお願い
 *
 * 残りのステップ（初クエスト / 初奉納 / 次の一歩）は既存のクエスト完了画面 +
 * ReunionHome 側で扱う。
 *
 * 好みと進行状態は localStorage に保存する（DB 追加なしでも動くように）。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { introDialogues } from "@/lib/shinako-dialogue";

const SHINAKO_IMG = "/shinako-full.webp";

export type DistancePreference = "short" | "medium" | "long";

const STORAGE_KEYS = {
  step: "oq_onboarding_step",
  distance: "oq_distance_preference",
  completed: "oq_onboarding_completed_at",
} as const;

const DISTANCE_OPTIONS: {
  key: DistancePreference;
  label: string;
  tagline: string;
  meters: string;
  emoji: string;
}[] = [
  { key: "short", label: "ちょっとだけ", tagline: "お散歩前の軽いひと歩き", meters: "〜150m", emoji: "🌱" },
  { key: "medium", label: "ちょうどいい", tagline: "気持ちよく歩ける距離", meters: "150〜350m", emoji: "🌿" },
  { key: "long", label: "しっかり歩く", tagline: "ちゃんと散歩したい日", meters: "350〜700m", emoji: "🌳" },
];

type Stage = "welcome" | "meet" | "distance" | "permission" | "ready";

// localStorage を安全に読む（SSR / Safari プライベートモード対応）
function readInitialStage(): Stage {
  if (typeof window === "undefined") return "welcome";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.step) as Stage | null;
    if (saved === "meet" || saved === "distance" || saved === "permission" || saved === "ready") {
      return saved;
    }
  } catch {}
  return "welcome";
}

function readInitialDistance(): DistancePreference {
  if (typeof window === "undefined") return "medium";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.distance);
    if (saved === "short" || saved === "medium" || saved === "long") return saved;
  } catch {}
  return "medium";
}

export function OnboardingFlow({ activeQuest }: { activeQuest: { id: string } | null }) {
  const [stage, setStage] = useState<Stage>(readInitialStage);
  const [visibleLines, setVisibleLines] = useState(0);
  const [distance, setDistance] = useState<DistancePreference>(readInitialDistance);

  // welcome / meet ステージのセリフ順次表示
  useEffect(() => {
    if (stage !== "welcome" && stage !== "meet") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    introDialogues.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 1200 + i * 1600));
    });
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  function goTo(next: Stage) {
    setStage(next);
    try {
      localStorage.setItem(STORAGE_KEYS.step, next);
    } catch {}
  }

  function saveDistance(value: DistancePreference) {
    setDistance(value);
    try {
      localStorage.setItem(STORAGE_KEYS.distance, value);
    } catch {}
  }

  function markCompleted() {
    try {
      localStorage.setItem(STORAGE_KEYS.completed, new Date().toISOString());
    } catch {}
  }

  // 共通: 背景 + シナコ
  const backdrop = (
    <>
      <img
        src="/bg-shrine.webp"
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover"
        style={{ filter: "brightness(1.05) saturate(0.85)", opacity: 0.6 }}
      />
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(247,242,232,0.55) 0%, rgba(247,242,232,0.85) 55%, rgba(241,234,216,0.98) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 z-[5] -translate-x-1/2"
        style={{
          top: "8%",
          width: "80%",
          maxWidth: 340,
          height: "55dvh",
          animation: "shinakoFadeIn 1.5s ease-out forwards",
        }}
      >
        <img src={SHINAKO_IMG} alt="シナコ" className="h-full w-full object-cover" style={{ objectPosition: "center 5%" }} />
      </div>
    </>
  );

  return (
    <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden" style={{ maxWidth: 448, margin: "0 auto" }}>
      {backdrop}

      {/* ステップインジケータ */}
      <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1.5">
        {(["welcome", "distance", "permission", "ready"] as Stage[]).map((s) => {
          const order = ["welcome", "meet", "distance", "permission", "ready"];
          const currentIdx = order.indexOf(stage);
          const targetIdx = order.indexOf(s);
          const isActive = currentIdx >= targetIdx;
          return (
            <span
              key={s}
              className="h-1.5 w-6 rounded-full transition-all"
              style={{
                background: isActive ? "var(--accent-gold)" : "rgba(217,164,65,0.25)",
                boxShadow: isActive ? "0 0 6px rgba(217,164,65,0.5)" : undefined,
              }}
            />
          );
        })}
      </div>

      {/* === Stage 1-2: セリフ === */}
      {(stage === "welcome" || stage === "meet") && (
        <>
          <div className="absolute right-3 z-30 flex flex-col gap-2" style={{ top: "10%", maxWidth: 200 }}>
            {introDialogues.map((line, i) => (
              <div
                key={i}
                className="relative rounded-xl px-3 py-2"
                style={{
                  background: "rgba(255,253,247,0.94)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(217,164,65,0.3)",
                  boxShadow: "0 2px 10px rgba(42,37,32,0.08)",
                  opacity: i < visibleLines ? 1 : 0,
                  animation: i < visibleLines ? "dialogueFadeIn 0.6s ease-out forwards" : undefined,
                }}
              >
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  「{line}」
                </p>
              </div>
            ))}
          </div>

          {visibleLines >= introDialogues.length && (
            <div
              className="absolute bottom-6 left-0 right-0 z-20 px-6 safe-bottom"
              style={{ animation: "dialogueFadeIn 0.6s ease-out forwards" }}
            >
              <button
                onClick={() => goTo("distance")}
                className="w-full rounded-2xl py-4 text-base font-bold transition active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))",
                  color: "var(--text-primary)",
                  boxShadow: "0 4px 20px rgba(217,164,65,0.35)",
                }}
              >
                ここで返事をする →
              </button>
              <p className="mt-2 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
                あと3ステップではじめられます
              </p>
            </div>
          )}
        </>
      )}

      {/* === Stage 3: 距離の好み === */}
      {stage === "distance" && (
        <>
          <div className="absolute right-3 z-30" style={{ top: "12%", maxWidth: 210 }}>
            <div
              className="rounded-xl px-3 py-2.5"
              style={{
                background: "rgba(255,253,247,0.95)",
                border: "1px solid rgba(217,164,65,0.3)",
                boxShadow: "0 2px 10px rgba(42,37,32,0.08)",
                animation: "dialogueFadeIn 0.5s ease-out",
              }}
            >
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
                「今日は、どのくらい歩きたい気分？」
              </p>
            </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 z-20 px-4 safe-bottom" style={{ animation: "dialogueFadeIn 0.5s ease-out 0.4s both" }}>
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,253,247,0.96)",
                border: "1px solid rgba(217,164,65,0.3)",
                boxShadow: "0 -4px 24px rgba(42,37,32,0.1)",
              }}
            >
              <p className="text-center text-[11px] tracking-wider" style={{ color: "var(--accent-gold-dark)" }}>
                歩く距離のこのみ
              </p>
              <h2 className="font-wafuu mt-1 text-center text-base font-bold" style={{ color: "var(--text-primary)" }}>
                ちょうどいい距離を選ぼう
              </h2>

              <div className="mt-3 space-y-2">
                {DISTANCE_OPTIONS.map((opt) => {
                  const selected = distance === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => saveDistance(opt.key)}
                      className="w-full rounded-xl px-3 py-3 text-left transition active:scale-[0.98]"
                      style={{
                        background: selected ? "rgba(217,164,65,0.18)" : "rgba(255,253,247,0.6)",
                        border: `1px solid ${selected ? "var(--accent-gold)" : "rgba(217,164,65,0.2)"}`,
                        boxShadow: selected ? "0 2px 10px rgba(217,164,65,0.2)" : "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{opt.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                              {opt.label}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--accent-gold-dark)" }}>
                              {opt.meters}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            {opt.tagline}
                          </p>
                        </div>
                        <span
                          className="h-5 w-5 shrink-0 rounded-full border-2 transition"
                          style={{
                            borderColor: selected ? "var(--accent-gold)" : "rgba(217,164,65,0.3)",
                            background: selected ? "var(--accent-gold)" : "transparent",
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
                あとで「わたし」から変更できます
              </p>

              <button
                onClick={() => goTo("permission")}
                className="mt-3 w-full rounded-xl py-3.5 text-center text-sm font-bold transition active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))",
                  color: "var(--text-primary)",
                  boxShadow: "0 4px 16px rgba(217,164,65,0.3)",
                }}
              >
                これで進む
              </button>
            </div>
          </div>
        </>
      )}

      {/* === Stage 4: 位置情報のお願い === */}
      {stage === "permission" && (
        <>
          <div className="absolute right-3 z-30" style={{ top: "12%", maxWidth: 210 }}>
            <div
              className="rounded-xl px-3 py-2.5"
              style={{
                background: "rgba(255,253,247,0.95)",
                border: "1px solid rgba(217,164,65,0.3)",
                boxShadow: "0 2px 10px rgba(42,37,32,0.08)",
                animation: "dialogueFadeIn 0.5s ease-out",
              }}
            >
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
                「道に迷っちゃ困るでしょ？ 一応、位置を教えてもらうわ」
              </p>
            </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 z-20 px-4 safe-bottom" style={{ animation: "dialogueFadeIn 0.5s ease-out 0.4s both" }}>
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,253,247,0.96)",
                border: "1px solid rgba(217,164,65,0.3)",
                boxShadow: "0 -4px 24px rgba(42,37,32,0.1)",
              }}
            >
              <p className="text-center text-[11px] tracking-wider" style={{ color: "var(--accent-gold-dark)" }}>
                位置情報について
              </p>
              <h2 className="font-wafuu mt-1 text-center text-base font-bold" style={{ color: "var(--text-primary)" }}>
                歩くためには場所が必要
              </h2>

              <ul className="mt-3 space-y-2">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-lg">📍</span>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    <b style={{ color: "var(--text-primary)" }}>近くの目的地</b>を見つけるのに使います
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-lg">🗺️</span>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    歩いた<b style={{ color: "var(--text-primary)" }}>道のりを日記</b>として残せます
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-lg">🔒</span>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    位置はクエスト中のみ参照し、<b style={{ color: "var(--text-primary)" }}>あなたのデバイスだけ</b>に保存されます
                  </p>
                </li>
              </ul>

              <p className="mt-3 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
                次の画面で端末からの許可を求められます
              </p>

              <button
                onClick={() => { markCompleted(); goTo("ready"); }}
                className="mt-4 w-full rounded-xl py-3.5 text-center text-sm font-bold transition active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))",
                  color: "var(--text-primary)",
                  boxShadow: "0 4px 16px rgba(217,164,65,0.3)",
                }}
              >
                了解、進める
              </button>
              <button
                onClick={() => goTo("distance")}
                className="mt-2 w-full py-2 text-center text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                ← 戻る
              </button>
            </div>
          </div>
        </>
      )}

      {/* === Stage 5: 準備完了 → クエスト出発 === */}
      {stage === "ready" && (
        <div className="absolute bottom-4 left-0 right-0 z-20 px-4 safe-bottom" style={{ animation: "dialogueFadeIn 0.5s ease-out" }}>
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: "rgba(255,253,247,0.96)",
              border: "1px solid rgba(217,164,65,0.3)",
              boxShadow: "0 -4px 24px rgba(42,37,32,0.08), 0 2px 12px rgba(42,37,32,0.04)",
            }}
          >
            <h2 className="font-wafuu text-lg font-bold text-gold">さぁ、はじめよう</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              神無子があなたを試そうとしています。<br />
              最初のクエストへ。
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-gold)", color: "var(--text-primary)" }}>1</div>
                <span className="text-[10px]" style={{ color: "var(--accent-gold-dark)" }}>クエスト</span>
              </div>
              <div className="h-px w-4" style={{ background: "var(--border-soft)" }} />
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--surface-sunken)", color: "var(--text-muted)" }}>2</div>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>奉納</span>
              </div>
              <div className="h-px w-4" style={{ background: "var(--border-soft)" }} />
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--surface-sunken)", color: "var(--text-muted)" }}>3</div>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>再会</span>
              </div>
            </div>

            {activeQuest ? (
              <Link
                href={`/quest/${activeQuest.id}`}
                className="mt-5 block w-full rounded-xl py-4 text-center text-base font-bold transition active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, var(--accent-shu), var(--accent-gold))",
                  color: "var(--text-inverse)",
                  boxShadow: "0 4px 20px rgba(198,94,74,0.35)",
                }}
              >
                ⚔️ 進行中のクエストに戻る
              </Link>
            ) : (
              <Link
                href="/quest/start"
                className="mt-5 block w-full rounded-xl py-4 text-center text-base font-bold transition active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, var(--accent-gold-dark), var(--accent-gold-light))",
                  color: "var(--text-primary)",
                  boxShadow: "0 4px 20px rgba(217,164,65,0.35)",
                }}
              >
                🗡️ はじめてのクエストに出発！
              </Link>
            )}
            <p className="mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
              最初の一歩は数百メートル程度です
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
