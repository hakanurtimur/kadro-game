# KADRO — Patch 01: Evren eşleşmesi + Kaos modu

Temel alınan GitHub sürümü: `hakanurtimur/kadro-game`, `e573e983002df93d98c2675a691a1633c2500ef9`.
Bu dosya bir yeniden kurulum değil, mevcut projeye uygulanan değişikliklerin notudur.

## Ne değişti?

### Evren ve karakterler

Önceki `makePool`, seçili evrenin adaylarına genel Türk dizisi havuzunu da ekleyip tamamını karıştırıyordu. Kategori zarında eksik AI listesi de başka bir kategorinin fallback karakterleriyle tamamlanıyordu. İki yol da kaldırıldı.

`lib/character-catalog.ts` tek karakter/evren kaynağıdır. AI desteklenen ve gerekli büyüklüğü karşılayan evrenlerden seçer. Tercih ettiği karakterlerin adları ve lakapları katalog üyeliğiyle eşleştirilir. LLM'nin `source` alanını doğru yazmış olması tek başına kabul sebebi değildir. Eksikler yalnızca seçili evrenin kendi kataloğundan tamamlanır. Kanonik adlar tekilleştirilir; örneğin Pargalı İbrahim Paşa ve İbrahim Paşa iki farklı karakter değildir.

İlk sürümde desteklenen evrenler mevcut sekiz katalogdur: Türk Dizi Evreni, Suç & Mafya Dizileri, Aşk & Dram Dizileri, Komedi Dizileri, Muhteşem Yüzyıl, Kurtlar Vadisi, Ezel, Aşk-ı Memnu. Masa büyüklüğünü karşılamayan kataloglar o masa için seçime girmez. Yeni evren eklemek için adını ve gerçek karakter listesini kataloğa eklemek gerekir. Bu, rastgele bir AI evren başlığını doğrulamadan kabul etmeye kıyasla bilinçli bir kapsam daraltmasıdır.

Muhteşem Yüzyıl listesi 25 karaktere çıkarıldı. Yeni eklenen isimler için yayıncı referansları:

- https://www.showtv.com.tr/oyuncu/cansu-dere/5121
- https://www.showtv.com.tr/oyuncu/ezgi-eyuboglu/5113
- https://www.showtv.com.tr/dizi/haber/989411-saraya-prenses-geliyor
- https://www.showtv.com.tr/dizi/haber/982368-ilk-raund-pargalinin

Diğer katalogların büyük bölümü önceki sürümden korunmuştur; bu patch tüm katalog için bağımsız bir ansiklopedik doğrulama iddiası taşımaz. Üyelik ve tekilleştirme testleri bu yerel kataloğa karşı yapılır.

Aynı evrende yeni bir karakter kalmadıysa API 409 ve açıklayıcı hata verir. Sahte "Sürpriz Dizi Karakteri" yaratılmaz; zar hakkı düşmez. Alternatif yeterli evren yoksa aynı evren gizlice tekrar döndürülmez.

### Kaos

Lobide veya tur önizlemesinde host **Klasik / Kaos** seçer. Varsayılan Klasik; eski odalar da Klasik olarak yorumlanır. Tur sırasında mod değiştirilemez. Kaos açıkken, oyun devam ediyorsa her 3 kapanan ihaleden sonra tek olay uygulanır; ardından 5 saniyelik okuma arası ve 15 saniyelik normal ihale başlar. Arada teklif verilemez ve host ihaleyi erken kapatamaz. Herkesin kadrosu dolduysa veya son ihale bittiyse yeni kart için oyun uzatılmaz.

Dört kart:

- **Ekonomik kriz:** Kalan bakiyenin %20'si, aşağı yuvarlanarak kesilir.
- **Miras:** En az parası olanlara +15. Eşitlikte hepsine; bakiye en fazla 500.
- **Takas gecesi:** Kadrosu olan oyuncuların son karakteri koltuk sırasındaki bir sonraki oyuncuya geçer. Kart sayısı ve bakiyeler değişmez. En az iki kadro yoksa miras uygulanır. Eski ihale bedeli veri kaydında korunur, yeni ödeme alınmaz; arayüzde TAKAS yazar.
- **Senaryo ters köşe:** Kısa hazır görevlerden farklı biri seçilir; final jüri güncel görevi değerlendirir.

