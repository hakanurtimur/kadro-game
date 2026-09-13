import type { RoomState } from "./types";
export function sceneTheme(scenario: string): "palace" | "survival" | "service" | "festival" {
  const s=scenario.toLocaleLowerCase("tr-TR");
  if(/saray|entrika|taht|sultan/.test(s)) return "palace";
  if(/zombi|hayatta|ada|orman|felaket|kaçış/.test(s)) return "survival";
  if(/otel|şirket|restoran|pavyon|işlet|kafe/.test(s)) return "service";
  return "festival";
}
export function auctionAwards(room: RoomState): {title:string; detail:string}[] {
  const sales=room.sales ?? [];
  const awards:{title:string;detail:string}[]=[];
  if(sales.length) {
    const max=Math.max(...sales.map(s=>s.price));
    const purchases=sales.filter(s=>s.price===max);
    awards.push({title:"En pahalı transfer",detail:purchases.map(s=>`${s.name} → ${room.players[s.buyerUid]?.nickname ?? "Oyuncu"} (₺${s.price})`).join(" · ")});
  }
  const complete=Object.values(room.players).filter(p=>p.uid!==room.moderator?.uid && p.team.length===room.slots);
  if(complete.length) {
    const spend=complete.map(p=>({nickname:p.nickname,total:sales.filter(s=>s.buyerUid===p.uid).reduce((n,s)=>n+s.price,0)}));
    const min=Math.min(...spend.map(p=>p.total));
    awards.push({title:"İndirim avcısı",detail:`${spend.filter(p=>p.total===min).map(p=>p.nickname).join(" & ")} · ihalelerde toplam ₺${min}`});
  }
  return awards;
}
