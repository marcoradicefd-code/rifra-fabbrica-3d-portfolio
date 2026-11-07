
/* ================= STAZIONI ================= */
// Ogni tappa si disegna in coordinate locali 0–12 × 0–12 (x verso destra-giù, y verso sinistra-giù, z in alto).
// Fonti: F = foto di Matteo (IMG_74xx), V = video IMG_0008 (fotogrammi f_xxx), PE = piano di evacuazione, sito = rifra.com.
const S=[];
const HH=(x,y,z,px,py)=>hp(x,y,z,px,py);
// persone come nelle foto: maglietta nera, pantaloni scuri; alla verniciatura grembiule blu e guanti gialli (F 7452). Nessun cappellino.
const TN=[['ink',1]],GUANTI=[['gold',1],['green',.22]],GREMBIULE=[['blue',.6]],JEANS=[['blue',.6],['ink',.4]];
M.orange={t:[['gold',.6],['red',.22]],l:[['gold',1],['red',.4]],r:[['gold',1],['red',.6]]};

/* 1 · Il progetto: ufficio tecnico (F 7464: scrivanie, plotter, tavole appese; sito: progettazione su misura) */
S.push(t=>{
  box(.2,.2,0,11.6,.25,3.3,M.office);
  for(let i=0;i<5;i++){const x=.7+i*2.2;quadY(x,x+1.5,.46,1.3,2.9,[],.6);
    line(open([P(x+.2,.47,1.5),P(x+1.3,.47,1.5),P(x+1.3,.47,2.6),P(x+.2,.47,2.6),P(x+.2,.47,1.5)]),.5,'ink',.6);
    line(open([P(x+.2,.47,2.05),P(x+.8,.47,2.05),P(x+.8,.47,2.6)]),.5,'ink',.6)}
  lab(5.6,.46,2.9,'tavole di progetto appese (F 7464)',-20,-26);
  const desk=(x,y)=>{for(const [a,b] of [[.05,.05],[3.35,.05],[.05,1.05],[3.35,1.05]])box(x+a,y+b,0,.1,.1,.72,M.steel,.5);box(x,y,.72,3.5,1.2,.07,M.white)};
  // la pianta della cucina si disegna tratto dopo tratto, poi si cancella all'indietro
  const monitor=(x,y,prog)=>{box(x+.6,y+.1,.79,.1,.1,.35,M.dark,.5);box(x,y,1.14,1.35,.07,.85,M.dark);
    const s=(u,v)=>P(x+.1+u*1.15,y+.075,1.2+v*.72);
    shp(path([s(0,0),s(1,0),s(1,1),s(0,1)]),[['blue',.1]],false);
    const L=[[.1,.12,.9,.12],[.9,.12,.9,.88],[.9,.88,.1,.88],[.1,.88,.1,.12],[.1,.62,.55,.62],[.3,.3,.72,.3],[.72,.3,.72,.46],[.72,.46,.3,.46],[.3,.46,.3,.3]];
    const n=prog*L.length;for(let i=0;i<L.length;i++){const u=clamp(n-i,0,1);if(u<=0)break;const [a,b,c,d]=L[i];seg(s(a,b),s(lerp(a,c,u),lerp(b,d,u)),.8,'ink',1)}};
  const drawProg=c=>c<10?c/10:c<11?1:Math.max(0,1-(c-11)/3);
  const chair=(x,y)=>box(x,y,0,.9,.9,.45,M.dark,.5);
  const back=(x,y)=>box(x,y,.45,.9,.12,.75,M.dark,.5);
  desk(1.0,3.0);desk(6.4,3.0);
  monitor(2.1,3.1,drawProg(t%14));monitor(7.5,3.1,drawProg((t+6)%14));
  for(const x of [2.2,7.6]){box(x,3.9,.79,1.2,.35,.03,M.dark,.4)}
  for(const [x,ph] of [[2.8,0],[8.2,2]]){
    chair(x-.45,4.6);const ty=Math.sin((t+ph)*9)*.02;
    person(x,5.0,{z:.45,sit:true,view:-1,face:1,shirt:ph?[['ink',.4]]:TN,glasses:!ph,hands:[HH(x-.3,4.1,.84+ty,x,5.0),HH(x+.3,4.1,.84-ty,x,5.0)]});
    back(x-.45,5.45)}
  lab(2.8,3.2,2.1,'ufficio tecnico: ogni cucina è progettata su misura (sito)',-60,-34);
  // plotter: il foglio esce, si allunga e viene tagliato
  const c2=t%9,Lp=kf(c2,[[0,.03],[7,.9],[9,.9]]),pa=c2<7?1:1-clamp((c2-7)/1.4,0,1);
  for(const [a,b] of [[0,0],[1.8,0],[0,.5],[1.8,.5]])box(9.3+a,7.0+b,0,.1,.1,.85,M.dark,.5);
  box(9.2,7.0,.85,2.0,.6,.42,M.dark);
  fade(pa,()=>{quadY(9.4,11.0,7.62,.95-Lp,.95,[],.5);for(let k=1;k<5;k++){const z=.95-Lp*k/5;seg(P(9.6,7.63,z),P(9.6+rnd(k)*1.2,7.63,z),.5,'ink',.6)}});
  person(10.2,8.7,{view:-1,face:-1,shirt:[['ink',.6]],beard:true,hb:pa*clamp((c2-5)/1,0,1),hands:[HH(9.8,7.63,.4,10.2,8.7),HH(10.6,7.63,.4,10.2,8.7)]});
  lab(10.2,7.3,1.3,'plotter per le tavole di produzione (F 7464)',50,-26);
});

