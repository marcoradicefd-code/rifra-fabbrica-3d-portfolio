// Persone 3D (30/09/2026): sostituiscono i manichini a capsule. Tutto generato nel codice, niente GLB.
//
// Da dove vengono le tecniche (repository dei giochi del video, ricerca/VIDEO-GIOCHI-TECNICHE.md):
// - Inkwave (github.com/jaydendavisnc/inkwave, src/game/character-geo.js, character-outfit.js, docs/RIG.md): corpo in «spazio persona»
//   con ossa a orientamento di riposo identità; arti ottenuti per «loft» lungo il percorso spalla-gomito-polso (anca-ginocchio-caviglia)
//   con sezioni anatomiche (deltoide, bicipite, gomito, polpaccio come gobbe gaussiane); pesi dello skinning calcolati dalla lunghezza
//   d'arco con raccordi smoothstep sulle articolazioni; occlusione per vertice calcolata una volta (dischi pesati per area, bakeBodyAO);
//   dita con riposo «mano rilassata» e flessione attorno all'asse Z locale; passo con piedi bloccati a terra e IK a due ossa.
// - Spiderbench (github.com/xikhar/spiderbench, src/world/npc/crowd.js): TUTTE le persone in una sola InstancedMesh con skinning su GPU;
//   le matrici delle ossa stanno in una texture letta con texelFetch; corporatura (magro/robusto) applicata nel vertex shader alla posa
//   di riposo; parti opzionali (acconciature, grembiule, occhiali) accese per persona e «collassate» se spente; abiti e viso DIPINTI
//   in base alla posizione di riposo (orli, maniche, calzoncini, sopracciglia, barba, attaccatura dei capelli) invece che modellati;
//   cadenza del passo dai dati umani (Hz = 0,535 + 0,285·v) e falcata = v / Hz (src/player/anim/animator.js): i piedi non scivolano.
// - Spiderbench / Inkwave: materiale unico con onBeforeCompile e customDepthMaterial con lo stesso skinning per le ombre.
// Costo: 1 chiamata di disegno per tutte le persone (+1 nella mappa delle ombre), qualunque sia il loro numero.
//
// Aspetto dalle fonti (ricerca/TABELLA-FATTI.md, foto F e fotogrammi V): magliette nere, pantaloni scuri o jeans, nessun casco né
// cappellino; alla verniciatura grembiule blu e guanti (F 7452: guanti verdi con polsino giallo, calzoncini, calze bianche, scarpe
// nere con suola bianca, barba); F 7453: maglietta e pantaloni neri, occhiali; V f_009: maglia rossa nel magazzino.
// Altezze, corporature, carnagioni e acconciature variano in modo deterministico (illustrativo, non sono persone reali).
//
// Unità: metri. Spazio persona: piedi a y = 0, sguardo verso +Z, sinistra della persona = +X.
import * as THREE from 'three';

const V3 = THREE.Vector3, Q = THREE.Quaternion;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (x, s) => Math.exp(-((x / s) ** 2));
const TAU = Math.PI * 2;

// ------------------------------------------------------------------------------------------------------------------------------
// Scheletro: 23 ossa, persona di 1,75 m (canone di 7,5 teste). [nome, genitore, riposo]
// ------------------------------------------------------------------------------------------------------------------------------
const OSSA = [
  ['anca', -1, [0, .97, 0]], ['schiena', 0, [0, 1.09, -.005]], ['petto', 1, [0, 1.25, -.012]], ['collo', 2, [0, 1.465, -.022]], ['testa', 3, [0, 1.575, -.01]],
  ['claL', 2, [.03, 1.43, -.012]], ['omeroL', 5, [.185, 1.425, -.025]], ['avambL', 6, [.2, 1.12, -.035]], ['manoL', 7, [.205, .865, -.01]], ['ditaL', 8, [.207, .772, -.002]],
  ['claR', 2, [-.03, 1.43, -.012]], ['omeroR', 10, [-.185, 1.425, -.025]], ['avambR', 11, [-.2, 1.12, -.035]], ['manoR', 12, [-.205, .865, -.01]], ['ditaR', 13, [-.207, .772, -.002]],
  ['femoreL', 0, [.092, .915, 0]], ['tibiaL', 15, [.095, .49, .012]], ['piedeL', 16, [.095, .075, -.015]], ['puntaL', 17, [.095, .022, .128]],
  ['femoreR', 0, [-.092, .915, 0]], ['tibiaR', 19, [-.095, .49, .012]], ['piedeR', 20, [-.095, .075, -.015]], ['puntaR', 21, [-.095, .022, .128]],
];
const NB = OSSA.length, REST = OSSA.map(o => new V3(...o[2])), PAD = OSSA.map(o => o[1]);
const B = Object.fromEntries(OSSA.map((o, i) => [o[0], i]));
const NP = 10;                     // texel di tavolozza per persona dopo le 3 × NB righe delle matrici
const TEX_W = NB * 3 + NP;
// regioni (dipinte nello shader) e parti opzionali (bit della maschera per persona)
const R = { busto: 1, braccio: 2, mano: 3, gamba: 4, testa: 5, collo: 6, capelli: 7, scarpa: 8, manica: 9, grembiule: 10, orlo: 11, occhiali: 12 };
const OPT = { corti: 1, medi: 2, sfumati: 3, stempiato: 4, raccolti: 5, grembiule: 6, occhiali: 7, manica: 8 };
const STILI = { rasati: 0, corti: 1, medi: 2, sfumati: 3, stempiato: 4, raccolti: 5 };
const HC = new V3(0, 1.635, .012), HR = new V3(.077, .114, .097);   // centro e semiassi della testa

// ------------------------------------------------------------------------------------------------------------------------------
// Costruttore della geometria: posizioni, normali, ossa (4), pesi (4), [regione, bit opzionale, occlusione]
// ------------------------------------------------------------------------------------------------------------------------------
class Corpo {
  constructor() { this.P = []; this.N = []; this.SI = []; this.SW = []; this.RO = []; this.I = []; }
  add(geo, reg, opt, pesi) {
    const p = geo.attributes.position, n = geo.attributes.normal, base = this.P.length / 3, v = new V3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i)); this.P.push(v.x, v.y, v.z); this.N.push(n.getX(i), n.getY(i), n.getZ(i));
      const w = pesi(v, i).filter(e => e[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4); const s = w.reduce((q, e) => q + e[1], 0) || 1;
      for (let k = 0; k < 4; k++) { this.SI.push(w[k] ? w[k][0] : 0); this.SW.push(w[k] ? w[k][1] / s : 0); }
      this.RO.push(reg, opt, 1);
    }
    const ix = geo.index.array; for (let k = 0; k < ix.length; k++) this.I.push(base + ix[k]);
  }
  geometria() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('aSI', new THREE.Float32BufferAttribute(this.SI, 4)); g.setAttribute('aSW', new THREE.Float32BufferAttribute(this.SW, 4));
    g.setAttribute('aRO', new THREE.Float32BufferAttribute(this.RO, 3)); g.setIndex(this.I.length > 65535 ? new THREE.Uint32BufferAttribute(this.I, 1) : new THREE.Uint16BufferAttribute(this.I, 1));
    g.computeBoundingSphere(); return g;
  }
}
// griglia chiusa in u (anelli) con poli facoltativi; normali calcolate e girate verso l'esterno del centro dell'anello di mezzo
function anelli(righe, poloA, poloB, centro) {
  const nu = righe[0].length, pos = [], idx = [];
  righe.forEach(r => r.forEach(p => pos.push(p.x, p.y, p.z)));
  for (let j = 0; j < righe.length - 1; j++) for (let i = 0; i < nu; i++) { const a = j * nu + i, b = j * nu + (i + 1) % nu, c = a + nu, d = b + nu; idx.push(a, b, d, a, d, c); }
  if (poloA) { const k = pos.length / 3; pos.push(poloA.x, poloA.y, poloA.z); for (let i = 0; i < nu; i++) idx.push(k, (i + 1) % nu, i); }
  if (poloB) { const k = pos.length / 3, o = (righe.length - 1) * nu; pos.push(poloB.x, poloB.y, poloB.z); for (let i = 0; i < nu; i++) idx.push(k, o + i, o + (i + 1) % nu); }
  return orienta(geoDa(pos, idx), centro || (() => { const jm = righe.length >> 1; const c = new V3(); righe[jm].forEach(p => c.add(p)); return c.divideScalar(nu); })());
}
function geoDa(pos, idx) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
// normali verso l'esterno: se la maggioranza guarda verso il centro, si inverte l'ordine dei vertici dei triangoli
function orienta(g, c) {
  const p = g.attributes.position, n = g.attributes.normal; let s = 0;
  for (let i = 0; i < p.count; i++) s += (p.getX(i) - c.x) * n.getX(i) + (p.getY(i) - c.y) * n.getY(i) + (p.getZ(i) - c.z) * n.getZ(i);
  if (s < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } g.computeVertexNormals(); }
  return g;
}
// tabella lineare [[x, v], …]
const tab = k => x => { if (x <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (x <= k[i][0]) { const [x0, v0] = k[i - 1], [x1, v1] = k[i]; return lerp(v0, v1, (x - x0) / (x1 - x0)); } return k[k.length - 1][1]; };
// percorso di un arto (Inkwave, limbPath): punti → centro, tangente e riferimento laterale/frontale alla lunghezza d'arco s
function percorso(pts, lat) {
  const P = pts.map(p => p.clone()), S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + P[i].distanceTo(P[i - 1]));
  const Z = new V3(0, 0, 1), Y = new V3(0, 1, 0);
  return { len: S[S.length - 1], S, at(s) {
    let i = 1; while (i < P.length - 1 && S[i] < s) i++; const u = (s - S[i - 1]) / (S[i] - S[i - 1]);
    const C = P[i - 1].clone().lerp(P[i], u), d = P[i].clone().sub(P[i - 1]).normalize();
    // tangente raccordata vicino ai punti interni (niente pieghe nette al gomito e al ginocchio)
    if (i < P.length - 1 && S[i] - s < .03) { const d2 = P[i + 1].clone().sub(P[i]).normalize(); d.lerp(d2, .5 * (1 - (S[i] - s) / .03)).normalize(); }
    if (i > 1 && s - S[i - 1] < .03) { const d0 = P[i - 1].clone().sub(P[i - 2]).normalize(); d.lerp(d0, .5 * (1 - (s - S[i - 1]) / .03)).normalize(); }
    const l = lat.clone().addScaledVector(d, -lat.dot(d)); if (l.lengthSq() < 1e-4) l.copy(Math.abs(d.z) < .9 ? Z : Y).addScaledVector(d, -(Math.abs(d.z) < .9 ? d.z : d.y));
    l.normalize(); const f = new V3().crossVectors(d, l).normalize();   // terna ortonormale (d, l, f): a riposo f = +Z
    return { C, d, l, f };
  } };
}
// loft di un arto: righe alle lunghezze ss, nTh punti attorno (θ = 0 laterale, π/2 davanti); sez(θ, s) → [raggio laterale, raggio frontale]
function loft(path, ss, nTh, sez, capA, capB) {
  const righe = [], info = [];
  for (const s of ss) { const fr = path.at(s), r = [];
    for (let i = 0; i < nTh; i++) { const th = i / nTh * TAU, [a, b] = sez(th, s); r.push(fr.C.clone().addScaledVector(fr.l, a).addScaledVector(fr.f, b)); }
    righe.push(r); info.push(fr); }
  const pA = capA ? info[0].C.clone().addScaledVector(info[0].d, -capA) : null, pB = capB ? info[info.length - 1].C.clone().addScaledVector(info[info.length - 1].d, capB) : null;
  const g = anelli(righe, pA, pB, info[ss.length >> 1].C);
  // s di ogni vertice (per i pesi): righe in ordine, poi i poli
  const sv = []; ss.forEach(s => { for (let i = 0; i < nTh; i++) sv.push(s); }); if (pA) sv.push(ss[0] - capA); if (pB) sv.push(ss[ss.length - 1] + capB);
  return { g, sv };
}
const campioni = (a, b, n, dens) => { const out = [], N = 400, acc = [0]; for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + dens(lerp(a, b, (i - .5) / N))); const tot = acc[N];
  for (let k = 0; k < n; k++) { const q = k / (n - 1) * tot; let i = 1; while (i < N && acc[i] < q) i++; const u = (q - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]); out.push(lerp(a, b, (i - 1 + u) / N)); } return out; };

