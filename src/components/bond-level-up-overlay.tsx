"use client";

import { useEffect, useState } from "react";

type Props = {
  newLevel: number;
  levelName: string;
  onClose: () => void;
};

export function BondLevelUpOverlay({ newLevel, levelName, onClose }: Props) {
  const [phase, setPhase] = useState<"lowering" | "celebration" | "raising">("lowering");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("celebration"), 2000),
      setTimeout(() => setPhase("raising"), 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md" style={{ background: "linear-gradient(180deg, rgba(247,242,232,0.85) 0%, rgba(241,234,216,0.9) 50%, rgba(237,228,211,0.95) 100%)" }}>
      <div className="relative h-[500px] w-[340px]">
        <img
          src="/shinako-full.webp"
          alt="シナコ"
          className="absolute inset-0 h-full w-full rounded-2xl object-cover"
          style={{
            objectPosition: "center 5%",
            border: "2px solid var(--color-gold)",
            boxShadow: "0 0 60px rgba(232,184,73,0.4)",
          }}
        />

        {phase !== "celebration" && (
          <img
            src="/misu.webp"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-cover"
            style={{
              objectPosition: "center top",
              animation: phase === "lowering"
                ? "misuLowering 2s ease-in forwards"
                : "misuRaising 2.5s ease-out forwards",
            }}
          />
        )}

        {phase === "celebration" && (
          <div
            className="absolute inset-x-0 bottom-12 text-center"
            style={{ animation: "dialogueFadeIn 0.6s ease-out forwards" }}
          >
            <p className="font-wafuu text-xs text-gold opacity-80">絆レベルアップ</p>
            <p
              className="font-wafuu mt-2 text-3xl font-bold text-gold"
              style={{ textShadow: "0 0 20px rgba(232,184,73,0.8)" }}
            >
              Lv.{newLevel}
            </p>
            <p className="font-wafuu mt-1 text-base text-gold">{levelName}</p>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full px-3 py-1 text-xs transition active:scale-95"
        style={{ background: "rgba(255,253,247,0.85)", color: "var(--text-muted)", border: "1px solid rgba(217,164,65,0.25)" }}
      >
        スキップ
      </button>

      {phase === "raising" && (
        <button
          onClick={onClose}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full px-8 py-3 text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))",
            color: "var(--text-primary)",
            boxShadow: "0 8px 20px rgba(217,164,65,0.35)",
            animation: "dialogueFadeIn 0.5s ease-out 2s both",
          }}
        >
          続ける
        </button>
      )}
    </div>
  );
}
