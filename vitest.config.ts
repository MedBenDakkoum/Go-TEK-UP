import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(__dirname, 'src') };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      {
        resolve: { alias },
        test: {
          name: 'integration', include: ['tests/integration/**/*.test.ts'], environment: 'node',
          fileParallelism: false, testTimeout: 30_000, hookTimeout: 60_000,
        },
      },
      {
        resolve: { alias }, esbuild: { jsx: 'automatic' },
        test: { name: 'ui', include: ['tests/ui/**/*.test.{ts,tsx}'], environment: 'jsdom', setupFiles: ['tests/ui/setup.ts'] },
      },
    ],
  },
});
