
/* ================= pianta (PLAN) ================= */
// Coordinate mondo, 1 u ≈ 1 m ma con corridoi e magazzino compressi («proporzioni indicative»).
// Orientamento B (ricerca/REVISIONE-3D-UX.md § 2.2): x verso SUD, y verso OVEST. Angolo di fondo = nord-est.
// Sul fondo: muro nord a gradini e cortile impianti (silo, filtri, container). Davanti e bassi: uffici (ovest) e parcheggi.
const HALL=[[0,101],[0,71],[4,71],[4,37],[9,37],[9,0],[17,0],[65,0],[65,88],[65,101]];   // perimetro del capannone (PE)
const ST=[ // tappe: rettangolo 12×12 nella zona della pianta dove sta la macchina vera
  {x:1,y:85,zona:'uffici'},     // 1 ufficio tecnico (blocco uffici a nord-ovest)
  {x:51,y:19,zona:'falegnameria'}, // 2 deposito materiali
  {x:51,y:33,zona:'falegnameria'}, // 3 sezionatrice
  {x:51,y:47,zona:'falegnameria'}, // 4 squadratrici
  {x:51,y:61,zona:'falegnameria'}, // 5 foratrice CNC
  {x:35,y:55,zona:'laboratorio'},  // 6 centri di lavoro CNC
  {x:35,y:29,zona:'carteggiatura'},// 7 bordatrice e levigabordi
  {x:35,y:15,zona:'carteggiatura'},// 8 levigatrice
  {x:19,y:17,zona:'verniciatura'}, // 9 robot e forno
  {x:46,y:1,zona:'carteggiatura'}, // 10 carrelli di essiccazione e lucidatrice (lato est)
  {x:19,y:55,zona:'montaggio'},    // 11 strettoio e linea di montaggio
  {x:19,y:75,zona:'imballaggio'},  // 12 imballaggio
].map(s=>({...s,w:12,d:12}));
const NAMES=['Il progetto','I pannelli','La sezionatura','La squadratura','La foratura','La fresatura','La bordatura','La levigatura','La verniciatura','La lucidatura','Il montaggio',"L'imballaggio"];
// zone del pavimento: tinta per luminosità, non solo per colore (daltonismo)
const ZONES=[
  {r:[4,37,13,34],f:[['ink',.04]],n:'magazzino'},{r:[9,0,8,37],f:[['ink',.04]],n:'magazzino'},
  {r:[17,0,48,88],f:[['ink',.16]],n:'produzione'},
  {r:[17,1,15,40],f:[['ink',.08]],n:'verniciatura'},
  {r:[0,71,17,30],f:[['wood',.22]],n:'uffici'},{r:[17,88,48,13],f:[['wood',.22]],n:'uffici'},
];
// il percorso del pezzo: dal progetto al magazzino, in ordine di racconto (sequenza da confermare con RiFRA)
const ROUTE=[1,2,3,4,5,6,7,8,9,10,11,12].map(n=>{const s=ST[n-1];return[s.x+6,s.y+6]});
ROUTE.push([12,55]);

/* ================= esterno ================= */
function tree(x,y,s=1){cyl(x,y,0,.25*s,1.6*s,M.oak);const p=P(x,y,2.8*s);
  shp(()=>ctx.ellipse(p[0],p[1],1.9*s*U*.9,1.6*s*U*.9,0,0,TAU),[['green',.4],['ink',.1]],true)}
function car(x,y,alongY,k){const m=[M.white,M.mid,M.dark,{t:[['blue',.22]],l:[['blue',.4]],r:[['blue',.6]]}][k%4];
  if(alongY){box(x,y,.25,1.8,4.2,.8,m);box(x+.1,y+1.1,1.05,1.6,2.2,.6,M.glass)}else{box(x,y,.25,4.2,1.8,.8,m);box(x+1.1,y+.1,1.05,2.2,1.6,.6,M.glass)}}
