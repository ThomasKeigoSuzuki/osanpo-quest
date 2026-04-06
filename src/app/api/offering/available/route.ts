import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const godName = searchParams.get("god_name");
  if (!godName) return NextResponse.json({ error: "god_name required" }, { status: 400 });

  // items テーブルには god_name カラムがある
  const { data: items } = await supabase
    .from("items")
    .select("id, name, image_url, rarity, category")
    .eq("user_id", user.id)
    .eq("god_name", godName)
    .order("obtained_at", { ascending: false });

  if (!items || items.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // 既に奉納済みのitem_idを除外
  const { data: offered } = await supabase
    .from("offerings")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("god_name", godName);

  const offeredIds = new Set((offered || []).map((o) => o.item_id));
  const available = items.filter((i) => !offeredIds.has(i.id));

  return NextResponse.json({ items: available });
}
