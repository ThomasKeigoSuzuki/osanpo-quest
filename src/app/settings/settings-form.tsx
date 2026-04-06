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
    <div className="px-4 pt-8 pb-4">
      <h1 className="font-wafuu text-xl font-bold text-gold">設定</h1>

      <div className="mt-8 space-y-4">
        {/* 表示名 */}
        <div className="card-glass p-4">
          <label htmlFor="display-name" className="block text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>
            表示名
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              className="min-h-[44px] flex-1 rounded-xl px-4 py-3 text-sm outline-none transition"
              style={{
                background: "rgba(0,0,0,0.3)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-gold)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(232,184,73,0.3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              onClick={handleSaveName}
              disabled={!nameChanged || saving}
              className="btn-primary min-h-[44px] shrink-0 !px-5 !py-3 text-sm"
            >
              {saving ? "保存中..." : saved ? "保存済み" : "保存"}
            </button>
          </div>
          <p className="mt-1.5 text-right text-[11px] text-gold">
            {displayName.length}/20
          </p>
        </div>

        {/* アカウント */}
        <div className="card-glass p-4">
          <h2 className="text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>アカウント</h2>
          {email && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>{email}</p>
          )}
          <button
            onClick={handleLogout}
            className="btn-secondary mt-3 min-h-[44px] w-full !px-4 !py-3 text-sm"
          >
            ログアウト
          </button>
        </div>

        {/* アプリ情報 */}
        <div className="card-glass p-4">
          <h2 className="text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>アプリ情報</h2>
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            おさんぽクエスト v0.1.0
          </p>
        </div>
      </div>
    </div>
  );
}