function ground(){
  // isola di terreno, asfalto dei cortili, via F.lli Cervi, parcheggi (PE)
  floorQ(-14,-30,96,126,[['green',.1],['wood',.1]]);
  floorQ(-6,-24,66,0,[['ink',.1]]);                        // cortile impianti (asfalto)
  floorQ(65,-24,80,122,[['ink',.1]]);                        // parcheggio sud e corsia
  floorQ(80,-30,88,126,[['ink',.4]]);                        // via F.lli Cervi
  for(let y=-26;y<124;y+=6)seg(P(84,y),P(84,y+3),1.2,'gold',.6);
  ptext('via F.lli Cervi',85.2,60,0,'floorY',1.4,SOLID?'#f3f2ef':'#fff','center',400,'serif',.04);
  for(let y=8;y<100;y+=2.8)seg(P(66.5,y),P(71.5,y+1.4),1,'ink',.1);                // stalli a spina (PE)
  floorQ(0,101,65,120,[['ink',.1]]);                         // parcheggio ovest e corsia di accesso (PE, V IMG_0012)
  for(let x=4;x<62;x+=2.7)seg(P(x,108),P(x,114),1,'ink',.1);
  // pavimento del capannone per zone, giunti del cemento ogni 6 u
  for(const z of ZONES){const [x,y,w,d]=z.r;floorQ(x,y,x+w,y+d,z.f)}
  ctx.save();ctx.globalAlpha*=.35;for(let x=18;x<65;x+=6)seg(P(x,0),P(x,88),.5,'ink',.22);for(let y=6;y<88;y+=6)seg(P(17,y),P(65,y),.5,'ink',.22);ctx.restore();
  // corridoi (PE: tre corsie est–ovest e una nord–sud)
  for(const x of [17.6,33.5,49.2])seg(P(x,1),P(x,87.5),1.6,'gold',.6);
  seg(P(17.6,44.5),P(64,44.5),1.6,'gold',.6);
  // ombra alla base dei muri (occlusione finta)
  if(SOLID){ctx.fillStyle='rgba(20,20,30,.08)';for(const [a,b] of wallSegs(true)){ctx.beginPath();const n=[a[0]===b[0]?.7:0,a[1]===b[1]?.7:0];path([P(...a),P(...b),P(b[0]+n[0],b[1]+n[1]),P(a[0]+n[0],a[1]+n[1])])();ctx.fill()}}
  route();
}
// percorso del pezzo a terra: pieno fino alla tappa in corso, poi tratteggio leggero
function route(){
  const upto=mode==='tour'&&cur>=0?cur:11;
  for(let i=0;i<ROUTE.length-1;i++){const a=ROUTE[i],b=ROUTE[i+1],m=[(a[0]+b[0])/2-(b[1]-a[1])*.12,(a[1]+b[1])/2+(b[0]-a[0])*.12];
    const pts=[];for(let k=0;k<=16;k++){const u=k/16;pts.push(P(lerp(lerp(a[0],m[0],u),lerp(m[0],b[0],u),u),lerp(lerp(a[1],m[1],u),lerp(m[1],b[1],u),u),.02))}
    const done=i<upto;ctx.setLineDash(done?[]:[4,6]);if(!RM&&!done)ctx.lineDashOffset=-T*6;
    line(open(pts),done?1.5:1.1,'red',done?.6:.3);ctx.setLineDash([]);
    const q=pts[12],r=pts[13];const ang=Math.atan2(r[1]-q[1],r[0]-q[0]);
    shp(()=>{ctx.moveTo(r[0]+Math.cos(ang)*5,r[1]+Math.sin(ang)*5);ctx.lineTo(r[0]+Math.cos(ang+2.5)*4,r[1]+Math.sin(ang+2.5)*4);ctx.lineTo(r[0]+Math.cos(ang-2.5)*4,r[1]+Math.sin(ang-2.5)*4);ctx.closePath()},[['red',done?.6:.3]],false,false)}
}
function backExterior(){
  // alberi a nord-est (V f_046–f_048), cortile impianti: pensilina, filtri, container, centrale termica, silo (PE)
  for(const [x,y,s] of [[2,-20,1.1],[6,-16,.9],[-3,-8,1],[10,-22,1.2],[-4,20,1],[-5,40,1.2],[-3,60,.9]])tree(x,y,s);
  box(13,-6,4.2,21,2,.12,M.roof);for(const x of [13.2,33.6])box(x,-5.6,0,.15,.15,4.2,M.steel,.5);
  for(let i=0;i<2;i++){const x=27+i*2.3;box(x,-11,0,2.1,3.8,5.2,M.steel);line(open([P(x+2.1,-11,.4),P(x+2.1,-7.2,5)]),.8,'ink',.4);line(open([P(x+2.1,-7.2,.4),P(x+2.1,-11,5)]),.8,'ink',.4)}
  for(let i=0;i<2;i++){const y=-18.2+i*.02,x=27+i*10.6;box(x,-18,0,10.2,3.6,2.6,{t:[['ink',.22]],l:[['ink',.4]],r:[['ink',.4],['blue',.1]]});for(let k=.6;k<10;k+=.6)seg(P(x+k,-14.39,.1),P(x+k,-14.39,2.5),.5,'ink',.22)}
  box(42,-5,0,12,4,3.6,M.white);cyl(49,-3,3.6,.3,1.6,M.steel);
  // silo polveri: cilindro grigio con telaio verde e scala (V f_046)
  const SX=58,SY=-9;
  cyl(SX,SY,0,3.4,3.2,M.green);cyl(SX,SY,3.2,3.2,9.6,{t:[['ink',.1]],l:[['ink',.22]],r:[['ink',.4]]});
  for(const z of [5.5,8.5,11.5]){const p=P(SX,SY,z);line(()=>ctx.ellipse(p[0],p[1],3.2*ERX,3.2*ERY,0,0,Math.PI),1.3,'green',1)}
  const lx=SX+2.3,ly=SY+2.3;pipe([[lx,ly,0],[lx,ly,13.2]],.05,'green');pipe([[lx+.5,ly-.5,0],[lx+.5,ly-.5,13.2]],.05,'green');
  for(let z=.6;z<13;z+=.6)seg(P(lx,ly,z),P(lx+.5,ly-.5,z),.6,'green',1);
  // condotte zincate dal capannone ai filtri e al silo: aspirazione → silo, senza parole
  pipe([[24,.2,6.6],[24,-6,6.6],[28,-9,5.2]],.45,'galv');pipe([[40,.2,6.6],[40,-6,6.6],[31,-9,5.2]],.45,'galv');
  pipe([[31,-7,4.6],[45,-7,6],[56,-8,11.6]],.3,'galv');
}
function frontExterior(){
  // auto nei parcheggi (V IMG_0012), cabina Enel ed elettrica (PE), alberi lungo la strada
  [[6,105],[11.6,105.2],[17,105],[30,105],[36,105.1],[47,105]].forEach(([x,y],i)=>car(x,y,true,i));
  [[67,12],[67,26],[67,40],[67,71],[67,86]].forEach(([x,y],i)=>car(x,y,false,i+2));
  box(68,-17,0,5,5,3,M.white);box(68,-11,0,5,4,3,M.white);
  for(const [x,y,s] of [[78,-10,1],[78,30,1.1],[78,95,1],[62,118,1],[20,120,1.1]])tree(x,y,s);
}
/* ================= capannone: muri in sezione ================= */
// lati del perimetro: quelli che danno le spalle alla camera (normale verso −x o −y) sono muri pieni,
// quelli verso la camera sono muretti di 1,2 u con la testa scura (taglio di sezione).
function wallSegs(back){const out=[];for(let i=0;i<HALL.length;i++){const a=HALL[i],b=HALL[(i+1)%HALL.length];
  // normale esterna di un poligono antiorario sullo schermo: calcolata dal verso del lato
  const dx=b[0]-a[0],dy=b[1]-a[1],nx=dy,ny=-dx; // perimetro in senso orario nella pianta mondo
  const isBack=nx<0||ny<0;if(isBack===back)out.push([a,b])}return out}
