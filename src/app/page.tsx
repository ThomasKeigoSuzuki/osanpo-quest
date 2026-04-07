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
  let streak = 0;
  let displayName: string | undefined;

  if (user) {
    const { data: p } = await supabase.from("users").select("display_name, total_quests_completed, login_streak").eq("id", user.id).single();
    totalQuests = p?.total_quests_completed ?? 0;
    streak = p?.login_streak ?? 0;
    displayName = p?.display_name;

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

    const { data: rp } = await supabase.from("users").select("rank_points, shinako_revealed, last_home_visit_at").eq("id", user.id).single();
    if (rp) {
      rankInfo = getRank(rp.rank_points);
      shinakoRevealed = rp.shinako_revealed ?? false;
      lastHomeVisitAt = rp.last_home_visit_at ?? null;
    }
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
        streak,
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