/* 2 · I pannelli: deposito materiali e rastrelliere gialle a sbalzo (V f_043–f_046; PE: «area a deposito materiali») */
S.push(t=>{
  for(const x of [.5,4.1,7.7,11.1])box(x,.3,0,.22,.3,4.0,M.yellow,.6);
  for(const z of [.9,2.1,3.3]){for(const x of [.5,4.1,7.7,11.1])box(x,.3,z-.12,.22,1.9,.12,M.yellow,.5);
    for(let k=0;k<3;k++)fpan(.4,.5,z+k*.08,11.1,1.6,k%2?M.white:M.mdf,.08)}
  lab(6,1.3,3.9,'rastrelliere a sbalzo per i pannelli (V f_043)',-20,-26);
  // due pile di pannelli in piedi: in arrivo (a sinistra) e controllati (a destra)
  const YF=7.0,N=6,G=.1;
  box(.4,YF-.4,0,3.4,N*G+.6,.14,M.oak,.5);box(7.6,YF-.4,0,3.4,N*G+.6,.14,M.oak,.5);
  const stack=x=>{for(let i=0;i<N;i++)vpan(x,YF-.2+i*G,.14,3.0,2.0,M.mdf)};
  stack(.6);stack(7.8);
  // un operaio porta un pannello dalla pila di sinistra a quella di destra: le due pile restano identiche
  const C=14,c=t%C,Y1=YF-.2+(N-1)*G+.01;
  const pf=c=>kfl(c,[[0,.6],[1.8,.6],[7.6,7.8],[14,7.8]]);
  const wf=c=>kfl(c,[[0,3.9],[1.8,3.9],[7.6,11.1],[8.6,11.1],[13.2,3.9],[14,3.9]]);
  const px=pf(c),wx=wf(c),wy=Y1+.7;
  vpan(px,Y1,.14,3.0,2.0,M.mdf);
  const face=kf(c,[[0,1],[8.2,1],[8.7,-1],[13.4,-1],[13.9,1],[14,1]]),hb=kf(c,[[0,0],[1.2,1],[7.8,1],[8.4,0],[14,0]]);
  person(wx,wy,{view:-1,face,shirt:TN,walk:walkOf(wf,null,c),stride:strideOf(wf,c),hb,hands:[HH(px+3.0,Y1+.06,1.7,wx,wy),HH(px+2.8,Y1+.06,.9,wx,wy)]});
  lab(2.1,Y1,2.2,'pannelli in arrivo da fornitori della Brianza, ~20 km (sito)',-40,-36);
  lab(9.3,Y1,2.2,'ogni lastra viene verificata prima dell’uso (sito)',60,-30);
  // stoccatore elettrico verde (V f_066) e transpallet rosso con un bancale di pannelli
  box(.6,9.6,0,1.3,1.5,1.2,M.green);box(1.9,9.8,0,.14,1.1,3.0,M.dark);box(2.05,9.95,.12,1.6,.14,.08,M.dark);box(2.05,10.55,.12,1.6,.14,.08,M.dark);
  pallet(7.8,9.6,2.6,1.6);for(let k=0;k<6;k++)fpan(7.85,9.65,.16+k*.08,2.5,1.5,k%2?M.white:M.mdf,.08);
  box(10.4,9.9,0,.5,1.0,.2,M.red);pipe([[10.9,10.4,.2],[11.5,10.4,1.1]],.06,'red');
});

/* 3 · La sezionatura: sezionatrice verticale a parete, telaio a doghe (V f_040, f_045) */
S.push(t=>{
  const K=.2,Lp=(x,z)=>P(x,1.9-z*K,z),Lq=(x,z)=>P(x,2.0-z*K,z);
  box(.3,1.7,0,11.2,.8,.35,M.steel);
  shp(path([Lp(.3,.35),Lp(11.5,.35),Lp(11.5,5.4),Lp(.3,5.4)]),[['ink',.22]],true);
  for(let z=.8;z<5.3;z+=.45)shp(path([Lp(.5,z),Lp(11.3,z),Lp(11.3,z+.26),Lp(.5,z+.26)]),[['wood',.4]],.5);
  shp(path([Lq(1.4,.4),Lq(9.4,.4),Lq(9.4,3.6),Lq(1.4,3.6)]),M.mdf.l,true);
  const C=11,c=t%C;
  const bx=kfl(c,[[0,10.6],[1.2,10.6],[2.8,6.2],[8.4,6.2],[9.8,10.6],[11,10.6]]);
  const hz=kf(c,[[0,4.3],[2.9,4.3],[3.4,3.7],[7.2,.45],[7.8,.45],[8.4,4.3],[11,4.3]]);
  const cutting=c>3.4&&c<7.2;
  // il taglio resta visibile finché il pezzo non viene scaricato, poi sfuma
  const kA=c<3.4?0:c<9.2?1:1-(c-9.2)/1.8;
  if(kA>0)fade(kA,()=>seg(Lq(6.2,3.6),Lq(6.2,Math.max(.4,cutting?hz:.4)),1.4,'ink',1));
  pipe([[bx,2.06-.2*K,.25],[bx,2.06-5.6*K,5.6]],.14,'steel');
  const hy=2.02-hz*K;
  box(bx-.35,hy-.05,hz-.2,.7,.45,.55,M.steel);cyl(bx,hy+.18,hz+.35,.18,.3,M.dark);
  pipe([[bx,hy+.1,hz+.6],[bx,1.2,6.4]],.1,'hose');
  if(cutting)dust(6.2,hy+.3,hz,10,3,[6.2,hy,hz+1.4],.5);
  box(10.9,3.0,0,.18,.18,1.2,M.steel);box(10.7,2.9,1.2,.55,.4,.4,M.dark);dot(P(10.9,3.31,1.45),1.3,'red',1);
  person(11.2,4.0,{view:-1,face:-1,shirt:TN,hands:[HH(10.85,3.3,1.5,11.2,4.0),HH(11.1,3.3,1.5,11.2,4.0)]});
  lab(6,1.6,5.3,'sezionatrice verticale (V f_040) · marca non leggibile',-20,-26);
  if(cutting)lab(6.2,hy,hz,'taglio a misura del pannello',80,-10);
  cartV(1.0,8.0,3);cartV(5.0,8.4,2,M.white);
});

