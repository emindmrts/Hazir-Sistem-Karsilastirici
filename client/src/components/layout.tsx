import { type ReactNode, useState } from "react";
import { Header } from "./header.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  activeFilterCount?: number;
}

export function Layout({
  children,
  sidebarContent,
  searchValue,
  onSearchChange,
  activeFilterCount = 0,
}: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header searchValue={searchValue} onSearchChange={onSearchChange} />

      {/* ── DESKTOP: 2-col grid (unchanged) ── */}
      <div className="flex-1 md:grid md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border/60 bg-background/60">
          {sidebarContent}
        </aside>

        <main className="w-full px-4 md:px-8 py-6 lg:py-8 min-w-0 pb-28 md:pb-6">
          {children}
        </main>
      </div>

      {/* ── MOBILE: Floating Filter Button ── */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              id="mobile-filter-fab"
              className="
                flex items-center gap-2.5
                h-12 px-5 rounded-full
                bg-primary text-primary-foreground
                shadow-lg shadow-primary/30
                text-sm font-semibold
                active:scale-95 transition-all duration-200
                border border-primary/20
              "
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtrele
              {activeFilterCount > 0 && (
                <span className="
                  flex items-center justify-center
                  min-w-[20px] h-5 rounded-full
                  bg-primary-foreground text-primary
                  text-[10px] font-bold px-1.5
                ">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="
              h-[85dvh] rounded-t-2xl p-0
              flex flex-col
              border-border/60
            "
          >
            <SheetHeader className="px-5 pt-4 pb-0 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-3" />
              <SheetTitle className="text-sm font-bold tracking-tight text-left">
                Filtreler
                {activeFilterCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                    {activeFilterCount}
                  </span>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
