"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function SettingsForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      const { data } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name);
        setOriginalName(data.display_name);
      }
    }
    load();
  }, [supabase]);

  async function handleSaveName() {
    if (!displayName.trim() || displayName === originalName) return;
    setSaving(true);
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("users")
      .update({
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) {
      alert("保存に失敗しました。もう一度お試しください。");
      return;
    }
    setOriginalName(displayName.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const nameChanged = displayName.trim() !== originalName && displayName.trim() !== "";

  return (
    <div className="px-4 pt-8">
      <h1 className="font-wafuu text-xl font-bold text-[#6B8E7B]">設定</h1>

      <div className="mt-8 space-y-4">
        {/* 表示名 */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-[#8B7E6A]">表示名</h2>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              className="flex-1 rounded-lg border border-[#D4C5B0] bg-[#FFF8F0] px-3 py-2 text-sm text-[#5A5A5A] outline-none focus:border-[#6B8E7B] focus:ring-1 focus:ring-[#6B8E7B]"
            />
            <button
              onClick={handleSaveName}
              disabled={!nameChanged || saving}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                nameChanged
                  ? "bg-[#6B8E7B] text-white hover:bg-[#5A7D6A]"
                  : "bg-[#E8DFD0] text-[#B0A898] cursor-not-allowed"
              }`}
            >
              {saving ? "保存中..." : saved ? "保存済み" : "保存"}
            </button>
          </div>
        </div>

        {/* アカウント */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-[#8B7E6A]">アカウント</h2>
          {email && (
            <p className="mt-2 text-xs text-[#B0A898]">{email}</p>
          )}
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-[#D4C5B0] px-4 py-2 text-sm text-[#8B7E6A] transition hover:bg-[#FFF8F0]"
          >
            ログアウト
          </button>
        </div>

        {/* アプリ情報 */}
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