const WH=7.2;
function wallMat(a,b){ // bianco nel magazzino e negli uffici, antracite in produzione (V)
  const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;if(mx<17.1&&my<71.1)return M.wallW;if(my>87.9||(mx<17.1))return M.office;return M.wallD}
function wallsBack(){
  for(const [a,b] of wallSegs(true)){
    const m=wallMat(a,b);const q=[P(a[0],a[1],0),P(b[0],b[1],0),P(b[0],b[1],WH),P(a[0],a[1],WH)];shp(path(q),a[0]===b[0]?m.r:m.l,true);
    const L=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L,dark=m===M.wallD;
    // finestre a nastro alte (F 7444–7445) e basamento
    for(let s=1.2;s<L-2.4;s+=4.2){if(a[1]===0&&b[1]===0&&a[0]+ux*s>37&&a[0]+ux*s<50)continue;const p0=[a[0]+ux*s,a[1]+uy*s],p1=[a[0]+ux*(s+2.8),a[1]+uy*(s+2.8)];
      shp(path([P(...p0,3.6),P(...p1,3.6),P(...p1,5.4),P(...p0,5.4)]),dark?[['blue',.22],['ink',.22]]:[['blue',.22]],.6);
      for(let k=1;k<5;k++){const z=3.6+k*.36;seg(P(...p0,z),P(...p1,z),.4,'ink',.22)}}
  }
  // portoni sezionali grigi in fondo al magazzino (V f_008–f_012)
  for(const x of [10.2,13.4]){quadY(x,x+2.6,.02,0,3.4,[['ink',.22]],.8);for(let z=.45;z<3.4;z+=.45)seg(P(x,.03,z),P(x+2.6,.03,z),.5,'ink',.4)}
  // insegna sul muro est della produzione: logo ufficiale in bianco sull'antracite (illustrativo: posizione inventata)
  wallLogo(39.5,.03,6.7,3.2,'x',SOLID?'#f3f2ef':PAPER);
  ptext('GERNO DI LESMO · DAL 1977',39.5,.03,3.0,'x',.5,SOLID?'#f3f2ef':PAPER,'left',400,'serif',.18);
}
function wallsFront(){
  for(const [a,b] of wallSegs(false)){const m=wallMat(a,b),h=1.2;
    const q=[P(a[0],a[1],0),P(b[0],b[1],0),P(b[0],b[1],h),P(a[0],a[1],h)];shp(path(q),a[0]===b[0]?m.r:m.l,true);
    shp(path([P(a[0],a[1],h),P(b[0],b[1],h),P(b[0]+(a[0]===b[0]?-.35:0),b[1]+(a[1]===b[1]?-.35:0),h),P(a[0]+(a[0]===b[0]?-.35:0),a[1]+(a[1]===b[1]?-.35:0),h)]),[['ink',1]],false)}
  // divisori bassi: uffici / produzione e magazzino / produzione (con varchi)
  for(const [y0,y1] of [[17,30],[36,52],[58,64]])box(y0,87.7,0,y1-y0,.3,1.0,M.office,.5);
  for(const [y0,y1] of [[2,14],[20,34],[40,60],[64,70]])box(16.8,y0,0,.3,y1-y0,1.0,M.wallW,.5);
}
/* ================= arredi e macchine fuori dalle tappe (decor) ================= */
const DECOR=[
  // magazzino: scaffalature arancio lungo i muri nord (F 7457, V f_004–f_016), bancali e fusti blu
  {x:4.4,y:39,w:1.4,d:30,f:()=>{for(let y=0;y<30;y+=3.4){box(0,y,0,1.4,.12,3.8,M.orange,.4)}box(0,0,1.3,1.4,30,.1,M.orange,.4);box(0,0,2.6,1.4,30,.1,M.orange,.4);for(let y=.3;y<29;y+=1.7)for(const z of [1.4,2.7])box(.1,y,z,1.2,1.4,.8,M.card,.3)}},
  {x:9.4,y:2,w:1.4,d:33,f:()=>{for(let y=0;y<33;y+=3.4){box(0,y,0,1.4,.12,3.8,M.orange,.4)}box(0,0,1.3,1.4,33,.1,M.orange,.4);box(0,0,2.6,1.4,33,.1,M.orange,.4);for(let y=.3;y<32;y+=1.7)for(const z of [1.4,2.7])box(.1,y,z,1.2,1.4,.8,M.card,.3)}},
  {x:15.1,y:48,w:1.8,d:6,f:()=>{pallet(0,0,1.7,1.6);drum(.8,3.3);drum(.8,4.6)}},
  {x:6.3,y:43,w:2.6,d:3,f:()=>{drum(.6,.8);drum(1.6,1.1);drum(.9,2.1)}},
  {x:15.1,y:20,w:1.8,d:4,f:()=>{pallet(0,0,1.7,1.6);for(let k=0;k<4;k++)box(.1,.1,.16+k*.5,1.5,1.4,.5,M.card,.4)}},
  // mobili scuri pronti in magazzino (F 7459)
  {x:6.3,y:56,w:3.2,d:8,f:()=>{box(0,0,0,1.4,2.2,1.9,M.dark);box(1.8,.4,0,1.2,1.2,1.0,M.dark);box(0,3,0,1.2,4.2,.9,M.dark)}},
  // cabina di verniciatura (PE) con la macchina VP Impianti a serbatoi in pressione (F 7448, funzione da confermare)
  {x:19,y:43,w:11,d:10,f:()=>{box(.5,1,0,9.6,2.2,.8,M.blue);box(2,.8,.8,2.4,2.6,2.4,M.white);box(6,.8,.8,2.4,2.6,2.4,M.white);
    pipe([[3.2,1.4,3.2],[3.2,1.4,6.4]],.14,'yellow');pipe([[7.2,1.4,3.2],[7.2,1.4,6.4]],.14,'yellow');cyl(1.2,4.4,0,.4,1.2,M.steel);cyl(5.2,4.4,0,.35,1.0,M.dark);
    box(.2,6,0,10.5,.2,2.8,M.white)}},
  // carrelli di essiccazione accanto al robot (reparto VERNICIATURA della pianta, V f_019)
  {x:19,y:31,w:11,d:10,f:()=>{for(let i=0;i<3;i++)for(let j=0;j<2;j++){const x=.6+i*3.2,y=.6+j*4.4;for(const [a,b] of [[0,0],[2.2,0],[0,1.6],[2.2,1.6]])box(x+a,y+b,0,.12,.12,3.4,M.green,.3);
      for(let k=0;k<8;k++)fpan(x+.12,y+.2,.4+k*.36,2.1,1.3,k%3?M.lacq:M.white,.04)}}},
  // forno di essiccazione dopo il robot (PE: «robot e forno verniciatura»; forma illustrativa)
  {x:19,y:2,w:12,d:13,f:()=>{box(.5,.5,0,11,12,3.4,M.white);for(let y=1.5;y<12;y+=2)quadX(11.51,y,y+1.2,1,2.6,[['ink',.1]]);pipe([[6,3,3.4],[6,3,6.6]],.3,'galv');pipe([[3,8,3.4],[3,8,6.6]],.3,'galv')}},
  // secondo centro di lavoro CNC (PE: due centri di lavoro nel laboratorio)
  {x:35,y:44,w:12,d:10,f:()=>{box(1,2.6,0,9.8,3.2,.8,M.dark);fpan(2,3,.9,5.6,2.3,M.mdf);box(6.4,2.2,.8,1.6,4.2,2.2,M.white);quadY(6.45,7.95,6.41,1.0,2.85,[['ink',.85]]);quadY(7.7,7.9,6.42,1.0,2.85,[['green',1]],false);pipe([[7.2,4.3,3],[7.2,4.3,6.4]],.16,'yellow')}},
  // magazzino attrezzature montatori (PE)
  {x:19,y:68,w:8,d:6,f:()=>{for(let i=0;i<3;i++)box(.4+i*2.4,.4,0,2,1.0,2.6,M.steel,.5);box(.6,3,0,2.4,1.4,1.0,M.red)}},
  // uffici: scrivanie e sala riunioni lungo la striscia ovest (F 7460–7471)
  {x:20,y:89.5,w:40,d:10,f:()=>{for(let i=0;i<4;i++){const x=2+i*10;box(x,2,0,5.2,2.4,.75,M.white);box(x+.6,3.8,0,.8,.8,.45,M.dark);box(x+2.6,3.8,0,.8,.8,.45,M.dark)}box(28,5.5,0,8,2.2,.76,M.white)}},
];
// pilastri del soppalco a terra; solaio e ringhiera gialla nel livello alto (V f_064–f_069)
const MEZ={x:35,y:70,w:12,d:17};
DECOR.push({x:MEZ.x,y:MEZ.y,w:MEZ.w,d:MEZ.d,f:()=>{for(const [a,b] of [[0,0],[MEZ.w-.3,0],[0,MEZ.d-.3],[MEZ.w-.3,MEZ.d-.3],[6,0],[6,MEZ.d-.3]])box(a,b,0,.3,.3,3.2,M.steel,.5);box(1,2,0,4,5,1.8,M.white);box(6.5,8,0,3,6,2.2,M.steel)}});

