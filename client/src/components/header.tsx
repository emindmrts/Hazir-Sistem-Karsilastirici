import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ModeToggle } from "./mode-toggle"
import { Search, Zap, Heart } from "lucide-react"
import { Input } from "@/components/ui/input"

interface HeaderProps {
    searchValue?: string
    onSearchChange?: (val: string) => void
}

export function Header({ searchValue, onSearchChange }: HeaderProps) {
    const logoRef = useRef<HTMLAnchorElement>(null)
    const searchRef = useRef<HTMLDivElement>(null)
    const navRef = useRef<HTMLElement>(null)
    const pillRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
        tl.fromTo(logoRef.current, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 })
            .fromTo(pillRef.current, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.35 }, "-=0.2")
            .fromTo(searchRef.current, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.45 }, "-=0.3")
            .fromTo(navRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4 }, "-=0.3")
    }, [])

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="px-4 md:px-8 flex h-16 max-w-screen-2xl mx-auto items-center gap-4">
                {/* Brand */}
                <a ref={logoRef} href="/" className="flex items-center shrink-0 opacity-0 group h-10 w-auto">
                    <img
                        src="/siyahlogo.png"
                        alt="PCKARSILASTIR.com"
                        className="h-full w-auto object-contain dark:hidden transition-all duration-300 group-hover:opacity-75 group-hover:scale-[0.97]"
                    />
                    <img
                        src="/beyazlogo.png"
                        alt="PCKARSILASTIR.com"
                        className="h-full w-auto object-contain hidden dark:block transition-all duration-300 group-hover:opacity-75 group-hover:scale-[0.97]"
                    />
                </a>

                {/* Live badge */}
                <div ref={pillRef} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 opacity-0 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-ring" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Canlı</span>
                </div>

                {/* Search */}
                <div ref={searchRef} className="flex-1 max-w-2xl mx-auto opacity-0">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors duration-200 group-focus-within:text-primary" />
                        <Input
                            id="header-search"
                            type="search"
                            placeholder="Sistem, işlemci veya ekran kartı ara..."
                            className="pl-10 h-10 bg-muted/40 border-border/50 focus-visible:bg-background focus-visible:border-primary/50 focus-visible:ring-primary/20 transition-all duration-200 rounded-xl text-sm placeholder:text-muted-foreground/60"
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
                        <Heart className="w-3.5 h-3.5" />
                        Destek Ol
                    </a>
                    <a
                        href="mailto:zenith31269@gmail.com"
                        className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/70 transition-all duration-200"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        İletişim
                    </a>
                    <ModeToggle />
                </nav>
            </div>
        </header>
    )
}
