"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { introDialogues, getFirstVisitOfDayDialogue, getReturningSameDayDialogue } from "@/lib/shinako-dialogue";
import { OnboardingFlow } from "./onboarding-flow";

const SHINAKO_IMG = "/shinako-full.webp";

type HomeData = {
  isFirstTime: boolean;
  shinakoRevealed: boolean;
  lastHomeVisitAt: string | null;
  shinakoBondLevel: number;
  shinakoBond: { level: number; name: string } | null;
  totalQuests: number;
  itemCount: number;
  areaCount: number;
  weekWalkedDays: number;
  dailyCompleted: boolean;
  dailyConfig: { name: string };
  mainBonus: string | null;
  rankInfo: { name: string; icon: string; color: string; isMax: boolean; progress: number };
  activeQuest: { id: string } | null;
  userId: string;
  displayName?: string;
};

// ============================
// 初回ユーザー: イントロ画面
// ============================
function IntroScreen({ activeQuest }: { activeQuest: { id: string } | null }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    introDialogues.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 1500 + i * 1800));
    });
    timers.push(setTimeout(() => setShowButton(true), 1500 + introDialogues.length * 1800 + 500));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden" style={{ maxWidth: 448, margin: "0 auto" }}>
      <img src="/bg-shrine.webp" alt="" className="absolute inset-0 z-0 h-full w-full object-cover" style={{ filter: "brightness(1.05) saturate(0.85)", opacity: 0.6 }} />
      <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to bottom, rgba(247,242,232,0.55) 0%, rgba(247,242,232,0.85) 55%, rgba(241,234,216,0.98) 100%)" }} />

      {/* シナコ全身表示（fade-in） */}
      <div
        className="pointer-events-none absolute left-1/2 z-[5] -translate-x-1/2"
        style={{ top: "8%", width: "80%", maxWidth: 340, height: "55dvh", animation: "shinakoFadeIn 1.5s ease-out forwards" }}
      >
        <img
          src={SHINAKO_IMG}
          alt="シナコ"
          className="h-full w-full object-cover"
          style={{ objectPosition: "center 5%" }}
        />
      </div>

      {/* イントロセリフ（順次表示） */}
      <div className="absolute right-3 z-30 flex flex-col gap-2" style={{ top: "10%", maxWidth: 190 }}>
        {introDialogues.map((line, i) => (
          <div
            key={i}
            className="relative rounded-xl px-3 py-2"
            style={{
              background: "rgba(255,253,247,0.92)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(217,164,65,0.25)",
              boxShadow: "0 2px 10px rgba(42,37,32,0.08)",
              opacity: i < visibleLines ? 1 : 0,
              animation: i < visibleLines ? "dialogueFadeIn 0.6s ease-out forwards" : undefined,
            }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-primary)" }}>「{line}」</p>
          </div>
        ))}
      </div>

      {/* クエストボタン（下部） */}
      <div
        className="absolute bottom-4 left-0 right-0 z-20 px-4 safe-bottom transition-all duration-700"
        style={{ opacity: showButton ? 1 : 0, transform: showButton ? "translateY(0)" : "translateY(20px)" }}
      >
        <div
          className="rounded-2xl p-5 text-center"
          style={{
            background: "rgba(255,253,247,0.96)",
            border: "1px solid rgba(217,164,65,0.3)",
            boxShadow: "0 -4px 24px rgba(42,37,32,0.08), 0 2px 12px rgba(42,37,32,0.04)",
          }}
        >
          <h2 className="font-wafuu text-lg font-bold text-gold">おさんぽクエスト</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            シナコがあなたを試そうとしています…<br />
            最初のクエストに挑みましょう。
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
              style={{ background: "linear-gradient(135deg, var(--accent-shu), var(--accent-gold))", color: "var(--text-inverse)", boxShadow: "0 4px 20px rgba(198,94,74,0.35)" }}
            >
              ⚔️ 進行中のクエストに戻る
            </Link>
          ) : (
            <Link
              href="/quest/start"
              className="mt-5 block w-full rounded-xl py-4 text-center text-base font-bold transition active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, var(--accent-gold-dark), var(--accent-gold-light))", color: "var(--text-primary)", boxShadow: "0 4px 20px rgba(217,164,65,0.35)" }}
            >
              🗡️ はじめてのクエストに出発！
            </Link>
          )}
          <p className="mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            移動なし・その場でクリアできます
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================
// 再訪問ユーザー: 御簾演出付きホーム
// ============================
function getShinakoVisualEffect(bondLevel: number): React.CSSProperties {
  if (bondLevel >= 7) return { filter: "saturate(1.15) brightness(1.02) drop-shadow(0 0 30px rgba(217,164,65,0.4))" };
  if (bondLevel >= 5) return { filter: "saturate(1.08) drop-shadow(0 0 20px rgba(217,164,65,0.28))" };
  if (bondLevel >= 3) return { filter: "drop-shadow(0 0 12px rgba(217,164,65,0.2))" };
  return {};
}

