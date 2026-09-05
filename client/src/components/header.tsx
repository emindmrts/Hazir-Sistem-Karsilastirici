import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ModeToggle } from "./mode-toggle"
import { Search, Heart, Bookmark } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useFavorites } from "@/hooks/use-favorites"

interface HeaderProps {
    searchValue?: string
    onSearchChange?: (val: string) => void
}

export function Header({ searchValue, onSearchChange }: HeaderProps) {
    const logoRef = useRef<HTMLAnchorElement>(null)
    const searchRef = useRef<HTMLDivElement>(null)
    const navRef = useRef<HTMLElement>(null)

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
        tl.fromTo(logoRef.current, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 })
            .fromTo(searchRef.current, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.45 }, "-=0.3")
            .fromTo(navRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4 }, "-=0.3")
    }, [])

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
            <div className="px-4 md:px-8 flex h-14 max-w-screen-2xl mx-auto items-center gap-3 md:gap-4">
                {/* Brand */}
                <a ref={logoRef} href="/" className="flex items-center shrink-0 opacity-0 group h-9 w-auto">
                    {/* Light mode logo (siyahlogo.png) */}
                    <img
                        src="/siyahlogo.png"
                        alt="PCKARSILASTIR.com"
                        className="h-full w-auto object-contain dark:hidden transition-opacity duration-300 group-hover:opacity-80"
                    />
                    {/* Dark mode logo (beyazlogo.png) */}
                    <img
                        src="/beyazlogo.png"
                        alt="PCKARSILASTIR.com"
                        className="h-full w-auto object-contain hidden dark:block transition-opacity duration-300 group-hover:opacity-80"
                    />
                </a>

                {/* Search */}
                <div ref={searchRef} className="flex-1 md:max-w-xl md:mx-auto opacity-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="header-search"
                            type="search"
                            placeholder="Sistem ara..."
                            className="pl-9 h-9 rounded-[4px] bg-muted/40 border border-border/80 focus-visible:ring-0 focus-visible:border-foreground/40 focus-visible:bg-background transition-colors"
                            value={searchValue ?? ""}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                        />
                    </div>
                </div>

                {/* Right nav */}
                <nav ref={navRef} className="flex items-center gap-1 shrink-0 opacity-0">
                    <a
                        href="/favoriler"
                        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors group"
                        title="Favorilerim"
                    >
                        <Bookmark className="w-[18px] h-[18px]" />
                        <FavoriteBadge />
                    </a>
                    <a
                        href="https://kreosus.com/emindmrts"
                        target="_blank"
                        rel="noreferrer"
                        className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-foreground/80 px-4 py-1.5 text-[13px] font-[510] tracking-[-0.01em] text-foreground hover:bg-foreground hover:text-background transition-colors"
                    >
                        <Heart className="w-4 h-4" />
                        Destek Ol
                    </a>
                    <a
                        href="/blog"
                        className="hidden sm:inline-flex rounded-full px-3 py-1.5 text-[13px] font-[510] tracking-[-0.01em] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Blog
                    </a>
                    <a
                        href="mailto:zenith31269@gmail.com"
                        className="hidden sm:inline-flex rounded-full px-3 py-1.5 text-[13px] font-[510] tracking-[-0.01em] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        İletişim
                    </a>
                    <ModeToggle />
                </nav>
            </div>
        </header>
    )
}

function FavoriteBadge() {
    const { count } = useFavorites()
    if (count === 0) return null
    return (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-foreground text-background text-[10px] font-[590] px-1">
            {count > 9 ? "9+" : count}
        </span>
    )
}