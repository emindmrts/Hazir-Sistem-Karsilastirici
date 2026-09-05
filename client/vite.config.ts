import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "wouter", "clsx", "class-variance-authority", "tailwind-merge", "next-themes"],
          radix: ["@radix-ui/react-checkbox", "@radix-ui/react-dialog", "@radix-ui/react-label", "@radix-ui/react-scroll-area", "@radix-ui/react-select", "@radix-ui/react-separator", "@radix-ui/react-slot"],
          gsap: ["gsap", "gsap/ScrollTrigger"],
          lucide: ["lucide-react"],
        },
      },
    },
  },
})
