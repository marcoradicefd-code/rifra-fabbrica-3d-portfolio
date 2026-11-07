(()=>{
'use strict';
/* ---------- inchiostri ---------- */
// Scena: stile «plastico» a colori pieni (principale) o «matita» risograph (alternativa).
// L'interfaccia usa il design system RiFRA (DESIGN-SYSTEM.md); la scena usa i colori veri della fabbrica.
const PAPER='#f4f2ed';
const INK={ink:'#2a2b2f',wood:'#b8864f',green:'#4e9a3a',blue:'#3f7fbd',gold:'#e1ad2c',red:'#c2412f'};
const ANG={ink:45,wood:15,green:75,blue:105,gold:0,red:30};
const REG={ink:[0,0],wood:[.7,-.45],green:[-.55,.5],blue:[.45,.6],gold:[-.4,-.5],red:[.5,.3]};
const TONES=[.1,.22,.4,.6];
const DOT=3.3;
const LW=.9;
const TAU=Math.PI*2;
const U=16, CS=Math.cos(Math.PI/6), SN=.5;
const P=(x,y,z=0)=>[(x-y)*CS*U,(x+y)*SN*U-z*U];
const rnd=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const lerp=(a,b,t)=>a+(b-a)*t;
const KIOSK=/[?&]kiosk\b/.test(location.search);
const VIDEO=/[?&]video\b/.test(location.search),VIDEOPEN=/[?&]video=matita\b/.test(location.search);
const RM=!KIOSK&&matchMedia('(prefers-reduced-motion: reduce)').matches;

const cv=document.getElementById('scene');
const ctx=cv.getContext('2d');
let W=0,H=0,DPR=1,PAT={},GRAIN=null;

function buildPatterns(){
  PAT={};
  for(const k in INK){
    PAT[k]=TONES.map(tn=>{
      const R=48,c=document.createElement('canvas');c.width=c.height=R;
      const g=c.getContext('2d');g.fillStyle=INK[k];
      g.beginPath();g.arc(R/2,R/2,R*Math.sqrt(tn/Math.PI),0,TAU);g.fill();
      const p=ctx.createPattern(c,'repeat');
      p.setTransform(new DOMMatrix().rotateSelf(ANG[k]).scaleSelf(DOT/R));
      return p;
    });
  }
  const g=document.createElement('canvas');g.width=g.height=256;
  const gx=g.getContext('2d');const im=gx.createImageData(256,256);
  for(let i=0;i<im.data.length;i+=4){const v=235+Math.random()*20|0;im.data[i]=v;im.data[i+1]=v-1;im.data[i+2]=v-4;im.data[i+3]=255}
  gx.putImageData(im,0,0);
  GRAIN=ctx.createPattern(g,'repeat');
}
let FLAT=false;const RGB={};for(const k in INK){const h=INK[k];RGB[k]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16))}
// plastico a colori pieni: ogni faccia è UN colore opaco calcolato (niente multiply, niente fango sui muri scuri)
let SOLID=true;
const PAPER3='#f5f4f1',P3=[245,244,241];
const INK3={ink:'#2f3035',wood:'#c9975f',green:'#5caa45',blue:'#4c8fcd',gold:'#ecb935',red:'#cc4a35'},RGB3={};
for(const k in INK3){const h=INK3[k];RGB3[k]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16))}
const RG=k=>SOLID?[0,0]:REG[k];
const SOLC=new Map();
const hexOf=c=>'#'+c.map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
function solidOf(layers){
  const key=layers.map(l=>l[0]+l[1]).join('|');let c=SOLC.get(key);if(c)return c;
  let r=P3.slice();
  for(const [k,t] of layers){const a=t>=.85?1:Math.min(1,.12+t*1.15),ink=RGB3[k];r=r.map((v,i)=>v*lerp(255,ink[i],a)/255)}
  c=hexOf(r);SOLC.set(key,c);return c;
}
function sty(k,t){
  if(SOLID)return solidOf([[k,t]]);
  if(t>=.85)return INK[k];
  if(FLAT)return `rgba(${RGB[k]},${Math.min(1,t*1.15)})`;
  let i=0;for(let j=1;j<TONES.length;j++)if(Math.abs(TONES[j]-t)<Math.abs(TONES[i]-t))i=j;
  return PAT[k][i];
}

