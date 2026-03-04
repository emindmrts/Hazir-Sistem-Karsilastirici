import type { ReactNode } from "react";
import { Header } from "./header.tsx";
import type { FilterState } from "./filter-sidebar.tsx";

interface LayoutProps {
    children: ReactNode;
    sidebarContent?: ReactNode;
    searchValue?: string;
    onSearchChange?: (val: string) => void;
    filters?: FilterState;
}

export function Layout({ children, sidebarContent, searchValue, onSearchChange }: LayoutProps) {
    return (
        <div className="relative flex min-h-screen flex-col bg-background">
            <Header searchValue={searchValue} onSearchChange={onSearchChange} />
            <div className="flex-1 md:grid md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border/60 bg-background/60">
                    {sidebarContent}
                </aside>
                <main className="w-full px-4 md:px-8 py-6 lg:py-8 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
