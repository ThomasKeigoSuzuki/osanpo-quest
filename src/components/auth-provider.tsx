"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

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
          return;
        }
      }

      // チェックイン（ストリーク更新）
      try {
        await fetch("/api/daily/check-in");
      } catch {
        // サイレント失敗
      }
    }

    ensureAuth();
  }, []);

  return <>{children}</>;
}
