/*
 * Post-export: the homepage is pure content — a thesis and a table — with no
 * client components, so it ships as paper: HTML + CSS, no JS at all. This
 * strips the Next runtime (script tags + script preloads + flight data) from
 * out/index.html only; interactive pages (pattern toggle, copy buttons) keep
 * the runtime. Holds the index page to the sub-100KB CSS+JS budget with room
 * to spare, and removes hydration as a layout-shift source.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const indexPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'out', 'index.html');

const html = readFileSync(indexPath, 'utf8');
const stripped = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .replace(/<link[^>]+as="script"[^>]*>/g, '');

if (stripped === html) {
  throw new Error('static-index: nothing stripped — did the export layout change?');
}

writeFileSync(indexPath, stripped);
const kb = (Buffer.byteLength(stripped) / 1024).toFixed(1);
console.log(`static-index: out/index.html is script-free (${kb} KB HTML)`);
