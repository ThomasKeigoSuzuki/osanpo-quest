import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isQuestComplete } from "@/lib/geo";
import { generateSimple, extractJSON } from "@/lib/claude";
import {
  buildItemGenerationPrompt,
  buildCompletionMessagePrompt,
} from "@/lib/prompts";
import { generateItemImage } from "@/lib/image-generation";
import { isValidLatLng, isValidUUID } from "@/lib/validation";
import { getStreakBonus } from "@/lib/daily-quest";
import { getBondLevel } from "@/lib/bond-system";
import { getRank, getPointsForAction } from "@/lib/rank-system";
import { getShinakoRevealStage, getShinakoRevealMessage } from "@/lib/shinako-reveal";

type ItemGeneration = {
  name: string;
  description: string;
  category: string;
  sub_category?: string;
  rarity: number;
  image_prompt_hint?: string;
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
  const { quest_id, lat, lng } = body as {
    quest_id: string;
    lat: number;
    lng: number;
  };

  if (!isValidUUID(quest_id)) {
    return NextResponse.json({ error: "Invalid quest_id" }, { status: 400 });
  }
  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const { data: quest } = await supabase
    .from("quests")
    .select("*")
    .eq("id", quest_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!quest) {
    return NextResponse.json(
      { error: "Active quest not found" },
      { status: 404 }
    );
  }

  const complete = isQuestComplete(
    lat,
    lng,
    quest.goal_lat,
    quest.goal_lng,
    quest.goal_radius_meters
  );

  if (!complete) {
    return NextResponse.json({
      success: false,
      error: "Not within goal radius",
    });
  }

  const itemPrompt = buildItemGenerationPrompt(
    quest.god_name,
    quest.god_type,
    quest.mission_text,
    quest.mission_type,
    quest.start_area_name
  );
  const itemResponse = await generateSimple(itemPrompt);
  const itemData = extractJSON<ItemGeneration>(itemResponse);

  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      quest_id: quest_id,
      name: itemData.name,
      description: itemData.description,
      category: itemData.category,
      sub_category: itemData.sub_category || null,
      area_name: quest.god_type === "local" ? quest.start_area_name : null,
      god_name: quest.god_name,
      rarity: Math.min(5, Math.max(1, itemData.rarity)), // ストリークボーナスは後で加算
    })
    .select()
    .single();

  if (itemError || !item) {
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }

  // デイリークエストの場合: 完了+ストリークボーナス
  const { data: dailyRecord } = await supabase
    .from("daily_quests")
    .select("id")
    .eq("quest_id", quest_id)
    .eq("user_id", user.id)
    .single();

  if (dailyRecord) {
    await supabase
      .from("daily_quests")
      .update({ completed: true })
      .eq("id", dailyRecord.id);

    // ストリークボーナスでレアリティを上げる
    const { data: userStreak } = await supabase
      .from("users")
      .select("login_streak")
      .eq("id", user.id)
      .single();

    if (userStreak) {
      const bonus = getStreakBonus(userStreak.login_streak);
      if (bonus.rarityBonus > 0) {
        const newRarity = Math.min(5, item.rarity + bonus.rarityBonus);
        if (newRarity > item.rarity) {
          await supabase.from("items").update({ rarity: newRarity } as Record<string, unknown>).eq("id", item.id);
          item.rarity = newRarity;
        }
      }
    }
  }

  let imageUrl = item.image_url;
  if (itemData.image_prompt_hint) {
    const generatedUrl = await generateItemImage(
      itemData.image_prompt_hint,
      item.id
    );
    if (generatedUrl) {
      imageUrl = generatedUrl;
      await supabase
        .from("items")
        .update({ image_url: generatedUrl })
        .eq("id", item.id);
    }
  }

  await supabase
    .from("quests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", quest_id);

  const { data: profile } = await supabase
    .from("users")
    .select("total_quests_completed, shinako_reveal_stage, shinako_revealed")
    .eq("id", user.id)
    .single();

  let shinakoReveal: { new_stage: number; message: string } | null = null;

  if (profile) {
    const newTotal = profile.total_quests_completed + 1;
    const newRevealStage = getShinakoRevealStage(newTotal);
    const oldRevealStage = profile.shinako_reveal_stage ?? 1;

    await supabase
      .from("users")
      .update({
        total_quests_completed: newTotal,
        shinako_reveal_stage: newRevealStage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (newRevealStage > oldRevealStage) {
      shinakoReveal = {
        new_stage: newRevealStage,
        message: getShinakoRevealMessage(newRevealStage),
      };
    }
  }

  // 絆経験値の加算
  const { data: existingBond } = await supabase
    .from("god_bonds")
    .select("bond_exp, total_quests, bond_level")
    .eq("user_id", user.id)
    .eq("god_name", quest.god_name)
    .single();

  let bondLeveledUp = false;
  let bondNewLevel = 1;
  let bondLevelName = "出会い";

  if (existingBond) {
    const newExp = existingBond.bond_exp + 1;
    const newTotal = existingBond.total_quests + 1;
    const bl = getBondLevel(newExp);
    bondNewLevel = bl.level;
    bondLevelName = bl.name;
    bondLeveledUp = bl.level > existingBond.bond_level;

    await supabase
      .from("god_bonds")
      .update({
        bond_exp: newExp,
        total_quests: newTotal,
        bond_level: bl.level,
        last_quest_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("god_name", quest.god_name);
  } else {
    // 初遭遇
    await supabase.from("god_bonds").insert({
      user_id: user.id,
      god_name: quest.god_name,
      god_type: quest.god_type,
      bond_exp: 1,
      total_quests: 1,
      last_quest_at: new Date().toISOString(),
      god_image_url: quest.god_type === "wanderer" ? "/shinako.png" : null,
    });
    const bl = getBondLevel(1);
    bondNewLevel = bl.level;
    bondLevelName = bl.name;
  }

  // ランクポイント加算
  let pointsGained = getPointsForAction("quest_clear");
  if (dailyRecord) pointsGained += getPointsForAction("daily_clear") - getPointsForAction("quest_clear"); // dailyは3pt（差分で+1）
  if (!existingBond) pointsGained += getPointsForAction("new_god");
  if (bondLeveledUp) pointsGained += getPointsForAction("bond_level_up");

  const { data: rankProfile } = await supabase
    .from("users")
    .select("rank_points, adventurer_rank")
    .eq("id", user.id)
    .single();

  const oldRank = rankProfile?.adventurer_rank ?? 1;
  const newTotalPoints = (rankProfile?.rank_points ?? 0) + pointsGained;
  const newRankInfo = getRank(newTotalPoints);
  const rankedUp = newRankInfo.rank > oldRank;

  await supabase
    .from("users")
    .update({ rank_points: newTotalPoints, adventurer_rank: newRankInfo.rank })
    .eq("id", user.id);

  const messagePrompt = buildCompletionMessagePrompt(
    quest.god_name,
    quest.god_type,
    quest.mission_text,
    itemData.name
  );
  const godMessage = await generateSimple(messagePrompt);

  return NextResponse.json({
    success: true,
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      image_url: imageUrl,
      rarity: item.rarity,
    },
    god_message: godMessage.replace(/^["']|["']$/g, "").trim(),
    bond_info: {
      god_name: quest.god_name,
      new_level: bondNewLevel,
      level_name: bondLevelName,
      leveled_up: bondLeveledUp,
    },
    rank_info: {
      points_gained: pointsGained,
      total_points: newTotalPoints,
      rank: newRankInfo.rank,
      rank_name: newRankInfo.name,
      rank_icon: newRankInfo.icon,
      ranked_up: rankedUp,
    },
    shinako_reveal: shinakoReveal,
    tutorial_offering: profile && !profile.shinako_revealed,
  });
}
