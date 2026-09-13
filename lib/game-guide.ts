import type { RoomState } from "./types";
export const GUIDE_SECTIONS = [
 {title:"1 · Masada kim ne yapar?",text:"Odayı kuran kişi moderatördür; oynamaz, para veya karakter almaz ve puanlanmaz. Oyuna başlamak için moderatör dışında 2–8 oyuncu gerekir. Moderatör görevi ve evreni zarlar, ihaleyi başlatır, jüriyi çağırır ve sonuç sahnelerini yönetir. Oyun boyunca moderatör sekmesi açık kalmalıdır."},
 {title:"2 · Ne için yarışıyoruz?",text:"Herkes aynı oyun parası ve kadro slotuyla başlar. Bu para gerçek para değildir. Amaç, ekrandaki görevi en iyi yapabilecek kadroyu kurmaktır. Jüri rubriği baştan açıktır: göreve uygunluk %50, ekip uyumu %30, çok yönlülük %20. Harcanan veya elde kalan para puan değildir. Karakter profilleri oyuna özel editoryal yorumlardır; sabit güç puanı yoktur."},
 {title:"3 · Açık artırma ve çekilme",text:"Her karakterin ihalesi 15 saniye sürer. Son 3 saniyede gelen teklif süreyi yeniden 3 saniyeye tamamlar. En yüksek teklif kazanır; para yalnız ihale kapanınca düşer. İhaleden çekil seçimi sadece o karakter için geçerlidir ve geri alınamaz. En yüksek teklif sahibi teklifini geri çekemez. Teklif verebilecek rakip kalmadığında ihale erken kapanır."},
 {title:"4 · Kimse almazsa?",text:"Teklif almayan karakter satılmayanlar havuzuna geçer. Boş slotu ve parası olan oyuncu kalmadığında diğer kartlar bekletilmeden bu havuza eklenir. İhale sonunda en az iki kişinin kadrosu eksikse taş-kağıt-makas ilk seçeni belirler. Bir kişi eksikse doğrudan o seçer; herkesin kadrosu doluysa bu aşama atlanır. Seçimler ücretsizdir; boş slotu olan oyuncular koltuk sırasıyla seçer."},
 {title:"5 · Kaos ve jüri",text:"Kaos modunda her üç ihale sonunda bir olay kartı çıkabilir. Kartı okumak için 5 saniye ara verilir. Görev değişirse finalde ekranda kalan son görev puanlanır. Jüri yoruma açıktır; model kriterleri değerlendirir, toplamı ve kazananı kod hesaplar. Aynı toplam eşit derecedir. Jüri sonucu kaydedilir; sahneleri tekrar açmak yeni AI çağrısı yapmaz. API hatasında puan uydurulmaz, tekrar deneme gösterilir."},
 {title:"6 · Tek tur / üç turluk seri",text:"Seri seçimi ilk lobide yapılır. Üç turluk seride herkesin parası ve kadrosu her tur sıfırlanır, yalnız turnuva puanı taşınır. N oyuncuda birinci N, ikinci N−1 puan alır; eşit puanlılar aynı derece ve puanı paylaşır. Örneğin 4 oyuncuda iki ortak birinci 4'er puan alır, sonraki oyuncu üçüncü olarak 2 puan alır. Üç turun toplamı seriyi belirler; toplamlar da eşitse ortak şampiyon vardır. Katılımcılar ilk tur önizlemesinde kilitlenir."},
] as const;
export function stageHelp(room:RoomState):string {
 switch(room.status) {
  case 'lobby':return 'Moderatör masayı yönetir; yarışacak oyuncular oda koduyla katılır.';
  case 'preview':return 'Görev, evren ve puanlama kriterlerini incele. Zarları moderatör kullanır.';
  case 'auction':return 'Bir karaktere teklif ver veya bu ihaleden çekil. En yüksek teklif geri alınmaz.';
  case 'rps':return 'Eksik kadrolar tamamlanacak. Taş-kağıt-makas kazananı bedava havuzdan ilk seçer.';
  case 'leftovers':return 'Sırası gelen oyuncu bedava bir karakter seçer. Dolu kadrolar sıradan çıkar.';
  case 'results':return 'Kadrolar tamam. Jüri kriterlerini ve finali moderatör adım adım açar.';
 }
}
