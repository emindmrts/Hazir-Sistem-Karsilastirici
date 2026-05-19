import { Heart, ExternalLink, Mail } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/40 bg-background/50 backdrop-blur-md">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Brand Segment */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/siyahlogo.png"
                alt="PCKARSILASTIR.com"
                className="h-11 w-auto object-contain dark:hidden"
              />
              <img
                src="/beyazlogo.png"
                alt="PCKARSILASTIR.com"
                className="h-11 w-auto object-contain hidden dark:block"
              />
            </div>
            <p className="max-w-[280px] text-xs leading-relaxed text-muted-foreground">
              En ucuz, en güncel ve en güçlü hazır sistem bilgisayarları anlık olarak tarar, karşılaştırır ve en mantıklı tercihi yapmanızı sağlar.
            </p>
            <div className="flex items-center gap-3.5 pt-1">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                aria-label="GitHub"
              >
                <svg
                  className="h-4.5 w-4.5"
                  aria-hidden="true"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="mailto:zenith31269@gmail.com"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                aria-label="Email"
              >
                <Mail className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

          {/* Column 2: Retailers */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
              Desteklenen Mağazalar
            </span>
            <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
              {[
                { name: "Vatan Bilgisayar", url: "https://www.vatanbilgisayar.com" },
                { name: "Sinerji Bilgisayar", url: "https://www.sinerji.gen.tr" },
                { name: "İncehesap", url: "https://www.incehesap.com" },
                { name: "Itopya", url: "https://www.itopya.com" },
                { name: "Gaming.Gen.TR", url: "https://www.gaming.gen.tr" },
                { name: "PCKolik", url: "https://pckolik.com" },
              ].map((store) => (
                <li key={store.name}>
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors group"
                  >
                    {store.name}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
              Proje Desteği
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bu karşılaştırma sistemi tamamen bağımsız ve ücretsiz bir açık kaynak projesidir. Geliştirilmesine katkı sağlamak isterseniz destek olabilirsiniz.
            </p>
            <div className="pt-1">
              <a
                href="https://kreosus.com/emindmrts"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300"
              >
                <Heart className="h-3.5 w-3.5 fill-current" />
                Destek Ol
              </a>
            </div>
          </div>
        </div>

        {/* Separator & Bottom Row */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-[11px] text-muted-foreground sm:flex-row">
          <p>© {currentYear} PCKARSILASTIR.com. Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-1">
            <span>Made with</span>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
            <span>for PC Builders</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
