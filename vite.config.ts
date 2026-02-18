import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        // Silence large chunk warnings (expected for Excalidraw / Mermaid)
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Vendor: React core
                    if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
                        return 'vendor-react'
                    }
                    // Vendor: Excalidraw
                    if (id.includes('@excalidraw')) {
                        return 'vendor-excalidraw'
                    }
                    // Vendor: Mermaid + D3
                    if (id.includes('mermaid') || id.includes('node_modules/d3')) {
                        return 'vendor-charts'
                    }
                    // Vendor: Radix UI
                    if (id.includes('@radix-ui')) {
                        return 'vendor-radix'
                    }
                    // Vendor: everything else from node_modules
                    if (id.includes('node_modules')) {
                        return 'vendor'
                    }
                },
            },
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    },
    css: {
        postcss: './postcss.config.mjs',
    },
})
