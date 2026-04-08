import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GOD_NAME = "シナコ";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: items } = await supabase
    .from("items")
    .select("id, name, image_url, rarity, category")
    .eq("user_id", user.id)
    .eq("god_name", GOD_NAME)
    .order("obtained_at", { ascending: false });

  if (!items || items.length === 0) return NextResponse.json({ items: [] });

  const { data: offered } = await supabase
    .from("offerings")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("god_name", GOD_NAME);

  const offeredIds = new Set((offered || []).map((o) => o.item_id));
  return NextResponse.json({ items: items.filter((i) => !offeredIds.has(i.id)) });
}
