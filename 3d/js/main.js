// «Come nasce una cucina RiFRA» · versione 3D (three.js r186). Metodo: ricerca/METODI-THREEJS.md, ricerca/REVISIONE-3D-UX.md,
// revisioni e dibattito: ricerca/DIBATTITO-*.md.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { creaMateriali, patchOmbre, ambienteFabbrica, GradeShader, patchTerra, bakeAOTerra } from './materiali.js';
import { costruisciEdificio, ST, NAMES, LOTTO } from './edificio.js';
import { costruisciReparti } from './reparti.js';
import { costruisciArredi } from './arredi.js';
import { fondiStatici, fondiAnimati, campiona, istanziaPersone, etichetta, creaAtlante, ombreDisco } from './prim.js';
import { LOGO } from './logo.js';
import { TXT as TXT_IT, INTRO as INTRO_IT, OUTRO as OUTRO_IT, OPZ as OPZ_IT, TXT_EN, INTRO_EN, OUTRO_EN, OPZ_EN, CUES as CUES_R, END as END_R } from './testi.js';
import { LINGUA, t, allaLingua, cambiaLingua, testiFissi } from './lingua.js';
// testi delle schede nella lingua corrente (lingua.js; Marco 02/10: due file, uno parte in italiano e uno in inglese)
const EN_ = () => LINGUA.cur === 'en', TXT = () => EN_() ? TXT_EN : TXT_IT, INTRO = () => EN_() ? INTRO_EN : INTRO_IT, OUTRO = () => EN_() ? OUTRO_EN : OUTRO_IT, OPZ = () => EN_() ? OPZ_EN : OPZ_IT;
const nomePassaggio = i => `${t('Passaggio')} ${i + 1}: ${t(NAMES[i])}`;

const SENZA = new Set(((location.search.match(/[?&]senza=([\w,]+)/) || [])[1] || '').split(','));   // prove: ?senza=pcf,terra,grade,dischi,prato,grana,persone
const Q = location.search, KIOSK = /[?&]kiosk\b/.test(Q), VIDEO = /[?&]video\b/.test(Q);
// video riproducibile: generatore casuale fisso (il rumore dell'occlusione ambientale usa Math.random)
if (VIDEO) { let sd = 12345; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; }
// lo stile di fiera e video va attivato prima di misurare l'area libera dello schermo
if (KIOSK) document.documentElement.classList.add('kiosk'); if (VIDEO) document.documentElement.classList.add('video');
const RM = !KIOSK && matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const COARSE = matchMedia('(pointer: coarse)').matches, PHONE = COARSE && Math.min(innerWidth, innerHeight) < 600;
// livelli di qualità (budget in METODI-THREEJS.md § 3 e ricerca/REPORT-PRESTAZIONI-ESTERNO.md). Si parte da «media» (telefono «bassa»);
// il livello scende se i fotogrammi sono lenti e sale se c'è margine per qualche secondo (isteresi: un livello che ha fallito non si ritenta).
// ombraOgni: ogni quanti fotogrammi si ridisegna la mappa delle ombre per i pezzi che si muovono (sempre quando si sposta il riquadro del sole)
const LIV = { alta: { dpr: 1.5, ombra: 2048, ao: true, ombraOgni: 2 }, media: { dpr: 1.5, ombra: 2048, ao: false, ombraOgni: 4 }, bassa: { dpr: .8, ombra: 1024, ao: false, ombraOgni: 6 } };   // bassa: 80 % dei pixel (GPU integrate lente)
let liv = VIDEO ? 'alta' : PHONE ? 'bassa' : 'media', scelta = false;
if (KIOSK) LIV.media.dpr = 1; if (VIDEO) LIV.alta.ombra = 4096;
try { const s = localStorage.getItem('rf3d-qualita'); if (s && LIV[s] && !VIDEO && !KIOSK) { liv = s; scelta = true; } } catch (e) {}

