import fs from 'node:fs/promises';
import path from 'node:path';
let ts;
try {
  const mod = await import('typescript');
  ts = mod.default ?? mod;
} catch {
  const mod = await import('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
  ts = mod.default ?? mod;
}

const roots = ['app', 'components', 'lib'];
const files = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}
for (const root of roots) await walk(root);
let failures = 0;
for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      isolatedModules: true,
    },
  });
  const diagnostics = result.diagnostics ?? [];
  if (diagnostics.length) {
    failures += diagnostics.length;
    console.error(`\n${file}`);
    for (const diagnostic of diagnostics) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
}
if (failures) process.exit(1);
console.log(`Syntax OK: ${files.length} TS/TSX files`);
