import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Product } from "./use-products"

const MAX_COMPARE = 4
const STORAGE_KEY = "pckarsilastir-compare"

interface CompareContextValue {
  items: Product[]
  addToCompare: (product: Product) => boolean
  removeFromCompare: (slug: string) => void
  clearCompare: () => void
  isInCompare: (slug: string) => boolean
  toggleCompare: (product: Product) => void
  isFull: boolean
  modalOpen: boolean
  setModalOpen: (open: boolean) => void
}

const CompareContext = createContext<CompareContextValue | null>(null)

function loadFromStorage(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(items: Product[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorage quota exceeded – fail silently
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>(loadFromStorage)
  const [modalOpen, setModalOpen] = useState(false)

  // Persist to localStorage on change
  useEffect(() => {
    saveToStorage(items)
  }, [items])

  const getSlug = (p: Product) => p.slug ?? ""

  const addToCompare = useCallback((product: Product): boolean => {
    const slug = getSlug(product)
    if (!slug) return false

    let added = false
    setItems(prev => {
      if (prev.length >= MAX_COMPARE) return prev
      if (prev.some(p => getSlug(p) === slug)) return prev
      added = true
      return [...prev, product]
    })
    return added
  }, [])

  const removeFromCompare = useCallback((slug: string) => {
    setItems(prev => prev.filter(p => getSlug(p) !== slug))
  }, [])

  const clearCompare = useCallback(() => {
    setItems([])
    setModalOpen(false)
  }, [])

  const isInCompare = useCallback((slug: string) => {
    return items.some(p => getSlug(p) === slug)
  }, [items])

  const toggleCompare = useCallback((product: Product) => {
    const slug = getSlug(product)
    if (!slug) return
    setItems(prev => {
      if (prev.some(p => getSlug(p) === slug)) {
        return prev.filter(p => getSlug(p) !== slug)
      }
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, product]
    })
  }, [])

  return (
    <CompareContext.Provider
      value={{
        items,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        toggleCompare,
        isFull: items.length >= MAX_COMPARE,
        modalOpen,
        setModalOpen,
      }}
    >
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare() {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error("useCompare must be used within CompareProvider")
  return ctx
}