/* 4 · La squadratura: squadratrice Casolin con carrello scorrevole e riquadro arancione a terra (V f_058, F 7445) */
S.push(t=>{
  line(open([P(1.2,1.6),P(10.4,1.6),P(10.4,7.8),P(1.2,7.8),P(1.2,1.6)]),2.4,'red',.6);
  const C=9,c=t%C,BX=6.1;
  const cx=kfl(c,[[0,.8],[1.2,.8],[4.8,4.3],[5.8,4.3],[8.4,.8],[9,.8]]);
  box(5.0,3.9,0,2.0,1.6,.85,M.white);box(4.8,3.8,.85,3.0,2.4,.08,M.steel);
  for(const lx of [1.0,8.8])box(lx,3.25,0,.12,.12,.8,M.steel,.5);
  box(.6,3.1,.8,9.6,.45,.12,M.steel);box(cx,3.0,.92,4.2,.75,.06,M.steel);
  fpan(cx+.2,3.05,.99,3.6,2.2,M.mdf);
  // taglio: il tratto del pannello che ha già passato la lama (coordinate del pannello), poi sfuma al ritorno
  const ks=c<5.8?BX-cx-.2:1.7,kA=c<6.6?1:1-clamp((c-6.6)/1.6,0,1);
  if(ks<3.6&&kA>0)fade(kA,()=>seg(P(cx+.2+Math.max(0,ks),4.4,1.06),P(cx+3.8,4.4,1.06),1.2,'ink',1));
  box(BX-.3,4.36,.92,.6,.08,.16,M.dark,.5);
  if(c>2.2&&c<4.8)dust(BX,4.4,1.1,10,4,[BX,4.4,2.4],.4);
  pipe([[7.68,6.28,2.6],[BX,4.42,2.6],[BX,4.42,1.75]],.07,'steel');
  box(BX-.5,4.2,1.25,1.0,.45,.45,M.white);
  shp(path([P(BX-.35,4.66,1.33),P(BX+.35,4.66,1.47),P(BX-.35,4.66,1.61)]),[['blue',1]],false);
  const pxf=c=>cx0(c)+1.6,cx0=c=>kfl(c,[[0,.8],[1.2,.8],[4.8,4.3],[5.8,4.3],[8.4,.8],[9,.8]]);
  const pxw=pxf(c),pyw=6.3,hb=kf(c,[[0,.3],[1,1],[5.8,1],[6.2,.3],[9,.3]]);
  person(pxw,pyw,{view:-1,face:1,shirt:TN,walk:walkOf(pxf,null,c),stride:strideOf(pxf,c),lean:.8,hb,hands:[HH(cx+1.2,5.25,1.05,pxw,pyw),HH(cx+1.9,5.25,1.05,pxw,pyw)]});
  box(7.6,6.2,0,.16,.16,2.6,M.steel);
  lab(BX,4.4,1.8,'Casolin · squadratrice (V f_058)',70,-40);
  lab(1.2,7.8,0,'riquadro arancione a terra intorno alla macchina (F 7445)',-30,24);
  cartV(1.4,.2,3);
});

