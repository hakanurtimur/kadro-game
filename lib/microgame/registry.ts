import type { MicrogameId } from "./types";

export type MicrogameDefinition = {
  id: MicrogameId;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedSeconds: number;
};

export const MICROGAME_REGISTRY: Record<MicrogameId, MicrogameDefinition> = {
  "bomb-pass": {
    id: "bomb-pass",
    title: "Bomba Kimde?",
    description: "Bombayı rakibine pasla. Fitil 7–10.5 saniye arasında patlar ama tam anı gizli.",
    minPlayers: 2,
    maxPlayers: 6,
    estimatedSeconds: 16,
  },
  "shrink-arena": {
    id: "shrink-arena",
    title: "Alan Daralıyor",
    description: "Aynı arenada kal, merkeze yönel ve diğer oyuncuların itişinden kaç. Güvenli alan sürekli küçülür.",
    minPlayers: 2,
    maxPlayers: 6,
    estimatedSeconds: 17,
  },
  "freeze-dance": {id:"freeze-dance",title:"Sakın Kıpırdama",description:"HAREKET sırasında dans et. DON yazınca dur; hiç hareket etmemek puan kazandırmaz.",minPlayers:2,maxPlayers:6,estimatedSeconds:19},
  "echo-gestures": {id:"echo-gestures",title:"Taklitçi",description:"Dört hareketi izle; dokun, basılı tut ve kaydırarak aynı sırayı tekrarla.",minPlayers:2,maxPlayers:6,estimatedSeconds:21},
  "memory-spot": {id:"memory-spot",title:"Kör Nokta",description:"Sembollerin yerini ezberle. Kaybolunca sorulan sembolün eski yerine dokun.",minPlayers:2,maxPlayers:6,estimatedSeconds:17},
  "red-light": {id:"red-light",title:"Kırmızı Işık",description:"Yeşilde basılı tutarak koş, kırmızıda bırak. Yakalanırsan geri gidersin.",minPlayers:2,maxPlayers:6,estimatedSeconds:21},
  "shadow-match": {id:"shadow-match",title:"Gölgeyi Yakala",description:"Kısa gösterilen silueti hatırla; altı şekil arasından doğru olanı bul.",minPlayers:2,maxPlayers:6,estimatedSeconds:16},
  "hold-release": {id:"hold-release",title:"Parmağını Çekme",description:"Geri sayımda basılı tut. Sahte komutlara kanma; ŞİMDİ BIRAK gelince bırak.",minPlayers:2,maxPlayers:6,estimatedSeconds:18},
  "crown-control": {id:"crown-control",title:"Tahtı Kap",description:"Rakiplerini it. Süre bittiğinde tahtın merkezine en yakın olan kazanır.",minPlayers:2,maxPlayers:6,estimatedSeconds:19},

};

export const MICROGAMES = Object.values(MICROGAME_REGISTRY);
