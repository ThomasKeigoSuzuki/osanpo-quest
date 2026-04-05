"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SettingsForm() {
  const supabase = createClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="px-4 pt-8">
      <h1 className="text-xl font-bold text-[#6B8E7B]">設定</h1>

      <div className="mt-8 space-y-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-[#8B7E6A]">アカウント</h2>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-[#D4C5B0] px-4 py-2 text-sm text-[#8B7E6A] transition hover:bg-[#FFF8F0]"
          >
            ログアウト
          </button>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-[#8B7E6A]">アプリ情報</h2>
          <p className="mt-2 text-xs text-[#B0A898]">
            おさんぽクエスト v0.1.0
          </p>
        </div>
      </div>
    </div>
  );
}
