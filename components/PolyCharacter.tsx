"use client";

function seedNumber(seed: string) {
  return [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

const accents = ["peach", "mint", "lavender", "sky", "sun", "pink"] as const;

export default function PolyCharacter({ name, source, small = false }: { name: string; source?: string; small?: boolean }) {
  const seed = seedNumber(name);
  const accent = accents[seed % accents.length];
  const initial = name.trim().charAt(0).toLocaleUpperCase("tr-TR") || "?";
  return (
    <div className={`poly-character ${small ? "small" : ""} accent-${accent}`} aria-hidden="true">
      <div className="poly-orbit orbit-one" />
      <div className="poly-orbit orbit-two" />
      <div className="poly-body">
        <div className="poly-hair" />
        <div className="poly-face">
          <span className="poly-eye left" />
          <span className="poly-eye right" />
          <span className="poly-mouth" />
        </div>
        <div className="poly-neck" />
        <div className="poly-shirt"><span>{initial}</span></div>
      </div>
      {!small && <div className="poly-source-tag">{source || "KADRO"}</div>}
    </div>
  );
}
