import sharp from 'sharp';
import {resolve} from 'node:path';
// Deterministic self-created paper grain, bundled locally. No generated imagery.
let seed=83;const size=512;const data=Buffer.alloc(size*size*3);
for(let i=0;i<size*size;i++){seed=(seed*1664525+1013904223)>>>0;const n=205+(seed%45);data[i*3]=n;data[i*3+1]=n-3;data[i*3+2]=n-9;}
await sharp(data,{raw:{width:size,height:size,channels:3}}).png().toFile(resolve('public/paper.png'));