// ---------- renderer ----------
const cv = $('scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: VIDEO }); }
catch (e) { $('nowebgl').hidden = false; $('loading').classList.add('done'); throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;   // r186: PCFSoftShadowMap rimosso, si usa PCF + radius
const scene = new THREE.Scene();
const SKY = new THREE.Color(0xdfe5ea); scene.fog = new THREE.Fog(SKY, 420, 1100);
// cielo: sfumatura verticale leggera (azzurro pallido in alto, foschia chiara all'orizzonte = colore della nebbia), una sola texture 2×256
scene.background = (() => { const c = document.createElement('canvas'); c.width = 2; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#b7c8d8'); gr.addColorStop(.55, '#d6dee6'); gr.addColorStop(1, '#dfe5ea'); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
if (!SENZA.has('pcf')) patchOmbre();   // filtro PCF 3 × 3 stabile (prima che si compili qualunque materiale)
const pmrem = new THREE.PMREMGenerator(renderer);
// ambiente «fabbrica» (cupola, terreno caldo, lucernari e finestre luminose) e rimbalzo caldo dal suolo con l'emisfero
scene.environment = pmrem.fromScene(ambienteFabbrica(), 0, .1, 100, { size: 256 }).texture; scene.environmentIntensity = .5;
const hemi = new THREE.HemisphereLight(0xb4d0ff, 0xdcc3a0, .45); scene.add(hemi);
const sole = new THREE.DirectionalLight(0xfff0dc, 2.9); sole.castShadow = true;
sole.shadow.autoUpdate = false; sole.shadow.bias = -.0004; sole.shadow.normalBias = .03; scene.add(sole, sole.target);
const SOLE_DIR = new THREE.Vector3(-.55, .9, .62).normalize();
// riquadro dell'ombra: raggio a gradini del 12 % (con margine) e centro agganciato a una griglia di r/8 (multiplo del texel):
// la mappa delle ombre si ridisegna solo quando il riquadro cambia davvero, non a ogni piccolo movimento della camera
let _ombra = '';
function ombraSu(cx, cz, r) { r = 18 * Math.pow(1.12, Math.round(Math.log(r * 1.15 / 18) / Math.log(1.12))); const st = r / 8; cx = Math.round(cx / st) * st; cz = Math.round(cz / st) * st;
  const k = r.toFixed(3) + '|' + cx.toFixed(2) + '|' + cz.toFixed(2); if (k === _ombra) return false; _ombra = k;
  const c = sole.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 1; c.far = r * 4 + 120; c.updateProjectionMatrix();
  sole.target.position.set(cx, 0, cz); sole.position.set(cx, 0, cz).addScaledVector(SOLE_DIR, r * 2 + 60); return true; }

// ---------- scena ----------
const M = creaMateriali();
if (!SENZA.has('terra')) { patchTerra([M.pavimento, M.pavMagazzino, M.pavUffici, M.autobloccanti, M.asfalto, M.prato]); }   // il piede scuro dei muri (patchFacciata) è stato tolto il 30/09: muri puliti
const ED = costruisciEdificio(scene, M);
const REP = costruisciReparti(scene, M);
const ARR = costruisciArredi(scene, M, { cancello: ED.cancello, cancelloEst: ED.cancelloEst });
if (ARR.etiCamion) REP.etichette[11].splice(1, 0, ARR.etiCamion);   // «Destinazione: tutto il mondo» segue il camion (arredi.js)
// livello alto: i tratti delle calate sopra 4,5 m (userData.alto, macchine.js calata) passano nel gruppo delle condotte a soffitto,
// così si nascondono insieme nelle inquadrature ravvicinate (analisi Fable P1 n. 4: calate davanti alle macchine nelle tappe 05, 07, 09)
{ scene.updateMatrixWorld(true); const su = []; scene.traverse(o => { if (o.isMesh && o.userData.alto) su.push(o); }); su.forEach(o => ARR.alto.attach(o)); }
insegne(ED.insegne);
// geometrie statiche fuse: i materiali a tinta unita in un solo materiale «atlante», gli altri per materiale (budget mini-PC ≈ 250 chiamate)
// edificio, esterno e arredi a terra in un solo gruppo (tanto non vengono mai tagliati dalla vista); i reparti restano celle separate
for (const g of [ED.esterno, ARR.root]) { g.updateMatrixWorld(true); [...g.children].forEach(o => ED.root.attach(o)); }
// l'animazione viene campionata una volta: pezzi fermi dentro i gruppi animati (telai, basamenti) e materiali che cambiano (lampade)
const CAMP = campiona(scene, t => { REP.update.forEach(u => u(t)); ARR.update(t); });
const ATL_TETTO = creaAtlante();   // il tetto ha il suo atlante: la sua opacità si anima quando il tetto si alza
for (const g of [ED.root, ARR.alto, ...REP.gruppi]) fondiStatici(g, { mutabili: CAMP.mutabili }); fondiStatici(ED.tetto, { atlante: ATL_TETTO, mutabili: CAMP.mutabili });
fondiAnimati(scene, CAMP);
// terreno disegnato per ultimo (dall'alto verso il basso: pavimenti, piazzali, prato): i pixel già coperti da macchine, muri e pavimenti
// non vengono ricalcolati (test di profondità) — su GPU integrate è il costo principale, perché i piani coprono metà dello schermo
{ const ord = new Map([[M.pavimento, 1], [M.pavMagazzino, 1], [M.pavUffici, 1], [M.autobloccanti, 2], [M.asfalto, 2], [M.prato, 3]]);
  scene.traverse(o => { if (o.isMesh && ord.has(o.material)) o.renderOrder = ord.get(o.material); }); }
const aggiornaPersone = istanziaPersone(scene);
if (SENZA.has('persone')) scene.traverse(o => { if (o.isInstancedMesh && o.userData.persone && o.customDepthMaterial) o.visible = false; });   // prova A/B dei costi
const aggiornaOmbre = ombreDisco(scene, ARR.ombre.fissi, ARR.ombre.mobili);
// occlusione di contatto sul terreno: calcolata una volta dall'alto, senza tetto, condotte, persone e mezzi che si spostano
{ const nascondi = [ED.tetto, ARR.alto]; scene.traverse(o => { if (o.userData.persone || (o.parent === scene && o.userData.anim)) nascondi.push(o); }); if (!SENZA.has('terra')) window.__rfAO = bakeAOTerra(renderer, scene, nascondi); }
// percorso indicativo del pezzo, dipinto sul pavimento e rivelato fino al reparto successivo, nell'ordine dettato da Marco il 02/10.
// Lungo i corridoi della pianta (PE: z 33,3 / 23,4 / 10,3, x 41,3 e 61; varco a x 40,4–42,4 nella parete z 13) come dall'analisi Fable P2 n. 7:
// entra dal portone d'ingresso merci sud-est (furgone fuori), passa per i reparti e finisce al camion oltre il portone est del magazzino.
// Dove lo stesso corridoio si percorre più volte le corsie sono affiancate (a ~0,8–1 m); un solo incrocio, a x 59,6 sul corridoio z 33,8.
// [x, z, tappa (indice ST) se il punto è una tappa]
const ROTTA_PTS = [[60.85, 43.8], [60.85, 36.4, 1], [60.85, 33.8], [29.6, 33.8], [29.6, 32.4, 2], [28.6, 32.4], [28.6, 36.4], [35.2, 36.4, 3], [39.6, 36.4], [39.6, 34.6],
  [48.1, 34.6, 4], [58.0, 34.6], [58.0, 37.2, 5], [59.6, 37.2], [59.6, 33.0], [41.3, 33.0], [41.3, 27.6, 6], [41.3, 23.4], [60.0, 23.4], [60.0, 28.6], [62.4, 28.6, 7],
  [62.4, 30.3], [70.2, 30.3], [70.2, 21.8], [64.5, 21.8, 8], [61.6, 21.8], [61.6, 31.0], [65.2, 31.0, 9], [65.2, 31.8], [42.2, 31.8], [42.2, 24.4], [33.5, 24.4, 10],
  [28.0, 24.4], [28.0, 23.6], [40.9, 23.6], [40.9, 10.0], [64.5, 10.0, 11], [72.5, 10.0]];
const ROTTA = (() => {
  // polilinea con gli angoli raccordati (raggio ≤ 1,2 m), campionata ogni ~0,4 m: nastro piatto largo 16 cm (vernice, non un cavo)
  const P = ROTTA_PTS, V2 = (x, z) => new THREE.Vector2(x, z), grezzi = [V2(P[0][0], P[0][1])], tappaDi = new Map();
  for (let i = 1; i < P.length - 1; i++) { const a = V2(P[i - 1][0], P[i - 1][1]), b = V2(P[i][0], P[i][1]), c = V2(P[i + 1][0], P[i + 1][1]);
    const r = Math.min(1.2, a.distanceTo(b) / 2, b.distanceTo(c) / 2), p0 = b.clone().add(a.clone().sub(b).setLength(r)), p1 = b.clone().add(c.clone().sub(b).setLength(r));
    for (let k = 0; k <= 6; k++) { const t = k / 6; grezzi.push(V2(0, 0).addScaledVector(p0, (1 - t) ** 2).addScaledVector(b, 2 * t * (1 - t)).addScaledVector(p1, t * t)); if (k === 3 && P[i][2] !== undefined) tappaDi.set(grezzi.length - 1, P[i][2]); } }
  grezzi.push(V2(...P[P.length - 1]));
  const pts = [], lung = [0], fin = new Array(12).fill(-1); fin[0] = 0;
  grezzi.forEach((q, i) => { if (i) { const a = grezzi[i - 1], n = Math.max(1, Math.ceil(a.distanceTo(q) / .4)); for (let k = 1; k <= n; k++) pts.push(a.clone().lerp(q, k / n)); } else pts.push(q.clone());
    if (tappaDi.has(i)) fin[tappaDi.get(i)] = pts.length - 1; });
  for (let i = 1; i < pts.length; i++) lung.push(lung[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const tot = lung[lung.length - 1], W = .08, pos = [], idxs = [];
  pts.forEach((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = b.clone().sub(a).normalize(); pos.push(q.x - t.y * W, .035, q.y + t.x * W, q.x + t.y * W, .035, q.y - t.x * W);
    if (i) { const k = 2 * i; idxs.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idxs); geo.computeBoundingSphere();
  const mat = new THREE.MeshBasicMaterial({ color: 0xb3262c, transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 2; scene.add(m);
  for (let i = 1; i < 12; i++) fin[i] = fin[i] < 0 ? fin[i - 1] : lung[fin[i]] / tot; const nseg = pts.length - 1;
  return { m, set(i) { const u = i < 0 || i >= 11 ? 1 : fin[i + 1]; geo.setDrawRange(0, Math.ceil(nseg * u) * 6); } }; })();
// etichetta all'inizio del percorso (portone d'ingresso merci sud-est), solo sulla tavola intera e su schermi larghi (P2 n. 9)
const ETI_ROTTA = etichetta(scene, 60.85, .4, 44.6, 'percorso indicativo del pezzo'); ETI_ROTTA.visible = false;
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), SFERE = ST.map(s => new THREE.Sphere(new THREE.Vector3(s.cx, 2, s.cz), Math.hypot(s.w, s.d) / 2 + 3));
const FRONTE_EXTRA = []; scene.traverse(o => { if (o.userData.fronteDi && !ED.fronte.includes(o)) FRONTE_EXTRA.push(o); });

// scritta RIFRA in rilievo sul fronte nord della palazzina (e piccola sul fronte ovest), targa al cancelletto e civico 17 (E, SV, F 7465):
// lettere estruse (vedi formeRIFRA), fuse con l'edificio (atlante: nessuna chiamata di disegno in più)
function tracciati(ds) { const sp = new THREE.ShapePath();
  for (const d of ds) { const t = d.match(/[MCLZmclz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g); let i = 0, cmd = 'M'; const n = () => +t[i++];
    while (i < t.length) { if (/[A-Za-z]/.test(t[i])) cmd = t[i++];
      if (cmd === 'M') { sp.moveTo(n(), n()); cmd = 'L'; } else if (cmd === 'L') sp.lineTo(n(), n()); else if (cmd === 'C') sp.bezierCurveTo(n(), n(), n(), n(), n(), n()); else if (i < t.length && !/[A-Za-z]/.test(t[i])) i++; } }
  return sp; }
// Analisi Fable P3 n. 18: sulle insegne vere la scritta è «RIFRA» tutta maiuscola con grazie (F 7465: due facce della palazzina;
// E earth-retro-uffici-insegna; SV streetview-ingresso-17: targa al cancelletto), non il logo con la «i» minuscola.
// R, F, R, A sono i tracciati del logo ufficiale; la «I» maiuscola è ricostruita dal gambo della «i» del logo: la metà bassa
// (gambo e piede con grazie) più la stessa metà specchiata in alto, quindi stesso spessore e stesse grazie delle altre lettere.
// Il primo tracciato del logo unisce R e i (le grazie al piede si toccano): si tagliano a x 288 (grazie simmetriche della i, 41 unità per lato).
function formeRIFRA() {
  if (formeRIFRA.c) return formeRIFRA.c;   // (proprietà della funzione: insegne() la chiama prima di questa riga)
  const V = THREE.Vector2, C = 288, MEZZO = 150.5, ALTO = 301, forme = [];
  const taglia = (pts, dentro, inter) => { const o = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], ia = dentro(a), ib = dentro(b); if (ia) o.push(a); if (ia !== ib) o.push(inter(a, b)); } return o; };
  const sx = c => (a, b) => new V(c, a.y + (b.y - a.y) * (c - a.x) / (b.x - a.x)), sy = c => (a, b) => new V(a.x + (b.x - a.x) * (c - a.y) / (b.y - a.y), c);
  for (const s of tracciati([LOGO.paths[0]]).toShapes(true)) { const { shape, holes } = s.extractPoints(8);
    const r = taglia(shape, p => p.x <= C, sx(C)); if (r.length > 2) { const R = new THREE.Shape(r); holes.filter(h => h.every(p => p.x < C)).forEach(h => R.holes.push(new THREE.Path(h))); forme.push(R); }
    const piede = taglia(taglia(shape, p => p.x >= C, sx(C)), p => p.y >= MEZZO, sy(MEZZO));
    if (piede.length > 2) { forme.push(new THREE.Shape(piede)); forme.push(new THREE.Shape(piede.map(p => new V(p.x, ALTO - p.y)).reverse())); } }
  for (const d of [LOGO.paths[2], LOGO.paths[3]]) forme.push(...tracciati([d]).toShapes(true));
  return (formeRIFRA.c = forme);
}
function scritta(w, prof) { const k = w / 1181;
  const g = new THREE.ExtrudeGeometry(formeRIFRA(), { depth: prof / k, bevelEnabled: false, curveSegments: 3 });
  g.scale(k, k, k); g.rotateX(Math.PI); g.translate(-w / 2, 296 * k, prof); return { g, h: 296 * k }; }
function insegne(list) {
  for (const s of list.filter(s => s.civico)) { const c = document.createElement('canvas'); c.width = 128; c.height = 104; const q = c.getContext('2d'); q.fillStyle = '#f1f0ec'; q.fillRect(0, 0, 128, 104); q.strokeStyle = '#444'; q.lineWidth = 6; q.strokeRect(3, 3, 122, 98); q.fillStyle = '#1d1d1d'; q.font = '600 64px Helvetica, Arial'; q.textAlign = 'center'; q.fillText('17', 64, 76);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), new THREE.MeshStandardMaterial({ map: t, roughness: .6 })); m.position.set(s.x, s.y, s.z); ED.root.add(m); m.userData.statico = true; }
  for (const s of list.filter(s => s.rilievo || s.targa)) {
    const { g, h } = scritta(s.targa ? s.w * .78 : s.w, s.targa ? .012 : .1);
    const m = new THREE.Mesh(g, M.grigioScuro); m.castShadow = !s.targa; m.receiveShadow = true; m.userData.statico = !s.fronte;
    m.position.set(s.x, s.targa ? s.y + (s.h - h) / 2 : s.y, s.z + (s.targa ? .045 : 0)); m.rotation.y = s.ry; (s.fronte ? ED.finestreFronte : ED.root).add(m);
    if (s.targa) box3(s.x - s.w / 2, s.y, s.z, s.w, s.h, .045);
  }
  function box3(x, y, z, w, h, d) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(x + w / 2, y + h / 2, z + d / 2), M.biancoCaldo); b.castShadow = b.receiveShadow = true; b.userData.statico = true; ED.root.add(b); }
}

// ---------- camera, controlli, post ----------
const camera = new THREE.PerspectiveCamera(38, 1, .5, 1400);
// etichette e segnaposto (CSS2DObject) disegnati da una funzione propria: niente visita di tutta la scena a ogni fotogramma
// e scritture nel DOM solo quando posizione o visibilità cambiano davvero
const LABELS = $('labels'), ETI = [], _vp = new THREE.Matrix4(), _lv = new THREE.Vector3();
function disegnaEtichette() {
  if (!ETI.length) scene.traverse(o => { if (o.isCSS2DObject) ETI.push(o); });   // raccolte al primo disegno (dopo i segnaposto)
  _vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); const W2 = innerWidth / 2, H2 = innerHeight / 2;
  for (const o of ETI) { const el = o.element, u = o.userData; let v = true; for (let q = o; q; q = q.parent) if (!q.visible) { v = false; break; }
    if (v) { _lv.setFromMatrixPosition(o.matrixWorld).applyMatrix4(_vp); v = _lv.z >= -1 && _lv.z <= 1; }
    if (u._v !== v) { el.style.display = v ? '' : 'none'; u._v = v; } if (!v) continue;
    if (el.parentNode !== LABELS) LABELS.appendChild(el);
    const off = u.off, tx = Math.round((_lv.x * W2 + W2 + (off ? off[0] : 0)) * 4) / 4, ty = Math.round((-_lv.y * H2 + H2 + (off ? off[1] : 0)) * 4) / 4;   // off: spostamento dei segnaposto affollati
    if (tx !== u._tx || ty !== u._ty) { el.style.transform = `translate(-50%,-50%) translate(${tx}px,${ty}px)`; u._tx = tx; u._ty = ty; } }
}
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: .08, maxPolarAngle: 1.3, minPolarAngle: .2, minDistance: 5, maxDistance: 220, screenSpacePanning: false, zoomToCursor: true });
controls.enabled = !KIOSK && !VIDEO;
let composer, gtao, smaa, grade;
// occlusione ambientale (solo «alta»): a metà risoluzione e solo a camera ferma (sfuma in 0,25 s), sempre piena nel video
const AO_SCALA = VIDEO ? 1 : .5;
function creaPost() {
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  gtao = new GTAOPass(scene, camera, 1, 1); gtao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.5, thickness: 1.5, scale: 1, samples: VIDEO ? 24 : 16 }); gtao.blendIntensity = .85; composer.addPass(gtao);
  grade = new ShaderPass(GradeShader); if (!SENZA.has('grade')) composer.addPass(grade);   // grading sull'immagine lineare, prima della conversione per lo schermo
  if (SENZA.has('grana')) grade.uniforms.uGrana.value = 0;
  composer.addPass(new OutputPass()); smaa = new SMAAPass(1, 1); composer.addPass(smaa);
  // il passaggio delle normali di GTAO usa un materiale sostitutivo senza lo skinning delle persone (persone.js): le persone
  // comparirebbero in posa di riposo nel G-buffer. Durante quel passaggio la loro InstancedMesh resta nascosta.
  const ovr = gtao._renderOverride.bind(gtao), pers = []; scene.traverse(o => { if (o.isInstancedMesh && o.userData.persone && o.customDepthMaterial) pers.push(o); });
  gtao._renderOverride = (...a) => { pers.forEach(o => { o.userData._v = o.visible; o.visible = false; }); ovr(...a); pers.forEach(o => { o.visible = o.userData._v; }); };
}
creaPost();
// video: supercampionamento 2× (la pagina a 1920 × 1080 disegna a 3840 × 2160 e il fotogramma viene ridotto): niente scalette, più tempo di esportazione
function applicaQualita() { const L = LIV[liv]; renderer.setPixelRatio(VIDEO ? 2 : Math.min(devicePixelRatio || 1, L.dpr)); gtao.enabled = L.ao;
  if (sole.shadow.mapSize.x !== L.ombra) { sole.shadow.mapSize.set(L.ombra, L.ombra); if (sole.shadow.map) { sole.shadow.map.dispose(); sole.shadow.map = null; } }
  sole.shadow.radius = L.ombra >= 4096 ? 2.2 : L.ombra >= 2048 ? 1.4 : 1;   // raggio del filtro 3 × 3 in texel
  // «bassa» (GPU integrate lente): ombre a una lettura e niente grading; il cambio ricompila i materiali una volta
  grade.enabled = liv !== 'bassa'; const tipo = liv === 'bassa' ? THREE.BasicShadowMap : THREE.PCFShadowMap;
  if (renderer.shadowMap.type !== tipo) { renderer.shadowMap.type = tipo; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); }); }
  _ombra = ''; $('style').textContent = t('Dettaglio ' + liv);   // «Qualità» era gergo tecnico (P3 n. 21)
  resize(); }
