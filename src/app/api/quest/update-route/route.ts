import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { quest_id, positions } = (await request.json()) as {
    quest_id: string;
    positions: { lat: number; lng: number; timestamp: string }[];
  };

  // 既存のroute_logを取得
  const { data: quest } = await supabase
    .from("quests")
    .select("route_log")
    .eq("id", quest_id)
    .eq("user_id", user.id)
    .single();

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  const currentLog = (quest.route_log as unknown[]) || [];
  const updatedLog = [...currentLog, ...positions];

  const { error } = await supabase
    .from("quests")
    .update({ route_log: updatedLog })
    .eq("id", quest_id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update route" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
