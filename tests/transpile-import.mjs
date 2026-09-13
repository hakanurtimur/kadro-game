import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
let ts;
try {ts=require('typescript');} catch {throw new Error('Testler için TypeScript kurulu olmalı. Proje klasöründe npm install --include=dev çalıştır.');}
// Compile a real dependency graph ahead of loading it. Each test worker owns its own temp folder.
const root=process.cwd();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kadro-test-'));
fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify({type:'commonjs'}));
process.once('exit',()=>{fs.rmSync(temp,{recursive:true,force:true});});
const compiled=new Set();
function compile(file){
 const absolute=path.resolve(file);const relative=path.relative(root,absolute);
 if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Test importu proje klasörünün dışında.');
 const output=path.join(temp,relative.replace(/\.tsx?$/,'.js'));
 if(compiled.has(absolute))return output;
 compiled.add(absolute);
 const source=fs.readFileSync(absolute,'utf8');
 const dependencies=ts.preProcessFile(source,true,true).importedFiles;
 for(const {fileName} of dependencies) {
  if(!fileName.startsWith('.'))continue;
  const base=path.resolve(path.dirname(absolute),fileName);
  const target=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
  if(target&&/\.tsx?$/.test(target))compile(target);
 }
 const result=ts.transpileModule(source,{fileName:absolute,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}});
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,result.outputText);return output;
}
export async function importTs(relativePath){return require(compile(path.resolve(root,relativePath)));}
