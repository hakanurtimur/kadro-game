# Patch 02 — Moderatör, jüri ve üç turluk seri

Baz: `hakanurtimur/kadro-game`, commit `374303060c03ec268e2dafc97f8d4b72ce4f6579` (Patch 01 sonrası). Patch yalnız ilgili kaynak/test/belge dosyalarını değiştirir. `.env.local`, Firebase public config, API anahtarları, paket sürümleri ve kilit dosyası değişmez.

## Kapsam

Oynamayan moderatör, oyun içi yönerge ve ayrı yönerge metni; %50/%30/%20 kriterli jüri; ortak 5 aşamalı sonuç sunumu; gerçek satın alımlardan unvanlar; ihale bazlı çekilme ve parasız masada hızlı geçiş; katalog karakterleri için editoryal profiller; tema dokunuşları/kadro figürleri/isteğe bağlı ses/azaltılmış hareket; aynı odada 1 veya 3 turluk seri. Kaptan ve taktik mekaniği eklenmedi.

Jüri sonucu tam kadroları ve yalnız yarışmacıları kapsar. Modelin gönderdiği toplam veya kazanan ismi belirleyici değildir. Ağırlıklı puanı kod yeniden hesaplar, aynı toplamları ortak kazanan sayar. Yıldız karakter kendi kadrosundan seçilmek zorundadır. Gerçek Groq hatasında rastgele demo puanı verilmez. Ortak istek kilidi iki moderatör sekmesinin aynı turu aynı anda puanlamasını önlemeye yardımcı olur; kilit 60 saniye sonra tekrar denenebilir. Ağ hatasında kesin 'tek sağlayıcı çağrısı' garantisi yoktur; tekrar deneme token tüketebilir.

## Uygulama

Önce mevcut işini kaydet ve `git status --short` ile yerel değişiklikleri gözden geçir. Dosya çatışıyorsa zorla uygulama, dosyaları silme veya `git reset --hard` kullanma.

```bash
git apply --check ~/Downloads/kadro-02-moderator-juri-turnuva.patch &&
git apply --index ~/Downloads/kadro-02-moderator-juri-turnuva.patch &&
npm install --include=dev &&
npm test &&
npm run test:syntax &&
npm run build
```

Test/build başarısızsa devam etme. Başarılıysa **yeni rules dosyasını mutlaka yayınla**:

```bash
npx --yes firebase-tools@latest deploy --only database --project kadro-party-game-51d0c
```

Bu güncelleme veri silmez. Moderatörü ayrı kayıt olarak kabul eder; başlangıçta `players` boş olabilir. Kullanılan rules ifadeleri `hasChildren`, `child`, `parent`, `exists`, `isNumber`, `isString`, `isBoolean`, `val` ile sınırlıdır; `numChildren` yoktur. Gerçek Firebase deploy/emulator sonucu bu pakette doğrulanmış sayılmamalıdır.

```bash
git diff --cached --stat
git commit -m "feat: moderator table, jury reveal and tournament"
git push origin main
```

Oda şeması değiştiğinden **yeni oda açılır**. Eski oda devam ederken gizlice oyuncu eksiltme yapılmaz; yeni arayüz eski odayı yeni oda açmaya yönlendirir. Moderatör bir yarışmacı değildir: en az üç insan/bağımsız oturum gerekir.

## Kısa tarayıcı testi

1. Bir profil/cihazla oda oluştur: yalnız moderatör görünmeli, bütçe/kadro verilmemeli. Yönergeyi aç/kapat; Escape ile kapanmasını kontrol et.
2. İki başka bağımsız profil/cihazla katıl. Katılımcı sayısı 2 olmalı, evren havuzu moderatör hariç hesaplanmalı.
3. Üç turluk seri ve Kaos seç. Görev, evren ve %50/%30/%20 rubriğini incele. Karakter tanıtımlarını aç.
4. İlk ihalede oyuncu A teklif versin, B çekilsin. İhale erken kapansın; A'nın parası yalnız bir kez düşsün. B sonraki karta teklif verebilsin.
5. Her iki oyuncu parasını kadroları dolmadan harcasın. Bekleyen kartlar atlanıp RPS açılsın; moderatör seçim yapamasın. Beraberlikte yeniden seç, ardından ücretsiz havuzdan sırayla al.
6. Jüriyi çağır. Beş sahneyi diğer cihazlarda aynı sırayla gör. Hepsini göster düğmesi kullan; tekrar sahne göstermek yeni AI isteği yapmamalı. Geçerli API anahtarı yokken açık hata görünmeli, seri puanı eklenmemeli.
7. İkinci ve üçüncü turda bütçe/kadro sıfır, seri puanı korunmuş olmalı. Seriyi bitir, ortak puan durumunda ortak şampiyon gösterilsin. Yeni seri toplamları sıfırlasın.
8. Telefon genişliğinde kartlar, yönerge kaydırması, çekilme ve sonuç kontrollerini kontrol et. Ses yalnız açılırsa gelsin; sakin görünüm animasyonları kapatsın.

## Doğrulama ve sınırlar

Otomatik testler saf oyun geçişlerini ve sahte sağlayıcı yanıtlarıyla JSON doğrulamasını çalıştırır. Firebase rules testleri dosya/ifade kontrolleridir; emulator entegrasyon testi değildir. Gerçek React/Next production build, gerçek tarayıcı, canlı Firebase ve Groq denemesi bu ortamın npm DNS erişimi olmadığı için tamamlanamadı. Testler için ortamın TypeScript kurulumu proje-local bağlantıyla kullanıldı; bu bağlantı veya makineye özel yol patch'e dahil değildir.

Patch, public hile önleme veya dağıtık moderatör devri sağlamaz. Moderatör sekmesi açık kalmalıdır; Firebase'in saat farkı yalnız istemci saatini yaklaşık senkronlar, güvenilir bir sunucu hakemi değildir. Client state'e geniş yazma yetkisi ve endpoint kötüye kullanım riski ayrı güvenlik çalışması gerektirir.

## Başvurulan resmî teknik belgeler

- Firebase rules API: https://firebase.google.com/docs/reference/security/database
- Firebase saat farkı: https://firebase.google.com/docs/database/web/offline-capabilities
- Groq Chat Completions: https://console.groq.com/docs/api-reference
- Node module loader: https://nodejs.org/api/modules.html
