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

const VALID_CATEGORIES = ["nature", "food", "craft", "mystery", "memory", "divine", "material", "local", "crafted", "treasure"];

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { quest_id, lat, lng } = await request.json() as { quest_id: string; lat: number; lng: number };
    if (!isValidUUID(quest_id)) return NextResponse.json({ error: "Invalid quest_id" }, { status: 400 });
    if (!isValidLatLng(lat, lng)) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });

    const { data: quest } = await supabase.from("quests").select("*").eq("id", quest_id).eq("user_id", user.id).eq("status", "active").single();
    if (!quest) return NextResponse.json({ error: "Active quest not found" }, { status: 404 });

    if (!isQuestComplete(lat, lng, quest.goal_lat, quest.goal_lng, quest.goal_radius_meters)) {
      return NextResponse.json({ success: false, error: "Not within goal radius" });
    }

    // --- Phase 1: アイテム生成（Claude API） ---
    const itemPrompt = buildItemGenerationPrompt(quest.god_name, quest.god_type, quest.mission_text, quest.mission_type, quest.start_area_name);
    const itemResponse = await generateSimple(itemPrompt);
    const itemData = extractJSON<ItemGeneration>(itemResponse);
    const safeCategory = VALID_CATEGORIES.includes(itemData.category) ? itemData.category : "mystery";

    const { data: item, error: itemError } = await supabase.from("items").insert({
      user_id: user.id, quest_id, name: itemData.name, description: itemData.description,
      category: safeCategory, sub_category: itemData.sub_category || null,
      area_name: quest.god_type === "local" ? quest.start_area_name : null,
      god_name: quest.god_name, rarity: Math.min(5, Math.max(1, itemData.rarity)),
    }).select().single();

    if (itemError || !item) {
      return NextResponse.json({ error: `Failed to create item: ${itemError?.message || "unknown"}` }, { status: 500 });
    }

    // --- Phase 2: 並列処理（画像生成 + メッセージ生成 + DB取得） ---
    const messagePrompt = buildCompletionMessagePrompt(quest.god_name, quest.god_type, quest.mission_text, itemData.name);

    const [imageUrl, godMessage, dailyRes, profileRes, bondRes] = await Promise.all([
      // 画像生成（失敗してもnull）
      itemData.image_prompt_hint
        ? generateItemImage(itemData.image_prompt_hint, item.id).then(async (url) => {
            if (url) await supabase.from("items").update({ image_url: url }).eq("id", item.id);
            return { url, error: null };
          }).catch((e) => ({ url: null, error: String(e) }))
        : Promise.resolve({ url: null, error: "no_hint" }),
      // 完了メッセージ
      generateSimple(messagePrompt),
      // デイリークエスト確認
      supabase.from("daily_quests").select("id").eq("quest_id", quest_id).eq("user_id", user.id).single(),
      // ユーザープロフィール（1回で全フィールド取得）
      supabase.from("users").select("total_quests_completed, shinako_reveal_stage, shinako_revealed, rank_points, adventurer_rank, login_streak").eq("id", user.id).single(),
      // 絆情報
      supabase.from("god_bonds").select("bond_exp, total_quests, bond_level").eq("user_id", user.id).eq("god_name", quest.god_name).single(),
    ]);

    // --- Phase 3: デイリーボーナス処理 ---
    const dailyRecord = dailyRes.data;
    if (dailyRecord) {
      await supabase.from("daily_quests").update({ completed: true }).eq("id", dailyRecord.id);
      if (profileRes.data) {
        const bonus = getStreakBonus(profileRes.data.login_streak);
        if (bonus.rarityBonus > 0) {
          const newRarity = Math.min(5, item.rarity + bonus.rarityBonus);
          if (newRarity > item.rarity) {
            await supabase.from("items").update({ rarity: newRarity } as Record<string, unknown>).eq("id", item.id);
            item.rarity = newRarity;
          }
        }
      }
    }

    // --- Phase 4: プロフィール・絆・ランク更新（並列） ---
    const profile = profileRes.data;
    let shinakoReveal: { new_stage: number; message: string } | null = null;
    let bondLeveledUp = false;
    let bondNewLevel = 1;
    let bondLevelName = "出会い";

    // 絆処理
    const existingBond = bondRes.data;
    if (existingBond) {
      const newExp = existingBond.bond_exp + 1;
      const bl = getBondLevel(newExp);
      bondNewLevel = bl.level;
      bondLevelName = bl.name;
      bondLeveledUp = bl.level > existingBond.bond_level;
    } else {
      const bl = getBondLevel(1);
      bondNewLevel = bl.level;
      bondLevelName = bl.name;
    }

    // ランク計算
    let pointsGained = getPointsForAction("quest_clear");
    if (dailyRecord) pointsGained += getPointsForAction("daily_clear") - getPointsForAction("quest_clear");
    if (!existingBond) pointsGained += getPointsForAction("new_god");
    if (bondLeveledUp) pointsGained += getPointsForAction("bond_level_up");

    const oldRank = profile?.adventurer_rank ?? 1;
    const newTotalPoints = (profile?.rank_points ?? 0) + pointsGained;
    const newRankInfo = getRank(newTotalPoints);
    const rankedUp = newRankInfo.rank > oldRank;

    // シナコ御簾計算
    const newTotal = (profile?.total_quests_completed ?? 0) + 1;
    const newRevealStage = getShinakoRevealStage(newTotal);
    const oldRevealStage = profile?.shinako_reveal_stage ?? 1;
    if (newRevealStage > oldRevealStage) {
      shinakoReveal = { new_stage: newRevealStage, message: getShinakoRevealMessage(newRevealStage) };
    }

    // DB更新を並列実行
    await Promise.all([
      // クエスト完了
      supabase.from("quests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", quest_id),
      // ユーザー更新（1回に統合）
      supabase.from("users").update({
        total_quests_completed: newTotal,
        shinako_reveal_stage: newRevealStage,
        rank_points: newTotalPoints,
        adventurer_rank: newRankInfo.rank,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id),
      // 絆更新
      existingBond
        ? supabase.from("god_bonds").update({
            bond_exp: existingBond.bond_exp + 1, total_quests: existingBond.total_quests + 1,
            bond_level: bondNewLevel, last_quest_at: new Date().toISOString(),
          }).eq("user_id", user.id).eq("god_name", quest.god_name)
        : supabase.from("god_bonds").insert({
            user_id: user.id, god_name: quest.god_name, god_type: quest.god_type,
            bond_exp: 1, total_quests: 1, last_quest_at: new Date().toISOString(),
            god_image_url: quest.god_type === "wanderer" ? "/shinako-full.webp" : null,
          }),
    ]);

    return NextResponse.json({
      success: true,
      item: { id: item.id, name: item.name, description: item.description, category: item.category, image_url: (imageUrl as { url: string | null }).url ?? item.image_url, rarity: item.rarity },
      _img_debug: (imageUrl as { error: string | null }).error,
      god_message: godMessage.replace(/^["']|["']$/g, "").trim(),
      bond_info: { god_name: quest.god_name, new_level: bondNewLevel, level_name: bondLevelName, leveled_up: bondLeveledUp },
      rank_info: { points_gained: pointsGained, total_points: newTotalPoints, rank: newRankInfo.rank, rank_name: newRankInfo.name, rank_icon: newRankInfo.icon, ranked_up: rankedUp },
      shinako_reveal: shinakoReveal,
      tutorial_offering: profile && !profile.shinako_revealed,
    });
  } catch (err) {
    console.error("[quest/complete]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
