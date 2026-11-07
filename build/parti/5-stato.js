
/* ---------- stato ---------- */
const $=id=>document.getElementById(id);
const audio=$('voce');
let motionOn=true,mode='sheet',playing=false,tc=0,cur=-1,voiceOn=false,interacted=false,ended=false;
const idx=$('idx');
NAMES.forEach((n,i)=>{const li=document.createElement('li');const b=document.createElement('button');b.type='button';b.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span>${n}</span>`;b.setAttribute('aria-label',`Passaggio ${i+1}: ${n}`);b.onclick=()=>{interacted=true;jump(i,true)};li.appendChild(b);idx.appendChild(li)});
function setCard(c){const fx=document.querySelectorAll('#card .fx');fx.forEach(e=>{e.classList.remove('in');void e.offsetWidth;e.classList.add('in')});$('num').textContent=c.num;$('phase').textContent=c.phase;$('title').textContent=c.title;$('data').textContent=c.data;$('body').textContent=c.body}
function setStation(i){
  cur=i;const x=TXT[i];
  setCard({num:String(i+1).padStart(2,'0'),phase:`di 12 · ${NAMES[i]}`,title:x[0],data:x[1],body:x[2]});
  $('live').textContent=`Passaggio ${i+1} di 12: ${x[0]}`;labsFor=i;labsDone=false;
  [...idx.querySelectorAll('button')].forEach((b,k)=>k===i?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current'));
  requestAnimationFrame(()=>Object.assign(tgt,stationCam(i)));
}
function syncButtons(){
  $('play').textContent=mode==='tour'&&playing?'Pausa':mode==='sheet'?(ended?'Rivedi il giro':'Avvia il giro'):'Riprendi il giro';
  if(mode==='free')$('play').textContent='Torna al giro';
}
function play(){mode='tour';playing=true;syncButtons()}
function pause(){playing=false;syncButtons()}
function jump(i,autoplay){tc=CUES[i]+.01;ended=false;mode='tour';setStation(i);if(autoplay)play();else syncButtons()}
function goSheet(outro){mode='sheet';pause();$('live').textContent=outro?'Fine del giro':'Tavola intera';$('labs').innerHTML='';[...idx.querySelectorAll('button')].forEach(b=>b.removeAttribute('aria-current'));cur=-1;setCard(outro?OUTRO:INTRO);$('prog').style.width=outro?'100%':'0%';requestAnimationFrame(()=>Object.assign(tgt,sheetCam()));syncButtons()}
$('play').onclick=()=>{interacted=true;if(mode==='sheet'){jump(0,true)}else if(mode==='free'){if(cur<0)jump(0,true);else{setStation(cur);play()}}else playing?pause():play()};
$('next').onclick=()=>{interacted=true;jump(Math.min(11,Math.max(-1,cur)+1),mode==='sheet'||playing)};
$('prev').onclick=()=>{interacted=true;jump(Math.max(0,cur-1),mode==='sheet'||playing)};
function setStyle(solid){SOLID=solid;dirty=true;const b=$('style');b.textContent=solid?'Vista a matita':'Vista a colori';document.documentElement.classList.toggle('solid',solid);try{if(!VIDEO)localStorage.setItem('rf-stile',solid?'colori':'matita')}catch(e){}}
$('style').onclick=()=>{interacted=true;setStyle(!SOLID)};
if(!KIOSK&&!VIDEO){try{if(localStorage.getItem('rf-stile')==='matita')setStyle(false)}catch(e){}}
$('motion').onclick=()=>{interacted=true;motionOn=!motionOn;$('motion').setAttribute('aria-pressed',String(!motionOn));if(!motionOn&&playing)pause();dirty=true};
if(RM){$('motion').setAttribute('aria-pressed','true');$('motion').disabled=true;$('motion').title='Animazioni ridotte dalle impostazioni del sistema'}
$('sheet').onclick=()=>{interacted=true;goSheet(false)};
$('more').onclick=()=>{const o=$('card').classList.toggle('open');$('more').setAttribute('aria-expanded',String(o));$('more').textContent=o?'Riduci':'Leggi tutto'};
addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;if(e.target.closest&&e.target.closest('button')&&(e.key===' '||e.key==='Enter'))return;
  if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();$('next').click()}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();$('prev').click()}
  else if(e.key===' '||e.key==='b'){e.preventDefault();$('play').click()}else if(e.key==='Escape'||e.key==='s'){$('sheet').click()}
  else if(e.key==='r'&&KIOSK){kioskAttract()}
  else if(/^[0-9]$/.test(e.key)){kbuf+=e.key;clearTimeout(kbufT);kbufT=setTimeout(()=>{const n=+kbuf;kbuf='';if(n>=1&&n<=12){interacted=true;attract=false;jump(n-1,true)}},600)}});
let kbuf='',kbufT;

function updateTour(dt){
  if(mode!=='tour')return;
  if(playing)tc+=dt;
  if(tc>=END){ended=true;goSheet(true);if(KIOSK)kioskAfterEnd();return}
  let i=0;for(let k=0;k<12;k++)if(tc>=CUES[k])i=k;
  if(i!==cur)setStation(i);
  $('prog').style.width=clamp((tc-CUES[i])/((CUES[i+1]||END)-CUES[i]),0,1)*100+'%';
}

/* ---------- trascinamento e zoom ---------- */
const inert={x:0,y:0};let hoverBay=-1;
function zlim(){const s=sheetCamRaw();return[s*.8,4.5]}
function clampCam(){const b=bounds(SHEET);cam.x=clamp(cam.x,b[0],b[1]);cam.y=clamp(cam.y,b[2],b[3]);const [z0,z1]=zlim();cam.z=clamp(cam.z,z0,z1)}
// tappa sotto il puntatore: prisma della tappa (pavimento + 6 u), dal più vicino al più lontano
function bayAt(sx,sy){const wx=(sx-ax*W)/cam.z+cam.x,wy=(sy-ay*H)/cam.z+cam.y;
  const order=[...ST.keys()].sort((i,j)=>(ST[j].x+ST[j].y)-(ST[i].x+ST[i].y));
  for(const i of order){const q=hexOf6(ST[i],6);
    let inside=false;for(let a=0,b=q.length-1;a<q.length;b=a++){if((q[a][1]>wy)!==(q[b][1]>wy)&&wx<(q[b][0]-q[a][0])*(wy-q[a][1])/(q[b][1]-q[a][1])+q[a][0])inside=!inside}
    if(inside)return i}
  return -1}
const ptrs=new Map();let drag=null,moved=0,pinch0=null;
function toFree(){if(mode!=='free'){if(mode==='tour'&&playing)pause();mode='free';syncButtons()}}
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);moved=0;inert.x=inert.y=0;
  if(ptrs.size===1)drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,t:performance.now(),lx:e.clientX,ly:e.clientY};
  if(ptrs.size===2&&!KIOSK){const [a,b]=[...ptrs.values()];const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;pinch0={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:cam.z,wx:(mx-ax*W)/cam.z+cam.x,wy:(my-ay*H)/cam.z+cam.y};drag=null}});
cv.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(KIOSK){if(drag)moved=Math.max(moved,Math.hypot(e.clientX-drag.x,e.clientY-drag.y));return}
  if(ptrs.size===2&&pinch0){const [a,b]=[...ptrs.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]),mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;const [z0,z1]=zlim();const nz=clamp(pinch0.z*d/pinch0.d,z0,z1);
    cam.z=tgt.z=nz;cam.x=tgt.x=pinch0.wx-(mx-ax*W)/nz;cam.y=tgt.y=pinch0.wy-(my-ay*H)/nz;clampCam();moved=99;toFree();dirty=true;return}
  if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;moved=Math.max(moved,Math.hypot(dx,dy));const th=e.pointerType==='touch'?10:5;
    if(moved>th){toFree();cv.classList.add('dragging');cam.x=tgt.x=drag.cx-dx/cam.z;cam.y=tgt.y=drag.cy-dy/cam.z;clampCam();dirty=true;
      const n=performance.now(),dtp=Math.max(1,n-drag.t)/1000;inert.x=-(e.clientX-drag.lx)/cam.z/dtp;inert.y=-(e.clientY-drag.ly)/cam.z/dtp;drag.t=n;drag.lx=e.clientX;drag.ly=e.clientY}}});
cv.addEventListener('pointermove',e=>{if(ptrs.size||e.pointerType!=='mouse')return;const b=bayAt(e.clientX,e.clientY);if(b!==hoverBay){hoverBay=b;cv.classList.toggle('hot',b>=0);dirty=true}});
cv.addEventListener('pointerleave',()=>{if(hoverBay>=0){hoverBay=-1;cv.classList.remove('hot');dirty=true}});
const up=e=>{ptrs.delete(e.pointerId);cv.classList.remove('dragging');
  if(ptrs.size===1&&pinch0){const [p]=[...ptrs.values()];drag={x:p[0],y:p[1],cx:cam.x,cy:cam.y,t:performance.now(),lx:p[0],ly:p[1]};pinch0=null;moved=99;return}
  if(ptrs.size===0){const th=e.pointerType==='touch'?10:5;if(drag&&moved<=th){inert.x=inert.y=0;clickAt(e.clientX,e.clientY)}else if(performance.now()-(drag?drag.t:0)>90){inert.x=inert.y=0}drag=null;pinch0=null}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();if(KIOSK)return;interacted=true;toFree();dirty=true;inert.x=inert.y=0;
  const unit=e.deltaMode===1?16:e.deltaMode===2?H:1,dx=e.deltaX*unit,dy=e.deltaY*unit;
  const isPan=!e.ctrlKey&&e.deltaMode===0&&(Math.abs(dx)>0||Math.abs(dy)<40);
  if(isPan){cam.x=tgt.x=cam.x+dx/cam.z;cam.y=tgt.y=cam.y+dy/cam.z;clampCam();drag=null;return}
  const k=Math.exp(-dy*(e.ctrlKey?.01:.0015));
  const wx=(e.clientX-ax*W)/cam.z+cam.x,wy=(e.clientY-ay*H)/cam.z+cam.y;const [z0,z1]=zlim();const nz=clamp(cam.z*k,z0,z1);
  cam.z=tgt.z=nz;cam.x=tgt.x=wx-(e.clientX-ax*W)/nz;cam.y=tgt.y=wy-(e.clientY-ay*H)/nz;clampCam();drag=null},{passive:false});
function clickAt(sx,sy){interacted=true;if(KIOSK&&attract){kioskStory(0);return}
  const i=bayAt(sx,sy);if(i<0)return;
  if(mode==='tour'&&i===cur){if(!playing)play();return}
  jump(i,true)}

/* ---------- ciclo ---------- */
function resize(){dirty=true;W=cv.clientWidth;H=cv.clientHeight;DPR=Math.min(2,devicePixelRatio||1,Math.sqrt(4.2e6/Math.max(1,W*H)));
  if(KIOSK){const K=clamp(Math.min(W/1280,H/720),1,3);document.documentElement.style.setProperty('--k',K);LK=K*1.5}placeCaption();cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  if(!Object.keys(PAT).length)buildPatterns();
  const t=mode==='sheet'?sheetCam():cur>=0&&mode==='tour'?stationCam(cur):null;if(t){Object.assign(tgt,t);if(!started)Object.assign(cam,t)}}
let last=performance.now(),lastReal=last,started=false,dirty=true;const CV={x:0,y:0,lz:0};
function frame(now){
  const dt=clamp((now-last)/1000,0,.05);last=now;if(!RM&&motionOn&&!(mode==='tour'&&!playing))T+=dt;
  updateTour(clamp((now-lastReal)/1000,0,1));lastReal=now;
  if(mode!=='free'){
    if(RM){cam.x=tgt.x;cam.y=tgt.y;cam.z=tgt.z}
    else{
      // volo esce-sposta-rientra: se la meta è lontana, lo zoom obiettivo scende finché partenza e arrivo stanno nell'inquadratura
      const far=Math.hypot(tgt.x-cam.x,tgt.y-cam.y),zFit=Math.min(W,H)*.75/Math.max(1,far);
      const zGoal=Math.min(tgt.z,Math.max(zFit,zlim()[0]*1.1));
      [cam.x,CV.x]=damp(cam.x,tgt.x,CV.x,.55,dt);[cam.y,CV.y]=damp(cam.y,tgt.y,CV.y,.55,dt);let lz;[lz,CV.lz]=damp(Math.log(cam.z),Math.log(zGoal),CV.lz,.4,dt);cam.z=Math.exp(lz)}
  }else{
    if(!ptrs.size&&(Math.abs(inert.x)+Math.abs(inert.y)>.5)){cam.x+=inert.x*dt;cam.y+=inert.y*dt;const f=Math.exp(-dt*5);inert.x*=f;inert.y*=f;clampCam();tgt.x=cam.x;tgt.y=cam.y;dirty=true}
  }
  camMoving=Math.abs(tgt.x-cam.x)*cam.z+Math.abs(tgt.y-cam.y)*cam.z>.4||Math.abs(Math.log(tgt.z/cam.z))>.002;
  const anim=!RM&&motionOn&&!(mode==='tour'&&!playing);
  const veilDirty=Math.abs(VEIL-(focusStation()>=0?1:0))>.004;
  if(anim||camMoving||dirty||veilDirty||ptrs.size||!started){draw();dirty=false}started=true;if(!VIDEO)requestAnimationFrame(frame);
}
addEventListener('resize',resize);
const cardEl=$('card');const setCH=()=>{document.documentElement.style.setProperty('--card-h',cardEl.offsetHeight+'px')};setCH();
try{new ResizeObserver(()=>{setCH();const t=mode==='sheet'?sheetCam():cur>=0&&mode==='tour'?stationCam(cur):null;if(t)Object.assign(tgt,t)}).observe(cardEl)}catch(e){}
setCard(INTRO);
resize();Object.assign(tgt,sheetCam());Object.assign(cam,tgt);syncButtons();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>resize());
if(document.fonts&&document.fonts.load)Promise.all(['400 20px "Instrument Serif"','400 20px Newsreader'].map(f=>document.fonts.load(f))).then(()=>resize()).catch(()=>{});
try{new ResizeObserver(()=>resize()).observe(cv)}catch(e){}
if(!VIDEO)requestAnimationFrame(frame);
/* ---------- sottotitoli: nessuna voce per ora, la scheda porta il testo ---------- */
const capEl=$('caption');
function placeCaption(){const capEl=document.getElementById('caption');if(!capEl)return;const f=FREE;
  capEl.style.top='auto';capEl.style.left=(f.x0+8)+'px';capEl.style.right=Math.max(8,innerWidth-f.x1+8)+'px';capEl.style.marginInline='auto';
  capEl.style.bottom=Math.max(8,innerHeight-f.y1+8)+'px'}
function updateCaption(){if(!capEl.hidden)capEl.hidden=true}
/* ---------- modalità fiera (?kiosk=1) ---------- */
let attract=false,lastInput=performance.now(),kioskTimer=null;
function kioskAttract(){attract=true;clearTimeout(kioskTimer);motionOn=true;$('motion').setAttribute('aria-pressed','false');
  setStyle(true);CUES=CUES_S;END=END_S;$('tapcta').hidden=false;jump(0,true)}
function kioskStory(i){attract=false;clearTimeout(kioskTimer);$('tapcta').hidden=true;CUES=CUES_R;END=END_R;jump(i,true);lastInput=performance.now()}
function kioskAfterEnd(){clearTimeout(kioskTimer);$('kband').hidden=false;kioskTimer=setTimeout(kioskAttract,attract?9000:14000)}
if(VIDEO){
  // 3 s di apertura sulla tavola, poi il giro sui tempi di lettura, poi 8 s di chiusura con il QR
  document.documentElement.classList.add('video');interacted=true;setStyle(!VIDEOPEN);
  let vt=0,vnow=0;const INTRO_S=3;
  window.__video={duration:INTRO_S+END_R+8,intro:INTRO_S,step(dt){vt+=dt;vnow+=dt*1000;
    if(vt>=INTRO_S&&mode==='sheet'&&!ended)jump(0,true);
    if(ended&&$('kband').hidden)$('kband').hidden=false;
    frame(vnow);return vt}};
  frame(0);
}else if(KIOSK){
  document.documentElement.classList.add('kiosk');$('kband').hidden=false;
  ['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{lastInput=performance.now()},{capture:true,passive:true}));
  addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault()},{passive:false});
  addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&/^[=+\-0psPS]$/.test(e.key))e.preventDefault()});
  $('tapcta').onclick=()=>kioskStory(0);
  setInterval(()=>{if(!attract&&performance.now()-lastInput>45000&&!(mode==='tour'&&playing))kioskAttract()},2000);
  try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}
  addEventListener('error',()=>setTimeout(()=>location.reload(),5000));
  setTimeout(kioskAttract,400);
}else{['keydown','focusin','touchstart'].forEach(t=>addEventListener(t,()=>{interacted=true},{once:true,passive:true}));if(!RM)setTimeout(()=>{if(!interacted&&mode==='sheet'&&!document.hidden)jump(0,true)},12000)}
})();
