import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reverseGeocode } from "@/lib/geo";
import { generateWithClaude, extractJSON } from "@/lib/claude";
import {
  SHINAKO_SYSTEM_PROMPT,
  buildShinakoUserPrompt,
} from "@/lib/prompts";
import { isValidLatLng } from "@/lib/validation";
import { getDailyQuestConfig, getStreakBonus, getTodayDateString } from "@/lib/daily-quest";
import { getBondLevel, getBondToneModifier } from "@/lib/bond-system";

type QuestGeneration = {
  mission_text: string;
  mission_type: "direction" | "discovery" | "experience";
  goal_lat: number;
  goal_lng: number;
  goal_radius_meters: number;
  difficulty: number;
};

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { lat, lng, is_daily = false } = body as { lat: number; lng: number; is_daily?: boolean };

  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: "Valid lat and lng are required" }, { status: 400 });
  }

  // 初回クエストかチェック
  const { data: userStats } = await supabase
    .from("users")
    .select("total_quests_completed")
    .eq("id", user.id)
    .single();
  const isTutorial = (userStats?.total_quests_completed ?? 0) === 0;

  // デイリークエストチェック
  if (is_daily) {
    const today = getTodayDateString();
    const { data: existing } = await supabase
      .from("daily_quests")
      .select("completed")
      .eq("user_id", user.id)
      .eq("quest_date", today)
      .single();

    if (existing?.completed) {
      return NextResponse.json({ error: "今日のデイリークエストは完了済みです" }, { status: 400 });
    }
  }

  // 1. 逆ジオコーディングで地名取得
  const geo = await reverseGeocode(lat, lng);

  // 2. シナコ固定
  const godName = "シナコ";

  // 3. 絆レベル取得 + Claude APIでクエスト生成
  const { data: bondData } = await supabase
    .from("god_bonds")
    .select("bond_exp")
    .eq("user_id", user.id)
    .eq("god_name", godName)
    .single();

  const bondInfo = bondData
    ? (() => {
        const bl = getBondLevel(bondData.bond_exp);
        return { level: bl.level, levelName: bl.name, toneModifier: getBondToneModifier(bl.level) };
      })()
    : undefined;

  let userPrompt = buildShinakoUserPrompt(lat, lng, geo.area_name, bondInfo);

  if (isTutorial) {
    userPrompt += `\n\n【重要】これは冒険者の初めてのクエストです。移動は不要で、今いる場所で達成できるミッションにしてください。例: 周りを見回して面白いものを見つける、空を見上げる、深呼吸する。ゴール地点は現在地と同じにし、goal_radius_meters は 9999 にしてください。`;
  }

  const questResponse = await generateWithClaude(SHINAKO_SYSTEM_PROMPT, userPrompt);
  const quest = extractJSON<QuestGeneration>(questResponse);

  // 4. quests テーブルに INSERT
  const { data: questRow, error: questError } = await supabase
    .from("quests")
    .insert({
      user_id: user.id,
      god_type: "wanderer",
      god_name: godName,
      local_god_id: null,
      mission_text: quest.mission_text,
      mission_type: quest.mission_type,
      start_lat: lat,
      start_lng: lng,
      start_area_name: geo.area_name,
      goal_lat: isTutorial ? lat : quest.goal_lat,
      goal_lng: isTutorial ? lng : quest.goal_lng,
      goal_radius_meters: isTutorial ? 9999 : (quest.goal_radius_meters || 50),
    })
    .select("id, expires_at")
    .single();

  if (questError || !questRow) {
    return NextResponse.json({ error: "Failed to create quest", detail: questError?.message }, { status: 500 });
  }

  // 4.5 デイリークエストの場合、daily_questsに記録
  if (is_daily) {
    const today = getTodayDateString();
    await supabase.from("daily_quests").upsert({
      user_id: user.id, quest_date: today, quest_id: questRow.id, completed: false,
    }, { onConflict: "user_id,quest_date" });
  }

  return NextResponse.json({
    quest_id: questRow.id,
    god_name: godName,
    god_type: "wanderer",
    god_image_url: "/shinako-face.webp",
    mission_text: quest.mission_text,
    mission_type: quest.mission_type,
    goal_lat: isTutorial ? lat : quest.goal_lat,
    goal_lng: isTutorial ? lng : quest.goal_lng,
    goal_radius_meters: isTutorial ? 9999 : (quest.goal_radius_meters || 50),
    is_tutorial: isTutorial,
    expires_at: questRow.expires_at,
  });
}
