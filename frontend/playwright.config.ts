import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './screenshot-fixtures',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1024 },
    colorScheme: 'dark',
  },
});
