import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import sharp from 'sharp';
import {project,output,json} from './common.mjs';
const manifest=JSON.parse(await readFile(output('capture-manifest.json'),'utf8'));
if(manifest.failures.length)throw Error('Capture must complete without failures before composing posts.');
const image=async path=>`data:image/png;base64,${(await readFile(path)).toString('base64')}`;
const logo=await image(resolve(project,'public/icons/icon-512.png'));
const fonts=await Promise.all([['Editorial','cormorant-garamond','500'],['Body','dm-sans','400'],['Notes','caveat','400']].map(async([name,folder,weight])=>`@font-face{font-family:${name};src:url(data:font/woff2;base64,${(await readFile(resolve(project,`node_modules/@fontsource/${folder}/files/${folder}-latin-${weight}-normal.woff2`))).toString('base64')})}`));
const themes=[
 {id:'01_Meet_MemoTrail',title:['Meet','MemoTrail'],feature:'YOUR LIFE, YOUR STORIES.',body:'A little home for your beautiful moments.',desktop:'01_Home_Dashboard',mobile:'10_Mobile_Dashboard',note:'Your Life, Your Stories.'},
 {id:'02_Save_Memories',title:['Keep the moments','that matter.'],feature:'SAVE MEMORIES',body:'A photo, a feeling, a few words. Keep the good bits.',desktop:'02_Add_Memory',mobile:'13_Mobile_Add_Memory',note:'A day worth remembering.'},
 {id:'03_Collections_and_Timeline',title:['Every chapter,','beautifully kept.'],feature:'COLLECTIONS + TIMELINE',body:'Gather your moments into albums. Follow your story by date.',desktop:'04_Collections',mobile:'12_Mobile_Collections',secondary:'05_Timeline',note:'The chapters of your life.'},
 {id:'04_Rediscover_Memories',title:['Rediscover','the little things.'],feature:'MEMORY JAR + ON THIS DAY',body:'Pick a saved memory. Revisit a past anniversary.',desktop:'07_Memory_Jar',mobile:'14_Mobile_Memory_Jar',secondary:'06_On_This_Day',note:'A little serendipity.'},
 {id:'05_Time_Capsule',title:['A letter','to tomorrow.'],feature:'TIME CAPSULE',body:'Write to a future you. Open it when its day arrives.',desktop:'08_Time_Capsule',mobile:'15_Mobile_Time_Capsule',note:'A little love, sent forward.'},
 {id:'06_Offline_First_Privacy',title:['Your memories,','your space.'],feature:'OFFLINE-FIRST PRIVACY',body:'Your journal and photos stay on this device.',desktop:'01_Home_Dashboard',mobile:'10_Mobile_Dashboard',note:'Private by nature. Personal by heart.'},
];
const formats=[
 {id:'Facebook_Cover',folder:'facebook',width:1200,height:630,className:'cover'},
 {id:'Square',folder:'instagram',width:1080,height:1080,className:'square'},
 {id:'Portrait',folder:'instagram',width:1080,height:1350,className:'portrait'},
 {id:'Story',folder:'stories',width:1080,height:1920,className:'story'},
];
const css=`
 *{box-sizing:border-box}body{margin:0} .post{position:relative;overflow:hidden;background:#201e25;color:#eee8e2;font-family:Body;width:var(--w);height:var(--h)}
 .post:before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 95% 85%,#66527738,transparent 62%)}
 .border{position:absolute;inset:24px;border:1px solid #b69af827;pointer-events:none}.brand{position:absolute;top:48px;left:64px;display:flex;align-items:center;gap:14px}.brand img{width:50px;height:50px;border-radius:12px}.brand-name{font:40px/1 Editorial;letter-spacing:-1px}.dot{color:#b69af8}.brand-tagline{font:9px Body;letter-spacing:2px;margin-top:8px;color:#b7afb9}
 .index{position:absolute;right:64px;top:61px;color:#c9b2ef;font-size:12px;letter-spacing:3px}.copy{position:absolute;left:64px;top:160px;width:952px}.eyebrow{font-size:14px;letter-spacing:3px;color:#c9b2ef;margin-bottom:22px}.headline{font:500 77px/.98 Editorial;letter-spacing:-1.7px;margin:0}.headline span{display:block}.body{font-size:23px;line-height:1.45;color:#c4bac9;margin:22px 0 0;max-width:850px}
 .visual{position:absolute;left:64px;top:450px;width:952px}.paper{position:relative;padding:10px;background:#39323f;border:1px solid #6b597b;border-radius:10px;box-shadow:0 20px 55px #0004}.paper:before{content:'';position:absolute;left:43%;top:-10px;width:110px;height:23px;background:#b9a0d059;transform:rotate(-3deg);z-index:2}.screen{display:block;width:100%;height:auto;border-radius:3px}.label{font:12px Body;color:#c9b2ef;letter-spacing:2px;margin:12px 0 0}.secondary{position:absolute;width:390px;right:-8px;top:360px;z-index:2;background:#302936;padding:8px;border:1px solid #8a709b;border-radius:7px;box-shadow:0 16px 30px #0005;transform:rotate(2deg)}.secondary img{display:block;width:100%;height:auto}.secondary .label{font-size:11px;margin:9px 4px 3px}.note{position:absolute;left:64px;bottom:65px;color:#c9b2ef;font:35px Notes}.footer{position:absolute;right:64px;bottom:63px;color:#998da4;font:12px Body;letter-spacing:2px}
 .cover .brand{top:42px}.cover .brand img{width:42px;height:42px}.cover .brand-name{font-size:34px}.cover .index{top:54px;right:48px}.cover .copy{top:162px;width:320px}.cover .headline{font-size:54px;line-height:1.02;letter-spacing:-1px}.cover .eyebrow{font-size:10px;letter-spacing:2px;margin-bottom:18px}.cover .body{font-size:17px;line-height:1.5;margin-top:20px}.cover .visual{left:440px;top:121px;width:708px}.cover .secondary{width:265px;top:270px;right:-5px}.cover .note{bottom:39px;font-size:26px}.cover .footer{display:none}.cover .label{font-size:10px;margin-top:10px}
 .square .copy{top:145px}.square .headline{font-size:74px}.square .eyebrow{margin-bottom:18px;font-size:12px}.square .body{font-size:22px;margin-top:18px}.square .visual{top:436px}.square .note,.square .footer{display:none}.square .secondary{top:380px;width:320px}.square .label{font-size:10px;margin-top:8px}
 .portrait .copy{top:165px}.portrait .headline{font-size:88px}.portrait .visual{top:530px}.portrait .secondary{width:430px;top:390px}.portrait .note{bottom:87px}.portrait .footer{bottom:61px}
 .story .copy{top:185px}.story .headline{font-size:100px}.story .body{font-size:27px;max-width:850px}.story .visual{left:278px;top:620px;width:524px}.story.paired .visual{left:145px}.story .secondary{top:815px;right:-335px;width:310px;transform:rotate(3deg)}.story .note{bottom:91px;font-size:38px}.story .footer{display:none}.story .index{top:65px}.story .label{font-size:13px}.story .eyebrow{font-size:16px}
 `;
