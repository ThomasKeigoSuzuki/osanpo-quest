export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDailyQuestConfig, getCategoryBonusLabel, getTodayDateString } from "@/lib/daily-quest";
import { getBondLevel } from "@/lib/bond-system";
import { getRank } from "@/lib/rank-system";
import { getShinakoDialogue } from "@/lib/shinako-dialogue";
import { MisuOverlay } from "@/components/misu-overlay";
import { HomeOfferingButton } from "@/components/home-offering";

const SHINAKO_IMG = "/shinako-full.png";

type UserProfile = { display_name: string; total_quests_completed: number; login_streak: number };

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: UserProfile | null = null;
  let activeQuest: { id: string } | null = null;
  let itemCount = 0;
  let areaCount = 0;
  let dailyCompleted = false;
  let shinakoBondLevel = 1;
  let shinakoBond: { level: number; name: string } | null = null;
  let rankInfo = getRank(0);
  let shinakoRevealed = false;

  if (user) {
    const { data: p } = await supabase.from("users").select("display_name, total_quests_completed, login_streak").eq("id", user.id).single<UserProfile>();
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
    if (bond) { const bl = getBondLevel(bond.bond_exp); shinakoBondLevel = bl.level; if (bl.level >= 2) shinakoBond = { level: bl.level, name: bl.name }; }
    const { data: rp } = await supabase.from("users").select("rank_points, shinako_revealed").eq("id", user.id).single();
    if (rp) { rankInfo = getRank(rp.rank_points); shinakoRevealed = rp.shinako_revealed ?? false; }
  }

  const totalQuests = profile?.total_quests_completed ?? 0;
  const isFirstTime = totalQuests === 0 && !shinakoRevealed;
  const needsOffering = totalQuests > 0 && !shinakoRevealed;

  const jstDay = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getDay();
  const quote = shinakoRevealed
    ? getShinakoDialogue(shinakoBondLevel, jstDay, profile?.display_name)
    : "…誰？ あたしの姿が見たいなら、まず一人前になりなさい";
  const dailyConfig = getDailyQuestConfig();
  const streak = profile?.login_streak ?? 0;
  const catLabel = getCategoryBonusLabel(dailyConfig.categoryBonus);
  const mainBonus = catLabel ? `${catLabel}UP` : dailyConfig.rarityBonus > 0 ? `レア+${dailyConfig.rarityBonus}` : null;

  // ===== 初回ユーザー: チュートリアル専用画面 =====
  if (isFirstTime) {
    return (
      <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden" style={{ maxWidth: 448, margin: "0 auto" }}>
        <img src="/bg-shrine.png" alt="" className="absolute inset-0 z-0 h-full w-full object-cover" style={{ filter: "brightness(0.35) saturate(0.7)" }} />
        <div className="absolute inset-x-0 bottom-0 z-[1] h-[50%]" style={{ background: "linear-gradient(to bottom, transparent, rgba(26,26,46,0.97) 60%)" }} />

        {/* シナコ御簾（中央に大きく） */}
        <div className="pointer-events-none absolute left-1/2 z-[5] -translate-x-1/2" style={{ top: "8%", width: "80%", maxWidth: 340, height: "55dvh" }}>
          <MisuOverlay stage={1} characterSrc={SHINAKO_IMG} characterAlt="シナコ" type="shinako" />
        </div>

        {/* セリフ */}
        <div className="absolute right-3 z-30" style={{ top: "10%" }}>
          <div className="relative rounded-xl px-3 py-2" style={{ maxWidth: 170, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(232,184,73,0.3)" }}>
            <p className="text-[11px] leading-relaxed text-white">「{quote}」</p>
            <div className="absolute -bottom-1.5 left-5" style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid rgba(0,0,0,0.7)" }} />
          </div>
        </div>

        {/* チュートリアルガイド（下部） */}
        <div className="absolute bottom-4 left-0 right-0 z-20 px-4 safe-bottom">
          <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(26,26,46,0.95)", border: "1px solid rgba(232,184,73,0.3)", boxShadow: "0 -4px 30px rgba(0,0,0,0.5)" }}>
            <h2 className="font-wafuu text-lg font-bold text-gold">おさんぽクエスト</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-sub)" }}>
              御簾の向こうに誰かいるようです…<br />
              クエストをクリアして、姿を見てみましょう。
            </p>

            {/* ステップ表示 */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--color-gold)", color: "var(--color-bg-primary)" }}>1</div>
                <span className="text-[10px]" style={{ color: "var(--color-gold)" }}>クエスト</span>
              </div>
              <div className="h-px w-4" style={{ background: "var(--color-border)" }} />
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}>2</div>
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>奉納</span>
              </div>
              <div className="h-px w-4" style={{ background: "var(--color-border)" }} />
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}>3</div>
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>解放</span>
              </div>
            </div>

            <Link
              href="/quest/start"
              className="mt-5 block w-full rounded-xl py-4 text-center text-base font-bold transition active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold-light))", color: "var(--color-bg-primary)", boxShadow: "0 4px 20px rgba(232,184,73,0.5)" }}
            >
              🗡️ はじめてのクエストに出発！
            </Link>
            <p className="mt-2 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              移動なし・その場でクリアできます
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== 奉納待ちユーザー =====
  if (needsOffering) {
    return (
      <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden" style={{ maxWidth: 448, margin: "0 auto" }}>
        <img src="/bg-shrine.png" alt="" className="absolute inset-0 z-0 h-full w-full object-cover" style={{ filter: "brightness(0.35) saturate(0.7)" }} />
        <div className="absolute inset-x-0 bottom-0 z-[1] h-[50%]" style={{ background: "linear-gradient(to bottom, transparent, rgba(26,26,46,0.97) 60%)" }} />

        {/* シナコ御簾 */}
        <div className="pointer-events-none absolute left-1/2 z-[5] -translate-x-1/2" style={{ top: "8%", width: "80%", maxWidth: 340, height: "55dvh" }}>
          <MisuOverlay stage={1} characterSrc={SHINAKO_IMG} characterAlt="シナコ" type="shinako" />
        </div>

        {/* セリフ */}
        <div className="absolute right-3 z-30" style={{ top: "10%" }}>
          <div className="relative rounded-xl px-3 py-2" style={{ maxWidth: 170, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(232,184,73,0.3)" }}>
            <p className="text-[11px] leading-relaxed text-white">「…ふーん。一応やれるじゃない。…でもまだ見せないわよ」</p>
            <div className="absolute -bottom-1.5 left-5" style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid rgba(0,0,0,0.7)" }} />
          </div>
        </div>

        {/* 奉納ガイド（下部） */}
        <div className="absolute bottom-4 left-0 right-0 z-20 px-4 safe-bottom">
          <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(26,26,46,0.95)", border: "1px solid rgba(232,184,73,0.3)", boxShadow: "0 -4px 30px rgba(0,0,0,0.5)" }}>
            <p className="text-sm" style={{ color: "var(--color-text-sub)" }}>
              アイテムを奉納して<br />御簾を上げましょう
            </p>

            {/* ステップ表示 */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--color-success)", color: "white" }}>✓</div>
                <span className="text-[10px]" style={{ color: "var(--color-success)" }}>クエスト</span>
              </div>
              <div className="h-px w-4" style={{ background: "var(--color-gold)" }} />
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--color-gold)", color: "var(--color-bg-primary)" }}>2</div>
                <span className="text-[10px]" style={{ color: "var(--color-gold)" }}>奉納</span>
              </div>
              <div className="h-px w-4" style={{ background: "var(--color-border)" }} />
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}>3</div>
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>解放</span>
              </div>
            </div>

            <div className="mt-4">
              <HomeOfferingButton />
            </div>

            {activeQuest && (
              <Link href={`/quest/${activeQuest.id}`} className="mt-2 block text-center text-xs" style={{ color: "var(--color-teal)" }}>
                進行中のクエストに戻る →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== 通常画面（解放済み） =====
  return (
    <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden" style={{ maxWidth: 448, margin: "0 auto" }}>
      <img src="/bg-shrine.png" alt="" className="absolute inset-0 z-0 h-full w-full object-cover" style={{ filter: "brightness(0.4) saturate(0.8)" }} />
      <div className="absolute inset-x-0 bottom-0 z-[1] h-[45%]" style={{ background: "linear-gradient(to bottom, transparent, rgba(26,26,46,0.95) 70%)" }} />

      {/* 上部バー */}
      <div className="absolute left-0 right-0 top-0 z-20 px-3" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }}>
        <div className="flex items-center justify-between">
          <Link href="/settings" className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
            <span className="text-base">{rankInfo.icon}</span>
            <div>
              <p className="font-wafuu text-[10px] font-bold" style={{ color: rankInfo.color }}>{rankInfo.name}</p>
              {!rankInfo.isMax && (
                <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <div className="h-full rounded-full" style={{ width: `${rankInfo.progress * 100}%`, background: rankInfo.color }} />
                </div>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
            <span style={{ color: "var(--color-gold)" }}>⚔️ {totalQuests}</span>
            <span style={{ color: "var(--color-teal)" }}>💎 {itemCount}</span>
            <span style={{ color: "var(--color-accent)" }}>🗺️ {areaCount}</span>
          </div>
        </div>
        {streak > 0 && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold" style={{ background: "rgba(0,0,0,0.5)", color: "var(--color-accent)" }}>
            🔥 {streak}日連続
          </div>
        )}
      </div>

      {/* シナコ */}
      <div className="pointer-events-none absolute left-1/2 z-[5] -translate-x-1/2" style={{ top: "15%", width: "90%", maxWidth: 380, height: "75dvh" }}>
        <img src={SHINAKO_IMG} alt="シナコ" className="h-full w-full object-cover" style={{ objectPosition: "center 5%", animation: "hairSway 6s ease-in-out infinite" }} />
      </div>

      <Link href="/bonds" className="absolute left-1/2 z-[6] -translate-x-1/2" style={{ top: "12%", width: "50%", height: "35dvh" }} aria-label="シナコとの絆" />

      {shinakoBond && (
        <div className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2" style={{ top: "14%" }}>
          <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold" style={{ background: "rgba(0,0,0,0.6)", color: "var(--color-gold)" }}>
            💫 Lv.{shinakoBond.level} {shinakoBond.name}
          </span>
        </div>
      )}

      {/* セリフ */}
      <div className="absolute right-2 z-30" style={{ top: "12%" }}>
        <div className="relative rounded-xl px-3 py-2" style={{ maxWidth: 180, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", border: "1px solid rgba(232,184,73,0.2)" }}>
          <p className="text-[11px] leading-relaxed text-white line-clamp-3">「{quote}」</p>
          <div className="absolute -bottom-1.5 left-5" style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid rgba(0,0,0,0.65)" }} />
        </div>
      </div>

      {/* デイリーカード */}
      <Link href="/quest/start?daily=true" className="absolute left-2 z-20" style={{ top: "40%" }}>
        <div className="rounded-xl p-2.5" style={{ width: 120, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(232,184,73,0.2)" }}>
          <p className="text-[9px] font-bold" style={{ color: "var(--color-gold)" }}>📅 今日のクエスト</p>
          <p className="font-wafuu mt-0.5 truncate text-[11px] text-white">{dailyConfig.name}</p>
          {mainBonus && <span className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px]" style={{ background: "rgba(232,184,73,0.2)", color: "var(--color-gold)" }}>{mainBonus}</span>}
          <div className="mt-1.5">
            {dailyCompleted ? <span className="text-[10px] text-[var(--color-success)]">✅ 完了</span> : !activeQuest ? <span className="inline-block rounded-md px-3 py-1 text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))" }}>GO →</span> : null}
          </div>
        </div>
      </Link>

      {/* アクションボタン */}
      <div className="absolute bottom-3 left-0 right-0 z-20 px-3 safe-bottom">
        <div className="flex gap-2">
          {activeQuest ? (
            <Link href={`/quest/${activeQuest.id}`} className="flex flex-1 flex-col items-center rounded-2xl py-3 transition active:scale-[0.95]" style={{ background: "linear-gradient(135deg, #e76f51, #f4a261)", boxShadow: "0 4px 16px rgba(231,111,81,0.4)" }}>
              <span className="text-xl">⚔️</span><span className="mt-0.5 text-[11px] font-bold text-white">続きから</span>
            </Link>
          ) : (
            <Link href="/quest/start" className="flex flex-1 flex-col items-center rounded-2xl py-3 transition active:scale-[0.95]" style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold-light))", boxShadow: "0 4px 16px rgba(232,184,73,0.4)" }}>
              <span className="text-xl">🗡️</span><span className="mt-0.5 text-[11px] font-bold" style={{ color: "var(--color-bg-primary)" }}>クエスト</span>
            </Link>
          )}
          <Link href="/catalog" className="flex flex-1 flex-col items-center rounded-2xl py-3 transition active:scale-[0.95]" style={{ background: "linear-gradient(135deg, #2ec4b6, #4ecdc4)", boxShadow: "0 4px 16px rgba(78,205,196,0.3)" }}>
            <span className="text-xl">📖</span><span className="mt-0.5 text-[11px] font-bold text-white">図鑑</span>
          </Link>
          <Link href="/bonds" className="flex flex-1 flex-col items-center rounded-2xl py-3 transition active:scale-[0.95]" style={{ background: "linear-gradient(135deg, #9b59b6, #c39bd3)", boxShadow: "0 4px 16px rgba(155,89,182,0.3)" }}>
            <span className="text-xl">💫</span><span className="mt-0.5 text-[11px] font-bold text-white">絆</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
