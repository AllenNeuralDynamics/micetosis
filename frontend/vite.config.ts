import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path/posix';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

// Get the directory of current module
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadServerAddress() {
  try {
    const config = JSON.parse(readFileSync(resolve(__dirname, '..', 'config.json'), 'utf-8'));
    return `${config.server.url}:${config.server.port}`;
  } catch {
    // Default API URL if config.json is not found or cannot be read.
    // Use 127.0.0.1 instead of localhost so Node doesn't try IPv6 first.
    return 'http://127.0.0.1:8000';
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: 'src/app/routes',
      generatedRouteTree: 'src/app/routes/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    proxy: {
      '/api': loadServerAddress(),
    },
  },
});
