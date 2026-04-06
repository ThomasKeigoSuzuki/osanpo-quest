import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";
import { getGodRevealStage } from "@/lib/god-reveal";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item_id, god_name } = await request.json() as { item_id: string; god_name: string };
  if (!isValidUUID(item_id) || !god_name) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  // アイテム確認
  const { data: item } = await supabase.from("items").select("id, god_name").eq("id", item_id).eq("user_id", user.id).single();
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.god_name !== god_name) return NextResponse.json({ error: "Item does not belong to this god" }, { status: 400 });

  // 奉納済みチェック
  const { data: existing } = await supabase.from("offerings").select("id").eq("item_id", item_id).single();
  if (existing) return NextResponse.json({ error: "Already offered" }, { status: 400 });

  // 奉納実行
  const { error: insertErr } = await supabase.from("offerings").insert({ user_id: user.id, god_name, item_id });
  if (insertErr) return NextResponse.json({ error: "Failed to offer" }, { status: 500 });

  // god_bonds 更新
  const { data: bond } = await supabase.from("god_bonds").select("offerings_count, reveal_stage").eq("user_id", user.id).eq("god_name", god_name).single();

  const newCount = (bond?.offerings_count ?? 0) + 1;
  const newStage = getGodRevealStage(newCount);
  const oldStage = bond?.reveal_stage ?? 1;
  const stageChanged = newStage > oldStage;

  await supabase.from("god_bonds").update({ offerings_count: newCount, reveal_stage: newStage }).eq("user_id", user.id).eq("god_name", god_name);

  return NextResponse.json({ success: true, new_stage: newStage, offerings_count: newCount, stage_changed: stageChanged });
}
