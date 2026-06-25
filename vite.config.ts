import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      // Capacitor native plugins are only available in the native APK context
      external: [
        '@capacitor-mlkit/text-recognition',
        '@capacitor-community/sqlite',
      ],
    },
  },
})