/* mezzi nei corridoi */
// muletto elettrico bianco (V f_042): porta un bancale lungo il magazzino e torna vuoto in retromarcia
function forklift(t){
  const PER=40,c=t%PER,y=kfl(c,[[0,6],[2,6],[18,64],[21,64],[37,6],[40,6]]),x=13.2,load=c<19.5;
  const fz=kf(c,[[0,.12],[1,.12],[2,.4],[17.5,.4],[19,.12],[40,.12]]);
  // bancale fermo a destinazione e alla partenza: quello che viaggia coincide con uno dei due
  const pal=(yy,z)=>{box(x-.2,yy-2.4,z,1.6,2.2,.16,M.oak,.5);for(let k=0;k<3;k++)box(x-.1,yy-2.3,z+.16+k*.45,1.4,2.0,.45,M.card,.4)};
  pal(6,0);pal(64,0);
  if(load&&c>1)pal(y,fz);
  box(x-.2,y-.1,fz-.06,1.6,.1,.06,M.dark);
  box(x+.05,y,0,.1,.18,3.0,M.dark);box(x+1.15,y,0,.1,.18,3.0,M.dark);
  box(x-.1,y+.2,.2,1.5,1.9,.95,M.white);cyl(x+.1,y+.5,0,.26,.26,M.dark);cyl(x+.1,y+1.8,0,.26,.26,M.dark);
  box(x+.25,y+1.2,1.15,.9,.7,.25,M.dark);
  person(x+.6,y+1.3,{z:1.1,sit:true,view:y>34&&c<19?-1:1,face:-1,shirt:TN,hands:[hp(x+.4,y+.7,1.9,x+.6,y+1.3).map((v,i)=>i?v+16:v),hp(x+.8,y+.7,1.9,x+.6,y+1.3).map((v,i)=>i?v+16:v)]});
  box(x-.1,y+.2,2.6,1.5,1.9,.08,M.dark);
  for(const [a,b] of [[0,.25],[1.3,.25],[0,2.0],[1.3,2.0]])box(x-.1+a,y+b,1.1,.08,.08,1.5,M.dark,.4);
}
// carrello rosso con i pannelli spinto lungo il corridoio tra le fasce (V f_020): all'andata spinge, al ritorno tira
function trolley(t){
  const PER=46,c=t%PER,x=33.1;
  const TY=c=>kfl(c,[[0,16],[1,16],[20,66],[23,66],[43,16],[46,16]]);
  const cy=TY(c),dir=c<21.5?1:-1,py=cy+(dir>0?-.9:3.3);
  box(x-.5,cy,.3,1.1,2.4,.08,M.red);for(const [a,b] of [[0,0],[.95,0],[0,2.3],[.95,2.3]])box(x-.5+a,cy+b,0,.12,.12,.3,M.dark,.4);
  for(let i=0;i<3;i++)vpan(x-.35+i*.25,cy+.1,.38,.08,1.5,M.mdf,2.2);
  const face=dir>0?-1:1;
  person(x,py,{view:dir>0?1:-1,face,walk:walkOf(null,TY,c)*1,stride:strideOf(TY,c),lean:.6,shirt:TN,hands:[hp(x-.2,dir>0?cy:cy+2.4,1.1,x,py),hp(x+.3,dir>0?cy:cy+2.4,1.1,x,py)]});
}
/* livello alto: condotte zincate, soppalco con ringhiera gialla, capriate. Si disegna per ultimo e sfuma con lo zoom */
function overhead(a){
  fade(a,()=>{
    for(const x of [24,40,56])pipe([[x,.3,6.8],[x,86,6.8]],.4,'galv');
    box(MEZ.x,MEZ.y,3.2,MEZ.w,MEZ.d,.2,M.wallW);
    for(const [p,q] of [[[MEZ.x,MEZ.y+MEZ.d],[MEZ.x+MEZ.w,MEZ.y+MEZ.d]],[[MEZ.x+MEZ.w,MEZ.y],[MEZ.x+MEZ.w,MEZ.y+MEZ.d]]]){
      for(const z of [3.9,4.3])line(open([P(...p,z),P(...q,z)]),1.6,'gold',1);
      const L=Math.hypot(q[0]-p[0],q[1]-p[1]);for(let s=0;s<=L;s+=1.2){const u=s/L;seg(P(lerp(p[0],q[0],u),lerp(p[1],q[1],u),3.45),P(lerp(p[0],q[0],u),lerp(p[1],q[1],u),4.3),1,'gold',1)}}
  });
  fade(a*a,()=>{ctx.save();ctx.globalAlpha*=.5;for(let x=20;x<65;x+=8)seg(P(x,0,WH),P(x,88,WH),.8,'ink',.4);ctx.restore()});
}