// ------------------------------------------------------------------------------------------------------------------------------
// Forme
// ------------------------------------------------------------------------------------------------------------------------------
// busto: sezioni a superellisse (mezza larghezza a, mezza profondità b, centro c in z, esponente n) per quota; gobbe anatomiche
const TA = tab([[.86, .06], [.88, .1], [.91, .145], [.93, .16], [.95, .168], [1.0, .16], [1.05, .15], [1.1, .146], [1.15, .149], [1.2, .156], [1.25, .164], [1.3, .17], [1.35, .175], [1.39, .178], [1.42, .175], [1.445, .166], [1.465, .148], [1.48, .122], [1.492, .094], [1.502, .07], [1.51, .058]]);
const TB = tab([[.86, .04], [.88, .07], [.91, .095], [.93, .102], [.95, .106], [1.0, .102], [1.05, .098], [1.1, .099], [1.15, .104], [1.2, .111], [1.25, .117], [1.3, .118], [1.35, .112], [1.39, .103], [1.42, .094], [1.445, .084], [1.465, .074], [1.48, .066], [1.492, .06], [1.502, .055], [1.51, .052]]);
const TC = tab([[.84, 0], [.9, -.008], [.95, -.012], [1.0, -.006], [1.05, .003], [1.1, .008], [1.2, .01], [1.3, .006], [1.35, -.002], [1.4, -.012], [1.45, -.022], [1.5, -.022]]);
const TN = tab([[.84, 2.2], [.95, 2.5], [1.1, 2.4], [1.3, 2.7], [1.42, 2.4], [1.5, 2.1]]);
function puntoBusto(th, y, extra = 0) {
  const c = Math.cos(th), s = Math.sin(th), n = TN(y), a = TA(y) + extra, b = TB(y) + extra;
  let x = a * Math.sign(c) * Math.abs(c) ** (2 / n), z = b * Math.sign(s) * Math.abs(s) ** (2 / n);
  const ax = Math.abs(x);
  if (z > 0) { z += .013 * gauss(y - 1.3, .055) * gauss(ax - .085, .055) + .006 * gauss(y - 1.03, .07) * gauss(x, .1); z -= .004 * gauss(x, .012) * gauss(y - 1.2, .15); }   // pettorali, ventre, sterno
  else { z -= .014 * gauss(y - .93, .05) * gauss(ax - .07, .055) + .008 * gauss(y - 1.33, .07) * gauss(ax - .09, .05); z += .005 * gauss(x, .015) * sstep(.98, 1.1, y); }   // glutei, scapole, solco della schiena
  return new V3(x, y, z + TC(y));
}
function pesiBusto(p) {
  const y = p.y, ax = Math.abs(p.x), s = p.x > 0 ? 'L' : 'R';
  const a = sstep(.98, 1.12, y), b = sstep(1.13, 1.25, y);
  let w = [[B.anca, 1 - a], [B.schiena, a * (1 - b)], [B.petto, b]];
  const wu = sstep(.12, .175, ax) * sstep(1.3, 1.4, y) * .45, wc = .5 * sstep(.06, .12, ax) * sstep(1.36, 1.44, y) * (1 - wu), wn = .35 * sstep(1.455, 1.495, y) * (1 - sstep(.05, .08, ax));
  const k = wu + wc + wn; if (k > 0) { for (const e of w) e[1] *= 1 - k; w.push([B['omero' + s], wu], [B['cla' + s], wc], [B.collo, wn]); }
  return w;
}
function addBusto(C, lv) {
  const ys = campioni(.865, 1.51, lv ? 26 : 14, y => 1 + 1.4 * gauss(y - 1.44, .05) + .6 * gauss(y - .92, .04)), nu = lv ? 28 : 14;
  const righe = ys.map(y => Array.from({ length: nu }, (_, i) => puntoBusto(i / nu * TAU + Math.PI / 2, y)));
  C.add(anelli(righe, new V3(0, .855, -.004), new V3(0, 1.518, -.022)), R.busto, 0, pesiBusto);   // l'orlo della maglietta è dipinto (niente gradino)
}
// braccia (Inkwave armSpec): raggio base per lunghezza d'arco, gobbe muscolari, gomito, polso schiacciato
const AR = tab([[-.03, .024], [-.02, .035], [-.01, .042], [0, .045], [.04, .046], [.09, .046], [.15, .044], [.21, .041], [.26, .037], [.29, .0355], [.31, .036], [.34, .038], [.38, .037], [.43, .032], [.48, .027], [.53, .0235], [.56, .022], [.58, .021]]);
function specBraccio(sx) {
  const s = sx > 0 ? 'L' : 'R', S = REST[B['omero' + s]], E = REST[B['avamb' + s]], W = REST[B['mano' + s]];
  const o = .03, path = percorso([S.clone().add(new V3(-.025 * sx, o, .002)), S, E, W, W.clone().add(new V3(0, -.03, .004))], new V3(sx, 0, 0));
  const sE = path.S[1] + S.distanceTo(E), sW = sE + E.distanceTo(W), s0 = path.S[1];
  const sez = (th, s) => { const c = Math.cos(th), n = Math.sin(th), fr = Math.max(0, n), bk = Math.max(0, -n), lt = Math.max(0, c);
    let k = 1 + .04 * gauss(s - .09, .045) * lt * lt + .08 * gauss(s - .2, .05) * fr * fr + .06 * gauss(s - .17, .05) * bk * bk;
    k += .16 * gauss(s - sE - .003, .018) * bk ** 4 - .05 * gauss(s - sE, .02) * fr * fr + .08 * gauss(s - sE - .05, .035) * Math.max(0, .7 * c + .7 * n) ** 2;
    const r = AR(s - s0) * k, lat = lerp(1, .74, sstep(sE + .06, sW, s)), fwd = lerp(1, 1.12, sstep(sE + .06, sW, s));
    return [c * r * lat, n * r * fwd]; };
  return { s, path, sE, sW, sez, s0 };
}
function pesiBraccio(A, sv) {
  return (p, i) => { const q = sv[i]; const wF = sstep(A.sE - .025, A.sE + .03, q), wH = sstep(A.sW - .012, A.sW + .012, q), wC = .35 * (1 - sstep(.0, .09, q));
    return [[B['cla' + A.s], wC], [B['omero' + A.s], (1 - wF) * (1 - wC)], [B['avamb' + A.s], wF * (1 - wH)], [B['mano' + A.s], wF * wH]]; };
}
function addBraccia(C, lv) {
  for (const sx of [1, -1]) {
    const A = specBraccio(sx), ss = campioni(0, A.sW + .012, lv ? 22 : 11, x => 1 + 1.5 * gauss(x - A.sE, .03) + .8 * gauss(x - A.sW, .02) + .6 * gauss(x - .04, .03));
    const { g, sv } = loft(A.path, ss, lv ? 12 : 7, A.sez, .015, 0); C.add(g, R.braccio, 0, pesiBraccio(A, sv));
    // manica della maglietta: tubo aperto poco più largo del braccio, un po' svasato in fondo
    const sm = campioni(A.s0 - .008, A.s0 + .165, lv ? 6 : 3, () => 1), m = loft(A.path, sm, lv ? 14 : 8, (th, s) => { const [a, b] = A.sez(th, s), r = Math.hypot(a, b) || 1, e = .0035 + .005 * sstep(A.s0 + .05, A.s0 + .165, s); return [a + a / r * e, b + b / r * e]; }, .012, 0);
    C.add(m.g, R.manica, OPT.manica, pesiBraccio(A, m.sv));
  }
}
// mani: palmo, quattro dita (su un osso «dita» che si flette) e pollice. Riposo: palmo verso la coscia, pollice in avanti
function addMani(C, lv) {
  for (const sx of [1, -1]) {
    const s = sx > 0 ? 'L' : 'R', W = REST[B['mano' + s]], nu = lv ? 12 : 6;
    // palmo: superellisse schiacciata (spessore in x, larghezza in z)
    const righe = [], ys = campioni(W.y + .005, W.y - .1, lv ? 8 : 4, () => 1);
    ys.forEach(y => { const t = (W.y - y) / .1, hx = lerp(.0125, .0155, Math.min(1, t * 1.5)), hz = lerp(.024, .042, sstep(0, .55, t)) * (1 - .12 * sstep(.85, 1, t)); const r = [];
      for (let i = 0; i < nu; i++) { const th = i / nu * TAU, c = Math.cos(th), n = Math.sin(th); r.push(new V3(W.x + .002 * sx + sx * hx * Math.sign(c) * Math.abs(c) ** .85, y, W.z + .002 + hz * Math.sign(n) * Math.abs(n) ** .8)); }
      righe.push(r); });
    C.add(anelli(righe, new V3(W.x, W.y + .01, W.z), new V3(W.x + .002 * sx, W.y - .104, W.z)), R.mano, 0, p => [[B['mano' + s], 1]]);
    // dita: tubi con punta arrotondata, leggermente piegati verso il palmo
    const K = REST[B['dita' + s]];
    [[.027, .0092, .07], [.009, .0096, .078], [-.009, .0091, .074], [-.026, .0081, .058]].forEach(([dz, r, L]) => {
      const p0 = new V3(K.x + .001 * sx, K.y + .008, K.z + dz * .95), pts = [p0]; for (let k = 1; k <= 3; k++) { const u = k / 3; pts.push(p0.clone().add(new V3(-sx * .012 * u * u, -L * u, dz * .08 * u))); }
      const f = loft(percorso(pts, new V3(sx, 0, 0)), campioni(0, L, lv ? 5 : 2, () => 1), lv ? 6 : 4, (th, q) => { const rr = r * (1 - .18 * q / L); return [Math.cos(th) * rr * .92, Math.sin(th) * rr]; }, .003, r * .9);
      C.add(f.g, R.mano, 0, (p, i) => { const w = sstep(.0, .012, f.sv[i]); return [[B['mano' + s], 1 - w], [B['dita' + s], w]]; }); });
    // pollice: dalla base del palmo in avanti e verso il basso
    const t0 = new V3(W.x - .003 * sx, W.y - .03, W.z + .03), tp = [t0, t0.clone().add(new V3(-.01 * sx, -.03, .017)), t0.clone().add(new V3(-.018 * sx, -.06, .025))];
    const th = loft(percorso(tp, new V3(sx, 0, 0)), campioni(0, .07, lv ? 5 : 2, () => 1), lv ? 6 : 4, (a, q) => { const rr = lerp(.0125, .0088, q / .07); return [Math.cos(a) * rr, Math.sin(a) * rr]; }, .004, .008);
    C.add(th.g, R.mano, 0, () => [[B['mano' + s], 1]]);
  }
}
// gambe (Inkwave legSpec2) con la sagoma dei pantaloni: dritte, poco anatomiche; lo shader le assottiglia sotto l'orlo dei calzoncini
const LR = tab([[-.09, .07], [-.05, .082], [0, .086], [.06, .084], [.14, .078], [.22, .072], [.3, .066], [.38, .06], [.425, .057], [.47, .0565], [.55, .055], [.64, .05], [.72, .046], [.8, .044], [.86, .043]]);
function addGambe(C, lv) {
  for (const sx of [1, -1]) {
    const s = sx > 0 ? 'L' : 'R', H = REST[B['femore' + s]], K = REST[B['tibia' + s]], A = REST[B['piede' + s]];
    const path = percorso([H.clone().add(new V3(-.004 * sx, .09, -.004)), H, K, A, A.clone().add(new V3(0, -.03, 0))], new V3(sx, 0, 0));
    const o = .09, sK = o + H.distanceTo(K), sA = sK + K.distanceTo(A);
    const sez = (th, q) => { const c = Math.cos(th), n = Math.sin(th), fr = Math.max(0, n), bk = Math.max(0, -n);
      let k = 1 + .04 * gauss(q - o - .15, .07) * fr * fr + .07 * gauss(q - sK - .09, .06) * bk ** 1.5 - .03 * gauss(q - sK, .03) * (1 - Math.abs(n));
      const r = LR(q - o) * k; return [c * r, n * r * .97]; };
    const ss = campioni(0, sA + .02, lv ? 22 : 11, x => 1 + 1.6 * gauss(x - sK, .05) + .8 * gauss(x - o, .05) + .6 * gauss(x - sA, .04));
    const { g, sv } = loft(path, ss, lv ? 14 : 8, sez, .03, .02);
    C.add(g, R.gamba, 0, (p, i) => { const q = sv[i], wT = sstep(o - .07, o + .06, q), wS = sstep(sK - .03, sK + .03, q), wA = sstep(sA - .03, sA + .005, q);
      return [[B.anca, 1 - wT], [B['femore' + s], wT * (1 - wS)], [B['tibia' + s], wT * wS * (1 - wA)], [B['piede' + s], wT * wS * wA]]; });
  }
}
// scarpe: loft lungo z di sezioni «rettangolo arrotondato» (tomaia + suola dipinta sotto 2,2 cm)
function addScarpe(C, lv) {
  for (const sx of [1, -1]) {
    const s = sx > 0 ? 'L' : 'R', A = REST[B['piede' + s]], zs = campioni(-.083, .19, lv ? 13 : 7, z => 1 + 2 * gauss(z - .19, .03) + 1.5 * gauss(z + .083, .03)), nu = lv ? 14 : 8;
    const W = tab([[-.083, .03], [-.07, .04], [-.03, .044], [.04, .047], [.1, .051], [.14, .05], [.17, .042], [.19, .028]]), Ht = tab([[-.083, .075], [-.06, .1], [-.02, .108], [.02, .1], [.06, .082], [.1, .066], [.15, .056], [.19, .04]]);
    const righe = zs.map(z => { const w = W(z), h = Ht(z), r = []; for (let i = 0; i < nu; i++) { const th = i / nu * TAU, c = Math.cos(th), n = Math.sin(th);
      r.push(new V3(A.x + sx * .004 + w * Math.sign(c) * Math.abs(c) ** .55, h / 2 + h / 2 * Math.sign(n) * Math.abs(n) ** .55, A.z + .015 + z)); } return r; });
    const g = anelli(righe, new V3(A.x, .045, A.z + .015 - .09), new V3(A.x, .025, A.z + .015 + .196), new V3(A.x, .04, A.z + .05));
    C.add(g, R.scarpa, 0, p => { const w = sstep(.11, .15, p.z - A.z); return [[B['piede' + s], 1 - w], [B['punta' + s], w]]; });
  }
}
function addCollo(C, lv) {
  const ys = campioni(1.42, 1.61, lv ? 8 : 4, () => 1), nu = lv ? 16 : 10;
  const righe = ys.map(y => { const t = (y - 1.42) / .19, r = lerp(.057, .05, t), zc = lerp(-.028, -.008, t), rr = []; for (let i = 0; i < nu; i++) { const th = i / nu * TAU; rr.push(new V3(Math.cos(th) * r, y, zc + Math.sin(th) * r * .93)); } return rr; });
  C.add(anelli(righe, null, null, new V3(0, 1.5, -.02)), R.collo, 0, p => { const a = sstep(1.43, 1.47, p.y), b = sstep(1.55, 1.6, p.y); return [[B.petto, 1 - a], [B.collo, a * (1 - b)], [B.testa, a * b]]; });
}
// testa: ellissoide deformato (mascella, mento, naso, arcate, orbite, zigomi, labbra, orecchie, nuca). Nessun occhio disegnato «da cartone»
export function puntoTesta(az, el, out = new V3()) {
  const ce = Math.cos(el), dx = Math.sin(az) * ce, dy = Math.sin(el), dz = Math.cos(az) * ce, aaz = Math.abs(az), fr = Math.max(0, Math.cos(az)), bk = Math.max(0, -Math.cos(az));
  let kx = 1, ky = 1 + .04 * sstep(0, -.6, el), kz = 1;
  const giu = sstep(.15, 1.05, -el); kx *= 1 - .27 * giu; kz *= 1 - .42 * sstep(.05, .75, -el) * bk; kz *= 1 - .045 * fr * gauss(el, .6); kz *= 1 - .08 * giu * fr;
  let r = 0;
  r += fr * (.022 * gauss(az, .12) * gauss(el + .1, .13) + .009 * gauss(az, .09) * gauss(el - .05, .12));           // naso (punta e dorso)
  r += .006 * gauss(el - .2, .07) * gauss(az, .55) * fr - .01 * gauss(aaz - .36, .13) * gauss(el - .08, .09);      // arcate, orbite
  r += .005 * gauss(aaz - .75, .2) * gauss(el + .03, .13);                                                       // zigomi
  r += fr * (.004 * gauss(el + .36, .04) * gauss(az, .22) + .0045 * gauss(el + .46, .045) * gauss(az, .2) - .003 * gauss(el + .405, .016) * gauss(az, .2)); // labbra
  r += .007 * gauss(el + .78, .15) * gauss(az, .3) * fr;                                                          // mento
  r += .014 * gauss(aaz - 1.68, .085) * gauss(el + .03, .17) - .005 * gauss(aaz - 1.68, .045) * gauss(el + .02, .07);   // orecchie (padiglione e conca)
  r += .007 * gauss(el - .15, .4) * bk;                                                                          // nuca
  return out.set(HC.x + dx * (HR.x * kx + r), HC.y + dy * (HR.y * ky + r), HC.z + dz * (HR.z * kz + r));
}
function righeTesta(nu, nv, off) {
  const out = []; for (let j = 1; j < nv; j++) { const el = -Math.PI / 2 + j / nv * Math.PI, r = [];
    for (let i = 0; i < nu; i++) { const az = -Math.PI + i / nu * TAU, p = puntoTesta(az, el); if (off) off(p, az, el); r.push(p); } out.push(r); }
  return out;
}
function addTesta(C, lv) {
  const nu = lv ? 36 : 18, nv = lv ? 22 : 11;
  C.add(anelli(righeTesta(nu, nv), puntoTesta(0, -Math.PI / 2 + .001), puntoTesta(0, Math.PI / 2 - .001), HC), R.testa, 0,
    p => { const w = .45 * sstep(1.56, 1.5, p.y) * sstep(.0, -.05, p.z - HC.z + .02); return [[B.testa, 1 - w], [B.collo, w]]; });
}
// attaccatura dei capelli (elevazione per azimut assoluto, radianti): fronte, tempie, basette, sopra l'orecchio, nuca
export const LINEA_CAPELLI = [[0, .44], [.4, .47], [.6, .55], [.8, .45], [1.05, .22], [1.3, -.1], [1.42, -.06], [1.52, .13], [1.82, .13], [2.0, -.08], [2.4, -.42], [Math.PI, -.55]];
const HL = tab(LINEA_CAPELLI);
function spessoreCapelli(stile, az, el) {
  const aaz = Math.abs(az), m = sstep(HL(aaz), HL(aaz) + .12, el), top = sstep(.25, 1.2, el), front = Math.max(0, Math.cos(az));
  switch (stile) {
    case 1: return m * (.004 + .008 * top + .005 * front * gauss(el - .75, .25));
    case 2: return m * (.008 + .016 * top + .01 * front * gauss(el - .7, .25) + .004 * gauss(az - .4, .5) * top);
    case 3: return sstep(.45, .8, el) * (.0025 + .006 * sstep(.6, 1.2, el) + .004 * front * gauss(el - .85, .3));
    case 4: return m * (1 - sstep(.3, .5, el + .25 * front)) * .005;
    case 5: return m * (.009 + .01 * top);
  }
  return 0;
}
function addCapelli(C, lv) {
  const nu = lv ? 28 : 16, nv = lv ? 20 : 11;
  for (const [nome, st] of [['corti', 1], ['medi', 2], ['sfumati', 3], ['stempiato', 4], ['raccolti', 5]]) {
    const pos = [], idx = [], id = new Map(), p = new V3(), nn = new V3();
    const vert = (i, j) => { const k = (i % nu) + ',' + j; if (id.has(k)) return id.get(k); const az = -Math.PI + (i % nu) / nu * TAU, el = -Math.PI / 2 + j / nv * Math.PI;
      const t = spessoreCapelli(st, az, el); puntoTesta(az, el, p); nn.copy(p).sub(HC).divide(HR).divide(HR).normalize(); p.addScaledVector(nn, t + .0012);
      pos.push(p.x, p.y, p.z); id.set(k, pos.length / 3 - 1); return pos.length / 3 - 1; };
    for (let j = 1; j < nv - 1; j++) for (let i = 0; i < nu; i++) {
      const azs = [i, i + 1].map(q => -Math.PI + (q % nu) / nu * TAU), els = [j, j + 1].map(q => -Math.PI / 2 + q / nv * Math.PI);
      if (azs.some(a => els.some(e => spessoreCapelli(st, a, e) < 4e-4))) continue;
      const a = vert(i, j), b = vert(i + 1, j), c = vert(i, j + 1), d = vert(i + 1, j + 1); idx.push(a, b, d, a, d, c); }
    // calotta in cima (polo)
    { const k = pos.length / 3, top = puntoTesta(0, Math.PI / 2 - .001); const t = spessoreCapelli(st, 0, Math.PI / 2 - .01);
      if (t > 4e-4) { pos.push(top.x, top.y + t + .0012, top.z); for (let i = 0; i < nu; i++) { const a = vert(i, nv - 1), b = vert(i + 1, nv - 1); idx.push(a, b, k); } } }
    const g = orienta(geoDa(pos, idx), HC);
    C.add(g, R.capelli, OPT[nome], () => [[B.testa, 1]]);
    // raccolti: crocchia sulla nuca
    if (st === 5) { const sf = new THREE.SphereGeometry(.042, lv ? 12 : 7, lv ? 8 : 5); sf.scale(1, .85, .8); sf.translate(HC.x, HC.y + .05, HC.z - .105); C.add(sf, R.capelli, OPT[nome], () => [[B.testa, 1]]); }
  }
}
// grembiule con pettorina (F 7452): lastra sottile davanti al busto e alle cosce, laccio attorno al collo
function addGrembiule(C, lv) {
  const ys = campioni(1.36, .5, lv ? 22 : 10, () => 1), nx = lv ? 12 : 6, front = [], back = [];
  const zDavanti = (x, y) => { const zb = (() => { const a = TA(y), b = TB(y), n = TN(y), u = clamp(Math.abs(x) / a, 0, .999); return TC(y) + b * (1 - u ** n) ** (1 / n) + .013 * gauss(y - 1.3, .055) * gauss(Math.abs(x) - .085, .055); })();
    const zc = .104 - .5 * x * x; return y > .95 ? zb : y < .86 ? zc : lerp(zc, zb, sstep(.86, .95, y)); };
  const W = tab([[.5, .215], [.86, .205], [1.0, .2], [1.08, .17], [1.16, .12], [1.36, .11]]);
  ys.forEach(y => { const w = y > .95 ? Math.min(W(y), TA(y) - .012) : W(y), r1 = [], r2 = []; for (let i = 0; i <= nx; i++) { const x = lerp(-w, w, i / nx), z = Math.max(zDavanti(x, y), y < 1.05 ? .08 : -1) + .012; r1.push(new V3(x, y, z)); r2.push(new V3(x, y, z - .005)); } front.push(r1); back.push(r2); });
  const pos = [], idx = [], nr = ys.length, nc = nx + 1;
  for (const rr of [front, back]) rr.forEach(r => r.forEach(p => pos.push(p.x, p.y, p.z)));
  for (let j = 0; j < nr - 1; j++) for (let i = 0; i < nx; i++) { const a = j * nc + i, b = a + 1, c = a + nc, d = c + 1, o = nr * nc; idx.push(a, c, d, a, d, b, o + a, o + d, o + c, o + a, o + b, o + d); }
  const g = geoDa(pos, idx); const pw = p => { const y = p.y; if (y > 1.12) return [[B.petto, 1]]; if (y > 1.0) { const t = sstep(1.0, 1.12, y); return [[B.petto, t], [B.schiena, 1 - t]]; }
    const t = sstep(.95, .7, y); return [[B.anca, 1 - .7 * t], [B.femoreL, .35 * t], [B.femoreR, .35 * t]]; };
  // controllo del verso: la faccia davanti deve guardare +z
  { const n = g.attributes.normal; let s = 0; for (let i = 0; i < nr * nc; i++) s += n.getZ(i); if (s < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } g.computeVertexNormals(); } }
  C.add(g, R.grembiule, OPT.grembiule, pw);
  // laccio al collo e lacci in vita
  const laccio = (pts, r) => { const pth = percorso(pts, new V3(0, 1, 0)); const L = loft(pth, campioni(0, pth.len, lv ? 14 : 6, () => 1), 5, th => [Math.cos(th) * r, Math.sin(th) * r * .35], 0, 0); C.add(L.g, R.grembiule, OPT.grembiule, p => p.y > 1.4 ? [[B.collo, .5], [B.petto, .5]] : [[B.petto, 1]]); };
  laccio([new V3(.1, 1.355, .126), new V3(.085, 1.43, .08), new V3(.065, 1.49, .0), new V3(.04, 1.505, -.055), new V3(0, 1.5, -.072), new V3(-.04, 1.505, -.055), new V3(-.065, 1.49, 0), new V3(-.085, 1.43, .08), new V3(-.1, 1.355, .126)], .009);
  const cinta = []; for (let i = 0; i <= 16; i++) { const th = lerp(.35, Math.PI - .35, i / 16) + Math.PI; const p = puntoBusto(th, 1.035, .013); cinta.push(p); }
  const pth = percorso([new V3(.155, 1.035, .075), ...cinta.reverse(), new V3(-.155, 1.035, .075)], new V3(0, 1, 0)); const L = loft(pth, campioni(0, pth.len, lv ? 20 : 8, () => 1), 5, th => [Math.cos(th) * .01, Math.sin(th) * .0035], 0, 0);
  C.add(L.g, R.grembiule, OPT.grembiule, p => [[B.schiena, .5], [B.anca, .5]]);
}
// occhiali (F 7453): due montature arrotondate, ponte e aste fino alle orecchie
function addOcchiali(C, lv) {
  const tubo = (pts, r, chiuso) => { const P = chiuso ? [...pts, pts[0], pts[1]] : pts; const pth = percorso(P, new V3(0, 1, 0)); const L = loft(pth, campioni(0, chiuso ? pth.len - P[P.length - 1].distanceTo(P[P.length - 2]) : pth.len, lv ? 14 : 6, () => 1), 4, th => [Math.cos(th) * r, Math.sin(th) * r], 0, 0); C.add(L.g, R.occhiali, OPT.occhiali, () => [[B.testa, 1]]); };
  for (const sx of [1, -1]) {
    const c = puntoTesta(sx * .36, .07); c.z += .016; const pts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; pts.push(new V3(c.x + Math.cos(a) * .024 * (1 + .1 * Math.cos(a) ** 2), c.y + Math.sin(a) * .016, c.z - .004 * Math.abs(Math.cos(a)) - .003 * (sx * Math.cos(a) > 0 ? 1 : 0))); }
    tubo(pts, .0017, true);
    const e = puntoTesta(sx * 1.05, .08); e.x += sx * .006; const o = puntoTesta(sx * 1.62, .06); o.x += sx * .004;
    tubo([new V3(c.x + sx * .026, c.y + .004, c.z - .006), e, o, new V3(o.x - sx * .002, o.y - .02, o.z - .012)], .0014, false);
  }
  const l = puntoTesta(.15, .1), r = puntoTesta(-.15, .1); tubo([new V3(l.x - .012, l.y, l.z + .014), new V3(0, l.y + .003, l.z + .02), new V3(r.x + .012, r.y, r.z + .014)], .0015, false);
}

