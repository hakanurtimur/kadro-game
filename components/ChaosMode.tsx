"use client";

import { Dices, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { ChaosEvent, GameMode } from "@/lib/types";

export function ModePicker({ value, disabled, onChange }: {
  value: GameMode;
  disabled: boolean;
  onChange: (value: GameMode) => void;
}) {
  return (
    <fieldset className="game-mode-picker" disabled={disabled}>
      <legend>OYUN MODU</legend>
      <div className="game-mode-options">
        <button type="button" aria-pressed={value === "classic"} onClick={() => onChange("classic")}>
          <ShieldCheck size={21} aria-hidden="true"/>
          <span><strong>Klasik</strong><small>Bütçeni yönet, kadronu kur.</small></span>
        </button>
        <button type="button" className="chaos-option" aria-pressed={value === "chaos"} onClick={() => onChange("chaos")}>
          <Dices size={22} aria-hidden="true"/>
          <span><strong>Kaos <em>YENİ</em></strong><small>Her 3 ihalede bir sürpriz!</small></span>
        </button>
      </div>
      <p>{value === "chaos"
        ? "Kriz, miras, takas veya yeni görev. Karttan sonra 5 saniye ara; sonra ihale devam!"
        : "Sürpriz olay yok. Karakterleri topla, en iyi ekibi kur."}</p>
    </fieldset>
  );
}

const EVENT_EMOJI = { crisis: "💸", inheritance: "🎁", swap: "🔄", scenario: "🎭" };

export function ChaosBanner({ event, seconds }: { event: ChaosEvent; seconds: number }) {
  return (
    <aside className={`chaos-event ${seconds > 0 ? "chaos-event-paused" : ""}`} data-testid="chaos-event">
      <span className="chaos-event-icon" aria-hidden="true">{EVENT_EMOJI[event.kind]}</span>
      <div className="chaos-event-copy" role="status">
        <span className="chaos-eyebrow"><Zap size={13} aria-hidden="true"/> KAOS KARTI · {event.afterAuction}. İHALE SONRASI</span>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
      </div>
      {seconds > 0 && <div className="chaos-countdown" aria-label={`İhale ${seconds} saniye sonra başlıyor`}><b>{seconds}</b><small>sonra devam</small></div>}
    </aside>
  );
}

export function ChaosHistory({ events }: { events: ChaosEvent[] }) {
  if (!events.length) return null;
  return (
    <details className="chaos-history">
      <summary><Sparkles size={16} aria-hidden="true"/> Bu tur neler oldu? <span>{events.length} kaos kartı</span></summary>
      <ol>{events.map((event) => <li key={event.id}><span aria-hidden="true">{EVENT_EMOJI[event.kind]}</span><div><strong>{event.title}</strong><p>{event.description}</p></div></li>)}</ol>
    </details>
  );
}
