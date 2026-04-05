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

  const { quest_id } = (await request.json()) as { quest_id: string };

  const { error } = await supabase
    .from("quests")
    .update({ status: "abandoned" })
    .eq("id", quest_id)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    return NextResponse.json(
      { error: "Failed to abandon quest" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
