export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDailyQuestConfig, getStreakBonus, getCategoryBonusLabel, getTodayDateString } from "@/lib/daily-quest";
import { getBondLevel } from "@/lib/bond-system";
import { getRank } from "@/lib/rank-system";

type UserProfile = {
  display_name: string;
  total_quests_completed: number;
  login_streak: number;
  last_login_date: string | null;
};

const DAILY_QUOTES = [
  "日曜日のんびり散歩、最高じゃない？",
  "新しい週の始まりだよ！今日はどこに行こうか？",
  "火曜日は発見の日！面白いもの見つけに行こう",
  "水の流れるように、気の向くままに歩こう",
  "木々の声が聞こえるかな？自然を感じに行こう",
  "金曜日！週末前の冒険、行ってみない？",
  "休日だ！ゆっくり遠くまで歩いてみようよ",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: UserProfile | null = null;
  let activeQuest: { id: string } | null = null;
  let itemCount = 0;
  let areaCount = 0;
  let dailyCompleted = false;
  let shinakoBond: { level: number; name: string } | null = null;
  let rankInfo = getRank(0);

  if (user) {
    const { data: p } = await supabase
      .from("users")
      .select("display_name, total_quests_completed, login_streak, last_login_date")
      .eq("id", user.id)
      .single<UserProfile>();
    profile = p;

    const { data: aq } = await supabase
      .from("quests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();
    activeQuest = aq;

    const { count } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    itemCount = count ?? 0;

    const { data: areaData } = await supabase
      .from("quests")
      .select("start_area_name")
      .eq("user_id", user.id)
      .eq("status", "completed");
    areaCount = areaData ? new Set(areaData.map((q) => q.start_area_name)).size : 0;

    // デイリー状況
    const today = getTodayDateString();
    const { data: daily } = await supabase
      .from("daily_quests")
      .select("completed")
      .eq("user_id", user.id)
      .eq("quest_date", today)
      .single();
    dailyCompleted = daily?.completed ?? false;

    // シナコの絆
    const { data: bond } = await supabase
      .from("god_bonds")
      .select("bond_exp")
      .eq("user_id", user.id)
      .eq("god_name", "シナコ")
      .single();
    if (bond) {
      const bl = getBondLevel(bond.bond_exp);
      if (bl.level >= 2) shinakoBond = { level: bl.level, name: bl.name };
    }

    // ランク
    const { data: rp } = await supabase
      .from("users")
      .select("rank_points")
      .eq("id", user.id)
      .single();
    if (rp) rankInfo = getRank(rp.rank_points);
  }

  const jstDay = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getDay();
  const quote = DAILY_QUOTES[jstDay];
  const dailyConfig = getDailyQuestConfig();
  const streak = profile?.login_streak ?? 0;
  const streakBonus = getStreakBonus(streak);
  const catLabel = getCategoryBonusLabel(dailyConfig.categoryBonus);

  return (
    <div className="flex flex-col items-center px-4 pt-10 pb-4">
      <p className="text-sm text-[var(--color-text-sub)]">
        {profile?.display_name ?? "ぼうけんしゃ"}の冒険
      </p>
      <h1 className="font-wafuu text-gold mt-1 text-3xl font-bold">
        おさんぽクエスト
      </h1>

      {/* シナコ（タップで絆ページへ） */}
      <Link href="/bonds" className="relative mt-8 block">
        <div className="absolute -inset-2 animate-[glowRing_3s_ease-in-out_infinite] rounded-full border-2 border-[var(--color-gold)] opacity-60" />
        <img
          src="/shinako.png"
          alt="シナコ"
          width={144}
          height={144}
          className="relative h-36 w-36 rounded-full border-2 border-[var(--color-gold)] object-cover shadow-[0_0_30px_rgba(232,184,73,0.2)]"
        />
        {shinakoBond && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: "rgba(232,184,73,0.2)", color: "var(--color-gold)", border: "1px solid rgba(232,184,73,0.3)" }}>
            💫 Lv.{shinakoBond.level} {shinakoBond.name}
          </span>
        )}
      </Link>

      {/* セリフ */}
      <div className="card-glass mt-5 w-full max-w-xs px-4 py-3">
        <p className="text-center text-sm leading-relaxed text-[var(--color-text)]">「{quote}」</p>
        <p className="mt-1 text-right text-xs text-[var(--color-gold)]">— <span className="font-wafuu">シナコ</span></p>
      </div>

      {/* デイリークエストカード */}
      <div className="card-glass mt-4 w-full max-w-xs p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gold">📅 今日のクエスト</h2>
          {dailyCompleted && <span className="text-xs text-[var(--color-success)]">✅ 完了！</span>}
        </div>
        <p className="font-wafuu mt-1 text-sm text-[var(--color-text)]">{dailyConfig.name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(232,184,73,0.15)", color: "var(--color-gold)" }}>
            {dailyConfig.type === "direction" ? "方角" : dailyConfig.type === "discovery" ? "発見" : dailyConfig.type === "experience" ? "体験" : "ランダム"}
          </span>
          <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(78,205,196,0.15)", color: "var(--color-teal)" }}>
            {dailyConfig.distRange[0]}〜{dailyConfig.distRange[1]}m
          </span>
          {catLabel && (
            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(244,162,97,0.15)", color: "var(--color-accent)" }}>
              {catLabel}が出やすい
            </span>
          )}
          {dailyConfig.rarityBonus > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(232,184,73,0.2)", color: "var(--color-gold)" }}>
              レアリティ+{dailyConfig.rarityBonus}
            </span>
          )}
        </div>
        {!dailyCompleted && !activeQuest && (
          <Link href="/quest/start?daily=true" className="btn-primary mt-3 block w-full text-center text-sm">
            今日のクエストを始める
          </Link>
        )}
      </div>

      {/* ストリーク */}
      {streak > 0 && (
        <div className="card-glass mt-3 w-full max-w-xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--color-accent)]">🔥 連続ログイン: {streak}日目</span>
            {streakBonus.label && <span className="text-[10px] text-gold">{streakBonus.label}</span>}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => {
              const day = i + 1;
              const done = day <= streak % 7 || (streak >= 7 && streak % 7 === 0 && day <= 7);
              const isBonus = day === 3 || day === 5;
              const isJackpot = day === 7;
              return (
                <div
                  key={i}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                    done
                      ? "bg-[var(--color-gold)] text-[var(--color-bg-primary)]"
                      : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {isJackpot ? "🎁" : isBonus ? "★" : done ? "✓" : day}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 通常クエストボタン */}
      {activeQuest ? (
        <Link href={`/quest/${activeQuest.id}`} className="btn-secondary mt-4 w-full max-w-xs text-center">
          続きから
        </Link>
      ) : (
        <Link href="/quest/start" className="btn-ghost mt-4 w-full max-w-xs text-center text-sm" style={{ border: "1px solid var(--color-border)" }}>
          フリークエスト
        </Link>
      )}

      {/* ランクバー */}
      <div className="card-glass mt-6 w-full max-w-xs p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{rankInfo.icon}</span>
            <span className="font-wafuu text-sm font-bold" style={{ color: rankInfo.color }}>{rankInfo.name}</span>
          </div>
          {!rankInfo.isMax && (
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {rankInfo.currentPoints}/{rankInfo.nextRankPoints} pts
            </span>
          )}
        </div>
        {!rankInfo.isMax && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--color-card)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${rankInfo.progress * 100}%`,
                background: `linear-gradient(90deg, ${rankInfo.color}80, ${rankInfo.color})`,
              }}
            />
          </div>
        )}
      </div>

      {/* 統計 */}
      <div className="mt-3 flex w-full max-w-xs gap-3">
        <div className="card-glass flex flex-1 flex-col items-center py-3">
          <span className="text-base">⚔️</span>
          <p className="text-gold mt-0.5 text-lg font-bold">{profile?.total_quests_completed ?? 0}</p>
          <p className="text-[9px] text-[var(--color-text-sub)]">クリア</p>
        </div>
        <div className="card-glass flex flex-1 flex-col items-center py-3">
          <span className="text-base">💎</span>
          <p className="text-gold mt-0.5 text-lg font-bold">{itemCount}</p>
          <p className="text-[9px] text-[var(--color-text-sub)]">コレクション</p>
        </div>
        <div className="card-glass flex flex-1 flex-col items-center py-3">
          <span className="text-base">🗺️</span>
          <p className="text-gold mt-0.5 text-lg font-bold">{areaCount}</p>
          <p className="text-[9px] text-[var(--color-text-sub)]">エリア</p>
        </div>
      </div>
    </div>
  );
}