/* ---------- primitive di stampa ---------- */
function knock(build){ctx.globalCompositeOperation='source-over';ctx.fillStyle=PAPER;ctx.beginPath();build();ctx.fill();ctx.globalCompositeOperation='multiply'}
function inkFill(build,k,t){
  if(SOLID){ctx.fillStyle=`rgba(${RGB3[k]},${Math.min(.75,t*.7)})`;ctx.beginPath();build();ctx.fill();return}
  const o=RG(k);ctx.save();ctx.translate(o[0],o[1]);ctx.fillStyle=sty(k,t);ctx.beginPath();build();ctx.fill();ctx.restore()}
function line(build,w=LW,k='ink',t=1){ctx.strokeStyle=sty(k,t);ctx.lineWidth=w;ctx.beginPath();build();ctx.stroke()}
function oline(build,w){if(SOLID){ctx.strokeStyle='rgba(20,20,24,.30)';ctx.lineWidth=w*.7;ctx.beginPath();build();ctx.stroke()}else line(build,w)}
function shp(build,layers,ln=true,paper=true){
  if(SOLID){
    const f=layers&&layers.length?solidOf(layers):paper?PAPER3:null;
    if(f){ctx.fillStyle=f;ctx.beginPath();build();ctx.fill()}
    if(ln)oline(build,ln===true?LW:ln);return;
  }
  if(paper)knock(build);
  if(layers)for(const l of layers)inkFill(build,l[0],l[1]);
  if(ln)oline(build,ln===true?LW:ln);
}
const path=pts=>()=>{ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath()};
const open=pts=>()=>{ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1])};
function seg(a,b,w=LW,k='ink',t=1){line(open([a,b]),w,k,t)}
function paperStroke(build,w){
  if(SOLID){ctx.strokeStyle=PAPER3;ctx.lineWidth=w;ctx.beginPath();build();ctx.stroke();return}
  ctx.globalCompositeOperation='source-over';ctx.strokeStyle=PAPER;ctx.lineWidth=w;ctx.beginPath();build();ctx.stroke();ctx.globalCompositeOperation='multiply'}
function band(build,w,layers,outline=true){
  if(SOLID){
    if(outline){ctx.strokeStyle='rgba(20,20,24,.32)';ctx.lineWidth=w+LW*1.2;ctx.beginPath();build();ctx.stroke()}
    ctx.strokeStyle=layers.length?solidOf(layers):PAPER3;ctx.lineWidth=w;ctx.beginPath();build();ctx.stroke();return;
  }
  if(outline)line(build,w+LW*2,'ink',1);
  paperStroke(build,w);
  for(const [k,t] of layers){const o=RG(k);ctx.save();ctx.translate(o[0],o[1]);ctx.strokeStyle=sty(k,t);ctx.lineWidth=w;ctx.beginPath();build();ctx.stroke();ctx.restore()}
}
function dot(p,r,k,t=1,paper=false){shp(()=>ctx.arc(p[0],p[1],r,0,TAU),k?[[k,t]]:[],false,paper)}
function glow(p,r,k,t){if(SOLID){ctx.fillStyle=`rgba(${RGB3[k]},${t*.5})`;ctx.beginPath();ctx.arc(p[0],p[1],r,0,TAU);ctx.fill()}else shp(()=>ctx.arc(p[0],p[1],r,0,TAU),[[k,t]],false,false)}
// dissolvenza di un gruppo (entrate e uscite senza comparse di colpo)
function fade(a,fn){if(a<=.02)return;if(a>=.98){fn();return}const g=ctx.globalAlpha;ctx.globalAlpha=g*a;fn();ctx.globalAlpha=g}