/* ================= camera e rendering ================= */
const cam={x:0,y:0,z:1},tgt={x:0,y:0,z:1};
let T=RM?4.2:0,ax=.5,ay=.5,camMoving=false;
const hexOf6=(s,h=6)=>[P(s.x,s.y,h),P(s.x+s.w,s.y,h),P(s.x+s.w,s.y,0),P(s.x+s.w,s.y+s.d,0),P(s.x,s.y+s.d,0),P(s.x,s.y+s.d,h)];
function bounds(pts){let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const p of pts){a=Math.min(a,p[0]);b=Math.max(b,p[0]);c=Math.min(c,p[1]);d=Math.max(d,p[1])}return[a,b,c,d]}
function visRect(){const z=cam.z;return[(0-ax*W)/z+cam.x,(W-ax*W)/z+cam.x,(0-ay*H)/z+cam.y,(H-ay*H)/z+cam.y]}
const inView=(b,vr)=>!(b[1]<vr[0]||b[0]>vr[1]||b[3]<vr[2]||b[2]>vr[3]);
function draw(){
  ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle=SOLID?PAPER3:PAPER;ctx.fillRect(0,0,cv.width,cv.height);
  const z=cam.z*DPR;ctx.setTransform(z,0,0,z,(ax*W-cam.x*cam.z)*DPR,(ay*H-cam.y*cam.z)*DPR);
  ctx.globalCompositeOperation=SOLID?'source-over':'multiply';ctx.lineJoin='round';ctx.lineCap='round';
  FLAT=SOLID||cam.z<(FLAT?.85:.75);LABELS=[];LSTATION=-1;
  const vr=visRect();
  ground();backExterior();wallsBack();
  // oggetti a terra ordinati per profondità (x+y del centro): tappe, arredi, mezzi
  const items=[];
  ST.forEach((s,i)=>items.push({k:s.x+s.y+s.w,b:bounds(hexOf6(s,7)),f:()=>{const o=P(s.x,s.y,0);ctx.save();ctx.translate(o[0],o[1]);LSTATION=i;
    if(i===hoverBay&&!(mode==='tour'&&hoverBay===cur)){line(path([P(-.2,-.2),P(s.w+.2,-.2),P(s.w+.2,s.d+.2),P(-.2,s.d+.2)]),3/cam.z,'gold',1)}
    S[i](Math.max(0,T));ctx.restore();LSTATION=-1}}));
  for(const d of DECOR)items.push({k:d.x+d.y+(d.w+d.d)/2,b:bounds(hexOf6(d,7)),f:()=>{const o=P(d.x,d.y,0);ctx.save();ctx.translate(o[0],o[1]);d.f();ctx.restore()}});
  {const c=T%40,y=kfl(c,[[0,6],[2,6],[18,64],[21,64],[37,6],[40,6]]);items.push({k:13.2+y+1,b:null,f:()=>forklift(T)})}
  {const c=T%46,y=kfl(c,[[0,16],[1,16],[20,66],[23,66],[43,16],[46,16]]);items.push({k:33+y+1.2,b:null,f:()=>trolley(T)})}
  items.sort((a,b)=>a.k-b.k);
  for(const it of items)if(!it.b||inView(it.b,vr))it.f();
  wallsFront();frontExterior();
  overhead(clamp((1.25-cam.z)/.7,.12,.8));
  ctx.setTransform(1,0,0,1,0,0);
  if(!SOLID){ctx.globalCompositeOperation='multiply';ctx.fillStyle=GRAIN;ctx.fillRect(0,0,cv.width,cv.height)}
  ctx.globalCompositeOperation='source-over';
  // velo sui reparti non inquadrati (niente trasparenza «a raggi X»)
  const fst=focusStation();VEIL+=((fst>=0?1:0)-VEIL)*(RM?1:.12);
  if(VEIL>.01){const s=ST[fst>=0?fst:lastFocus],zz=cam.z*DPR,ox=(ax*W-cam.x*cam.z)*DPR,oy=(ay*H-cam.y*cam.z)*DPR;
    ctx.fillStyle=`rgba(245,244,241,${.62*VEIL})`;ctx.beginPath();ctx.rect(0,0,cv.width,cv.height);
    const hx=hexOf6({x:s.x-.6,y:s.y-.6,w:s.w+1.2,d:s.d+1.2},7.5);ctx.moveTo(hx[0][0]*zz+ox,hx[0][1]*zz+oy);for(let i=1;i<6;i++)ctx.lineTo(hx[i][0]*zz+ox,hx[i][1]*zz+oy);ctx.closePath();ctx.fill('evenodd')}
  if(fst>=0)lastFocus=fst;
  drawLabels(st=>st>=0&&st===fst);
  placePins();
  if(!labsDone&&labsFor>=0){const set=[...new Set(LABELS.filter(L=>L.st===labsFor).map(L=>String(L.text).replace(/\n/g,' ')))];if(set.length){$('labs').innerHTML=set.map(t=>'<li>'+t.replace(/[<&]/g,'')+'</li>').join('');labsDone=true}}
}
let VEIL=0,lastFocus=0;
function focusStation(){
  if(cam.z<1.05||mode==='sheet')return -1;
  if(mode==='tour')return cur;
  const a=cam.x/(CS*U),b=cam.y/(SN*U),x=(a+b)/2,y=(b-a)/2;
  return ST.findIndex(s=>x>=s.x-1&&x<=s.x+s.w+1&&y>=s.y-1&&y<=s.y+s.d+1);
}
/* segnaposto numerati sopra le tappe (tavola intera e vista libera) */
const pinsEl=document.getElementById('pins');const PINS=ST.map((s,i)=>{const b=document.createElement('button');b.type='button';b.className='pin';b.textContent=String(i+1);
  b.setAttribute('aria-label',`Passaggio ${i+1}: ${NAMES[i]}`);b.onclick=e=>{e.stopPropagation();interacted=true;if(KIOSK&&attract){kioskStory(i);return}jump(i,true)};pinsEl.appendChild(b);return b});