/* 5 · La foratura: Biesse Brema EKO 2.1, foratrice verticale CNC (F 7444) */
S.push(t=>{
  const PY=4.0,PH=1.9,PZ=.5,C=12,c=t%C;
  box(.4,3.2,0,3.9,.7,2.3,M.white);box(6.6,3.2,0,4.9,.7,2.3,M.white);
  for(let x=.7;x<4.1;x+=.5)quadY(x,x+.25,3.91,.4,2.1,[['ink',.1]],.4);
  for(let x=6.9;x<11.4;x+=.5)quadY(x,x+.25,3.91,.4,2.1,[['ink',.1]],.4);
  box(.3,3.9,0,11.3,.5,.45,M.steel);
  const px=kfl(c,[[0,.6],[1,.6],[4.5,4.4],[6.5,4.4],[9.5,8.4],[12,8.4]]);
  const a=c<1?c:c>10.8?1-(c-10.8)/1.2:1;
  const drawP=(x0,x1)=>{const a0=Math.max(px,x0),a1=Math.min(px+3.0,x1);if(a1-a0<.02)return;
    fade(a,()=>{vpan(a0,PY,PZ,a1-a0,PH);for(const u of [.25,.55,2.45,2.75])for(const zz of [1.0,2.0]){const hx=px+u;if(hx>a0+.05&&hx<a1-.05&&hx>6.6)dot(P(hx,PY+.07,zz),1.4,'ink',1)}})};
  drawP(-9,4.3);
  box(4.3,2.6,0,2.3,1.6,3.3,M.white);
  quadY(4.45,5.45,4.21,.5,3.0,[['ink',1]]);
  quadY(5.55,5.85,4.21,.3,3.1,[['green',1]],false);
  box(6.5,4.3,1.5,.08,.08,.4,M.steel,.5);box(6.2,4.3,1.9,1.0,.08,.65,M.dark);quadY(6.26,7.14,4.39,1.96,2.5,[['blue',.22]],false);
  box(6.1,4.3,1.35,1.1,.4,.05,M.dark);
  drawP(6.6,99);
  const hb1=kf(c,[[0,1],[1.4,1],[1.9,0],[11.4,0],[12,1]]);
  person(1.9,5.4,{view:-1,face:1,shirt:TN,hb:hb1,hands:[HH(px+2.7,PY+.07,1.6,1.9,5.4),HH(px+2.9,PY+.07,1.0,1.9,5.4)]});
  const hb2=kf(c,[[0,0],[9.2,0],[9.6,1],[10.8,1],[11.4,0],[12,0]]);
  person(10.1,5.5,{view:-1,face:-1,shirt:[['ink',.6]],beard:true,hb:hb2,hands:[HH(px+.4,PY+.07,1.6,10.1,5.5),HH(px+.2,PY+.07,1.0,10.1,5.5)]});
  lab(5.4,3.4,3.3,'Biesse Brema EKO 2.1 · foratrice verticale CNC (F 7444)',-20,-34);
  if(c>7&&c<11)lab(px+2.6,PY+.07,2.0,'i fori della ferramenta, dalle quote del disegno',60,-16);
});

/* 6 · La fresatura: Biesse Rover A, centro di lavoro CNC (F 7442–7443, V f_062–f_064) */
S.push(t=>{
  for(const y of [1.4,7.8])seg(P(.6,y),P(11.4,y),2,'gold',1);
  for(const x of [2.2,6.0,9.8])seg(P(x,6.8),P(x,7.8),2,'gold',1);
  const C=14,c=t%C;
  const PATH=[[.6,.5],[5.8,.5],[5.8,1.9],[.6,1.9],[.6,.5],[1.2,1.2],[5.2,1.2]];
  const segL=[];let TL=0;for(let i=1;i<PATH.length;i++){const d=Math.hypot(PATH[i][0]-PATH[i-1][0],PATH[i][1]-PATH[i-1][1]);segL.push(d);TL+=d}
  const at=s=>{let acc=0;for(let i=1;i<PATH.length;i++){if(acc+segL[i-1]>=s){const u=(s-acc)/segL[i-1];return[lerp(PATH[i-1][0],PATH[i][0],u),lerp(PATH[i-1][1],PATH[i][1],u),i]}acc+=segL[i-1]}return[...PATH[PATH.length-1],PATH.length-1]};
  const prog=clamp((c-1.5)/8,0,1),home=[8.0,1.2],OX=2.2,OY=3.1;
  let tool;
  if(c<1.5)tool=[lerp(home[0],PATH[0][0],ease(c/1.5)),lerp(home[1],PATH[0][1],ease(c/1.5))];
  else if(c<9.5)tool=at(prog*TL);
  else if(c<11)tool=[lerp(PATH[6][0],home[0],ease((c-9.5)/1.5)),lerp(PATH[6][1],home[1],ease((c-9.5)/1.5))];
  else tool=home;
  const gx=tool[0]+OX,hy=tool[1]+OY,cutting=c>1.5&&c<9.5;
  box(gx-.8,2.2,.8,1.6,.35,2.2,M.white);
  box(1.2,2.6,0,9.8,3.4,.8,M.dark);
  for(let i=0;i<6;i++)for(let j=0;j<2;j++)box(2.0+i*1.5,3.2+j*1.6,.8,.5,.4,.15,M.mid,.4);
  fpan(OX,OY,.95,6.4,2.4,M.mdf);
  // la gola fresata resta sul pezzo, poi si cancella all'indietro quando il pezzo viene scaricato
  const shown=c<9.5?prog*TL:c<11.5?TL:TL*(1-clamp((c-11.5)/2.5,0,1));
  if(shown>0){const pts=[];let acc=0;pts.push(PATH[0]);for(let i=1;i<PATH.length;i++){if(acc+segL[i-1]>=shown){const u=(shown-acc)/segL[i-1];pts.push([lerp(PATH[i-1][0],PATH[i][0],u),lerp(PATH[i-1][1],PATH[i][1],u)]);break}pts.push(PATH[i]);acc+=segL[i-1]}
    line(open(pts.map(q=>P(q[0]+OX,q[1]+OY,1.02))),2.2,'wood',1)}
  box(gx-.25,hy-.25,1.25,.5,.5,1.35,M.dark);seg(P(gx,hy,1.25),P(gx,hy,cutting?1.0:1.12),1.6,'ink',1);
  if(cutting)dust(gx,hy,1.05,12,6,[gx,hy,2.4],.5);
  box(gx-.8,6.05,.8,1.6,.35,2.2,M.white);quadY(gx-.75,gx+.75,6.41,1.0,2.85,[['ink',.85]]);quadY(gx+.5,gx+.7,6.42,1.0,2.85,[['green',1]],false);
  box(gx-.8,2.2,2.6,1.6,4.2,.6,M.white);
  pipe([[gx,4.3,3.2],[gx,4.3,4.2],[gx-.8,3.0,6.4]],.16,'yellow');
  box(.2,7.9,0,.9,.6,1.9,M.white);quadY(.25,1.05,8.51,1.2,1.75,[['blue',.22]]);
  person(1.4,9.2,{view:-1,face:-1,shirt:TN,hands:[HH(.5,8.5,1.3+Math.sin(t*3)*.02,1.4,9.2),HH(.8,8.5,1.3,1.4,9.2)]});
  box(6.4,9.0,0,3.6,1.4,.85,M.green);box(6.3,8.9,.85,3.8,1.6,.08,M.mdf);
  shp(path([P(6.7,9.1,.94),P(7.9,9.0,.94),P(8.0,9.9,.94),P(6.8,10.0,.94)]),[],.5);shp(path([P(8.2,9.2,.94),P(9.6,9.3,.94),P(9.5,10.1,.94),P(8.1,10.0,.94)]),[],.5);
  lab(6,4.3,3.3,'Biesse Rover A · centro di lavoro CNC (F 7442)\nil sito: «le ultime macchine a 5 assi»',-30,-40);
  if(cutting)lab(gx,hy,1.1,'fresatura di sagome e gole',80,10);
  lab(8.2,9.6,1,'banco con i disegni del progetto (V f_063)',60,-6);
});

