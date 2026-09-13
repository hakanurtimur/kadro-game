# KADRO Patch 02: moderatör masası

Onaylanan kapsam: kullanıcının 2, 3, 4, 5, 6 numaralı seçimleri, yönerge ve oynamayan host. Kaptan/taktik seçilmedi; eklenmez.

- Yeni odalar schemaVersion 2: moderator {uid,nickname} ayrı, players 0–8. Başlamak için iki gerçek oyuncu gerekir. Moderatör bütçe, kadro, teklif, RPS, ücretsiz seçim veya jüri sıralamasında yer almaz. Eski odaları sessizce dönüştürmeyiz; eski akış testleri korunur, yeni oda önerilir.
- Yönerge ana sayfa ve her oda ekranından erişilebilir; 15sn, +3sn teklif uzatması, çekilme, RPS koşulu, bedava seçim, kaos ve seri puanları anlatılır.
- Jüri rubriği: göreve uygunluk 50%, ekip uyumu 30%, çok yönlülük 20%. AI sadece kriter ve yorum döndürür, kod toplamı/sıralamayı hesaplar. Eşit toplam eşit derece. Kaptan/taktik veya bütçeye puan yok. Kanonik katalog ve karakter ID'leri doğrulanır. API hatası sahte AI puanına dönüşmez; açık hata ve kontrollü tekrar. Yerel demosunda sonuç açıkça demo etiketlidir.
- Sonuç bir kez kaydedilir; paylaşılan 0–4 sahne adımını moderatör ilerletir veya sonuca atlar. Puanlar tekrar AI çağrısıyla değişmez. En pahalı transfer ve harcama unvanları işlem kayıtlarından, yıldız yorumu yalnız doğru kadro karakterinden gelir.
- Çekilme mevcut ihale için kalıcıdır, en yüksek teklif geri alınmaz. Son rakip çekildiğinde ihale erken kapanır. Boş slotu ve parası olan kimse kalmadığında bekleyenler unsold olur, RPS/draft başlar. Kaos 5sn arası korunur. Yeni işlem eski karakteri hedefleyemez.
- Katalog karakter kartlarına editoryal oyun profili, iki güçlü yön, zaaf eklenir; sabit güç skoru yok. Tema aksesuarları ve kadroda minik figürler; azaltılmış hareket ve isteğe bağlı ses. Mevcut pastel kimlik korunur.
- Lobi seçimi tek tur veya üç tur. Katılımcılar ilk önizlemede kilitlenir; sonraki turlarda bütçe/kadro sıfırlanır. Puan = oyuncu sayısı - derece + 1; eşitler aynı puanı alır. Sonuç kaydı tur kimliğiyle bir kez yapılır. Beraberlikte ortak lider, gizli tiebreak yok. Yeni seri açık host işlemiyle sıfırlanır.
- Firebase rules moderatörün oyuncusuz oda oluşturup yönetmesini kabul etmelidir; mevcut arkadaş grubu MVP güvenlik sınırı korunur, server-authoritative dönüşüm bu yamanın konusu değildir. Canlı rules yayını kullanıcı tarafından yapılır. Secret/config dosyalarına dokunulmaz.
- Bağımlılık eklenmez. Testler yalnız yerel TypeScript kullanır; makineye özel /opt yolu kaldırılır. Gerçek build/online test yapılmayan işler raporda açıkça belirtilir.
