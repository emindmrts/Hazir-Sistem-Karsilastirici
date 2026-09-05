import { versusCpuSlug } from "./versus"

/**
 * epey.com CPU ürün sayfaları slug-only çalışır (canlı doğrulandı):
 *   https://www.epey.com/islemci/amd-ryzen-5-7500f.html  → 200
 *   https://www.epey.com/islemci/intel-core-ultra-5-225f.html → 200
 *
 * Slug kuralı versus ile birebir aynı (marka-seri-model, küçük harf,
 * tireli) olduğundan builder yeniden kullanılır.
 *
 * NOT: epey İKİLİ kıyas URL'leri dahili ürün ID'si ister
 * (/islemci/karsilastir/742685-890936/slug_slug/ → ID'siz 404).
 * O yüzden pairwise değil, model-bazlı ürün sayfasına bağlanıyoruz.
 * GPU'da çip-seviyesi sayfa yok (AIB modele özel listeler:
 * msi-geforce-rtx-4060-... gibi), bu yüzden GPU tarafı versus
 * pairwise bağlantısı olarak kalır.
 */
export function epeyCpuUrl(cpu?: string, marka?: string): string | null {
    const slug = versusCpuSlug(cpu, marka)
    return slug ? `https://www.epey.com/islemci/${slug}.html` : null
}
