import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "pwa-install-banner-dismissed"

function isStandalone() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
    )
}

export function PwaInstallBanner() {
    const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
    const [hiddenByUser, setHiddenByUser] = useState(() => {
        try {
            return localStorage.getItem(DISMISS_KEY) === "1"
        } catch {
            return false
        }
    })
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (isStandalone()) return

        const onPrompt = (e: Event) => {
            e.preventDefault()
            setPromptEvent(e as BeforeInstallPromptEvent)
        }
        const onInstalled = () => {
            setPromptEvent(null)
            setVisible(false)
        }

        window.addEventListener("beforeinstallprompt", onPrompt)
        window.addEventListener("appinstalled", onInstalled)

        // Prompt fırsatı varsa birkaç saniye sonra göster (ilk izlenimi boğma).
        const t = setTimeout(() => {
            setVisible((v) => v || promptEvent !== null)
        }, 3500)

        return () => {
            window.removeEventListener("beforeinstallprompt", onPrompt)
            window.removeEventListener("appinstalled", onInstalled)
            clearTimeout(t)
        }
    }, [])

    // beforeinstallprompt geç geldiyse bir kere daha deneme
    useEffect(() => {
        if (promptEvent && !hiddenByUser) {
            const t = setTimeout(() => setVisible(true), 300)
            return () => clearTimeout(t)
        }
    }, [promptEvent, hiddenByUser])

    if (hiddenByUser || !visible || !promptEvent || isStandalone()) return null

    const dismiss = () => {
        setHiddenByUser(true)
        try {
            localStorage.setItem(DISMISS_KEY, "1")
        } catch {
            // sessiz
        }
    }

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/10 p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Download className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold tracking-tight">PcKarşılaştır'ı yükle</p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                            Favoriler ve karşılaştırmaların her zaman elinin altında olsun.
                        </p>
                    </div>
                    <button
                        onClick={dismiss}
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Kapat"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <Button
                    className="w-full rounded-full font-bold gap-2 mt-3 h-9"
                    onClick={async () => {
                        setVisible(false)
                        try {
                            await promptEvent.prompt()
                            const choice = await promptEvent.userChoice
                            if (choice.outcome === "accepted") {
                                try {
                                    localStorage.setItem(DISMISS_KEY, "1")
                                } catch {
                                    // sessiz
                                }
                            }
                        } catch {
                            // prompt desteklenmiyor/kapalı — sessiz geç
                        }
                    }}
                >
                    Uygulamaya Ekle
                    <Download className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}