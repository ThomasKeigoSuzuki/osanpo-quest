"use client";

import { useState, useCallback } from "react";

const MISU_Y: Record<number, string> = {
  1: "0%",
  2: "-8%",
  3: "-45%",
  4: "-78%",
  5: "-105%",
};

const CHAR_FILTER: Record<number, string> = {
  1: "brightness(0) blur(2px)",
  2: "brightness(0) blur(1px) drop-shadow(0 0 12px rgba(232,184,73,0.6))",
  3: "brightness(0.4) blur(0.5px)",
  4: "brightness(0.8)",
  5: "none",
};

export function MisuOverlay({
  stage,
  characterSrc,
  characterAlt,
  type = "shinako",
  onTap,
  children,
}: {
  stage: number;
  characterSrc: string;
  characterAlt: string;
  type?: "shinako" | "local";
  onTap?: () => void;
  children?: React.ReactNode;
}) {
  const [tapped, setTapped] = useState(false);
  const s = Math.min(5, Math.max(1, stage));
  const yOffset = MISU_Y[s] || "0%";

  const handleTap = useCallback(() => {
    if (type === "shinako" && s < 5) {
      setTapped(true);
      setTimeout(() => setTapped(false), 600);
    }
    onTap?.();
  }, [type, s, onTap]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onClick={handleTap}
      style={{ ["--misu-y" as string]: yOffset }}
    >
      {/* 1. キャラクター画像（最背面） */}
      <img
        src={characterSrc}
        alt={characterAlt}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: "center 5%",
          filter: CHAR_FILTER[s] || "none",
          transition: "filter 1s ease-in-out",
          animation: s >= 5 && type === "shinako" ? "hairSway 6s ease-in-out infinite" : undefined,
        }}
      />

      {/* 2. 御簾画像（中間） */}
      {s < 5 && (
        <img
          src="/misu.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: "center top",
            transform: `translateY(${yOffset})`,
            transition: "transform 1.5s ease-in-out, opacity 0.5s ease",
            opacity: s >= 5 ? 0 : 0.7,
            animation: type === "shinako" && !tapped
              ? "misuSway 5s ease-in-out infinite"
              : tapped
                ? "misuTapReact 0.6s ease-out"
                : undefined,
          }}
        />
      )}

      {/* 3. 風の光粒（stage 3以上） */}
      {s >= 3 && type === "shinako" && (
        <>
          {[25, 42, 58, 75].map((left, i) => (
            <div
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-white"
              style={{
                bottom: "10%",
                left: `${left}%`,
                opacity: 0,
                animation: `windParticle 3s ease-in-out infinite ${i * 1.2}s`,
              }}
            />
          ))}
        </>
      )}

      {/* 4. Children（絆バッジなど、最前面） */}
      {children}
    </div>
  );
}
