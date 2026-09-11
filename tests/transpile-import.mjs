import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
let ts;
try {
  const mod = await import('typescript');
  ts = mod.default ?? mod;
} catch {
  const mod = await import('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
  ts = mod.default ?? mod;
}

export async function importTs(relativePath) {
  const sourcePath = path.resolve(relativePath);
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const outPath = path.resolve('.test-tmp', relativePath.replace(/[\\/]/g, '__').replace(/\.tsx?$/, '.mjs'));
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, output, 'utf8');
  return import(`${pathToFileURL(outPath).href}?v=${Date.now()}-${Math.random()}`);
}
