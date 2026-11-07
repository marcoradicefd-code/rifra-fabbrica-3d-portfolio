// Libreria delle macchine RiFRA (M01…M34 di ricerca/LAYOUT-MACCHINE.json), tutte procedurali, in metri.
// Ogni costruttore restituisce un THREE.Group con origine al CENTRO dell'ingombro a terra (il «centro» del JSON),
// x = est, z = sud, y = alto (tutte le macchine del rilievo hanno rot = 0, quindi locale = orientamento del mondo).
// Le parti animate stanno in gruppi con userData.anim = true e sono raccolte in g.userData.parti (nomi in italiano).
// Tutto il resto è statico (userData.statico) e viene fuso in poche chiamate di disegno da fondiStatici (prim.js).
// Fonti: F = foto IMG_74xx, V = fotogrammi del video IMG_0008 (f_0xx), PE = pianta di evacuazione, JSON = LAYOUT-MACCHINE.json.
// Colori dai campi «colori» del JSON (misurati sulle foto). Scritte dei marchi solo dove sono leggibili nelle foto.
// Ciò che non si vede nelle foto è marcato ILLUSTRATIVO nei commenti.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, cyl, tubo, gruppo } from './prim.js';
import { ATLANTE } from './materiali.js';
import { H_PROD } from './edificio.js';

let M = null, MM = null;
export const ANTA = { L: 1.4, W: .6, T: .02 };   // pezzo tipo: anta 1400 × 600 × 20 mm (ILLUSTRATIVO: formato medio di un'anta da cucina)

// ---------- materiali aggiuntivi (tinte unite nell'atlante: non aggiungono chiamate di disegno) ----------
export function materialiMacchine(Mbase) {
  if (MM) return MM; M = Mbase;
  const S = (c, r = .5, m = 0) => { const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); ATLANTE.add(x); return x; };
  MM = {
    biancoBiesse: S(0xe6e7e4, .42), verdeBiesse: S(0x7dba2f, .45), cappaBiesse: S(0x2e3134, .4), pianoNero: S(0x1e1f20, .6), ventosa: S(0x3a3c3f, .55),
    tuboGiallo: S(0xd9be6a, .7), tappeto: S(0x2b2c2e, .9), truciolare: S(0xc9b38e, .85),
    bianco2: S(0xedeeea, .45), verdeBrema: S(0x7cc242, .45), led: S(0x3d6bff, .3),
    casolin: S(0xefefec, .45), frecciaAzzurra: S(0x5b9bd5, .45), alluminio: S(0xb5b8ba, .35, .6), ghisa: S(0xb9bcbd, .4, .5), verdeAltendorf: S(0x11845a, .5),
    telaioSez: S(0x8f9497, .5, .3), doghe: S(0xb88f5a, .75), rossoLinee: S(0xc0392b, .55),
    vpCabina: S(0xdad8d0, .55), vpBlu: S(0x2b3f8c, .5), emcCorpo: S(0xe4e4e0, .5), emcRullo: S(0xc2573a, .6),
    levCorpo: S(0xd9d9d4, .5), levBase: S(0x5a5d60, .55),
    ceflaCorpo: S(0xe6e4df, .45), ceflaScuro: S(0x1d1e20, .5), ceflaInterno: S(0x6f6a5e, .85), nastroCefla: S(0xa8916c, .9), nastroPistole: S(0xd8d4c8, .7), forno: S(0xc9cbc8, .5), maniglia: S(0x3c3f42, .4, .4),
    telaioCarrello: S(0x3e6b3a, .6), bracciBlu: S(0x3a6fb5, .5), punteGialle: S(0xe8c21a, .5),
    erregiPortale: S(0x9ea3a6, .5, .2), quadro: S(0xe1e3e1, .5), gialloPressori: S(0xe8c21a, .5), nastroScuro: S(0x3a3b3d, .8),
    deStefani: S(0xe3e5e4, .5), rulliBlu: S(0x2f5fa8, .45), brandt: S(0xf2f2ef, .42),
    verdeLevNastro: S(0x4f7f52, .6), pianoLegno: S(0xb08d5b, .75), gialloRastr: S(0xd4a017, .5), bracciRastr: S(0xa8783e, .6),
    toupie: S(0x1f8fa0, .5), verdeTrad: S(0x3e7d4f, .55), robopac: S(0x1f4e9c, .45), piattaforma: S(0x8b2e2a, .6),
    scaffBlu: S(0x2f5c9e, .5), scaffArancio: S(0xe0701e, .55), mobiliScuri: S(0x2b2c2e, .55), scaffGrigio: S(0x6b6f73, .5, .3),
    stanza: S(0x4a4d52, .85), cabina: S(0xd9d2c3, .9), sporco: S(0xbfb6a3, .95), filtri: S(0xd8b27a, .95),
    mdfPieno: S(0xc7a57c, .8), melaminico: S(0xedede8, .5), laccatoPieno: S(0x17181c, .18), rossoCarrello: S(0x9e2b25, .55), cartone: S(0xb8905e, .85),
    schermo: S(0x2f6fb0, .25), gomma: S(0x151517, .8), rosa: S(0xd9a7a7, .6),
  };
  MM.loghi = new THREE.MeshStandardMaterial({ map: atlanteLoghi(), roughness: .45 });
  // vetro delle finestre dello Spraybotic: poco riflesso, per vedere testa e nastro all'interno (F 7450, 7451)
  MM.vetroChiaro = new THREE.MeshPhysicalMaterial({ color: 0xc9d3d8, roughness: .05, transparent: true, opacity: .1, envMapIntensity: .08, depthWrite: false });
  MM.lucePorta = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffe2b0, emissiveIntensity: .9, roughness: .5 });   // porta illuminata sotto il soppalco (V f_069)
  return MM;
}

