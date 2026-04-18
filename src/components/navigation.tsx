"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Footprints, BookMarked, Sparkles, User } from "lucide-react";

const navItems = [
  { href: "/", label: "おさんぽ", icon: Footprints, match: (p: string) => p === "/" },
  {
    href: "/library",
    label: "栞",
    icon: BookMarked,
    match: (p: string) =>
      p.startsWith("/library") ||
      p.startsWith("/collection") ||
      p.startsWith("/catalog") ||
      p.startsWith("/adventure-log"),
  },
  { href: "/bonds", label: "神無子", icon: Sparkles, match: (p: string) => p.startsWith("/bonds") },
  { href: "/settings", label: "わたし", icon: User, match: (p: string) => p.startsWith("/settings") },
];

export function BottomNavigation() {
  const pathname = usePathname();

  if (pathname.startsWith("/quest/")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      aria-label="メインナビゲーション"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent-gold)] to-transparent opacity-50" />
      <div className="bg-[rgba(247,242,232,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {navItems.map(({ href, label, icon: Icon, match }) => {
            const isActive = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] transition-colors ${
                  isActive
                    ? "font-bold text-[var(--accent-gold-dark)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
                <span>{label}</span>
                {isActive && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--accent-gold)] shadow-[0_0_6px_rgba(217,164,65,0.5)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
