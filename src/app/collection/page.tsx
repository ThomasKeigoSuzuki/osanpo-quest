export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { CollectionView } from "./collection-view";

type Item = Database["public"]["Tables"]["items"]["Row"];

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user!.id)
    .order("obtained_at", { ascending: false })
    .returns<Item[]>();

  return <CollectionView items={items || []} />;
}
