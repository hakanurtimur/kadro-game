# Kızma Birader / Ludo Design

## Goal
KADRO uygulamasını iki oyunlu bir browser party-game hub'ına dönüştürmek: mevcut KADRO akışı korunacak, ikinci seçenek olarak klasik Kızma Birader eklenecek.

## Product flow
Ana sayfa iki büyük oyun kartı gösterir: **KADRO Oyna** ve **Kızma Birader Oyna**. KADRO giriş ekranı `/kadro`, Kızma Birader giriş ekranı `/ludo`, oyun odası `/ludo/[code]` altında çalışır. KADRO oda URL'leri değişmez.

## Classic rules
- 2–4 oyuncu; host normal oyuncudur.
- Her oyuncunun 4 taşı vardır.
- Taş yalnızca 6 ile avludan çıkar.
- 6 atan oyuncu tekrar zar atar.
- Ortak parkur 52 hücre, ardından oyuncuya özel 5 ev koridoru ve bitiş alanı vardır.
- Eve girmek için tam zar gerekir; taş bitişi aşamaz.
- Rakibin taşına güvenli olmayan ortak hücrede basılırsa rakip avluya döner.
- Dört başlangıç hücresi güvenlidir.
- Dört taşını da bitiren oyuncu kazanır.

## Chaos mode
Oda sahibi lobby'de Classic / Chaos seçer. Kaos her 4 tamamlanmış oyuncu turunda bir tetiklenir ve deterministik state seed'iyle seçilir; Firebase transaction retry sonucunu değiştirmez.

Kartlar karışıktır:
- **Çifte Zar** (aktif): sıradaki oyuncu iki zar görür ve birini seçer.
- **Ters Zar** (aktif): 1↔6, 2↔5, 3↔4 dönüşümü uygulanır.
- **Portal** (aktif): bu tur seçilen taş normal zarın yanında +2 ilerleme bonusu alır; bitişi aşarsa bonus uygulanmaz.
- **Kalkan** (aktif): aktif oyuncunun bu tur hareket ettirdiği taş bir tam masa turu boyunca yenemez.
- **Barış Turu** (global): bir tam masa turu boyunca yeme kapalıdır.
- **Deprem** (global): ortak parkurdaki tüm taşlar bir kare geri gider; avlu ve ev koridoru etkilenmez.

Kaos kartı tek başına doğrudan bitişe taşıyamaz; klasik tam-zar bitiş kuralını bypass etmez.

## Visual direction
KADRO'nun pastel low-poly/chibi görsel evreni korunur. Tahta 15×15 oyuncak-diorama görünümünde, piyonlar küçük chibi taşlar, zar büyük fiziksel küp hissinde olur. Zar atarken spin/bounce, piyon hareketinde hop, yakalamada poof, bitişte sparkle/konfeti animasyonu kullanılır. Reduced-motion tercihine saygı duyulur.

## Architecture
Ludo, KADRO motorundan bağımsız saf bir state machine kullanır: `lib/ludo/engine.ts`. Firebase verisi `ludoRooms/{code}` altında tutulur; ayrı local/Firebase store adapter'ları vardır. Aynı Firebase Anonymous Auth kimliği paylaşılır. UI, state transition fonksiyonlarını store transaction'ları üzerinden çağırır.

## Safety / integrity
- Dice and chaos randomness client `Math.random()` kullanmaz; room seed + sequence ile deterministiktir.
- Yalnız oda oyuncuları state yazabilir; lobby dışında yeni oyuncu eklenemez.
- Oda sahibi lobby ayarlarını değiştirir ama oyun içinde ekstra yetki/avantaj kazanmaz.
- Mevcut KADRO state/rules yolları değiştirilmeden çalışmaya devam eder.