// ------------------------------------------------------------------------------------------------------------------------------
// Occlusione per vertice (Inkwave, bakeBodyAO semplificato): emettitori raggruppati in celle di 1,5 cm, dischi pesati per area.
// Occludono solo le parti sempre presenti; le parti opzionali la ricevono.
// ------------------------------------------------------------------------------------------------------------------------------
function occlusione(C) {
  const P = C.P, Nn = C.N, n = P.length / 3, area = new Float32Array(n), ix = C.I;
  for (let t = 0; t < ix.length; t += 3) { const a = ix[t], b = ix[t + 1], c = ix[t + 2];
    const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
    const ar = .5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 3; area[a] += ar; area[b] += ar; area[c] += ar; }
  const CELL = .015, RAD = .07, R2 = RAD * RAD, cl = new Map();
  for (let i = 0; i < n; i++) { if (C.RO[i * 3 + 1] !== 0 || area[i] <= 0) continue;
    const k = Math.floor(P[i * 3] / CELL) + ',' + Math.floor(P[i * 3 + 1] / CELL) + ',' + Math.floor(P[i * 3 + 2] / CELL) + ',' + (Nn[i * 3 + 2] > 0 ? 1 : 0) + (Nn[i * 3] > 0 ? 2 : 0);
    let e = cl.get(k); if (!e) cl.set(k, e = [0, 0, 0, 0, 0, 0, 0]); const A = area[i];
    e[0] += P[i * 3] * A; e[1] += P[i * 3 + 1] * A; e[2] += P[i * 3 + 2] * A; e[3] += Nn[i * 3] * A; e[4] += Nn[i * 3 + 1] * A; e[5] += Nn[i * 3 + 2] * A; e[6] += A; }
  const EM = [...cl.values()].map(e => { const A = e[6], l = Math.hypot(e[3], e[4], e[5]) || 1; return [e[0] / A, e[1] / A, e[2] / A, e[3] / l, e[4] / l, e[5] / l, A]; });
  const G = RAD, grid = new Map(), key = (x, y, z) => Math.floor(x / G) + ',' + Math.floor(y / G) + ',' + Math.floor(z / G);
  EM.forEach(e => { const k = key(e[0], e[1], e[2]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(e); });
  for (let i = 0; i < n; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], nx = Nn[i * 3], ny = Nn[i * 3 + 1], nz = Nn[i * 3 + 2];
    const gx = Math.floor(x / G), gy = Math.floor(y / G), gz = Math.floor(z / G); let occ = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const L = grid.get((gx + a) + ',' + (gy + b) + ',' + (gz + c)); if (!L) continue;
      for (const e of L) { const vx = e[0] - x, vy = e[1] - y, vz = e[2] - z, d2 = vx * vx + vy * vy + vz * vz; if (d2 > R2 || d2 < 1e-7) continue;
        const d = Math.sqrt(d2), dot = (nx * vx + ny * vy + nz * vz) / d; if (dot <= .05) continue;
        const ce = Math.abs(e[3] * vx + e[4] * vy + e[5] * vz) / d, f = 1 - d2 / R2; occ += dot * (.25 + .75 * ce) * (e[6] / (Math.PI * d2 + e[6])) * f * f; } }
    C.RO[i * 3 + 2] = clamp(1 - occ * 1.6, .25, 1); }
}