/* 7 · La bordatura: bordatrice Brandt e levigabordi De Stefani (F 7446, V f_022) */
S.push(t=>{
  const C=10,c=t%C;
  pipe([[3.0,3.0,1.75],[3.0,3.0,6.4]],.2,'galv');pipe([[7.4,3.0,1.75],[7.4,3.0,6.4]],.2,'galv');
  box(1.0,2.6,0,8.6,1.4,1.4,M.white);
  const wave=[];for(let i=0;i<=40;i++){const x=1.3+i*.2;wave.push(P(x,4.01,.95+Math.sin(i*.9)*.12))}
  line(open(wave),2.2,'blue',1);
  box(1.0,2.6,1.4,8.6,.6,.35,M.white);
  const roll=P(2.2,3.0,1.87);cyl(2.2,3.0,1.75,.45,.12,M.steel);{const a=t*2;seg(roll,[roll[0]+Math.cos(a)*6,roll[1]+Math.sin(a)*3],.8,'ink',.6)}
  box(.6,4.0,.78,9.4,.3,.12,M.steel);
  for(const lx of [.9,5.2,9.4])box(lx,5.3,0,.12,.12,.84,M.steel,.5);box(.6,5.2,.84,9.4,.2,.06,M.steel);
  // tavoli di carico e scarico con le pile
  box(.2,6.3,0,3.0,1.6,.85,M.mid);box(8.2,6.3,0,3.0,1.6,.85,M.mid);
  for(let k=0;k<4;k++){fpan(.4,6.5,.85+k*.07,2.6,1.2,M.mdf,.07);fpan(8.4,6.5,.85+k*.07,2.6,1.2,M.mdf,.07)}
  const top=.85+4*.07;
  const run=clamp((c-1.2)/6.8,0,1);
  let pp;
  if(c<1.2){const u=ease(c/1.2);pp=[lerp(.4,.8,u),lerp(6.5,4.1,u),lerp(top,.9,u)+Math.sin(u*Math.PI)*.3]}
  else if(c<8){pp=[lerp(.8,6.9,easeW(run)),4.1,.9]}
  else if(c<9.2){const u=ease((c-8)/1.2);pp=[lerp(6.9,8.4,u),lerp(4.1,6.5,u),lerp(.9,top,u)+Math.sin(u*Math.PI)*.3]}
  else pp=[8.4,6.5,top];
  rollers(.8,9.8,4.0,4.3,.9,-pp[0]);
  const pa=c<.5?c/.5:c>9.2?1-(c-9.2)/.8:1;
  fade(pa,()=>{fpan(pp[0],pp[1],pp[2],2.6,1.2,M.mdf,.07);if(pp[0]>2.6&&c<9.2)seg(P(pp[0],pp[1]+.02,pp[2]+.07),P(Math.min(pp[0]+2.6,pp[0]+2.6),pp[1]+.02,pp[2]+.07),1.6,'ink',.85)});
  const hb=kf(c,[[0,1],[1.3,1],[1.7,0],[9.6,0],[10,1]]);
  person(1.9,5.9,{view:-1,face:1,shirt:TN,hb,hands:[HH(pp[0]+1.1,pp[1]+.6,pp[2]+.1,1.9,5.9),HH(pp[0]+1.8,pp[1]+.6,pp[2]+.1,1.9,5.9)]});
  const hb2=kf(c,[[0,0],[7.6,0],[8,1],[9.2,1],[9.6,0],[10,0]]);
  person(9.8,5.7,{view:-1,face:-1,shirt:[['ink',.6]],hb:hb2,hands:[HH(pp[0]+.4,pp[1]+.6,pp[2]+.1,9.8,5.7),HH(pp[0]+1.0,pp[1]+.6,pp[2]+.1,9.8,5.7)]});
  lab(5,4.0,1.9,'Brandt · bordatrice (F 7446)',-40,-40);
  if(c>1.4&&c<8)lab(pp[0]+1.3,4.2,1.0,'il bordo viene applicato sul fianco del pannello',70,-4);
  box(3.6,9.8,0,7,.8,.9,M.white);for(let x=3.9;x<10.4;x+=.35)dot(P(x,10.2,.92),1.4,'blue',1);
  lab(7.1,10.2,.9,'De Stefani · levigabordi (V f_022)',60,-10);
});