// adattamento automatico: giù subito se lento, su dopo ~6 s con margine; se un livello più alto fallisce entro 20 s non si ritenta
const ADA = { n: 0, somma: 0, lenti: 0, buone: 0, attesa: 0, salito: -1e9, vietati: new Set() }, ORD = ['bassa', 'media', 'alta'];
function adatta(dt, now) {
  if (VIDEO || document.hidden || now < ADA.attesa) return;
  ADA.n++; ADA.somma += dt; if (dt > 1 / 40) ADA.lenti++; if (ADA.n < 90) return;
  const avg = ADA.somma / ADA.n, lenti = ADA.lenti / ADA.n, i = ORD.indexOf(liv); ADA.n = ADA.somma = ADA.lenti = 0;
  if (i > 0 && (scelta ? avg > 1 / 28 : avg > 1 / 45 || lenti > .2)) { if (now - ADA.salito < 20000) ADA.vietati.add(liv); cambiaLivello(ORD[i - 1]); ADA.buone = 0; return; }
  if (!scelta && i < 2 && avg < 1 / 55 && lenti < .03 && !ADA.vietati.has(ORD[i + 1])) { if (++ADA.buone >= 4) { cambiaLivello(ORD[i + 1]); ADA.salito = now; ADA.buone = 0; } } else ADA.buone = 0;
}
function cambiaLivello(l) { liv = l; applicaQualita(); ADA.attesa = performance.now() + 2500; }

