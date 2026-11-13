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

let assetsDir = null;
walk(outputRoot, (file) => {
  if (!assetsDir && file.endsWith(`${sep}index.html`)) assetsDir = join(file, "..");
});

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