// materiali: alto / sinistra (+y) / destra (+x). La luce viene da in alto a sinistra sullo schermo.
const M={
  steel:{t:[['ink',.1]],l:[['ink',.22]],r:[['ink',.4]]},
  white:{t:[],l:[['ink',.1]],r:[['ink',.22]]},
  mid:{t:[['ink',.22]],l:[['ink',.4]],r:[['ink',.6]]},
  dark:{t:[['ink',.6]],l:[['ink',1]],r:[['ink',1]]},
  mdf:{t:[['wood',.22]],l:[['wood',.4]],r:[['wood',.4],['ink',.1]]},
  oak:{t:[['wood',.6]],l:[['wood',1]],r:[['wood',1],['ink',.22]]},
  card:{t:[['wood',.4]],l:[['wood',.6]],r:[['wood',.6],['ink',.1]]},
  lacq:{t:[['ink',.6]],l:[['ink',1]],r:[['ink',1]]},
  green:{t:[['green',.4]],l:[['green',.6]],r:[['green',1]]},
  blue:{t:[['blue',.4]],l:[['blue',.6]],r:[['blue',1]]},
  yellow:{t:[['gold',.4]],l:[['gold',1]],r:[['gold',1],['ink',.1]]},
  red:{t:[['red',.6]],l:[['red',1]],r:[['red',1],['ink',.22]]},
  glass:{t:[['blue',.1]],l:[['blue',.1],['ink',.1]],r:[['blue',.22],['ink',.1]]},
  wallW:{t:[['ink',.1]],l:[['ink',.1]],r:[['ink',.22]]},
  wallD:{t:[['ink',.6]],l:[['ink',.6]],r:[['ink',.6]]},
  office:{t:[['wood',.1]],l:[['wood',.1],['ink',.1]],r:[['wood',.1],['ink',.22]]},
  roof:{t:[['ink',.22]],l:[['ink',.4]],r:[['ink',.4]]},
};
function box(x,y,z,w,d,h,m,ln=true){
  // ombra di contatto sotto le cose appoggiate a terra (plastico): morbida, verso +x+y
  if(SOLID&&z<=.01&&h>.3){const dx=Math.min(1.6,h*.3),dy=Math.min(.8,h*.14);ctx.fillStyle='rgba(20,20,30,.10)';ctx.beginPath();path([P(x-.08,y-.08),P(x+w+.08,y-.08),P(x+w+dx,y+dy),P(x+w+dx,y+d+dy),P(x+dx,y+d+dy),P(x-.08,y+d+.08)])();ctx.fill()}
  const T=[P(x,y,z+h),P(x+w,y,z+h),P(x+w,y+d,z+h),P(x,y+d,z+h)];
  const R=[P(x+w,y,z),P(x+w,y+d,z),P(x+w,y+d,z+h),P(x+w,y,z+h)];
  const L=[P(x,y+d,z),P(x+w,y+d,z),P(x+w,y+d,z+h),P(x,y+d,z+h)];
  shp(path(L),m.l,ln);shp(path(R),m.r,ln);shp(path(T),m.t,ln);
  return {T,R,L};
}
// quadrilatero su un piano: 'y' = piano a y costante (faccia verso +y), 'x' = piano a x costante (faccia verso +x)
function quadY(x0,x1,y,z0,z1,layers,ln=.6){shp(path([P(x0,y,z0),P(x1,y,z0),P(x1,y,z1),P(x0,y,z1)]),layers,ln)}
function quadX(x,y0,y1,z0,z1,layers,ln=.6){shp(path([P(x,y0,z0),P(x,y1,z0),P(x,y1,z1),P(x,y0,z1)]),layers,ln)}
function floorQ(x0,y0,x1,y1,layers,ln=false){shp(path([P(x0,y0),P(x1,y0),P(x1,y1),P(x0,y1)]),layers,ln,!!(layers&&layers.length))}
const ERX=U*CS*Math.SQRT2, ERY=U*SN*Math.SQRT2;
function ell(x,y,z,r){const p=P(x,y,z);return()=>ctx.ellipse(p[0],p[1],r*ERX,r*ERY,0,0,TAU)}
function cyl(x,y,z,r,h,m){
  if(SOLID&&z<=.01&&h>.4){const p=P(x+h*.18,y+h*.08,0);ctx.fillStyle='rgba(20,20,30,.10)';ctx.beginPath();ctx.ellipse(p[0],p[1],r*ERX*1.15,r*ERY*1.15,0,0,TAU);ctx.fill()}
  const [bx,by]=P(x,y,z),[tx,ty]=P(x,y,z+h),rx=r*ERX,ry=r*ERY;
  shp(()=>{ctx.moveTo(bx-rx,by);ctx.lineTo(tx-rx,ty);ctx.lineTo(tx+rx,ty);ctx.lineTo(bx+rx,by);ctx.ellipse(bx,by,rx,ry,0,0,Math.PI);ctx.closePath()},m.l);
  const a=Math.acos(.35);
  inkFill(()=>{ctx.moveTo(tx+rx*.35,ty+ry*Math.sin(a));ctx.lineTo(tx+rx,ty);ctx.lineTo(bx+rx,by);ctx.ellipse(bx,by,rx,ry,0,0,a);ctx.closePath()},...(m.r[m.r.length-1]));
  shp(()=>ctx.ellipse(tx,ty,rx,ry,0,0,TAU),m.t);
}
/* tubo: polilinea 3D */
const KIND={
  steel:{f:[['ink',.1]],s:['ink',.22]},
  galv:{f:[['ink',.1]],s:['ink',.22],glint:true},
  black:{f:[['ink',1]],s:null},
  hose:{f:[],s:['ink',.1]},
  yellow:{f:[['gold',.6]],s:['gold',1]},
  cream:{f:[['wood',.1]],s:['ink',.1]},
  film:{f:[['blue',.1]],s:['ink',.1]},
  blueHose:{f:[['blue',.6]],s:null},
  red:{f:[['red',1]],s:['ink',.22]},
  green:{f:[['green',1]],s:['ink',.22]},
};
function pipe(pts3,r,kind='steel'){
  const pts=pts3.map(p=>P(p[0],p[1],p[2]));const w=2*r*U;const K=KIND[kind];
  const b=open(pts);
  band(b,w,K.f);
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i],c=pts[i+1];let dx=c[0]-a[0],dy=c[1]-a[1];const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;
    let nx=-dy,ny=dx;if(ny>0||(Math.abs(ny)<.01&&nx>0)){nx=-nx;ny=-ny}
    if(K.s){ctx.save();ctx.translate(-nx*w*.24,-ny*w*.24);line(open([a,c]),w*.42,K.s[0],K.s[1]);ctx.restore()}
    ctx.save();ctx.translate(nx*w*.2,ny*w*.2);paperStroke(open([a,c]),Math.max(.45,w*(K.glint?.2:.14)));ctx.restore();
  }
}
function arcPts(cx,cy,cz,R,a0,a1,plane,n=14){
  const out=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;
    if(plane==='xz')out.push([cx+R*Math.cos(a),cy,cz+R*Math.sin(a)]);
    else if(plane==='yz')out.push([cx,cy+R*Math.cos(a),cz+R*Math.sin(a)]);
    else out.push([cx+R*Math.cos(a),cy+R*Math.sin(a),cz]);}
  return out;
}
/* testo su piani isometrici */
const FAM={display:'"Instrument Serif",Georgia,serif',serif:'Newsreader,Georgia,serif',sans:'"Helvetica Neue",Arial,sans-serif'};
function ptext(str,x,y,z,plane,size,col='#000',align='left',weight=400,fam='display',ls=0){
  const [ox,oy]=P(x,y,z);ctx.save();ctx.translate(ox,oy);
  if(plane==='x')ctx.transform(CS,SN,0,1,0,0);
  else if(plane==='y')ctx.transform(CS,-SN,0,1,0,0);
  else if(plane==='floor')ctx.transform(CS,SN,-CS,SN,0,0);
  else if(plane==='floorY')ctx.transform(CS,-SN,CS,SN,0,0);
  ctx.font=`${weight} ${size*U}px ${FAM[fam]||FAM.display}`;
  try{if(ls)ctx.letterSpacing=(ls*size*U).toFixed(2)+'px'}catch(e){}
  ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.globalCompositeOperation='source-over';ctx.fillStyle=col;ctx.fillText(str,0,0);ctx.restore();
  if(!SOLID)ctx.globalCompositeOperation='multiply';
}
/* logo ufficiale RiFRA MILANO: vettoriale ricostruito dal PNG del sito (build/brand/logo.svg, 1181×449) */
const LOGO=__LOGO__;
const LOGO_P=typeof Path2D==='function'?LOGO.paths.map(d=>new Path2D(d)):[];
// piano 'x' = parete a y costante (la scritta corre lungo x); piano 'y' = parete a x costante (corre lungo y, verso -y)
function wallLogo(x,y,z,h,plane,col){const [ox,oy]=P(x,y,z),sc=h*U/LOGO.viewBox[1];ctx.save();ctx.translate(ox,oy);
  if(plane==='y')ctx.transform(-CS,SN,0,1,0,0);else ctx.transform(CS,SN,0,1,0,0);
  ctx.scale(sc,sc);ctx.globalCompositeOperation='source-over';ctx.fillStyle=col;for(const q of LOGO_P)ctx.fill(q);ctx.restore();if(!SOLID)ctx.globalCompositeOperation='multiply'}
