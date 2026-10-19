import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
export const marketing=resolve(fileURLToPath(new URL('../',import.meta.url)));
export const project=resolve(marketing,'..');
export function output(relative){const path=resolve(marketing,relative);if(!path.startsWith(marketing+sep)&&path!==marketing)throw Error('Output escaped marketing directory.');return path;}
export async function json(relative,data){const path=output(relative);await mkdir(resolve(path,'..'),{recursive:true});await writeFile(path,JSON.stringify(data,null,2)+'\n');}
