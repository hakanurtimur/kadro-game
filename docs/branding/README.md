# DÜMBÜK marka paketi

DÜMBÜK platformun adıdır. KADRO, Kızma Birader, TAŞIR ve Microgame Royale oyun adlarıdır. KADRO logosu yerine platform genelinde DÜMBÜK kullanılır; KADRO oyun metinleri korunur.

## Tasarım

Onaylanan arsız karalama çizimi: siyah keçeli kalem hissi, muzip surat, fosforlu sarı vurgu. Logo harfleri özel çizimdir; bir font dosyası değildir. Arayüzde mevcut Avenir Next / Segoe UI / sans-serif sistem fontları korunur; yeni harici font isteği yoktur.

- Mürekkep: `#191919`
- Kırık beyaz: `#FFFBEF`
- Sarı: `#DAFA28`
- Oyun yüzeyleri: lila `#E9E0FA`, şeftali `#FFDECA`, mint `#D9EEE1`, sarı `#F0F2B4`

Logonun etrafında en az bir Ü noktası çapı kadar boşluk bırakın. Yatay logo 150px altında kullanılacaksa maskota geçin. Logoyu esnetmeyin, döndürerek okunurluğu bozmayın veya gölge eklemeyin. Küçük favicon sürümleri ayrıca 16/32/48px olarak dışa aktarılmıştır.

## Dosyalar — public/brand

- `logo-horizontal.svg/png`: şeffaf yatay ana logo.
- `logo-stacked.svg/png`: dikey logo.
- `mascot.svg/png`: tek başına maskot.
- `wordmark.svg/png`: yalnız yazı.
- `logo-black.svg/png`, `logo-white.svg/png`: tek renk sürümler.
- `logo-on-dark.svg/png`: koyu zeminde kullanıma hazır sürüm.
- `favicon.svg`, `favicon.ico`, `icon-16/32/48.png`: tarayıcı sekmesi.
- `apple-touch-icon.png`: 180px Apple dokunmatik ikon.
- `icon-192.png`, `icon-512.png`: uygulama ikonları.
- `icon-maskable-512.png`: güvenli alanlı maskelenebilir ikon.
- `og-1200x630.png`, `og.svg`: sosyal paylaşım görseli.
- `manifest.json`: dosya boyutları ve ölçüler.
- `dumbuk-brand-kit.zip`: tüm paketin indirilebilir kopyası.

SVG logolar bitmap gömmez; onaylanan raster çizimden Potrace ile oluşturulan gerçek vektör yollarıdır. PNG sürümleri bu yollardan oluşturulmuştur. Kaynak görsel `docs/branding/approved-concept.png`. Onaylı çizim ImageGen ile üretilmiştir; marka tescili/isim uygunluğu araştırması bu paketin kapsamına dahil değildir.

## Yeniden dışa aktarma

Potrace yalnız tasarım aracı olarak geçici klasöre kurulur; uygulamaya çalışma zamanı bağımlılığı eklenmez:

```sh
npm install --prefix /tmp/dumbuk-brand-tools potrace@2.1.8 --no-audit --no-fund
node scripts/branding/export.cjs
```

Farklı bir kurulum için `BRAND_TOOLS_DIR` kullanın. `sharp` mevcut Next.js bağımlılık ağacından gelir. Yeniden dışa aktardıktan sonra rehberi ve ZIP'i de güncelleyin.

## Entegrasyon

Ana sayfa DÜMBÜK kimliğini kullanır; oyunların mekanikleri ve kayıt anahtarları korunur. Next.js metadata, Open Graph, Twitter card, favicon, Apple touch icon ve web manifest tanımlanmıştır. Vercel dışında yayınlanırken `NEXT_PUBLIC_SITE_URL` tam HTTPS adresi olarak ayarlanmalıdır. Web manifest uygulama ikonlarını tanımlar; çevrimdışı oynama vaat etmez.