/* 8 · La levigatura: levigatrice a nastro largo con cinque aspirazioni (F 7449) */
S.push(t=>{
  const C=10,c=t%C;
  for(let i=0;i<4;i++)cyl(.8+i*.75,.9,0,.33,1.5,i%2?M.red:{t:[['red',.6],['wood',.4]],l:[['red',1],['wood',.4]],r:[['red',1],['ink',.22]]});
  lab(1.9,.9,1.6,'rotoli di carta abrasiva (V f_035)',-40,-24);
  box(.4,3.6,0,3.9,2.2,.85,M.mid);box(7.6,3.6,0,3.9,2.2,.85,M.mid);
  const px=kfl(c,[[0,.6],[1.2,.6],[7.8,8.4],[10,8.4]]);
  rollers(.5,4.3,3.7,5.7,.87,-px);rollers(7.6,11.4,3.7,5.7,.87,-px);
  const pa=c<.8?c/.8:c>8.8?1-(c-8.8)/1.2:1;
  const drawP=(x0,x1)=>{const a0=Math.max(px,x0),a1=Math.min(px+2.8,x1);if(a1-a0>.02)fade(pa,()=>fpan(a0,3.9,.88,a1-a0,1.6,M.mdf))};
  drawP(-9,4.3);
  for(let i=0;i<5;i++)pipe([[4.7+i*.6,3.6,2.8],[4.7+i*.6,3.6,6.4]],.18,'galv');
  box(4.3,3.0,0,3.3,3.4,2.8,M.steel);
  quadY(4.6,5.9,6.41,.5,2.4,[['ink',.1]]);quadY(6.0,7.3,6.41,.5,2.4,[['ink',.1]]);
  quadX(7.61,3.3,4.2,1.4,2.3,[['blue',.22]]);
  drawP(7.6,99);
  if(px+2.8>7.6&&c<8.8)dust(7.8,4.7,1.0,10,5,[6.2,3.4,3.0],.6);
  const hb=kf(c,[[0,1],[1.4,1],[1.9,0],[9.6,0],[10,1]]);
  person(1.7,6.6,{view:-1,face:1,shirt:TN,hb,hands:[HH(px+1.1,5.5,.95,1.7,6.6),HH(px+1.8,5.5,.95,1.7,6.6)]});
  lab(5.9,3.3,2.9,'levigatrice a nastro largo (F 7449) · marca da verificare',-20,-30);
  lab(5.9,6.4,1,'il sito: dal 2005 una levigatrice robotizzata',70,-4);
});

/* 9 · La verniciatura: robot di spruzzatura Cefla Finishing Spraybotic (F 7450–7452) */
S.push(t=>{
  const C=12,c=t%C;
  box(.2,2.4,0,2.4,1.8,.8,M.steel);box(8.8,2.4,0,3.0,1.8,.8,M.steel);
  const px=kfl(c,[[0,.3],[1.2,.3],[8,9.3],[12,9.3]]);
  rollers(.3,2.6,2.5,4.1,.82,-px);rollers(8.9,11.7,2.5,4.1,.82,-px);
  const pa=c<.8?c/.8:c>11?1-(c-11):1;
  const drawP=(x0,x1,m,g)=>{const a0=Math.max(px,x0),a1=Math.min(px+2.2,x1);if(a1-a0>.02)fade(pa,()=>{fpan(a0,2.6,.85,a1-a0,1.4,m);if(g)gloss(a0,2.6,a1,4.0,.91)})};
  drawP(-9,2.6,M.mdf);
  box(2.6,1.2,0,6.2,3.4,3.4,M.white);
  dot(P(3.2,4.61,3.0),2,'red',1);
  // dentro, attraverso le tre finestre: la testa rotante con le pistole spruzza sui pannelli (F 7451)
  const wins=[0,1,2].map(i=>{const x0=2.9+i*2.0;return[P(x0,4.61,1.2),P(x0+1.7,4.61,1.2),P(x0+1.7,4.61,2.6),P(x0,4.61,2.6)]});
  for(const q of wins)shp(path(q),[['ink',.6]],.8);
  ctx.save();ctx.beginPath();for(const q of wins)path(q)();ctx.clip();
  const ix=Math.max(2.6,Math.min(8.8,px)),hxI=5.7+Math.sin(t*1.3)*2.1,on=px>2.4&&px<8.4;
  fpan(ix,2.6,.85,Math.min(2.2,8.8-ix),1.4,px>5.5?M.lacq:M.mdf);
  box(hxI-.3,3.1,2.1,.6,.6,.5,M.white);
  const hc=P(hxI,3.4,2.0);for(let k=0;k<2;k++){const a=t*6+k*Math.PI;seg(hc,[hc[0]+Math.cos(a)*9,hc[1]+Math.sin(a)*3+4],1.6,'ink',.4)}
  if(on)for(let k=0;k<3;k++)glow([hc[0],hc[1]+12+k*3],10-k*2,'blue',.22);
  ctx.restore();
  for(const q of wins){line(open([q[0],[lerp(q[0][0],q[2][0],.35),lerp(q[0][1],q[2][1],.35)]]),.6,'ink',.1)}
  drawP(8.8,99,M.lacq,true);
  // pulpito Cefla con il semaforo: verde quando il robot lavora
  box(9.4,5.3,0,1.0,.7,2.2,M.white);quadY(9.5,10.3,6.01,1.2,1.9,[['blue',.22]]);
  const lamps=[['red',2.3],['gold',2.5],['green',2.7]];for(const [k,z] of lamps){const p=P(9.9,5.65,z);dot(p,2.4,k,k==='green'&&on?1:.22,true)}
  if(on)glow(P(9.9,5.65,2.7),6,'green',.22);
  for(const [x,y,m] of [[10.9,6.6,M.red],[11.5,6.2,M.white],[11.2,7.2,M.red]]){cyl(x,y,0,.32,.7,m);cyl(x,y,.7,.32,.03,M.steel)}
  box(10.8,4.9,0,.6,.6,1.5,M.steel);pipe([[11.1,5.2,.3],[10.4,4.8,.08],[9.0,4.7,.08],[8.8,4.3,.5]],.05,'hose');
  const hb=kf(c,[[0,1],[1.3,1],[1.8,0],[11.4,0],[12,1]]);
  person(1.2,5.3,{view:-1,face:1,shirt:TN,pants:JEANS,apron:GREMBIULE,gloves:GUANTI,hb,hands:[HH(px+.9,4.0,.9,1.2,5.3),HH(px+1.6,4.0,.9,1.2,5.3)]});
  lab(5.7,1.2,3.4,'Cefla Finishing Spraybotic · robot di spruzzatura (F 7450)',-10,-34);
  lab(10.3,3.3,.9,'laccatura interna: opachi, lucidi, finiture legno (sito)',40,-28);
  lab(11.2,6.6,.8,'vernici e pompa accanto alla cabina (F 7450)',50,14);
});

