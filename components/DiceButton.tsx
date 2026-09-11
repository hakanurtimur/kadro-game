"use client";

import { Dices } from "lucide-react";

export default function DiceButton({
  label = "Zarla",
  disabled,
  onClick,
  compact = false,
}: {
  label?: string;
  disabled?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button className={`dice-button ${compact ? "compact" : ""}`} disabled={disabled} onClick={onClick} type="button">
      <Dices size={compact ? 15 : 18} />
      <span>{label}</span>
    </button>
  );
}