Kart sırası tur başlangıcındaki tohumdan deterministik olarak türetilir. Firebase transaction tekrarları farklı rastgele sonuçlar üretmez. Aynı ihale için iki kart uygulanmaz. Olay geçmişi odada tutulur ve finalde görülebilir. Kartların kendisi Groq çağrısı yapmaz; fazladan AI token tüketmez.

## Değişmeyenler

`.env.local`, `.env.example`, Firebase config, Database Rules, package.json ve bağımlılıklar değiştirilmez. Yeniden Firebase projesi kurmak veya yeni anahtar üretmek gerekmez. Bu patch uzaktaki GitHub reposuna otomatik commit/push yapmaz.

Havuz sayısı formülü hâlâ `oyuncu * slot + max(oyuncu, 4)`; 2 oyuncu / 5 slot için 14 korunur. RPS, ihale sonunda en az iki eksik kadro ve satılmamış karakter varsa açılmaya devam eder. Token sayacı ve ayrı Kapıştır/Felaket oyunları bu patch'e dahil değildir.

## Uygulama

Mevcut maçları bitirin; yeni sürümden sonra bütün oyuncular sayfayı yenileyip yeni oda/tur açsın. Eski tarayıcı bundle'larını aynı maça karıştırmayın.

Proje kökünde, dosya Downloads'a indirildiyse:

```bash
git apply --check ~/Downloads/kadro-01-evren-kaos.patch &&
git apply --index ~/Downloads/kadro-01-evren-kaos.patch &&
npm test &&
npm run build
```

İlk komut uyumluluğu kontrol eder. `--index`, uygulanan patch dosyalarını stage eder; ilgili dosyalardaki kaydedilmemiş/stage edilmemiş değişikliklerle çakışma varsa durur. `--reject`, force push, geçmiş silme veya `.git` silme kullanmayın. Önceden stage ettiğiniz ilgisiz değişiklikler varsa commit öncesi onları ayrı ele alın.

Test ve build başarılıysa:

```bash
git diff --cached --stat
git commit -m "feat: strict character universes and optional chaos mode"
git push origin main
```

`git apply --check` davranışı: https://git-scm.com/docs/git-apply

## Doğrulama ve sınırlar

Patch hazırlanırken Node 22.16.0 üzerinde otomatik oyun motoru/katalog/servis testleri çalıştırıldı. API servis testleri sahte provider yanıtlarını sınırda enjekte eder; gerçek veri normalleştirme, hata, fallback ve oyun geçişleri çalışır. Buna 60 farklı karma teklifli maç simülasyonu dahildir. Syntax kontrolü, TypeScript çekirdek tip kontrolü ve patch uygulama/geri alma doğrulaması ayrı raporlanır.

Bu ortam npm registry DNS erişimini sağlayamadı. Dolayısıyla production Next.js build, tam uygulama tip kontrolü, tarayıcıda responsive/e2e inceleme, canlı Firebase çoklu cihaz senkronizasyonu ve gerçek Groq çağrısı bu teslimatta doğrulanmış değildir. `npm run build` sonucunu kendi kurulumunuzda veya Vercel'de kontrol edin. Yeni env veya bağımlılık gerekmez.

Bu bir server-authoritative güvenlik dönüşümü değildir. Önceki istemci tabanlı oda işlemleri, host zamanlayıcısı, API yetkilendirme sınırları ve RPS gizlilik modeli korunur. Public/rekabetçi kullanımdan önce bunlar ayrıca sertleştirilmelidir; oyun motoru validasyonu tek başına kötü niyetli doğrudan Firebase yazımlarını engellemez.
