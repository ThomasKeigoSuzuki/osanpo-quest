export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getDailyQuestConfig, getCategoryBonusLabel, getTodayDateString } from "@/lib/daily-quest";
import { getBondLevel } from "@/lib/bond-system";
import { getRank } from "@/lib/rank-system";
import { HomeClient } from "@/components/home-client";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let totalQuests = 0;
  let itemCount = 0;
  let areaCount = 0;
  let dailyCompleted = false;
  let shinakoBondLevel = 1;
  let shinakoBond: { level: number; name: string } | null = null;
  let rankInfo = getRank(0);
  let shinakoRevealed = false;
  let lastHomeVisitAt: string | null = null;
  let activeQuest: { id: string } | null = null;
  let weekWalkedDays = 0;
  let displayName: string | undefined;

  if (user) {
    const today = getTodayDateString();

    // 「今週」= 直近7日（JST）。クエスト完了日（distinct）の日数をカウント。
    // eslint-disable-next-line react-hooks/purity -- Server Component の非同期処理では Date.now() は許容
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 全クエリを並列実行（usersテーブルは1回に統合）
    const [profileRes, questRes, itemCountRes, areaRes, dailyRes, bondRes, weekRes] = await Promise.all([
      supabase.from("users").select("display_name, total_quests_completed, rank_points, shinako_revealed, last_home_visit_at").eq("id", user.id).single(),
      supabase.from("quests").select("id").eq("user_id", user.id).eq("status", "active").limit(1).single(),
      supabase.from("items").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("quests").select("start_area_name").eq("user_id", user.id).eq("status", "completed"),
      supabase.from("daily_quests").select("completed").eq("user_id", user.id).eq("quest_date", today).single(),
      supabase.from("god_bonds").select("bond_exp").eq("user_id", user.id).eq("god_name", "シナコ").single(),
      supabase.from("quests").select("completed_at").eq("user_id", user.id).eq("status", "completed").gte("completed_at", sevenDaysAgoIso),
    ]);

    if (profileRes.data) {
      const p = profileRes.data;
      totalQuests = p.total_quests_completed ?? 0;
      displayName = p.display_name;
      rankInfo = getRank(p.rank_points ?? 0);
      shinakoRevealed = p.shinako_revealed ?? false;
      lastHomeVisitAt = p.last_home_visit_at ?? null;
    }

    activeQuest = questRes.data;
    itemCount = itemCountRes.count ?? 0;
    areaCount = areaRes.data ? new Set(areaRes.data.map((q) => q.start_area_name)).size : 0;
    dailyCompleted = dailyRes.data?.completed ?? false;

    if (weekRes.data) {
      const jstDays = new Set<string>();
      for (const row of weekRes.data) {
        if (!row.completed_at) continue;
        const jst = new Date(row.completed_at).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
        jstDays.add(jst);
      }
      weekWalkedDays = jstDays.size;
    }

    if (bondRes.data) {
      const bl = getBondLevel(bondRes.data.bond_exp);
      shinakoBondLevel = bl.level;
      if (bl.level >= 2) shinakoBond = { level: bl.level, name: bl.name };
    }

    // last_home_visit_at をサーバーサイドで更新（レスポンスを待たない）
    supabase.from("users").update({ last_home_visit_at: new Date().toISOString() }).eq("id", user.id).then(() => {});
  }

  const dailyConfig = getDailyQuestConfig();
  const catLabel = getCategoryBonusLabel(dailyConfig.categoryBonus);
  const mainBonus = catLabel ? `${catLabel}UP` : dailyConfig.rarityBonus > 0 ? `レア+${dailyConfig.rarityBonus}` : null;

  return (
    <HomeClient
      data={{
        isFirstTime: !shinakoRevealed,
        shinakoRevealed,
        lastHomeVisitAt,
        shinakoBondLevel,
        shinakoBond,
        totalQuests,
        itemCount,
        areaCount,
        weekWalkedDays,
        dailyCompleted,
        dailyConfig: { name: dailyConfig.name },
        mainBonus,
        rankInfo,
        activeQuest,
        userId: user?.id ?? "",
        displayName,
      }}
    />
  );
}
