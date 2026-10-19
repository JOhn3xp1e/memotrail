import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {project} from './common.mjs';
for(const file of ['capture','posts','verify'])await new Promise((ok,no)=>{const child=spawn(process.execPath,[resolve(project,`marketing/scripts/${file}.mjs`)],{cwd:project,windowsHide:true,stdio:'inherit'});child.on('error',no);child.on('exit',code=>code===0?ok():no(Error(`${file} failed with exit code ${code}`)));});
