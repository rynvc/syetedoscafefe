import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const files = [
  "index.html",
  "dashboard.html",
  "pos.html",
  "catalog.html",
  "analytics.html",
  "legacy-export.html",
  "data-migration.html",
  "css",
  "js",
  "assets"
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) {
  await cp(path.join(root, file), path.join(output, file), { recursive: true });
}
console.log(`Prepared Netlify static site in ${output}. PHP sources, SQL, and local environment files are excluded.`);
