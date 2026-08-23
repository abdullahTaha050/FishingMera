# Mera gizlilik politikası — yayın taslağı

Son güncelleme: 23 Ağustos 2026.

> Mağaza yayını öncesi doldurulması zorunlu alanlar: `[VERİ SORUMLUSU TİCARİ UNVANI]`, `[POSTA ADRESİ]`, `[DESTEK E-POSTASI]`, `[POLİTİKA URL'Sİ]`. Bunlar proje sahibinin hukuki kimliğine bağlı olduğundan kaynak kodda uydurulmamıştır. Bu metin hukuki danışmanlık değildir; Türkiye/KVKK ve hedef mağaza bölgeleri için sahibin hukuk incelemesinden geçmelidir.

## Veri sorumlusu ve iletişim

Mera mobil uygulamasının veri sorumlusu `[VERİ SORUMLUSU TİCARİ UNVANI]`dır. Gizlilik talepleri `[DESTEK E-POSTASI]` adresine veya `[POSTA ADRESİ]` adresine iletilebilir.

## İşlenen veri kategorileri ve amaçları

- Hesap verisi: Supabase'in ürettiği kullanıcı kimliği ve isteğe bağlı e-posta; oturum açma, cihazlar arası devamlılık ve kayıt sahipliği için.
- Konum: cihazın anlık kesin konumu, kullanıcı meraları ve isteğe bağlı araç konumu; yakındaki meraları sıralama, kuş uçuşu mesafe/yön ve kayıt işlevleri için. Kesin konum analitik olaylarına veya uygulama günlüklerine yazılmaz.
- Balıkçılık ve tercih verisi: deneyim, av tipi, hedef balık, mesafe, takım profili, favoriler, av raporları, geri bildirim ve kullanıcı meraları; kişiselleştirme, çevrimdışı çalışma ve seçilmişse senkronizasyon için.
- Fotoğraf: yalnız kullanıcı seçtiğinde rapor veya meraya eklenir; JPEG olarak yeniden kodlanır ve EXIF metadatası çıkarılır.
- Teknik veri: kişisel veri içermeyecek şekilde tasarlanmış rota/durum/süre günlükleri ile konum anahtarlarını reddeden sınırlı analitik olaylar; güvenilirlik, hata ayıklama ve kötüye kullanım kontrolü için.

## Saklama yeri, paylaşım ve hizmet sağlayıcılar

Temel kayıtlar önce cihazdaki SQLite veritabanında tutulur. Cloud yapılandırıldığında hesap ve seçilen kayıtlar Supabase altyapısında, özel dosyalar sahip-yolu erişim kurallı özel depolarda tutulur. Hava/deniz koşulları Open-Meteo'dan alınır. Kullanıcının ayrıca başlattığı yeni mera araştırması sunucu tarafında OpenAI'a genel arama sorguları gönderir; kesin cihaz konumu günlüklere yazılmaz. Çevrimdışı harita bağlamı OpenStreetMap katkıcı verisinden türetilmiştir.

Veriler satış amacıyla paylaşılmaz. Kamuya açık veya yaklaşık paylaşım ancak kullanıcının seçimiyle ve kalıcı hesapla mümkündür. Özel mera kesin koordinatı herkese açık sorgulardan ayrıdır.

## Saklama süresi ve silme

Cloud verileri hesap aktifken veya işlev/güvenlik/yasal yükümlülük için gerektiği sürece tutulur. Kullanıcı Profil > Hesap ve kişisel verileri sil alanında `HESABIMI SIL` yazarak Supabase Auth kimliğini, özel depolardaki fotoğrafları ve sahip olduğu cloud kayıtlarını; ayrıca cihazdaki kişisel kayıt ve fotoğrafları silebilir. Cloud silme çevrimiçi bağlantı gerektirir ve başarısız olursa cihazdaki kayıtlar, tekrar denemeye izin vermek için korunur. Uygulamayla paketlenen genel veri kişisel değildir ve uygulama kaldırılana kadar kalabilir.

## Haklar, güvenlik ve çocuklar

İlgili kişi, yürürlükteki mevzuat kapsamındaki erişim, düzeltme, silme ve diğer taleplerini yukarıdaki iletişim kanalına gönderebilir. Aktarımda TLS, veri erişiminde kullanıcı sahipliği ve satır-seviyesi politikalar kullanılır; hiçbir sistem mutlak güvenlik garantisi vermez. Mera çocuklara yönelik tasarlanmamıştır.

## Değişiklikler

Politika önemli ölçüde değişirse sürüm tarihi güncellenir ve uygun uygulama/mağaza kanallarından bildirim yapılır. Yayımlanmış son sürüm `[POLİTİKA URL'Sİ]` adresinde bulunur.
