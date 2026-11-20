// Leonida Legend — GTA VI trophy guide entry (Node 22, standard library only).
//
// The entry itself is app/: plain static files (index.html, style.css, app.js and
// data/trophies.json) that run offline in a browser with no build step. This program
// is only the hand-in: it copies app/ and screenshots/ from beside this file into
// the output directory and writes dossier.json there with the vendored make.fun
// library (vendor/makefun-frontend.ts, unchanged — the scorer rebuilds the dossier
// with its own copy and requires a byte-for-byte match).
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Directory holding this file; the output directory is /output in the grader.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's gate: at most 4 screenshots of 256 KiB, at most 993
// files / 48 MiB in app/, and the dossier text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Leonida Legend: wrote dossier.json (${dossier.length} bytes) to ${outputDir}`);