// ---------- scatole con spigoli smussati (VIDEO-GIOCHI-TECNICHE #8): una geometria condivisa per misura ----------
const _rb = new Map();
function geoTonda(w, h, d, r) {
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`; let g = _rb.get(k);
  if (!g) { const rr = Math.max(.002, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)); g = new RoundedBoxGeometry(w, h, d, 2, rr).translate(0, h / 2, 0); _rb.set(k, g); }
  return g;
}
// come box() di prim.js (angolo minimo x,y,z e misure w,h,d) ma con spigoli arrotondati (r in metri)
export function tbox(p, x, y, z, w, h, d, mat, opt = {}) {
  const m = new THREE.Mesh(geoTonda(w, h, d, opt.r ?? .03), mat); m.position.set(x + w / 2, y, z + d / 2);
  m.castShadow = opt.cast !== false; m.receiveShadow = true; m.userData.statico = opt.statico !== false; p.add(m); return m;
}
// scatola centrata in x e z (comoda per le macchine con origine al centro)
const cb = (p, cx, y, cz, w, h, d, mat, opt) => box(p, cx - w / 2, y, cz - d / 2, w, h, d, mat, opt);
const ctb = (p, cx, y, cz, w, h, d, mat, opt) => tbox(p, cx - w / 2, y, cz - d / 2, w, h, d, mat, opt);
export function anim(p, x = 0, y = 0, z = 0) { const g = gruppo(p, x, y, z); g.userData.anim = true; return g; }
const cilX = (p, x, y, z, r, len, mat, opt = {}) => { const c = cyl(p, x, y, z, r, len, mat, { ...opt, rz: -Math.PI / 2 }); return c; };   // cilindro lungo +x dalla base (x,y,z)
const cilZ = (p, x, y, z, r, len, mat, opt = {}) => cyl(p, x, y, z, r, len, mat, { ...opt, rx: Math.PI / 2 });                       // cilindro lungo +z
// calata di aspirazione verso il soffitto (analisi Fable, P1 n. 4): il tratto sopra «taglio» (m) è marcato userData.alto e main.js lo sposta
// nel livello alto (ARR.alto), visibile da lontano e nascosto nelle inquadrature ravvicinate insieme alle condotte a soffitto;
// il tratto sotto resta con la macchina. Così le calate non coprono più le macchine nelle tappe (05, 07, 09).
export function calata(p, pts, r, mat, taglio = 4.5, opt = {}) {
  const sotto = [], sopra = [];
  for (let i = 0; i < pts.length; i++) { const q = pts[i], a = pts[i - 1];
    if (a && (a[1] - taglio) * (q[1] - taglio) < 0) { const u = (taglio - a[1]) / (q[1] - a[1]), x = [a[0] + (q[0] - a[0]) * u, taglio, a[2] + (q[2] - a[2]) * u]; sotto.push(x); sopra.push(x); }
    (q[1] <= taglio ? sotto : sopra).push(q); }
  const giu = sotto.length > 1 ? tubo(p, sotto, r, mat, opt) : null, su = sopra.length > 1 ? tubo(p, sopra, r, mat, opt) : null;
  if (su) su.userData.alto = true; return [giu, su];
}

// ---------- atlante delle scritte dei marchi (una texture, un materiale: una chiamata per reparto) ----------
let LOGHI = {};
function atlanteLoghi() {
  const W = 1024, c = document.createElement('canvas'); c.width = W; c.height = W; const g = c.getContext('2d');
  const F = (s, peso = 700, stile = '') => `${stile} ${peso} ${s}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const reg = (k, x, y, w, h, bg, fn) => { g.save(); g.fillStyle = bg; g.fillRect(x, y, w, h); g.beginPath(); g.rect(x, y, w, h); g.clip(); fn(x, y, w, h); g.restore(); LOGHI[k] = [x / W, 1 - (y + h) / W, (x + w) / W, 1 - y / W]; };
  const txt = (s, x, y, font, col, al = 'center') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const vert = (s, cx, cy, font, col, ang) => { g.save(); g.translate(cx, cy); g.rotate(ang); txt(s, 0, 0, font, col); g.restore(); };
  // carter della Brandt (F 7446, V f_025): logo quadrato «K» e BRANDT blu a sinistra, onda azzurra irregolare lungo tutto il carter
  reg('brandt', 0, 0, 1024, 128, '#f2f2ef', (x, y, w, h) => {
    g.strokeStyle = '#1b5faa'; g.lineWidth = 5; g.strokeRect(22, 40, 44, 44); txt('K', 44, 63, F(34, 800), '#1b5faa'); txt('BRANDT', 78, 63, F(30, 700), '#1b5faa', 'left');
    g.strokeStyle = '#6fa3d8'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i <= 200; i++) { const u = i / 200, px = 40 + u * 970, py = 92 - Math.sin(u * 41) * 7 - Math.sin(u * 13 + 1) * 5 + (u < .08 ? (u - .08) * 120 : 0); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
    g.fillStyle = '#6fa3d8'; g.beginPath(); g.arc(70, 104, 7, 0, Math.PI * 2); g.fill(); });
  // Cefla Finishing Spraybotic (F 7450, V f_033): cerchio rosso, «cefla» rosso, «spraybotic» grigio scuro
  reg('cefla', 0, 128, 512, 128, '#e6e4df', () => { g.fillStyle = '#c8102e'; g.beginPath(); g.arc(150, 192, 30, -.4, Math.PI * 1.4); g.lineWidth = 9; g.strokeStyle = '#c8102e'; g.stroke();
    txt('cefla', 118, 188, F(40, 700), '#c8102e', 'right'); txt('spraybotic', 200, 192, F(40, 600), '#3c3f42', 'left'); });
  // BIESSE verticale sul montante del portale (F 7442) e orizzontale (targa «BIESSE MILANO» della Brema, F 7444)
  reg('biesseV', 512, 128, 64, 384, '#f4f4f2', () => vert('BIESSE', 544, 320, F(40, 800), '#111', -Math.PI / 2));
  reg('biesseH', 256, 320, 256, 64, '#f4f4f2', () => txt('BIESSE', 384, 352, F(40, 800), '#111'));
  // ROBOPAC verticale sulla colonna (F 7457, 7458)
  reg('robopac', 576, 128, 64, 448, '#1f4e9c', () => vert('ROBOPAC', 608, 352, F(40, 700), '#dfe6f0', Math.PI / 2));
  reg('brema', 640, 128, 384, 64, '#7cc242', () => txt('Brema EKO 2.1', 832, 160, F(40, 500), '#ffffff'));             // F 7444
  reg('casolin', 640, 192, 384, 96, '#efefec', () => { g.fillStyle = '#5b9bd5'; g.beginPath(); g.moveTo(870, 200); g.lineTo(1010, 200); g.lineTo(990, 282); g.closePath(); g.fill();
    txt('CASOLIN', 660, 240, F(44, 600), '#3c5b8c', 'left'); });                                                              // V f_058
  reg('altendorf', 640, 288, 384, 64, '#11845a', () => txt('ALTENDORF', 832, 320, F(40, 700), '#ffffff'));             // V f_054
  reg('erregi', 640, 352, 256, 64, '#2e8b3e', () => txt('ERREGI', 768, 384, F(40, 800), '#ffffff'));                  // F 7453
  reg('emc', 0, 256, 256, 64, '#e4e4e0', () => txt('EMC', 128, 288, F(46, 800, 'italic'), '#2f6db5'));                // V f_041
  reg('luc', 256, 256, 256, 64, '#e4e4e0', () => { g.strokeStyle = '#2f6db5'; g.lineWidth = 4; g.beginPath(); g.arc(290, 288, 20, .6, Math.PI * 1.7); g.stroke(); txt('LUC line', 318, 288, F(30, 600), '#333', 'left'); });
  reg('destefani', 0, 320, 256, 64, '#e3e5e4', () => txt('De Stefani', 128, 352, F(36, 600, 'italic'), '#333'));      // V f_022
  // quadro elettrico aperto dell'Erregi (F 7453): pannello bianco con morsettiere e inverter (resa schematica)
  reg('quadro', 0, 384, 256, 192, '#e8eae8', () => { g.fillStyle = '#9aa0a4'; g.fillRect(12, 400, 232, 10); g.fillRect(12, 480, 232, 8);
    for (let i = 0; i < 7; i++) { g.fillStyle = ['#d8d8d4', '#3b3e42', '#d8d8d4', '#e8c21a', '#3b3e42', '#d8d8d4', '#2f6db5'][i]; g.fillRect(16 + i * 33, 418, 26, 52); }
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 3 ? '#555' : '#c0392b'; g.fillRect(16 + i * 19, 496, 14, 30); } g.fillStyle = '#9aa0a4'; g.fillRect(12, 540, 232, 20); });
  // schermo di pulpito: interfaccia azzurra schematica (F 7442, 7452)
  reg('schermo', 256, 384, 256, 160, '#10263c', () => { g.fillStyle = '#e8eef4'; g.fillRect(266, 394, 236, 24); g.strokeStyle = '#7fb6e6'; g.lineWidth = 3; g.strokeRect(280, 430, 120, 90);
    g.strokeRect(300, 450, 50, 40); for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#4f8fd0' : '#c8d8e8'; g.fillRect(412, 432 + i * 18, 80, 12); } });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const _pg = new Map();
// scritta/decalcomania: piano centrato in (x,y,z), largo w e alto h, rivolto verso +z ruotato di ry
export function logo(p, k, x, y, z, w, h, ry = 0, opt = {}) {
  const key = k + '|' + w + '|' + h; let geo = _pg.get(key);
  if (!geo) { const [u0, v0, u1, v1] = LOGHI[k]; geo = new THREE.PlaneGeometry(w, h); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i)); _pg.set(key, geo); }
  const m = new THREE.Mesh(geo, MM.loghi); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; m.castShadow = false; m.userData.statico = opt.statico !== false; p.add(m); return m;
}

// ---------- pezzi comuni ----------
// pila di pannelli coricati: angolo minimo (x,z), base y; n lastre di spessore t; restituisce la quota del piano superiore
export function pila(p, x, y, z, w, d, n, t, mats) { const ms = Array.isArray(mats) ? mats : [mats]; for (let i = 0; i < n; i++) box(p, x, y + i * t, z, w, t, d, ms[i % ms.length]); return y + n * t; }
// bancale 1,2 × 0,8 (o su misura) in legno
export function bancale(p, x, z, w = 1.2, d = .8, y = 0) { box(p, x, y + .1, z, w, .044, d, M.legno); for (const a of [0, .45, .9]) box(p, x, y, z + a * (d - .1), w, .1, .1, M.legno); return y + .144; }
// carrello rosso a telaio per ante in piedi (F 7445, 7447; V f_020, f_040): telaio rosso, fondo e sponde in truciolare, ruote
export function carrelloAnte(p, x, z, n = 6, ry = 0) {
  const g = gruppo(p, x, 0, z); g.rotation.y = ry;
  for (const [a, b] of [[-.5, -.3], [.5, -.3], [-.5, .3], [.5, .3]]) { cyl(g, a, 0, b, .06, .13, M.nero); }
  box(g, -.55, .13, -.33, 1.1, .05, .66, MM.rossoCarrello); box(g, -.53, .18, -.31, 1.06, .03, .62, MM.truciolare);
  for (const s of [-1, 1]) { box(g, s * .52 - .02, .18, -.33, .04, 1.05, .04, MM.rossoCarrello); box(g, s * .52 - .02, .18, .29, .04, 1.05, .04, MM.rossoCarrello);
    box(g, -.55, 1.21, s * .31 - .02, 1.1, .04, .04, MM.rossoCarrello); box(g, -.51, .2, s * .3 - .01, 1.02, .5, .02, MM.truciolare); }
  for (let i = 0; i < n; i++) box(g, -.46, .21, -.2 + i * .07, ANTA.L * .64, ANTA.W * 1.5, ANTA.T, i % 2 ? MM.melaminico : MM.mdfPieno);
  return g;
}
// persona di servizio non serve qui: le persone le crea reparti.js (prim.persona)

