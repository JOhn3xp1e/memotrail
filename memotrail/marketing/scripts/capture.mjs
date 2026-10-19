import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {project,output,json} from './common.mjs';
import {seedMarketingJournal} from './demo.mjs';
const base='http://127.0.0.1:4196';
async function serving(){try{return(await fetch(base,{signal:AbortSignal.timeout(750)})).ok}catch{return false}}
if(await serving())throw Error('Marketing port 4196 is already serving a page. Stop that server before capture; this command never attaches to an existing origin.');
const server=spawn(process.execPath,[resolve(project,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4196','--strictPort'],{cwd:project,windowsHide:true,stdio:'pipe'});
let serverError='';server.stderr.on('data',b=>serverError+=b);server.on('error',e=>serverError+=e.message);
let browser;const captures=[],failures=[];
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.kill();void browser?.close().finally(()=>process.exit(1));});
const variants=[{id:'1440x900',width:1440,height:900,mobile:false},{id:'1920x1080',width:1920,height:1080,mobile:false},{id:'390x844',width:390,height:844,mobile:true}];
async function settled(page){
 await expect(page.locator('.app-shell')).toBeVisible();await expect(page.locator('.page-loading,.memory-loading')).toHaveCount(0);
 await expect(page.locator('#main-content > div').last()).toHaveCSS('opacity','1');
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(image=>{const r=image.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth}).map(async image=>{await image.decode();if(image.currentSrc&&!image.naturalWidth)throw Error('Broken image: '+image.currentSrc)}));});
 // Offscreen whileInView animations can stay paused indefinitely. Wait only for
 // running finite transitions; Playwright's screenshot also finishes finite animations.
 await expect.poll(()=>page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity).length),{timeout:5000}).toBe(0);
 await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
 await page.mouse.move(0,0);
}
async function visibleTarget(page,selector,variant){const box=await page.locator(selector).first().boundingBox();if(!box||box.x<0||box.y<0||box.x+box.width>variant.width+1||box.y+box.height>variant.height-(variant.mobile?82:0))throw Error(`Important content is outside the capture: ${selector}`);return box;}
try{
 await expect.poll(async()=>{try{return(await fetch(base)).ok}catch{return false}},{timeout:30000,message:'Marketing-only local server must start'}).toBe(true);
 if(serverError.includes('already in use'))throw Error(serverError);
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const variant of variants){
  const context=await browser.newContext({viewport:{width:variant.width,height:variant.height},deviceScaleFactor:2,isMobile:variant.mobile,hasTouch:variant.mobile,colorScheme:'dark',reducedMotion:'reduce',timezoneId:'Asia/Singapore',serviceWorkers:'block'});
  // Refuse all external HTTP requests. No uploads, remote photography or production pages.
  await context.route('**/*',route=>{const url=new URL(route.request().url());return ['http:','https:'].includes(url.protocol)&&url.origin!==base?route.abort():route.continue();});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  await page.clock.setFixedTime(new Date('2026-10-14T04:00:00Z'));
  await page.goto(base);await page.getByRole('button',{name:'Skip introduction',exact:true}).click();await expect(page.locator('.app-shell')).toBeVisible();
  const fixture=await seedMarketingJournal(page);
  async function go(path){await page.goto(base+path);await settled(page);await expect(page.locator('html')).toHaveClass(/dark/);}
  async function save(name,path,focus,extra={}){
   await settled(page);const focusBox=focus?await visibleTarget(page,focus,variant):null;
   const folder=variant.mobile?'mobile':'desktop';const file=`screenshots/${folder}/${name}_${variant.id}@2x.png`;
   await mkdir(output(`screenshots/${folder}`),{recursive:true});await page.screenshot({path:output(file),animations:'disabled'});
   const meta=await sharp(output(file)).metadata();if(meta.width!==variant.width*2||meta.height!==variant.height*2)throw Error('Unexpected screenshot dimensions');
   captures.push({name,file,route:path,viewport:{width:variant.width,height:variant.height},pixels:{width:meta.width,height:meta.height},deviceScaleFactor:2,theme:'dark',synthetic:true,focusBox,...extra});console.log(`Captured ${file}`);
  }
  const cases=variant.mobile?[
   ['10_Mobile_Dashboard','/',async()=>{await expect(page.getByRole('heading',{name:'Recent memories',exact:true})).toBeVisible();return '.hero-copy h2';}],
   ['11_Mobile_Memory_Details','/memories/marketing-lake',async()=>{await page.locator('.details-story').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));return '.details-story';}],
   ['12_Mobile_Collections','/collections',async()=>{await expect(page.locator('.managed-collection')).toHaveCount(3);return '.collection-card';}],
  ]:[
   ['01_Home_Dashboard','/',async()=>{await expect(page.getByRole('heading',{name:'Recent memories',exact:true})).toBeVisible();return '.hero-copy';}],
   ['02_Add_Memory','/add',async()=>{
    await page.getByLabel('Choose photos for your memory preview').setInputFiles(resolve(project,'public/photos/lake-weekend.jpg'));
    await page.getByLabel('Give this moment a title').fill('A weekend by the lake');await page.getByLabel('What made it special?').fill('Still water, mountain air, and a little escape worth keeping.');
    await page.getByLabel('Give this moment a title').scrollIntoViewIfNeeded();await expect(page.locator('.uploaded-photo')).toHaveCount(1);return '#memory-title';}],
   ['03_Memory_Details','/memories/marketing-lake',async()=>'.details-story'],
   ['04_Collections','/collections',async()=>{await expect(page.locator('.managed-collection')).toHaveCount(3);return '.collection-card';}],
   ['05_Timeline','/timeline',async()=>{await expect(page.locator('.timeline-month').first()).toBeVisible();return '.timeline-month h3';}],
   ['06_On_This_Day','/',async()=>{await expect(page.locator('.on-this-day .nostalgia-content')).toHaveCount(1);await page.locator('.on-this-day').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));return '.on-this-day';}],
   ['07_Memory_Jar','/jar',async()=>{await expect(page.getByRole('button',{name:'Shake the Jar',exact:true})).toBeEnabled();return '.jar-stage';}],
   ['08_Time_Capsule','/capsules',async()=>{await expect(page.locator('.capsule-card')).toHaveCount(3);await page.locator('.capsule-card').first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));return '.capsule-card';}],
   ['09_Memory_Rewind','/rewind',async()=>{await expect(page.locator('.rewind-period').first()).toBeVisible();return '.rewind-period';}],
  ];
  for(const [name,path,prepare] of cases){try{await go(path);const focus=await prepare();await save(name,path,focus);}catch(error){failures.push({name,variant:variant.id,error:error.message});console.error(`FAILED ${name}/${variant.id}: ${error.message}`);}}
  // Additional intact UI views make long pages and social crops useful without rebuilding them.
  for(const [name,path,prepare] of variant.mobile?[
   ['11_Mobile_Memory_Details_Photo','/memories/marketing-lake',async()=>{await page.locator('.details-gallery').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));return '.details-gallery';}],
   ['13_Mobile_Add_Memory','/add',async()=>{await page.getByLabel('Give this moment a title').fill('A weekend by the lake');await page.getByLabel('What made it special?').fill('Still water, mountain air, and a little escape worth keeping.');await page.getByLabel('Give this moment a title').scrollIntoViewIfNeeded();return 'input[id]';}],
   ['14_Mobile_Memory_Jar','/jar',async()=>{await expect(page.getByRole('button',{name:'Shake the Jar',exact:true})).toBeEnabled();return '.jar-heading';}],
   ['15_Mobile_Time_Capsule','/capsules',async()=>{await expect(page.locator('.capsule-card').first()).toBeVisible();await page.locator('.capsule-card').first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));return '.capsule-card';}],
  ]:[
   ['07_Memory_Jar_Revealed','/jar',async()=>{await page.getByRole('button',{name:'Shake the Jar',exact:true}).click();await expect(page.locator('.jar-reveal-card')).toBeVisible();await page.locator('.jar-reveal-card').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));return '.jar-reveal-card';}],
  ]){try{await go(path);const focus=await prepare();await save(name,path,focus,{supplemental:true});}catch(error){failures.push({name,variant:variant.id,error:error.message});}}
  await context.close();console.log(`Discarded ${variant.id} browser context (${fixture.memories} synthetic memories).`);
 }
 await json('capture-manifest.json',{generatedAt:new Date().toISOString(),origin:base,date:'2026-10-14',theme:'dark',isolation:'Three ephemeral newContext profiles; no persistent userDataDir; empty journal guard',captures,skipped:[],failures});
 if(failures.length)throw Error(`${failures.length} capture failures; see marketing/capture-manifest.json`);
}finally{await browser?.close();server.kill();}
