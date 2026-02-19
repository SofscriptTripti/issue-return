import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
  start_url: "/",
 "icons": [
  {
    "src": "/medical-192.jpg",
    "sizes": "192x192",
    "type": "image/jpeg"
  },
  {
    "src": "/medical-512.jpg",
    "sizes": "512x512",
    "type": "image/jpeg"
  }
]

}



    })
  ]
})