// ======================================================================================================
// M01, M02 · Biesse Rover A, centro di lavoro CNC a portale (F 7442, 7443; V f_062, f_063). Ingombro 6,8 × 4,8 × 2,8 (JSON).
// Basamento bianco con barre nere e ventose, portale mobile in x con cappa in vetro fumé, montante bianco con BIESSE verticale,
// fascia verde sul fianco, calata gialla spiralata dal soffitto, protezioni trasparenti sul retro, rete scura sul lato del pulpito.
// Assi: portale in x (X macchina), testa in z (Y macchina), mandrino in y (Z macchina).
export function roverA(o = {}) {
  const g = new THREE.Group(), w = o.w || 6.8, hw = w / 2, B = MM.biancoBiesse;
  // area a terra: tappeto scuro con righe gialle (F 7442: pavimento scuro tra le righe gialle)
  box(g, -hw, 0, -2.4, w, .012, 4.8, MM.tappeto, { cast: false });
  for (const [x, z, a, b] of [[-hw, -2.4, w, .08], [-hw, 2.32, w, .08], [-hw, -2.4, .08, 4.8], [hw - .08, -2.4, .08, 4.8], [-1, .7, .08, 1.62], [2.2, .7, .08, 1.62]]) box(g, x, .012, z, a, .004, b, M.righeGialle, { cast: false });
  // basamento e piano a barre (le barre corrono in z, F 7442)
  tbox(g, -hw + .4, 0, -1.6, w - .8, .72, 2.0, B, { r: .04 }); box(g, -hw + .4, 0, .38, w - .8, .1, .04, M.antracite);
  box(g, -hw + .4, .6, .4, w - .8, .1, .1, M.acciaio);
  const nb = Math.round((w - 1.2) / .9);
  for (let i = 0; i <= nb; i++) { const x = -hw + .6 + i * (w - 1.2) / nb; box(g, x - .06, .72, -1.5, .12, .14, 1.85, MM.pianoNero);
    for (const z of [-1.0, -.2]) { box(g, x - .07, .86, z - .15, .14, .1, .3, MM.ventosa); } cilZ(g, x, .8, .35, .03, .25, MM.gomma); }
  // protezioni: vetri sul retro e sul lato est, rete scura sul lato ovest (F 7442)
  for (const x of [-hw, -hw / 3, hw / 3, hw - .06]) box(g, x, 0, -2.36, .06, 2.0, .06, M.antracite);
  box(g, -hw, .15, -2.33, w, 1.8, .02, M.vetro); box(g, hw - .04, .15, -2.3, .02, 1.8, 2.2, M.vetro);
  box(g, -hw - .02, 0, -2.3, .05, 1.9, 2.3, M.vetroScuro); box(g, -hw - .04, 0, -2.3, .06, 1.95, .06, M.antracite); box(g, -hw - .04, 0, -.06, .06, 1.95, .06, M.antracite);
  // portale (anim): cappa bianca con frontale in vetro fumé, montante con BIESSE, fascia verde e targa Rover sul fianco
  const portale = anim(g);
  ctb(portale, .1, .95, -.6, 2.0, 1.4, 2.6, B, { r: .05 });
  box(portale, -.62, 1.02, .705, 1.6, 1.26, .02, M.vetroScuro); box(portale, .96, 1.1, .71, .015, 1.1, .01, M.arancio);
  logo(portale, 'biesseV', -.77, 1.62, .717, .14, .8);
  box(portale, 1.101, 2.05, -1.8, .004, .2, 2.4, MM.verdeBiesse); box(portale, -.905, 2.05, -1.8, .004, .2, 2.4, MM.verdeBiesse);
  box(portale, -.35, .5, .45, .7, .45, .28, B); box(portale, -.35, 0, -2.2, .7, .95, .35, B);    // gambe sulle guide anteriore e posteriore
  box(portale, -.3, 2.35, -1.2, .6, .3, .5, M.nero);                                             // scatola elettrica sopra la cappa (F 7442)
  // aspirazione (F 7442, 7443): condotta beige dritta dal soffitto, raccordo nero, tubo giallo spiralato arrotolato sopra la cappa
  // la condotta sul portale si ferma a 3,7 m (segue la macchina); il tratto dritto da 4,5 m al soffitto è fisso e va nel livello alto (vedi calata)
  cyl(portale, .15, 2.95, -.6, .16, .75, MM.tuboGiallo); cyl(portale, .15, 2.72, -.6, .19, .25, M.nero);
  cyl(portale, .15, 4.5, -.6, .16, H_PROD - .25 - 4.5, MM.tuboGiallo).userData.alto = true;
  const sp = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 3.2; sp.push([.15 + Math.cos(a) * .32, 2.62 + Math.sin(a * .5) * .08 - i * .004, -.6 + Math.sin(a) * .32]); }
  tubo(portale, sp, .1, MM.tuboGiallo, { tension: .5 });
  const testa = anim(portale, 0, 0, 0);                                                            // gruppo operatore (asse Y = z)
  cb(testa, 0, 1.15, 0, .32, .8, .32, M.antracite); cyl(testa, 0, .98, 0, .07, .2, M.acciaio); cyl(testa, 0, .93, 0, .012, .06, M.cromato); const mandrino = testa;   // mandrino nella testa: sale e scende con lei (una chiamata in meno)
  // pulpito bianco con monitor all'estremità ovest (F 7442), solo sul primo centro
  if (o.pulpito) { tbox(g, -hw - 1.0, 0, .9, .75, 1.95, .55, B); box(g, -hw - .95, 1.12, 1.45, .65, .45, .02, MM.cappaBiesse); logo(g, 'schermo', -hw - .625, 1.35, 1.475, .55, .34);
    box(g, -hw - 1.0, 1.0, 1.45, .75, .04, .25, B); }
  g.userData.parti = { portale, testa, mandrino };
  return g;
}

// ======================================================================================================
// M04 · Biesse Brema EKO 2.1, foratrice verticale CNC (F 7444; V f_060). Ingombro 5,4 × 2,9 × 2,3 (JSON). Operatore a nord.
// Torre centrale: anta nera vetrata con striscia LED blu, fronte verde con monitor incassato, scritta «Brema EKO 2.1»;
// banchi laterali bianchi alti ~1 m con appoggi verticali per il pannello in piedi (DIBATTITO § 3: fiancate a 1,0–1,1 m).
export function brema() {
  const g = new THREE.Group(), B = MM.bianco2, zF = -.55;   // fronte (lato operatore) verso nord, a z = -0,55
  ctb(g, 0, 0, .1, 1.9, 2.3, 1.3, B, { r: .04 });
  box(g, .25, .3, zF - .02, .7, 1.9, .03, MM.cappaBiesse); box(g, .3, .45, zF - .035, .6, 1.6, .02, M.vetroScuro); box(g, .285, .45, zF - .04, .015, 1.5, .01, MM.led);
  logo(g, 'biesseH', .6, .38, zF - .045, .5, .12, Math.PI);
  box(g, -.47, .05, zF - .03, .72, 2.25, .03, MM.verdeBrema); logo(g, 'brema', -.11, 2.18, zF - .05, .66, .11, Math.PI);
  box(g, -.41, 1.25, zF - .05, .6, .4, .02, M.nero); logo(g, 'schermo', -.11, 1.45, zF - .065, .52, .33, Math.PI);
  box(g, -.42, 1.08, zF - .3, .62, .03, .28, B);                                                    // mensola tastiera
  // banchi laterali (rulliere bianche) e appoggi verticali a strisce nere (F 7444)
  for (const s of [-1, 1]) { const x0 = s < 0 ? -2.7 : .95, L = 1.75;
    tbox(g, x0, 0, -.25, L, .72, .7, B, { r: .03 }); box(g, x0, .72, -.12, L, .08, .3, M.acciaio);
    box(g, x0, .8, .02, L, .55, .05, B); for (let k = 0; k < 3; k++) box(g, x0, .88 + k * .15, -.005, L, .03, .03, M.nero);
    for (const xx of [x0 + .1, x0 + L - .15]) box(g, xx, 0, -.5, .05, .75, .05, M.acciaio); }
  // sgabello (F 7444)
  cyl(g, -.1, 0, -1.3, .2, .02, M.cromato); cyl(g, -.1, .02, -1.3, .03, .62, M.cromato); cyl(g, -.1, .64, -1.3, .18, .08, M.nero);
  const pan = anim(g); g.userData.parti = { pan };
  return g;
}

// ======================================================================================================
// M05 · foratrice da banco (sfondo di F 7444): piccola macchina grigia su banco. Forma generica (ILLUSTRATIVO nei dettagli).
export function foratriceBanco() {
  const g = new THREE.Group(); tbox(g, -.75, 0, -.35, 1.5, .8, .7, MM.telaioSez); box(g, -.7, .8, -.3, 1.4, .05, .6, M.grigioScuro);
  cyl(g, .2, .85, .1, .05, .75, M.acciaio); ctb(g, .2, 1.3, 0, .3, .3, .45, M.grigio); cyl(g, .2, 1.1, -.1, .02, .2, M.cromato); return g;
}

// ======================================================================================================
// M06, M07, M08 · squadratrici a carro (V f_058, f_054; F 7445, 7447). Ingombro 3,4 × 3,5 × 1,3 (JSON); carro ~3,2 m lungo z.
// tipo 'casolin': corpo bianco con freccia azzurra e scritta; 'bianca': come Casolin, marca non leggibile; 'altendorf': basamento verde.
// Riquadro arancio a terra (F 7445). Cuffia della lama su braccio aereo con tubo di aspirazione (F 7445, V f_058).
export function squadratrice(tipo = 'casolin') {
  const g = new THREE.Group(), corpo = tipo === 'altendorf' ? MM.verdeAltendorf : MM.casolin;
  for (const [x, z, a, b] of [[-1.7, -1.75, 3.4, .1], [-1.7, 1.65, 3.4, .1], [-1.7, -1.75, .1, 3.5], [1.6, -1.75, .1, 3.5]]) box(g, x, .003, z, a, .005, b, M.righeArancio, { cast: false });
  // basamento pieno ~1,1 × 1,6 × 0,82 con zoccolo scuro e piano in ghisa largo 1,2 × 1,6 (F 7447, V f_058: la macchina è una cassa robusta,
  // non un tavolino); prolunga del piano a est su una gamba. Analisi Fable P1 n. 6
  tbox(g, -.1, 0, -.8, 1.1, .82, 1.6, corpo, { r: .03 }); box(g, -.08, 0, -.78, 1.06, .07, 1.56, M.grigioScuro);
  box(g, -.12, .82, -.8, 1.2, .06, 1.6, MM.ghisa); box(g, 1.08, .83, -.7, .6, .05, 1.1, MM.ghisa); box(g, 1.6, 0, -.2, .06, .83, .06, M.acciaio);
  // fianco lungo sotto il carro (lato operatore, ovest): scritta, riquadro azzurro e pulsantiera (V f_058)
  const lato = -.106; box(g, lato - .004, .66, -.62, .01, .07, .5, M.nero); for (let k = 0; k < 4; k++) box(g, lato - .008, .68, -.58 + k * .12, .01, .03, .05, k % 2 ? M.rosso : M.grigio);
  if (tipo === 'casolin') logo(g, 'casolin', lato, .42, .2, .9, .22, -Math.PI / 2);
  else if (tipo === 'altendorf') logo(g, 'altendorf', lato, .42, .2, .9, .15, -Math.PI / 2);
  else box(g, lato - .004, .4, -.1, .005, .05, .6, MM.frecciaAzzurra);
  // guida fissa del carro (in z) con gambe (F 7445)
  box(g, -.42, .72, -1.7, .28, .1, 3.3, MM.alluminio); box(g, -.4, 0, 1.2, .06, .72, .06, M.acciaio); box(g, -.4, 0, -1.4, .06, .72, .06, M.acciaio);
  // carro: doppio profilo in alluminio lungo 3,2 m con le due scanalature (F 7447)
  const carro = anim(g); box(carro, -.44, .82, -1.6, .32, .07, 3.2, MM.alluminio); for (const x of [-.4, -.24]) box(carro, x, .89, -1.6, .02, .006, 3.2, M.grigioScuro);
  // squadra in alluminio sul carro: telaio a due bracci, profilo della squadra con fermi, gamba d'appoggio (F 7445, 7447; V f_058)
  box(carro, -2.3, .84, .45, 1.88, .05, .07, MM.alluminio); box(carro, -2.3, .84, .9, 1.88, .05, .07, MM.alluminio); box(carro, -2.32, .84, .45, .08, .05, .52, MM.alluminio);
  box(carro, -2.3, .89, .95, 1.88, .1, .08, MM.alluminio); for (const x of [-1.9, -1.2]) box(carro, x, .99, .94, .08, .06, .1, M.nero);
  box(carro, -2.2, 0, .9, .05, .84, .05, M.acciaio);
  // braccio aereo con cuffia: montante dietro la lama, cuffia bianca con freccia azzurra (F 7445), tubo di aspirazione dal soffitto
  box(g, -1.15, 0, -1.3, .1, 1.85, .1, M.acciaio); box(g, -1.15, 1.75, -1.3, 1.2, .08, .08, M.acciaio); box(g, -.04, 1.75, -1.3, .08, .08, 1.0, M.acciaio); box(g, -.03, 1.3, -.36, .06, .5, .06, M.acciaio);
  ctb(g, 0, 1.08, -.1, .3, .22, .7, tipo === 'altendorf' ? M.grigio : MM.casolin, { r: .04 }); box(g, .151, 1.12, -.35, .004, .1, .4, MM.frecciaAzzurra);
  calata(g, [[0, 1.3, -.2], [.3, 1.9, -.6], [.5, 3.2, -1.0], [.5, H_PROD - .3, -1.0]], .06, MM.tuboGiallo);
  if (tipo === 'altendorf') ctb(g, 1.8, 0, 1.0, .8, .85, .6, MM.verdeAltendorf);   // cassone verde per gli sfridi accanto (V f_054)
  g.userData.parti = { carro };
  return g;
}