function ReunionHome({ data }: { data: HomeData }) {
  const isFirstVisitOfDay = useMemo(() => {
    if (!data.lastHomeVisitAt) return true;
    const last = new Date(data.lastHomeVisitAt);
    const now = new Date();
    const toJSTDate = (d: Date) => new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).toDateString();
    return toJSTDate(last) !== toJSTDate(now);
  }, [data.lastHomeVisitAt]);

  const reunionQuote = useMemo(() => {
    if (isFirstVisitOfDay) return getFirstVisitOfDayDialogue(data.shinakoBondLevel);
    return getReturningSameDayDialogue(data.shinakoBondLevel);
  }, [isFirstVisitOfDay, data.shinakoBondLevel]);

  const { rankInfo, totalQuests, itemCount, areaCount, weekWalkedDays, shinakoBond, dailyCompleted, dailyConfig, mainBonus, activeQuest } = data;

  // 初回ユーザー向けの「次の一歩」ガイド（クエスト完了数が少ないうちだけ表示）
  const nextStepGuide = useMemo(() => {
    if (totalQuests >= 5) return null;
    if (activeQuest) return null; // 進行中なら邪魔しない

    if (totalQuests === 1) {
      return {
        title: "次は、お散歩に出てみよう",
        body: "距離があるクエストを歩くと、新しい景色のアイテムが見つかります。",
        href: "/quest/start",
        cta: "もう一度挑む",
        emoji: "🌿",
      };
    }
    if (totalQuests === 2) {
      return {
        title: "集めたものを眺めてみよう",
        body: "栞タブで、あなたが見つけた神さまの贈り物を一覧できます。",
        href: "/library?tab=collection",
        cta: "栞をひらく",
        emoji: "🎁",
      };
    }
    if (totalQuests === 3) {
      return {
        title: "神無子との絆が深まる",
        body: "歩くほど、神無子の口調や表情が少しずつ変わっていきます。",
        href: "/bonds",
        cta: "絆をみる",
        emoji: "💫",
      };
    }
    if (totalQuests === 4) {
      return {
        title: "今日のデイリーを覗いてみる",
        body: "曜日ごとにテーマが変わり、達成するとアイテムのレアリティが上がることがあります。",
        href: "/quest/start?daily=true",
        cta: "今日のデイリー",
        emoji: "📅",
      };
    }
    return null;
  }, [totalQuests, activeQuest]);

  return (
    <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden" style={{ maxWidth: 448, margin: "0 auto" }}>
      <img src="/bg-shrine.webp" alt="" className="absolute inset-0 z-0 h-full w-full object-cover" style={{ filter: "brightness(1.05) saturate(0.85)", opacity: 0.55 }} />
      <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to bottom, rgba(247,242,232,0.5) 0%, rgba(247,242,232,0.85) 55%, rgba(241,234,216,0.97) 100%)" }} />

      {/* 上部バー */}
      <div className="absolute left-0 right-0 top-0 z-20 px-3" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }}>
        <div className="flex items-center justify-between">
          <Link href="/settings" className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: "rgba(255,253,247,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(42,37,32,0.06)" }}>
            <span className="text-base">{rankInfo.icon}</span>
            <div>
              <p className="font-wafuu text-[10px] font-bold" style={{ color: rankInfo.color }}>{rankInfo.name}</p>
              {!rankInfo.isMax && (
                <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full" style={{ background: "rgba(42,37,32,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: `${rankInfo.progress * 100}%`, background: rankInfo.color }} />
                </div>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(255,253,247,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(42,37,32,0.06)" }}>
            <span style={{ color: "var(--accent-gold-dark)" }}>⚔️ {totalQuests}</span>
            <span style={{ color: "var(--accent-asagi-dark)" }}>💎 {itemCount}</span>
            <span style={{ color: "var(--accent-shu)" }}>🗺️ {areaCount}</span>
          </div>
        </div>
        {weekWalkedDays > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold" style={{ background: "rgba(255,253,247,0.85)", border: "1px solid rgba(42,37,32,0.06)", color: "var(--accent-gold-dark)" }}>
            <span>🌿 今週</span>
            <span style={{ color: "var(--accent-asagi-dark)" }}>{weekWalkedDays}日</span>
            <span style={{ color: "var(--text-muted)" }}>歩いた</span>
          </div>
        )}
      </div>

      {/* シナコ画像 */}
      <div className="pointer-events-none absolute left-1/2 z-[5] -translate-x-1/2" style={{ top: "15%", width: "90%", maxWidth: 380, height: "75dvh" }}>
        <img
          src={SHINAKO_IMG}
          alt="シナコ"
          className="h-full w-full object-cover"
          style={{
            objectPosition: "center 5%",
            ...getShinakoVisualEffect(data.shinakoBondLevel),
          }}
        />
      </div>

      {/* 絆バッジ */}
      <Link href="/bonds" className="absolute left-1/2 z-[7] -translate-x-1/2" style={{ top: "12%", width: "50%", height: "35dvh" }} aria-label="シナコとの絆" />
      {shinakoBond && (
        <div className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2" style={{ top: "14%" }}>
          <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold" style={{ background: "rgba(255,253,247,0.9)", border: "1px solid rgba(217,164,65,0.3)", color: "var(--accent-gold-dark)" }}>
            💫 Lv.{shinakoBond.level} {shinakoBond.name}
          </span>
        </div>
      )}

      {/* セリフ */}
      <div className="absolute right-2 z-30" style={{ top: "12%", animation: "dialogueFadeIn 0.6s ease-out forwards" }}>
          <div className="relative rounded-xl px-3 py-2" style={{ maxWidth: 180, background: "rgba(255,253,247,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(217,164,65,0.25)", boxShadow: "0 2px 10px rgba(42,37,32,0.08)" }}>
            <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: "var(--text-primary)" }}>「{reunionQuote}」</p>
            <div className="absolute -bottom-1.5 left-5" style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid rgba(255,253,247,0.92)" }} />
          </div>
        </div>

      {/* デイリーカード */}
      <Link href="/quest/start?daily=true" className="absolute left-2 z-20" style={{ top: "40%" }}>
          <div className="rounded-xl p-2.5" style={{ width: 120, background: "rgba(255,253,247,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(217,164,65,0.25)", boxShadow: "0 2px 10px rgba(42,37,32,0.08)" }}>
            <p className="text-[9px] font-bold" style={{ color: "var(--accent-gold-dark)" }}>📅 今日のクエスト</p>
            <p className="font-wafuu mt-0.5 truncate text-[11px]" style={{ color: "var(--text-primary)" }}>{dailyConfig.name}</p>
            {mainBonus && <span className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px]" style={{ background: "rgba(217,164,65,0.18)", color: "var(--accent-gold-dark)" }}>{mainBonus}</span>}
            <div className="mt-1.5">
              {dailyCompleted ? <span className="text-[10px]" style={{ color: "var(--accent-wakaba)" }}>✅ 完了</span> : !activeQuest ? <span className="inline-block rounded-md px-3 py-1 text-[10px] font-bold" style={{ background: "linear-gradient(135deg, var(--accent-gold-dark), var(--accent-gold))", color: "var(--text-primary)" }}>GO →</span> : null}
            </div>
          </div>
        </Link>

      {/* 初心者向け次の一歩 */}
      {nextStepGuide && (
        <Link
          href={nextStepGuide.href}
          className="absolute left-0 right-0 z-20 px-3 transition active:scale-[0.98]"
          style={{ bottom: "88px", animation: "dialogueFadeIn 0.6s ease-out 0.3s both" }}
        >
          <div
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
            style={{
              background: "rgba(255,253,247,0.95)",
              border: "1px solid rgba(217,164,65,0.35)",
              boxShadow: "0 2px 12px rgba(42,37,32,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="text-xl">{nextStepGuide.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>
                {nextStepGuide.title}
              </p>
              <p className="truncate text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {nextStepGuide.body}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))",
                color: "var(--text-primary)",
              }}
            >
              {nextStepGuide.cta} →
            </span>
          </div>
        </Link>
      )}

      {/* アクションボタン */}
      <div className="absolute bottom-3 left-0 right-0 z-20 px-3 safe-bottom">
        <div className="flex gap-2">
          {activeQuest ? (
            <Link href={`/quest/${activeQuest.id}`} className="flex flex-1 flex-col items-center rounded-2xl py-3 transition active:scale-[0.95]" style={{ background: "linear-gradient(135deg, var(--accent-shu), var(--accent-gold))", boxShadow: "0 4px 16px rgba(198,94,74,0.3)" }}>
              <span className="text-xl">⚔️</span><span className="mt-0.5 text-[11px] font-bold" style={{ color: "var(--text-inverse)" }}>続きから</span>
            </Link>
          ) : (
            <Link
              href="/quest/start"
              className="flex flex-1 flex-col items-center rounded-2xl py-3 transition active:scale-[0.95]"
              style={{
                background: "linear-gradient(135deg, var(--accent-gold-dark), var(--accent-gold-light))",
                animation: "inviteBreathe 4.8s ease-in-out infinite",
              }}
            >
              <span className="text-xl">🗡️</span><span className="mt-0.5 text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>クエスト</span>
            </Link>
          )}
          <Link href="/library?tab=catalog" className="flex flex-1 flex-col items-center rounded-2xl py-3 transition active:scale-[0.95]" style={{ background: "linear-gradient(135deg, var(--accent-asagi-dark), var(--accent-asagi))", boxShadow: "0 4px 16px rgba(107,167,181,0.3)" }}>
            <span className="text-xl">📖</span><span className="mt-0.5 text-[11px] font-bold" style={{ color: "var(--text-inverse)" }}>図鑑</span>
          </Link>
          <Link href="/bonds" className="flex flex-1 flex-col items-center rounded-2xl py-3 transition active:scale-[0.95]" style={{ background: "linear-gradient(135deg, #D88F94, var(--accent-sakura))", boxShadow: "0 4px 16px rgba(232,180,184,0.35)" }}>
            <span className="text-xl">💫</span><span className="mt-0.5 text-[11px] font-bold" style={{ color: "var(--text-inverse)" }}>絆</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================
// メインエクスポート
// ============================
export function HomeClient({ data }: { data: HomeData }) {
  if (!data.shinakoRevealed) {
    return <OnboardingFlow activeQuest={data.activeQuest} />;
  }
  return <ReunionHome data={data} />;
}