// ---------- pose della camera ----------
const DIR = new THREE.Vector3(-.64, .6, .48).normalize();
let FREE = { x0: 0, x1: innerWidth, y0: 0, y1: innerHeight };
function freeArea() {
  const W = innerWidth, H = innerHeight, card = $('card').getBoundingClientRect(), idx = document.querySelector('.index ol').getBoundingClientRect(), mast = document.querySelector('.mast').getBoundingClientRect();
  if (VIDEO) return { x0: card.right + 24, x1: W - 24, y0: 24, y1: H - 24 };
  // fiera: in orizzontale l'indice sta in alto, in verticale sopra la scheda (P1 n. 3): ogni riquadro limita l'area dal suo lato
  if (KIOSK) { const kb = $('kband').getBoundingClientRect(); let y0 = 0, y1 = H;
    for (const r of [mast, idx, card, kb]) { if (!r.height) continue; if (r.top + r.height / 2 < H / 2) y0 = Math.max(y0, r.bottom); else y1 = Math.min(y1, r.top); }
    return { x0: 16, x1: W - 16, y0: y0 + 8, y1: y1 - 8 }; }
  if (W >= 900 || W > H * 1.3) return { x0: card.right + 8, x1: W - 8, y0: mast.bottom + 8, y1: idx.top - 8 };
  return { x0: 0, x1: W, y0: mast.bottom + 4, y1: idx.top - 6 };
}
// il centro dell'inquadratura va al centro dell'area libera (fuori da scheda e indice): spostamento ottico, non della camera
// pulsanti in alto a destra: ostacoli per le etichette (P2 n. 8), misurati solo quando cambia l'impaginazione
let OSTACOLI = [];
function applicaOffset() { FREE = freeArea(); const W = innerWidth, H = innerHeight;
  OSTACOLI = ['motion', 'style', 'roof', 'lang'].map(id => $(id)).filter(e => e && e.offsetWidth).map(e => { const r = e.getBoundingClientRect(); return [r.left - 6, r.top - 6, r.right + 6, r.bottom + 6]; }); const dx = (FREE.x0 + FREE.x1) / 2 - W / 2, dy = (FREE.y0 + FREE.y1) / 2 - H / 2;
  camera.setViewOffset(W, H, -dx, -dy, W, H); }
// distanza perché una sfera di raggio r stia nell'area libera (non in tutto lo schermo)
function distanzaPer(r) { const fw = Math.max(200, FREE.x1 - FREE.x0), fh = Math.max(200, FREE.y1 - FREE.y0), tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const t = Math.min(tv * fh / innerHeight, tv * camera.aspect * fw / innerWidth); return r / Math.max(.02, t); }
// [azimut da sud verso ovest in gradi, elevazione in gradi, zoom (1 = tutto il reparto), spostamento del fuoco x, z]: 3/4 all'altezza dell'operatore
// sesto valore facoltativo: altezza del fuoco (1,2 m). Tappa 1: da nord-nord-ovest, fuoco alto fra l'ufficio tecnico e il primo piano esploso (uffici.js)
// nell'ordine di ST (Marco 02/10): pannelli, foratura, squadratura e sezionatura dal lato nord (pannelli: il furgone oltre il muro sud),
// montaggio dall'alto (REPORT-MACCHINE § 7), spedizione da sud-est (Robopac oltre il muro est e camion)
const PROFILI = [[160, 54, 2.25, .3, 3.2, 6.0], [175, 52, 1.5, 0, 2.5], [25, 34, .85, 0, .6], [170, 30, .95, 0, -.3], [165, 32, .9, 0, 0], [160, 30, 1.1, 0, -.3],
  [-28, 34, .95, 0, 0], [40, 32, .9, 0, 0], [30, 30, 1, 0, .4], [50, 36, 1, 0, 0], [10, 48, .9, 0, 0], [-130, 60, 1.05, -2.5, 0]];
