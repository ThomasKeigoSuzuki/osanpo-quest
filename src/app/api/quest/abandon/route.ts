import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { quest_id } = body as { quest_id: string };

  if (!isValidUUID(quest_id)) {
    return NextResponse.json({ error: "Invalid quest_id" }, { status: 400 });
  }

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