// ======================================================================================================
// M09 · sezionatrice verticale a parete (V f_040, f_042, f_043). Ingombro 5,7 × 1,3 × 2,9 (JSON). Marca non leggibile.
// Telaio grigio inclinato contro il muro sud, doghe orizzontali in legno con righe rosse, trave verticale con gruppo lama.
// Il telaio è in un sottogruppo inclinato: la sua faccia (lato operatore) guarda a nord.
export function sezionatrice() {
  const g = new THREE.Group(), tel = gruppo(g, 0, 0, .15); tel.rotation.x = .14;   // cima verso sud (muro)
  box(tel, -2.85, 0, 0, 5.7, .1, .35, MM.telaioSez); box(tel, -2.85, 2.8, 0, 5.7, .1, .12, MM.telaioSez);
  for (const x of [-2.85, -1, 1, 2.75]) box(tel, x, 0, .02, .1, 2.9, .1, MM.telaioSez);
  for (let i = 0; i < 12; i++) { const y = .35 + i * .21; box(tel, -2.75, y, -.03, 5.5, .1, .05, MM.doghe); if (i < 5) box(tel, -2.75, y + .1, -.02, 5.5, .02, .04, MM.rossoLinee); }
  box(tel, -2.85, .3, -.18, 5.7, .06, .2, M.acciaio);                                                  // appoggio a rulli del pannello
  const trave = anim(tel); box(trave, -.08, .1, -.22, .16, 2.75, .12, MM.telaioSez); const testa = anim(trave);
  ctb(testa, 0, -.2, -.32, .34, .4, .2, M.grigio, { r: .03 }); cilZ(testa, 0, 0, -.42, .16, .04, M.nero); box(testa, -.03, .2, -.42, .06, .25, .04, M.nero);   // motore, lama, maniglia
  g.userData.parti = { tel, trave, testa };
  return g;
}

// ======================================================================================================
// M10 · deposito materiali (V f_050, f_051): pannelli in piedi appoggiati e pile su bancali. Disposizione ILLUSTRATIVA.
export function depositoPannelli() {
  const g = new THREE.Group(); box(g, -1.4, 0, .2, 2.8, .08, .45, M.grigioScuro);
  const tinte = [MM.mdfPieno, MM.melaminico, M.legno, MM.mdfPieno, M.laccatoOpaco, MM.melaminico];
  for (let i = 0; i < 14; i++) { const w = 1.2 + ((i * 53) % 9) * .18, h = 2.0 + ((i * 37) % 7) * .1, x = -1.35 + ((i * 29) % 5) * .12;
    const p = box(g, x, .02, .5 - i * .035, w, h, .018, tinte[i % tinte.length]); p.rotation.x = -.08 - i * .002; }
  return g;
}

// ======================================================================================================
// M13 · levigatrice a nastro largo con 5 calate a pettine e collettore (F 7449). Ingombro 6,7 × 3,7 × 3 (JSON). Marca da verificare.
// Armadio grigio chiaro a due ante su zoccolo grigio scuro, tramoggia di ingresso a ovest, pulpito con monitor a est,
// rulliera di carico bianca a ovest, 5 calate zincate riunite in un collettore orizzontale sopra la macchina.
export function levigatrice() {
  const g = new THREE.Group(), C = MM.levCorpo;
  tbox(g, -2.6, 0, -1.2, 4.8, .8, 2.2, MM.levBase, { r: .02 });
  tbox(g, -1.3, .8, -1.3, 2.6, 2.4, 2.1, C, { r: .04 });
  for (const x of [-1.25, 0.02]) { box(g, x, .9, .8, 1.2, 2.2, .03, C); box(g, x + (x < 0 ? 1.05 : .08), 1.9, .83, .04, .16, .03, M.nero); }
  box(g, 1.02, 2.2, .82, .22, .5, .02, M.biancoCaldo); for (let k = 0; k < 6; k++) cyl(g, 1.13, 2.28 + k * .07, .84, .02, .01, [M.rosso, M.giallo, M.nero][k % 3], { rx: Math.PI / 2 });
  ctb(g, -1.95, .8, -.55, 1.3, .7, 1.0, C); ctb(g, 1.75, .8, -.55, .9, .6, 1.0, C);
  box(g, -2.55, .75, -.8, .05, .1, 1.4, M.acciaio);
  // rulliera di carico bianca su ruote (F 7449)
  box(g, -3.35, .8, -.2, 1.4, .06, 1.2, MM.melaminico); for (const [a, b] of [[-3.3, -.15], [-2.05, -.15], [-3.3, .9], [-2.05, .9]]) { box(g, a, .08, b, .05, .72, .05, M.acciaio); cyl(g, a + .025, 0, b + .025, .05, .08, M.nero); }
  // pulpito a est (F 7449)
  tbox(g, 2.6, 0, -1.2, .7, 1.75, .6, MM.melaminico); box(g, 2.67, 1.2, -.59, .56, .38, .02, M.nero); logo(g, 'schermo', 2.95, 1.39, -.565, .5, .3);
  box(g, 2.3, .88, -.2, 1.05, .04, 1.2, MM.melaminico); for (const [a, b] of [[2.35, -.15], [3.25, -.15], [2.35, .9], [3.25, .9]]) box(g, a, 0, b, .05, .88, .05, M.acciaio);   // piano di uscita (ILLUSTRATIVO)
  // calate a pettine e collettore (F 7449)
  for (let i = 0; i < 5; i++) { const x = -1.0 + i * .5; tubo(g, [[x, 3.2, -.3], [x, 4.3, -.3], [x + .05, 4.8, -.5], [x + .1, 4.95, -.75]], .11, M.zincato); }
  cilX(g, -1.6, 4.95, -.75, .3, 3.4, M.zincato); calata(g, [[1.8, 4.95, -.75], [2.3, 5.3, -.75], [2.4, H_PROD - .2, -.75]], .3, M.zincato, 5.4);
  calata(g, [[-1.6, 4.95, -.75], [-2.1, 5.4, -.75], [-2.2, H_PROD - .2, -.75]], .25, M.zincato, 5.4);
  g.userData.parti = {};
  return g;
}

