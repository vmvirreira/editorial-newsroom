import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {transpileModule,ModuleKind,JsxEmit} from 'typescript';
import * as text from '../src/lib/text/article-text.ts';
const source=await readFile(new URL('../src/components/article-text.tsx',import.meta.url),'utf8');
const output=transpileModule(source,{compilerOptions:{module:ModuleKind.CommonJS,jsx:JsxEmit.ReactJSX}}).outputText;
const require=createRequire(import.meta.url),compiled={exports:{}};
Function('require','module','exports',output)(name=>name==='@/lib/text/article-text'?text:require(name),compiled,compiled.exports);
export const ArticleText=compiled.exports.ArticleText;
