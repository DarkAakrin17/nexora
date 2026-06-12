import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split Three.js into its own chunk — large but heavily cached
          if (id.includes('node_modules/three/')) return 'three';
          // Bundle all globe-related deps together (globe.gl, d3-geo, topojson, etc.)
          // Splitting these causes circular init errors in production
          if (
            id.includes('node_modules/react-globe.gl') ||
            id.includes('node_modules/globe.gl') ||
            id.includes('node_modules/three-globe') ||
            id.includes('node_modules/react-simple-maps') ||
            id.includes('node_modules/d3-') ||
            id.includes('node_modules/topojson')
          ) return 'globe';
        },
      },
    },
  },
})
