import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const outputRoot = join(process.cwd(), ".cloudflare", "output");

const walk = (dir, visit) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, visit);
    else visit(full);
  }
};

const appShellCandidates = [];
walk(outputRoot, (file) => {
  if (file.endsWith(`${sep}index.html`)) appShellCandidates.push(join(file, ".."));
});

// Static sub-pages (for example /awal/) also ship an index.html. The app shell
// is always the shallowest one relative to the worker output root.
const depth = (dir) => relative(outputRoot, dir).split(sep).length;
appShellCandidates.sort((a, b) => depth(a) - depth(b) || a.localeCompare(b));

const assetsDir = appShellCandidates[0] ?? null;

if (!assetsDir) {
  console.error("precache-manifest: index.html not found under .cloudflare/output");
  process.exit(1);
}

const assets = [];
walk(assetsDir, (file) => {
  if (!/\.(?:js|css)$/.test(file) || file.endsWith(`${sep}sw.js`)) return;
  assets.push("/" + relative(assetsDir, file).split(sep).join("/"));
});
assets.sort();

writeFileSync(
  join(assetsDir, "precache-manifest.json"),
  JSON.stringify({ assets }, null, 2) + "\n",
);

console.log(`precache-manifest: ${assets.length} assets`);
