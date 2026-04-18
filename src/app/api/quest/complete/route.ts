import { NextResponse } from "next/server";
import { z } from "zod";
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
import { checkRateLimit } from "@/lib/rate-limit";

const ItemGenerationSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  category: z.enum(["nature", "food", "craft", "mystery", "memory", "divine", "material", "local", "crafted", "treasure"]),
  sub_category: z.string().optional(),
  rarity: z.number().int().min(1).max(5),
  image_prompt_hint: z.string().optional(),
});

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { quest_id, lat, lng } = await request.json() as { quest_id: string; lat: number; lng: number };
    if (!isValidUUID(quest_id)) return NextResponse.json({ error: "Invalid quest_id" }, { status: 400 });
    if (!isValidLatLng(lat, lng)) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });

    // レート制限: 1時間10回、1日30回
    const rateLimitResult = await checkRateLimit(supabase, user.id, "quest_complete", { perHour: 10, perDay: 30 });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "操作の上限に達しました。しばらくお待ちください。" },
        { status: 429 }
      );
    }

    // 原子的にクエストを completed に更新。status=active AND 未期限切れ でなければ 0行更新。
    const { data: quest, error: lockError } = await supabase
      .from("quests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", quest_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .select("*")
      .single();

    if (lockError || !quest) {
      return NextResponse.json(
        { error: "クエストが見つからないか、期限切れまたは既に完了しています" },
        { status: 409 }
      );
    }

    if (!isQuestComplete(lat, lng, quest.goal_lat, quest.goal_lng, quest.goal_radius_meters)) {
      // ゴール圏外だった場合、ステータスを active に戻す
      await supabase.from("quests").update({ status: "active" } as Record<string, unknown>).eq("id", quest_id);
      return NextResponse.json({ success: false, error: "ゴール範囲内にいません" });
    }

    // --- Phase 1: アイテム生成（Claude API） ---
    const itemPrompt = buildItemGenerationPrompt(quest.god_name, quest.god_type, quest.mission_text, quest.mission_type, quest.start_area_name);
    const itemResponse = await generateSimple(itemPrompt);
    const itemData = extractJSON(itemResponse, ItemGenerationSchema);

    // 序盤10クエストはレアリティ下限を底上げして達成感を確保する
    const { count: prevItemCount } = await supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const earlyFloor = (prevItemCount ?? 0) < 10 ? 2 : 1;
    const finalRarity = Math.min(5, Math.max(earlyFloor, itemData.rarity));

    const { data: item, error: itemError } = await supabase.from("items").insert({
      user_id: user.id, quest_id, name: itemData.name, description: itemData.description,
      category: itemData.category, sub_category: itemData.sub_category || null,
      area_name: quest.god_type === "local" ? quest.start_area_name : null,
      god_name: quest.god_name, rarity: finalRarity,
    }).select().single();

    if (itemError || !item) {
      // アイテム生成失敗 — クエストを active に戻す
      await supabase.from("quests").update({ status: "active" } as Record<string, unknown>).eq("id", quest_id);
      return NextResponse.json({ error: `Failed to create item: ${itemError?.message || "unknown"}` }, { status: 500 });
    }

    // --- Phase 2: 並列処理（画像生成 + メッセージ生成 + DB取得） ---
    const messagePrompt = buildCompletionMessagePrompt(quest.god_name, quest.god_type, quest.mission_text, itemData.name);

    const [imageUrl, godMessage, dailyRes, profileRes, bondRes] = await Promise.all([
      itemData.image_prompt_hint
        ? generateItemImage(itemData.image_prompt_hint, item.id).then(async (url) => {
            if (url) await supabase.from("items").update({ image_url: url }).eq("id", item.id);
            return url;
          }).catch(() => null)
        : Promise.resolve(null),
      generateSimple(messagePrompt),
      supabase.from("daily_quests").select("id").eq("quest_id", quest_id).eq("user_id", user.id).single(),
      supabase.from("users").select("total_quests_completed, shinako_reveal_stage, shinako_revealed, rank_points, adventurer_rank, login_streak").eq("id", user.id).single(),
      supabase.from("god_bonds").select("bond_exp, total_quests, bond_level").eq("user_id", user.id).eq("god_name", "シナコ").single(),
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

    // 絆XPは単なる +1 ではなく、体験の豊かさに応じて差がつくようにする
    //   - base: 1（クエスト達成）
    //   - +1: 新しいエリアで完了した
    //   - +1: デイリークエストを達成
    //   - +1: レア（★3 以上）のアイテムが手に入った
    //   - +1: さらに希少（★5）のとき
    const { data: priorAreaRows } = await supabase
      .from("quests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .eq("start_area_name", quest.start_area_name)
      .neq("id", quest_id)
      .limit(1);
    const isNewArea = !priorAreaRows || priorAreaRows.length === 0;

    let bondExpGain = 1;
    if (isNewArea) bondExpGain += 1;
    if (dailyRes.data) bondExpGain += 1;
    if (item.rarity >= 3) bondExpGain += 1;
    if (item.rarity >= 5) bondExpGain += 1;

    const existingBond = bondRes.data;
    if (existingBond) {
      const newExp = existingBond.bond_exp + bondExpGain;
      const bl = getBondLevel(newExp);
      bondNewLevel = bl.level;
      bondLevelName = bl.name;
      bondLeveledUp = bl.level > existingBond.bond_level;
    } else {
      const bl = getBondLevel(bondExpGain);
      bondNewLevel = bl.level;
      bondLevelName = bl.name;
      bondLeveledUp = bl.level > 1;
    }

    let pointsGained = getPointsForAction("quest_clear");
    if (dailyRecord) pointsGained += getPointsForAction("daily_clear") - getPointsForAction("quest_clear");
    if (!existingBond) pointsGained += getPointsForAction("new_god");
    if (bondLeveledUp) pointsGained += getPointsForAction("bond_level_up");
    if (isNewArea) pointsGained += getPointsForAction("new_area");

    const oldRank = profile?.adventurer_rank ?? 1;
    const newTotalPoints = (profile?.rank_points ?? 0) + pointsGained;
    const newRankInfo = getRank(newTotalPoints);
    const rankedUp = newRankInfo.rank > oldRank;

    const newTotal = (profile?.total_quests_completed ?? 0) + 1;
    const newRevealStage = getShinakoRevealStage(newTotal);
    const oldRevealStage = profile?.shinako_reveal_stage ?? 1;
    if (newRevealStage > oldRevealStage) {
      shinakoReveal = { new_stage: newRevealStage, message: getShinakoRevealMessage(newRevealStage) };
    }

    await Promise.all([
      supabase.from("users").update({
        total_quests_completed: newTotal,
        shinako_reveal_stage: newRevealStage,
        rank_points: newTotalPoints,
        adventurer_rank: newRankInfo.rank,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id),
      existingBond
        ? supabase.from("god_bonds").update({
            bond_exp: existingBond.bond_exp + 1, total_quests: existingBond.total_quests + 1,
            bond_level: bondNewLevel, last_quest_at: new Date().toISOString(),
          }).eq("user_id", user.id).eq("god_name", "シナコ")
        : supabase.from("god_bonds").insert({
            user_id: user.id, god_name: "シナコ", god_type: "wanderer",
            bond_exp: 1, total_quests: 1, last_quest_at: new Date().toISOString(),
            god_image_url: "/shinako-full.webp",
          }),
    ]);

    return NextResponse.json({
      success: true,
      item: { id: item.id, name: item.name, description: item.description, category: item.category, image_url: imageUrl ?? item.image_url, rarity: item.rarity },
      god_message: godMessage.replace(/^["']|["']$/g, "").trim(),
      bond_info: { god_name: "シナコ", new_level: bondNewLevel, level_name: bondLevelName, leveled_up: bondLeveledUp },
      rank_info: { points_gained: pointsGained, total_points: newTotalPoints, rank: newRankInfo.rank, rank_name: newRankInfo.name, rank_icon: newRankInfo.icon, ranked_up: rankedUp },
      shinako_reveal: shinakoReveal,
      tutorial_offering: profile && !profile.shinako_revealed,
    });
  } catch (err) {
    console.error("[quest/complete]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
