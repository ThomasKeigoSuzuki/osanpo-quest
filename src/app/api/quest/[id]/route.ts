import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: quest, error } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  // ご当地神の画像URLを取得
  let god_image_url: string | null = null;
  if (quest.god_type === "local" && quest.local_god_id) {
    const serviceClient = await createServiceClient();
    const { data: god } = await serviceClient
      .from("local_gods")
      .select("image_url")
      .eq("id", quest.local_god_id)
      .single();
    god_image_url = god?.image_url || null;
  }

  return NextResponse.json({ ...quest, god_image_url });
}
