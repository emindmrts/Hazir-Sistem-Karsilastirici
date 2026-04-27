import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ModeToggle } from "./mode-toggle"
import { Search, Heart } from "lucide-react"
import { Input } from "@/components/ui/input"

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
        <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
            <div className="px-4 md:px-8 flex h-20 max-w-screen-2xl mx-auto items-center gap-4">
                {/* Brand */}
                <a ref={logoRef} href="/" className="flex items-center shrink-0 opacity-0 group h-16 sm:h-20 w-auto">
                    {/* Light mode logo (siyahlogo.png) */}
                    <img
                        src="/siyahlogo.png"
                        alt="PCKARSILASTIR.com"
                        className="h-full w-auto object-contain dark:hidden transition-opacity duration-300 group-hover:opacity-80 py-2 sm:py-3"
                    />
                    {/* Dark mode logo (beyazlogo.png) */}
                    <img
                        src="/beyazlogo.png"
                        alt="PCKARSILASTIR.com"
                        className="h-full w-auto object-contain hidden dark:block transition-opacity duration-300 group-hover:opacity-80 py-2 sm:py-3"
                    />
                </a>

                {/* Search */}
                <div ref={searchRef} className="flex-1 max-w-xl mx-auto opacity-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="header-search"
                            type="search"
                            placeholder="Sistem, işlemci veya ekran kartı ara..."
                            className="pl-9 h-9 bg-muted/50 border-border/60 focus-visible:bg-background transition-colors"
                            value={searchValue ?? ""}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                        />
                    </div>
                </div>

                {/* Right nav */}
                <nav ref={navRef} className="flex items-center gap-1 shrink-0 opacity-0">
                    <a
                        href="https://kreosus.com/emindmrts"
                        target="_blank"
                        rel="noreferrer"
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
