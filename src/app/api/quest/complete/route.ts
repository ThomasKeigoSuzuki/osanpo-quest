import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isQuestComplete } from "@/lib/geo";
import { generateSimple, extractJSON } from "@/lib/claude";
import {
  buildItemGenerationPrompt,
  buildCompletionMessagePrompt,
} from "@/lib/prompts";
import { generateItemImage } from "@/lib/image-generation";
import { isValidLatLng, isValidUUID } from "@/lib/validation";

type ItemGeneration = {
  name: string;
  description: string;
  category: string;
  sub_category?: string;
  rarity: number;
  image_prompt_hint?: string;
};

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { quest_id, lat, lng } = body as {
    quest_id: string;
    lat: number;
    lng: number;
  };

  if (!isValidUUID(quest_id)) {
    return NextResponse.json({ error: "Invalid quest_id" }, { status: 400 });
  }
  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const { data: quest } = await supabase
    .from("quests")
    .select("*")
    .eq("id", quest_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!quest) {
    return NextResponse.json(
      { error: "Active quest not found" },
      { status: 404 }
    );
  }

  const complete = isQuestComplete(
    lat,
    lng,
    quest.goal_lat,
    quest.goal_lng,
    quest.goal_radius_meters
  );

  if (!complete) {
    return NextResponse.json({
      success: false,
      error: "Not within goal radius",
    });
  }

  const itemPrompt = buildItemGenerationPrompt(
    quest.god_name,
    quest.god_type,
    quest.mission_text,
    quest.mission_type,
    quest.start_area_name
  );
  const itemResponse = await generateSimple(itemPrompt);
  const itemData = extractJSON<ItemGeneration>(itemResponse);

  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      quest_id: quest_id,
      name: itemData.name,
      description: itemData.description,
      category: itemData.category,
      sub_category: itemData.sub_category || null,
      area_name: quest.god_type === "local" ? quest.start_area_name : null,
      god_name: quest.god_name,
      rarity: Math.min(5, Math.max(1, itemData.rarity)),
    })
    .select()
    .single();

  if (itemError || !item) {
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }

  let imageUrl = item.image_url;
  if (itemData.image_prompt_hint) {
    const generatedUrl = await generateItemImage(
      itemData.image_prompt_hint,
      item.id
    );
    if (generatedUrl) {
      imageUrl = generatedUrl;
      await supabase
        .from("items")
        .update({ image_url: generatedUrl })
        .eq("id", item.id);
    }
  }

  await supabase
    .from("quests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", quest_id);

  const { data: profile } = await supabase
    .from("users")
    .select("total_quests_completed")
    .eq("id", user.id)
    .single();

  if (profile) {
    await supabase
      .from("users")
      .update({
        total_quests_completed: profile.total_quests_completed + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  const messagePrompt = buildCompletionMessagePrompt(
    quest.god_name,
    quest.god_type,
    quest.mission_text,
    itemData.name
  );
  const godMessage = await generateSimple(messagePrompt);

  return NextResponse.json({
    success: true,
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      image_url: imageUrl,
      rarity: item.rarity,
    },
    god_message: godMessage.replace(/^["']|["']$/g, "").trim(),
  });
}
