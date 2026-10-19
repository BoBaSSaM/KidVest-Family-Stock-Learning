import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const app = path.join(root, "artifacts/kidvest");
const out = path.join(root, "generated-artifacts");
const stage = path.join(out, "KidVest");
const sourcePackage = JSON.parse(await fs.readFile(path.join(app, "package.json"), "utf8"));
const workspace = await fs.readFile(path.join(root, "pnpm-workspace.yaml"), "utf8");
// Resolve catalog values using installed versions rather than a second lockfile.
function installedVersion(name) {
  const packagePath = path.join(app, "node_modules", ...name.split("/"), "package.json");
  return fs.readFile(packagePath, "utf8").then(t => JSON.parse(t).version);
}
await fs.mkdir(out, { recursive: true });
await fs.rm(stage, { recursive: true, force: true });
await fs.mkdir(stage, { recursive: true });
for (const name of ["src", "public", "scripts", "middleware.ts", "next.config.mjs", "postcss.config.mjs", "next-env.d.ts", "README.md", ".env.example"]) {
  try { await fs.cp(path.join(app, name), path.join(stage, name), { recursive: true }); }
  catch (e) { if (e.code !== "ENOENT") throw e; }
}
// Vite scaffold is not part of the downloadable Next application.
for (const name of ["src/main.tsx", "src/App.tsx", "scripts/export.mjs"]) await fs.rm(path.join(stage, name), { force: true });
const pkg = { ...sourcePackage, name: "kidvest", version: "1.0.0" };
delete pkg.scripts.export;
for (const section of ["dependencies", "devDependencies"]) {
  const deps = pkg[section] || {};
  for (const [name, version] of Object.entries(deps)) {
    if (name.startsWith("@replit/") || ["vite", "@vitejs/plugin-react", "@tailwindcss/vite", "wouter"].includes(name)) { delete deps[name]; continue; }
    if (version.startsWith("workspace:")) { deps[name] = `file:vendor/${name.split("/").at(-1)}`; continue; }
    if (version === "catalog:") deps[name] = await installedVersion(name);
  }
}
for (const library of ["api-client-react", "api-zod"]) {
  const from = path.join(root, "lib", library);
  const dest = path.join(stage, "vendor", library);
  await fs.mkdir(dest, { recursive: true });
  await fs.cp(path.join(from, "src"), path.join(dest, "src"), { recursive: true });
  const lib = JSON.parse(await fs.readFile(path.join(from, "package.json"), "utf8"));
  for (const [name, version] of Object.entries(lib.dependencies || {})) if (version === "catalog:") lib.dependencies[name] = await installedVersion(name);
  await fs.writeFile(path.join(dest, "package.json"), JSON.stringify(lib, null, 2));
}
const tsconfig = {
  compilerOptions: { target: "ES2022", lib: ["dom", "dom.iterable", "esnext"], allowJs: true, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "preserve", incremental: true, plugins: [{ name: "next" }], paths: { "@/*": ["./src/*"] } },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"],
};
await fs.writeFile(path.join(stage, "package.json"), JSON.stringify(pkg, null, 2));
await fs.writeFile(path.join(stage, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
await fs.writeFile(path.join(stage, ".gitignore"), "node_modules/\n.next/\n.data/\n.env*\n!.env.example\n*.tsbuildinfo\n");
const cfg = await fs.readFile(path.join(stage, "next.config.mjs"), "utf8");
await fs.writeFile(path.join(stage, "next.config.mjs"), cfg.replace('new URL("../../", import.meta.url).pathname', 'new URL(".", import.meta.url).pathname').replace('["@workspace/api-client-react"]', '["@workspace/api-client-react", "@workspace/api-zod"]'));
const zip = path.join(out, "KidVest-source.zip");
await fs.rm(zip, { force: true });
execFileSync("zip", ["-qr", zip, "KidVest"], { cwd: out });
process.stdout.write("Created generated-artifacts/KidVest-source.zip (no secrets, user data or node_modules).\n");
