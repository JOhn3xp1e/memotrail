import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {output,json} from './common.mjs';
const captures=JSON.parse(await readFile(output('capture-manifest.json'),'utf8'));
const posts=JSON.parse(await readFile(output('posts-manifest.json'),'utf8'));
if(captures.failures.length||captures.skipped.length)throw Error('Capture manifest contains failures or skipped features.');
for(const width of [1440,1920])for(const name of ['01_Home_Dashboard','02_Add_Memory','03_Memory_Details','04_Collections','05_Timeline','06_On_This_Day','07_Memory_Jar','08_Time_Capsule','09_Memory_Rewind'])if(!captures.captures.some(c=>c.name===name&&c.viewport.width===width))throw Error(`Missing required desktop capture ${name}/${width}`);
for(const name of ['10_Mobile_Dashboard','11_Mobile_Memory_Details','12_Mobile_Collections'])if(!captures.captures.some(c=>c.name===name&&c.viewport.width===390))throw Error(`Missing required mobile capture ${name}`);
if(posts.outputs.length!==24)throw Error('Expected six themes in each of four formats.');
const files=[];
for(const item of [...captures.captures.map(c=>({file:c.file,width:c.pixels.width,height:c.pixels.height,kind:'raw UI'})),...posts.outputs.map(p=>({...p,kind:'social post'}))]){
 const path=output(item.file);const meta=await sharp(path).metadata();const stats=await sharp(path).stats();
 if(meta.width!==item.width||meta.height!==item.height||meta.format!=='png')throw Error(`Wrong image format or dimensions: ${item.file}`);
 if(stats.channels.every(c=>c.stdev<3))throw Error(`Blank image: ${item.file}`);
 // Decode the entire PNG, not only its header.
 await sharp(path).raw().toBuffer();files.push({file:item.file,width:meta.width,height:meta.height,kind:item.kind,decode:'passed'});
}
await mkdir(output('review'),{recursive:true});
for(const [id,items,tw,th] of [
 ['desktop',captures.captures.filter(c=>c.viewport.width===1440).map(c=>c.file),480,300],
 ['mobile',captures.captures.filter(c=>c.viewport.width===390).map(c=>c.file),195,422],
 ['facebook',posts.outputs.filter(c=>c.format==='Facebook_Cover').map(c=>c.file),480,252],
 ['square',posts.outputs.filter(c=>c.format==='Square').map(c=>c.file),360,360],
 ['portrait',posts.outputs.filter(c=>c.format==='Portrait').map(c=>c.file),324,405],
 ['story',posts.outputs.filter(c=>c.format==='Story').map(c=>c.file),216,384],
]){
 const cols=id==='mobile'?4:3;const cells=[];
 for(let i=0;i<items.length;i++)cells.push({input:await sharp(output(items[i])).resize(tw,th,{fit:'contain',background:'#201e25'}).png().toBuffer(),left:(i%cols)*tw,top:Math.floor(i/cols)*th});
 await sharp({create:{width:cols*tw,height:Math.ceil(items.length/cols)*th,channels:3,background:'#201e25'}}).composite(cells).png().toFile(output(`review/${id}-contact-sheet.png`));
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const cards=files.map(f=>`<a href="${escape(f.file)}"><img loading="lazy" src="${escape(f.file)}" alt="${escape(f.file)}"><div>${escape(f.file.split('/').at(-1))}</div><small>${f.width} × ${f.height} · ${f.kind}</small></a>`).join('\n');
await writeFile(output('INDEX.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MemoTrail marketing assets</title><style>body{background:#201e25;color:#eee8e2;font:15px system-ui;margin:0;padding:40px}h1{font:48px Georgia;margin:0 0 12px}p{color:#c9b2ef}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;margin-top:32px}a{display:block;background:#2b2830;padding:16px;border:1px solid #413a47;border-radius:12px;color:inherit;text-decoration:none}img{width:100%;height:220px;object-fit:contain;background:#201e25}a div{overflow-wrap:anywhere;margin:14px 0 8px}small{color:#b7afb9}</style></head><body><h1>MemoTrail marketing assets</h1><p>${captures.captures.length} real UI captures · 24 social graphics · Synthetic demo data only</p><main>${cards}</main></body></html>`);
await json('verification.json',{checkedAt:new Date().toISOString(),screenshots:captures.captures.length,socialPosts:posts.outputs.length,allPNGFilesDecoded:true,dimensions:'passed',requiredFeatures:'all captured',skipped:[],files});
console.log(`Verified ${files.length} PNGs; generated marketing/INDEX.html and six contact sheets.`);
