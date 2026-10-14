import {chromium, expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {seedHelpJournal} from '../../memotrail/scripts/help-fixture.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const app=resolve(root,'../memotrail');
const base='http://127.0.0.1:4188';
const server=spawn(process.execPath,[resolve(app,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4188','--strictPort'],{cwd:app,windowsHide:true,stdio:'pipe'});
server.stderr.on('data',b=>process.stderr.write(b));
let browser; const captures=[];
try {
 await expect.poll(async()=>{try{return (await fetch(base)).ok}catch{return false}},{timeout:30000}).toBe(true);
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const [variant,width,height] of [['mobile',390,844],['desktop',1440,900]]){
  // newContext is ephemeral: never a persistent Chrome profile or production origin.
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'reduce',timezoneId:'Asia/Singapore',serviceWorkers:'block'});
  const page=await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-14T04:00:00Z'));
  await page.goto(base); await page.getByRole('button',{name:'Skip introduction',exact:true}).click();
  await expect(page.locator('.app-shell')).toBeVisible(); await seedHelpJournal(page);
  await page.evaluate(async()=>{
   const request=indexedDB.open('memotrail');
   await new Promise((ok,no)=>{request.onsuccess=ok;request.onerror=no});
   const db=request.result; const tx=db.transaction('settings','readwrite');
   tx.objectStore('settings').put({key:'memotrail-preferences',value:JSON.stringify({state:{name:'memory keeper',theme:'light',sampleMode:false,reduceMotion:true},version:1})});
   await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onerror=no});db.close();
  });
  const cases=[['home','/'],['add-memory','/add'],['photo-attachments','/add'],['collections','/collections'],['timeline','/timeline'],['memory-vault','/memories/help-sea'],['memory-jar','/jar'],['memory-rewind','/rewind'],['time-capsule','/capsules']];
  for(const [id,path] of cases){
   await page.goto(base+path); await expect(page.locator('.app-shell')).toBeVisible();
   await expect(page.locator('.page-loading')).toHaveCount(0);
   await expect(page.locator('#main-content > div').last()).toHaveCSS('opacity','1');
   if(id==='home') await expect(page.getByRole('heading',{name:'Recent memories',exact:true})).toBeVisible();
   if(id==='add-memory'){
    await page.getByLabel('Give this moment a title').fill('Our little lake escape');
    await page.getByLabel('What made it special?').fill('Slow conversations. Still water. A day worth keeping.');
    await page.getByLabel('Give this moment a title').scrollIntoViewIfNeeded();
   }
   if(id==='photo-attachments'){
    await page.getByLabel('Choose photos for your memory preview').setInputFiles([resolve(root,'public/photos/lake-weekend.jpg'),resolve(root,'public/photos/golden-hour.jpg')]);
    await expect(page.locator('.uploaded-photo')).toHaveCount(2);
    await page.locator('.uploaded-photo').first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   }
   if(id==='collections')await expect(page.locator('.managed-collection')).toHaveCount(1);
   if(id==='timeline')await expect(page.locator('.timeline-month').first()).toBeVisible();
   if(id==='memory-vault')await page.locator('.details-story').scrollIntoViewIfNeeded();
   if(id==='memory-jar')await expect(page.getByRole('button',{name:'Shake the Jar',exact:true})).toBeEnabled();
   if(id==='memory-rewind')await expect(page.locator('.rewind-period').first()).toBeVisible();
   if(id==='time-capsule')await expect(page.locator('.capsule-card').first()).toBeVisible();
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});
   // Capture intact application pixels, without overlays or fabricated controls.
   const target=resolve(root,`public/ui/${variant}-${id}.png`);
   await page.screenshot({path:target,animations:'disabled'});
   captures.push({id,variant,path,width,height,pixelWidth:width*2,pixelHeight:height*2});console.log(`Captured ${variant}/${id}`);
  }
  await context.close();
 }
 await mkdir(resolve(root,'qa'),{recursive:true});
 await writeFile(resolve(root,'qa/capture-report.json'),JSON.stringify({origin:base,isolated:true,synthetic:true,captures},null,2));
}finally{await browser?.close();server.kill();}
