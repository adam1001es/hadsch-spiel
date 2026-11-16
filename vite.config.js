import { defineConfig } from 'vite';

// Versionsanzeige auf dem Startbildschirm (Build-Zeit, deutsche Zeit) + version.json für die automatische Aktualisierung
const BUILD = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(BUILD) },
  build: { chunkSizeWarningLimit: 1500 },
  plugins: [{ name: 'version-json', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) }); } }],
});
