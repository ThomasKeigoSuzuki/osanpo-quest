export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDailyQuestConfig, getStreakBonus, getCategoryBonusLabel, getTodayDateString } from "@/lib/daily-quest";
import { getBondLevel } from "@/lib/bond-system";
import { getRank } from "@/lib/rank-system";

const SHINAKO_IMG = "/shinako.png"; // 後で /shinako-full.png に差替

type UserProfile = {
  display_name: string;
  total_quests_completed: number;
  login_streak: number;
  last_login_date: string | null;
};

const DAILY_QUOTES = [
  "日曜日のんびり散歩、最高じゃない？",
  "新しい週の始まりだよ！どこに行こうか？",
  "発見の日！面白いもの見つけに行こう",
  "気の向くままに歩こう",
  "自然を感じに行こう",
  "週末前の冒険、行ってみない？",
  "ゆっくり遠くまで歩こうよ",
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: UserProfile | null = null;
  let activeQuest: { id: string } | null = null;
  let itemCount = 0;
  let areaCount = 0;
  let dailyCompleted = false;
  let shinakoBond: { level: number; name: string } | null = null;
  let rankInfo = getRank(0);

  if (user) {
    const { data: p } = await supabase.from("users").select("display_name, total_quests_completed, login_streak, last_login_date").eq("id", user.id).single<UserProfile>();
    profile = p;

    const { data: aq } = await supabase.from("quests").select("id").eq("user_id", user.id).eq("status", "active").limit(1).single();
    activeQuest = aq;

    const { count } = await supabase.from("items").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    itemCount = count ?? 0;

    const { data: areaData } = await supabase.from("quests").select("start_area_name").eq("user_id", user.id).eq("status", "completed");
    areaCount = areaData ? new Set(areaData.map((q) => q.start_area_name)).size : 0;

    const today = getTodayDateString();
    const { data: daily } = await supabase.from("daily_quests").select("completed").eq("user_id", user.id).eq("quest_date", today).single();
    dailyCompleted = daily?.completed ?? false;

    const { data: bond } = await supabase.from("god_bonds").select("bond_exp").eq("user_id", user.id).eq("god_name", "シナコ").single();
    if (bond) { const bl = getBondLevel(bond.bond_exp); if (bl.level >= 2) shinakoBond = { level: bl.level, name: bl.name }; }

    const { data: rp } = await supabase.from("users").select("rank_points").eq("id", user.id).single();
    if (rp) rankInfo = getRank(rp.rank_points);
  }

  const jstDay = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getDay();
  const quote = DAILY_QUOTES[jstDay];
  const dailyConfig = getDailyQuestConfig();
  const streak = profile?.login_streak ?? 0;
  const catLabel = getCategoryBonusLabel(dailyConfig.categoryBonus);
  const mainBonus = catLabel
    ? `${catLabel}UP`
    : dailyConfig.rarityBonus > 0
      ? `レア+${dailyConfig.rarityBonus}`
      : null;

  return (
    <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden" style={{ maxWidth: 448, margin: "0 auto" }}>

      {/* ===== 上部バー (z-20) ===== */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between px-3" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}>
        {/* ランクバッジ */}
        <Link href="/settings" className="card-glass flex items-center gap-1.5 px-2.5 py-1.5">
          <span className="text-sm">{rankInfo.icon}</span>
          <span className="font-wafuu text-[10px] font-bold" style={{ color: rankInfo.color }}>{rankInfo.name}</span>
        </Link>
        {/* 統計 */}
        <div className="card-glass flex items-center gap-2 px-2.5 py-1.5 text-[10px]" style={{ color: "var(--color-text-sub)" }}>
          <span>⚔️{profile?.total_quests_completed ?? 0}</span>
          <span>💎{itemCount}</span>
          <span>🗺️{areaCount}</span>
        </div>
      </div>

      {/* ===== シナコ背景グロー (z-0) ===== */}
      <div
        className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(232,184,73,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ===== シナコ (z-10) ===== */}
      <Link
        href="/bonds"
        className="absolute left-1/2 z-10 -translate-x-1/2"
        style={{ top: "12%", width: 280, height: 280 }}
      >
        <img
          src={SHINAKO_IMG}
          alt="シナコ"
          className="h-full w-full rounded-3xl object-cover"
          style={{ boxShadow: "0 8px 40px rgba(232,184,73,0.15)" }}
        />
        {/* 絆バッジ */}
        {shinakoBond && (
          <span
            className="card-glass absolute -left-1 -top-1 px-2 py-0.5 text-[9px] font-bold"
            style={{ color: "var(--color-gold)", borderColor: "rgba(232,184,73,0.3)" }}
          >
            💫 Lv.{shinakoBond.level} {shinakoBond.name}
          </span>
        )}
      </Link>

      {/* ===== セリフ吹き出し (z-30) ===== */}
      <div className="absolute right-3 z-30" style={{ top: "15%" }}>
        <div className="card-glass relative px-3 py-2" style={{ maxWidth: 170 }}>
          <p className="text-xs leading-relaxed text-[var(--color-text)] line-clamp-2">「{quote}」</p>
          {/* 吹き出しのしっぽ */}
          <div
            className="absolute -bottom-2 left-4"
            style={{
              width: 0, height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "8px solid rgba(255,255,255,0.08)",
            }}
          />
        </div>
      </div>

      {/* ===== デイリーカード (z-20, 左側) ===== */}
      <Link href="/quest/start?daily=true" className="absolute left-3 z-20" style={{ top: "38%", width: 130 }}>
        <div className="card-glass p-2.5">
          <p className="text-[10px] font-bold text-gold">📅 今日</p>
          <p className="font-wafuu mt-0.5 truncate text-xs text-[var(--color-text)]">{dailyConfig.name}</p>
          {mainBonus && (
            <span className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px]" style={{ background: "rgba(232,184,73,0.15)", color: "var(--color-gold)" }}>
              {mainBonus}
            </span>
          )}
          <div className="mt-1.5">
            {dailyCompleted ? (
              <span className="text-[10px] text-[var(--color-success)]">✅ 完了！</span>
            ) : !activeQuest ? (
              <span className="btn-primary inline-block !px-3 !py-1 text-[10px]">GO →</span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* ===== ストリークバッジ (z-20, 右側) ===== */}
      {streak > 0 && (
        <div className="card-glass absolute right-3 z-20 px-2.5 py-1.5" style={{ top: "48%" }}>
          <span className="text-[10px] font-bold text-[var(--color-accent)]">🔥 {streak}日</span>
        </div>
      )}

      {/* ===== ランクプログレス (z-20) ===== */}
      {!rankInfo.isMax && (
        <div className="absolute left-4 right-4 z-20" style={{ bottom: 148 }}>
          <div className="flex items-center justify-between">
            <span className="text-xs">{rankInfo.icon}</span>
            <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>
              {rankInfo.currentPoints}/{rankInfo.nextRankPoints} pts
            </span>
          </div>
          <div className="mt-0.5 h-[2px] overflow-hidden rounded-full" style={{ background: "var(--color-card)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${rankInfo.progress * 100}%`,
                background: `linear-gradient(90deg, ${rankInfo.color}80, ${rankInfo.color})`,
              }}
            />
          </div>
        </div>
      )}

      {/* ===== アクションボタン (z-20) ===== */}
      <div className="absolute bottom-[80px] left-0 right-0 z-20 flex gap-2 px-4">
        {activeQuest ? (
          <Link href={`/quest/${activeQuest.id}`} className="card-glass flex flex-1 flex-col items-center py-3 transition active:scale-[0.97]">
            <span className="text-lg">⚔️</span>
            <span className="text-[10px] text-[var(--color-text)]">続きから</span>
          </Link>
        ) : (
          <Link href="/quest/start" className="card-glass flex flex-1 flex-col items-center py-3 transition active:scale-[0.97]">
            <span className="text-lg">🗡️</span>
            <span className="text-[10px] text-[var(--color-text)]">クエスト</span>
          </Link>
        )}
        <Link href="/catalog" className="card-glass flex flex-1 flex-col items-center py-3 transition active:scale-[0.97]">
          <span className="text-lg">📖</span>
          <span className="text-[10px] text-[var(--color-text)]">図鑑</span>
        </Link>
        <Link href="/bonds" className="card-glass flex flex-1 flex-col items-center py-3 transition active:scale-[0.97]">
          <span className="text-lg">💫</span>
          <span className="text-[10px] text-[var(--color-text)]">絆</span>
        </Link>
      </div>
    </div>
  );
}
