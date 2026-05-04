import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // CRITICAL: Vite's lib mode does NOT substitute process.env.NODE_ENV by
  // default — only app (HTML-entry) builds do. React's production bundle
  // references process.env.NODE_ENV, so without this the widget throws
  // "ReferenceError: process is not defined" on every customer site that
  // doesn't polyfill process. Symptom: window.LivvBots stays undefined and
  // the bot never appears.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
  },
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'LivvBotsWidget',
      fileName: 'widget',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
  },
})
