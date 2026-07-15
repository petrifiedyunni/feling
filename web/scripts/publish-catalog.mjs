#!/usr/bin/env node
/**
 * Publish approved listings → catalog (+ optional clothing cutouts).
 * Usage: node scripts/publish-catalog.mjs [--cutouts] [--ids=Grailed_123]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const web = path.resolve(__dirname, "..");
const venvPython = path.join(root, ".venv/bin/python");
const prep = path.join(
  root,
  ".cursor/skills/archive-product-images/scripts/prepare_product_images.py"
);

const args = process.argv.slice(2);
const wantCutouts = args.includes("--cutouts") || args.includes("--clothing");
const idsArg = args.find((a) => a.startsWith("--ids="));
const ids = idsArg ? idsArg.replace("--ids=", "") : "";

function run(cmd, cmdArgs, cwd = web) {
  console.log(`$ ${cmd} ${cmdArgs.join(" ")}`);
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: "inherit", shell: false });
  if (r.status !== 0) {
    process.exit(r.status || 1);
  }
}

run(process.execPath, [path.join(__dirname, "sync-catalog.mjs")]);

if (wantCutouts) {
  const prepArgs = ["--clothing-only"];
  if (ids) prepArgs.push("--ids", ids);
  else prepArgs.push("--missing");
  run(venvPython, [prep, ...prepArgs], root);
}

console.log("Publish complete.");