/* 10 · L'essiccazione e la lucidatura: carrelli a bracci blu (V f_019–f_024) e lucidatrice EMC «Luc line» (V f_041) */
S.push(t=>{
  const dry=(x,y,n)=>{for(const [a,b] of [[0,0],[1.9,0],[0,1.5],[1.9,1.5]])box(x+a,y+b,0,.12,.12,3.6,M.green,.5);
    for(let i=0;i<n;i++){const z=.45+i*.34;box(x,y+.15,z,.12,1.3,.05,M.blue,.3);box(x+1.9,y+.15,z,.12,1.3,.05,M.blue,.3);dot(P(x+.06,y+1.45,z+.03),1,'gold',1);
      fpan(x+.12,y+.2,z+.06,1.8,1.2,M.lacq,.04)}
    box(x,y,3.6,2.02,1.62,.1,M.green,.5)};
  dry(.4,1.0,9);dry(3.0,1.0,9);dry(.4,4.6,8);
  lab(2.2,1.6,3.8,'carrelli di essiccazione per le ante verniciate (V f_019)',-40,-30);
  const C=11,c=t%C;
  box(7.6,1.0,0,2.4,9.6,1.3,M.steel);
  const py=kfl(c,[[0,1.2],[1,1.2],[9,8.4],[11,8.4]]),pa=c<.8?c/.8:c>9.6?1-(c-9.6)/1.4:1;
  rollers(1.1,10.5,7.7,9.9,1.31,0);
  fade(pa,()=>{fpan(7.9,py,1.32,1.8,1.4,M.lacq,.05);if(py>4)gloss(7.9,py,9.7,py+1.4,1.38,clamp((py-4)/3,0,1))});
  for(const y of [3.6,5.6,7.6]){box(7.7,y-.35,2.1,2.2,.7,.5,M.steel);cyl(8.8,y,1.5,.55,.3,M.mid);const p=P(8.8,y,1.5),a=t*5+y;seg([p[0]-Math.cos(a)*7,p[1]-Math.sin(a)*3],[p[0]+Math.cos(a)*7,p[1]+Math.sin(a)*3],.9,'ink',.6)}
  quadX(10.01,1.4,2.6,.4,1.1,[['blue',.22]]);
  person(6.9,1.9,{view:1,face:1,shirt:TN,hb:kf(c,[[0,1],[1.2,1],[1.7,0],[10.4,0],[11,1]]),hands:[HH(7.9,py+.5,1.4,6.9,1.9),HH(7.9,py+1.0,1.4,6.9,1.9)]});
  lab(8.8,5.6,2.1,'EMC «Luc line» · lucidatura (V f_041)\nfunzione da confermare',60,-40);
});

