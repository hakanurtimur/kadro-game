"use client";

const palettes = [
  ["#ff9f9a", "#5b315f", "#ffd7bb"],
  ["#78d9c4", "#243d5a", "#ffe0bf"],
  ["#a99cf7", "#4c365f", "#ffd5c2"],
  ["#79c6f2", "#34496b", "#f7cfac"],
  ["#f5be67", "#5a3d42", "#ffd4b5"],
  ["#ee91c2", "#53314f", "#f8c9ad"],
];

function seedNumber(seed: string) {
  return [...seed].reduce((sum, char) => (sum + char.charCodeAt(0) * 17) % 997, 0);
}

export default function PolyAvatar({ seed, size = 56 }: { seed: string; size?: number }) {
  const n = seedNumber(seed);
  const [accent, hair, skin] = palettes[n % palettes.length];
  const flipped = n % 2 === 0;

  return (
    <svg
      className="poly-avatar"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Low poly oyuncu avatarı"
      style={{ "--avatar-accent": accent, "--avatar-hair": hair, "--avatar-skin": skin } as React.CSSProperties}
    >
      <defs>
        <linearGradient id={`shirt-${n}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={accent} />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <polygon points="16,100 28,72 72,72 86,100" fill={`url(#shirt-${n})`} />
      <polygon points="25,51 34,23 66,20 79,50 68,76 39,77" fill={skin} />
      <polygon points="26,49 30,22 55,8 74,22 82,48 66,37 51,39 38,30" fill={hair} />
      <polygon points={flipped ? "31,25 54,8 51,39" : "31,25 44,10 51,39"} fill="#ffffff" opacity=".11" />
      <polygon points="68,20 82,48 66,37" fill="#000000" opacity=".12" />
      <polygon points="26,49 18,55 29,64" fill={skin} />
      <polygon points="78,48 86,55 75,64" fill={skin} />
      <polygon points="38,48 47,46 45,51 38,52" fill="#2d2340" />
      <polygon points="59,46 68,48 67,52 59,51" fill="#2d2340" />
      <polygon points="49,57 53,55 55,62 49,62" fill="#d69586" opacity=".8" />
      <path d="M45 66 Q53 71 62 65" stroke="#a95d72" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <polygon points="34,73 50,82 65,74 61,100 39,100" fill="#ffffff" opacity=".13" />
      <circle cx="81" cy="17" r="7" fill={accent} opacity=".9" />
      <polygon points="7,28 12,18 17,28 27,33 17,38 12,48 7,38 -3,33" fill="#fff6d6" opacity=".9" />
    </svg>
  );
}
