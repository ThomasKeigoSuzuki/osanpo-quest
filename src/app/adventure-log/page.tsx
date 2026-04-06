export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AdventureLogWrapper } from "./adventure-log-wrapper";

type AdventureLog = {
  quest_id: string;
  user_id: string;
  god_type: string;
  god_name: string;
  mission_text: string;
  mission_type: string;
  start_area_name: string;
  start_lat: number;
  start_lng: number;
  goal_lat: number;
  goal_lng: number;
  route_log: { lat: number; lng: number; timestamp: string }[];
  started_at: string;
  completed_at: string | null;
  item_name: string | null;
  item_description: string | null;
  item_image_url: string | null;
  item_rarity: number | null;
};

export default async function AdventureLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AdventureLogWrapper logs={[]} />;

  const { data: logs } = await supabase
    .from("adventure_logs")
    .select("*")
    .eq("user_id", user.id)
    .returns<AdventureLog[]>();

  return <AdventureLogWrapper logs={logs || []} />;
}
