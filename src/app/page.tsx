export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShinakoAvatar } from "@/components/shinako-avatar";

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

  // 進行中クエストを取得
  const { data: activeQuest } = await supabase
    .from("quests")
    .select("id")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .limit(1)
    .single();

  // コレクション数を取得
  const { count: itemCount } = await supabase
    .from("items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  // 訪れたエリア数を取得
  const { data: areaData } = await supabase
    .from("quests")
    .select("start_area_name")
    .eq("user_id", user!.id)
    .eq("status", "completed");

  const areaCount = areaData
    ? new Set(areaData.map((q) => q.start_area_name)).size
    : 0;

  return (
    <div className="flex flex-col items-center px-4 pt-12">
      {/* ヘッダー */}
      <p className="text-sm text-[#B0A898]">
        {profile?.display_name ?? "ぼうけんしゃ"}の冒険
      </p>
      <h1 className="font-wafuu mt-1 text-2xl font-bold text-[#6B8E7B]">
        おさんぽクエスト
      </h1>

      {/* シナコのアバター */}
      <div className="mt-12">
        <ShinakoAvatar />
      </div>
      <p className="mt-4 text-center text-sm text-[#8B7E6A]">
        {activeQuest
          ? "冒険の途中だよ。続きに行こう！"
          : <>放浪の神様「<span className="font-wafuu">シナコ</span>」が<br />あなたの冒険を待っています</>}
      </p>

      {/* クエスト開始 or 続きからボタン */}
      {activeQuest ? (
        <Link
          href={`/quest/${activeQuest.id}`}
          className="mt-10 w-full max-w-xs rounded-2xl bg-[#D4A574] px-8 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-[#C49464] active:scale-[0.98]"
        >
          続きから
        </Link>
      ) : (
        <Link
          href="/quest/start"
          className="mt-10 w-full max-w-xs rounded-2xl bg-[#6B8E7B] px-8 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-[#5A7D6A] active:scale-[0.98]"
        >
          クエストを始める
        </Link>
      )}

      {/* 統計 */}
      <div className="mt-8 flex gap-8 text-center">
        <div>
          <p className="text-2xl font-bold text-[#6B8E7B]">
            {profile?.total_quests_completed ?? 0}
          </p>
          <p className="text-xs text-[#B0A898]">クリア済み</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#6B8E7B]">
            {itemCount ?? 0}
          </p>
          <p className="text-xs text-[#B0A898]">コレクション</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#6B8E7B]">
            {areaCount}
          </p>
          <p className="text-xs text-[#B0A898]">エリア</p>
        </div>
      </div>
    </div>
  );
}
