import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {cloudflare}  from '@cloudflare/vite-plugin';

export default defineConfig(() => {
  return {
    build: {
      outDir: 'build',
    },
    plugins: [react(),cloudflare()],
  };
});