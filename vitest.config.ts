import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'src/main.ts',
        'src/**/*.module.ts',
        'src/migrations/',
      ],
      thresholds: {
        lines: 65,
        functions: 60,
        branches: 55,
        statements: 65,
      },
    },
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
