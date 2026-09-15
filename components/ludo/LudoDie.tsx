import type { CSSProperties } from "react";
import type { LudoColor } from "@/lib/ludo/types";

const PIP_LAYOUT: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

const SIZE_STYLE: Record<"hero" | "compact" | "mini", CSSProperties> = {
  hero: {
    width: "clamp(68px, 18vw, 78px)",
    height: "clamp(68px, 18vw, 78px)",
    borderRadius: "20px",
  },
  compact: {
    width: "clamp(50px, 14vw, 58px)",
    height: "clamp(50px, 14vw, 58px)",
    borderRadius: "16px",
  },
  mini: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
  },
};

export default function LudoDie({
  value,
  color,
  rolling = false,
  size = "hero",
}: {
  value: number;
  color: LudoColor;
  rolling?: boolean;
  size?: "hero" | "compact" | "mini";
}) {
  const safeValue = Math.max(1, Math.min(6, Math.round(value || 1)));
  const pips = PIP_LAYOUT[safeValue];

  return (
    <span
      className={`ludo-die ${color} ${size} ${rolling ? "rolling" : ""}`}
      role="img"
      aria-label={`${safeValue} gelen zar`}
      data-value={safeValue}
      style={{
        ...SIZE_STYLE[size],
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "12%",
          width: "76%",
          height: "76%",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        {pips.map(([cx, cy], index) => (
          <circle
            key={`${cx}-${cy}-${index}`}
            cx={cx}
            cy={cy}
            r={size === "mini" ? 8 : 7.5}
            style={{
              fill: "var(--die-accent)",
              filter: "drop-shadow(0 1px 1px rgba(52,42,62,.18))",
            }}
          />
        ))}
      </svg>
    </span>
  );
}