function posaRett(s, [az, el, zm, ox, oz, y]) { const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  const dir = new THREE.Vector3(-Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  return { t: new THREE.Vector3(s.cx + ox, y ?? 1.2, s.cz + oz), d: distanzaPer((Math.hypot(s.w, s.d) * .3 + .6) * zm), dir }; }
const posaReparto = i => posaRett(ST[i], PROFILI[i]);
// verniciatura manuale (Marco 02/10): OPZIONE dopo la lucidatura, fuori dalla numerazione e dal giro; cabina M18 (reparti.js fuori, F 7454)
const OPZ_ST = { x: 26.6, z: 13.1, w: 9.3, d: 6.4, cx: 31.25, cz: 16.3 }, OPZ_PROF = [30, 40, 1.1, 0, 0];
// sui telefoni in verticale la tavola intera stringe sul capannone (raggio 36 invece di 46: P2 n. 13)
function posaTavola() { return { t: new THREE.Vector3(LOTTO.cx, 0, LOTTO.cz), d: distanzaPer(innerWidth < 600 ? 36 : LOTTO.r), dir: DIR }; }
const cam = { t: new THREE.Vector3(64, 0, 30), d: 200, dir: DIR.clone() }, vel = { t: new THREE.Vector3(), d: 0, dir: new THREE.Vector3() };
let goal = posaTavola();
// smorzamento critico (senza allocazioni: la nuova velocità va in _dv)
let _dv = 0; function damp(c, t, v, st, dt) { const o = 2 / st, x = o * dt, e = 1 / (1 + x + .48 * x * x + .235 * x * x * x), ch = c - t, tmp = (v + o * ch) * dt; _dv = (v - o * tmp) * e; return t + (ch + tmp) * e; }
const XYZ = ['x', 'y', 'z'], _dir = new THREE.Vector3();
function muoviCamera(dt) {
  if (mode === 'free') return;
  // volo esce-sposta-rientra: se la meta è lontana la distanza sale, poi scende sull'arrivo
  const viaggio = cam.t.distanceTo(goal.t), dGoal = Math.max(goal.d, viaggio * 1.15);
  for (const k of XYZ) { cam.t[k] = damp(cam.t[k], goal.t[k], vel.t[k], .9, dt); vel.t[k] = _dv; cam.dir[k] = damp(cam.dir[k], goal.dir[k], vel.dir[k], .8, dt); vel.dir[k] = _dv; }
  cam.d = Math.exp(damp(Math.log(cam.d), Math.log(dGoal), vel.d, .75, dt)); vel.d = _dv;
  if (RM) { cam.t.copy(goal.t); cam.d = goal.d; cam.dir.copy(goal.dir); }
  camera.position.copy(cam.t).addScaledVector(_dir.copy(cam.dir).normalize(), cam.d); camera.lookAt(cam.t); controls.target.copy(cam.t);
}

// ---------- tetto e pareti in sezione ----------
// trasparenza fissa, si anima solo l'opacità: nessuna ricompilazione dello shader, nessuno scatto
const TETTO_MAT = [M.tetto, M.tettoPiano, M.tettoScuro, M.lucernario, M.lineaRossa, ATL_TETTO]; TETTO_MAT.forEach(m => { m.transparent = true; });
let tetto = 0, tettoGoal = 0;   // 0 = tetto al suo posto (esterno), 1 = tolto (casa di bambole)
function aggiornaTetto(dt) {
  tetto = RM ? tettoGoal : tetto + clamp(tettoGoal - tetto, -dt / 1.6, dt / 1.6);
  const u = tetto * tetto * (3 - 2 * tetto);
  ED.tetto.position.y = u * 16; ED.tetto.visible = u < .98;
  for (const m of TETTO_MAT) { m.opacity = (m === M.lucernario ? .75 : 1) * (1 - u); m.depthWrite = u < .5; }
  // muri verso la camera abbassati a 1,3 m; se la camera guarda proprio verso quel muro (tappe 03–05 riprese da nord verso il muro sud)
  // restano a 2,6 m, così dietro le macchine non si vedono strada e auto (P2 n. 11)
  _vista.subVectors(controls.target, camera.position); const vl = Math.hypot(_vista.x, _vista.z) || 1;
  for (const w of ED.fronte) { if (w.userData.hPieno) { const h = w.userData.hPieno, n = w.userData.n, verso = n ? (_vista.x * n[0] + _vista.z * n[1]) / vl : -1;
    const sy = lerp(1, lerp(1.3, 2.6, clamp((verso - .35) / .35, 0, 1)) / h, u); w.scale.y = sy; w.position.y = h * sy / 2; } else w.visible = u < .5; }
  for (const o of FRONTE_EXTRA) o.visible = u < .5; for (const s of ED.piano1) s.visible = u < .5;
  // primo piano degli uffici (uffici.js): al suo posto mentre il tetto si alza; con il tetto tolto e la tappa 1 a fuoco si solleva
  // di 9,5 m (uffici.js ESPLOSO) sopra la palazzina (vista esplosa: piano terra e primo piano leggibili insieme), altrimenti resta nascosto
  if (ED.primoPiano && ED.primoPiano(u, tettoGoal === 1 && fuoco() === 0, RM ? 10 : dt)) sporco = true;
  // tetto chiuso del tutto: l'interno non si vede (le volte sono piene), quindi non si disegna (esterno e richiamo della fiera)
  const dentro = u > .001; if (INTERNO[0].visible !== dentro) INTERNO.forEach(o => { o.visible = dentro; });
  if (_tettoBtn !== tettoGoal) { _tettoBtn = tettoGoal; $('roof').textContent = t(tettoGoal ? 'Metti il tetto' : 'Togli il tetto'); $('roof').setAttribute('aria-pressed', String(!!tettoGoal)); }
}
let _tettoBtn = -1; const _vista = new THREE.Vector3();
const INTERNO = [...REP.gruppi, ...(REP.statici ? [REP.statici] : []), ...scene.children.filter(o => o.userData.anim && !o.userData.fuori)];   // fuori: il furgone nel piazzale

// ---------- segnaposto e etichette ----------
const PINS = ST.map((s, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pin pin3d'; b.textContent = String(i + 1);
  b.setAttribute('aria-label', nomePassaggio(i)); b.addEventListener('pointerdown', e => e.stopPropagation());
  b.onclick = e => { e.stopPropagation(); interacted = true; if (KIOSK && attract) { kioskStory(i); return; } jump(i, true); };
  // tappa 1 a 3,2 m, sull'ufficio tecnico: a 6,4 il numero sembrava della sala riunioni del primo piano (Marco 02/10: lì niente numero)
  const o = new CSS2DObject(b); o.position.set(s.cx, i === 0 ? 3.2 : 6.4, s.cz); scene.add(o); return o; });
const PIN_OPZ = (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pin pin3d opz';
  const scrivi = () => { b.textContent = t('opz.'); b.title = t('Opzione: verniciatura manuale'); b.setAttribute('aria-label', t('Opzione dopo la lucidatura: verniciatura manuale')); }; scrivi(); allaLingua(scrivi); b.addEventListener('pointerdown', e => e.stopPropagation());
  b.onclick = e => { e.stopPropagation(); vediOpzione(); };
  const o = new CSS2DObject(b); o.position.set(OPZ_ST.cx, 6.4, OPZ_ST.cz); scene.add(o); PINS.push(o); return b; })();