// due livelli di dettaglio (lv 1 da vicino, lv 0 da lontano), costruiti una volta
const GEO = [];
function geometriaCorpo(lv) {
  if (GEO[lv]) return GEO[lv];
  const C = new Corpo();
  addBusto(C, lv); addBraccia(C, lv); addMani(C, lv); addGambe(C, lv); addScarpe(C, lv); addCollo(C, lv); addTesta(C, lv); addCapelli(C, lv); addGrembiule(C, lv); addOcchiali(C, lv);
  occlusione(C); return (GEO[lv] = C.geometria());
}

// ------------------------------------------------------------------------------------------------------------------------------
// Materiale: skinning dalla texture delle ossa, corporatura, parti opzionali, abiti e viso dipinti
// ------------------------------------------------------------------------------------------------------------------------------
const GLSL_COMUNE = `
  attribute vec4 aSI; attribute vec4 aSW; attribute vec3 aRO; attribute float aPid;
  uniform highp sampler2D uOssa;
  vec4 pal(int k, int pid) { return texelFetch(uOssa, ivec2(${NB * 3} + k, pid), 0); }
  mat4 osso(int b, int pid) { ivec2 c = ivec2(b * 3, pid);
    vec4 r0 = texelFetch(uOssa, c, 0), r1 = texelFetch(uOssa, c + ivec2(1, 0), 0), r2 = texelFetch(uOssa, c + ivec2(2, 0), 0);
    return mat4(r0.x, r1.x, r2.x, 0.0, r0.y, r1.y, r2.y, 0.0, r0.z, r1.z, r2.z, 0.0, r0.w, r1.w, r2.w, 1.0); }
  mat4 pelle_skin(int pid) { mat4 m = osso(int(aSI.x + .5), pid) * aSW.x;
    if (aSW.y > 0.0) m += osso(int(aSI.y + .5), pid) * aSW.y; if (aSW.z > 0.0) m += osso(int(aSI.z + .5), pid) * aSW.z; if (aSW.w > 0.0) m += osso(int(aSI.w + .5), pid) * aSW.w; return m; }
  bool spenta(float bit, float mask) { return bit > 0.5 && mod(floor(mask / exp2(bit - 1.0)), 2.0) < 0.5; }
  // corporatura (Spiderbench bodyShape): g = robustezza, fem = forme femminili, orlo = quota dell'orlo dei pantaloni
  vec3 corporatura(vec3 p, int reg, float g, float fem, float orlo) {
    if (reg == 1 || reg == 11 || reg == 10) {
      float pancia = g > 0.0 ? exp(-pow((p.y - 1.06) / 0.11, 2.0)) : 0.0;
      p.x *= 1.0 + g * 0.8; p.z = p.z * (1.0 + g * (p.z > 0.0 ? 0.8 + 2.4 * pancia : 0.55));
      if (fem > 0.5) { p.x *= 1.0 - 0.1 * smoothstep(1.26, 1.42, p.y) + 0.09 * exp(-pow((p.y - 0.94) / 0.08, 2.0)) - 0.08 * exp(-pow((p.y - 1.1) / 0.07, 2.0));
        if (p.z > 0.0) p.z += 0.03 * exp(-pow((p.y - 1.3) / 0.055, 2.0)) * exp(-pow((abs(p.x) - 0.075) / 0.05, 2.0)); }
    } else if (reg == 2 || reg == 9 || reg == 3) {
      float sx = sign(p.x), ax = sx * (0.185 + 0.02 * clamp((1.425 - p.y) / 0.56, 0.0, 1.0));
      if (reg != 3) p.xz = vec2(ax, -0.025) + (p.xz - vec2(ax, -0.025)) * (1.0 + g * 0.55 - fem * 0.1);
      p.x += sx * (g * 0.05 - fem * 0.016);
    } else if (reg == 4) {
      float sx = sign(p.x); vec2 a = vec2(sx * 0.094, 0.0);
      float k = 1.0 + g * 0.6 * smoothstep(0.2, 0.7, p.y);
      if (p.y < orlo - 0.02) k *= mix(0.8, 0.9, smoothstep(0.2, 0.45, p.y));   // calzoncini: sotto l'orlo la gamba nuda è più sottile
      p.xz = a + (p.xz - a) * k; p.x += sx * g * 0.03 * smoothstep(0.3, 0.9, p.y);
    } else if (reg == 6) { p.xz = vec2(0.0, -0.02) + (p.xz - vec2(0.0, -0.02)) * (1.0 + g * 0.45 - fem * 0.1); }
    else if (reg == 8 && fem > 0.5) { p.x = sign(p.x) * 0.095 + (p.x - sign(p.x) * 0.095) * 0.88; p.z = -0.015 + (p.z + 0.015) * 0.92; }
    return p;
  }`;