const hp=(x,y,z,bx,by)=>{const a=P(x,y,z),b=P(bx,by,0);return[a[0]-b[0],a[1]-b[1]]};

/* ---------- persone ---------- */
const PS=1.05;
function person(wx,wy,o={}){
  // face: verso sinistra/destra sullo schermo; view: 1 di fronte, -1 di schiena (in mezzo la figura ruota)
  const [bx,by]=P(wx,wy,o.z||0);let f=o.face==null?1:o.face;if(Math.abs(f)<.06)f=(f<0?-.06:.06);
  const vw=o.view==null?1:o.view,back=vw<0,vs=Math.max(.14,Math.abs(vw));
  ctx.save();ctx.translate(bx,by);ctx.scale(PS,PS);
  if(!o.z)shp(()=>ctx.ellipse(0,0,6.5,2.5,0,0,TAU),[['ink',.22]],false);
  ctx.scale(f*vs,1);
  const shirt=o.shirt||[['ink',.6]],pants=o.pants||[['ink',1]],skin=[['wood',.22],['red',.1]],glove=o.gloves||skin;
  const sw=o.walk!=null?Math.sin(o.walk)*2.6*(o.stride==null?1:o.stride):0,lean=o.lean||0,cr=o.crouch||0;
  const seed=(wx*7.3+wy*3.1)%TAU,breath=RM?0:Math.sin(T*2.1+seed)*.35;
  const bob=o.walk!=null?-Math.abs(Math.sin(o.walk))*1.3*(o.stride==null?1:o.stride):0;
  const hipY=-13+cr+bob*.6,shY=-23+cr*.85+Math.abs(lean)*.25+bob+breath;
  const legs=o.sit?[[[-1.2,hipY],[3.8,hipY+.5],[4.2,-6+cr*.3]],[[1.4,hipY],[5.6,hipY+.5],[6,-6+cr*.3]]]
    :[[[-1.3+lean*.15,hipY],[-1.4-sw*.5+cr*.45,hipY/2+cr*.2],[-1.7-sw,-.6]],[[1.3+lean*.15,hipY],[1.4+sw*.5+cr*.45,hipY/2+cr*.2],[1.7+sw,-.6]]];
  for(const L of legs){band(open(L),3.3,pants);shp(()=>ctx.ellipse(L[2][0]+.8,L[2][1]+.2,2,1.1,0,0,TAU),[['ink',1]],false)}
  const sh=[[-3.3+lean,shY+.8],[3.3+lean,shY+.8]];
  const rest=[[-4.7+lean*.6-sw*.6,hipY+1.5],[4.7+lean*.6+sw*.6,hipY+1.5]];
  let hands=rest;
  if(o.hands){const hb=o.hb==null?1:o.hb;hands=o.hands.map((h,i)=>{const tx=h[0]/(f*vs)/PS,ty=h[1]/PS;return[lerp(rest[i][0],tx,hb),lerp(rest[i][1],ty,hb)]})}
  const REACH=10.5;
  hands=hands.map((h,i)=>{const s=sh[i];const dx=h[0]-s[0],dy=h[1]-s[1],L=Math.hypot(dx,dy);return L>REACH?[s[0]+dx/L*REACH,s[1]+dy/L*REACH]:h});
  const arm=i=>{const s=sh[i],h=hands[i];const mx=(s[0]+h[0])/2,my=(s[1]+h[1])/2;const dx=h[0]-s[0],dy=h[1]-s[1];const L=Math.hypot(dx,dy)||1;
    let px=-dy/L,py=dx/L;
    const outX=i?1:-1;if(py<0||(Math.abs(py)<.2&&px*outX<0)){px=-px;py=-py}
    const bend=Math.sqrt(Math.max(0,5.4*5.4-(L/2)*(L/2)))*.55;
    const e=[mx+px*bend+outX*.5,my+py*bend];
    band(open([s,e,h]),2.7,shirt);shp(()=>ctx.arc(h[0],h[1],1.35,0,TAU),glove,true)};
  const tx=-4.4+lean,ty=shY-.8,tw=8.8,th=hipY-shY+2.8;
  const torso=()=>{shp(()=>ctx.roundRect(tx,ty,tw,th,[2.6,2.6,1.4,1.4]),shirt);
    // grembiule (verniciatura, F 7452): pettorina e gonna sul davanti, solo le bretelle di schiena
    if(o.apron){if(back){line(()=>{ctx.moveTo(tx+2,ty+.5);ctx.lineTo(tx+2.4,ty+th-1);ctx.moveTo(tx+tw-2,ty+.5);ctx.lineTo(tx+tw-2.4,ty+th-1)},1,'blue',1)}
      else shp(()=>ctx.roundRect(tx+1.2,ty+2.4,tw-2.4,th+3.2,[1,1,1.4,1.4]),o.apron)}};
  if(back){arm(0);arm(1);torso()}else{arm(0);torso();arm(1)}
  let look=0;if(o.hands){const hb=o.hb==null?1:o.hb;look=clamp(((hands[0][0]+hands[1][0])/2)*.12,-1.2,1.2)*hb}
  const hx=.3+lean*1.05+look,hy=shY-4.6+(o.bow||0);
  const hair=o.hair||[['ink',.9]];
  shp(()=>ctx.arc(hx,hy,3.6,0,TAU),skin);
  if(back){
    shp(()=>{ctx.arc(hx,hy,3.6,Math.PI*.9,Math.PI*2.1);ctx.quadraticCurveTo(hx,hy+3.2,hx-3.5,hy+1.2);ctx.closePath()},hair,false);
    if(o.mask)line(()=>{ctx.moveTo(hx-3.5,hy+.6);ctx.lineTo(hx+3.5,hy+.6)},.6);
    if(o.glasses)line(()=>{ctx.moveTo(hx-3.6,hy-.8);ctx.lineTo(hx-2.6,hy-.8);ctx.moveTo(hx+2.6,hy-.8);ctx.lineTo(hx+3.6,hy-.8)},.5);
  }else{
    shp(()=>{ctx.arc(hx,hy,3.6,Math.PI*1.02,Math.PI*1.98);ctx.quadraticCurveTo(hx+1,hy-1.8,hx-3.5,hy-.6);ctx.closePath()},hair,false);
    if(o.beard)shp(()=>{ctx.arc(hx,hy,3.6,.15,Math.PI*.85);ctx.closePath()},o.beardTone||[['ink',.6]],false);
    dot([hx+2.2,hy-.4],.55,'ink',1);
    if(o.glasses)line(()=>{ctx.rect(hx+.9,hy-1.3,2.5,1.7)},.6);
    if(o.mask)shp(()=>ctx.roundRect(hx-.2,hy+.2,4.0,2.6,1.2),[],.6);
  }
  ctx.restore();
}