function placePins(){const show=mode!=='tour'&&!VIDEO;pinsEl.hidden=!show;if(!show)return;
  const xy=ST.map(s=>{const p=P(s.x+s.w/2,s.y+s.d/2,6.2);return[(p[0]-cam.x)*cam.z+ax*W,(p[1]-cam.y)*cam.z+ay*H]});
  // se i segnaposto si toccano (schermi piccoli) restano solo i numeri dell'indice
  let md=1e9;for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)md=Math.min(md,Math.hypot(xy[i][0]-xy[j][0],xy[i][1]-xy[j][1]));
  const crowded=md<(KIOSK?60:46);
  ST.forEach((s,i)=>{const [X,Y]=xy[i],el=PINS[i];
    el.style.left=X+'px';el.style.top=Y+'px';el.hidden=crowded||X<FREE.x0-20||X>FREE.x1+20||Y<FREE.y0-10||Y>FREE.y1+10;el.classList.toggle('hot',i===hoverBay)})}
/* ---------- inquadrature ---------- */
let FREE={x0:0,x1:1e4,y0:0,y1:1e4};
function freeArea(){
  const wide=W>=900||W>H*1.3,card=document.getElementById('card').getBoundingClientRect(),idx=document.querySelector('.index ol').getBoundingClientRect(),mast=document.querySelector('.mast').getBoundingClientRect();
  if(VIDEO)return{x0:card.right+24,x1:W-24,y0:24,y1:H-24};
  if(KIOSK){const kb=document.getElementById('kband').getBoundingClientRect();return{x0:16,x1:W-16,y0:Math.max(mast.bottom,idx.bottom)+8,y1:Math.min(card.top,kb.top||H)-8}}
  if(wide)return{x0:card.right+8,x1:W-8,y0:mast.bottom+8,y1:idx.top-8};
  return{x0:0,x1:W,y0:mast.bottom+4,y1:idx.top-6};
}
function damp(c,t,v,st,dt){const o=2/st,x=o*dt,e=1/(1+x+.48*x*x+.235*x*x*x),ch=c-t,tmp=(v+o*ch)*dt;return[t+(ch+tmp)*e,(v-o*tmp)*e]}
function setAnchor(nax,nay){if(started&&cam.z>0){cam.x+=(nax-ax)*W/cam.z;cam.y+=(nay-ay)*H/cam.z}ax=nax;ay=nay}
function frameRect(cx,cy,w,h){
  const f=freeArea(),fw=Math.max(80,f.x1-f.x0),fh=Math.max(80,f.y1-f.y0);
  const z=Math.min(fw/w,fh/h);setAnchor((f.x0+fw/2)/W,(f.y0+fh/2)/H);FREE=f;placeCaption();
  return{x:cx,y:cy,z};
}
// inquadratura della tappa dal suo rettangolo (con l'altezza delle macchine), stretta come su FonteAlta
function stationCam(i){const s=ST[i],b=bounds(hexOf6({x:s.x+.3,y:s.y+.3,w:s.w-.6,d:s.d-.6},4.6));
  return frameRect((b[0]+b[1])/2,(b[2]+b[3])/2,(b[1]-b[0])*.8,(b[3]-b[2])*.82)}