// ======================================================================================================
// M14 · linea di verniciatura: Cefla Finishing Spraybotic (F 7450–7452; V f_033–f_038) + tunnel a pannelli grigi (V f_037).
// Posizione e disposizione: vedi REPORT-MACCHINE.md § dubbi. Da ovest: rulliera di uscita (verso i carrelli di essiccazione),
// Spraybotic lungo 9 m (testate arrotondate, tre finestre, zoccolo con pannelli neri), raccordo, tunnel grigio con maniglie
// (forno/appassimento: funzione da confermare) con testata arrotondata, carico a est con pulpito Cefla (F 7452).
// Il gruppo ha origine al centro del JSON (59,1; 18,05). Il nastro corre in x a y = NASTRO.
// Come lavora (ricerca/CEFLA-SPRAYBOTIC.md, schede Cefla/Lenmark): robot CARTESIANO a 5 assi. Un ponte scorre lungo il nastro (corsa 3,5 m),
// sul ponte un carrello trasversale (1,3 m), sotto un asse verticale (0,3 m), la rotazione della testa (360°) e l'inclinazione delle
// pistole (+90/−30°) per i bordi; due alimentazioni di vernice. Barriera di lettura a 208 fotodiodi all'ingresso; in modo robot il nastro
// si ferma e la testa lavora il pezzo fermo. Aspetto della testa da F 7451: carrello con 5 spie rosse, tamburo lucido, gruppo pistole
// avvolto con due ugelli. XR = centro della zona di lavoro, XL = barriera di lettura, PASSO = avanzamento del nastro a ogni ciclo
// (ILLUSTRATIVI: posizioni e passo non si vedono nelle foto). TAGLIO: quota da cui riparte il pannello alto (vedi sotto).
// Dal 30/09 sera (Marco): 4 ante 72 × 60 per ciclo in un gruppo 2 × 2 (ingombro 1,54 × 1,30). XR = 54,05 nel mondo: così la sosta di uscita
// (XR − 3·PASSO = 48,8) sta tutta fuori dalla testata ovest, e la barriera (56,68) cade fra due soste.
export const CEFLA = { x0: -8.8, x1: .2, zc: -.5, NASTRO: .91, XR: -5.05, XL: -2.42, PASSO: 1.75, TAGLIO: 3.05, TESTA: 1.95, PUNTA: .52 };   // Spraybotic da x = -8,8 a 0,2 (locale), asse del nastro a z = -0,5
export function lineaCefla() {
  const g = new THREE.Group(), C = MM.ceflaCorpo, { x0, x1, zc, NASTRO, XR, XL, TAGLIO, TESTA } = CEFLA, zF = zc + 2.25, zB = zc - 2.25;
  // --- Spraybotic: guscio cavo ---
  // TAGLIO DI SEZIONE sul lato sud (ILLUSTRATIVO, come i muri in sezione di main.js): la macchina vera è chiusa (F 7450), ma dalla camera
  // della tappa (da sud, 30° di elevazione) le finestre alte non lasciano vedere nastro e testa. Restano zoccolo, pannelli neri e bianco e
  // davanzale (fino a 1,40 m); il pannello alto riparte da TAGLIO con il logo (abbassato da 0,47 a 0,36 m); in mezzo l'apertura con i montanti.
  const bx0 = x0 + .55, bx1 = x1 - .55, L = bx1 - bx0;
  box(g, bx0, 0, zB, L, 3.5, .15, C); box(g, bx0, 3.4, zB, L, .12, 4.5, C);                              // fondo e cielo
  box(g, bx0, 0, zF - .15, L, .1, .15, MM.ceflaScuro);                                                     // zoccolo
  const bays = [[bx0, bx0 + L * .36], [bx0 + L * .36, bx0 + L * .64], [bx0 + L * .64, bx1]];
  bays.forEach(([a, b], i) => { box(g, a, .1, zF - .15, b - a, 1.2, .15, i === 1 ? C : MM.ceflaScuro); box(g, a + .02, .15, zF, .015, 1.1, .01, M.grigio); });
  tbox(g, bx0 - .1, 1.28, zF - .2, L + .2, .12, .5, C, { r: .04 });                                       // davanzale sporgente
  // (sezione: tolti vetri, architrave delle finestre a 2,02 m e pannello alto fino a TAGLIO; restano i montanti delle finestre, allungati)
  for (const a of [bx0, bays[1][0], bays[2][0], bx1]) tbox(g, a - .06, 1.38, zF - .15, .12, TAGLIO - 1.38, .3, C, { r: .03 });   // montanti ai giunti
  box(g, bx0, TAGLIO, zF - .15, L, 3.52 - TAGLIO, .15, C); for (const [a] of bays.slice(1)) box(g, a, TAGLIO, zF + .001, .012, 3.52 - TAGLIO, .004, M.grigio, { cast: false });
  box(g, bx0, TAGLIO - .02, zF - .15, L, .02, .15, MM.ceflaScuro, { cast: false });                          // bordo del taglio
  logo(g, 'cefla', bays[1][0] - .2, TAGLIO + .235, zF + .005, 1.45, .36);
  // testate arrotondate (cilindri schiacciati) con feritoia del nastro
  for (const [x, s] of [[bx0, -1], [bx1, 1]]) { const t = cyl(g, x, 0, zc, 2.25, 3.52, C); t.scale.x = .55; box(g, x + s * .45 - .3, NASTRO - .12, zc - .7, .6, .3, 1.4, MM.ceflaScuro); }
  // interno: pavimento sporco di vernice, nastro beige incrostato (F 7451) con le sponde, neon sul cielo
  // (niente più pannello scuro sul fondo: dalle finestre si vede la cabina chiara con nastro e testa, come in F 7450–7451; analisi Fable P2 n. 16)
  box(g, bx0, 0, zB + .15, L, .1, 4.2, MM.ceflaInterno, { cast: false });
  // nastro in due tratti con una fessura di 6 cm alla barriera di lettura (la luce passa fra i due nastri); sponde continue
  box(g, x0 - .4, NASTRO - .06, zc - .7, XL - .03 - (x0 - .4), .06, 1.4, MM.nastroCefla); box(g, XL + .03, NASTRO - .06, zc - .7, x1 + 1.0 - (XL + .03), .06, 1.4, MM.nastroCefla);
  for (const s of [-1, 1]) box(g, x0 - .4, NASTRO - .25, zc + s * .72 - .03, (x1 - x0) + 1.4, .22, .06, M.acciaio);
  box(g, bx0 + .3, 3.3, zc - .3, L - .6, .04, .12, M.biancoCaldo, { cast: false });
  // barriera di lettura (208 fotodiodi, scheda Spraybotic/MD): barra con la luce sopra la fessura, ricevitore sotto, cortina di luce fra le due.
  // Posizione ILLUSTRATIVA (subito dentro la testata est, prima della zona di lavoro).
  const luceRossa = new THREE.MeshStandardMaterial({ color: 0xff5a4a, emissive: 0xff3a2a, emissiveIntensity: 2.2, roughness: .5 });
  for (const s of [-1, 1]) box(g, XL - .03, NASTRO - .25, zc + s * .84 - .03, .06, 1.38 - NASTRO + .25, .06, M.grigioScuro);
  box(g, XL - .07, 1.3, zc - .88, .14, .1, 1.76, MM.ceflaScuro); box(g, XL - .01, 1.294, zc - .66, .02, .006, 1.32, luceRossa, { cast: false });
  box(g, XL - .05, NASTRO - .2, zc - .7, .1, .12, 1.4, MM.ceflaScuro);
  box(g, XL - .002, NASTRO - .08, zc - .66, .004, 1.294 - NASTRO + .08, 1.32, new THREE.MeshBasicMaterial({ color: 0xff6a50, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide }), { cast: false });
  // riga di luce sull'anta mentre attraversa la barriera (accesa da s9 in reparti.js)
  const lettura = anim(g); for (const s of [-1, 1]) box(lettura, XL - .004, NASTRO + ANTA.T + .001, zc + s * .35 - .3, .008, .003, .6, luceRossa, { cast: false });   // due file di ante
  // --- robot cartesiano: due guide lungo il nastro, ponte (asse x), carrello (asse z), asse verticale, rotazione, inclinazione ---
  for (const s of [-1, 1]) box(g, bx0 + 1.3, 2.74, zc + s * 1.95 - .04, L - 2.6, .08, .08, M.acciaio);
  const ponte = anim(g, XR, 0, 0); box(ponte, -.12, 2.86, zc - 1.95, .24, .16, 3.9, M.acciaio);
  for (const s of [-1, 1]) box(ponte, -.25, 2.82, zc + s * 1.95 - .07, .5, .2, .14, M.grigioScuro);
  const carrello = anim(ponte, 0, 0, zc); ctb(carrello, 0, 2.3, 0, .42, .56, .42, M.acciaio, { r: .03 });
  const spia = M.rosso;   // tinta unita nell'atlante: si fonde con il carrello (una chiamata di disegno in meno)
  for (let k = 0; k < 5; k++) cyl(carrello, .08, 2.4 + k * .08, .21, .016, .012, spia, { rx: Math.PI / 2 });   // 5 spie rosse (F 7451)
  const colonna = anim(carrello); ctb(colonna, 0, 2.2, 0, .12, .6, .12, M.cromato);                              // asse verticale (scorre nel carrello)
  cyl(colonna, 0, TESTA, 0, .19, .25, M.cromato);                                                                  // tamburo lucido (F 7451)
  const rotore = anim(colonna, 0, TESTA, 0); cyl(rotore, 0, -.05, 0, .13, .05, M.acciaio); cyl(rotore, 0, -.25, 0, .045, .2, MM.nastroPistole);
  // gruppo pistole incernierato (inclinazione attorno a x del rotore): due ugelli affiancati in x, punta a PUNTA sotto il tamburo
  const pistola = anim(rotore, 0, -.25, 0); cilX(pistola, -.07, 0, 0, .035, .14, M.acciaio);
  ctb(pistola, 0, -.22, 0, .17, .2, .12, MM.nastroPistole, { r: .04 }); for (const s of [-1, 1]) cyl(pistola, s * .05, -.27, 0, .016, .05, M.acciaio);
  // ventaglio piatto dello spruzzo: cono aperto con la punta sull'ugello, largo in x (due ugelli), sottile in z; lunghezza e visibilità da s9
  const ventaglio = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20, 1, true).translate(0, -.5, 0), new THREE.MeshBasicMaterial({ color: 0xe4e7ea, transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide }));
  ventaglio.position.y = -.27; ventaglio.scale.set(.17, .3, .045); ventaglio.castShadow = false; ventaglio.userData.statico = false; ventaglio.visible = false; pistola.add(ventaglio);
  // --- raccordo e tunnel a pannelli grigi con maniglie (V f_037), testata est arrotondata (F 7452) ---
  const tx0 = x1 + 1.0, tx1 = 8.7;
  box(g, tx0, 0, zB + .3, tx1 - tx0, 3.2, 3.9, MM.forno);
  for (let x = tx0; x < tx1 - .5; x += 1.1) { box(g, x, .15, zF - .3 - .001, .012, 2.9, .004, M.grigioScuro, { cast: false }); for (const y of [1.0, 1.9]) box(g, x + .5, y, zF - .3, .05, .14, .03, MM.maniglia); }
  box(g, tx0, 3.2, zB + .3, tx1 - tx0, .05, 3.9, M.grigio);
  { const t = cyl(g, tx1, 0, zc, 1.95, 3.2, C); t.scale.x = .35; }
  // carico a est: nastro di carico e pulpito Cefla con monitor, tastiera e semaforo (F 7452; V f_036). Nastro lungo 2,5 m, fino a 15 cm dal
  // muro est (70,75), a nord della porta (z 18,4–19,6): l'operatore ci posa le ante una alla volta e il nastro le porta nel tunnel
  box(g, tx1 + .3, NASTRO - .06, zc - .7, 2.5, .06, 1.4, MM.nastroScuro); for (const a of [tx1 + .35, tx1 + 1.5, tx1 + 2.7]) for (const s of [-1, 1]) box(g, a, 0, zc + s * .65, .06, NASTRO - .06, .06, M.acciaio);
  const pu = gruppo(g, 7.7, 0, 2.4); tbox(pu, -.4, 0, -.3, .8, 2.0, .6, MM.forno, { r: .02 }); logo(pu, 'cefla', 0, 1.78, .305, .5, .13);
  box(pu, -.28, 1.15, .3, .56, .44, .02, M.acciaio); logo(pu, 'schermo', 0, 1.37, .325, .46, .34); box(pu, -.3, 1.0, .3, .6, .03, .22, M.acciaio);
  cyl(pu, .25, 2.0, -.1, .03, .1, M.nero);
  const lampade = [0xd3232f, 0xe8a21a, 0x3fae49].map((c, i) => cyl(pu, .25, 2.1 + i * .11, -.1, .045, .1, new THREE.MeshStandardMaterial({ color: c, roughness: .4, emissive: 0, userData: {} })));
  // rulliera di uscita a ovest verso i carrelli di essiccazione (rulliera folle come in V f_033); lunga 1,55 m: regge il gruppo di 4 ante
  box(g, x0 - 1.95, NASTRO - .1, zc - .7, 1.55, .04, 1.4, M.acciaio); for (let x = x0 - 1.89; x < x0 - .4; x += .12) cilZ(g, x, NASTRO - .025, zc - .68, .025, 1.36, M.zincato);
  for (const a of [x0 - 1.9, x0 - .5]) for (const s of [-1, 1]) box(g, a, 0, zc + s * .65, .06, NASTRO - .1, .06, M.acciaio);
  // condotte zincate sopra la linea (F 7450: grandi condotte e calate spiralate)
  for (const x of [x0 + 1.2, x1 - 1.4]) { calata(g, [[x, 3.52, zc - 1.5], [x, H_PROD - .4, zc - 1.5]], .32, M.zincato); }
  calata(g, [[tx0 + 2, 3.2, zc - 1], [tx0 + 2, H_PROD - .4, zc - 1]], .25, M.zincato);
  ponte.traverse(o => { if (o.isMesh) o.castShadow = false; });   // la testa lavora sotto il cielo della cabina: niente ombre (5 chiamate in meno)
  g.userData.parti = { ponte, carrello, colonna, rotore, pistola, ventaglio, lettura, lampade };
  return g;
}

