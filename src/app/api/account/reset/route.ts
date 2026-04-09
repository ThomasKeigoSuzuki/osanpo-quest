import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = user.id;

  // 全データ削除（順序: FK依存を考慮）
  await supabase.from("offerings").delete().eq("user_id", uid);
  await supabase.from("daily_quests").delete().eq("user_id", uid);
  await supabase.from("items").delete().eq("user_id", uid);
  await supabase.from("quests").delete().eq("user_id", uid);
  await supabase.from("god_bonds").delete().eq("user_id", uid);

  // usersテーブルをリセット（行は残す）
  await supabase.from("users").update({
    total_quests_completed: 0,
    login_streak: 0,
    longest_streak: 0,
    rank_points: 0,
    adventurer_rank: 1,
    shinako_reveal_stage: 1,
    shinako_revealed: false,
    last_home_visit_at: new Date(0).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", uid);

  return NextResponse.json({ success: true });
}