/* 11 · Il montaggio: strettoio Erregi e linea di montaggio (F 7453; PE: «strettoio e linea di montaggio») */
S.push(t=>{
  box(.3,.3,0,2.6,.8,3.2,M.steel);for(const z of [.6,1.4,2.2])for(let i=0;i<4;i++)box(.45+i*.6,.4,z,.5,.6,.4,M.card,.4);
  lab(1.6,.7,3.3,'ferramenta pronta sugli scaffali (F 7453)',-40,-20);
  box(9.6,.6,0,1.1,.9,3.4,M.dark);box(10.8,.6,0,1.1,.9,3.4,M.dark);
  const C=12,c=t%C;
  const cy=kfl(c,[[0,7.4],[1,7.4],[3.2,2.7],[7.2,2.7],[9.4,7.4],[12,7.4]]);
  const close=kf(c,[[0,0],[3.4,0],[4.0,1],[6.6,1],[7.1,0],[12,0]]);
  box(3.9,2.0,0,4.2,7.2,.8,M.steel);rollers(2.1,9.1,4.0,8.0,.81,0,.6);
  const carcass=()=>{box(4.4,cy,.82,3.2,1.6,2.2,M.white);quadY(4.6,7.4,cy+1.61,1.0,2.85,[['ink',.22]]);
    for(const u of [.3,1.2])seg(P(4.4+u,cy,3.02),P(4.4+u,cy+1.6,3.02),1.6,'gold',.6)};
  const inside=cy<4.9;
  box(3.2,2.2,0,.6,2.4,3.6,M.steel);
  box(4.0+close*.3,2.4,1.0,.12,2.0,1.8,M.yellow);
  if(inside)carcass();
  box(7.88-close*.3,2.4,1.0,.12,2.0,1.8,M.yellow);
  box(8.2,2.2,0,.6,2.4,3.6,M.steel);
  box(4.2,2.5,3.35-close*.28,3.6,1.8,.12,M.yellow);
  box(3.2,2.2,3.6,5.6,2.4,1.1,M.steel);
  quadY(4.0,6.2,4.61,3.75,4.6,[['ink',.6]]);for(let i=0;i<4;i++)quadY(4.2+i*.5,4.6+i*.5,4.62,3.95,4.4,[],.4);
  if(!inside)carcass();
  if(close>.5)lab(6,cy+.8,3.1,'la scocca resta in squadra mentre la colla fa presa',70,-6);
  const hb=kf(c,[[0,1],[.8,1],[1.2,0],[9.6,0],[10.2,1],[12,1]]);
  person(3.4,8.4,{view:-1,face:1,shirt:TN,hb,hands:[HH(4.5,cy+1.6,1.8,3.4,8.4),HH(4.6,cy+1.2,2.3,3.4,8.4)]});
  person(8.7,8.3,{view:-1,face:-1,shirt:[['ink',.6]],glasses:true,hb,hands:[HH(7.5,cy+1.6,1.6,8.7,8.3),HH(7.4,cy+1.2,2.1,8.7,8.3)]});
  lab(6,3.4,4.7,'Erregi · strettoio per scocche (F 7453)',-20,-34);
});

/* 12 · L'imballaggio: tavolo d'imballo (illustrativo, nessuna foto) e avvolgitore Robopac (F 7456–7457) */
S.push(t=>{
  for(const x of [.3,2.8,5.3])box(x,.3,0,.15,.9,3.4,M.orange,.5);
  for(const z of [1.1,2.3])box(.3,.3,z,5.15,.9,.1,M.orange,.5);
  for(const z of [1.2,2.4])for(let i=0;i<3;i++)box(.5+i*1.6,.4,z,1.3,.7,.6,M.card,.4);
  // tavolo: sull'anta laccata si mettono gli angolari e poi il film
  box(.8,3.0,0,4.6,2.2,.85,M.white);
  fpan(1.2,3.3,.85,3.8,1.6,M.lacq,.05);
  const C=14,c=t%C,cov=clamp((c-1)/6,0,1),fa=c<11?1:1-clamp((c-11)/2.2,0,1);
  fade(fa,()=>{for(const [x,y] of [[1.2,3.3],[4.7,3.3],[1.2,4.6],[4.7,4.6]]){if(cov>0)box(x,y,.85,.3,.3,.15,M.card,.4)}
    if(cov>.2){const x1=lerp(1.2,5.0,clamp((cov-.2)/.8,0,1));shp(path([P(1.2,3.3,.95),P(x1,3.3,.95),P(x1,4.9,.95),P(1.2,4.9,.95)]),[['blue',.1]],.4)}});
  const hx=lerp(1.4,4.8,cov);
  person(hx+.3,6.2,{view:-1,face:1,shirt:TN,lean:.8,hands:[HH(hx,4.9,1.0,hx+.3,6.2),HH(hx+.5,4.9,1.0,hx+.3,6.2)]});
  lab(3,3.5,1.4,'imballaggio: nessuna foto, disegno illustrativo',-40,-34);
  // avvolgitore: piatto rosso che gira, colonna blu con il carrello del film che sale e scende
  const TX=8.4,TY=7.0,a=RM?.4:t*1.1;
  shp(ell(TX,TY,0,1.9),[['red',.6]],true);
  const cnr=(h,z)=>[0,1,2,3].map(i=>{const q=a+Math.PI/4+i*Math.PI/2;return P(TX+Math.cos(q)*h*Math.SQRT2,TY+Math.sin(q)*h*Math.SQRT2,z)});
  const rotBox=(h,z0,z1,layers)=>{const b=cnr(h,z0),u=cnr(h,z1);
    for(let i=0;i<4;i++){const q=a+Math.PI/4+i*Math.PI/2+Math.PI/4,nx=Math.cos(q),ny=Math.sin(q);if(nx+ny>0){const j=(i+1)%4;shp(path([b[i],b[j],u[j],u[i]]),nx>ny?layers.r:layers.l)}}
    shp(path(u),layers.t)};
  rotBox(1.05,.05,.25,M.oak);rotBox(.95,.25,2.0,M.card);
  const fz=kf(c,[[0,.3],[6,2.0],[8,2.0],[11,.3],[14,.3]]),fh=c<6?fz:2.0,ff=c<11?1:1-clamp((c-11)/2,0,1);
  fade(ff,()=>{for(let z=.35;z<fh;z+=.18){const r=cnr(1.0,z);line(path(r),.8,'blue',.4)}});
  box(10.4,4.6,0,.5,.5,3.6,M.blue);box(10.1,5.1,fz,.9,.6,.5,M.blue);cyl(10.3,5.6,fz,.16,.5,{t:[['blue',.1]],l:[['blue',.1]],r:[['blue',.22]]});
  lab(10.6,4.8,3.6,'Robopac · avvolgitore per bancali (F 7456)',40,-26);
  lab(TX,TY,2.1,'gli elementi finiti su bancale, avvolti nel film',-80,-20);
});
