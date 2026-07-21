// Baut eine einzige, in sich geschlossene HTML-Datei (CSS + JS eingebettet),
// die ohne Server und ohne Internet direkt im Browser geöffnet werden kann.
// Ausgabe: dist/Spinnanker-Traglast-offline.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let html = read('index.html');
const css = read('styles.css');
const calcJS = read('calculation.js').replace(/^export\s+/gm, '');
const appJS = read('app.js')
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/calculation\.js['"];\s*/, '');

const inlineScript = `(() => {\n${calcJS}\n${appJS}\n})();`;

// Icon als data:-URI einbetten, damit das Favicon offline funktioniert.
const svg = read('icon.svg');
const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

// Externe Verweise entfernen bzw. einbetten (funktionieren unter file:// nicht).
html = html
  .replace(/^.*<link rel="manifest"[^>]*>\n?/m, '')
  .replace(/^.*<link rel="apple-touch-icon"[^>]*>\n?/m, '')
  .replace(
    /<link rel="icon"[^>]*>/,
    `<link rel="icon" href="${svgDataUri}" type="image/svg+xml" />`,
  )
  .replace(
    /<link rel="stylesheet" href="styles\.css" \/>/,
    `<style>\n${css}\n    </style>`,
  )
  .replace(
    /<script type="module" src="app\.js"><\/script>/,
    `<script>\n${inlineScript}\n    </script>`,
  );

const banner = '<!-- Spinnanker Traglastprüfung – eigenständige Offline-Datei.\n'
  + '     Automatisch erzeugt aus index.html/styles.css/app.js/calculation.js.\n'
  + '     Nicht direkt bearbeiten – stattdessen die Quelldateien ändern und\n'
  + '     "npm run build" ausführen. -->\n';
html = html.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n${banner}`);

const outDir = path.join(ROOT, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'Spinnanker-Traglast-offline.html');
fs.writeFileSync(outFile, html);

const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
console.log(`wrote dist/Spinnanker-Traglast-offline.html (${kb} kB, self-contained)`);
