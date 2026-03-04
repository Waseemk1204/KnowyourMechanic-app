import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Plugin to inject Firebase config into the service worker at build time
function firebaseSWPlugin(): Plugin {
  return {
    name: 'firebase-sw-config',
    writeBundle() {
      const swPath = resolve(__dirname, 'dist/firebase-messaging-sw.js')
      try {
        let content = readFileSync(swPath, 'utf-8')
        const config = JSON.stringify({
          apiKey: process.env.VITE_FIREBASE_API_KEY,
          authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.VITE_FIREBASE_APP_ID,
        })
        content = content.replace('__FIREBASE_CONFIG__', config)
        writeFileSync(swPath, content)
        console.log('✅ Firebase config injected into service worker')
      } catch {
        console.warn('⚠️ Could not inject Firebase config into service worker')
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), firebaseSWPlugin()],
  server: {
    port: 5183,
    host: true
  }
})
