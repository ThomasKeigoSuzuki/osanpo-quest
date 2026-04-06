export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type UserProfile = {
  display_name: string;
  total_quests_completed: number;
};

const DAILY_QUOTES = [
  "新しい週の始まりだよ！今日はどこに行こうか？",
  "火曜日は発見の日！面白いもの見つけに行こう",
  "水の流れるように、気の向くままに歩こう",
  "木々の声が聞こえるかな？自然を感じに行こう",
  "金曜日！週末前の冒険、行ってみない？",
  "休日だ！ゆっくり遠くまで歩いてみようよ",
  "日曜日のんびり散歩、最高じゃない？",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, total_quests_completed")
    .eq("id", user.id)
    .single<UserProfile>();

  const { data: activeQuest } = await supabase
    .from("quests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();

  const { count: itemCount } = await supabase
    .from("items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: areaData } = await supabase
    .from("quests")
    .select("start_area_name")
    .eq("user_id", user.id)
    .eq("status", "completed");

  const areaCount = areaData
    ? new Set(areaData.map((q) => q.start_area_name)).size
    : 0;

  const dayOfWeek = new Date().getDay();
  const quote = DAILY_QUOTES[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

  return (
    <div className="flex flex-col items-center px-4 pt-10 pb-4">
      {/* タイトル */}
      <p className="text-sm text-[var(--color-text-sub)]">
        {profile?.display_name ?? "ぼうけんしゃ"}の冒険
      </p>
      <h1 className="font-wafuu text-gold mt-1 text-3xl font-bold">
        おさんぽクエスト
      </h1>

      {/* シナコのアバター */}
      <div className="relative mt-10">
        {/* 光るリング */}
        <div className="absolute -inset-2 rounded-full animate-[glowRing_3s_ease-in-out_infinite] border-2 border-[var(--color-gold)] opacity-60" />
        <div className="absolute -inset-4 rounded-full animate-[glowRing_3s_ease-in-out_infinite_0.5s] border border-[var(--color-gold)] opacity-30" />
        <img
          src="/shinako.png"
          alt="風を司る放浪の神様シナコ"
          width={176}
          height={176}
          className="relative h-44 w-44 rounded-full border-2 border-[var(--color-gold)] object-cover shadow-[0_0_30px_rgba(232,184,73,0.2)]"
        />
      </div>

      {/* シナコのセリフ */}
      <div className="card-glass mt-6 w-full max-w-xs px-5 py-4">
        <p className="text-center text-sm leading-relaxed text-[var(--color-text)]">
          「{quote}」
        </p>
        <p className="mt-1 text-right text-xs text-[var(--color-gold)]">
          — <span className="font-wafuu">シナコ</span>
        </p>
      </div>

      {/* クエストボタン */}
      {activeQuest ? (
        <Link
          href={`/quest/${activeQuest.id}`}
          className="btn-secondary mt-8 w-full max-w-xs text-center"
        >
          続きから
        </Link>
      ) : (
        <Link
          href="/quest/start"
          className="btn-primary mt-8 w-full max-w-xs text-center text-lg"
        >
          クエストを始める
        </Link>
      )}

      {/* 統計 */}
      <div className="mt-8 flex w-full max-w-xs gap-3">
        <div className="card-glass flex flex-1 flex-col items-center py-4">
          <span className="text-lg">⚔️</span>
          <p className="text-gold mt-1 text-xl font-bold">
            {profile?.total_quests_completed ?? 0}
          </p>
          <p className="text-[10px] text-[var(--color-text-sub)]">クリア</p>
        </div>
        <div className="card-glass flex flex-1 flex-col items-center py-4">
          <span className="text-lg">💎</span>
          <p className="text-gold mt-1 text-xl font-bold">{itemCount ?? 0}</p>
          <p className="text-[10px] text-[var(--color-text-sub)]">コレクション</p>
        </div>
        <div className="card-glass flex flex-1 flex-col items-center py-4">
          <span className="text-lg">🗺️</span>
          <p className="text-gold mt-1 text-xl font-bold">{areaCount}</p>
          <p className="text-[10px] text-[var(--color-text-sub)]">エリア</p>
        </div>
      </div>
    </div>
  );
}