const _v = new THREE.Vector3(), _posti = [];
// segnaposto sulla tavola intera (P1 n. 1): prima bastava che due segni fossero vicini per nasconderli tutti (le tappe 3, 4, 5 distano
// 5–6 m, quindi sulla tavola non se ne vedeva nessuno). Ora ogni segno che cadrebbe su uno già posato si sposta di un diametro
// (sopra, poi di lato, poi sotto); si nasconde solo se non trova posto.
const SPOSTA = [[0, -1], [-.87, -.5], [.87, -.5], [0, 1], [-.87, .5], [.87, .5], [0, -2], [-1.73, -1], [1.73, -1]];
function aggiornaSegni(mosso) {
  const show = mode !== 'tour' && !VIDEO && tetto > .8, D = (KIOSK ? 56 : COARSE ? 44 : 38) + 3; _posti.length = 0;
  const libero = (x, y) => _posti.every(p => Math.hypot(p[0] - x, p[1] - y) >= D);
  PINS.forEach(o => { if (!show) { o.visible = false; return; } _v.copy(o.position).project(camera); const x = (_v.x + 1) / 2 * innerWidth, y = (1 - _v.y) / 2 * innerHeight;
    let s = libero(x, y) ? [0, 0] : null; for (let k = 0; !s && k < SPOSTA.length; k++) if (libero(x + SPOSTA[k][0] * D, y + SPOSTA[k][1] * D)) s = [SPOSTA[k][0] * D, SPOSTA[k][1] * D];
    o.visible = !!s; if (!s) return; _posti.push([x + s[0], y + s[1]]); const u = o.userData; if (!u.off || u.off[0] !== s[0] || u.off[1] !== s[1]) { u.off = s; u._tx = null; } });
  ROTTA.set(mode === 'tour' ? cur : -1); ROTTA.m.visible = tetto > .6; ETI_ROTTA.visible = mode === 'sheet' && tetto > .9 && !VIDEO && innerWidth >= 900;
  const fs = fuoco(); REP.etichette.forEach((arr, i) => arr.forEach((l, k) => l.visible = i === fs && tetto > .6 && (!KIOSK || k < 2)));
  if (fs >= 0 && (mosso || nFrame % 3 === 0)) antiSovrapposte(REP.etichette[fs]);   // riposizionamento: a camera ferma ogni 3 fotogrammi
  $('vig').classList.toggle('on', fs >= 0);
}
// etichette che non si coprono e restano nell'area libera (P2 n. 8): dimensioni misurate una volta sola; spostamento orizzontale per
// rientrare fra scheda e bordo dello schermo, verticale per non coprirsi fra loro né coprire i pulsanti in alto a destra.
// L'etichetta è centrata sulla sua ancora (disegnaEtichette); il filo sotto (--sx) resta puntato sull'ancora.
const DIM = new Map();
// misure rifatte quando arrivano i caratteri della pagina: misurate col carattere di riserva erano più strette e l'etichetta finiva
// sotto la scheda (controllo del 02/10, tappa 9 «Carrello di essiccazione»)
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { DIM.clear(); sporco = true; });
function antiSovrapposte(arr) {
  const placed = OSTACOLI.slice(), y0 = FREE.y0 + 4, y1 = FREE.y1 - 4;
  for (const l of arr) { if (!l.visible) continue; const el = l.element; if (!DIM.has(el)) { const r = el.getBoundingClientRect(); if (r.width) DIM.set(el, [r.width, r.height]); }
    const [w, h] = DIM.get(el) || [200, 30]; _v.copy(l.position).applyMatrix4(l.parent.matrixWorld).project(camera);
    // punto di riferimento fuori inquadratura (camera libera, camion che si allontana): l'etichetta si nasconde invece di essere trascinata
    // in un angolo dello schermo (controllo del 02/10); lo spostamento qui sotto serve solo a scansare scheda, pulsanti e altre etichette
    { const via = Math.abs(_v.x) > 1 || Math.abs(_v.y) > 1 || _v.z > 1; el.style.visibility = via ? 'hidden' : ''; if (via) continue; }
    let x = (_v.x + 1) / 2 * innerWidth - w / 2; const y = (1 - _v.y) / 2 * innerHeight - h / 2;
    const dx = Math.round(clamp(x, FREE.x0 + 8, Math.max(FREE.x0 + 8, FREE.x1 - w - 8)) - x); x += dx;
    const dy0 = y < y0 ? y0 - y : y + h > y1 ? y1 - h - y : 0, urta = d => placed.some(p => x < p[2] && p[0] < x + w && y + d < p[3] && p[1] < y + d + h);
    // candidati: posizione naturale, poi appena sopra o appena sotto ogni riquadro già posato; vince il più vicino che non urta e resta nell'area
    let dy = dy0; if (urta(dy0)) { let best = null;
      for (const p of placed) for (const c of [p[1] - h - 6 - y, p[3] + 6 - y]) if (y + c >= y0 && y + c + h <= y1 && !urta(c) && (best === null || Math.abs(c - dy0) < Math.abs(best - dy0))) best = c;
      if (best !== null) dy = best; }
    dy = Math.round(dy); placed.push([x, y + dy, x + w, y + dy + h]);
    if (l.userData._dy !== dy || l.userData._dx !== dx) { el.style.marginTop = dy + 'px'; el.style.marginLeft = dx + 'px'; el.style.setProperty('--sx', -dx + 'px'); l.userData._dy = dy; l.userData._dx = dx; } }
}
function fuoco() { if (mode === 'tour') return cur; if (mode === 'sheet') return -1;
  const d = camera.position.distanceTo(controls.target); if (d > 55) return -1; const t = controls.target;
  return ST.findIndex(s => t.x > s.x - 1 && t.x < s.x + s.w + 1 && t.z > s.z - 1 && t.z < s.z + s.d + 1); }

// ---------- stato del giro ----------
let mode = 'sheet', playing = false, tc = 0, cur = -1, interacted = false, ended = false, motionOn = true, T = RM ? 4.2 : 0;
let CUES = CUES_R, END = END_R; const CUES_S = CUES_R.map((_, i) => i * 7), END_S = 84;   // fiera: 7 s per tappa, la camera ha il tempo di arrivare (P2 n. 12)
const idx = $('idx');
NAMES.forEach((n, i) => { const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button';
  const nb = document.createElement('b'); nb.textContent = String(i + 1).padStart(2, '0'); const sp = document.createElement('span'); sp.textContent = t(n); b.append(nb, sp);
  b.setAttribute('aria-label', nomePassaggio(i)); b.onclick = () => { interacted = true; jump(i, true); }; li.appendChild(b); idx.appendChild(li); });
