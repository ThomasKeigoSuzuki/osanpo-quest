import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { reverseGeocode } from "@/lib/geo";
import { generateWithClaude, generateSimple, extractJSON } from "@/lib/claude";
import {
  SHINAKO_SYSTEM_PROMPT,
  buildShinakoUserPrompt,
  buildLocalGodGenerationPrompt,
  buildLocalGodQuestSystemPrompt,
} from "@/lib/prompts";
import { generateGodImage } from "@/lib/image-generation";
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

type LocalGodGeneration = {
  god_name: string;
  personality: string;
  speech_style: string;
  first_person: string;
  sample_greeting: string;
  appearance?: string;
};

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { lat, lng, god_preference = "random", is_daily = false } = body as {
    lat: number;
    lng: number;
    god_preference?: "wanderer" | "local" | "random";
    is_daily?: boolean;
  };

  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json(
      { error: "Valid lat and lng are required" },
      { status: 400 }
    );
  }

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
      return NextResponse.json(
        { error: "今日のデイリークエストは完了済みです" },
        { status: 400 }
      );
    }
  }

  // 1. 逆ジオコーディングで地名取得
  const geo = await reverseGeocode(lat, lng);

  // 2. 神様を決定
  const useLocal =
    god_preference === "local" ||
    (god_preference === "random" && Math.random() >= 0.5);

  let godType: "wanderer" | "local" = "wanderer";
  let godName = "シナコ";
  let localGodId: string | null = null;
  let godImageUrl: string | null = null;

  if (useLocal) {
    // ご当地神を取得または生成
    const serviceClient = await createServiceClient();
    const { data: existingGod } = await serviceClient
      .from("local_gods")
      .select("*")
      .eq("area_code", geo.area_code)
      .single();

    if (existingGod) {
      godType = "local";
      godName = existingGod.god_name;
      localGodId = existingGod.id;
      godImageUrl = existingGod.image_url;
    } else {
      // Claude APIでご当地神を生成
      const godPrompt = buildLocalGodGenerationPrompt(
        geo.area_name,
        geo.area_keywords
      );
      const godResponse = await generateSimple(godPrompt);
      const godData = extractJSON<LocalGodGeneration>(godResponse);

      const { data: newGod, error: insertError } = await serviceClient
        .from("local_gods")
        .insert({
          area_code: geo.area_code,
          area_name: geo.area_name,
          god_name: godData.god_name,
          personality: godData.personality,
          speech_style: godData.speech_style,
          first_person: godData.first_person,
          sample_greeting: godData.sample_greeting,
        })
        .select()
        .single();

      if (insertError || !newGod) {
        // 競合時は既存データを取得
        const { data: fallback } = await serviceClient
          .from("local_gods")
          .select("*")
          .eq("area_code", geo.area_code)
          .single();
        if (fallback) {
          godType = "local";
          godName = fallback.god_name;
          localGodId = fallback.id;
          godImageUrl = fallback.image_url;
        }
      } else {
        godType = "local";
        godName = newGod.god_name;
        localGodId = newGod.id;

        // ご当地神のイラストを生成（レスポンス前に完了させる）
        if (godData.appearance) {
          try {
            console.log(`[GodImage] Generating image for ${newGod.god_name} (${newGod.id})...`);
            const url = await generateGodImage(godData.appearance, newGod.id);
            if (url) {
              godImageUrl = url;
              const { error: updateErr } = await serviceClient
                .from("local_gods")
                .update({ image_url: url })
                .eq("id", newGod.id);
              if (updateErr) {
                console.error(`[GodImage] Failed to save URL to DB:`, updateErr);
              } else {
                console.log(`[GodImage] Saved: ${url}`);
              }
            } else {
              console.warn(`[GodImage] generateGodImage returned null for ${newGod.id}`);
            }
          } catch (err) {
            console.error(`[GodImage] Error generating image for ${newGod.id}:`, err);
          }
        } else {
          console.warn(`[GodImage] No appearance field in Claude response for ${newGod.god_name}`);
        }
      }
    }
  }

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

  let questResponse: string;
  const userPrompt = buildShinakoUserPrompt(lat, lng, geo.area_name, bondInfo);

  if (godType === "local" && localGodId) {
    const serviceClient = await createServiceClient();
    const { data: god } = await serviceClient
      .from("local_gods")
      .select("*")
      .eq("id", localGodId)
      .single();

    if (god) {
      const systemPrompt = buildLocalGodQuestSystemPrompt(
        god.god_name,
        god.area_name,
        god.personality,
        god.speech_style,
        god.first_person
      );
      questResponse = await generateWithClaude(systemPrompt, userPrompt);
    } else {
      questResponse = await generateWithClaude(
        SHINAKO_SYSTEM_PROMPT,
        userPrompt
      );
    }
  } else {
    questResponse = await generateWithClaude(
      SHINAKO_SYSTEM_PROMPT,
      userPrompt
    );
  }

  const quest = extractJSON<QuestGeneration>(questResponse);

  // 4. quests テーブルに INSERT
  const { data: questRow, error: questError } = await supabase
    .from("quests")
    .insert({
      user_id: user.id,
      god_type: godType,
      god_name: godName,
      local_god_id: localGodId,
      mission_text: quest.mission_text,
      mission_type: quest.mission_type,
      start_lat: lat,
      start_lng: lng,
      start_area_name: geo.area_name,
      goal_lat: quest.goal_lat,
      goal_lng: quest.goal_lng,
      goal_radius_meters: quest.goal_radius_meters || 50,
    })
    .select("id, expires_at")
    .single();

  if (questError || !questRow) {
    return NextResponse.json(
      { error: "Failed to create quest", detail: questError?.message },
      { status: 500 }
    );
  }

  // 4.5 デイリークエストの場合、daily_questsに記録
  if (is_daily) {
    const today = getTodayDateString();
    await supabase.from("daily_quests").upsert({
      user_id: user.id,
      quest_date: today,
      quest_id: questRow.id,
      completed: false,
    }, { onConflict: "user_id,quest_date" });
  }

  // 5. レスポンス返却
  return NextResponse.json({
    quest_id: questRow.id,
    god_name: godName,
    god_type: godType,
    god_image_url: godImageUrl,
    mission_text: quest.mission_text,
    mission_type: quest.mission_type,
    goal_lat: quest.goal_lat,
    goal_lng: quest.goal_lng,
    goal_radius_meters: quest.goal_radius_meters || 50,
    expires_at: questRow.expires_at,
  });
}
