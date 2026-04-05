export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type UserProfile = {
  display_name: string;
  total_quests_completed: number;
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, total_quests_completed")
    .eq("id", user!.id)
    .single<UserProfile>();

  return (
    <div className="flex flex-col items-center px-4 pt-12">
      {/* ヘッダー */}
      <p className="text-sm text-[#B0A898]">
        {profile?.display_name ?? "ぼうけんしゃ"}の冒険
      </p>
      <h1 className="mt-1 text-2xl font-bold text-[#6B8E7B]">
        おさんぽクエスト
      </h1>

      {/* シナコのプレースホルダー */}
      <div className="mt-12 flex h-48 w-48 items-center justify-center rounded-full bg-[#E8DFD0]">
        <span className="text-6xl">🌬️</span>
      </div>
      <p className="mt-4 text-center text-sm text-[#8B7E6A]">
        放浪の神様「シナコ」が<br />あなたの冒険を待っています
      </p>

      {/* クエスト開始ボタン */}
      <Link
        href="/quest/start"
        className="mt-10 w-full max-w-xs rounded-2xl bg-[#6B8E7B] px-8 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-[#5A7D6A] active:scale-[0.98]"
      >
        クエストを始める
      </Link>

      {/* 統計 */}
      <div className="mt-8 flex gap-8 text-center">
        <div>
          <p className="text-2xl font-bold text-[#6B8E7B]">
            {profile?.total_quests_completed ?? 0}
          </p>
          <p className="text-xs text-[#B0A898]">クリア済み</p>
        </div>
      </div>
    </div>
  );
}