const SHEET=[P(0,112),P(84,-10),P(0,-10,8),P(84,112),P(58,-9,13)];
function sheetCamRaw(){const b=bounds(SHEET),f=FREE;return Math.min(Math.max(80,f.x1-f.x0)/(b[1]-b[0]+20),Math.max(80,f.y1-f.y0)/(b[3]-b[2]+20))}
function sheetCam(){const b=bounds(SHEET);return frameRect((b[0]+b[1])/2,(b[2]+b[3])/2,b[1]-b[0]+20,b[3]-b[2]+20)}

/* ---------- testi dei passaggi ---------- */
// Ogni frase viene dalla tabella dei fatti (ricerca/TABELLA-FATTI.md); l'ordine dei reparti è illustrativo.
const TXT=[
 ['Progettata su misura','Ufficio tecnico · Gerno di Lesmo',"Ogni cucina RiFRA parte da un progetto disegnato per una casa precisa. L'ufficio tecnico, nella palazzina all'ingresso, prepara le tavole per la produzione. RiFRA segue tutta la filiera: progetto, produzione, finitura, assemblaggio, consegna e montaggio."],
 ['La materia prima','Pannelli · fornitori in Brianza, a circa 20 km',"I pannelli arrivano da fornitori della Brianza, a una ventina di chilometri. Ogni lastra viene verificata prima dell'uso e riposta nelle rastrelliere a sbalzo del deposito materiali, accanto alla sezionatrice."],
 ['Tagliato a misura','Sezionatrice verticale',"Il pannello si appoggia in piedi sul telaio a doghe della sezionatrice verticale. La lama scorre lungo la trave e lo divide nelle misure del progetto."],
 ['Squadrato','Squadratrici · Casolin',"Sulle squadratrici il pezzo viene portato a squadra: il carrello scorre accanto alla lama con il pannello sopra. Il riquadro arancione a terra segna l'area della macchina."],
 ['Forato per la ferramenta','Biesse Brema EKO 2.1 · foratrice verticale CNC',"Il pannello attraversa in piedi la foratrice a controllo numerico, che esegue i fori della ferramenta nelle posizioni del disegno."],
 ['Fresato su misura','Biesse Rover A · centri di lavoro CNC',"Nel laboratorio due centri di lavoro fresano sagome e gole sui pezzi su misura. Il sito racconta una falegnameria completamente ammodernata, con le ultime macchine a cinque assi."],
 ['Il bordo','Bordatrice Brandt · levigabordi De Stefani',"Il pannello scorre lungo la bordatrice, che applica il bordo sul fianco. Poi la levigabordi rifinisce gli spigoli, pronti per la finitura."],
 ['Levigato prima della lacca','Levigatrice a nastro largo',"Prima della verniciatura ogni superficie passa nella levigatrice. Le condotte zincate portano la polvere ai filtri e al silo nel cortile dietro al capannone."],
 ['Laccato in casa','Robot Cefla Spraybotic · opachi, lucidi, legno',"La laccatura si fa all'interno: colori opachi, colori lucidi e finiture legno. Il robot di spruzzatura Cefla stende la vernice sui pannelli che scorrono sotto la testa rotante. RiFRA vernicia con un impianto robotizzato dal 1995."],
 ['Asciugato e lucidato','Carrelli di essiccazione · reparto lucidatura',"Le ante verniciate riposano sui carrelli di essiccazione a bracci. Nel reparto di carteggiatura e lucidatura le superfici vengono rifinite."],
 ['Il montaggio','Strettoio Erregi · linea di montaggio',"Fianchi, ripiani e schienali diventano una scocca: lo strettoio la tiene in squadra mentre la colla fa presa. Poi la linea di montaggio aggiunge ferramenta e ante; superfici, giunzioni e meccanismi si provano uno a uno."],
 ['Pronta per la casa','Imballaggio · avvolgitore Robopac',"Gli elementi finiti vengono protetti, raccolti su bancale e avvolti nel film. Dal magazzino partono verso la casa del cliente, dove la squadra RiFRA si occupa di consegna e montaggio."],
];
const INTRO={num:'12',phase:'passaggi · un solo capannone',title:'Dal pannello alla cucina',data:'Gerno di Lesmo · produzione in sede dal 1977',body:"Questa tavola ricostruisce la fabbrica RiFRA di Gerno di Lesmo dalla pianta e dalle foto dei reparti: un pannello grezzo diventa un'anta laccata e poi una cucina. Ogni macchina e ogni persona è disegnata dal codice."};
const OUTRO={num:'12',phase:'passaggi · fine del giro',title:'Dal pannello alla cucina',data:'12 passaggi · tutto in un unico capannone',body:"L'ordine dei reparti segue il percorso di un'anta ed è da confermare con RiFRA. Tocca un numero sulla tavola per tornare in un reparto, oppure rivedi il giro dall'inizio."};
// niente voce: i tempi dei reparti vengono dal numero di parole del testo
const CUES_R=(()=>{const out=[0];for(let i=0;i<12;i++){const words=(TXT[i][0]+' '+TXT[i][1]+' '+TXT[i][2]).split(/\s+/).length;out.push(out[i]+Math.max(11,words/3.0+4))}return out})();
const END_R=CUES_R[12];
const CUES_V=CUES_R,END_V=END_R;
const CUES_S=CUES_R.map((_,i)=>i*4.5),END_S=54;
let CUES=CUES_R,END=END_R;
function setTimeline(){CUES=CUES_R;END=END_R}