let schedaDi = INTRO;   // funzione che dà la scheda mostrata: al cambio di lingua si riscrive
function mostraScheda(f) { schedaDi = f; setCard(f()); }
function setCard(c) { document.querySelectorAll('#card .fx').forEach(e => { e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); }); $('num').textContent = c.num; $('phase').textContent = c.phase; $('title').textContent = c.title; $('data').textContent = c.data; $('body').textContent = c.body; }
function setStation(i) { cur = i; mostraScheda(() => { const x = TXT()[i]; return { num: String(i + 1).padStart(2, '0'), phase: `${t('di 12')} · ${t(NAMES[i])}`, title: x[0], data: x[1], body: x[2] }; });
  $('live').textContent = `${t('Passaggio')} ${i + 1} ${t('di 12')}: ${TXT()[i][0]}`;
  $('labs').replaceChildren(...REP.etichette[i].map(l => { const li = document.createElement('li'); li.textContent = l.element.textContent; return li; }));
  [...idx.querySelectorAll('button')].forEach((b, k) => k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'));
  tettoGoal = 1; goal = posaReparto(i); sporco = true; }
function syncButtons() { if (mode !== 'sheet' || interacted) $('play').classList.remove('invito'); $('play').textContent = t(mode === 'tour' && playing ? 'Pausa' : mode === 'sheet' ? (ended ? 'Rivedi il giro' : 'Avvia il giro') : mode === 'free' ? 'Torna al giro' : 'Riprendi il giro'); }
function play() { mode = 'tour'; playing = true; syncButtons(); }
function pause() { playing = false; syncButtons(); }
function jump(i, auto) { tc = CUES[i] + .01; ended = false; mode = 'tour'; setStation(i); if (auto) play(); else syncButtons(); }
function vediOpzione() { interacted = true; if (KIOSK) { attract = false; clearTimeout(kioskTimer); $('tapcta').hidden = true; lastInput = performance.now(); }
  mode = 'opz'; pause(); cur = -1; $('labs').replaceChildren(); [...idx.querySelectorAll('button')].forEach(b => b.removeAttribute('aria-current'));
  mostraScheda(OPZ); $('live').textContent = t('Opzione') + ': ' + OPZ().title; tettoGoal = 1; goal = posaRett(OPZ_ST, OPZ_PROF); sporco = true; syncButtons(); }
function goSheet(outro) { mode = 'sheet'; pause(); cur = -1; $('labs').replaceChildren(); [...idx.querySelectorAll('button')].forEach(b => b.removeAttribute('aria-current')); mostraScheda(outro ? OUTRO : INTRO); $('prog').style.width = outro ? '100%' : '0%'; goal = posaTavola(); sporco = true; syncButtons(); }
$('play').onclick = () => { interacted = true; if (mode === 'sheet') jump(0, true); else if (mode === 'free') { if (cur < 0) jump(0, true); else { setStation(cur); play(); } } else playing ? pause() : play(); };
$('next').onclick = () => { interacted = true; jump(Math.min(11, Math.max(-1, cur) + 1), mode === 'sheet' || playing); };
$('prev').onclick = () => { interacted = true; jump(Math.max(0, cur - 1), mode === 'sheet' || playing); };
$('sheet').onclick = () => { interacted = true; goSheet(false); };
$('roof').onclick = () => { sporco = true; interacted = true; tettoGoal = tettoGoal ? 0 : 1; };
$('style').onclick = () => { liv = liv === 'alta' ? 'media' : liv === 'media' ? 'bassa' : 'alta'; try { localStorage.setItem('rf3d-qualita', liv); } catch (e) {} applicaQualita(); };
$('motion').onclick = () => { sporco = true; interacted = true; motionOn = !motionOn; $('motion').setAttribute('aria-pressed', String(!motionOn)); if (!motionOn && playing) pause(); };
if (RM) { $('motion').setAttribute('aria-pressed', 'true'); $('motion').disabled = true; }
$('more').onclick = () => { const o = $('card').classList.toggle('open'); $('more').setAttribute('aria-expanded', String(o)); $('more').textContent = t(o ? 'Riduci' : 'Leggi tutto'); };
// cambio di lingua: pulsante in alto a destra (lingua.js); si riscrivono schede, indice, segnaposto, pulsanti ed etichette (prim.js, arredi.js)
$('lang').onclick = () => { interacted = true; cambiaLingua(EN_() ? 'it' : 'en'); };
allaLingua(() => { setCard(schedaDi()); [...idx.querySelectorAll('button')].forEach((b, i) => { b.querySelector('span').textContent = t(NAMES[i]); b.setAttribute('aria-label', nomePassaggio(i)); });
  PINS.forEach((o, i) => { if (i < 12) o.element.setAttribute('aria-label', nomePassaggio(i)); });
  if (cur >= 0) $('labs').replaceChildren(...REP.etichette[cur].map(l => { const li = document.createElement('li'); li.textContent = l.element.textContent; return li; }));
  $('more').textContent = t($('card').classList.contains('open') ? 'Riduci' : 'Leggi tutto'); _tettoBtn = -1; $('style').textContent = t('Dettaglio ' + liv); syncButtons(); DIM.clear(); sporco = true; });
controls.addEventListener('start', () => { interacted = true; if (mode !== 'free') { if (mode === 'tour' && playing) pause(); mode = 'free'; tettoGoal = 1; syncButtons(); } });
controls.addEventListener('change', () => { sporco = true; });
// Spazio mette in pausa / riprende anche quando il fuoco è su un altro pulsante (prima riattivava l'ultimo pulsante premuto, P3 n. 22)
const btnDi = e => e.target && e.target.closest ? e.target.closest('button') : null;
addEventListener('keyup', e => { const b = btnDi(e); if (e.key === ' ' && b && b.id !== 'play') e.preventDefault(); });
addEventListener('keydown', e => { if (e.altKey || e.ctrlKey || e.metaKey) return; const b = btnDi(e);
  if (b && (e.key === 'Enter' || (e.key === ' ' && b.id === 'play'))) return; if (b && e.key === ' ') { e.preventDefault(); if (!e.repeat) $('play').click(); return; }
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); $('next').click(); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); $('prev').click(); }
  else if (e.key === ' ' || e.key === 'b') { e.preventDefault(); $('play').click(); } else if (e.key === 'Escape' || e.key === 's') $('sheet').click(); else if (e.key === 't') $('roof').click(); });
function updateTour(dt) { if (mode !== 'tour') return; if (playing) tc += dt; if (tc >= END) { ended = true; goSheet(true); if (KIOSK) kioskAfterEnd(); return; }
  let i = 0; for (let k = 0; k < 12; k++) if (tc >= CUES[k]) i = k; if (i !== cur) setStation(i); $('prog').style.width = clamp((tc - CUES[i]) / ((CUES[i + 1] || END) - CUES[i]), 0, 1) * 100 + '%'; }

// ---------- ciclo ----------
let last = performance.now(), startT = 0, nFrame = 0, sporco = true, resoPrima = false, ferma = 0, ombraConta = 0; const _ultimaCam = new THREE.Matrix4(), _pc = new THREE.Vector3(), _qc = new THREE.Quaternion();
function resize() { sporco = true; const W = innerWidth, H = innerHeight; renderer.setSize(W, H, false); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  if (KIOSK) document.documentElement.style.setProperty('--k', String(Math.max(1, Math.min(W, H) / 1080)));   // zoom dell'interfaccia di fiera (P1 n. 3)
  camera.aspect = W / H; applicaOffset(); camera.updateProjectionMatrix(); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(W, H);
  for (const e of ETI) e.userData._tx = null; if (gtao) gtao.setSize(Math.round(W * renderer.getPixelRatio() * AO_SCALA), Math.round(H * renderer.getPixelRatio() * AO_SCALA));
  aggiornaLayout(); }
// altezza della scheda (per l'indice sul telefono e in fiera verticale) e area libera: anche quando la scheda cambia altezza da sola
// («Leggi tutto», testo di un'altra tappa: P1 n. 2), non solo al ridimensionamento della finestra
function aggiornaLayout() { document.documentElement.style.setProperty('--card-h', $('card').offsetHeight + 'px'); applicaOffset(); camera.updateProjectionMatrix();
  goal = mode === 'tour' && cur >= 0 ? posaReparto(cur) : mode === 'sheet' ? posaTavola() : goal; sporco = true; }