/* ---------- animazione senza scatti ---------- */
function kf(c,keys){
  if(c<=keys[0][0])return keys[0][1];
  for(let i=1;i<keys.length;i++){const [t1,v1]=keys[i],[t0,v0]=keys[i-1];
    if(c<=t1){const u=t1>t0?ease((c-t0)/(t1-t0)):1;return Array.isArray(v0)?v0.map((a,j)=>lerp(a,v1[j],u)):lerp(v0,v1,u)}}
  return keys[keys.length-1][1];
}
const easeW=(u,r=.22)=>{const v=1/(1-r);return u<r?v*u*u/(2*r):u>1-r?1-v*(1-u)*(1-u)/(2*r):v*(u-r/2)};
function kfl(c,keys){
  if(c<=keys[0][0])return keys[0][1];
  for(let i=1;i<keys.length;i++){const [t1,v1]=keys[i],[t0,v0]=keys[i-1];
    if(c<=t1){const u=t1>t0?easeW((c-t0)/(t1-t0)):1;return lerp(v0,v1,u)}}
  return keys[keys.length-1][1];
}
function walkOf(fx,fy,c){let d=0,px=fx?fx(0):0,py=fy?fy(0):0;for(let s=.05;s<=c;s+=.05){const x=fx?fx(s):0,y=fy?fy(s):0;d+=Math.hypot(x-px,y-py);px=x;py=y}return d*9.2}
function strideOf(fn,c,dt=.05){return clamp(Math.abs(fn(c+dt)-fn(c-dt))/(2*dt)/.9,0,1)}
function fadeT(a,base=1){const v=a*base;return v<.07?0:v}
/* ---------- etichette leggibili (spazio schermo) ---------- */
let LABELS=[],LSTATION=-1,LK=1,labsFor=-1,labsDone=true;
function lab(x,y,z,text,dx=0,dy=-34){const m=ctx.getTransform(),p=P(x,y,z);
  LABELS.push({X:m.a*p[0]+m.c*p[1]+m.e,Y:m.b*p[0]+m.d*p[1]+m.f,text,dx,dy,st:LSTATION})}
