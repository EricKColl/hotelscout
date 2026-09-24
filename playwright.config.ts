import { defineConfig } from '@playwright/test'

// Usa el Microsoft Edge ya instalado en el equipo (no requiere descargar navegadores).
// En otros equipos: `npx playwright install chromium` y cambiar channel por 'chromium'.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  reporter: [['list']],
  webServer: { command: 'npm run build && npm run preview -- --port 4173', port: 4173, reuseExistingServer: true, timeout: 120_000 },
  use: {
    baseURL: 'http://localhost:4173',
    channel: process.env.PW_CHANNEL ?? 'msedge',
    locale: 'es-ES',
    // WebGL por software en máquinas sin GPU (CI), para poder probar el mapa vectorial.
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
  },
})
