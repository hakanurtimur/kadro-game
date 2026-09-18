# DÜMBÜK — Arkadaş arası rekabet kurumu

DÜMBÜK çok oyunlu arkadaş platformudur. KADRO, Kızma Birader, TAŞIR ve Microgame Royale bu platformun oyunlarıdır.

Logo paketi: `public/brand/dumbuk-brand-kit.zip`. Kimlik ve dosya rehberi: `docs/branding/README.md`.

## KADRO — Moderatör masası

Pastel, low-poly anime hissini koruyan tarayıcı açık artırma oyunu. **1 oynamayan moderatör + 2–8 yarışmacı** gerekir. Herkes nickname ve oda koduyla girer; kayıt ekranı yoktur.

## Oyun

Odayı kuran kişi moderatördür: bakiyesi, kadrosu, teklif düğmesi ve turnuva puanı yoktur. Yarışmacılar aynı bütçeyle başlar. Moderatör görevi ve karakter evrenini hazırlatır, zarları kullanır, ihaleyi başlatır. Karakterler seçilen evrenin doğrulanmış kataloğundan gelir. Klasik ve Kaos modları korunur.

Her ihale 15 saniyedir. Son üç saniyedeki teklif kalan süreyi üç saniyeye tamamlar. Oyuncu o ihaleden kalıcı olarak çekilebilir; en yüksek teklif geri alınamaz. Uygun rakip kalmadığında ihale erken kapanır. Parası ve boş slotu olan yarışmacı kalmazsa bekleyen karakterler bedava havuza geçer. En az iki eksik kadro varsa RPS ilk seçeni belirler; tek eksik kadro doğrudan seçer.

Jüri puanı: **göreve uygunluk %50 + ekip uyumu %30 + çok yönlülük %20**. Model kriterleri yorumlar, kod ağırlıklı toplamı ve eşitlikleri hesaplar. Para, kaptan veya taktik puanı yoktur. Sonuç bir kez kaydedilir ve moderatör beş sahnede açar. Hata durumunda sahte AI puanı üretilmez.

Tek tur veya üç turluk seri ilk lobide seçilir. Her tur kadro ve bütçe sıfırlanır. N oyuncuda sıra puanları N, N−1, …, 1'dir; eşitler aynı dereceyi/puanı paylaşır. Üç tur toplamında eşitlik varsa ortak şampiyon ilan edilir. İlk önizlemeden sonra katılımcı listesi kilitlenir. Sonraki seri aynı odada başlatılabilir.

Karakter kartlarının iki güçlü yönü, zaafı ve kısa tanıtımı editoryal oyun yorumudur; biyografi veya sabit güç puanı değildir. Sonuç unvanları gerçek ihale kayıtlarına dayanır. Ses varsayılan olarak kapalıdır; azaltılmış hareket seçeneği vardır.

**Moderatör sekmesi oyun boyunca açık kalmalı.** Host devri veya arka planda sunucu zamanlayıcısı bu sürümde yoktur.

## Kurulum

```bash
npm install --include=dev
# .env.local yoksa aşağıdaki komutla örneği kopyala; mevcut anahtarı ezmez.
test -e .env.local || cp .env.example .env.local
npm test
npm run test:syntax
npm run build
npm run dev
```

Firebase web config varsayılanları aynı kalır. `.env.local` ve Vercel sunucu ortamına gerçek `GROQ_API_KEY` yazılır; `NEXT_PUBLIC_` öneki kullanılmaz. Model varsayılanı `openai/gpt-oss-20b`'dir. Anahtarları Git'e ekleme.

Gerçek jürinin çalışması için Groq anahtarı ve servis erişimi gerekir. Tur/zar içerikleri gerektiğinde katalogdan üretilebilir; jüri isteği hata verirse sonuç/seri puanı değiştirilmeden tekrar deneme sunulur.

## Patch 02'yi kuran mevcut kullanıcılar

[`docs/PATCH-02.md`](docs/PATCH-02.md) dosyasını izle. **Yeni Firebase rules dosyası yayınlanmalı; eski rules boş oyunculu moderatör odalarını kabul etmez.**

```bash
npx --yes firebase-tools@latest deploy --only database --project kadro-party-game-51d0c
```

Eski odalar otomatik dönüştürülmez. Herkes sayfayı yenileyip yeni bir oda açmalıdır. Tek bilgisayarda online deneme için üç bağımsız tarayıcı profili/cihaz kullan: bir moderatör ve iki oyuncu. Aynı anonim kimliğin iki yarışmacı gibi davranması beklenmez.

## Yerel test modu

`NEXT_PUBLIC_GAME_MODE=local` ile Firebase'siz yerel oda senkronizasyonu kullanılabilir. LocalStorage/BroadcastChannel modu yalnız aynı tarayıcı profili içindeki sekmeler içindir; online multiplayer değildir. Farklı sekmeler farklı oyuncu kimliği alır. Gerçek jüri için yine sunucuda Groq anahtarı gerekir.

## Yapı

- `lib/game-engine.ts`: saf geçişler; moderatör ayrımı, çekilme, RPS, seri ve jüri kilidi.
- `lib/judging.ts`, `lib/series.ts`: ortak rubrik, doğrulama, toplamlar, eşitlik ve seri tablosu.
- `lib/ai/judge-content.ts`: kanonik karakter kontrolü ve tek jüri çağrısı.
- `lib/character-profiles.ts`, `lib/game-guide.ts`: arayüzden bağımsız oyun metinleri.
- `components/ResultShow.tsx`, `GameGuide.tsx`, `CharacterCard.tsx`, `SeriesBoard.tsx`: sunum bileşenleri.
- `firebase/database.rules.json`: yeni moderatör oda şeması.
- `tests/`: yerel TypeScript ile derlenen node:test testleri. Global veya makineye özel TypeScript yolu yoktur.

## Güvenlik sınırı

Bu, mevcut arkadaş grubu MVP mimarisini genişleten bir patch'tir; sunucu-otoriter güvenlik dönüşümü değildir. Oda üyelerinin Firebase yazma yetkisi geniştir ve AI endpoint'leri kapsamlı auth/rate-limit korumasına sahip değildir. Teknik bir oyuncu arayüzü atlatmayı deneyebilir. RPS seçimi arayüzde gizlenir, ancak veri düzeyinde commit–reveal yoktur. Rekabetçi/public yayın için sunucu doğrulaması, endpoint kotası, App Check ve gerçek emulator entegrasyon testleri gerekir.

Groq ağ/JSON hatasında puan üretilmez. Aynı turun kaydedilmiş sonucunu görüntülemek yeni istek yapmaz; başarısız bir AI çağrısını tekrar denemek yeni token harcayabilir. Eski teslimatların SHA256SUMS/verification dosyaları tarihsel kayıttır, bu patch'in doğrulaması değildir.
