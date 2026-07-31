import { useEffect, useRef } from "react"
import { gsap } from "gsap"

/**
 * Reveals children with a staggered fade-up animation when they enter the viewport.
 * ScrollTrigger yerine IntersectionObserver kullanir (forced reflow yok, daha ucuz).
 * Returns the container ref to attach to the parent element.
 */
export function useGsapReveal(deps: unknown[] = []) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const items = containerRef.current.querySelectorAll<HTMLElement>("[data-gsap]")
        if (!items.length) return

        gsap.set(items, { opacity: 0, y: 32, scale: 0.97 })

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        gsap.to(entry.target, {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            duration: 0.5,
                            ease: "power3.out",
                            clearProps: "transform",
                            force3D: true,
                        })
                        io.unobserve(entry.target)
                    }
                }
            },
            { threshold: 0.1 }
        )
        items.forEach((el) => io.observe(el))

        return () => io.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    return containerRef
}