function drawLabels(show){
  ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  const fs=13*DPR*LK,pad=6*DPR*LK,lh=fs*1.3;
  ctx.font=`500 ${fs}px "Helvetica Neue",Arial,sans-serif`;ctx.textBaseline='top';ctx.textAlign='left';
  const capEl=document.getElementById('caption'),capTop=capEl&&!capEl.hidden?capEl.getBoundingClientRect().top:Infinity;
  const X0=(FREE.x0+6)*DPR,X1=(FREE.x1-6)*DPR,Y0=(FREE.y0+6)*DPR,Y1=(Math.min(FREE.y1,capTop)-6)*DPR,placed=[];
  for(const L of LABELS){if(!show(L.st))continue;
    const lines=String(L.text).split('\n');const w=Math.max(...lines.map(t=>ctx.measureText(t).width))+pad*2,h=lines.length*lh+pad*1.3;
    let bx=L.X+L.dx*DPR-w/2,by=L.Y+L.dy*DPR-h;
    bx=clamp(bx,X0,Math.max(X0,X1-w));by=clamp(by,Y0,Math.max(Y0,Y1-h));
    for(let k=0;k<8;k++){const r=placed.find(q=>bx<q[2]&&q[0]<bx+w&&by<q[3]&&q[1]<by+h);if(!r)break;by=r[3]+4*DPR;if(by+h>Y1)by=r[1]-h-4*DPR}
    placed.push([bx,by,bx+w,by+h]);
    ctx.strokeStyle='#111';ctx.lineWidth=1.1*DPR;ctx.beginPath();ctx.moveTo(L.X,L.Y);
    const ax=clamp(L.X,bx+4*DPR,bx+w-4*DPR),ay=L.Y<by?by:by+h;ctx.lineTo(ax,ay);ctx.stroke();
    ctx.fillStyle='#111';ctx.beginPath();ctx.arc(L.X,L.Y,2.6*DPR,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.97)';ctx.fillRect(bx,by,w,h);ctx.strokeRect(bx,by,w,h);
    ctx.fillStyle='#111';lines.forEach((t,i)=>ctx.fillText(t,bx+pad,by+pad*.7+i*lh));
  }
}
/* ---------- effetti ---------- */
// polvere e segatura: solo dove le fonti la mostrano; deterministica (seme e tempo), aspirata verso la bocca (ax,ay,az)
function dust(x,y,z,n,seed,to=null,spread=.8){
  if(RM)return;
  for(let k=0;k<n;k++){const ph=(T*.9+rnd(seed*13+k))%1,r1=rnd(seed+k*3.3)-.5,r2=rnd(seed*7+k)-.5;
    let px=x+r1*spread,py=y+r2*spread,pz=z+ph*.4;
    if(to){px=lerp(px,to[0],ph*ph);py=lerp(py,to[1],ph*ph);pz=lerp(pz,to[2],ph*ph)}
    dot(P(px,py,pz),.5+ph*.7,'wood',.22*(1-ph*.6))}
}
// rulli di un banco: trattini che scorrono alla stessa velocità del pezzo (fase = strada percorsa)
function rollers(x0,x1,y0,y1,z,phase=0,step=.45){const o=((phase%step)+step)%step;for(let x=x0+o;x<x1;x+=step)seg(P(x,y0,z),P(x,y1,z),1.2,'ink',.4)}
// pannello in piedi (faccia verso +y) e pannello coricato
function vpan(x,y,z,w,h,m=M.mdf,d=.06){box(x,y,z,w,d,h,m)}
function fpan(x,y,z,w,d,m=M.mdf,h=.06){box(x,y,z,w,d,h,m)}
// riflesso del laccato lucido: una banda chiara che si sposta con la camera
function gloss(x0,y0,x1,y1,z,k=.5){const s=((cam.x*.004)%1+1)%1,u=lerp(.1,.8,s);
  const a=[lerp(x0,x1,u),y0],b=[lerp(x0,x1,Math.min(1,u+.12)),y0];
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha*=.28*k;ctx.fillStyle='#fff';ctx.beginPath();
  path([P(a[0],y0,z),P(b[0],y0,z),P(b[0]-.3,y1,z),P(a[0]-.3,y1,z)])();ctx.fill();ctx.restore();if(!SOLID)ctx.globalCompositeOperation='multiply'}
// carrello rosso a telaio per pannelli in piedi (F 7447, V f_020)
function cartV(x,y,n=3,m=M.mdf){box(x,y,.25,2.4,1.1,.08,M.red);for(const [a,b] of [[0,0],[2.25,0],[0,.95],[2.25,.95]])box(x+a,y+b,0,.15,.15,.25,M.dark);
  box(x,y,.33,.1,1.1,1.9,M.red);box(x+2.3,y,.33,.1,1.1,1.9,M.red);
  for(let i=0;i<n;i++)vpan(x+.15,y+.25+i*.22,.35,2.1,1.6,m);box(x,y,2.2,2.4,.1,.1,M.red)}
function pallet(x,y,w=2.2,d=1.6){box(x,y,0,w,d,.16,M.oak,.5)}
function drum(x,y){cyl(x,y,0,.42,1.25,M.blue);cyl(x,y,1.25,.42,.02,M.steel)}
