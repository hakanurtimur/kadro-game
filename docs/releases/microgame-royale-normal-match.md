# Microgame Royale — normal maç

## Kullanıcı akışı

2–6 kişi aynı odaya katılır. Oda sahibi tek bir **Maçı başlat** düğmesiyle maçı açar. Dokuz kayıtlı oyundan sekizi tekrar etmeyecek şekilde karıştırılır. Test Mode ve tek oyun seçme paneli genel kullanıcı arayüzünden kaldırılmıştır.

Her tur mevcut yönergesini ve geri sayımını korur. Tur sonunda bütün oyuncular aynı toplam puan tablosunu görür; 5 saniyelik aradan sonra sıradaki oyun otomatik başlar. Sekizinci turun ardından şampiyon ekranı kalır. Puanlar eşitse birincilik paylaşılır. Oda sahibi **Rövanş** başlatabilir veya lobiye dönebilir. Rövanş puanları sıfırlar; oyuncular ve oda kodu korunur.

Tur oyunlarının mevcut 0–100 puanlaması değiştirilmedi. Kimse maçtan elenmez. Maksimum maç puanı 800'dür. Yeni kayıt/servis/ortam değişkeni eklenmedi. Bomba, alan fiziği ve diğer yedi mini oyunun oyun dosyaları aynı kalır.

## Senkronizasyon

- `match.order`: tek sefer seçilen sekiz oyunun sırası.
- `match.index`: 0–7; `roundNumber` bütün rövanşlarda artmaya devam eder.
- `match.history`: tur puanları ve toplamlar.
- `match.nextAt`: sonuç ekranı için ortak sunucu-saati tabanlı bitiş zamanı.
- Tur bitirme ve geçiş işlemleri mevcut oda transaction'ında yapılır. Aynı tur tekrar puan yazmaz; eski tur callback'i sonraki tura uygulanmaz.
- Geçişi yalnız host değil herhangi bir mevcut katılımcı tetikleyebilir. Host sekmesi arka plandaysa kalan katılımcı maçı ilerletebilir. Herkes bağlantısızsa sunucu tarafında zamanlayıcı yoktur; bir katılımcı dönünce tur bitirilir/sonraki tur tam yönergesiyle başlar.
- Patch 13'ten kalan tek oyun odası devam eden turunu bitirebilir; ardından host lobiye dönüp yeni normal maç açar. Güncellemeden sonra iki cihazı da yenilemek ve yeni oda açmak önerilir.

## Yayın ve veri güvenliği sınırları

Bu, mevcut Firebase istemci-yönetimli arkadaş odaları mimarisidir; rekabetçi/ödüllü oyunlar için hileye dayanıklı bir sunucu otoritesi değildir. Kurallar kimlik, oda üyeliği ve veri şekli denetimlerini korur ve maç şemasını ekler. İstemci kodu ve Firebase proje yapılandırması herkese açıktır. Test panelini kaldırmak tek başına bir anti-cheat önlemi değildir.

Uygulayıcı sadece `microgameRooms/$code/match` doğrulamasını ekler. KADRO, Ludo, TAŞIR, sosyal ve canlı pozisyon kurallarını değiştirmez. Firebase deploy, yerel dosyanın tamamını yayınlar: mevcut kuralların zaten güncel olması gerekir. Canlıya alınırken koddan önce yeni kurallar yayınlanmalıdır.

## Yerel doğrulama

```bash
npm test && npm run test:syntax && npm run build
npm run dev -- --hostname 0.0.0.0 --port 3003
```

Firebase modunda PC ve telefondan aynı yeni odaya gir. Sekiz turun otomatik tamamlandığını, puanların eşleştiğini, host sekmesi arka plandayken diğer katılımcının ilerleyebildiğini ve rövanşın sıfır puanla başladığını kontrol et. Mobilde tarayıcı ses/dokunma izinleri ve ağ gecikmesi gerçek cihazda ayrıca kontrol edilmelidir.

Production için `NEXT_PUBLIC_GAME_MODE=local` zorlaması açık olmamalı; aksi halde iki cihaz aynı odada senkronize olmaz.

## DÜMBÜK integration — 2026-09-18

- Kept the DÜMBÜK home page and existing game art. Match lobby, progress, standings and rematch screens now use the same paper, black outlines and acid highlights.
- Ludo allows available color selection in the lobby. Color changes reserve the corresponding board seat; joins use the first free seat.
- Leaving requires a native modal confirmation. All departing pawns disappear, turn order and host ownership pass to remaining players, and the last remaining player wins. Empty rooms finish and reject new joins.
- Finished Ludo pawns occupy four separate slots in their own colored center bay. Exact-roll movement rules remain unchanged.
- The earlier iPhone audio experiment is intentionally excluded. Its diff and test are saved in `/tmp/dumbuk-iphone-pending.patch` and `/tmp/dumbuk-iphone-audio.test.mjs`.

Validation completed:

- `npm run check`: 243 tests passed, syntax passed.
- `npm run build`: passed.
- Actual Firebase Database emulator: eight unique rounds, guest-driven settlement and progression, final, host-only rematch and zeroed scores; Ludo color ownership, host transfer, departure, empty room and former-member denial passed.
- Two browser sessions using the local store completed an unaccelerated eight-round match and started a rematch in the same room.
- Ludo UI: occupied colors disabled, cancel retains all eight pawns, confirmed host departure removes four pawns and declares the remaining player the winner.
- Responsive visual check at 390 px: 16 finished pawns remain in separate colored bays without page overflow.
- Firebase rules deployed successfully to `kadro-party-game-51d0c`.

Physical iPhone–PC testing and production deployment verification remain release gates; local browser sessions are not a substitute for physical devices.

To repeat the emulator check, start Database Emulator on `127.0.0.1:9010` with project `demo-dumbuk`. Install `@firebase/rules-unit-testing@4` and `firebase@11` in a temporary directory, then run:

```sh
FIREBASE_TEST_DEPENDENCIES=/path/to/test-dependencies node scripts/verification/patch14-rtdb.mjs
```

The verifier explicitly connects to localhost and never uses production credentials.
