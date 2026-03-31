import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/meditrack/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "MediTrack - Medical Store",
        short_name: "MediTrack",
        description: "Medical Inventory Issue & Return System",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/meditrack/",



        "icons": [
          {
            src: "medical-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "medical-512.jpg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any maskable"
          }
        ]

      }



    })
  ],
  server: {
    proxy: {
      '/InvBasketAPI/api': {
        target: 'http://123.108.45.16:8650/InvBasketAPI/api/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/InvBasketAPI\/api/, '')
      }
    }
  }
})