function creaMateriali(tex) {
  const uni = { uOssa: { value: tex } };
  const mat = new THREE.MeshStandardMaterial({ roughness: .8, metalness: 0 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      ${GLSL_COMUNE}
      flat varying float vPid; varying vec3 vRest; varying float vReg; varying float vAO;`)
      .replace('#include <beginnormal_vertex>', `int pid = int(aPid + 0.5); vec4 p8 = pal(8, pid);
        bool nasc = spenta(aRO.y, p8.x);
        mat4 sk = nasc ? mat4(0.0) : pelle_skin(pid);
        vec3 objectNormal = nasc ? vec3(0.0, 1.0, 0.0) : normalize(mat3(sk) * normal);
        #ifdef USE_TANGENT
        vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif`)
      .replace('#include <begin_vertex>', `vec3 transformed = (sk * vec4(corporatura(position, int(aRO.x + .5), pal(2, pid).w, p8.y, pal(1, pid).w), 1.0)).xyz;
        vPid = aPid; vRest = position; vReg = aRO.x; vAO = aRO.z;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform highp sampler2D uOssa; flat varying float vPid; varying vec3 vRest; varying float vReg; varying float vAO;
      vec4 pal(int k) { return texelFetch(uOssa, ivec2(${NB * 3} + k, int(vPid + 0.5)), 0); }
      float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);   // rumore a valori (Spiderbench, pvn)
        return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
      float gs(float x, float s) { return exp(-(x / s) * (x / s)); }
      // attaccatura dei capelli: stessa tabella di LINEA_CAPELLI (persone.js)
      float linea(float a) {
        ${LINEA_CAPELLI.slice(1).map(([x, v], i) => `if (a <= ${x.toFixed(4)}) return mix(${LINEA_CAPELLI[i][1].toFixed(3)}, ${v.toFixed(3)}, (a - ${LINEA_CAPELLI[i][0].toFixed(4)}) / ${(x - LINEA_CAPELLI[i][0]).toFixed(4)});`).join('\n        ')}
        return ${LINEA_CAPELLI[LINEA_CAPELLI.length - 1][1].toFixed(3)}; }
      float gRug = 0.8, gPelle = 0.0;
      vec3 colorePersona() {
        int reg = int(vReg + 0.5); vec3 p = vRest;
        vec4 cM = pal(0), cP = pal(1), cS = pal(2), cH = pal(3), cF = pal(4), cG = pal(5), cGu = pal(6), cPo = pal(7), p8 = pal(8);
        vec3 pelle = cS.rgb, c = pelle; gRug = 0.55; gPelle = 1.0;
        float lunghe = cM.w, orlo = cP.w, stile = cH.w, barba = cG.w, guanti = cGu.w, calze = cPo.w, denim = p8.z;
        vec3 maglia = cM.rgb * (0.92 + 0.12 * vn(p * vec3(9.0, 5.0, 9.0)));
        vec3 pant = cP.rgb * (0.9 + 0.14 * vn(p * vec3(12.0, 4.0, 12.0)));
        if (denim > 0.5) pant *= 0.88 + 0.2 * vn(vec3(p.x * 70.0, p.y * 16.0, p.z * 70.0)) + 0.3 * smoothstep(0.55, 0.78, p.y) * smoothstep(0.93, 0.8, p.y) * step(0.0, p.z);
        if (reg != 5 && reg != 6 && reg != 2 && reg != 3 && reg != 4) gPelle = 0.0;
        if (reg == 1) {                       // busto: maglietta, scollo girocollo con costina, pantaloni sotto la vita
          // scollo girocollo: pelle solo attorno alla base del collo, costina appena più scura
          float rc = length(vec2(p.x, (p.z + 0.02) * 1.15)) + 0.35 * max(0.0, 1.46 - p.y) + 0.012 * smoothstep(0.0, 0.06, -p.z);
          c = maglia; gRug = 0.92;
          if (lunghe > 0.5) { if (p.z > 0.0 && abs(p.x) < 0.006 && p.y < 1.44) c *= 0.8; }   // camicia: abbottonatura
          if (rc < 0.094) c *= 0.84;
          if (rc < 0.082) { c = pelle; gRug = 0.55; gPelle = 1.0; }
          if (p.y < 0.968) { c *= 0.78; }                                              // orlo della maglietta
          if (p.y < 0.956) { c = pant; gRug = 0.88; if (p.y > 0.93) c *= 0.6; }        // cintura
        } else if (reg == 11) { c = maglia * (p.y < 0.95 ? 0.8 : 1.0); gRug = 0.92; }
        else if (reg == 9) { c = maglia * (p.y < 1.262 ? 0.78 : 0.96); gRug = 0.92; }
        else if (reg == 2 || reg == 3) {      // braccia e mani: pelle, maniche lunghe, guanti con polsino (F 7452)
          if (reg == 2 && (p.y > 1.27 || (lunghe > 0.5 && p.y > 0.885))) { c = maglia; gRug = 0.9; gPelle = 0.0; if (p.y < 0.905) c *= 0.8; }   // sotto la manica corta: stoffa
          if (guanti > 0.5 && p.y < 0.985) { c = cGu.rgb; gRug = 0.42; gPelle = 0.0; if (p.y > 0.93) c = cPo.rgb; }
          if (reg == 3 && guanti < 0.5) c *= 0.97 + 0.05 * vn(p * 90.0);
        } else if (reg == 4) {                // gambe: pantaloni o calzoncini, calze
          c = pant; gRug = 0.88; gPelle = 0.0;
          if (p.y < orlo) { c = pelle; gRug = 0.55; gPelle = 1.0; if (p.y < 0.16) { c = vec3(calze); gRug = 0.9; gPelle = 0.0; } }
          else if (p.y < orlo + 0.02 && orlo > 0.2) c *= 0.75;
          if (orlo < 0.2 && p.y < 0.12) c *= 0.85;
        } else if (reg == 8) {                // scarpe: tomaia, suola, lacci
          c = cF.rgb; gRug = 0.55; float zr = p.z + 0.015;
          if (p.y < 0.022) { c = vec3(cF.w); gRug = 0.8; }
          else if (p.y > 0.06 && zr > 0.0 && zr < 0.11 && abs(abs(p.x) - 0.099) < 0.018) c = mix(c, vec3(cF.w), 0.35);
        } else if (reg == 10) { c = cG.rgb * (0.9 + 0.14 * vn(p * vec3(20.0, 6.0, 20.0))); gRug = 0.7; }
        else if (reg == 12) { c = vec3(0.02); gRug = 0.3; }
        else if (reg == 6) {                  // collo; colletto della camicia per le maniche lunghe
          if (lunghe > 0.5 && p.y > 1.435 && p.y < 1.478 && !(p.z > 0.0 && abs(p.x) < 0.012 + (1.478 - p.y) * 0.5)) { c = maglia; gRug = 0.9; gPelle = 0.0; }
        } else if (reg == 7) {                // capelli: ciocche (rumore allungato), radici più scure
          c = cH.rgb * (0.8 + 0.28 * vn(vec3(p.x * 160.0, p.y * 60.0, p.z * 45.0)) + 0.12 * vn(vec3(p.x * 420.0, p.y * 150.0, p.z * 120.0 + 3.0))); gRug = 0.6;
        }
        if (reg == 5) {                       // testa: viso dipinto (orbite, sopracciglia, labbra, guance), capelli rasati, barba
          vec3 d = (p - vec3(0.0, 1.635, 0.012)) / vec3(0.077, 0.114, 0.097); float el = asin(clamp(d.y / length(d), -1.0, 1.0)), az = atan(d.x, d.z), aa = abs(az);
          c *= 0.97 + 0.05 * vn(p * 40.0);
          c *= 1.0 - 0.2 * gs(aa - 0.36, 0.14) * gs(el - 0.085, 0.075);                  // orbite
          c *= 1.0 - 0.12 * gs(el - 0.12, 0.02) * gs(aa - 0.36, 0.1);                       // piega della palpebra
          c *= 1.0 - 0.3 * gs(el - 0.088, 0.017) * gs(aa - 0.36, 0.07) - 0.2 * gs(el - 0.086, 0.012) * gs(aa - 0.35, 0.025);   // occhio in ombra, sfumato (niente occhi «da cartone»)
          c = mix(c, c * vec3(1.05, 0.95, 0.94), gs(aa - 0.62, 0.2) * gs(el + 0.1, 0.14));  // guance
          c = mix(c, c * vec3(0.84, 0.62, 0.6), 0.75 * gs(el + 0.41, 0.045) * gs(az, 0.19)); // labbra
          c *= 1.0 - 0.18 * gs(aa - 1.67, 0.05) * gs(el + 0.02, 0.07);                     // conca dell'orecchio
          float hl = linea(aa), inH = smoothstep(hl - 0.01, hl + 0.03, el);
          float sopr = gs(el - 0.2 - 0.025 * (1.0 - pow((aa - 0.38) / 0.24, 2.0)), 0.02) * step(0.13, aa) * step(aa, 0.64);
          c = mix(c, cH.rgb * 0.8, 0.85 * sopr);
          if (stile < 0.5) c = mix(c, cH.rgb, inH * 0.55 * (0.8 + 0.4 * vn(p * 400.0)));                                  // rasati
          else if (stile > 2.5 && stile < 3.5) c = mix(c, cH.rgb, inH * mix(0.62, 0.95, smoothstep(0.0, 0.55, el)) * (0.85 + 0.3 * vn(p * 380.0)));   // sfumati ai lati
          else if (stile > 3.5 && stile < 4.5) { float calv = smoothstep(0.3, 0.5, el + 0.25 * max(0.0, cos(az))); c = mix(c, cH.rgb, inH * (1.0 - calv) * 0.9); if (calv > 0.5) gRug = 0.42; }
          else c = mix(c, cH.rgb, inH * 0.92);
          gPelle *= 1.0 - inH * 0.8;
          // barba: dalle basette al mento, baffi; «barba» 0,45 = barba di qualche giorno, 1 = barba corta
          float bz = smoothstep(-0.02, -0.2, el + 0.16 * (1.0 - clamp(aa / 1.35, 0.0, 1.0))) * smoothstep(1.5, 1.28, aa) * smoothstep(-1.15, -0.95, el);
          bz = max(bz, gs(el + 0.33, 0.035) * gs(az, 0.28)) * (1.0 - 0.8 * gs(el + 0.41, 0.03) * gs(az, 0.17));
          c = mix(c, cH.rgb * 0.85, clamp(barba * bz * (0.55 + 0.45 * barba) * (0.75 + 0.5 * vn(p * 300.0)), 0.0, 0.92));
        }
        return c * mix(0.4, 1.0, vAO);
      }`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = colorePersona();')
      // pelle: diffusione sotto la superficie stilizzata (Inkwave, character-mats.js «stylised SSS»): la luce diretta «avvolge» oltre il
      // terminatore in modo diverso per canale (il rosso passa più in là), con una tinta calda nella fascia d'ombra. Solo sui pixel di pelle.
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>
        void RE_Direct_Persona(const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
          vec3 dd = reflectedLight.directDiffuse;
          RE_Direct_Physical(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
          if (gPelle > 0.01) {
            float ndl = dot(geometryNormal, directLight.direction); vec3 w = vec3(0.42, 0.2, 0.13) * gPelle, lam = vec3(clamp(ndl, 0.0, 1.0));
            vec3 wr = clamp((vec3(ndl) + w) / (1.0 + w), 0.0, 1.0); wr = lam + max(wr - lam, 0.0) * (1.0 - smoothstep(0.05, 0.55, ndl));
            float band = clamp(1.0 - abs(ndl) * 3.2, 0.0, 1.0) * gPelle;
            vec3 base = directLight.color * BRDF_Lambert(material.diffuseContribution);
            vec3 sss = base * mix(lam, wr * mix(vec3(1.0), vec3(1.0, 0.45, 0.32) * 1.5, band * 0.35), 0.85);
            reflectedLight.directDiffuse = dd + mix(reflectedLight.directDiffuse - dd, sss, gPelle);
          }
        }
        #undef RE_Direct
        #define RE_Direct RE_Direct_Persona`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRug;');
  };
  mat.customProgramCacheKey = () => 'rf-persone-v2';
  const prof = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  prof.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${GLSL_COMUNE}`)
      .replace('#include <begin_vertex>', `int pid = int(aPid + 0.5); vec4 p8 = pal(8, pid);
        vec3 transformed = spenta(aRO.y, p8.x) ? vec3(0.0) : (pelle_skin(pid) * vec4(corporatura(position, int(aRO.x + .5), pal(2, pid).w, p8.y, pal(1, pid).w), 1.0)).xyz;`);
  };
  prof.customProgramCacheKey = () => 'rf-persone-prof-v1';
  return { mat, prof };
}

// ------------------------------------------------------------------------------------------------------------------------------
// Aspetto per persona (tavolozza) — deterministico
// ------------------------------------------------------------------------------------------------------------------------------
const lin = h => new THREE.Color(h);   // THREE.Color converte da sRGB allo spazio lineare di lavoro
const PELLI = ['#e2b89a', '#d9a988', '#cf9b79', '#c38c6b', '#b27a58', '#8e5b3f'], PESO_PELLI = [3, 4, 4, 3, 2, 1];
const CAPELLI = ['#17120f', '#221a15', '#2f231b', '#3f2e22', '#5a4535', '#77736e', '#a5a19b'], PESO_CAP = [4, 5, 4, 2, 1, 2, 1];
const STILI_CAS = ['corti', 'corti', 'corti', 'medi', 'medi', 'sfumati', 'sfumati', 'sfumati', 'stempiato', 'rasati'];
const SCARPE = [['#1b1b1d', .82], ['#1d1d1f', .1], ['#3a3b3e', .75], ['#2a2420', .12]];
function scegli(r, a, w) { if (!w) return a[Math.floor(r() * a.length)]; const t = w.reduce((s, x) => s + x, 0); let q = r() * t; for (let i = 0; i < a.length; i++) { q -= w[i]; if (q <= 0) return a[i]; } return a[a.length - 1]; }
function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const colDi = (v, def) => v == null ? lin(def) : v.isColor ? v.clone() : v.color ? v.color.clone() : lin(v);

// ------------------------------------------------------------------------------------------------------------------------------
// Persone: registro, creazione e pose
// ------------------------------------------------------------------------------------------------------------------------------
export const PERSONE = [];
let CONTA = 0;
const _v = new V3(), _v2 = new V3(), _v3 = new V3(), _q = new Q(), _q2 = new Q(), _m = new THREE.Matrix4(), _m3 = new THREE.Matrix4();
const X = new V3(1, 0, 0), Y = new V3(0, 1, 0), Z = new V3(0, 0, 1);
const qAsse = (asse, a, out = new Q()) => out.setFromAxisAngle(asse, a);

/**
 * persona(p, M, x, z, opt) → Group con .posa(t, o). Compatibile con la versione a capsule.
 * opt: ry, maglia, pant, guanti, grembiule (materiali di M o colori) e in più: capelli ('corti'|'medi'|'sfumati'|'stempiato'|'rasati'|'raccolti'),
 *   barba (0…1), occhiali, calzoncini, calze (luminosità 0…1), maniche ('lunghe'), altezza (m), corporatura (-0,08…0,22), pelle, colCapelli,
 *   scarpe ([colore, luminosità suola]), donna, seme.
 */
export function persona(p, M, x, z, opt = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = opt.ry || 0; p.add(g);
  const r = rng(opt.seme ?? (Math.floor(x * 7919 + z * 104729) ^ (CONTA * 2654435761)) + ++CONTA);
  const donna = !!opt.donna;
  const st = {
    g, h: (opt.altezza ?? (donna ? lerp(1.6, 1.72, r()) : lerp(1.67, 1.85, r()))) / 1.75, cg: opt.corporatura ?? lerp(-.06, .2, r() ** 1.6), donna,
    maglia: colDi(opt.maglia, M.maglietta ? M.maglietta.color.getHex() : 0x1a1b1e), pant: colDi(opt.pant, [0x25262a, 0x1c1d20, 0x2d3a52][Math.floor(r() * 3)]),
    denim: 0, pelle: colDi(opt.pelle, scegli(r, PELLI, PESO_PELLI)), cap: colDi(opt.colCapelli, scegli(r, CAPELLI, PESO_CAP)),
    stile: STILI[opt.capelli ?? (donna ? 'raccolti' : scegli(r, STILI_CAS))] ?? 1, barba: opt.barba ?? (donna ? 0 : scegli(r, [0, 0, .45, .45, 1])),
    scarpe: opt.scarpe ? [colDi(opt.scarpe[0]), opt.scarpe[1]] : (([c, l]) => [lin(c), l])(scegli(r, SCARPE)),
    grembiule: opt.grembiule ? colDi(opt.grembiule) : null, guanti: opt.guanti ? colDi(opt.guanti) : null, polsino: colDi(opt.polsino, 0xd9c62e),
    occhiali: opt.occhiali ?? r() < .08, lunghe: opt.maniche === 'lunghe' ? 1 : 0, orlo: opt.calzoncini ? .5 : .07, calze: opt.calze ?? .85,
    seme: r(), fase: r(), sguardo: r() * 100,
    // stato dell'animazione
    t0: -1, px: x, pz: z, ry0: g.rotation.y, vx: 0, vz: 0, wz: 0, w: 0, ph: 0, giro: 0,
    Rq: OSSA.map(() => new Q()), Pp: OSSA.map(o => new V3(...o[2])), out: new Float32Array(NB * 12),
  };
  // tinta «lavata» diversa per ogni capo (Spiderbench, outfitFor/jit): due magliette nere non sono mai identiche
  const tinta = c => { const k = .86 + r() * .28, d = (r() - .5) * .08; c.r *= k * (1 + d); c.g *= k; c.b *= k * (1 - d); return c; };
  if (!opt.maglia) tinta(st.maglia); if (!opt.pant) tinta(st.pant); else st.pant.multiplyScalar(.92 + r() * .16);
  // pantaloni in jeans: blu (lo shader aggiunge trama e scoloritura)
  { const c = st.pant; st.denim = c.b > c.r * 1.35 && c.b > .02 ? 1 : 0; }
  if (opt.guanti && opt.guanti === M.guanti) { st.guanti = lin(0x4f9e8a); st.polsino = lin(0xd8c43a); }   // F 7452: guanti verdi con il polsino giallo
  g.userData.persona = true; g.userData.stato = st;
  g.posa = (t, o = {}) => posa(st, t, o);
  PERSONE.push(st); posa(st, 0, {}); st.t0 = -1;
  return g;
}

// IK a due ossa (Inkwave: «two-bone IK legs/arms»): radice S, bersaglio T, lunghezze a, b, direzione del polo. Restituisce il gomito/ginocchio.
function ik2(S, T, a, b, polo, outE, outT) {
  const d = _v.copy(T).sub(S); let L = d.length(); const Lm = a + b - 1e-3; if (L > Lm) { d.multiplyScalar(Lm / L); L = Lm; } if (L < Math.abs(a - b) + 1e-3) { L = Math.abs(a - b) + 1e-3; d.setLength(L); }
  outT.copy(S).add(d); d.normalize();
  const perp = _v2.copy(polo).addScaledVector(d, -polo.dot(d)); if (perp.lengthSq() < 1e-8) perp.set(0, 0, 1).addScaledVector(d, -d.z); perp.normalize();
  const ca = clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1), sa = Math.sqrt(1 - ca * ca);
  return outE.copy(S).addScaledVector(d, a * ca).addScaledVector(perp, a * sa);
}
// rotazione (spazio persona) dell'osso che va da A (riposo rA) a Bp (riposo rB) con asse di cerniera x: mappa la terna di riposo sulla terna attuale
const _mA = new THREE.Matrix4(), _mB = new THREE.Matrix4(), _xa = new V3(), _ya = new V3(), _za = new V3();
function terna(y, xHint, out) { _ya.copy(y).normalize(); _xa.copy(xHint).addScaledVector(_ya, -xHint.dot(_ya)).normalize(); _za.crossVectors(_xa, _ya); return out.makeBasis(_xa, _ya, _za); }
function rotOsso(A, Bp, xAtt, rA, rB, xRip, out) {
  terna(_v3.copy(A).sub(Bp), xAtt, _mA); terna(_v3.copy(rA).sub(rB), xRip, _mB);
  return out.setFromRotationMatrix(_mA.multiply(_mB.transpose()));
}
// cerniera: asse della flessione dal piano (direzione, polo). Braccia +1, gambe −1 (vedi RIG di Inkwave: flessione attorno a X locale)
function cerniera(S, E, T, segno, out) { out.crossVectors(_v.copy(E).sub(S), _v2.copy(T).sub(E)); if (out.lengthSq() < 1e-12) return out.set(1, 0, 0); return out.normalize().multiplyScalar(-segno); }
// poli predefiniti: gomiti indietro, un po' in fuori e in basso; ginocchia in avanti lungo il piede
const poloBraccio = (sx, out = new V3()) => out.set(sx * .55, -.6, -.55).normalize();
const poloGamba = (sx, yaw, seduto, out = new V3()) => out.set(Math.sin(yaw) + sx * .1, seduto ? .9 : 0, Math.cos(yaw)).normalize();
// assi di cerniera a riposo, con lo stesso metodo e gli stessi poli usati durante l'animazione (a riposo le rotazioni sono l'identità)
const XRIP = {}; for (const s of ['L', 'R']) { const sx = s === 'L' ? 1 : -1;
  const S = REST[B['omero' + s]], E = REST[B['avamb' + s]], W = REST[B['mano' + s]], Tb = new V3(), Eb = ik2(S, W, S.distanceTo(E), E.distanceTo(W), poloBraccio(sx), new V3(), Tb);
  XRIP['b' + s] = cerniera(S, Eb, Tb, 1, new V3()).clone();
  const H = REST[B['femore' + s]], K = REST[B['tibia' + s]], A = REST[B['piede' + s]], Tg = new V3(), Kg = ik2(H, A, H.distanceTo(K), K.distanceTo(A), poloGamba(sx, sx * .1, false), new V3(), Tg);
  XRIP['g' + s] = cerniera(H, Kg, Tg, -1, new V3()).clone(); }
// FK: rotazione locale → posizione e rotazione in spazio persona
function fk(st, b, qLoc) { const p = PAD[b]; st.Rq[b].copy(st.Rq[p]).multiply(qLoc); st.Pp[b].copy(REST[b]).sub(REST[p]).applyQuaternion(st.Rq[p]).add(st.Pp[p]); }
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const eul = new THREE.Euler(), qe = (x, y, z, ord = 'YXZ', out = new Q()) => out.setFromEuler(eul.set(x, y, z, ord));
const LA = REST[B.avambL].distanceTo(REST[B.omeroL]), LB = REST[B.manoL].distanceTo(REST[B.avambL]), LT = REST[B.tibiaL].distanceTo(REST[B.femoreL]), LS = REST[B.piedeL].distanceTo(REST[B.tibiaL]);
// piede: caviglia da punto a terra G, imbardata, beccheggio (> 0 tallone su: perno sulla pianta; < 0 punta su: perno sul tallone)
const PIV_T = new V3(0, 0, -.068), PIV_P = new V3(0, 0, .148), CAV = new V3(0, .075, 0);
function caviglia(G, yaw, th, out) { const piv = th >= 0 ? PIV_P : PIV_T; _q2.setFromAxisAngle(X, th); out.copy(CAV).sub(piv).applyQuaternion(_q2).add(piv); _q2.setFromAxisAngle(Y, yaw); return out.applyQuaternion(_q2).add(G); }
// bersaglio: array [x,y,z], Vector3 o Object3D nello spazio del genitore della persona → spazio persona
function locale(st, b, out) {
  if (b.isObject3D) { b.updateWorldMatrix(true, false); out.setFromMatrixPosition(b.matrixWorld); if (st.g.parent) st.g.parent.worldToLocal(out); } else if (Array.isArray(b)) out.set(b[0], b[1], b[2]); else out.copy(b);
  out.sub(st.g.position).applyAxisAngle(Y, -st.g.rotation.y).divideScalar(st.h); return out;
}
const TMP = { mani: [new V3(), new V3()], E: new V3(), T: new V3(), K: new V3(), piedi: [new V3(), new V3()], x: new V3(), guarda: new V3(), qa: new Q(), qb: new Q(), qc: new Q() };

// posa(t, o): t = tempo della scena (s). o: passo (0…1, tetto dell'ampiezza: la camminata vera si ricava dallo spostamento misurato;
//   «fase» dei chiamanti vecchi è ignorata), lavoro (0…1), mov (movimento delle mani al lavoro), chino (0…1), seduto, volante,
//   presa ([x,y,z] | Vector3 | Object3D nello spazio del genitore: dove vanno le mani), largo (m fra le mani), guarda (punto da guardare),
//   quotaPiedi (seduti: quota dei piedi rispetto alla radice). Stato tra i fotogrammi: velocità smorzata e fase del passo (deterministici
//   con la stessa sequenza di tempi, come nel video).
function posa(st, t, o) {
  const g = st.g, seduto = !!o.seduto, lav = clamp(o.lavoro ?? 0, 0, 1), mov = o.mov || 0;
  // --- moto misurato: velocità e rotazione dalla posizione reale del gruppo (piedi che non scivolano, qualunque sia il chiamante)
  let dt = t - st.t0; const px = g.position.x, pz = g.position.z;
  if (!(dt > 0 && dt < .35) || Math.hypot(px - st.px, pz - st.pz) > 1.2) { st.vx = st.vz = st.wz = 0; st.w = 0; dt = 0; }
  else { const k = 1 - Math.exp(-dt * 14); st.vx = lerp(st.vx, (px - st.px) / dt, k); st.vz = lerp(st.vz, (pz - st.pz) / dt, k);
    let dr = g.rotation.y - st.ry0; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); st.wz = lerp(st.wz, dr / dt, k); }
  st.t0 = t; st.px = px; st.pz = pz; st.ry0 = g.rotation.y;
  const ry = g.rotation.y, h = st.h, vF = (st.vx * Math.sin(ry) + st.vz * Math.cos(ry)) / h, vL = (st.vx * Math.cos(ry) - st.vz * Math.sin(ry)) / h, v = Math.hypot(vF, vL);
  const passo = o.passo ?? 1, giro = !seduto && v < .25 ? sstep(.5, 1.4, Math.abs(st.wz)) : 0;
  st.w = damp(st.w, seduto ? 0 : Math.min(passo > 0 ? 1 : 0, sstep(.06, .4, v)), 10, dt);
  st.giro = damp(st.giro, giro, 8, dt);
  const w = st.w, wa = Math.max(w, st.giro * .6);
  // cadenza (Spiderbench, dati umani) e falcata = v / Hz, al massimo 1,45 m per ciclo
  let Hz = .535 + .285 * v, Sc = v / Hz; if (Sc > 1.45) { Sc = 1.45; Hz = v / Sc; } if (st.giro > .05 && v < .25) Hz = Math.max(Hz, 1.5 * st.giro);
  st.ph = (st.ph + Hz * dt) % 1;
  const ux = v > 1e-3 ? vL / v : 0, uz = v > 1e-3 ? vF / v : 1;   // direzione del moto nello spazio persona
  const ph = st.ph, s = st.seme, tt = t + s * 50;
  // --- bacino e busto
  const R = st.Rq, P = st.Pp;
  const respiro = Math.sin(tt * TAU / 4.3), carico = Math.sin(tt * TAU / 8.3 + s * 6);          // respiro e peso che passa da un piede all'altro
  const sw = Math.sin(TAU * ph), bob = Math.cos(2 * TAU * ph);
  let chino = Math.max(o.chino || 0, 0);
  // bersagli delle mani (spazio persona)
  const mani = TMP.mani; let manoLib = 1, modoMano = 0, curl = .45, guarda = null;
  if (seduto) {
    if (o.volante) { const a = .15 * Math.sin(tt * .7); for (let i = 0; i < 2; i++) { const sx = i ? -1 : 1, an = a + (sx > 0 ? .35 : Math.PI - .35); mani[i].set(Math.cos(an) * .17, .96 + Math.sin(an) * .06, .36); } manoLib = 0; modoMano = 2; curl = 1.2; }
    else if (lav > 0) { for (let i = 0; i < 2; i++) { const sx = i ? -1 : 1; mani[i].set(sx * .16, .76 + .012 * Math.abs(Math.sin(tt * 8.5 + i * 1.7)) * mov, .38 + .03 * Math.sin(tt * .9 + i) * mov); } manoLib = 1 - lav; modoMano = 1; curl = .35; chino = Math.max(chino, .15 * lav); }
  } else if (lav > 0) {
    if (o.presa) { const c = locale(st, o.presa, TMP.guarda), lg = (o.largo ?? .5) / 2 / h;
      // il pezzo si prende dal lato vicino: le mani restano entro ~45 cm dal bacino (il busto si china se il pezzo è basso)
      { const d = Math.hypot(c.x, c.z), k = d > .45 ? (d - .45) / d : 0; c.x -= c.x * k; c.z -= c.z * k; if (c.z < .18) c.z = .18; c.y = clamp(c.y, .35, 1.45); }
      for (let i = 0; i < 2; i++) mani[i].copy(c).addScaledVector(X, (i ? -1 : 1) * lg).add(_v3.set(0, .01, -.03));
      guarda = c; modoMano = 2; curl = 1.1; }
    else { for (let i = 0; i < 2; i++) { const sx = i ? -1 : 1; mani[i].set(sx * .19 + .05 * mov * Math.sin(tt * 2.7 + i * 1.3), .97 + .025 * mov * Math.sin(tt * 4.1 + i * 2), .36 + .05 * mov * Math.cos(tt * 2.3 + i)); }
      guarda = TMP.guarda.set(0, .93, .5); modoMano = 1; curl = .15; }
    manoLib = 1 - lav;
    // chinarsi se il bersaglio è basso o lontano
    const mz = (mani[0].z + mani[1].z) / 2, my = (mani[0].y + mani[1].y) / 2; chino = Math.max(chino, lav * (clamp((.98 - my) * 1.3, 0, .7) + clamp((mz - .3) * 1.1, 0, .45)));
  }
  if (o.guarda) guarda = locale(st, o.guarda, TMP.guarda);
  // bacino
  const idle = 1 - wa;
  const pelvX = seduto ? 0 : (.028 * carico * idle + .022 * sw * w * (uz >= 0 ? 1 : -1)), pelvY = seduto ? .5 : .97 - .012 * w - .02 * bob * w * .5 - .02 * idle * (.5 + .5 * Math.abs(carico)) * .4 - .045 * chino, pelvZ = seduto ? -.03 : -.06 * chino;
  const yawP = seduto ? 0 : .13 * sw * w, rollP = seduto ? 0 : -.05 * sw * w + .04 * carico * idle;
  qe(seduto ? -.08 + .12 * lav : .05 * w + .18 * chino, yawP, rollP, 'YXZ', R[0]); P[0].set(pelvX, pelvY, pelvZ);
  fk(st, 1, qe(.25 * chino + .012 * respiro, -.5 * yawP, -.6 * rollP, 'YXZ', TMP.qa));
  fk(st, 2, qe(.35 * chino - .02 * respiro + .04 * w, -.9 * yawP + .02 * Math.sin(tt * .7), -.4 * rollP, 'YXZ', TMP.qa));
  // testa: guarda il pezzo, il cammino o si guarda attorno
  let yawT = .25 * Math.sin(tt * .31 + s * 9) * Math.sin(tt * .17) * idle * (1 - lav), pitT = .06 + .05 * Math.sin(tt * .23);
  if (w > .3) { yawT = Math.atan2(ux, uz) * .6 + .9 * yawP; pitT = .12; }
  if (o.volante) {   // alla guida: guarda dove va il mezzo (indietro, sopra la spalla, in retromarcia)
    g.updateWorldMatrix(true, false); const wp = _v3.setFromMatrixPosition(g.matrixWorld);
    if (st.wp && dt > 0) { const d = wp.clone().sub(st.wp).divideScalar(dt); g.getWorldQuaternion(_q).invert(); d.applyQuaternion(_q); st.vloc = lerp(st.vloc || 0, d.z, 1 - Math.exp(-dt * 6)); }
    st.wp = (st.wp || new V3()).copy(wp); yawT = (st.vloc || 0) < -.3 ? -1.1 : .1 * Math.sin(tt * .4); pitT = .05; }
  if (guarda) { _v.copy(guarda).sub(P[2]).applyQuaternion(_q.copy(R[2]).invert()); _v.y -= .3; const k = o.guarda ? 1 : lav;
    yawT = lerp(yawT, Math.atan2(_v.x, _v.z), k); pitT = lerp(pitT, Math.atan2(-_v.y, Math.hypot(_v.x, _v.z)), k); }
  yawT = clamp(yawT, -1.2, 1.2); pitT = clamp(pitT, -.4, .8);
  fk(st, 3, qe(pitT * .35, yawT * .35, 0, 'YXZ', TMP.qa)); fk(st, 4, qe(pitT * .65, yawT * .65, 0, 'YXZ', TMP.qa));
  // --- braccia: oscillazione (FK) o IK verso le mani, miscelate
  for (let i = 0; i < 2; i++) {
    const sx = i ? -1 : 1, S = i ? 'R' : 'L', bc = B['cla' + S], bu = B['omero' + S], bf = B['avamb' + S], bh = B['mano' + S], bd = B['dita' + S];
    const reach = (1 - manoLib) * clamp((mani[i].z - .15) / .4, 0, 1);
    fk(st, bc, qe(0, sx * -.12 * reach, sx * (.03 * respiro + .06 * reach), 'YXZ', TMP.qa));
    // FK: braccia lungo i fianchi, oscillazione opposta alle gambe
    const osc = (sx > 0 ? -1 : 1) * Math.cos(TAU * ph) * .32 * w * clamp(v / 1.2, .4, 1.1);
    const qu = qe(-osc - .02 * idle, 0, sx * (.075 + st.cg * .45 + (seduto ? .05 : 0)), 'XYZ', TMP.qb);
    const quW = _q.copy(R[bc]).multiply(qu); const qf = qe(-(.18 + .25 * Math.max(0, osc) + (seduto ? .5 : 0)), 0, 0, 'XYZ', TMP.qc); const qfW = _q2.copy(quW).multiply(qf);
    const Rfk_u = quW.clone(), Rfk_f = qfW.clone();
    let Ru = Rfk_u, Rf = Rfk_f, Rh = Rfk_f.clone();
    if (manoLib < .999) {
      const Sp = _v3.copy(REST[bu]).sub(REST[bc]).applyQuaternion(R[bc]).add(P[bc]).clone();
      // polso: il bersaglio della mano meno la lunghezza del palmo verso le dita
      const f = new V3().copy(mani[i]).sub(Sp); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, 1); f.normalize(); f.y = modoMano === 1 ? -.18 : -.6; f.normalize();
      const W = mani[i].clone().addScaledVector(f, -.075); if (modoMano === 1) W.y += .03;
      const polo = poloBraccio(sx);
      const E = ik2(Sp, W, LA, LB, polo, TMP.E, TMP.T), Tt = TMP.T; const xa = cerniera(Sp, E, Tt, 1, TMP.x).clone();
      const Rui = rotOsso(Sp, E, xa, REST[bu], REST[bf], XRIP['b' + S], new Q()), Rfi = rotOsso(E, Tt, xa, REST[bf], REST[bh], XRIP['b' + S], new Q());
      // mano: palmo in giù sulla superficie (1) oppure di taglio per afferrare (2); le dita verso f
      const pn = modoMano === 1 ? _v2.set(0, -1, 0) : _v2.set(0, 0, 0); const xl = modoMano === 1 ? pn.clone().multiplyScalar(-sx) : new V3(1, 0, 0).multiplyScalar(1);
      const Rhi = new Q().setFromRotationMatrix(terna(f.clone().negate(), xl, _m));
      const k = 1 - manoLib; Ru = Rfk_u.clone().slerp(Rui, k); Rf = Rfk_f.clone().slerp(Rfi, k); Rh = Rf.clone().slerp(Rhi, k);
    } else Rh = Rf.clone().multiply(qe(-.08, 0, 0, 'XYZ', TMP.qa));
    // parte della rotazione del polso passa all'avambraccio (pronosupinazione)
    const rel = _q.copy(Rf).invert().multiply(Rh); const tw = new Q(0, rel.y, 0, rel.w).normalize(); Rf = Rf.clone().multiply(new Q().slerp(tw, .6));
    R[bu].copy(Ru); P[bu].copy(REST[bu]).sub(REST[bc]).applyQuaternion(R[bc]).add(P[bc]);
    R[bf].copy(Rf); P[bf].copy(REST[bf]).sub(REST[bu]).applyQuaternion(R[bu]).add(P[bu]);
    R[bh].copy(Rh); P[bh].copy(REST[bh]).sub(REST[bf]).applyQuaternion(R[bf]).add(P[bf]);
    const cc = lerp(.4 + .05 * Math.sin(tt * .5 + i), curl, 1 - manoLib); fk(st, bd, qAsse(Z, -sx * cc, TMP.qa));
  }
  // --- gambe: piedi a terra (camminata con perno tallone/pianta, stance da fermo, seduto) e IK
  for (let i = 0; i < 2; i++) {
    const sx = i ? -1 : 1, S = i ? 'R' : 'L', bt = B['femore' + S], bs = B['tibia' + S], bp = B['piede' + S], bq = B['punta' + S];
    const Gp = TMP.piedi[i]; let yaw = sx * .1, th = 0, lift = 0;
    if (seduto) { Gp.set(sx * .12, (o.quotaPiedi ?? 0) / h, .47); yaw = sx * .15; }
    else {
      // da fermo: piedi un po' aperti, uno leggermente avanti; il ginocchio del piede scarico si piega (IK)
      const idleG = _v.set(sx * (.105 + st.cg * .05), 0, (i ? -.03 : .03));
      // camminata: fase del piede (D = 0,6 di appoggio)
      const D = .6, f = (ph + (i ? .5 : 0)) % 1; let along, lat = sx * (.088 + st.cg * .04);
      if (f < D) { const tau = f / D; along = Sc * D * (.42 - tau); th = tau < .12 ? lerp(-.25, 0, tau / .12) : tau > .72 ? lerp(0, .5, (tau - .72) / .28) : 0; }
      else { const tau = (f - D) / (1 - D), e = tau * tau * (3 - 2 * tau); along = Sc * D * lerp(-.58, .42, e); lift = (.07 + .04 * Math.min(1, v)) * Math.sin(Math.PI * Math.min(1, tau * 1.15)); th = tau < .5 ? lerp(.5, -.05, tau / .5) : lerp(-.05, -.25, (tau - .5) / .5); }
      const walkG = _v2.set(lat + ux * along, 0, uz * along);
      // passi sul posto quando la persona gira senza spostarsi
      if (st.giro > .05) { const ft = (ph + (i ? .5 : 0)) % 1; if (ft > .5) lift = Math.max(lift, .05 * st.giro * Math.sin(Math.PI * (ft - .5) * 2)); }
      Gp.copy(idleG).lerp(walkG, w); th *= w; yaw = lerp(yaw, sx * .06 + Math.atan2(ux, uz) * .8, w);
    }
    const A = caviglia(Gp, yaw, th, _v3.set(0, 0, 0)).clone(); A.y += lift;
    const H = _v.copy(REST[bt]).sub(REST[0]).applyQuaternion(R[0]).add(P[0]).clone();
    const polo = poloGamba(sx, yaw, seduto);
    const K = ik2(H, A, LT, LS, polo, TMP.K, TMP.T), Ta = TMP.T.clone(); const xa = cerniera(H, K, Ta, -1, TMP.x).clone();
    R[bt].copy(rotOsso(H, K, xa, REST[bt], REST[bs], XRIP['g' + S], _q)); P[bt].copy(H);
    R[bs].copy(rotOsso(K, Ta, xa, REST[bs], REST[bp], XRIP['g' + S], _q)); P[bs].copy(REST[bs]).sub(REST[bt]).applyQuaternion(R[bt]).add(P[bt]);
    R[bp].copy(qAsse(Y, yaw, TMP.qa)).multiply(qAsse(X, th, TMP.qb)); P[bp].copy(REST[bp]).sub(REST[bs]).applyQuaternion(R[bs]).add(P[bs]);
    fk(st, bq, qAsse(X, -Math.max(0, th) * .95, TMP.qa));
  }
  st.passo = w; st.ultimo = t;
  // matrici di skinning: [R | P − R·riposo] (3 × 4, per righe)
  const out = st.out;
  for (let b = 0; b < NB; b++) { _m.makeRotationFromQuaternion(R[b]); const e = _m.elements; _v.copy(REST[b]).applyQuaternion(R[b]); const tx = P[b].x - _v.x, ty = P[b].y - _v.y, tz = P[b].z - _v.z, k = b * 12;
    out[k] = e[0]; out[k + 1] = e[4]; out[k + 2] = e[8]; out[k + 3] = tx; out[k + 4] = e[1]; out[k + 5] = e[5]; out[k + 6] = e[9]; out[k + 7] = ty; out[k + 8] = e[2]; out[k + 9] = e[6]; out[k + 10] = e[10]; out[k + 11] = tz; }
}

// ------------------------------------------------------------------------------------------------------------------------------
// Una InstancedMesh per tutte le persone. Restituisce l'aggiornamento per fotogramma (matrici delle ossa → texture, radici → istanze).
// ------------------------------------------------------------------------------------------------------------------------------
export function istanziaPersone(scene) {
  const N = PERSONE.length; if (!N) return () => {};
  const data = new Float32Array(TEX_W * N * 4), tex = new THREE.DataTexture(data, TEX_W, N, THREE.RGBAFormat, THREE.FloatType); tex.needsUpdate = true;
  PERSONE.forEach((st, i) => { const o = (i * TEX_W + NB * 3) * 4, put = (k, c, w) => { data[o + k * 4] = c.r; data[o + k * 4 + 1] = c.g; data[o + k * 4 + 2] = c.b; data[o + k * 4 + 3] = w; };
    put(0, st.maglia, st.lunghe); put(1, st.pant, st.orlo); put(2, st.pelle, st.cg); put(3, st.cap, st.stile); put(4, st.scarpe[0], st.scarpe[1]);
    put(5, st.grembiule || new THREE.Color(0), st.barba); put(6, st.guanti || new THREE.Color(0), st.guanti ? 1 : 0); put(7, st.polsino, st.calze);
    let mask = 0; const on = b => { mask |= 1 << (b - 1); }; if (st.stile >= 1 && st.stile <= 5) on(st.stile); if (st.grembiule) on(OPT.grembiule); if (st.occhiali) on(OPT.occhiali); if (!st.lunghe) on(OPT.manica);
    put(8, new THREE.Color(0, 0, 0), 0); data[o + 32] = mask; data[o + 33] = st.donna ? 1 : 0; data[o + 34] = st.denim; data[o + 35] = st.seme; });
  const { mat, prof } = creaMateriali(tex);
  // due InstancedMesh (vicino / lontano): ogni fotogramma si riempiono solo con le persone dentro l'inquadratura (+ margine per le ombre)
  const livelli = [1, 0].map(lv => { const geo = geometriaCorpo(lv).clone(), pid = new THREE.InstancedBufferAttribute(new Float32Array(N), 1); pid.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aPid', pid);
    const im = new THREE.InstancedMesh(geo, mat, N); im.customDepthMaterial = prof; im.castShadow = im.receiveShadow = true; im.frustumCulled = false; im.userData.persone = true; im.count = 0; scene.add(im); return { im, pid }; });
  const m = new THREE.Matrix4(), sc = new THREE.Matrix4(), fr = new THREE.Frustum(), pm = new THREE.Matrix4(), sf = new THREE.Sphere(new V3(), 2.5), cp = new V3();
  const vis = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  const VICINO = 26;   // m: oltre, il corpo semplificato (le differenze non si vedono a quella distanza)
  return camera => {
    if (camera) { fr.setFromProjectionMatrix(pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); cp.setFromMatrixPosition(camera.matrixWorld); }
    const n = [0, 0];
    for (let i = 0; i < N; i++) { const st = PERSONE[i], g = st.g; if (!vis(g)) continue;
      sf.center.setFromMatrixPosition(g.matrixWorld); sf.center.y += .9; if (camera && !fr.intersectsSphere(sf)) continue;
      // isteresi di 3 m sul cambio di dettaglio (niente sfarfallio quando la camera sta proprio al limite)
      const dcam = camera ? sf.center.distanceTo(cp) : 0; if (st.lod === undefined) st.lod = 0; if (dcam > VICINO + 1.5) st.lod = 1; else if (dcam < VICINO - 1.5) st.lod = 0;
      const L = st.lod, k = n[L]++;
      livelli[L].im.setMatrixAt(k, m.multiplyMatrices(g.matrixWorld, sc.makeScale(st.h, st.h, st.h))); livelli[L].pid.array[k] = i;
      data.set(st.out, i * TEX_W * 4); }
    livelli.forEach(({ im, pid }, L) => { im.count = n[L]; im.instanceMatrix.needsUpdate = true; pid.needsUpdate = true; });
    tex.needsUpdate = true; };
}
export const radiciPersone = () => PERSONE.map(st => st.g);
