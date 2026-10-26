import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve("supabase/migrations");
const strict = process.argv.includes("--strict");
const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort((a, b) => a.localeCompare(b));
const byPrefix = new Map();
const destructive = [];

for (const file of files) {
  const match = file.match(/^(\d+)_/);
  if (match) byPrefix.set(match[1], [...(byPrefix.get(match[1]) ?? []), file]);
  const source = await readFile(path.join(directory, file), "utf8");
  if (/\bDROP\s+(TABLE|TYPE|SCHEMA|FUNCTION)\b/i.test(source)) destructive.push(file);
}

const duplicatePrefixes = [...byPrefix.entries()].filter(([, names]) => names.length > 1);
console.log(`Migrations encontradas: ${files.length}`);
if (duplicatePrefixes.length) {
  console.log("Prefixos duplicados:");
  for (const [prefix, names] of duplicatePrefixes) console.log(`- ${prefix}: ${names.join(", ")}`);
}
if (destructive.length) {
  console.log("Operações potencialmente destrutivas:");
  for (const file of destructive) console.log(`- ${file}`);
}
if (!duplicatePrefixes.length && !destructive.length) console.log("Nenhum alerta estático encontrado.");
if (strict && (duplicatePrefixes.length || destructive.length)) {
  console.error("Auditoria estrita falhou: corrija os alertas antes de aplicar novas migrations.");
  process.exitCode = 1;
}
