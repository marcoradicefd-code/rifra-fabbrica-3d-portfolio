// Arredi e macchine fuori dalle tappe, auto, mezzi in movimento. Metri: x = est, z = sud.
import * as THREE from 'three';
import { box, cyl, tubo, gruppo, persona, etichetta } from './prim.js';
import { kf, carrello } from './reparti.js';
import * as MC from './macchine.js';
import { t, allaLingua } from './lingua.js';
import { LOGO } from './logo.js';
let LOGO2D = null;   // tracciati del logo RiFRA Milano (build/brand/logo.svg) per le scritte su canvas
import { H_PROD, PARCHEGGIO_OVEST } from './edificio.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function costruisciArredi(scene, M, opz = {}) {
  const R = gruppo(scene), alto = gruppo(scene), U = [];
  // le macchine, le rastrelliere, la cabina e le stanze sotto il soppalco sono in macchine.js (rilievo M01–M34); qui restano solo
  // fusti, struttura del soppalco, condotte, auto, muletto e carrello
  // (i fusti blu nel magazzino sono stati tolti: nella foto del corridoio F 7456 / V f_014 lì c'è il muro con le finestre; analisi Fable P2 n. 15)
  // soppalco S1 con ringhiera gialla sui lati sud ed est, piano a +3,3 m (rilievo: x 7,3–25,8, z 13–19,4; V f_062–f_069, F 7442, PE):
  // pilastri, solaio, ringhiera e scala ripida a x 24–25,8, z 18,1–19,4 (PE). Tutto a terra (R), sempre visibile: prima solaio e ringhiera
  // erano nel livello alto e sparivano nelle tappe (analisi Fable P1 n. 5, V f_066 / f_069)
  { const x = 7.3, z = 13, w = 18.5, d = 6.4; for (const [a, b] of [[0, 0], [w, 0], [0, d], [w, d], [w / 2, 0], [w / 2, d]]) box(R, x + a - .15, 0, z + b - .15, .3, 3.3, .3, M.grigio);
    box(R, x, 3.3, z, w, .22, d, M.grigio); for (const [a, b, c, e] of [[x, z + d, 24, z + d], [x + w, z, x + w, z + d]]) { const L = Math.hypot(c - a, e - b), n = Math.round(L / 1.2);
      for (const y of [3.95, 4.4]) box(R, Math.min(a, c) - .03, y, Math.min(b, e) - .03, Math.abs(c - a) + .06, .05, Math.abs(e - b) + .06, M.giallo);
      for (let i = 0; i <= n; i++) box(R, lerp(a, c, i / n) - .03, 3.52, lerp(b, e, i / n) - .03, .06, .9, .06, M.giallo); }
    for (let k = 0; k < 11; k++) box(R, 24.1, .3 * k + .27, 19.4 - .118 * (k + 1), 1.6, .04, .24, M.grigio);                        // gradini
    for (const xs of [24.02, 25.7]) { tubo(R, [[xs + .04, 0, 19.45], [xs + .04, 3.3, 18.1]], .04, M.giallo, { seg: 6 }); tubo(R, [[xs + .04, 1, 19.5], [xs + .04, 4.3, 18.15]], .025, M.giallo, { seg: 6 }); } }
  // condotte zincate a soffitto (V: aspirazione ovunque) verso il muro est e i filtri, nel livello alto (main.js: visibili solo a media
  // distanza). Raggio 0,18 e zincato scuro opaco: da lontano non tagliano più la fabbrica come tubi chiari da 60 cm (P2 n. 10)
  for (const z of [19.8, 28.5, 36.5]) tubo(alto, [[6, H_PROD - .45, z], [70.6, H_PROD - .45, z]], .18, M.zincatoScuro);
  // auto (rilievo, sat, PE, V 0012b, SV): a ovest in fila parallele al muro, muso a sud, negli 8 stalli da 5 m; nella fascia sud
  // perpendicolari al muro nella fascia sud allargata, dopo la corsia dei mezzi. Quali posti sono occupati è illustrativo.
  // Tutte le auto in 3 InstancedMesh (carrozzeria, vetri, ruote e fanali)
  const P = PARCHEGGIO_OVEST, auto = [];
  [0, 1, 2, 4, 5, 7].forEach(k => auto.push([(P.x0 + P.x1) / 2, P.z0 + P.passo * (k + .5), -Math.PI / 2]));
  // fascia sud allargata (Marco, 30/09): corsia di 4,5 m lungo il capannone per i mezzi, poi stalli perpendicolari con il muso verso il capannone
  [13.2, 15.7, 20.7, 23.2, 33.2, 35.7, 50.7, 53.2].forEach(x => auto.push([x, 47.5, Math.PI / 2]));
  parcoAuto(R, M, auto);
  const ombre = { fissi: auto.map(([x, z, ry]) => [x, z, ry, 5.1, 2.35]), mobili: [] };
  U.push(muletto(scene, M), carrelloSpinto(scene, M), furgone(scene, M, opz.cancello), camion(scene, M, opz.cancelloEst));
  ombre.mobili.push([U[0].gruppo, 2.9, 2.1], [U[1].gruppo, 2.6, 1.3], [U[2].gruppo, 6.2, 2.2], [U[3].gruppo, 10.2, 2.7]);
  return { root: R, alto, ombre, update: t => U.forEach(u => u(t)), etiCamion: U[3].gruppo.userData.etichetta };
}
const lerp = (a, b, t) => a + (b - a) * t;
// auto compatta generica (4,35 × 1,78 × 1,48 m): fiancata estrusa con spigoli arrotondati, vetri scuri, montante, ruote con cerchi, fanali.
// Muso verso +x. Colori spenti come nelle foto (bianco, argento, grigio, nero, blu scuro).
function geometrieAuto() {
  const L = 4.35, W = 1.78, bev = .06;
  const sh = new THREE.Shape(); sh.moveTo(-2.1, .3); sh.lineTo(2.1, .3); sh.quadraticCurveTo(2.2, .3, 2.2, .5); sh.lineTo(2.18, .66); sh.quadraticCurveTo(2.14, .8, 1.95, .82);
  sh.lineTo(.95, .93); sh.lineTo(.25, 1.38); sh.quadraticCurveTo(.15, 1.42, 0, 1.42); sh.lineTo(-1.0, 1.42); sh.quadraticCurveTo(-1.1, 1.42, -1.18, 1.36); sh.lineTo(-1.72, 1.0);
  sh.lineTo(-2.08, .96); sh.quadraticCurveTo(-2.2, .94, -2.2, .8); sh.lineTo(-2.2, .45); sh.quadraticCurveTo(-2.2, .3, -2.1, .3);
  const corpo = new THREE.ExtrudeGeometry(sh, { depth: W - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 4 }).translate(0, 0, -(W - 2 * bev) / 2);
  const montante = new THREE.BoxGeometry(.12, .4, W + .05).translate(-.38, 1.17, 0);
  const carrozzeria = mergeGeometries([corpo.index ? corpo.toNonIndexed() : corpo, montante.toNonIndexed()]);
  const gv = new THREE.Shape([[1.0, .97], [.4, 1.385], [-1.2, 1.385], [-1.84, .99]].map(([x, y]) => new THREE.Vector2(x, y)));
  const vetri = new THREE.ExtrudeGeometry(gv, { depth: W + .02, bevelEnabled: false }).translate(0, 0, -(W + .02) / 2);
  // ruote (pneumatico nero, cerchio grigio) e fanali (bianchi davanti, rossi dietro): colori per vertice, un solo materiale
  const parti = [], col = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };
  for (const x of [-1.38, 1.36]) for (const z of [-1, 1]) {
    parti.push(col(new THREE.CylinderGeometry(.33, .33, .22, 16).rotateX(Math.PI / 2).translate(x, .33, z * (W / 2 - .1)), 0x16171a));
    parti.push(col(new THREE.CylinderGeometry(.19, .19, .24, 12).rotateX(Math.PI / 2).translate(x, .33, z * (W / 2 - .1)), 0x9a9da1)); }
  for (const z of [-1, 1]) { parti.push(col(new THREE.BoxGeometry(.08, .12, .38).translate(2.18, .68, z * .58), 0xf2f1ea)); parti.push(col(new THREE.BoxGeometry(.06, .12, .36).translate(-2.21, .8, z * .6), 0x9c1c1c)); }
  parti.push(col(new THREE.BoxGeometry(.1, .14, W - .1).translate(2.21, .38, 0), 0x2a2b2e)); parti.push(col(new THREE.BoxGeometry(.1, .14, W - .1).translate(-2.22, .4, 0), 0x2a2b2e));   // paraurti scuri
  return { carrozzeria, vetri, dettagli: mergeGeometries(parti.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; })) };
}
function parcoAuto(p, M, lista) {
  const G = geometrieAuto(), n = lista.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  const tinte = [0xe9e9e6, 0xa9adb1, 0x55585c, 0x1c1d20, 0x2a3a5c, 0xd2d3d0, 0x74777a];
  const ims = [[G.carrozzeria, M.carrozzeria, true], [G.vetri, M.vetroScuro, false], [G.dettagli, M.dettagliAuto, false]].map(([g, mat, cast]) => { const im = new THREE.InstancedMesh(g, mat, n); im.castShadow = cast; im.receiveShadow = true; p.add(im); return im; });
  lista.forEach(([x, z, ry], i) => { m4.compose(new THREE.Vector3(x, 0, z), q.setFromAxisAngle(up, ry), one); ims.forEach(im => im.setMatrixAt(i, m4)); ims[0].setColorAt(i, c.setHex(tinte[(i * 5 + 2) % tinte.length])); });
  ims.forEach(im => im.computeBoundingSphere());
}
// Spedizione (tappa 12, Marco 02/10): un ciclo di 120 s condiviso da muletto, Robopac e camion. Il muletto prende il bancale con i mobili
// imballati in fondo al magazzino (x 13), lo posa sulla piattaforma del Robopac (M27, centro x 64,5 z 11,4), si scosta mentre il bancale gira
// e il film lo avvolge, lo riprende e lo posa sul pianale del camion fermo al portone sezionale est (x 70,9). Tempi ILLUSTRATIVI.
const Z_CARICO = 11.4, X_ROBOPAC = 64.5, CICLO_SPED = 120;   // 120 s dal 02/10 sera: il carico occupa i primi 60 s, poi il muletto aspetta in fondo al magazzino (il camion ha il tempo di uscire e rientrare)
// asse del corridoio: z 10,75 fra gli scaffali (M29 lungo il muro sud da z 11,8; M30 fino a z 9,9), poi 11,4 davanti al Robopac
// muletto elettrico bianco (V f_042)
function muletto(scene, M) {
  // corridoio del magazzino (rilievo, righe gialle z 9,05–11,55): asse a 10,75 (prima 10,3) perché il fianco e le ruote (z −0,8…+1,0)
  // passavano dentro la testata della fila di scaffali a x 38–39,1 (finisce a z 9,9) — controllo collisioni, ricerca/COLLISIONI.md
  const g = gruppo(scene); g.userData.anim = true;
  box(g, -1, .15, -.8, 2, 1, 1.6, M.bianco, { statico: false }); box(g, -.9, 1.15, -.5, .8, .5, 1, M.nero, { statico: false });
  box(g, 1, 0, -.6, .1, 3, .1, M.antracite, { statico: false }); box(g, 1, 0, .5, .1, 3, .1, M.antracite, { statico: false });
  for (const [a, b] of [[-.7, -.8], [.6, -.8], [-.7, .8], [.6, .8]]) cyl(g, a, .28, b, .28, .2, M.nero, { rx: Math.PI / 2, statico: false });
  box(g, -1.05, 2.3, -.8, 1.4, .06, 1.6, M.antracite, { statico: false }); for (const [a, b] of [[-1, -.75], [.25, -.75], [-1, .7], [.25, .7]]) box(g, a, 1.15, b, .05, 1.15, .05, M.antracite, { statico: false });
  const forche = gruppo(g); box(forche, 1.1, 0, -.45, 1.2, .05, .12, M.antracite, { statico: false }); box(forche, 1.1, 0, .33, 1.2, .05, .12, M.antracite, { statico: false });
  // il bancale in carico è identico a quelli del Robopac e del camion (bancaleMobili): si scambiano solo quando coincidono
  const carico = gruppo(forche, 1.65, .05, 0), film = bancaleMobili(carico, M);
  // V f_009: nel magazzino una persona in maglia rossa (qui al volante, illustrativo)
  const auto = persona(g, M, -.5, 0, { ry: Math.PI / 2, maglia: 0x9a2a28 }); auto.position.y = .55;
  const RP = robopacAnimato(scene, M), CM = caricoCamion(scene, M);
  // Il Robopac sta nel corridoio davanti al portone: con il bancale fasciato il muletto lo aggira da nord (z 8,9) e rientra sull'asse del
  // camion a est della piattaforma (prima ci passava sopra: controllo collisioni del 02/10). Chiavi [t, x, z]; muso sempre verso est
  const XW = 13, XP = X_ROBOPAC - 1.65, XT = 69.6, YT = 1.15, ZN = 8.9, ZC = Z_CARICO;   // XP: bancale sul centro della piattaforma; XT: montante a 5 cm dal filo interno del muro, bancale a x 71,25 (poi scivola sul pianale)
  const K = [[0, XW, 10.75], [2, XW, 10.75], [12.5, 56, 10.75], [15, XP, ZC], [16.5, XP, ZC], [18.5, 60.6, ZC], [32, 60.6, ZC], [34, XP, ZC], [35, XP, ZC],
    [36.5, 60.6, ZC], [38.8, 63.0, ZN], [40.5, 66.0, ZN], [42.8, 68.4, ZC], [44, XT, ZC], [44.5, XT, ZC], [45.5, 67.5, ZC], [47.8, 64.8, ZN], [49.5, 61.2, ZN],
    [51.5, 58.6, 10.75], [58, XW, 10.75], [60, XW, 10.75]];
  const KX = K.map(([t, x]) => [t, x]), KZ = K.map(([t, , z]) => [t, z]);
  // sterzo nelle diagonali (verso nord = rotazione positiva), dritto alle soste
  const KR = [[0, 0], [36.5, 0], [37.65, .8], [38.8, 0], [40.5, 0], [41.65, -.8], [42.8, 0], [45.5, 0], [46.65, -.8], [47.8, 0], [49.5, 0], [50.5, .6], [51.5, 0], [60, 0]];
  return Object.assign(t => { const c = ((t % CICLO_SPED) + CICLO_SPED) % CICLO_SPED;
    g.position.set(kf(c, KX), 0, kf(c, KZ)); g.rotation.y = kf(c, KR);
    forche.position.y = kf(c, [[0, .1], [1, .1], [2, .4], [14.5, .4], [16, .03], [34, .03], [35, .25], [41, .25], [42.8, YT + .02], [44, YT + .02], [44.5, YT], [45.5, YT], [47.5, .1], [60, .1]]);
    carico.visible = (c > 1 && c < 16.5) || (c >= 34 && c < 44.5); film.visible = c >= 34;
    RP(c, t); CM(c); auto.posa(t, { seduto: 1, lavoro: .6, volante: 1 }); }, { gruppo: g });
}
// bancale 1,2 × 1,0 con tre cartoni di mobili imballati (origine al centro della base) e il suo film (restituito, nascosto o visibile)
function bancaleMobili(p, M) {
  box(p, -.6, 0, -.55, 1.2, .14, 1.1, M.legno, { statico: false }); for (let k = 0; k < 3; k++) box(p, -.55, .14 + k * .45, -.5, 1.1, .45, 1, M.cartone, { statico: false });
  return box(p, -.57, .12, -.52, 1.14, 1.4, 1.04, M.film, { cast: false, statico: false });
}
// M27 Robopac (F 7456, 7457): il bancale gira sulla piattaforma e il carrello con il rotolo sale e scende lungo la colonna; il film cresce
// dal basso con il primo passaggio del carrello (rotazione e numero di giri ILLUSTRATIVI)
function robopacAnimato(scene, M) {
  const MM = MC.materialiMacchine(M), ZC = Z_CARICO, g = gruppo(scene, X_ROBOPAC, .08, ZC); g.userData.anim = true;
  const film = bancaleMobili(g, M);
  const car = gruppo(scene, X_ROBOPAC, 0, ZC); car.userData.anim = true;   // carrello del film accanto alla colonna (macchine.js robopac)
  box(car, -.55, 0, 1.02, .2, .35, .16, MM.robopac, { statico: false }); cyl(car, -.55, .05, .9, .06, .45, M.film, { statico: false });   // macchine.js: origine a z 11,6
  return (c, t) => {
    g.visible = c >= 16.5 && c < 34;
    const w = Math.min(1, Math.max(0, (c - 18.5) / 13.5)); g.rotation.y = liscio(w) * 8 * Math.PI;   // 4 giri, finisce dritto come quando arriva
    const su = Math.min(1, Math.max(0, (c - 19) / 7)), giu = Math.min(1, Math.max(0, (c - 26) / 5.5));
    car.position.y = .15 + 1.25 * (liscio(su) - liscio(giu));
    film.visible = c > 19; film.scale.y = Math.max(.001, 1.4 * (c < 26 ? su : 1));   // box(): scala y = altezza, base ferma
  };
}
// bancale posato sul pianale del camion: scivola verso la cabina (pianale a rulli, ILLUSTRATIVO) e sparisce dentro il cassone chiuso
function caricoCamion(scene, M) {
  const g = gruppo(scene, 71.25, 1.2, Z_CARICO); g.userData.anim = true; bancaleMobili(g, M).visible = true;
  return c => { g.visible = c >= 44.5 && c < 54; g.position.x = 71.25 + 5.6 * liscio(Math.min(1, Math.max(0, (c - 44.6) / 7))); };
}
// camion che prende la merce (Marco 02/10 sera: «nell'area gialla a destra un altro cancello dove entra il camion che prende la merce»):
// entra dal cancello carrabile est (x 65–70 sulla recinzione z 52, scorrevole), risale il cortile est a est dei container (x 85), entra in
// retromarcia sotto la pensilina fino al portone sezionale del magazzino (V f_014, F 7456), resta fermo per tre carichi del muletto (ciclo di
// 120 s) ed esce dallo stesso cancello. Cassone aperto dietro; scritta «Destinazione: tutto il mondo» e logo sui fianchi. Forma e manovre
// ILLUSTRATIVE. Ciclo di 240 s, in fase con il muletto: fermo al portone per t mod 240 in [35, 175) (carichi a 43,5 e 163,5 s)
const CAMION_FERMO = [76.1, Z_CARICO];   // centro del camion fermo: retro a x 71,1, dietro il filo esterno del muro (70,9 + 0,15)
function camion(scene, M, cancello) {
  const g = gruppo(scene); g.userData.anim = true; g.userData.fuori = true; const o = { statico: false };
  const z0 = -1.25, z1 = 1.25, x0 = -5, xc = 2.5;                                                              // coordinate locali, muso verso +x
  box(g, -4.8, .55, z0 + .3, 9.5, .45, 1.9, M.antracite, o);                                                   // telaio
  box(g, x0, 1.0, z0, xc - x0, .2, 2.5, M.grigio, o);                                                          // pianale
  for (const z of [z0 + .02, z1 - .06]) box(g, x0, 1.2, z, xc - x0, 2.55, .04, M.bianco, o);                    // fianchi
  box(g, x0, 3.75, z0, xc - x0, .05, 2.5, M.bianco, o); box(g, xc - .05, 1.2, z0, .05, 2.55, 2.5, M.bianco, o);   // tetto e fronte del cassone
  for (const z of [z0 - .05, z1 + .01]) box(g, x0, 1.25, z, 1.24, 2.45, .04, M.bianco, o);                      // porte aperte contro i fianchi
  box(g, xc + .1, 1.0, z0 + .05, 2.3, 2.3, 2.4, M.bianco, o); box(g, xc + 2.38, 2.0, z0 + .2, .04, 1.05, 2.1, M.vetroScuro, o);   // cabina e parabrezza
  for (const z of [z0 + .03, z1 - .07]) box(g, xc + 1.4, 2.0, z, .85, .8, .04, M.vetroScuro, o);                 // finestrini
  box(g, xc + 2.4, .45, z0 + .05, .1, .45, 2.4, M.antracite, o);                                                // paraurti
  for (const x of [-3.7, -2.5, 3.6]) for (const z of [z0 + .15, z1 - .15]) cyl(g, x, .5, z, .5, .3, M.nero, { rx: Math.PI / 2, statico: false });
  const testo = ['RiFRA', 'Destinazione: tutto il mondo'];
  scritta(g, testo, (x0 + xc) / 2, 2.45, z0 - .01, 7.2, 2.3, true, false); scritta(g, testo, (x0 + xc) / 2, 2.45, z1 + .01, 7.2, 2.3, false, false);
  // etichetta della tappa 12: segue il camion (main.js la aggiunge alle etichette della tappa)
  g.userData.etichetta = etichetta(g, -1.25, 4.6, 0, 'Destinazione: tutto il mondo (Marco 02/10)');   // segue il camion; fuori inquadratura si nasconde (main.js antiSovrapposte)
  // autista: seduto in cabina mentre il camion si muove; a camion fermo scende e aspetta accanto alla cabina, lato sud (ILLUSTRATIVO)
  const aut = persona(g, M, 3.4, 1.9, { ry: 0, maglia: M.grigioScuro });
  const cr = pts => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const [XF, ZF] = CAMION_FERMO, XM = 90;   // XM: punto di manovra a est della pensilina, da cui entra in retromarcia
  // curve ad arco di raggio 5–7 m: con 10 m di camion il muso sporge di sqrt(R² + 25) − R oltre la traiettoria del centro (controllo del 02/10:
  // con curve più strette il muso toccava il furgone fermo e la recinzione). Nel varco del cancello (x 65–70) il camion passa dritto a x 67,5
  const ENTRA = cr([[125, 59], [80, 59], [73.5, 59], [69.26, 57.24], [67.5, 53], [67.5, 48.5], [68.17, 46], [70, 44.17], [72.5, 43.5], [80, 43.5], [84.3, 41], [85, 36], [85, 21], [86.8, 14.4], [XM, ZF]]);
  const RETRO = cr([[XM, ZF], [XF, ZF]]);
  // esce dritto finché il retro non ha passato i pilastri della pensilina (x 74,7, z 12,9): poi gira a sud
  const ESCE = cr([[XF, ZF], [80, ZF], [83.5, ZF], [87.2, 13.8], [85.2, 20], [85.2, 37], [84, 41.5], [80, 43], [74.5, 43], [71, 43.94], [68.44, 46.5], [67.5, 50], [67.5, 53.5], [69.26, 57.74], [73.5, 59.5], [125, 59.5]]);
  const _p = new THREE.Vector3(), _t = new THREE.Vector3();
  const metti = (C, u, retro) => { u = u > 0 ? Math.min(1, u) : 0; C.getPointAt(u, _p); C.getTangentAt(u, _t); g.position.copy(_p); g.rotation.y = Math.atan2(-_t.z, _t.x) + (retro ? Math.PI : 0); };
  const ee = u => u < .5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
  // u = (t − 175) mod 240: esce 0–30 s (circa 4 m/s di media, al massimo 5,5), via 30–60, entra 60–90, retromarcia 90–100, fermo 100–240
  const posa = u => { if (u < 30) metti(ESCE, trap(u / 30)); else if (u < 60) metti(ENTRA, 0);
    else if (u < 90) metti(ENTRA, trap((u - 60) / 30)); else if (u < 100) metti(RETRO, ee((u - 90) / 10), true); else metti(RETRO, 1, true); };
  const apri = apriCancello(cancello, u => { posa(u); return g.position; }, 240, [67.5, 52], 1);
  // 0 in cabina, 1 a terra accanto; scende verso ovest, risale verso est, da fermo guarda il camion
  const giu = u => u < 101 || u > 237 ? 0 : u < 103 ? (u - 101) / 2 : u > 235 ? (237 - u) / 2 : 1;
  return Object.assign(t => { const u = (((t - 175) % 240) + 240) % 240; posa(u); g.visible = !(u > 28 && u < 62); apri(u);
    const k = giu(u); if (k <= 0) { aut.position.set(3.5, .78, -.45); aut.rotation.y = -Math.PI / 2; aut.posa(t, { seduto: 1, lavoro: .6, volante: 1 }); }
    else { const e = liscio(k); aut.position.set(lerp(3.3, 1.6, e), 0, lerp(1.6, 1.9, e)); aut.rotation.y = k >= 1 ? Math.PI : u > 200 ? Math.PI / 2 : -Math.PI / 2; aut.posa(t, { passo: e > 0 && e < 1 ? 1 : 0, mov: .3, fase: e * 6 }); } }, { gruppo: g });
}
// cancello scorrevole (edificio.js E.cancello / E.cancelloEst) che si apre quando un mezzo è a meno di 9 m dal varco: 2,5 s prima e dopo.
// Gli istanti si ricavano una volta campionando il percorso del mezzo ogni 0,1 s. verso: −1 scorre a ovest, +1 a est (dietro la recinzione)
function apriCancello(cancello, dove, periodo, [cx, cz], verso) {
  if (!cancello) return () => {};
  const vicini = []; for (let i = 0; i < periodo * 10; i++) { const p = dove(i / 10); if (Math.hypot(p.x - cx, p.z - cz) < 9) vicini.push(i / 10); }
  return c => { let d = 99; for (const v of vicini) d = Math.min(d, Math.abs(v - c), Math.abs(v - c + periodo), Math.abs(v - c - periodo));
    const a = liscio(Math.max(0, Math.min(1, 1 - (d - .5) / 2.5))); cancello.position.set(verso * 5.2 * a, 0, -.14 * Math.min(1, a * 4)); };
}
// furgone (Marco 02/10): entra dal cancello carraio ovest (edificio.js, x 1,6–6,7 sulla recinzione z 52), percorre la corsia dei mezzi lungo
// il capannone (z 40,6–44,6) e si ferma davanti al portone d'ingresso merci (x 59,6–62,1), prima del cassone blu (E09, x ≥ 63,4); scarica
// lastre e ferramenta (il muletto della tappa 2 le porta al deposito), fa manovra in retromarcia in un posto libero della fascia sud (x 45,7)
// e riparte verso ovest. Scritta sui fianchi: «Filiera corta: RiFRA lavora solo con produttori della Brianza. Il vero made in Italy.»
// Forma e manovra ILLUSTRATIVE. Ciclo di 78 s (tre cicli del muletto della tappa 2): arrivo 0–22 s, fermo 22–50, manovra 50–56, uscita 56–76
function furgone(scene, M, cancello) {
  const g = gruppo(scene); g.userData.anim = true; g.userData.fuori = true;   // fuori: resta visibile anche con il tetto chiuso (main.js INTERNO)
  const o = { statico: false };
  box(g, -3, .35, -1.02, 4.5, 2.25, 2.04, M.bianco, o); box(g, 1.5, .35, -1.0, 1.0, 1.9, 2.0, M.bianco, o); box(g, 2.5, .35, -.98, .55, .95, 1.96, M.bianco, o);   // cassone, cabina, cofano
  box(g, 2.44, 1.32, -.92, .1, .75, 1.84, M.vetroScuro, o); for (const z of [-1.03, 1.0]) box(g, 1.65, 1.35, z, .7, .6, .03, M.vetroScuro, o);
  box(g, -3.02, .35, -1.02, .04, .3, 2.04, M.antracite, o); box(g, 3.03, .35, -1.0, .06, .3, 2.0, M.antracite, o);   // paraurti
  for (const x of [-1.9, 2.0]) for (const z of [-.92, .92]) cyl(g, x, .36, z, .36, .22, M.nero, { rx: Math.PI / 2, statico: false });
  const testo = ['RiFRA', 'Filiera corta: RiFRA lavora solo con produttori della Brianza.', 'Il vero made in Italy.'];
  scritta(g, testo, -.75, 1.5, -1.03, 4.3, 1.9, true, false); scritta(g, testo, -.75, 1.5, 1.03, 4.3, 1.9, false, false);
  const cr = pts => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const XF = 59.6, ZF = 42.75;
  const ARR = cr([[-16, 59.5], [0, 59.5], [3.6, 57.4], [4.3, 53.2], [4.8, 47.4], [7.6, 43.6], [12, 42.75], [30, 42.75], [XF, ZF]]);
  const RETRO = cr([[XF, ZF], [52, 42.8], [47.7, 43.6], [45.7, 46.2], [45.7, 48.4]]);
  const VIA = cr([[45.7, 48.4], [45.7, 46.4], [43.4, 43.3], [38, 42.75], [12, 42.75], [7.6, 43.6], [4.8, 47.4], [4.3, 53.2], [3.4, 55.9], [0, 55.5], [-16, 55.5]]);
  const _p = new THREE.Vector3(), _t = new THREE.Vector3();
  const metti = (C, u, retro) => { u = u > 0 ? Math.min(1, u) : 0; C.getPointAt(u, _p); C.getTangentAt(u, _t); g.position.copy(_p); g.rotation.y = Math.atan2(-_t.z, _t.x) + (retro ? Math.PI : 0); };
  const ee = u => u < .5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
  // ciclo di 78 s (02/10 sera, prima 52: nel cancello passava a circa 30 km/h): arrivo 0–22, fermo 22–50, manovra 50–56, uscita 56–76.
  // Velocità a trapezio: al massimo circa 5,5 m/s
  const posa = c => { if (c < 22) metti(ARR, trap(c / 22)); else if (c < 50) metti(ARR, 1);
    else if (c < 56) metti(RETRO, ee((c - 50) / 6), true); else metti(VIA, trap(Math.min(1, (c - 56) / 20))); };
  const apri = apriCancello(cancello, c => { posa(c); return g.position; }, 78, [4.15, 52], -1);   // cancello carraio blu, scorre verso ovest
  return Object.assign(t => { const c = ((t % 78) + 78) % 78; g.visible = c > .3 && c < 76.7; posa(c); apri(c); }, { gruppo: g });
}
// scritta su un fianco (piano con testo disegnato su canvas, rifatto quando i caratteri della pagina sono pronti). nord = faccia verso −z
function scritta(p, righe, x, y, z, w, h, nord, statico = true) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const disegna = () => { const q = c.getContext('2d'), H = c.height; q.fillStyle = '#ffffff'; q.fillRect(0, 0, 1024, H); q.fillStyle = '#111111'; q.textAlign = 'center'; q.textBaseline = 'middle';
    const [titolo, ...resto] = righe.map(t);   // lingua.js: le scritte si ridisegnano al cambio di lingua
    if (titolo === 'RiFRA') {   // logo ufficiale RiFRA Milano al posto della parola (Marco 02/10: «mancano i loghi sui veicoli»)
      LOGO2D = LOGO2D || LOGO.paths.map(d => new Path2D(d)); const [lw, lh] = LOGO.viewBox, k = H * (resto.length > 1 ? .4 : .5) / lh;
      q.save(); q.translate(512 - lw * k / 2, H * (resto.length > 1 ? .06 : .08)); q.scale(k, k); LOGO2D.forEach(d => q.fill(d)); q.restore();
    } else { q.font = `500 ${Math.round(H * .36)}px Newsreader, Georgia, serif`; q.fillText(titolo, 512, H * (resto.length > 1 ? .3 : .36)); }
    let fs = Math.round(H * (resto.length > 1 ? .1 : .15)); q.font = `400 ${fs}px Newsreader, Georgia, serif`;
    while (resto.some(r => q.measureText(r).width > 960) && fs > 10) { fs--; q.font = `400 ${fs}px Newsreader, Georgia, serif`; }
    resto.forEach((r, i) => q.fillText(r, 512, H * (resto.length > 1 ? .64 + i * .17 : .72))); tex.needsUpdate = true; };
  disegna(); allaLingua(disegna); if (document.fonts && document.fonts.ready) document.fonts.ready.then(disegna);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: .55 })); m.position.set(x, y, z); if (nord) m.rotation.y = Math.PI;
  m.receiveShadow = true; m.userData.statico = statico; p.add(m); return m;
}
// carrello rosso con i pannelli spinto lungo la corsia tra le fasce (V f_020)
const liscio = u => u * u * (3 - 2 * u);
// velocità a trapezio per i mezzi nel piazzale: parte e arriva piano, in mezzo costante (picco 1,33 volte la media)
const trap = (s, a = .25) => s < a ? s * s / (2 * a * (1 - a)) : s > 1 - a ? 1 - (1 - s) * (1 - s) / (2 * a * (1 - a)) : (s - a / 2) / (1 - a);
function carrelloSpinto(scene, M) {
  const g = gruppo(scene); g.userData.anim = true; const c0 = gruppo(g); carrello(c0, M, -1.2, -.55);
  c0.traverse(o => { if (o.isMesh) o.userData.statico = false; });
  // corridoio montaggio / laboratorio (rilievo). Controllo collisioni (ricerca/COLLISIONI.md): asse a z 24,02 (prima 23,4) fra gli scaffali
  // e gli armadietti del montaggio (z ≤ 23,45) e la De Stefani (z ≥ 24,6), capolinea est a x 59,5 (prima 63: il carrello entrava
  // nella levigatrice della tappa 8). Il carrello è largo 1,1 m: 2 cm di margine per lato
  const p = persona(scene, M, 0, 0); const Z = 24.02;
  // ai capolinea (carrello fermo 3 s) la persona gira attorno al carrello dal lato nord per spingerlo nell'altro verso (prima «saltava» di 3,6 m)
  const giro = [[-1.8, 0], [-1.45, -.92], [1.62, -.92], [1.68, 0]], lg = [0]; for (let i = 1; i < giro.length; i++) lg.push(lg[i - 1] + Math.hypot(giro[i][0] - giro[i - 1][0], giro[i][1] - giro[i - 1][1]));
  const lungo = (u, verso) => { let s = liscio(u) * lg[3]; if (verso < 0) s = lg[3] - s; let i = 1; while (i < 3 && lg[i] < s) i++; const k = (s - lg[i - 1]) / (lg[i] - lg[i - 1]), a = giro[i - 1], b = giro[i];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2((b[0] - a[0]) * verso, (b[1] - a[1]) * verso)]; };
  return Object.assign(t => { const c = t % 40, x = kf(c, [[0, 11], [1, 11], [18, 59.5], [21, 59.5], [38, 11], [40, 11]]);
    g.position.set(x, 0, Z);
    const uE = (c - 18.1) / 2.8, cw = (c - 38.1 + 40) % 40, uW = cw / 2.8;
    if (uE >= 0 && uE < 1 || uW >= 0 && uW < 1) {   // giro attorno al carrello: a est da ovest verso est, a ovest al contrario
      const u = uE >= 0 && uE < 1 ? uE : uW, verso = uE >= 0 && uE < 1 ? 1 : -1, [dx, dz, ry] = lungo(u, verso);
      // nell'ultimo tratto si gira già verso il carrello (di spalle alla levigatrice della tappa 8: controllo collisioni)
      const fine = verso > 0 ? -Math.PI / 2 : Math.PI / 2, k = liscio(Math.min(1, Math.max(0, (u - .62) / .3)));
      let d = fine - ry; d = Math.atan2(Math.sin(d), Math.cos(d));
      p.position.set(x + dx, 0, Z + dz); p.rotation.y = ry + d * k; p.posa(t, { passo: 1, lavoro: 0 }); return; }
    const dir = c >= 20.9 && c < 38.1 ? -1 : 1;
    p.position.set(x - dir * (dir > 0 ? 1.8 : 1.68), 0, Z); p.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;   // a est 12 cm più vicino: la levigatrice è a un passo
    // mani sul telaio di testa del carrello (a 1,2 m dal centro, alto ~1 m); il passo si ricava dallo spostamento reale
    const moving = (c > 1 && c < 18) || (c > 21 && c < 38); p.posa(t, { passo: moving ? 1 : 0, lavoro: 1, presa: [x - dir * 1.2, 1.02, Z], largo: .6 }); }, { gruppo: g });
}
