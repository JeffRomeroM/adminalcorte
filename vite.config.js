import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Admin AlCorte',
        short_name: 'Admin AlCorte',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: 'iconoapp.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],

  // CAMBIO AQUÍ: Forzar a Vite a mapear de manera absoluta las dependencias hijas
  resolve: {
    alias: {
      'tslib': fileURLToPath(new URL('./node_modules/tslib/tslib.es6.js', import.meta.url))
    }
  },

  optimizeDeps: {
    include: [
      'tslib',
      '@supabase/supabase-js'
    ]
  }
})