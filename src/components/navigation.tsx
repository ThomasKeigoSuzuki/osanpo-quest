"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, BookMarked, BookOpen, Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/collection", label: "コレクション", icon: Package },
  { href: "/catalog", label: "図鑑", icon: BookMarked },
  { href: "/adventure-log", label: "冒険日記", icon: BookOpen },
  { href: "/settings", label: "設定", icon: Settings },
];

export function BottomNavigation() {
  const pathname = usePathname();

  if (pathname.startsWith("/quest/")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      aria-label="メインナビゲーション"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-40" />
      <div className="bg-[rgba(26,26,46,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-[50px] flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[9px] transition-colors ${
                  isActive
                    ? "text-[var(--color-gold)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
                <span>{label}</span>
                {isActive && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--color-gold)] shadow-[0_0_6px_var(--color-gold)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
