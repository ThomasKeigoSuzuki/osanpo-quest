"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 未認証ユーザーを自動的に匿名サインインさせる。
 * Supabase の signInAnonymously() で実際の user ID が付与され、
 * DB の RLS も全機能もそのまま動作する。
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function ensureAuth() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("[AuthProvider] Anonymous sign-in failed:", error.message);
        }
      }
    }

    ensureAuth();
  }, []);

  return <>{children}</>;
}
