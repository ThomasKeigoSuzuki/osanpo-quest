import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { reverseGeocode } from "@/lib/geo";
import { generateWithClaude, extractJSON } from "@/lib/claude";
import {
  SHINAKO_SYSTEM_PROMPT,
  buildShinakoUserPrompt,
} from "@/lib/prompts";
import { isValidLatLng } from "@/lib/validation";
import { getTodayDateString } from "@/lib/daily-quest";
import { getBondLevel, getBondToneModifier } from "@/lib/bond-system";
import { checkRateLimit } from "@/lib/rate-limit";

const QuestGenerationSchema = z.object({
  mission_text: z.string().min(1),
  mission_type: z.enum(["direction", "discovery", "experience"]),
  goal_lat: z.number().min(-90).max(90),
  goal_lng: z.number().min(-180).max(180),
  goal_radius_meters: z.number().int().min(10).max(9999),
  difficulty: z.number().int().min(1).max(5),
});

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { lat, lng, is_daily = false, distance_preference } = body as {
      lat: number;
      lng: number;
      is_daily?: boolean;
      distance_preference?: "short" | "medium" | "long";
    };

    if (!isValidLatLng(lat, lng)) {
      return NextResponse.json({ error: "Valid lat and lng are required" }, { status: 400 });
    }

    // レート制限: 1時間10回、1日30回
    const rateLimitResult = await checkRateLimit(supabase, user.id, "quest_start", { perHour: 10, perDay: 30 });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "クエスト生成の上限に達しました。しばらくお待ちください。" },
        { status: 429 }
      );
    }

    // 既存のアクティブクエストがあれば新規生成を拒否
    const { count: activeCount } = await supabase
      .from("quests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());

    if (activeCount && activeCount > 0) {
      const { data: activeQuest } = await supabase
        .from("quests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .single();
      return NextResponse.json(
        { error: "進行中のクエストがあります", active_quest_id: activeQuest?.id },
        { status: 409 }
      );
    }

    // 期限切れクエストを lazy cleanup
    await supabase
      .from("quests")
      .update({ status: "expired" })
      .eq("user_id", user.id)
      .eq("status", "active")
      .lt("expires_at", new Date().toISOString());

    // 初回クエストかチェック
    const { data: userStats } = await supabase
      .from("users")
      .select("total_quests_completed, display_name")
      .eq("id", user.id)
      .single();
    const isTutorial = (userStats?.total_quests_completed ?? 0) === 0;
    const playerName = userStats?.display_name;

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

    const validDistancePref =
      distance_preference === "short" || distance_preference === "medium" || distance_preference === "long"
        ? distance_preference
        : undefined;

    let userPrompt = buildShinakoUserPrompt(lat, lng, geo.area_name, bondInfo, playerName, validDistancePref);

    if (isTutorial) {
      userPrompt += `\n\n【重要】これは冒険者の初めてのクエストです。移動は不要で、今いる場所で達成できるミッションにしてください。例: 周りを見回して面白いものを見つける、空を見上げる、深呼吸する。ゴール地点は現在地と同じにし、goal_radius_meters は 9999 にしてください。`;
    }

    const questResponse = await generateWithClaude(SHINAKO_SYSTEM_PROMPT, userPrompt);
    const quest = extractJSON(questResponse, QuestGenerationSchema);

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
        goal_radius_meters: isTutorial ? 9999 : quest.goal_radius_meters,
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
      goal_radius_meters: isTutorial ? 9999 : quest.goal_radius_meters,
      is_tutorial: isTutorial,
      expires_at: questRow.expires_at,
    });
  } catch (err) {
    console.error("[quest/start]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
