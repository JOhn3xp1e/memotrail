import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const mode=process.argv[2]??'all';
const ids=mode==='all'?['Landscape','Vertical']:[mode==='vertical'?'Vertical':'Landscape'];
const browserExecutable=process.env.PROMO_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe';
await mkdir('out',{recursive:true});await mkdir('qa',{recursive:true});
const serveUrl=await bundle({entryPoint:resolve('src/index.tsx'),publicDir:resolve('public')});
for(const id of ids){
 const composition=await selectComposition({serveUrl,id,browserExecutable});
 for(const frame of [0,100,270,390,465,525,615,690,750,825,895,965,1020,1140,1199]){
  await renderStill({serveUrl,composition,browserExecutable,frame,output:resolve(`qa/${id}-${frame}.png`)});
 }
 if(process.env.PROMO_STILLS_ONLY==='1')continue;
 console.log(`Rendering ${id}: ${composition.width}×${composition.height}, 1200 frames`);
 let last=-1;
 await renderMedia({serveUrl,composition,browserExecutable,codec:'h264',muted:true,crf:18,pixelFormat:'yuv420p',x264Preset:'fast',concurrency:3,outputLocation:resolve(`out/MemoTrail_LivingScrapbook_${id}.mp4`),onProgress:({progress})=>{const pct=Math.floor(progress*100/10)*10;if(pct!==last){last=pct;console.log(`${id}: ${pct}%`);}}});
}
await writeFile('qa/render-report.json',JSON.stringify({ids,fps:30,frames:1200,duration:40,audio:'silent',renderedAt:new Date().toISOString()},null,2));

