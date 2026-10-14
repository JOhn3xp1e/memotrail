import React, {type CSSProperties} from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame, useVideoConfig, staticFile, Easing} from 'remotion';
import './visuals.css';
const ease=Easing.bezier(.22,.8,.24,1);
const tween=(f:number,a:number,b:number,from=0,to=1)=>interpolate(f,[a,b],[from,to],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
const photo=(name:string)=>staticFile(`photos/${name}.jpg`);
const ui=(variant:string,name:string)=>staticFile(`ui/${variant}-${name}.png`);
const ink='#292524';
function Title({children,kicker,style,delay=12}:{children:React.ReactNode;kicker:string;style:CSSProperties;delay?:number}){
 const f=useCurrentFrame();const p=tween(f,delay,delay+32);
 return <div className="title" style={{...style,opacity:p,transform:`translateY(${(1-p)*24}px)`}}><div className="kicker">{kicker}</div><h1>{children}</h1></div>;
}
function Polaroid({name,note,date,x,y,w,angle=0,delay=0,scale=1,opacity=1}:{name:string;note:string;date:string;x:number;y:number;w:number;angle?:number;delay?:number;scale?:number;opacity?:number}){
 const f=useCurrentFrame();const p=tween(f,delay,delay+42);
 return <div className="polaroid" style={{left:x,top:y,width:w,opacity:p*opacity,transform:`translate(${(1-p)*110}px,${(1-p)*160}px) rotate(${angle+(1-p)*12}deg) scale(${scale})`}}>
 <div className="tape"/><Img src={photo(name)} style={{width:'100%',height:w*.86,objectFit:'cover'}}/><div className="hand note">{note}</div><div className="date">{date}</div></div>;
}
function Album(){
 const f=useCurrentFrame();const {width,height}=useVideoConfig();const v=height>width;
 const zoom=tween(f,0,360,1,1.035);
 return <AbsoluteFill style={{transform:`scale(${zoom})`}}>
  <div className="spine" style={{left:v?60:940}}/>
  <div className="folio" style={{left:v?100:110,top:v?130:90}}>THE LIVING SCRAPBOOK <span>—</span> VOL. 01</div>
  <Polaroid name="lake-weekend" note="The long way home" date="JUNE 08, 2025" x={v?240:1070} y={v?780:230} w={v?560:560} angle={-5} delay={18}/>
  {f<188?<Title kicker="EVERY MOMENT HAS A STORY" style={{left:v?115:120,top:v?270:330,width:v?830:740}} >Some moments<br/>deserve to stay.</Title>:
   <Title kicker="EVERY MOMENT HAS A STORY" delay={190} style={{left:v?115:120,top:v?250:250,width:v?850:730}}>Every little moment<br/>tells a story.</Title>}
  <Polaroid name="slow-mornings" note="No rush. Just us." date="A SLOW SUNDAY" x={v?80:700} y={v?1200:610} w={v?370:300} angle={-9} delay={195}/>
  <Polaroid name="golden-hour" note="Stay a little longer" date="OCTOBER 14, 2025" x={v?600:1450} y={v?1140:570} w={v?350:330} angle={7} delay={220}/>
  <div className="hand marginal" style={{left:v?110:170,top:v?1650:775,opacity:tween(f,248,280),transform:'rotate(-4deg)'}}>the days we wish we could bottle.</div>
  <div className="chapter" style={{bottom:v?105:80}}>01 <span/> THE LITTLE THINGS</div>
 </AbsoluteFill>;
}
function Mobile(){
 const f=useCurrentFrame();const {width,height}=useVideoConfig();const v=height>width;
 const p=tween(f,0,40);const w=v?560:360;const h=w*844/390;
 const x=v?260:1220;const y=v?560:135;
 const stages=[{id:'home',label:'Home Dashboard',start:0},{id:'add-memory',label:'Add Memory',start:70},{id:'photo-attachments',label:'Photo attachments',start:140}];
 return <AbsoluteFill>
  <div className="spine" style={{left:v?60:940}}/>
  <Title kicker="A HOME FOR THE GOOD BITS" style={{left:v?110:120,top:v?160:335,width:v?860:810}}>Keep your story.</Title>
  <div className="hand" style={{position:'absolute',left:v?120:130,top:v?390:555,fontSize:v?44:38,opacity:tween(f,42,70)}}>A photo. A feeling. A day worth keeping.</div>
  <div style={{position:'absolute',left:interpolate(p,[0,1],[v?240:1070,x]),top:interpolate(p,[0,1],[v?780:230,y]),width:interpolate(p,[0,1],[560,w]),height:interpolate(p,[0,1],[650,h+24]),transform:`rotate(${(1-p)*-5}deg)`,background:'#fffdfb',padding:12,boxShadow:'0 24px 70px #342b3028',borderRadius:interpolate(p,[0,1],[0,18]),overflow:'hidden'}}>
   <Img src={photo('lake-weekend')} style={{position:'absolute',inset:12,width:'calc(100% - 24px)',height:'calc(100% - 90px)',objectFit:'cover',opacity:1-p}}/>
   {stages.map((s,i)=> <Img key={s.id} src={ui('mobile',s.id)} style={{position:'absolute',inset:12,width:'calc(100% - 24px)',height:'calc(100% - 24px)',objectFit:'contain',opacity:(i===0?p:tween(f,s.start,s.start+14))}}/>)}
  </div>
  <div className="screen-label" style={{left:v?110:1220,top:v?1810:975}}>{stages[f<70?0:f<140?1:2].label}</div>
  <div className="chapter">02 <span/> MAKE IT A MEMORY</div>
 </AbsoluteFill>;
}
function PageTurn(){const f=useCurrentFrame();const {width,height}=useVideoConfig();const p=tween(f,0,36);return f<36?<div className="turning-page" style={{width,height,transform:`perspective(2600px) rotateY(${-p*105}deg)`,opacity:1-tween(f,27,36),transformOrigin:'left center'}}><div className="spine" style={{left:width*.04}}/><div className="hand" style={{position:'absolute',left:'55%',top:'45%',fontSize:60}}>a new chapter...</div></div>:null;}
function Desktop(){
 const f=useCurrentFrame();const {width,height}=useVideoConfig();const v=height>width;
 const stages=[{id:'collections',label:'Collections',start:0},{id:'timeline',label:'Timeline · Your Memory Vault',start:88},{id:'memory-vault',label:'Inside a memory',start:155}];
 const active=f<88?0:f<155?1:2;const w=v?960:1150;const x=v?60:385;const y=v?570:240;
 return <AbsoluteFill>
  <Title kicker="THE CHAPTERS OF YOUR LIFE" delay={22} style={{left:v?100:120,top:v?150:55,width:v?880:1680}}>Every chapter,{v?<br/>:' '}beautifully kept.</Title>
  <div className="browser" style={{position:'absolute',left:x,top:y,width:w,transform:`translateY(${(1-tween(f,22,57))*45}px)`,opacity:tween(f,15,40)}}>
   <div className="browser-bar"><i/><i/><i/><span>MemoTrail · {stages[active].label}</span></div>
   <div style={{position:'relative',width:w,height:w*900/1440}}>{stages.map((s,i)=><Img key={s.id} src={ui('desktop',s.id)} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:i===0?1:tween(f,s.start,s.start+15)}}/>)}</div>
  </div>
  {v&&<div style={{position:'absolute',left:100,top:1310,width:880,height:420,overflow:'hidden',border:'12px solid #fffdfb',boxShadow:'0 20px 50px #342b3020',opacity:tween(f,45,65)}}>
   <div className="detail-label">A CLOSER LOOK</div><Img src={ui('desktop',stages[active].id)} style={{position:'absolute',width:active===2?1900:1650,maxWidth:'none',left:active===2?-1040:-230,top:active===2?-175:-90}}/>
  </div>}
  <div className="screen-label" style={{left:v?100:120,top:v?1760:1010}}>{stages[active].label}</div>
  <PageTurn/>
 </AbsoluteFill>;
}
function Rediscover(){
 const f=useCurrentFrame();const {width,height}=useVideoConfig();const v=height>width;
 const active=f<70?0:f<140?1:2;
 const cards=[['memory-jar','Memory Jar','A little serendipity.'],['memory-rewind','Memory Rewind','The chapters you lived.'],['time-capsule','Time Capsule','A letter for later.']];
 return <AbsoluteFill>
  <div className="lavender-wash"/>
  <Title kicker="YESTERDAY, TODAY & SOMEDAY" style={{left:v?100:120,top:v?130:245,width:v?880:840}}>Relive yesterday.<br/>Write to tomorrow.</Title>
  <Polaroid name="golden-hour" note="Remember this feeling" date="OCTOBER 14, 2025" x={v?70:570} y={v?1230:680} w={v?300:280} angle={-8} delay={15} opacity={.85}/>
  <div style={{position:'absolute',left:v?265:1240,top:v?560:110,width:v?550:380,height:(v?550:380)*844/390,padding:12,background:'#fffdfb',boxShadow:'0 25px 75px #46345128',transform:`rotate(${tween(f,0,210,2,-1)}deg)`,overflow:'hidden'}}>
   {cards.map(([id],i)=><Img key={id} src={ui('mobile',id)} style={{position:'absolute',inset:12,width:'calc(100% - 24px)',height:'calc(100% - 24px)',objectFit:'contain',opacity:i===0?tween(f,0,20):tween(f,i*70,i*70+16)}}/>)}
  </div>
  <div className="hand" style={{position:'absolute',left:v?110:130,top:v?440:565,fontSize:46}}>{cards[active][2]}</div>
  <div className="screen-label" style={{left:v?100:1240,top:v?1790:980}}>{cards[active][1]}</div>
  <div className="chapter">04 <span/> FIND YOUR WAY BACK</div>
 </AbsoluteFill>;
}
function Finale(){
 const f=useCurrentFrame();const {width,height}=useVideoConfig();const v=height>width;const close=tween(f,0,52);const brand=tween(f,48,86);
 return <AbsoluteFill>
  <div style={{position:'absolute',left:v?140:570,top:v?460:150,width:v?800:780,height:v?1080:780,opacity:1-tween(f,55,88),transform:`scale(${tween(f,20,88,1,.88)})`}}>
   <div className="book-cover back"/>
   <div className="book-paper"><Img src={photo('lake-weekend')} style={{width:'65%',margin:'15% auto 0',transform:'rotate(-5deg)',border:'18px solid white'}}/><p className="hand" style={{textAlign:'center',fontSize:46}}>Every moment has a story.</p></div>
   <div className="book-cover front" style={{transform:`perspective(2400px) rotateY(${(1-close)*-100}deg)`,transformOrigin:'left center'}}><Img src={staticFile('brand.png')} style={{width:90,height:90,margin:'28% auto 35px'}}/><div style={{fontFamily:'Serif',fontSize:75,textAlign:'center'}}>MemoTrail<span style={{color:'#ae93d2'}}>.</span></div><div className="kicker" style={{textAlign:'center',color:'#e6dbea',marginTop:30}}>YOUR LIFE, YOUR STORIES</div></div>
  </div>
  <div style={{position:'absolute',left:v?70:250,top:v?630:310,width:v?940:1420,textAlign:'center',opacity:brand,transform:`translateY(${(1-brand)*25}px)`}}>
   <Img src={staticFile('brand.png')} style={{width:v?140:108,height:v?140:108,margin:'0 auto 36px'}}/>
   <div style={{fontFamily:'Serif',fontSize:v?150:148,letterSpacing:-5,lineHeight:1.1}}>MemoTrail<span style={{color:'#9576b8'}}>.</span></div>
   <div style={{fontSize:v?40:33,marginTop:28,letterSpacing:1}}>Your Life, Your Stories.</div>
   <div className="cta" style={{opacity:tween(f,105,135),marginTop:v?110:70}}>Start keeping your moments.</div>
  </div>
 </AbsoluteFill>;
}
export function LivingScrapbook(){
 const f=useCurrentFrame();const {width,height}=useVideoConfig();const v=height>width;
 return <AbsoluteFill style={{background:'#f5efe4',color:ink,fontFamily:'Sans'}}>
  <div className="paper-texture"/><div className="lighting"/>
  <div className="page-border" style={{inset:v?40:36}}/>
  <Sequence from={0} durationInFrames={360}><Album/></Sequence>
  <Sequence from={360} durationInFrames={210}><Mobile/></Sequence>
  <Sequence from={570} durationInFrames={210}><Desktop/></Sequence>
  <Sequence from={780} durationInFrames={210}><Rediscover/></Sequence>
  <Sequence from={990} durationInFrames={210}><Finale/></Sequence>
  <div className="running-footer" style={{opacity:f>=990?1-tween(f,990,1040):1}}>MEMOTRAIL <span>·</span> EVERY MOMENT HAS A STORY</div>
 </AbsoluteFill>;
}


