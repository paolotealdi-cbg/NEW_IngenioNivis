import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.e2e.ts', fullyParallel: false, workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4175', headless: true, launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }, timezoneId: 'America/New_York' },
  webServer: {
    command: 'npm start', url: 'http://127.0.0.1:4175', reuseExistingServer: false,
    env: { PORT: '4175', NODE_ENV: 'production', METEOPIEMONTE_API_KEY: '' }, timeout: 30_000
  }
});
