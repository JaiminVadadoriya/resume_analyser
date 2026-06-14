import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use JSDOM as the default environment for Angular component/service tests
    environment: 'jsdom',
    // Individual spec files can override with @vitest-environment docblock comments
    environmentOptions: {},
    // Resolve path aliases that match tsconfig.json (if any are added later)
    root: path.resolve(__dirname),
    // Glob patterns for test files
    include: ['src/**/*.spec.ts'],
    // Globals: let vitest inject describe/it/expect without imports
    globals: false,
  }
});
