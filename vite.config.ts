import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    fs: {
      // Allow serving any file from the project root (needed for
      // public/models/use-lite/*.json weight shards in dev mode)
      allow: [path.resolve(__dirname)]
    }
  }
});