// ======================================================================================================
// M15 · mixer vernici (V f_038; F 7450 a destra): armadio grigio con due cappe flessibili nere, quadro con pulsanti e semaforo,
// latte di vernice rosse e bianche a terra. Ingombro 2 × 1,4 × 2,4 (JSON).
export function mixer() {
  const g = new THREE.Group();
  tbox(g, -1.0, 0, -.7, 1.25, 2.0, 1.2, MM.forno, { r: .02 }); box(g, -.95, .1, .5, 1.15, 1.2, .02, M.grigioScuro); box(g, -.9, 1.35, .5, 1.05, .55, .01, M.biancoCaldo);
  ctb(g, -.38, 2.0, -.1, .8, .45, .8, MM.forno); cyl(g, -.38, 2.45, -.1, .25, .15, M.zincato);
  tbox(g, .3, 0, -.6, .7, 2.1, .5, MM.quadro, { r: .02 }); for (let k = 0; k < 8; k++) cyl(g, .45 + (k % 3) * .2, 1.2 + Math.floor(k / 3) * .15, -.09, .025, .02, [M.rosso, M.nero, M.giallo][k % 3], { rx: Math.PI / 2 });
  for (const [i, c] of [0xd3232f, 0xe8a21a, 0x3fae49].entries()) cyl(g, .85, 2.1 + i * .1, -.35, .045, .09, [M.rosso, M.giallo, MM.verdeBiesse][i]);
  for (const s of [-1, 1]) tubo(g, [[-.38 + s * .15, 2.6, -.1], [-.38 + s * .45, 3.4, -.2], [-.38 + s * .25, 4.4, -.3], [-.38, 5, -.3]], .1, MM.gomma);
  calata(g, [[-.38, 5, -.3], [-.38, H_PROD - .3, -.3]], .22, M.zincato);
  for (const [x, z, r, h, m] of [[-.7, .9, .17, .42, M.rosso], [-.3, .95, .17, .42, M.rosso], [.1, .95, .17, .42, M.bianco], [-.5, 1.3, .15, .38, M.rosso], [.5, .85, .17, .42, M.rosso]]) { cyl(g, x, 0, z, r, h, m); cyl(g, x, h, z, r * .98, .01, M.acciaio); }
  return g;
}

// ======================================================================================================
// M16 · carrello di essiccazione (V f_018–f_022): telaio verde su ruote, montanti al centro, bracci blu a sbalzo con punte gialle,
// pieno di ante. 1,2 × 1,6 × 1,9 (JSON). Qui i bracci sporgono verso +x (lato di carico). livelli: quote dei bracci.
export const ESSIC = { livelli: Array.from({ length: 12 }, (_, i) => .35 + i * .14) };
export function carrelloEssiccazione({ pieni = 12, salta = -1, mat } = {}) {   // salta: un livello o una lista di livelli lasciati vuoti
  const g = new THREE.Group(), T = MM.telaioCarrello, vuoti = [].concat(salta);
  box(g, -.6, .12, -.8, 1.2, .06, 1.6, T); for (const [a, b] of [[-.5, -.7], [.5, -.7], [-.5, .7], [.5, .7]]) cyl(g, a, 0, b, .06, .12, M.nero);
  for (const z of [-.75, .7]) box(g, -.58, .18, z, .06, 1.72, .06, T); box(g, -.58, 1.88, -.75, .06, .06, 1.51, T);
  ESSIC.livelli.forEach((y, i) => { for (const z of [-.55, .5]) { box(g, -.55, y, z, 1.08, .025, .05, MM.bracciBlu); box(g, .53, y + .004, z + .005, .04, .02, .04, MM.punteGialle); }
    if (i < pieni && !vuoti.includes(i)) box(g, -.52, y + .025, -.62, 1.09, ANTA.T, 1.23, mat || (i % 3 ? MM.laccatoPieno : MM.melaminico)); });
  return g;
}

// ======================================================================================================
// M19 · strettoio per scocche Erregi + nastro della linea di montaggio (F 7453). Linea 17,1 × 2 × 2,6 (JSON), flusso est → ovest.
// Portale grigio con quadro elettrico aperto in alto, targa ERREGI verde, pressori gialli, rete grigia sul lato nord; nastro scuro
// (DIBATTITO § 3: nella foto è un nastro, non rulli). xp = centro del portale in coordinate locali.
export function erregi(xp = 4.05) {
  const g = new THREE.Group(), P = MM.erregiPortale, hw = 8.55, Y = .85;
  box(g, -hw, .55, -.5, 2 * hw, .27, 1.0, M.grigio); box(g, -hw, Y - .03, -.45, 2 * hw, .03, .9, MM.nastroScuro);
  for (let x = -hw + .3; x < hw; x += 2) for (const s of [-1, 1]) box(g, x, 0, s * .42 - .03, .06, .55, .06, M.acciaio);
  // portale
  for (const s of [-1, 1]) tbox(g, xp - .6, 0, s < 0 ? -1.1 : .55, 1.2, 2.5, .55, P, { r: .03 });
  tbox(g, xp - .6, 1.95, -1.1, 1.2, .55, 2.2, P, { r: .03 }); logo(g, 'erregi', xp + .605, 2.22, 0, .55, .13, Math.PI / 2);
  tbox(g, xp - .7, 2.5, -1.05, 1.0, 1.0, 2.1, MM.quadro, { r: .02 }); logo(g, 'quadro', xp + .305, 3.0, 0, 1.9, .9, Math.PI / 2);
  const anta = box(g, xp + .3, 2.52, .98, 1.0, .96, .03, MM.quadro); anta.rotation.y = -1.9; anta.position.set(xp + .34, 2.52, 1.02);
  box(g, xp - 1.6, .2, -1.2, 3.2, 2.3, .03, M.grigio); for (let y = .3; y < 2.45; y += .12) box(g, xp - 1.6, y, -1.22, 3.2, .02, .01, M.grigioScuro);
  const pressT = anim(g, xp, 0, 0); box(pressT, -.4, 0, -.45, .8, .08, .9, MM.gialloPressori);
  const pressN = anim(g, xp, 0, -.55), pressS = anim(g, xp, 0, .55); box(pressN, -.35, 1.0, -.05, .7, .5, .06, MM.gialloPressori); box(pressS, -.35, 1.0, -.01, .7, .5, .06, MM.gialloPressori);
  g.userData.parti = { pressT, pressN, pressS, Y };
  return g;
}
// scocca (mobile base aperto): 0,6 × 0,72 × 0,56, bianca, con la schiena verso nord
export function scocca(p, mat) { const g = gruppo(p), m = mat || MM.melaminico, T = .018;
  box(g, -.3, 0, -.28, .6, T, .56, m); box(g, -.3, .72 - T, -.28, .6, T, .56, m); box(g, -.3, 0, -.28, T, .72, .56, m); box(g, .3 - T, 0, -.28, T, .72, .56, m); box(g, -.3, 0, -.28, .6, .72, .006, m); return g; }

// ======================================================================================================
// M21 · levigabordi De Stefani (V f_022): banco lungo grigio chiaro, fila di rulli blu in alto, scritta De Stefani. 4,5 × 1,3 × 1,4.
export function deStefani() {
  const g = new THREE.Group(), C = MM.deStefani;
  tbox(g, -2.25, 0, -.55, 4.5, .85, .75, C, { r: .03 }); box(g, -2.25, .85, -.3, 4.5, .12, .35, C); logo(g, 'destefani', 1.5, .5, .205, .7, .17);
  for (let x = -2.15; x < 2.2; x += .14) cilZ(g, x, 1.0, -.18, .045, .12, MM.rulliBlu);
  box(g, -2.4, .78, .35, 4.8, .06, .12, M.acciaio); for (const x of [-2.2, 0, 2.2]) box(g, x, 0, .38, .06, .78, .06, M.acciaio);
  ctb(g, -1.2, 1.05, -.45, .5, .35, .3, C); calata(g, [[-1.2, 1.4, -.45], [-1.1, 2.2, -.6], [-1.0, H_PROD - .3, -.6]], .09, MM.tuboGiallo);
  return g;
}

