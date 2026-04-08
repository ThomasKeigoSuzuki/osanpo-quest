export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { BondsWrapper } from "./bonds-wrapper";
import type { Database } from "@/types/database";

type Bond = Database["public"]["Tables"]["god_bonds"]["Row"];
type RecentQuest = { id: string; mission_text: string; start_area_name: string; completed_at: string | null };

export default async function BondsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <BondsWrapper bond={null} recentQuests={[]} />;

  const [bondRes, questsRes] = await Promise.all([
    supabase.from("god_bonds").select("*").eq("user_id", user.id).eq("god_name", "シナコ").single(),
    supabase.from("quests").select("id, mission_text, start_area_name, completed_at").eq("user_id", user.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(5),
  ]);

  return <BondsWrapper bond={(bondRes.data as Bond) ?? null} recentQuests={(questsRes.data as RecentQuest[]) ?? []} />;
}
