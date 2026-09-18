"use client";
import { useEffect, useRef } from "react";
import { LogOut } from "lucide-react";

export default function LeaveLudoDialog({ playing, busy, error, onCancel, onConfirm }: {
  playing: boolean; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node=dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} className="ludo-leave-dialog" aria-labelledby="leave-title" aria-describedby="leave-description" onCancel={event=>{event.preventDefault();if(!busy)onCancel();}}>
    <span className="ludo-leave-icon" aria-hidden="true"><LogOut size={28}/></span>
    <h2 id="leave-title">Masadan ayrılıyor musun?</h2>
    <p id="leave-description">{playing ? "Dört piyonun da tahtadan kaldırılacak ve bu maça geri dönemeyeceksin. Kalan oyuncular devam edecek; tek kişi kalırsa o kazanacak." : "Odadaki yerin ve rengin boşalacak."} Oda sahibiysen masayı kalan bir oyuncuya devredeceğiz.</p>
    {error&&<p role="alert" className="ludo-leave-error">{error}</p>}
    <div className="ludo-leave-actions"><button type="button" autoFocus disabled={busy} onClick={onCancel}>Vazgeç, kalıyorum</button><button type="button" className="ludo-leave-confirm" disabled={busy} onClick={onConfirm}>{busy?"Ayrılıyor…":"Evet, oyundan ayrıl"}</button></div>
  </dialog>;
}
