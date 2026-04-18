import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase ベースのレート制限。api_usage テーブルを使い、
 * 1時間/1日あたりの呼び出し回数を制限する。
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  limits: { perHour: number; perDay: number }
): Promise<{ allowed: boolean }> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  todayStart.setHours(0, 0, 0, 0);
  const todayStartISO = todayStart.toISOString();

  const [hourRes, dayRes] = await Promise.all([
    supabase
      .from("api_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action)
      .gte("created_at", oneHourAgo),
    supabase
      .from("api_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action)
      .gte("created_at", todayStartISO),
  ]);

  const hourCount = hourRes.count ?? 0;
  const dayCount = dayRes.count ?? 0;

  if (hourCount >= limits.perHour || dayCount >= limits.perDay) {
    return { allowed: false };
  }

  await supabase.from("api_usage").insert({
    user_id: userId,
    action,
  });

  return { allowed: true };
}
