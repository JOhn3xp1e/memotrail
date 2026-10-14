import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.png",
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-512.png",
        "photos/*.jpg",
        "photo-credits.txt",
      ],
      manifest: {
        id: "/",
        name: "MemoTrail – Your Life, Your Stories",
        short_name: "MemoTrail",
        description:
          "A private little home for your beautiful moments. Your life, your stories.",
        theme_color: "#FAF7F2",
        background_color: "#FAF7F2",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "en",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,woff2}"],
        globIgnores: ["MASCOTMIMO/**", "MIMOREFERRENCE/**", "mimospritesheet/**", "assets/mimo/**", "icons/memoicon.png"],
        // Only bundled, same-origin files are precached. Blob media stays in IndexedDB;
        // no runtime cache route handles user photos, backup files, or remote servers.
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
});