if (!VIDEO && window.ResizeObserver) new ResizeObserver(() => aggiornaLayout()).observe($('card'));
addEventListener('resize', resize);
function frame(now, dtFix) {
  const dt = dtFix ?? clamp((now - last) / 1000, 0, .05); last = now;
  if (!RM && motionOn && !(mode === 'tour' && !playing)) T += dt;
  updateTour(dtFix ?? dt); startT += dt;
  if (!interacted && !VIDEO && !KIOSK && startT > 2.6 && mode === 'sheet') tettoGoal = 1;       // apertura: esterno vero, poi il tetto si alza
  aggiornaTetto(dt); muoviCamera(dt); if (mode === 'free') { controls.update(); clampTarget(); }
  // livello alto (condotte a soffitto, soppalco): pieno da lontano, nascosto quando si guarda un reparto da vicino
  const d = camera.position.distanceTo(controls.target);
  // soglia relativa alla tappa (2,5 volte la distanza d'arrivo) e niente condotte oltre 140 m, sulla tavola intera (P2 n. 10)
  ARR.alto.visible = tetto > .001 && (tetto < .5 || (d > (mode === 'free' ? 55 : 2.5 * goal.d) && d < 140));
  // ombre nitide attorno a ciò che si guarda: riquadro del sole adattato alla distanza. La mappa si ridisegna quando il riquadro
  // cambia, mentre il tetto si muove, e ogni «ombraOgni» fotogrammi per ciò che si anima (sempre nel video)
  const ombraMossa = ombraSu(controls.target.x, controls.target.z, clamp(d * .55, 14, 70)); nFrame++;
  // camera ferma? (soglia: lo smorzamento continua a muoverla di pochissimo per molti fotogrammi)
  camera.updateMatrixWorld(); const mosso = camera.position.distanceToSquared(_pc) > 1e-6 || camera.quaternion.angleTo(_qc) > 2e-4; ferma = mosso ? 0 : ferma + 1;
  // occlusione ambientale: sfuma tra 90 e 55 m (da lontano non si vede e costa); fuori dal video solo a camera ferma
  const aoK = clamp((90 - d) / 35, 0, 1) * (VIDEO ? 1 : clamp((ferma - 6) / 15, 0, 1)); gtao.enabled = LIV[liv].ao && aoK > 0; gtao.blendIntensity = .85 * aoK;
  // animazioni solo dei reparti dentro l'inquadratura
  _fr.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  REP.update.forEach((u, i) => { if (_fr.intersectsSphere(SFERE[i])) u(T); }); ARR.update(T);
  // render su richiesta: se niente si muove non si ridisegna (chiosco fermo, animazioni in pausa)
  const fermo = (RM || !motionOn || (mode === 'tour' && !playing)) && camera.matrixWorld.equals(_ultimaCam) && Math.abs(tetto - tettoGoal) < 1e-4 && !sporco;
  if (!fermo || VIDEO) {
    if (VIDEO || ombraMossa || Math.abs(tetto - tettoGoal) > 1e-4 || ++ombraConta >= LIV[liv].ombraOgni) { sole.shadow.needsUpdate = true; ombraConta = 0; }
    grade.uniforms.uTempo.value = nFrame * .0417;   // seme della grana: contatore dei fotogrammi (deterministico nel video)
    scene.updateMatrixWorld(); aggiornaPersone(camera); aggiornaOmbre(); aggiornaSegni(mosso); composer.render(); disegnaEtichette(); _ultimaCam.copy(camera.matrixWorld); sporco = false;
  }
  _pc.copy(camera.position); _qc.copy(camera.quaternion);
  if (!VIDEO) { if (resoPrima) adatta(dt, now); resoPrima = !fermo; requestAnimationFrame(frame); }
}
function clampTarget() { const t = controls.target; t.x = clamp(t.x, LOTTO.x0 - 10, LOTTO.x1 + 10); t.z = clamp(t.z, LOTTO.z0 - 10, LOTTO.z1 + 10); t.y = clamp(t.y, 0, 8); }

// ---------- fiera (?kiosk=1) ----------
// richiamo: esterno con il tetto chiuso, il tetto si alza, poi il giro breve; il reset torna sempre all'esterno
let attract = false, lastInput = performance.now(), kioskTimer = null;
function kioskAttract() { attract = true; clearTimeout(kioskTimer); CUES = CUES_S; END = END_S; $('tapcta').hidden = false; goSheet(false); tettoGoal = 0;
  kioskTimer = setTimeout(() => { tettoGoal = 1; kioskTimer = setTimeout(() => { if (attract) jump(0, true); }, 2200); }, 3000); }
function kioskStory(i) { attract = false; clearTimeout(kioskTimer); $('tapcta').hidden = true; CUES = CUES_R; END = END_R; jump(i, true); lastInput = performance.now(); }
function kioskAfterEnd() { clearTimeout(kioskTimer); $('kband').hidden = false; kioskTimer = setTimeout(kioskAttract, attract ? 9000 : 14000); }

// ---------- avvio ----------
testiFissi(); setCard(INTRO()); syncButtons(); if (KIOSK) $('kband').hidden = false; applicaQualita();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { resize(); if (mode === 'sheet') { cam.t.copy(goal.t); cam.d = goal.d * 1.1; } });
cam.t.copy(posaTavola().t); cam.d = posaTavola().d * 1.25; camera.position.copy(cam.t).addScaledVector(DIR, cam.d); camera.lookAt(cam.t);
if (VIDEO) $('loading').remove(); else renderer.compileAsync(scene, camera).catch(() => {}).finally(() => { $('loading').classList.add('done'); });
if (VIDEO) {
  // 4 s di esterno con il tetto (si alza da 1,6 s), poi il giro sui tempi di lettura e 8 s di chiusura con il QR
  document.documentElement.classList.add('video'); interacted = true; let vt = 0; const INTRO_S = 4;
  window.__video = { duration: INTRO_S + END_R + 8, intro: INTRO_S, step(dt) { vt += dt; if (vt > 1.6) tettoGoal = 1;
    if (vt >= INTRO_S && mode === 'sheet' && !ended) jump(0, true); if (ended && $('kband').hidden) $('kband').hidden = false; frame(performance.now(), dt); return vt; } };
  frame(performance.now(), 0);
} else if (KIOSK) {
  document.documentElement.classList.add('kiosk'); $('kband').hidden = false;
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { lastInput = performance.now(); }, { capture: true, passive: true }));
  addEventListener('contextmenu', e => e.preventDefault());
  $('tapcta').onclick = () => kioskStory(0);
  setInterval(() => { if (!attract && performance.now() - lastInput > 45000 && !(mode === 'tour' && playing)) kioskAttract(); }, 2000);
  try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {}
  addEventListener('error', () => setTimeout(() => location.reload(), 5000));
  setTimeout(kioskAttract, 400); requestAnimationFrame(frame);
} else { requestAnimationFrame(frame);
  // avvio automatico a 20 s (prima 14 s, partiva mentre si leggeva la scheda); dopo 9 s il pulsante «Avvia il giro» si fa notare (P3 n. 23)
  if (!RM) { setTimeout(() => { if (!interacted && mode === 'sheet') $('play').classList.add('invito'); }, 9000);
    setTimeout(() => { if (!interacted && mode === 'sheet' && !document.hidden) jump(0, true); }, 20000); } }
window.__rf = { scene, renderer, camera, info: () => renderer.info.render, jump, livello: () => liv, tetto: v => { tettoGoal = v; sporco = true; }, tempo: v => { T = v; sporco = true; },   // tempo: prove a un istante preciso delle animazioni
  post: () => ({ composer, gtao, smaa, sole }),
  guarda(t, pos) { interacted = true; mode = 'free'; syncButtons(); controls.target.set(...t); camera.position.set(...pos); controls.update(); sporco = true; } };   // controlli e foto