// ======================================================================================================
// M22 · bordatrice Brandt (serie KDF) (F 7446; V f_024, f_025, f_055). 6,1 × 1,3 × 1,6 (JSON). Flusso ovest → est.
// Basamento bianco, catena di trascinamento, carter superiore bianco con onda azzurra e logo sul fronte (lato sud),
// rotaia d'appoggio su gambe bianche davanti, due calate zincate e tubo giallo all'ingresso (ovest).
export const BRANDT = { y: .9, zPan: .12 };   // piano della catena e asse del pannello
export function brandt() {
  const g = new THREE.Group(), B = MM.brandt;
  tbox(g, -3.05, 0, -.65, 6.1, .86, .72, B, { r: .03 }); box(g, -3.05, .84, .07, 6.1, .06, .08, M.nero);
  tbox(g, -2.95, .9, -.62, 5.6, .72, .62, B, { r: .05 }); logo(g, 'brandt', -.15, 1.26, .005, 5.5, .69);
  tbox(g, -3.3, .9, -.55, .38, .5, .5, B); tbox(g, 2.65, .9, -.55, .4, .35, .5, B);
  // rotaia d'appoggio davanti su gambe bianche (F 7446)
  box(g, -3.6, .78, .45, 7.0, .07, .14, B); for (const x of [-3.2, -1.2, .8, 2.8]) { box(g, x, 0, .47, .08, .78, .08, B); box(g, x - .05, 0, .38, .18, .03, .25, M.grigio); }
  box(g, -3.05, .72, .15, 6.1, .06, .32, B);
  // aspirazioni (F 7446): due calate zincate e un tubo giallo all'ingresso
  for (const x of [-2.4, -1.9]) calata(g, [[x, 1.62, -.35], [x, 2.6, -.3], [x + .1, H_PROD - .25, -.2]], .13, M.zincato);
  calata(g, [[-.6, 1.62, -.35], [-.5, 2.4, -.5], [-.4, H_PROD - .3, -.6]], .07, MM.tuboGiallo);
  cyl(g, -3.4, 0, .6, .12, .22, M.giallo); box(g, -3.45, .3, .2, .12, .12, .1, M.giallo);   // pulsantiera gialla all'ingresso (F 7446)
  return g;
}

// ======================================================================================================
// M11 · linea VP Impianti (F 7448): due cabinette beige con oblò scuro su rulliera blu (flusso nord → sud), due serbatoi a pressione
// (uno zincato, uno nero) a terra sul lato ovest, calate zincate e tubi spiralati gialli. 2 × 8 × 2,4 (JSON). Funzione da confermare.
export const VP = { y: .82 };
export function lineaVP() {
  const g = new THREE.Group(), Bl = MM.vpBlu;
  for (const s of [-1, 1]) box(g, s * .75 - .04, .62, -4, .08, .16, 8, Bl);
  for (let z = -3.9; z < 4; z += 1.3) for (const s of [-1, 1]) box(g, s * .75 - .04, 0, z, .08, .62, .08, Bl);
  for (let z = -3.9; z < 4; z += .16) cilX(g, -.72, .76, z, .025, 1.44, M.zincato);
  for (const zc of [-1.75, 1.35]) { tbox(g, -1.0, .2, zc - .8, 2.0, 1.9, 1.6, MM.vpCabina, { r: .04 });
    box(g, -1.01, 1.2, zc - .25, .02, .3, .5, M.nero); box(g, -1.015, .55, zc - .25, .02, .35, .5, M.legno);
    calata(g, [[0, 2.1, zc], [0, 2.8, zc - .1], [.1, H_PROD - .3, zc - .2]], .12, M.zincato); calata(g, [[.4, 2.1, zc + .3], [.6, 3, zc + .6], [.5, 4.2, zc + .4], [.3, H_PROD - .6, zc]], .06, MM.tuboGiallo); }
  // serbatoi a pressione (F 7448)
  cyl(g, -1.5, .15, -3.2, .2, .55, M.zincato); for (let k = 0; k < 3; k++) box(g, -1.52 + Math.cos(k * 2.1) * .15, 0, -3.22 + Math.sin(k * 2.1) * .15, .03, .16, .03, M.acciaio);
  cyl(g, -1.45, 0, .1, .17, .5, M.nero);
  return g;
}

// ======================================================================================================
// M12 · EMC «Luc line» (V f_039, f_041): corpo grigio chiaro con logo LUC line, scritta EMC blu, pulpito con schermo e pulsanti,
// piano di carico con tavolo in MDF a ovest. 4,5 × 2,6 × 2,3 (JSON). Flusso ovest → est, operatore a ovest. Funzione da confermare.
export const EMC = { y: .9, xIn: -2.25, xBody: .45 };
export function emc() {
  const g = new THREE.Group(), C = MM.emcCorpo, xb = EMC.xBody;
  tbox(g, xb, 0, -1.3, 1.8, .8, 2.6, M.grigio, { r: .02 }); tbox(g, xb, 1.15, -1.3, 1.8, 1.15, 2.6, C, { r: .04 });
  box(g, xb - .1, .8, -1.3, 1.9, .35, .12, C); box(g, xb - .1, .8, 1.18, 1.9, .35, .12, C); box(g, xb + 1.7, .8, -1.3, .1, .35, 2.6, C);
  box(g, xb - .02, .92, -1.18, .02, .06, 2.36, MM.emcRullo); box(g, xb - .12, .85, -1.2, .14, .04, 2.4, M.acciaio);
  logo(g, 'luc', xb - .006, 1.95, -.75, .7, .17, -Math.PI / 2); logo(g, 'emc', xb - .006, 1.5, .9, .6, .14, -Math.PI / 2);
  box(g, xb - .02, 1.4, -.95, .02, .2, .3, M.nero); logo(g, 'schermo', xb - .031, 1.5, -.8, .25, .16, -Math.PI / 2);
  for (let k = 0; k < 6; k++) cyl(g, xb - .01, 1.26 + Math.floor(k / 3) * .06, -.92 + (k % 3) * .08, .018, .02, [M.verdeScuro, M.rosso, M.giallo][k % 3], { rz: Math.PI / 2 });
  // piano di carico con tavolo in MDF (V f_041)
  box(g, EMC.xIn, EMC.y - .06, -1.1, xb - EMC.xIn, .04, 2.2, MM.mdfPieno); box(g, EMC.xIn, EMC.y - .1, -1.12, xb - EMC.xIn, .05, .06, M.acciaio); cilZ(g, EMC.xIn - .05, EMC.y - .12, -1.12, .05, 2.24, M.grigio);
  for (const z of [-1.05, .98]) box(g, EMC.xIn + .1, 0, z, .07, EMC.y - .1, .07, M.blu);
  calata(g, [[xb + 1.2, 2.3, 0], [xb + 1.3, 3.2, 0], [xb + 1.3, H_PROD - .3, .2]], .16, M.zincato);
  return g;
}

// ======================================================================================================
// M23 · levigatrice a nastro lungo manuale, verde (V f_028–f_030, f_040). 7,5 × 1,8 × 1,8 (JSON). Marca non leggibile; posizione dedotta.
export function levigatriceNastro() {
  const g = new THREE.Group(), V = MM.verdeLevNastro;
  for (const s of [-1, 1]) { tbox(g, s * 3.3 - .3, 0, -.75, .6, 1.25, .55, V, { r: .03 }); cilZ(g, s * 3.3, 1.35, -.8, .22, .5, V); }
  box(g, -3.3, 1.52, -.62, 6.6, .02, .22, M.nero); box(g, -3.3, 1.14, -.62, 6.6, .02, .22, M.nero);
  box(g, -3.4, 1.68, -.85, 6.8, .1, .12, V); ctb(g, 3.3, 1.45, -1.05, .45, .4, .35, M.grigio);
  for (const s of [-1, 1]) box(g, -3.0, 0, s * .45 - .03, 6.0, .08, .06, V);
  box(g, -2.8, .7, -.35, 5.6, .06, 1.05, MM.pianoLegno); for (const x of [-2.6, 2.5]) box(g, x, .08, -.3, .12, .62, .9, V);
  box(g, -3.2, 1.1, -.9, 6.4, .05, .05, M.acciaio); calata(g, [[3.5, 1.9, -.9], [3.4, 3, -1.1], [3.3, H_PROD - .3, -1.1]], .1, MM.tuboGiallo);
  for (let i = 0; i < 4; i++) box(g, 3.9, i * .03, .1, .0 + 2.8 * .5, .03, .75, MM.mdfPieno);   // pile di pannelli accanto
  return g;
}

// ======================================================================================================
// M24, M25 · rastrelliere a sbalzo gialle (V f_028, f_055, f_056): montanti gialli, bracci, pannelli coricati. Verso dei bracci ILLUSTRATIVO (sud).
export function rastrelliera(w = 9.2, d = 1.3, livelli = 4) {
  const g = new THREE.Group(), n = Math.max(2, Math.round(w / 3) + 1);
  for (let i = 0; i < n; i++) { const x = -w / 2 + i * (w - .2) / (n - 1); box(g, x, 0, -d / 2, .2, 3, .25, MM.gialloRastr); box(g, x, 0, -d / 2, .2, .12, d, MM.gialloRastr);
    for (let k = 0; k < livelli; k++) box(g, x + .04, .5 + k * .72, -d / 2 + .25, .12, .08, d - .3, MM.bracciRastr); }
  const tinte = [MM.mdfPieno, MM.melaminico, M.legno, M.laccatoOpaco];
  for (let k = 0; k < livelli; k++) for (let b = 0; b < n - 1; b++) { const x0 = -w / 2 + .3 + b * (w - .2) / (n - 1), len = (w - .2) / (n - 1) - .15, nn = 3 + ((b * 5 + k * 3) % 6);
    pila(g, x0 - .15, .58 + k * .72, -d / 2 + .3, len + .2, d - .45, nn, .025, [tinte[(b + k) % 4], tinte[(b + k + 1) % 4]]); }
  return g;
}

