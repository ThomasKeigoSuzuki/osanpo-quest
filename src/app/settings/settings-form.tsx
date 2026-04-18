"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getRank } from "@/lib/rank-system";

export function SettingsForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [rankData, setRankData] = useState<ReturnType<typeof getRank> | null>(null);
  const [distance, setDistance] = useState<"short" | "medium" | "long">("medium");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setIsAnonymous(user.is_anonymous ?? false);
      setEmail(user.email || "");

      const { data } = await supabase
        .from("users")
        .select("display_name, rank_points")
        .eq("id", user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name);
        setOriginalName(data.display_name);
        setRankData(getRank(data.rank_points));
      }

      try {
        const saved = localStorage.getItem("oq_distance_preference");
        if (saved === "short" || saved === "medium" || saved === "long") setDistance(saved);
      } catch {}
    }
    load();
  }, [supabase]);

  function changeDistance(value: "short" | "medium" | "long") {
    setDistance(value);
    try {
      localStorage.setItem("oq_distance_preference", value);
    } catch {}
  }

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

  async function handleLinkAccount() {
    if (!linkEmail.trim()) return;
    setLinkError("");

    const { error } = await supabase.auth.updateUser({
      email: linkEmail.trim(),
    });

    if (error) {
      setLinkError("メールアドレスの登録に失敗しました。");
    } else {
      setLinkSent(true);
    }
  }

  async function handleGoogleLink() {
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setLinkError("Google連携に失敗しました。");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const nameChanged = displayName.trim() !== originalName && displayName.trim() !== "";

  return (
    <div className="px-4 pt-8 pb-4">
      <p className="text-[10px] tracking-[0.2em]" style={{ color: "var(--accent-gold-dark)" }}>MY SETTINGS</p>
      <h1 className="font-wafuu mt-1 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>わたし</h1>
      <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
        冒険者のプロフィールと設定
      </p>

      <div className="mt-6 space-y-4">
        {/* 冒険者ランク */}
        {rankData && (
          <div className="card-glass p-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>冒険者ランク</h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl">{rankData.icon}</span>
              <div className="flex-1">
                <p className="font-wafuu text-sm font-bold" style={{ color: rankData.color }}>{rankData.name}</p>
                <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>累計 {rankData.totalPoints} pts</p>
              </div>
            </div>
            {!rankData.isMax && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  <span>次のランクまで</span>
                  <span>{rankData.currentPoints}/{rankData.nextRankPoints}</span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--color-card)" }}>
                  <div className="h-full rounded-full" style={{ width: `${rankData.progress * 100}%`, background: `linear-gradient(90deg, ${rankData.color}80, ${rankData.color})` }} />
                </div>
              </div>
            )}
          </div>
        )}

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
                background: "rgba(255,253,247,0.9)",
                color: "var(--text-primary)",
                border: "1px solid rgba(217,164,65,0.28)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-gold)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(217,164,65,0.25)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(217,164,65,0.28)";
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

        {/* 歩く距離のこのみ */}
        <div className="card-glass p-4">
          <h2 className="text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>歩く距離のこのみ</h2>
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            クエストで神無子が提案する目的地までの距離です
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([
              { k: "short", emoji: "🌱", label: "ちょっと", sub: "〜150m" },
              { k: "medium", emoji: "🌿", label: "ちょうど", sub: "〜350m" },
              { k: "long", emoji: "🌳", label: "しっかり", sub: "〜700m" },
            ] as const).map((opt) => {
              const selected = distance === opt.k;
              return (
                <button
                  key={opt.k}
                  onClick={() => changeDistance(opt.k)}
                  className="rounded-xl py-3 text-center transition active:scale-[0.97]"
                  style={{
                    background: selected ? "rgba(217,164,65,0.2)" : "rgba(255,253,247,0.7)",
                    border: `1px solid ${selected ? "var(--accent-gold)" : "rgba(217,164,65,0.2)"}`,
                    boxShadow: selected ? "0 2px 8px rgba(217,164,65,0.25)" : "none",
                  }}
                >
                  <div className="text-xl">{opt.emoji}</div>
                  <p className="mt-0.5 text-[11px] font-bold" style={{ color: selected ? "var(--accent-gold-dark)" : "var(--text-primary)" }}>
                    {opt.label}
                  </p>
                  <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{opt.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 匿名ユーザー向け: アカウント連携 */}
        {isAnonymous && (
          <div className="card-glass p-4">
            <h2 className="text-sm font-medium text-gold">アカウント連携</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-sub)" }}>
              メールやGoogleアカウントを連携すると、データが保存され他の端末でもプレイできます。
            </p>

            {linkSent ? (
              <p className="mt-3 text-sm text-[var(--color-success)]">
                確認メールを送信しました。メール内のリンクをクリックしてください。
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <button
                  onClick={handleGoogleLink}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-[#333] transition hover:shadow-md"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Googleで連携
                </button>

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>または</span>
                  <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    placeholder="メールアドレス"
                    className="min-h-[44px] flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      background: "rgba(255,253,247,0.9)",
                      color: "var(--text-primary)",
                      border: "1px solid rgba(217,164,65,0.28)",
                    }}
                  />
                  <button
                    onClick={handleLinkAccount}
                    disabled={!linkEmail.trim()}
                    className="btn-primary min-h-[44px] shrink-0 !px-4 !py-3 text-sm"
                  >
                    連携
                  </button>
                </div>
              </div>
            )}

            {linkError && (
              <p className="mt-2 text-xs" style={{ color: "var(--color-danger)" }}>{linkError}</p>
            )}
          </div>
        )}

        {/* アカウント */}
        <div className="card-glass p-4">
          <h2 className="text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>アカウント</h2>
          {email && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>{email}</p>
          )}
          {isAnonymous && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-accent)" }}>
              ゲストモードでプレイ中
            </p>
          )}
          <button
            onClick={handleLogout}
            className="btn-secondary mt-3 min-h-[44px] w-full !px-4 !py-3 text-sm"
          >
            ログアウト
          </button>
        </div>

        {/* タイトルに戻る */}
        <div className="card-glass p-4">
          <button
            onClick={() => router.push("/login")}
            className="btn-ghost w-full min-h-[44px] text-sm"
          >
            タイトルに戻る
          </button>
        </div>

        {/* アプリ情報 */}
        <div className="card-glass p-4">
          <h2 className="text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>アプリ情報</h2>
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            おさんぽクエスト v0.2.0
          </p>
        </div>
      </div>
    </div>
  );
}
