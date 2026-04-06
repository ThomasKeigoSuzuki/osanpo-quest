export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { BondsWrapper } from "./bonds-wrapper";
import type { Database } from "@/types/database";

type Bond = Database["public"]["Tables"]["god_bonds"]["Row"];

export default async function BondsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <BondsWrapper bonds={[]} />;

  const { data: bonds } = await supabase
    .from("god_bonds")
    .select("*")
    .eq("user_id", user.id)
    .order("bond_exp", { ascending: false })
    .returns<Bond[]>();

  return <BondsWrapper bonds={bonds || []} />;
}
