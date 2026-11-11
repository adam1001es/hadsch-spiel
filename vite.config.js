import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Versionsanzeige auf dem Startbildschirm (Build-Zeit, deutsche Zeit)
  define: { __BUILD__: JSON.stringify(new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) },
  build: { chunkSizeWarningLimit: 1500 },
});
