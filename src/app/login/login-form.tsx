"use client";

import { createClient } from "@/lib/supabase/client";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const RESET_WARNINGS = [
  { title: "データ削除の確認", message: "全てのクエスト履歴、アイテム、絆データが削除されます。この操作は取り消せません。" },
  { title: "本当に削除しますか？", message: "シナコとの思い出も、集めたアイテムも、全てなくなります。" },
  { title: "最後の確認", message: "本当にはじめからやり直しますか？ もう戻れません。" },
];

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [resetStep, setResetStep] = useState(-1); // -1=非表示, 0-2=警告ステップ
  const [resetting, setResetting] = useState(false);

  const [showTitle, setShowTitle] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // 認証状態チェック（リダイレクトしない）
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, [supabase]);

  // 演出タイマー
  useEffect(() => {
    const timers = [
      setTimeout(() => setShowTitle(true), 3000),
      setTimeout(() => setShowButtons(true), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  async function handleAnonymousLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setError("開始に失敗しました。もう一度お試しください。");
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  async function handleGoogleLogin() {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError("Googleログインに失敗しました。");
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("リンクの送信に失敗しました。");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleReset() {
    if (resetStep < 2) {
      setResetStep(resetStep + 1);
      return;
    }
    // 3回目の確認 → 実行
    setResetting(true);
    try {
      const res = await fetch("/api/account/reset", { method: "POST" });
      if (!res.ok) throw new Error();
      router.push("/");
    } catch {
      setError("リセットに失敗しました。");
      setResetting(false);
      setResetStep(-1);
    }
  }

  // メール送信確認画面
  if (sent) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-fantasy px-4">
        <div className="card-glass w-full max-w-sm p-6 text-center">
          <p className="text-lg font-medium text-gold">メールを送信しました</p>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-sub)" }}>
            {email} に届いたリンクからログインしてください。
          </p>
        </div>
      </div>
    );
  }

  // リセット警告オーバーレイ
  const resetOverlay = resetStep >= 0 && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm px-6">
      <div className="w-full max-w-sm rounded-2xl p-6 text-center" style={{ background: "rgba(26,26,46,0.98)", border: "1px solid rgba(232,184,73,0.3)" }}>
        <p className="text-3xl">⚠️</p>
        <p className="font-wafuu mt-3 text-base font-bold" style={{ color: "var(--color-danger)" }}>
          {RESET_WARNINGS[resetStep].title}
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-sub)" }}>
          {RESET_WARNINGS[resetStep].message}
        </p>
        <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          確認 {resetStep + 1} / 3
        </p>
        <div className="mt-5 space-y-2">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full rounded-xl py-3 text-sm font-bold transition active:scale-[0.97]"
            style={{ background: "var(--color-danger)", color: "white" }}
          >
            {resetting ? "削除中..." : resetStep < 2 ? "次へ" : "はじめからやり直す"}
          </button>
          <button
            onClick={() => setResetStep(-1)}
            className="w-full py-2 text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            やめる
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ maxWidth: 448, margin: "0 auto" }}>
      {resetOverlay}

      {/* z-0: 背景 */}
      <img src="/bg-shrine.webp" alt="" className="absolute inset-0 z-0 h-full w-full object-cover" style={{ filter: "brightness(0.3) saturate(0.7)" }} />
      <div className="absolute inset-x-0 bottom-0 z-[1] h-[60%]" style={{ background: "linear-gradient(to bottom, transparent, rgba(26,26,46,0.97) 65%)" }} />

      {/* 風光粒 */}
      {[20, 35, 55, 72, 88].map((left, i) => (
        <div key={i} className="absolute z-[2] h-1.5 w-1.5 rounded-full bg-white" style={{ bottom: "15%", left: `${left}%`, opacity: 0, animation: `windParticle 3s ease-in-out infinite ${i * 1.1}s` }} />
      ))}

      {/* z-5: シナコ */}
      <div className="pointer-events-none absolute left-1/2 z-[5] -translate-x-1/2" style={{ top: "5%", width: "90%", maxWidth: 360, height: "60dvh", opacity: 0, animation: "shinakoFadeIn 1.5s ease-out forwards" }}>
        <img src="/shinako-full.webp" alt="シナコ" className="h-full w-full object-cover" style={{ objectPosition: "center 5%" }} />
      </div>

      {/* z-10: タイトル */}
      <div className="absolute left-0 right-0 z-10 text-center transition-all duration-1000" style={{ bottom: isLoggedIn ? "35%" : "30%", opacity: showTitle ? 1 : 0, transform: showTitle ? "translateY(0)" : "translateY(12px)" }}>
        <div className="mx-auto h-px w-[200px]" style={{ background: "rgba(232,184,73,0.5)" }} />
        <h1 className="font-wafuu mt-4 text-3xl font-bold text-gold" style={{ animation: showTitle ? "starGlow 2s ease-in-out infinite" : undefined }}>
          おさんぽクエスト
        </h1>
        <p className="mt-2 text-xs" style={{ color: "rgba(232,184,73,0.8)" }}>忘れられた風の神と、今日を歩く</p>
        <div className="mx-auto mt-4 h-px w-[200px]" style={{ background: "rgba(232,184,73,0.5)" }} />
      </div>

      {/* z-20: ボタン群 */}
      <div className="absolute bottom-12 left-0 right-0 z-20 px-6 safe-bottom transition-all duration-700" style={{ opacity: showButtons ? 1 : 0, transform: showButtons ? "translateY(0)" : "translateY(16px)" }}>
        {isLoggedIn ? (
          // ===== 認証済み =====
          <div>
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-xl py-4 text-center text-lg font-bold transition active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold-light))", color: "var(--color-bg-primary)", boxShadow: "0 4px 24px rgba(232,184,73,0.5)" }}
            >
              つづきから
            </button>
            <button
              onClick={() => setResetStep(0)}
              className="mt-3 w-full rounded-xl py-3 text-center text-sm font-medium transition active:scale-[0.97]"
              style={{ background: "rgba(255,255,255,0.08)", color: "var(--color-text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              はじめから
            </button>
          </div>
        ) : isLoggedIn === false ? (
          // ===== 未認証 =====
          <div>
            <button
              onClick={handleAnonymousLogin}
              disabled={loading}
              className="w-full rounded-xl py-4 text-center text-lg font-bold transition active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold-light))", color: "var(--color-bg-primary)", boxShadow: "0 4px 24px rgba(232,184,73,0.5)" }}
            >
              {loading ? "準備中..." : "はじめる"}
            </button>
            <button
              onClick={handleGoogleLogin}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition active:scale-[0.97]"
              style={{ background: "rgba(255,255,255,0.08)", color: "var(--color-text)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Googleでログイン
            </button>
            <button onClick={() => setShowEmail(!showEmail)} className="mt-2 w-full py-2 text-center text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              メールで続ける
            </button>
            {showEmail && (
              <form onSubmit={handleMagicLink} className="mt-2 flex gap-2" style={{ animation: "dialogueFadeIn 0.3s ease-out" }}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス" required className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-xs outline-none" style={{ background: "rgba(0,0,0,0.4)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                <button type="submit" disabled={loading} className="shrink-0 rounded-lg px-4 py-2.5 text-xs font-bold" style={{ background: "var(--color-gold)", color: "var(--color-bg-primary)" }}>
                  {loading ? "..." : "送信"}
                </button>
              </form>
            )}
          </div>
        ) : null}
        {error && <p className="mt-2 text-center text-xs" style={{ color: "var(--color-danger)" }}>{error}</p>}
      </div>

      {/* z-30: フッター */}
      <div className="absolute bottom-2 left-0 right-0 z-30 text-center">
        <p className="text-[10px]" style={{ opacity: 0.4, color: "var(--color-text-muted)" }}>v0.1</p>
      </div>
    </div>
  );
}