// ======================================================================================================
// M26 · macchine tradizionali (V f_052–f_054): toupie turchese, macchine verdi a colonna. Forme generiche (ILLUSTRATIVO nei dettagli).
export function tradizionali() {
  const g = new THREE.Group();
  // toupie turchese (V f_054): basamento turchese con fascia chiara, piano grigio, due guide della battuta, cuffia turchese sull'albero,
  // volantino sul fianco e motore grigio a colonna. Proporzioni dalla foto, misure ILLUSTRATIVE
  tbox(g, -1.3, 0, -.2, 1.0, .85, .9, MM.toupie); box(g, -1.31, .12, .69, 1.02, .3, .02, M.biancoCaldo); box(g, -1.4, .85, -.3, 1.2, .05, 1.1, M.grigio);
  for (const s of [-1, 1]) box(g, -.8 + s * .12 - (s < 0 ? .38 : 0), .9, -.05, .38, .12, .06, M.grigioScuro);
  ctb(g, -.8, 1.02, .08, .34, .22, .3, MM.toupie, { r: .04 }); cyl(g, -.8, .9, .08, .05, .12, M.cromato); cyl(g, -.8, 1.24, .08, .06, .5, M.zincato);
  cyl(g, -1.32, .45, .25, .14, .04, M.nero, { rz: Math.PI / 2 }); ctb(g, -.45, .9, -.2, .22, .3, .22, M.grigio, { r: .03 });
  tbox(g, .3, 0, -1.0, .6, .9, .6, MM.verdeTrad); cyl(g, .6, .9, -.7, .06, .7, MM.verdeTrad); ctb(g, .6, 1.4, -.8, .3, .25, .4, MM.verdeTrad);
  tbox(g, .2, 0, .3, 1.2, .8, .7, MM.verdeTrad); box(g, .1, .8, .25, 1.4, .05, .8, M.grigio);
  return g;
}

// ======================================================================================================
// M27 · avvolgitore Robopac (F 7457, 7458): piattaforma tonda rosso scuro con asola, base blu a filo pavimento, colonna blu con ROBOPAC,
// carrello del film e quadro. 2,4 × 2,4 × 2,9 (JSON). La colonna è contro la parete (lato sud).
export function robopac() {
  const g = new THREE.Group();
  box(g, -1.0, 0, -1.25, 2.0, .04, 2.4, MM.robopac); box(g, -.4, 0, -1.3, .8, .03, .5, MM.robopac);
  cyl(g, 0, .04, -.2, 1.05, .04, MM.piattaforma); box(g, -.12, .075, -1.26, .24, .02, .7, MM.robopac);
  tbox(g, -.85, 0, .75, .3, 2.9, .3, MM.robopac, { r: .03 }); logo(g, 'robopac', -.7, 1.6, .745, .14, 1.0, Math.PI);
  // il carrello del film e il rotolo dal 02/10 salgono e scendono mentre il bancale gira: arredi.js robopacAnimato
  box(g, -1.05, 1.0, .7, .12, .45, .3, M.antracite); box(g, -1.0, 1.1, .69, .06, .1, .02, M.rosso);
  return g;
}

// ======================================================================================================
// M29, M30 · scaffalature porta-pallet (V f_006–f_014): montanti blu, correnti arancio, bancali con cartoni. Riempimento ILLUSTRATIVO.
export function scaffalePallet(len, prof = 1.1, h = 4.5, seme = 1) {
  const g = new THREE.Group(), nb = Math.max(1, Math.round(len / 2.7)), passo = len / nb;
  for (let i = 0; i <= nb; i++) for (const z of [0, prof - .08]) box(g, i * passo - .04, 0, z, .08, h, .08, MM.scaffBlu);
  for (const y of [1.5, 3.0]) for (const z of [0, prof - .08]) box(g, 0, y, z, len, .1, .08, MM.scaffArancio);
  for (let i = 0; i < nb; i++) for (const [k, y] of [[0, 0], [1, 1.6], [2, 3.1]].map(([k, y]) => [k, y])) { const r = (i * 7 + k * 3 + seme * 5) % 9; if (r > 6) continue;
    for (const j of [0, 1]) { const x = i * passo + .15 + j * (passo - .15) / 2; if ((r + j) % 5 === 4) continue; const top = bancale(g, x, .12, (passo - .45) / 2, prof - .25, y);
      const hh = .4 + ((r + j) % 3) * .25; box(g, x + .03, top, .16, (passo - .45) / 2 - .06, Math.min(hh, 1.25), prof - .32, (r + j) % 4 === 1 ? M.bianco : MM.cartone); } }
  return g;
}

// ======================================================================================================
// M31 · mobili cucina scuri in deposito (F 7460; V f_004, f_005): moduli antracite su ruote, colonne, scaffale metallico sul muro nord,
// carrello attrezzi arancio, calcio balilla (F 7460). Disposizione ILLUSTRATIVA dentro il rettangolo del JSON.
export function mobiliScuri() {
  const g = new THREE.Group(), D = MM.mobiliScuri;
  for (let i = 0; i < 4; i++) { const x = -4.8 + i * 2.5; for (const z of [-2.95, -2.35]) box(g, x, 0, z, .06, 2.2, .06, MM.scaffGrigio);
    for (const y of [.4, 1.2, 1.95]) { box(g, x, y, -3.0, 2.5, .04, .7, MM.scaffGrigio); box(g, x + .2, y + .04, -2.9, .9, .35, .5, (i + y * 2) % 2 > 1 ? MM.cartone : M.bianco); } }
  for (const [x, z, w, h, d] of [[-2.5, -.2, 1.2, .9, .6], [-1.3, -.2, .9, .9, .6], [.2, -.1, 1.0, .9, .6], [1.6, .4, .8, .9, .6], [-.9, -1.4, .55, 2.2, .6], [2.9, -1.3, .6, 2.0, .6]]) {
    tbox(g, x, .08, z, w, h, d, D, { r: .015 }); for (const [a, b] of [[.05, .05], [w - .05, .05], [.05, d - .05], [w - .05, d - .05]]) cyl(g, x + a, 0, z + b, .035, .08, M.nero); }
  tbox(g, 3.6, 0, -.3, .9, .95, .5, M.arancio); box(g, 3.55, .95, -.35, 1.9, .04, .7, M.nero); box(g, 4.5, 0, -.3, .9, .9, .55, M.nero);
  box(g, -4.4, .75, .3, 1.2, .18, .7, M.nero); for (const [a, b] of [[-4.35, .35], [-3.3, .35], [-4.35, .9], [-3.3, .9]]) box(g, a, 0, b, .08, .75, .08, M.nero);   // calcio balilla (F 7460)
  return g;
}

// ======================================================================================================
// stanza semplice a pareti (M17, M18, M32, M33): pareti spesse 0,12 sui lati indicati; aperture [lato, da, a] (misure lungo il lato)
export function stanza(w, d, h, mat, lati = 'NSEO', aperture = []) {
  const g = new THREE.Group(), T = .12, x0 = -w / 2, z0 = -d / 2;
  const muro = (lato, a, b, y0 = 0) => { const hh = h - y0; if (lato === 'N') box(g, x0 + a, y0, z0, b - a, hh, T, mat); if (lato === 'S') box(g, x0 + a, y0, z0 + d - T, b - a, hh, T, mat);
    if (lato === 'O') box(g, x0, y0, z0 + a, T, hh, b - a, mat); if (lato === 'E') box(g, x0 + w - T, y0, z0 + a, T, hh, b - a, mat); };
  // aperture: [lato, da, a, quota dell'architrave (facoltativa)]
  for (const lato of lati) { const L = lato === 'N' || lato === 'S' ? w : d, ap = aperture.filter(q => q[0] === lato).sort((a, b) => a[1] - b[1]); let c = 0;
    for (const [, a, b, arch] of ap) { if (a > c) muro(lato, c, a); if (arch) muro(lato, a, b, arch); c = b; }
    if (c < L) muro(lato, c, L); }
  return g;
}

// ======================================================================================================
// muletto elettrico bianco (V f_042, f_043): telaio bianco, sedile nero, tettuccio a tubi curvi bianchi, montante e forche scure.
// Forche verso +z locale. Parti: forche (anim, quota y), carico (sul gruppo forche).
export function muletto() {
  const g = new THREE.Group();
  tbox(g, -.55, .12, -1.35, 1.1, .75, 1.55, M.bianco, { r: .1 }); box(g, -.5, .1, -1.5, 1.0, .5, .2, M.grigioScuro);
  box(g, -.25, .87, -1.0, .5, .1, .5, M.nero); box(g, -.25, .95, -1.05, .5, .55, .1, M.nero);
  for (const s of [-1, 1]) { tubo(g, [[s * .5, .85, -1.3], [s * .5, 2.0, -1.25], [s * .48, 2.15, -.9], [s * .45, 2.15, -.1], [s * .45, 1.4, .15]], .035, M.bianco, { tension: .3 }); }
  for (let k = 0; k < 4; k++) box(g, -.45, 2.13, -1.05 + k * .25, .9, .03, .04, M.bianco);
  cyl(g, 0, 1.0, -.35, .03, .35, M.nero, { rx: -.5 }); cyl(g, 0, 1.28, -.2, .14, .03, M.nero, { rx: -.5 });
  for (const [x, z, r] of [[-.5, .05, .23], [.5, .05, .23], [-.45, -1.1, .2], [.45, -1.1, .2]]) cilX(g, x - .08, r, z, r, .16, M.nero);
  for (const s of [-1, 1]) box(g, s * .35 - .05, 0, .22, .1, 2.3, .1, M.antracite);
  const forche = anim(g); box(forche, -.4, .15, .3, .8, .5, .05, M.antracite); for (const s of [-1, 1]) box(forche, s * .3 - .06, 0, .33, .12, .05, 1.1, M.antracite);
  const carico = gruppo(forche); g.userData.parti = { forche, carico };
  return g;
}
