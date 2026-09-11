# KADRO! — AI Auction Party Game

Tatlı low-poly anime görsel dilinde, 2–8 kişilik browser party game MVP'si.

Oyuncular yalnızca nickname + oda koduyla girer. Üyelik, mail veya şifre ekranı yoktur. Firebase kullanıldığında görünmez Anonymous Auth yalnızca realtime oyuncu kimliği sağlar.

## Oyun akışı

1. Host nickname, bütçe ve kadro slotunu seçip oda kurar.
2. Diğer oyuncular 5 karakterli oda koduyla lobby'ye girer.
3. AI Game Master görev + karakter evreni + karakter havuzu üretir.
4. Host toplam 5 zar hakkıyla görevi, tüm karakter kategorisini veya tek tek karakterleri değiştirebilir.
5. Karakterler 15 saniyelik canlı açık artırmaya çıkar.
6. Kazanan teklif açık artırma kapanırken bakiyeden düşer ve karakter kadroya eklenir.
7. Boş slotu kalan 2+ oyuncu simultane taş-kağıt-makas oynar. Kazanan bedava draft'ta ilk seçimi yapar.
8. Satılmayan karakterler sırayla ₺0'a draft edilir.
9. AI jüri tüm kadroları göreve göre 0–100 puanlar, yorumlar ve kazananı seçer.

## Stack

- Next.js 15.5.24 + React 19 + TypeScript
- Firebase JS SDK 12.14 + Realtime Database
- Firebase Anonymous Auth (UI'da görünmez)
- Groq API — varsayılan model `openai/gpt-oss-20b`
- CSS + özgün SVG low-poly anime maskotlar
- Node built-in test runner ile oyun motoru testleri

## Hızlı çalıştırma

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ardından `http://localhost:3000` aç.

### Local demo

Firebase bağlantısını geçici olarak kapatıp aynı browser'da iki sekmeyle denemek için `.env.local` içine şunu ekle:

```env
NEXT_PUBLIC_GAME_MODE=local
```

Groq key yoksa AI endpoint'leri güvenli demo içerik/jüri fallback'i döndürür. Böylece tüm oyun akışı yine test edilebilir.

## Firebase ile gerçek online multiplayer

`kadro-party-game-51d0c` Firebase Web App ayarları kaynak kodda güvenli public varsayılanlar olarak hazırdır. Vercel'e yedi ayrı Firebase değişkeni girmek gerekmez.

Firebase Realtime Database doğru bölgede hazırdır. Firebase Console'da yalnızca:

1. **Authentication → Sign-in method → Anonymous** sağlayıcısını etkinleştir.
2. `firebase/database.rules.json` içeriğini Realtime Database Rules ekranında publish et.

Adım adım yönerge: [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md)

> `browserSessionPersistence` sayesinde iki sekme iki farklı anonim oyuncu kimliği alabilir. Kullanıcı hiçbir auth ekranı görmez.

## Groq AI

Groq Console'dan API key oluşturup yalnızca server env'ine ekle:

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-20b
```

Key `NEXT_PUBLIC_` değildir; browser bundle'ına gitmez. AI çağrıları yalnızca Next.js Route Handler'lardan yapılır.

AI üç yerde kullanılır:

- `/api/round` → görev + kategori + benzersiz karakter havuzu
- `/api/reroll` → görev / kategori+havuz / tek karakter zarla
- `/api/judge` → kadroları puanla, kısa yorum yaz, kazananı seç

AI geçersiz JSON döndürürse veya servis erişilemezse oyun kırılmaz; demo fallback'e geçer.

## Test

```bash
npm test
```

Test edilen çekirdek davranışlar:

- teklifin mevcut tekliften yüksek olması
- bakiye kontrolü
- paranın yalnızca açık artırma kapanınca düşmesi
- karakterin kazanan kadroya eklenmesi
- RPS beraberlik ve eleme akışı
- bedava draft sıra rotasyonu
- Firebase'in düşürebildiği boş array/object alanlarının normalize edilmesi
- fallback AI içeriklerinin benzersizliği ve jüri şekli
- local demo room/join/persist akışı

## Vercel deploy

Repo'yu Vercel'e import et. **Project Settings → Environment Variables** bölümüne yalnızca gerçek AI için şunları gir:

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-20b
```

Firebase Web config kaynak kodda hazırdır. Firebase Console'da Realtime Database, Anonymous Auth ve Rules adımları tamamlanmış olmalı. Groq env'lerini kaydettikten sonra yeniden deploy et.

## MVP güvenlik notu

Bu sürüm arkadaş grubuyla oynanan hızlı party-game MVP'si için optimize edildi. Oda içindeki state geçişleri client transaction + engine validation ile korunuyor; ancak tamamen hileye dayanıklı bir public competitive oyun değildir. Büyük public release öncesinde host authority'yi server/Cloud Functions tarafına taşımak, rate limit, App Check ve host migration eklemek gerekir.

## Proje yapısı

```text
app/
  api/round/route.ts
  api/reroll/route.ts
  api/judge/route.ts
  room/[code]/page.tsx
components/
  RoomClient.tsx
  PolyAvatar.tsx
  PolyCharacter.tsx
  DiceButton.tsx
lib/
  game-engine.ts      # saf oyun kuralları / state transitions
  game-store.ts       # Firebase vs local seçim katmanı
  firebase-config.ts  # public Firebase defaults + optional env overrides
  firebase-client.ts  # anonymous auth + RTDB init
  firebase-store.ts   # atomic runTransaction adapter
  local-store.ts      # localStorage + BroadcastChannel demo adapter
  fallback.ts         # key yokken round/reroll/judge fallback
  ai/groq.ts          # server-only Groq JSON helper
firebase/
  database.rules.json
tests/
```
