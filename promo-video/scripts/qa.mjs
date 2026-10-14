import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import sharp from 'sharp';
const exec=promisify(execFile);
const bin=resolve('node_modules/@remotion/compositor-win32-x64-msvc');
await mkdir('qa',{recursive:true});const report=[];
for(const [id,width,height] of [['Landscape',1920,1080],['Vertical',1080,1920]]){
 const file=resolve(`out/MemoTrail_LivingScrapbook_${id}.mp4`);
 const {stdout}=await exec(resolve(bin,'ffprobe.exe'),['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]);
 const info=JSON.parse(stdout);const video=info.streams.find(s=>s.codec_type==='video');
 if(video.width!==width||video.height!==height||video.r_frame_rate!=='30/1'||Number(video.nb_read_frames)!==1200||Math.abs(Number(info.format.duration)-40)>.05)throw Error(`Invalid video metadata: ${id}`);
 const decoded=await exec(resolve(bin,'ffmpeg.exe'),['-v','error','-i',file,'-an','-vf','scale=32:18','-pix_fmt','gray','-c:v','rawvideo','-f','image2pipe','pipe:1'],{encoding:'buffer',maxBuffer:4*1024*1024});
 const raw=decoded.stdout;
 if(raw.length!==1200*32*18)throw Error(`Incomplete decode: ${id}`);
 for(let frame=0;frame<1200;frame++){
  let sum=0;for(let p=0;p<576;p++)sum+=raw[frame*576+p];
  if(sum/576<3)throw Error(`Black frame ${id}/${frame}`);
 }
 if(decoded.stderr.length)throw Error(`Decode error: ${decoded.stderr.toString()}`);
 const shots=[];const times=[0,3,9,13,15.5,17.5,20.5,23,25,27.5,30,32,34,38,39.966];
 for(let i=0;i<times.length;i++){
  const output=resolve(`qa/${id}-decoded-${i}.png`);
  await exec(resolve(bin,'ffmpeg.exe'),['-v','error','-y','-ss',String(times[i]),'-i',file,'-frames:v','1',output]);
  const stats=await sharp(output).stats();if(stats.channels.every(c=>c.stdev<2))throw Error(`Blank sampled frame ${id}/${times[i]}`);
  const tw=id==='Landscape'?384:216;const th=id==='Landscape'?216:384;
  shots.push({input:await sharp(output).resize(tw,th).png().toBuffer(),left:(i%5)*tw,top:Math.floor(i/5)*th});
 }
 const tw=id==='Landscape'?384:216;const th=id==='Landscape'?216:384;
 await sharp({create:{width:tw*5,height:th*3,channels:3,background:'#ece4d9'}}).composite(shots).png().toFile(`qa/${id}-contact-sheet.png`);
 report.push({file,bytes:(await stat(file)).size,width,height,fps:30,frames:1200,duration:40,codec:video.codec_name,pixelFormat:video.pix_fmt,audioStreams:info.streams.filter(s=>s.codec_type==='audio').length,fullDecode:'passed',blackFrames:'none',sampledFrames:times});
 console.log(`Verified ${id}: ${width}×${height}, 30 fps, 1200 frames, 40 s; full decode passed.`);
}
await writeFile('qa/verification.json',JSON.stringify(report,null,2));

