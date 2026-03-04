import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

/**
 * Reveals children with a staggered fade-up animation when they enter the viewport.
 * Returns the container ref to attach to the parent element.
 */
export function useGsapReveal(deps: unknown[] = []) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const items = containerRef.current.querySelectorAll<HTMLElement>("[data-gsap]")
        if (!items.length) return

        gsap.fromTo(
            items,
            { opacity: 0, y: 32, scale: 0.97 },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.5,
                ease: "power3.out",
                stagger: 0.05,
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 90%",
                    once: true,
                },
            }
        )

        return () => {
            ScrollTrigger.getAll().forEach((t) => t.kill())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    return containerRef
}

/**
 * One-shot tween for a single element ref.
 */
export function useGsapFrom(
    ref: React.RefObject<HTMLElement>,
    fromVars: gsap.TweenVars,
    toVars: gsap.TweenVars,
    deps: unknown[] = []
) {
    useEffect(() => {
        if (!ref.current) return
        const tween = gsap.fromTo(ref.current, fromVars, toVars)
        return () => { tween.kill() }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
}
