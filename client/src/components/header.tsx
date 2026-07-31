import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ModeToggle } from "./mode-toggle"
import { Heart, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface HeaderProps {
    searchValue?: string
    onSearchChange?: (val: string) => void
}

export function Header({ searchValue, onSearchChange }: HeaderProps) {
    const logoRef = useRef<HTMLAnchorElement>(null)
    const searchRef = useRef<HTMLDivElement>(null)
    const navRef = useRef<HTMLElement>(null)
    const shadowRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out", force3D: true } })
        tl.fromTo(logoRef.current, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 })
            .fromTo(searchRef.current, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.45 }, "-=0.3")
            .fromTo(navRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4 }, "-=0.3")

        // Scroll-driven header shadow — boxShadow her frame'de paint tetikler;
        // bunun yerine bir overlay katmanin opacity'si animasyonlanir (composited).
        // Pasif scroll listener kullanilir (ScrollTrigger'a gerek yok, reflow yok).
        let ticking = false
        const updateShadow = () => {
            ticking = false
            if (shadowRef.current) {
                const t = Math.min(window.scrollY / 40, 1)
                shadowRef.current.style.opacity = String(0.15 + t * 0.85)
            }
        }
        const onScroll = () => {
            if (!ticking) {
                ticking = true
                requestAnimationFrame(updateShadow)
            }
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        updateShadow()
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background">
            <div
                ref={shadowRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
                style={{ opacity: 0.15 }}
            />
            <div className="px-4 md:px-8 flex h-14 md:h-20 max-w-screen-2xl mx-auto items-center gap-3 md:gap-4">
                {/* Brand */}
                <a ref={logoRef} href="/" className="flex items-center shrink-0 opacity-0 group h-10 md:h-16 lg:h-20 w-auto">
                    {/* Light mode logo (siyahlogo.png) */}
                    <img
                        src="/siyahlogo.png"
                        alt="PCKARSILASTIR.com"
                        width="400"
                        height="120"
                        className="h-full w-auto object-contain dark:hidden transition-opacity duration-300 group-hover:opacity-80 py-1 md:py-2 lg:py-3"
                    />
                    {/* Dark mode logo (beyazlogo.png) */}
                    <img
                        src="/beyazlogo.png"
                        alt="PCKARSILASTIR.com"
                        width="400"
                        height="120"
                        className="h-full w-auto object-contain hidden dark:block transition-opacity duration-300 group-hover:opacity-80 py-1 md:py-2 lg:py-3"
                    />
                </a>

                {/* Search */}
                <div ref={searchRef} className="flex-1 md:max-w-xl md:mx-auto opacity-0">
                    <div className="relative group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <Input
                            id="header-search"
                            type="search"
                            placeholder="Sistem ara..."
                            className="pl-10 pr-9 h-10 bg-muted/50 border-border/60 rounded-xl [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden focus-visible:ring-0"
                            value={searchValue ?? ""}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                        />
                        {(searchValue ?? "") && (
                            <button
                                type="button"
                                onClick={() => onSearchChange?.("")}
                                aria-label="Aramayı temizle"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right nav */}
                <nav ref={navRef} className="flex items-center gap-1 shrink-0 opacity-0">
                    <a
                        href="https://kreosus.com/emindmrts"
                        target="_blank"
                        rel="nofollow noreferrer"
                        className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all duration-200"
                    >
                        <Heart className="w-4 h-4" />
                        Destek Ol
                    </a>
                    <a
                        href="mailto:zenith31269@gmail.com"
                        className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                        İletişim
                    </a>
                    <ModeToggle />
                </nav>
            </div>
        </header>
    )
}
