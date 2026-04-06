import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";

type RoutePosition = { lat: number; lng: number; timestamp: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { quest_id, positions } = body as {
    quest_id: string;
    positions: RoutePosition[];
  };

  if (!isValidUUID(quest_id)) {
    return NextResponse.json({ error: "Invalid quest_id" }, { status: 400 });
  }

  if (!Array.isArray(positions) || positions.length === 0) {
    return NextResponse.json({ error: "positions must be a non-empty array" }, { status: 400 });
  }

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

  const currentLog = Array.isArray(quest.route_log) ? quest.route_log as RoutePosition[] : [];
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
