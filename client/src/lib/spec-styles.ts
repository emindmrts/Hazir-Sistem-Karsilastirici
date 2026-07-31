import type { ComponentType } from "react"
import {
    Cpu, MonitorPlay, MemoryStick, HardDrive,
    CircuitBoard, Box, Zap, Fan,
} from "lucide-react"

/**
 * Merkezi spec ikon & renk tanimlari.
 *
 * Bilesen basina anlamlamı bir ikon kullanilir; renkler sade ve tek-tarafli
 * (gri) tutulur boylece rozet yigini "renk paleti" gibi dipirli gostermez.
 * Onceki versiyonda tum kategoriler ayni `bg-primary/10 text-primary` blokunu
 * ve hatta ayni ikonlar (Thermometer hem Anakart hem Soğutucu) kullaniyordu.
 */

export interface SpecStyle {
    key: "islemci" | "ekranKarti" | "ram" | "depolama" | "anakart" | "kasa" | "psu" | "sogutucu"
    label: string
    Icon: ComponentType<{ className?: string }>
    /** ikon kabı arka plan sinifi */
    bg: string
    /** ikon kendisinin rengi */
    text: string
    /** kategori bolumu basligi (karsilastirma tablosu) */
    category?: "core" | "memory" | "chassis"
}

export const SPEC_STYLES: SpecStyle[] = [
    { key: "islemci",   label: "İşlemci",      Icon: Cpu,          text: "text-muted-foreground", bg: "bg-muted/60", category: "core" },
    { key: "ekranKarti", label: "Ekran Kartı", Icon: MonitorPlay,  text: "text-muted-foreground", bg: "bg-muted/60", category: "core" },
    { key: "ram",       label: "RAM",          Icon: MemoryStick,  text: "text-muted-foreground", bg: "bg-muted/60", category: "memory" },
    { key: "depolama",  label: "Depolama",     Icon: HardDrive,    text: "text-muted-foreground", bg: "bg-muted/60", category: "memory" },
    { key: "anakart",   label: "Anakart",      Icon: CircuitBoard, text: "text-muted-foreground", bg: "bg-muted/60", category: "chassis" },
    { key: "kasa",      label: "Kasa",         Icon: Box,          text: "text-muted-foreground", bg: "bg-muted/60", category: "chassis" },
    { key: "psu",       label: "Güç Kaynağı",  Icon: Zap,          text: "text-muted-foreground", bg: "bg-muted/60", category: "chassis" },
    { key: "sogutucu",  label: "Soğutucu",     Icon: Fan,          text: "text-muted-foreground", bg: "bg-muted/60", category: "chassis" },
]

export const SPEC_BY_KEY: Record<string, SpecStyle> = Object.fromEntries(
    SPEC_STYLES.map(s => [s.key, s])
)