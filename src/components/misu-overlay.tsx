"use client";

import { useState, useCallback } from "react";

const MISU_Y: Record<number, string> = {
  1: "0%",
  2: "-5%",
  3: "-45%",
  4: "-75%",
  5: "-100%",
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
  const yOffset = MISU_Y[stage] || "0%";

  const handleTap = useCallback(() => {
    if (type === "shinako") {
      setTapped(true);
      setTimeout(() => setTapped(false), 600);
    }
    onTap?.();
  }, [type, onTap]);

  // Filter for character based on stage
  const charFilter =
    stage <= 1
      ? "brightness(0) blur(3px)"
      : stage <= 2
        ? "brightness(0) blur(1px) drop-shadow(0 0 8px rgba(232,184,73,0.5))"
        : "none";

  return (
    <div className="relative w-full overflow-hidden" onClick={handleTap}>
      {/* Character image */}
      <img
        src={characterSrc}
        alt={characterAlt}
        className="h-full w-full object-cover"
        style={{
          filter: charFilter,
          objectPosition: "center 15%",
          animation: type === "shinako" ? "hairSway 6s ease-in-out infinite" : undefined,
          transition: "filter 1s ease",
        }}
      />

      {/* Misu overlay */}
      {stage < 5 && (
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "100%",
            ["--misu-y" as string]: yOffset,
            transform: `translateY(${yOffset})`,
            transition: "transform 1.5s ease-in-out",
            animation: type === "shinako" && !tapped
              ? "misuSway 5s ease-in-out infinite"
              : tapped
                ? "misuTapReact 0.6s ease-out"
                : undefined,
          }}
        >
          {/* 巻き上げ部分（上端の太い棒） */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="h-4 w-full rounded-b-sm" style={{ background: "linear-gradient(180deg, #b8a070, #9c8860)" }}>
              {/* 左右の房飾り */}
              <div className="absolute -bottom-5 left-4 h-6 w-2 rounded-full" style={{ background: "linear-gradient(180deg, var(--color-gold), #c9982e)" }} />
              <div className="absolute -bottom-5 right-4 h-6 w-2 rounded-full" style={{ background: "linear-gradient(180deg, var(--color-gold), #c9982e)" }} />
            </div>
          </div>

          {/* 御簾本体（竹の横線パターン） */}
          <div
            className="h-full w-full"
            style={{
              background: `
                repeating-linear-gradient(
                  180deg,
                  rgba(180, 160, 120, 0.7) 0px,
                  rgba(180, 160, 120, 0.7) 2px,
                  rgba(200, 180, 140, 0.3) 2px,
                  rgba(200, 180, 140, 0.3) 12px
                )
              `,
            }}
          />

          {/* 下端の棒 */}
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "#8c7850" }} />
        </div>
      )}

      {/* 風の光粒（stage 3以上で見え始める） */}
      {stage >= 3 && type === "shinako" && (
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

      {children}
    </div>
  );
}
