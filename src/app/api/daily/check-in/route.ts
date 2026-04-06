import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDailyQuestConfig, getStreakBonus, getTodayDateString } from "@/lib/daily-quest";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getTodayDateString();
  const config = getDailyQuestConfig();

  // ユーザー情報取得
  const { data: profile } = await supabase
    .from("users")
    .select("login_streak, last_login_date, longest_streak")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let streak = profile.login_streak ?? 0;
  let longest = profile.longest_streak ?? 0;
  let isNewDay = false;

  const lastLogin = profile.last_login_date;

  if (lastLogin !== today) {
    isNewDay = true;

    // 昨日の日付を計算
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });

    if (lastLogin === yesterdayStr) {
      streak += 1;
    } else {
      streak = 1;
    }

    if (streak > longest) longest = streak;

    await supabase
      .from("users")
      .update({
        login_streak: streak,
        last_login_date: today,
        longest_streak: longest,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  // 今日のデイリークエスト状況確認
  const { data: dailyQuest } = await supabase
    .from("daily_quests")
    .select("completed, quest_id")
    .eq("user_id", user.id)
    .eq("quest_date", today)
    .single();

  const streakBonus = getStreakBonus(streak);

  return NextResponse.json({
    streak,
    longest,
    isNewDay,
    dailyConfig: config,
    dailyCompleted: dailyQuest?.completed ?? false,
    dailyQuestId: dailyQuest?.quest_id ?? null,
    streakBonus,
  });
}