function find(name,mobile=false){const found=manifest.captures.find(c=>c.name===name&&c.viewport.width===(mobile?390:1440));if(!found)throw Error(`Missing real UI capture ${name}`);return found;}
const outputs=[];const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const format of formats){
  const context=await browser.newContext({viewport:{width:format.width,height:format.height},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',route=>route.abort());const page=await context.newPage();
  for(const theme of themes){
   const capture=find(format.className==='story'?theme.mobile:theme.desktop,format.className==='story');
   const screenshot=await image(output(capture.file));let secondary='';let secondaryCapture;
   if(theme.secondary){
    secondaryCapture=find(theme.secondary);let box;
    if(theme.secondary==='06_On_This_Day'){
      box=secondaryCapture.focusBox;
      if(!box)throw Error('Recapture required: On This Day needs its recorded real element bounds.');
    }else box={x:260,y:110,width:1120,height:440};
    const imageMeta=await sharp(output(secondaryCapture.file)).metadata();
    const left=Math.max(0,Math.round(box.x*2));const top=Math.max(0,Math.round(box.y*2));
    const width=Math.min(imageMeta.width-left,Math.round(box.width*2));const height=Math.min(imageMeta.height-top,Math.round(box.height*2));
    const buffer=await sharp(output(secondaryCapture.file)).extract({left,top,width,height}).png().toBuffer();
    secondary=`<aside class="secondary"><img src="data:image/png;base64,${buffer.toString('base64')}" alt="Actual ${theme.secondary==='05_Timeline'?'Timeline':'On This Day'} UI"><div class="label">${theme.secondary==='05_Timeline'?'TIMELINE':'ON THIS DAY'}</div></aside>`;
   }
   const title=theme.title.map((line,i)=>`<span>${line}${theme.id==='01_Meet_MemoTrail'&&i===1?'<b class="dot">.</b>':''}</span>`).join('');
   const html=`<!doctype html><html><head><meta charset="utf-8"><style>${fonts.join('\n')}${css}</style></head><body><main class="post ${format.className} ${theme.secondary?'paired':''}" style="--w:${format.width}px;--h:${format.height}px"><div class="border"></div><header class="brand"><img src="${logo}" alt="MemoTrail logo"><div><div class="brand-name">MemoTrail<span class="dot">.</span></div><div class="brand-tagline">YOUR LIFE, YOUR STORIES</div></div></header><div class="index">${theme.id.slice(0,2)} / 06</div><section class="copy"><div class="eyebrow">${theme.feature}</div><h1 class="headline">${title}</h1><p class="body">${theme.body}</p></section><figure class="visual" style="margin:0"><div class="paper"><img class="screen" src="${screenshot}" alt="Actual MemoTrail ${capture.name}"></div><figcaption class="label">${theme.feature}</figcaption>${secondary}</figure><div class="note">${theme.note}</div><div class="footer">MEMOTRAIL Â· MADE OF MOMENTS</div></main></body></html>`;
   await page.setContent(html);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))});
   const layout=await page.evaluate(()=>{
    const elements=[...document.querySelectorAll('.brand,.copy,.headline,.body,.visual,.secondary,.note,.index')];
    return elements.filter(el=>getComputedStyle(el).display!=='none').map(el=>{const b=el.getBoundingClientRect();const style=getComputedStyle(el);const clipsY=['hidden','clip'].includes(style.overflowY);const clipsX=['hidden','clip'].includes(style.overflowX);return {selector:el.className,x:b.x,y:b.y,width:b.width,height:b.height,overflowX:clipsX&&el.scrollWidth>el.clientWidth+1,overflowY:clipsY&&el.scrollHeight>el.clientHeight+2};});
   });
   for(const b of layout){if(b.x<0||b.y<0||b.x+b.width>format.width+1||b.y+b.height>format.height+1||b.overflowX||b.overflowY)throw Error(`Clipped post element ${theme.id}/${format.id}: ${JSON.stringify(b)}`);}
   const textBox=layout.find(b=>b.selector==='copy');const visualBox=layout.find(b=>b.selector==='visual');
   if(textBox.y+textBox.height+20>visualBox.y&&format.className!=='cover')throw Error(`Headline overlaps screenshot: ${theme.id}/${format.id}`);
   const file=`social-posts/${format.folder}/${theme.id}_${format.id}_${format.width}x${format.height}.png`;
   await mkdir(output(`social-posts/${format.folder}`),{recursive:true});await page.screenshot({path:output(file),animations:'disabled'});
   outputs.push({file,theme:theme.id,format:format.id,width:format.width,height:format.height,capture:capture.file,secondaryCapture:secondaryCapture?.file,title:theme.title.join(' '),body:theme.body,layoutChecks:'passed'});console.log(`Composed ${file}`);
  }await context.close();
 }
 await json('posts-manifest.json',{generatedAt:new Date().toISOString(),outputs});
}finally{await browser.close();}

