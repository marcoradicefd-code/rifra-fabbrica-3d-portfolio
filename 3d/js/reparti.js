// 12 tappe del racconto sulle macchine vere, alle posizioni del rilievo (ricerca/LAYOUT-MACCHINE.json, MAPPA-FOTO.md).
// Ogni tappa: gruppo con origine nell'angolo nord-ovest del suo rettangolo ST (come vuole main.js); dentro, un sottogruppo W
// riporta le coordinate a quelle del MONDO, così macchine, persone ed etichette si scrivono con le misure del JSON.
// Le macchine fuori dalle tappe (magazzino, rastrelliere, cabina, stanze sotto il soppalco…) sono statiche, in «statici», già fuse.
// Animazioni deterministiche nel tempo t (nessuna memoria tra i fotogrammi). Niente scatti: un pezzo compare o sparisce solo
// quando coincide con una pila identica (tecnica «pile identiche», CLAUDE.md) oppure dentro una macchina chiusa.
// La camera guarda da sud-ovest: chi lavora verso una macchina a nord si vede di schiena.
// Fonti nelle etichette tra parentesi (F = foto, V = video, PE = pianta, sito = rifra.com): etichetta() le toglie in pubblico.
import * as THREE from 'three';
import { box, cyl, tubo, gruppo, etichetta, persona, fondiStatici } from './prim.js';
import { ST, H_PROD } from './edificio.js';
import * as MC from './macchine.js';
import { ANTA, anim, pila, bancale, carrelloAnte, CEFLA, ESSIC, BRANDT, VP, EMC, logo } from './macchine.js';
import { ufficioTecnico, PT, PRIMO } from './uffici.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, liscio = t => t * t * (3 - 2 * t);
export function kf(c, k) { if (c <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) { const [t1, v1] = k[i], [t0, v0] = k[i - 1]; if (c <= t1) { const u = t1 > t0 ? ease((c - t0) / (t1 - t0)) : 1; return lerp(v0, v1, u); } } return k[k.length - 1][1]; }
const angLerp = (a, b, u) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * u; };
let M, MM;

// percorso di un pezzo: chiavi [t, [x,y,z], sollevamento del tratto]; tratti con easing, arco verticale se sollevamento > 0
function percorso(K) { return c => { if (c <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) { const [t1, b, lift = 0] = K[i], [t0, a] = K[i - 1];
  if (c <= t1) { const u = t1 > t0 ? ease((c - t0) / (t1 - t0)) : 1; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(Math.PI * u) * lift, lerp(a[2], b[2], u)]; } } return K[K.length - 1][1]; }; }
// cammino di una persona: chiavi [t, x, z, direzione da fermo?, «direzione fissa» (passo all'indietro)?].
// Direzione = verso del moto (atan2(dx,dz)), girata in 0,45 s; ampiezza del passo dalla velocità, fase dalla strada percorsa (piedi che non scivolano).
function cammino(K) {
  const seg = []; let h = K[0][3] ?? 0;
  for (let i = 1; i < K.length; i++) { const a = K[i - 1], b = K[i], L = Math.hypot(b[1] - a[1], b[2] - a[2]);
    if (L > 1e-3 && !b[4]) h = Math.atan2(b[1] - a[1], b[2] - a[2]); else if (b[3] !== undefined) h = b[3]; seg.push({ L, h }); }
  const acc = [0]; seg.forEach((q, i) => acc.push(acc[i] + q.L)); const h0 = K[0][3] ?? seg[0].h;
  return c => { if (c <= K[0][0]) return { x: K[0][1], z: K[0][2], ry: h0, passo: 0, s: 0 };
    let i = 1; while (i < K.length - 1 && c > K[i][0]) i++; const a = K[i - 1], b = K[i], S = seg[i - 1];
    const u = clamp((c - a[0]) / Math.max(1e-6, b[0] - a[0]), 0, 1), e = ease(u), hp = i > 1 ? seg[i - 2].h : h0;
    return { x: lerp(a[1], b[1], e), z: lerp(a[2], b[2], e), ry: angLerp(hp, S.h, liscio(clamp((c - a[0]) / .45, 0, 1))),
      passo: S.L > 1e-3 ? clamp(Math.sin(Math.PI * u) * 2.2, 0, 1) : 0, s: acc[i - 1] + S.L * e }; };
}
function muovi(p, st, t, o = {}) { p.position.set(st.x, 0, st.z); p.rotation.y = st.ry; p.posa(t, { passo: st.passo, fase: st.s / 1.4 * Math.PI * 2, ...o }); }
// polvere di lavorazione: particelle in una InstancedMesh (una chiamata), coordinate nel gruppo p
const polvere = (p, n = 14) => { const g = anim(p); const geo = new THREE.SphereGeometry(.03, 5, 4); const mat = new THREE.MeshStandardMaterial({ color: 0xe2d6c0, roughness: 1, transparent: true, opacity: .7 });
  const inst = new THREE.InstancedMesh(geo, mat, n); inst.frustumCulled = false; g.add(inst); const m4 = new THREE.Matrix4();
  g.aggiorna = (t, x, y, z, on, verso = [0, 1.2, 0]) => { inst.visible = on; if (!on) return; for (let i = 0; i < n; i++) { const ph = (t * .9 + i / n) % 1, a = i * 2.4;
    m4.makeTranslation(x + Math.cos(a) * .25 * (1 - ph) + verso[0] * ph * ph, y + verso[1] * ph * ph, z + Math.sin(a) * .25 * (1 - ph) + verso[2] * ph * ph); inst.setMatrixAt(i, m4); } inst.instanceMatrix.needsUpdate = true; };
  return g; };
// anta coricata (L in x, W in z) con origine al centro della faccia inferiore
function antaPiatta(p, mat, ruota = false) { const g = gruppo(p); ruota ? box(g, -ANTA.W / 2, 0, -ANTA.L / 2, ANTA.W, ANTA.T, ANTA.L, mat) : box(g, -ANTA.L / 2, 0, -ANTA.W / 2, ANTA.L, ANTA.T, ANTA.W, mat); return g; }
// posa una macchina (gruppo con origine al centro) nel mondo
const posa = (W, obj, x, z) => { W.add(obj); obj.position.set(x, 0, z); return obj; };
// gole di fresatura: segmenti sottili che crescono dall'inizio (geometria con origine sul bordo)
const GGOLA = new THREE.BoxGeometry(1, .004, .018).translate(.5, 0, 0);

export function costruisciReparti(scene, Mbase, opz = {}) {
  M = Mbase; MM = MC.materialiMacchine(M);
  const R = [], U = [], LAB = [];
  // nell'ordine di ST (edificio.js, ordine dettato da Marco il 02/10)
  const fab = [progetto, pannelli, fresatura, foratura, squadratura, sezionatura, bordatura, levigatura, verniciatura, lucidatura, montaggio, spedizione];
  ST.forEach((s, i) => { const g = gruppo(scene, s.x, 0, s.z); g.userData.reparto = i; const W = gruppo(g, -s.x, 0, -s.z); const labs = [];
    const L = (x, y, z, t) => { const o = etichetta(W, x, y, z, t); labs.push(o); return o; }; U.push(fab[i](W, L, s)); LAB.push(labs); R.push(g); });
  const statici = gruppo(scene); statici.userData.macchineStatiche = true; fuori(statici, opz); fondiStatici(statici);
  return { gruppi: R, update: U, etichette: LAB, statici };
}

/* 1 · Il progetto: ufficio tecnico al piano terra della palazzina (PE «ufficio tecnico / commerciale», F 7464); arredi in uffici.js.
   Sopra, nella vista esplosa (main.js aggiornaTetto), il primo piano con la sala riunioni e gli uffici direzionali (F 7469, 7470; Marco 30/09:
   «la stanza del CDA sta al secondo piano»; 02/10: etichetta «Sala riunioni · uffici direzionali», senza CDA e fuori dalla numerazione).
   Il plotter stampa una tavola: il foglio esce dal rullo verso l'open space, chi aspetta lo prende. ST [0,3; 0,3; 9,7 × 5,2] */
function progetto(W, L) {
  const { persone, plotter: [PX, PZ] } = ufficioTecnico(W, M);
  const foglio = anim(W); const f = box(foglio, PX + .2, 0, PZ - .02, 1.3, 1, .01, M.biancoCaldo);
  const p3 = persona(W, M, PX + .85, PZ - .8, { ry: 0, maglia: M.grigioScuro });   // davanti al plotter, dal lato dell'open space
  // etichette in ordine di importanza (in fiera si vedono le prime due): la sala sta nel gruppo del primo piano e sale con la vista esplosa
  L(3.3, 1.6, 1.6, 'Ufficio tecnico: ogni cucina è disegnata su misura (sito, F 7464)');
  if (PRIMO.P) PRIMO.P.add(L(...PRIMO.etichetta, 'Sala riunioni · uffici direzionali (F 7469, 7470; Marco 02/10)'));
  L(8.1, 1.3, 4.3, 'Plotter per le tavole di produzione (F 7464)'); L(9.4, 2.9, 5.5, 'Tavole di progetto appese (F 7464)');
  const altri = [...PT.persone, ...PRIMO.persone];   // reception, ufficio e sala del consiglio: si muovono con la tappa 1
  return t => { persone.forEach(p => p.posa(t, { seduto: 1, lavoro: 1, mov: .6 }));
    const c = t % 9, Lp = kf(c, [[0, .02], [7, .85], [9, .85]]); f.scale.y = Lp; f.position.y = .92 - Lp; f.visible = c < 7.6;
    p3.posa(t, { lavoro: clamp((c - 5.5) / 1, 0, 1) * (c < 7.4 ? 1 : 0) });
    for (const [p, o] of altri) p.posa(t, o); };
}

/* 2 · I pannelli: portone d'ingresso merci sud-est, dove finiscono le righe gialle del corridoio x 61 (Marco 02/10), deposito materiali
   (V f_050–f_052), muletto elettrico bianco (V f_042). ST [57; 33,8; 9,6 × 9,6]. Fuori dal portone il furgone che scarica lastre e ferramenta
   e riparte (arredi.js furgone, Marco 02/10). Il muletto porta un bancale di lastre dall'arrivo (dentro la porta sud) alla pila del deposito.
   Lastre 2800 × 2070 (formato comune, ILLUSTRATIVO). */
function pannelli(W, L) {
  posa(W, MC.depositoPannelli(), 64.9, 39.85);                                          // lastre in piedi contro il muro sud (F 7448 a destra)
  const lastre = (p, n) => { bancale(p, -1.4, -1.035, 2.8, 2.07); pila(p, -1.4, .144, -1.035, 2.8, 2.07, n, .025, [MM.mdfPieno, M.legno]); };
  const XA = 61.4, ZA = 38.9, XB = 65.3, ZP = 36.0;
  const A = gruppo(W, XA, 0, ZA); lastre(A, 12);                                        // arrivo dalla porta sud: lunghezza in x
  const B = gruppo(W, XB, 0, ZP); B.rotation.y = Math.PI / 2; lastre(B, 12);           // deposito: lunghezza in z
  const mul = MC.muletto(); W.add(mul); mul.userData.anim = true; const { forche, carico } = mul.userData.parti; carico.position.y = -.03;
  // bancale a 1,4 m davanti al muletto (prima 0,88): le lastre sono profonde 2,07 m e a 0,88 attraversavano il montante
  // e la pila d'arrivo (controllo collisioni, ricerca/COLLISIONI.md); le forche reggono la metà posteriore
  const cg = gruppo(carico, 0, 0, 1.4); lastre(cg, 12);
  const aut = persona(mul, M, 0, -.78, { ry: 0 }); aut.position.y = .47;
  const op = persona(W, M, 65.3, 38.3, { ry: Math.PI + .5 });
  L(60.9, 3.9, 42.7, 'Filiera corta: solo produttori della Brianza (Marco 02/10)'); L(64.9, 2.9, 39.6, 'Ingresso merci e deposito pannelli (V f_051; Marco 02/10)');
  L(XB, 1.0, ZP, 'Ogni lastra viene controllata prima dell’uso (sito)');
  const ZPA = ZA - 1.4, XPB = XB - 1.4;
  return t => { const c = t % 26;
    const x = kf(c, [[0, XA], [8.5, XA], [11, XPB], [12, XPB], [15, XA], [26, XA]]), z = kf(c, [[0, ZP], [3, ZPA], [4, ZPA], [7, ZP], [26, ZP]]);
    mul.position.set(x, 0, z); mul.rotation.y = kf(c, [[0, 0], [7, 0], [8.5, Math.PI / 2], [15, Math.PI / 2], [16.5, 0], [26, 0]]);
    forche.position.y = kf(c, [[0, .03], [3, .03], [4, .25], [11, .25], [12, .03], [26, .03]]); carico.visible = c > 3 && c < 12;
    aut.posa(t, { seduto: 1, lavoro: .6, volante: 1 }); op.posa(t, { lavoro: 1, mov: .5, guarda: [XB, .9, ZP + .6] }); };
}

/* 6 · La sezionatura: sezionatrice verticale a parete (V f_040, f_043). ST [54,8; 37,5; 6,2 × 3]. Due tagli verticali per ciclo. */
function sezionatura(W, L) {
  const X = 57.95, Z = 39.65, sez = posa(W, MC.sezionatrice(), X, Z), { tel, trave, testa } = sez.userData.parti;
  box(tel, -1.9, .36, -.12, 2.8, 2.07, .02, MM.mdfPieno);
  const G = new THREE.BoxGeometry(1, 1, .004).translate(0, .5, 0), tagli = [-.9, .3].map(x => { const k = new THREE.Mesh(G, M.nero); k.position.set(x, 2.43, -.125); k.userData.statico = false; const a = anim(tel); a.add(k); return k; });
  const op = persona(W, M, X + 1.9, Z - 1.25, { ry: 0 }), pol = polvere(tel);
  carrelloAnte(W, 55.3, 38.2, 6);
  L(X, 3.3, Z - .4, 'Sezionatrice verticale: taglia le lastre in piedi (V f_040)');
  // a riposo a X + 1,45 (prima 1,9): più a est, col passo laterale, si entrava nella pila d'arrivo della tappa 2 (x ≥ 60) e nel carico del muletto
  const opK = cammino([[0, X + 1.45, Z - 1.3, 0], [1.5, X + .3, Z - 1.3, 0, 1], [6.5, X + .3, Z - 1.3, 0], [8, X - .9, Z - 1.3, 0, 1], [12.5, X - .9, Z - 1.3, 0], [14, X + 1.45, Z - 1.3, 0, 1], [16, X + 1.45, Z - 1.3, 0]]);
  return t => { const c = t % 16, bx = kf(c, [[0, 1.9], [1.5, .3], [6.5, .3], [8, -.9], [12.5, -.9], [14, 1.9], [16, 1.9]]);
    const hy = kf(c, [[0, 2.6], [2, 2.6], [5, .38], [6.5, 2.6], [8.5, 2.6], [11, .38], [12.5, 2.6], [16, 2.6]]);
    trave.position.x = bx; testa.position.y = hy;
    const sp = clamp(1 - (c - 14) / 1.2, 0, 1);                          // dissolvenza delle linee di taglio a fine ciclo
    tagli.forEach((k, i) => { const on = i === 1 ? c > 2 : c > 8.5; const low = i === 1 ? (c < 5 ? Math.max(hy, .38) : .38) : (c < 11 ? Math.max(hy, .38) : .38);
      const len = on ? clamp(2.43 - low, .001, 2.07) : .001; k.visible = on && sp > .01; k.scale.set(.006 * sp + .0001, len, 1); k.position.y = 2.43 - len; });
    const cut = (c > 2 && c < 5) || (c > 8.5 && c < 11); pol.aggiorna(t, bx, hy, -.3, cut, [0, .6, -.5]);
    muovi(op, opK(c), t, { lavoro: cut ? 1 : .4, mov: .3 }); };
}

/* 5 · La squadratura: tre squadratrici a carro (Casolin V f_058; seconda F 7445, 7447; Altendorf V f_054). ST [40,8; 33,6; 14,6 × 4,4]
   Casolin: l'operatore prende l'anta dalla pila, la spinge sul carro oltre la lama e la posa sull'altra pila. Seconda: carro avanti e indietro. */
function squadratura(W, L) {
  const cas = posa(W, MC.squadratrice('casolin'), 42.7, 35.95), sq2 = posa(W, MC.squadratrice('bianca'), 48.7, 35.95); posa(W, MC.squadratrice('altendorf'), 53.6, 35.95);
  const X = 42.7, Z = 35.95, carro = cas.userData.parti.carro, carro2 = sq2.userData.parti.carro;
  const pA = [X - 1.9, 0, Z - 1.1], pB = [X - 1.9, 0, Z + 1.3];
  for (const p of [pA, pB]) { const top = bancale(W, p[0] - .6, p[2] - .9, 1.2, 1.8); pila(W, p[0] - .35, top, p[2] - .8, .7, 1.6, 8, ANTA.T, [MM.mdfPieno, MM.melaminico]); p[1] = top + 7 * ANTA.T; }
  const pan = anim(W); box(pan, -.35, 0, -.8, .7, ANTA.T, 1.6, MM.mdfPieno);
  box(carro2, -.95, .9, -1.0, .9, .02, 1.8, MM.melaminico);                                  // pannello sul carro della seconda (resta sul carro)
  const op = persona(W, M, X - 1.2, Z - 1.1, { ry: -Math.PI / 2 }), op2 = persona(W, M, 48.7 - .5, Z - 2.0, { ry: 0, maglia: M.grigioScuro }), pol = polvere(W);
  carrelloAnte(W, 46.2, 37.6, 6); carrelloAnte(W, 50.6, 37.4, 4, .1);
  L(X, 1.8, Z - .2, 'Casolin · squadratrice a carro (V f_058)'); L(53.6, 1.8, Z, 'Altendorf · squadratrice (V f_054)'); L(X - 1.2, .25, Z + 1.85, 'Riquadro arancione a terra intorno alla macchina (F 7445)');
  const cz = c => kf(c, [[0, -.9], [2.5, -.9], [5.5, .9], [7.5, .9], [10, -.9], [14, -.9]]);
  const panP = percorso([[0, pA], [1, pA], [2.5, [X - .37, .91, Z - .9], .35], [5.5, [X - .37, .91, Z + .9]], [5.6, [X - .37, .91, Z + .9]], [7, pB, .3]]);
  // Percorso rifatto col controllo collisioni (ricerca/COLLISIONI.md). Prima: piedi nei bancali, fianco nella guida del carro,
  // montante del braccio aereo (X − 1,1; Z − 1,25) attraversato, anta che passava nella pancia e squadra del carro (a quota anca,
  // x 40,4–42,3) che a fine corsa tornava attraverso l'operatore. Ora: prende l'anta dal capo nord della pila A (X − 1,9; Z − 2,25),
  // spinge il carro a X − 0,65, aspetta l'anta nel varco fra le due pile (Z + 0,1) mentre la squadra è in fondo e torna a nord
  // a est del montante prima che la squadra rientri.
  const opK = cammino([[0, X - 1.9, Z - 2.25, 0], [1, X - 1.9, Z - 2.25, 0], [2.5, X - .65, Z - 2.0], [2.9, X - .65, Z - 2.0, 0], [5.5, X - .65, Z - .2],
    [6.0, X - .95, Z - .05], [6.6, X - 1.6, Z + .1], [6.9, X - 1.6, Z + .1, 0], [7.8, X - 1.6, Z + .1, 0], [8.2, X - 1.05, Z + .1], [8.8, X - .75, Z - .65],
    [9.8, X - .75, Z - 2.2], [10.8, X - 1.9, Z - 2.25], [11.2, X - 1.9, Z - 2.25, 0], [14, X - 1.9, Z - 2.25, 0]]);
  return t => { const c = t % 14; carro.position.z = cz(c); const p = panP(c); pan.position.set(...p); pan.visible = c < 7;
    const pp = pan.position.z; pol.aggiorna(t, X - .02, 1.0, Z, c > 2.9 && c < 5.5 && pp + .8 > Z - .1, [0, .8, .2]);
    muovi(op, opK(c), t, { lavoro: c < 2.5 || (c > 2.9 && c < 7.2) ? 1 : 0, presa: [p[0], p[1] + .02, p[2]], largo: .6 });
    const c2 = (t + 4) % 11, z2 = kf(c2, [[0, -.9], [1, -.9], [4.5, .9], [5.5, .9], [9, -.9], [11, -.9]]); carro2.position.z = z2;
    // 0,75 (prima 0,6): la pancia entrava nella guida del carro
    op2.position.set(48.7 - .75, 0, Z + z2 - 1.1 - .3); op2.rotation.y = 0; op2.posa(t, { passo: (c2 > 1 && c2 < 4.5) || (c2 > 5.5 && c2 < 9) ? .7 : 0, lavoro: 1, fase: (Z + z2) / 1.4 * Math.PI * 2, presa: [48.7 - .55, .93, Z + z2 - .95], largo: .55 }); };
}

/* 4 · La foratura: Biesse Brema EKO 2.1 (F 7444), foratrice verticale; flusso est → ovest lungo il muro sud (JSON). ST [30,2; 36,2; 9,8 × 4,4]
   L'anta passa in piedi: la carica il primo operatore dal carrello a est, la ritira il secondo sul carrello a ovest. Fori sulla faccia verso nord. */
function foratura(W, L) {
  const X = 34, Z = 38.75, br = posa(W, MC.brema(), X, Z), pan = br.userData.parti.pan; posa(W, MC.foratriceBanco(), 38.95, 39.25);
  const panM = (p, fori) => { box(p, -ANTA.L / 2, 0, -.01, ANTA.L, ANTA.W, ANTA.T, MM.melaminico); const f = [];
    for (const u of [-.6, -.52, .52, .6]) for (const y of [.1, .5]) { const d = cyl(p, u, y, -.012, .014, .004, M.nero, { rx: -Math.PI / 2 }); d.position.set(u, y, -.011); d.visible = fori; f.push([d, u]); } return f; };
  const CA = [37.6, 38.0], CB = [30.95, 37.85];
  carrelloAnte(W, CA[0], CA[1], 3); carrelloAnte(W, CB[0], CB[1], 3);
  const sA = gruppo(W, CA[0], .21, CA[1] - .28), sB = gruppo(W, CB[0], .21, CB[1] - .28); panM(sA, false); panM(sB, true);
  const fori = panM(pan, true);
  const op1 = persona(W, M, 37.3, 37.1, { ry: 0 }), op2 = persona(W, M, 31.6, 37.1, { ry: 0, maglia: M.grigioScuro });
  L(X, 2.7, Z - .6, 'Biesse Brema EKO 2.1 · foratrice verticale (F 7444)'); L(38.95, 1.8, 39.2, 'Foratrice da banco (F 7444)');
  const zc = Z - .02, P = percorso([[0, [CA[0], .21, CA[1] - .28]], [1.5, [36.1, .8, zc], .3], [4.5, [X, .8, zc]], [7, [X, .8, zc]], [10, [31.9, .8, zc]], [11.5, [CB[0], .21, CB[1] - .28], .3]]);
  const k1 = cammino([[0, 37.3, 37.2, 0], [1.5, 36.3, 37.6, Math.PI], [2, 36.3, 37.6, Math.PI], [3.5, 37.3, 37.2, 0], [16, 37.3, 37.2, 0]]);
  // z 37,15 (prima 37,3): il piede entrava nella ruota del carrello; a 10 s z 37,3 (prima 37,6): passava dentro l'anta in piedi sul carrello
  const k2 = cammino([[0, 31.5, 37.15, 0], [9.5, 31.5, 37.15, Math.PI / 2], [10, 31.95, 37.3, Math.PI], [11.5, 31.2, 37.05, 0], [16, 31.5, 37.15, 0]]);
  return t => { const c = t % 16, p = P(c); pan.position.set(...p); pan.visible = c < 11.5;
    for (const [d, u] of fori) d.visible = p[0] + u < X + .05 || c > 10;
    const pr = [p[0], p[1] + .42, p[2]]; muovi(op1, k1(c), t, { lavoro: c < 1.6 ? 1 : 0, presa: pr, largo: .7 }); muovi(op2, k2(c), t, { lavoro: c > 9.8 && c < 11.6 ? 1 : 0, presa: pr, largo: .7 }); };
}

/* 3 · La fresatura: due centri di lavoro Biesse Rover A (F 7442, 7443; V f_062, f_063). ST [21,3; 26; 17,8 × 6,8]
   Rover 1: l'operatore prende un'anta dalla pila sul banco, la posa sulle ventose, la macchina fresa una gola a riquadro, l'anta va sull'altra pila.
   Rover 2: lavora una lastra intera (percorso continuo). «Armadio» M03: funzione ignota (PE «county level»), forma ILLUSTRATIVA. */
function fresatura(W, L) {
  const X = 25.7, Z = 28.7, r1 = posa(W, MC.roverA({ pulpito: true }), X, Z), r2 = posa(W, MC.roverA({ w: 6 }), 33.6, 28.9);
  { const a = gruppo(W, 38.25, 0, 29.15); for (let i = 0; i < 4; i++) MC.tbox(a, -1.0, 0, -2.2 + i * 1.1, 2.0, 2.0, 1.05, M.grigio, { r: .02 }); }
  // banco in truciolare davanti (F 7442, 7443) con le due pile di ante
  const BX = 23.3, BZ = 31.55; MC.tbox(W, BX, .86, BZ, 3.8, .04, .95, MM.truciolare, { r: .01 }); for (const [a, b] of [[.05, .05], [3.7, .05], [.05, .85], [3.7, .85]]) box(W, BX + a, 0, BZ + b, .06, .86, .06, M.verdeScuro);
  const PA = [24.2, .9 + 9 * ANTA.T, 32.0], PB = [26.2, .9 + 9 * ANTA.T, 32.0];
  pila(W, PA[0] - .7, .9, PA[2] - .3, 1.4, .6, 10, ANTA.T, MM.mdfPieno); pila(W, PB[0] - .7, .9, PB[2] - .3, 1.4, .6, 9, ANTA.T, MM.mdfPieno);
  const PATH = [[-.63, -.23], [.63, -.23], [.63, .23], [-.63, .23], [-.63, -.23]];
  const gola = (p, dyn) => { const segs = []; for (let i = 1; i < PATH.length; i++) { const [a, b] = [PATH[i - 1], PATH[i]], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = new THREE.Mesh(GGOLA, M.legno); m.position.set(a[0], ANTA.T + .001, a[1]); m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); m.scale.x = dyn ? .001 : len; m.userData.statico = !dyn; m.userData.seg = { a, b, len }; p.add(m); segs.push(m); } return segs; };
  const top = gruppo(W, PB[0], PB[1], PB[2]); box(top, -.7, 0, -.3, 1.4, ANTA.T, .6, MM.mdfPieno); gola(top, false);
  const pan = anim(W); box(pan, -.7, 0, -.3, 1.4, ANTA.T, .6, MM.mdfPieno); const segs = gola(pan, true), TL = segs.reduce((q, s) => q + s.userData.seg.len, 0);
  box(r2, -2.3, .96, -1.2, 2.8, .018, 1.3, MM.mdfPieno);
  const { portale, testa, mandrino } = r1.userData.parti, R2 = r2.userData.parti;
  const op = persona(W, M, 24.2, 31.0, { ry: 0 }), op2 = persona(W, M, 32.2, 31.4, { ry: Math.PI, maglia: M.grigioScuro }), pol = polvere(W), pol2 = polvere(W);
  L(X, 3.2, Z - .5, 'Biesse Rover A · centro di lavoro CNC (F 7442)'); L(33.6, 3.2, 28.9, 'Secondo centro di lavoro Biesse (F 7443)'); L(24.8, 1.3, 32, 'Banco con le ante da lavorare (F 7442)');
  const TAV = [X, .96, Z - .4];
  // controllo collisioni (ricerca/COLLISIONI.md): prima l'anta volava dalla pila alla tavola attraverso il busto dell'operatore, e al
  // ritorno di nuovo. Ora l'anta scivola a est sopra il banco (1,7 s) e passa a est dell'operatore, che la segue quando è passata;
  // al ritorno l'operatore si scosta a ovest (x 24,6) mentre l'anta torna sulla pila B
  const P = percorso([[0, PA], [1, PA], [1.7, [25.3, 1.2, 31.75], .1], [2.8, TAV, .25], [12, TAV], [13.6, PB, .4]]);
  const k = cammino([[0, 24.1, 31.05, 0], [2.2, 24.1, 31.05, 0], [2.9, 25.5, 29.75], [3.0, 25.5, 29.75, Math.PI], [3.7, 25.3, 30.6, Math.PI, 1], [12, 25.3, 30.6, Math.PI], [12.6, 24.6, 29.9], [12.8, 24.6, 29.9, Math.PI],
    [13.8, 24.6, 29.9, Math.PI], [15.3, 24.1, 31.05], [16, 24.1, 31.05, 0]]);
  const at = s => { let acc = 0; for (const q of segs) { const { a, b, len } = q.userData.seg; if (acc + len >= s) { const u = (s - acc) / len; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]; } acc += len; } return PATH[PATH.length - 1]; };
  return t => { const c = t % 16, p = P(c); pan.position.set(...p); pan.visible = c < 13.6;
    const prog = clamp((c - 4.4) / 6.6, 0, 1), home = [2.4, -.9]; let tool;
    if (c < 3.6) tool = home; else if (c < 4.4) { const u = ease((c - 3.6) / .8); tool = [lerp(home[0], PATH[0][0], u), lerp(home[1], PATH[0][1] - .4, u)]; }
    else if (c < 11) { const q = at(prog * TL); tool = [q[0], q[1] - .4]; } else if (c < 12) { const u = ease(c - 11); tool = [lerp(PATH[4][0], home[0], u), lerp(PATH[4][1] - .4, home[1], u)]; } else tool = home;
    const cut = c > 4.4 && c < 11; portale.position.x = tool[0]; testa.position.z = tool[1]; mandrino.position.y = cut ? 0 : .12;
    const shown = c < 4.4 ? 0 : cut ? prog * TL : TL; let acc = 0;
    for (const q of segs) { const { len } = q.userData.seg; const u = clamp((shown - acc) / len, 0, 1); acc += len; q.visible = u > 0; q.scale.x = Math.max(.001, u * len); }
    pol.aggiorna(t, X + tool[0], 1.02, Z + tool[1], cut, [0, 1.6, 0]);
    muovi(op, k(c), t, { lavoro: c < 2.9 || (c > 12.4 && c < 13.7) ? 1 : 0, presa: [p[0], p[1] + .02, p[2]], largo: .7 });
    // Rover 2: percorso continuo sulla lastra (nessun pezzo che compare)
    const u2 = t * .35, x2 = -1.0 + Math.sin(u2) * 1.2, z2 = -.55 + Math.sin(u2 * 2.3) * .45, down = Math.sin(u2 * .5) > -.3;
    R2.portale.position.x = x2; R2.testa.position.z = z2; R2.mandrino.position.y = down ? 0 : .12; pol2.aggiorna(t, 33.6 + x2, 1.02, 28.9 + z2, down, [0, 1.5, 0]);
    op2.posa(t, { lavoro: 1, mov: .3 }); };
}

/* 7 · La bordatura: bordatrice Brandt (F 7446; V f_024, f_025) e levigabordi De Stefani (V f_022), flusso ovest → est (JSON). ST [41; 24,2; 8,8 × 6,4] */
function bordatura(W, L) {
  const X = 45.65, Z = 29.05; posa(W, MC.brandt(), X, Z); const XD = 44.85, ZD = 25.15; posa(W, MC.deStefani(), XD, ZD);
  const piatta = (x, z, n) => { const top = bancale(W, x - .75, z - .4, 1.5, .8); pila(W, x - .7, top, z - .3, 1.4, .6, n, ANTA.T, MM.mdfPieno); return top + (n - 1) * ANTA.T; };
  const A = [41.9, 0, 30.55]; A[1] = piatta(A[0], A[2], 8); const B = [49.55, 0, 30.55]; B[1] = piatta(B[0], B[2], 7);
  const bB = box(W, B[0] - .7, B[1], B[2] - .304, 1.4, ANTA.T, .004, M.bianco);           // bordo sull'anta in cima alla pila d'arrivo
  const pan = anim(W); box(pan, -.7, 0, -.3, 1.4, ANTA.T, .6, MM.mdfPieno); const bordo = box(pan, -.7, 0, -.304, 1.4, ANTA.T + .002, .004, M.bianco);
  const zP = Z + BRANDT.zPan + .18, P = percorso([[0, A], [1.4, [X - 3.3, BRANDT.y, zP], .4], [8.4, [X + 3.4, BRANDT.y, zP]], [10, B, .4]]);
  const op1 = persona(W, M, 42.4, 30.3, { ry: Math.PI }), op2 = persona(W, M, 49.0, 30.2, { ry: Math.PI, maglia: M.grigioScuro });
  // controllo collisioni (ricerca/COLLISIONI.md): prima gli operatori stavano fra la pila e la rotaia, sulla traiettoria dell'anta
  // (che passava nella pancia), con i piedi nei bancali e nella pulsantiera gialla. Ora stanno ai capi dell'anta, nella striscia
  // z 29,65–30,15 fra la rotaia e le pile: il primo a ovest (spinge la coda dell'anta nell'ingresso), il secondo a est dell'uscita
  const k1 = cammino([[0, 40.95, 29.85, Math.PI / 2], [1.0, 40.95, 29.85, Math.PI / 2], [1.8, 41.4, 29.85, Math.PI / 2], [2.2, 41.4, 29.85, Math.PI / 2], [3, 40.95, 29.85, Math.PI / 2, 1], [14, 40.95, 29.85, Math.PI / 2]]);
  const k2 = cammino([[0, 50.5, 29.85, -Math.PI / 2], [8, 50.5, 29.85, -Math.PI / 2], [8.6, 50.4, 29.85, -Math.PI / 2], [10, 50.4, 29.85, -Math.PI / 2], [11, 50.5, 29.85, -Math.PI / 2, 1], [14, 50.5, 29.85, -Math.PI / 2]]);
  // De Stefani: anta spinta dai rulli blu lungo la rotaia (pile identiche ai due capi)
  const C = [42.1, 0, 26.0]; C[1] = piatta(C[0], C[2], 6); const D = [47.7, 0, 26.0]; D[1] = piatta(D[0], D[2], 5);
  const pan2 = anim(W); box(pan2, -.7, 0, -.3, 1.4, ANTA.T, .6, MM.mdfPieno);
  const P2 = percorso([[0, C], [1.4, [XD - 2.2, .86, ZD + .5], .3], [8, [XD + 2.3, .86, ZD + .5]], [9.4, D, .3]]);
  const op3 = persona(W, M, 43.2, 26.6, { ry: Math.PI });
  // un po' più a sud-est (prima i piedi entravano nel bancale della pila C: x ≤ 42,85, z ≤ 26,4) — controllo collisioni
  const k3 = cammino([[0, 42.95, 26.7, -Math.PI / 2], [1.4, 43.15, 26.45, Math.PI], [2.2, 43.15, 26.45, Math.PI], [3, 42.95, 26.7, -Math.PI / 2], [12, 42.95, 26.7, -Math.PI / 2]]);
  const pol = polvere(W);
  L(X - 1, 2.0, Z, 'Brandt · bordatrice (F 7446)'); L(XD, 1.6, ZD, 'De Stefani · levigabordi (V f_022)');
  return t => { const c = t % 14, p = P(c); pan.position.set(...p); pan.visible = c < 10;
    const lead = p[0] + .7, len = c < 1.4 ? 0 : c > 8.4 ? 1.4 : clamp(lead - (X - 2.3), 0, 1.4);
    bordo.visible = len > .01; bordo.scale.x = Math.max(.001, len); bordo.position.x = .7 - len / 2;
    pol.aggiorna(t, X + 1.2, 1.0, Z + .05, c > 3.5 && c < 8.4, [0, .5, .4]);
    muovi(op1, k1(c), t, { lavoro: c < 1.6 ? 1 : 0, presa: [p[0], p[1] + .02, p[2]], largo: .7 }); muovi(op2, k2(c), t, { lavoro: c > 8.4 && c < 10.2 ? 1 : 0, presa: [p[0], p[1] + .02, p[2]], largo: .7 });
    const c2 = (t + 5) % 12, p2 = P2(c2); pan2.position.set(...p2); pan2.visible = c2 < 9.4; muovi(op3, k3(c2), t, { lavoro: c2 < 1.6 ? 1 : .3, mov: .3, presa: c2 < 1.6 ? [p2[0], p2[1] + .02, p2[2]] : undefined, largo: .7 }); };
}

/* 8 · La levigatura (Marco 02/10: «il pannello va levigato dove adesso c'è la macchina EMC», la macchina sul retro, prima a destra; prima del
   02/10 la EMC stava nella tappa della lucidatura). EMC (V f_041, ovest → est) e, subito a nord, la levigatrice a nastro largo con cinque
   calate e collettore (F 7449, M13; il suo ruolo nel nuovo percorso è da chiedere a RiFRA, HANDOFF § 8). ST [61; 22,4; 9,2 × 8,4]
   In tutte e due l'anta grezza parte dalla pila sul piano di carico, attraversa la macchina (ne esce levigata) e si ferma all'uscita. */
function levigatura(W, L) {
  const XE = 65.8, ZE = 28.6; posa(W, MC.emc(), XE, ZE);
  pila(W, XE + EMC.xIn + .05, EMC.y - .02, ZE - .3, 1.4, .6, 3, ANTA.T, MM.mdfPieno);
  const pe = anim(W); box(pe, -.7, 0, -.3, 1.4, ANTA.T, .6, MM.mdfPieno);
  const opE = persona(W, M, XE - 2.7, ZE + .2, { ry: Math.PI / 2 });
  L(XE, 2.7, ZE, 'EMC · levigatrice: qui il pannello viene levigato (V f_041; Marco 02/10)');
  const yT = EMC.y - .02 + 2 * ANTA.T;
  const emc = t => { const c = t % 10, x = kf(c, [[0, XE + EMC.xIn + .75], [1, XE + EMC.xIn + .75], [5, XE + 1.35], [10, XE + 1.35]]);
    pe.position.set(x, yT, ZE); pe.visible = c < 4.9; opE.posa(t, { lavoro: c < 1.6 ? 1 : .2, mov: .3, passo: c > 1 && c < 1.8 ? .4 : 0, presa: c < 1.6 ? [x, yT + .02, ZE] : undefined, largo: .7 }); opE.position.x = XE - 2.7 + kf(c, [[0, 0], [1, 0], [1.8, .15], [3, 0], [10, 0]]); };   // passo di 15 cm (prima 40: la pancia entrava nel rullo del piano di carico)
  const X = 64.65, Z = 24.45; posa(W, MC.levigatrice(), X, Z);
  const zP = Z + .3, yP = .86 + 4 * ANTA.T; pila(W, X - 3.35, .86, zP - .3, 1.4, .6, 5, ANTA.T, MM.mdfPieno); pila(W, X + 2.3, .92, zP - .3, 1.4, .6, 2, ANTA.T, MM.mdfPieno);
  const pan = anim(W); box(pan, -.7, 0, -.3, 1.4, ANTA.T, .6, MM.mdfPieno);
  // carrello rosso stretto davanti alla macchina (F 7449)
  { const x = 63.4, z = 25.9; for (const s of [0, .55]) box(W, x + s, .12, z, .05, 1.25, .05, M.rosso); box(W, x, .12, z, .6, .04, .45, M.legno); box(W, x, 1.3, z, .6, .05, .05, M.rosso); for (const s of [0, .55]) cyl(W, x + s + .03, 0, z + .45, .06, .12, M.nero); }
  const op = persona(W, M, X - 2.65, Z + 1.25, { ry: Math.PI }), pol = polvere(W, 18);
  L(X, 3.5, Z - .3, 'Levigatrice a nastro largo, cinque aspirazioni (F 7449)'); L(X + 1.5, 5.3, Z - .75, 'Il sito: dal 2005 una levigatrice robotizzata');
  // a Z + 1,4 (prima 1,2): accanto al basamento (z ≤ Z + 1) fianco e mano sinistra entravano nella macchina — controllo collisioni
  const k = cammino([[0, X - 2.65, Z + 1.4, Math.PI], [1.2, X - 2.2, Z + 1.4, Math.PI / 2], [2, X - 2.2, Z + 1.4, Math.PI / 2], [3, X - 2.65, Z + 1.4, Math.PI], [12, X - 2.65, Z + 1.4, Math.PI]]);
  return t => { const c = t % 12, px = kf(c, [[0, X - 2.65], [1, X - 2.65], [7, X + 3.0], [12, X + 3.0]]); pan.position.set(px, yP, zP); pan.visible = c < 7;
    pol.aggiorna(t, X + 1.4, 1.05, zP, px > X + .4 && px < X + 2.9, [.8, 1.2, .3]); muovi(op, k(c), t, { lavoro: c < 1.6 ? 1 : 0, presa: [px, yP + .02, zP], largo: .7 }); emc(t); };
}

/* 9 · La verniciatura: Cefla Finishing Spraybotic (F 7450–7452; V f_033–f_038) sulla linea di verniciatura, flusso est → ovest (JSON: carico a est).
   Come lavora la macchina vera (ricerca/CEFLA-SPRAYBOTIC.md, schede Cefla/Lenmark): robot CARTESIANO; il pezzo passa sotto una barriera di lettura
   a fotodiodi che ne rileva sagoma e posizione, poi il nastro si ferma e la testa lavora il pezzo fermo: prima i bordi, con le pistole inclinate e
   la testa che gira attorno all'anta, poi la faccia a passate trasversali; lo spruzzo si accende solo sopra il pezzo. Qui: l'operatore di F 7452
   posa le ante grezze sul nastro di carico, il nastro le porta nel tunnel e poi nella Spraybotic (vista in sezione dal lato sud, macchine.js),
   le ante laccate escono sulla rulliera (V f_033) e due operatori le sfilano su un carrello di essiccazione (V f_019). ST [48,9; 14,9; 20,4 × 7]
   Dal 30/09 sera (Marco): QUATTRO ante di base 72 × 60 per ciclo, in un gruppo 2 × 2. Il numero è una STIMA (ricerca/CAPACITA-VERNICIATURA.md:
   sul piano di 3,5 × 1,3 m ne stanno 4–8), non un dato di RiFRA. */
function verniciatura(W, L) {
  const X = 59.1, Z = 18.05, lin = posa(W, MC.lineaCefla(), X, Z), { ponte, carrello, colonna, rotore, pistola, ventaglio, lettura, lampade } = lin.userData.parti; posa(W, MC.mixer(), 59.8, 20.8);
  const zc = Z + CEFLA.zc, Y = CEFLA.NASTRO, T = ANTA.T, XR = X + CEFLA.XR, XL = X + CEFLA.XL, DX = CEFLA.PASSO, PI = Math.PI;
  // anta di base della tappa 9, misure LOCALI (ANTA di macchine.js resta per le altre tappe): 72 cm lungo il nastro (x) × 60 cm attraverso (z).
  // Gruppo 2 × 2 con 10 cm fra i pezzi: centri a (±GX, ±GZ); ingombro 1,54 × 1,30 (nastro utile 1,30, PASSO 1,75). EX, EZ bordi esterni, IX, IZ interni
  const AL = .72, AW = .6, hL = AL / 2, hW = AW / 2, GX = .41, GZ = .35, EX = GX + hL, EZ = GZ + hW, IX = GX - hL, IZ = GZ - hW;
  const PEZZI = [[-GX, GZ], [-GX, -GZ], [GX, GZ], [GX, -GZ]], RET = PEZZI.map(([a, b]) => [a - hL, a + hL, b - hW, b + hW]);
  // carrello di essiccazione, spostato a x 47,0 (prima 47,6): il gruppo sulla rulliera di uscita occupa x 48,0–49,6. Ogni livello (1,09 × 1,23)
  // prende 2 ante affiancate in z (a ±ZC): arrivi ai livelli 5–6 nei cicli pari e 7–8 nei dispari (sopra la quota del nastro), dove ci sono già
  // ante laccate identiche (tecnica «pile identiche»). Fra questo carrello (46,4–47,6) e quelli fermi (fino a 46,2) restano 20 cm
  const CX = 47.0, XC = CX + .05, ZC = .315, LIV = [[5, 6], [7, 8]], XE = XR - 3 * DX;
  posa(W, MC.carrelloEssiccazione({ salta: [5, 6, 7, 8] }), CX, zc);
  for (const i of [5, 6, 7, 8]) for (const s of [-1, 1]) box(W, XC - hL, ESSIC.livelli[i] + .025, zc + s * ZC - hW, AL, T, AW, M.laccato);
  // pila d'ingresso di ante 72 × 60 su un tavolino (ILLUSTRATIVO), a 1 m dal nastro di carico: l'operatore sta in mezzo, fra pila e nastro
  const PA = [68.8, .8 + 5 * T, 19.6]; box(W, 68.1, .74, 19.25, 1.4, .06, .7, M.acciaio); for (const [a, b] of [[68.15, 19.3], [69.4, 19.3], [68.15, 19.85], [69.4, 19.85]]) box(W, a, 0, b, .05, .74, .05, M.acciaio);
  pila(W, PA[0] - hL, .8, PA[2] - hW, AL, AW, 6, T, M.biancoCaldo);
  // --- ciclo a nastro fermo (modo robot della Spraybotic). Tempi ILLUSTRATIVI e accelerati (con i 70 m²/h della scheda 4 ante da 0,43 m²
  // richiederebbero circa 90 s). P = 13 s: il nastro avanza di un passo DX in TM = 2 s, poi sta fermo 11 s. Posti di sosta k: x = XR + k·DX.
  // Carico: l'operatore posa un'anta ogni P/4 = 3,25 s sul nastro di carico, che scorre a 0,35 m/s e le porta nel tunnel; lì (nascosto,
  // ILLUSTRATIVO) si forma il gruppo 2 × 2. Il gruppo caricato nel ciclo n, nel ciclo N = n + d (d ≥ 2) sta a k = 8 − d − f (f = avanzamento):
  // d = 2…4 nel tunnel (nascosto finché x > 61), d = 6 passa sotto la barriera (k 2 → 1), d = 7 si vernicia a k = 0 (x 54,05),
  // d = 9 è dentro la testata ovest, d = 10 esce sulla rulliera (k = −3, x 48,8) e va sul carrello.
  // Sosta: 2,0–2,4 s la testa scende e inclina le pistole di 35°; 2,4–9,9 bordi di tutte e 4 le ante (perimetro esterno del gruppo con 4 quarti
  // di cerchio, poi le 4 corse lungo i bordi interni affacciati sugli spazi fra i pezzi: la testa fa 3 giri); 9,9–10,2 raddrizza;
  // 10,2–12,7 faccia di tutto il gruppo in 5 passate trasversali da 31 cm (due ugelli), spruzzo spento fra i pezzi e fuori dal gruppo.
  const P = 13, TM = 2, E0 = 2.4, E1 = 9.9, F0 = 10.2, NP = 5, BANDA = 2 * EX / NP, F1 = F0 + NP * .5, TH = 35 * PI / 180;
  const xk = k => XR + DX * k;
  // corse sui bordi [punto di partenza sul bordo, direzione, lunghezza, φ, intervalli dei pezzi lungo la corsa]. La testa sta fuori dal bordo di RA
  // lungo (sin φ, cos φ) e la pistola inclinata punta verso il bordo: la punta resta a 17 cm dal bordo e 25 cm sopra. Sulle corse interne la testa
  // passa sopra l'anta vicina (punta a 25 cm dalla sua faccia). ILLUSTRATIVO: con la testa fuori dal gruppo il carrello supera di poco la corsa di 1,3 m
  const RA = .17 + .27 * Math.sin(TH), ARC = PI / 2 * RA, ivX = [[-EX, -IX], [IX, EX]], ivZ = [[-EZ, -IZ], [IZ, EZ]];
  const CORSE = [[EX, EZ, -1, 0, 2 * EX, 0, ivX], [-EX, EZ, 0, -1, 2 * EZ, -PI / 2, ivZ], [-EX, -EZ, 1, 0, 2 * EX, -PI, ivX], [EX, -EZ, 0, 1, 2 * EZ, -1.5 * PI, ivZ],
    [EX, IZ, -1, 0, 2 * EX, -3 * PI, ivX], [-EX, -IZ, 1, 0, 2 * EX, -4 * PI, ivX], [IX, EZ, 0, -1, 2 * EZ, -4.5 * PI, ivZ], [-IX, -EZ, 0, 1, 2 * EZ, -5.5 * PI, ivZ]];
  // segmenti del percorso: corse (spruzzo solo sopra i pezzi), quarti di cerchio agli spigoli esterni, trasferimenti a spruzzo spento
  const asse = (px, pz, f) => [px + RA * Math.sin(f), pz + RA * Math.cos(f)], SEG = [];
  CORSE.forEach(([x0, z0, dx, dz, l, f, iv], j) => {
    if (j > 3) { const [ax0, az0, f0] = SEG[SEG.length - 1].fine, [ax1, az1] = asse(x0, z0, f);
      SEG.push({ l: Math.hypot(ax1 - ax0, az1 - az0), fn: u => ({ x: lerp(ax0, ax1, u), z: lerp(az0, az1, u), f: lerp(f0, f, u), on: false }), fine: [ax1, az1, f] }); }
    SEG.push({ corsa: j, l, fn: u => { const px = x0 + dx * l * u, pz = z0 + dz * l * u, s = dx ? px : pz, [ax, az] = asse(px, pz, f);
      return { x: ax, z: az, f, on: iv.some(([a, b]) => s > a - .01 && s < b + .01) }; }, fine: [...asse(x0 + dx * l, z0 + dz * l, f), f] });
    if (j < 4) { const cx = x0 + dx * l, cz = z0 + dz * l;
      SEG.push({ l: ARC, fn: u => { const ff = f - u * PI / 2, [ax, az] = asse(cx, cz, ff); return { x: ax, z: az, f: ff, on: true }; }, fine: [...asse(cx, cz, f - PI / 2), f - PI / 2] }); }
  });
  let LPER = 0; for (const g of SEG) { g.s0 = LPER; LPER += g.l; }   // ~16,9 m in 7,5 s: ~2,25 m/s
  // stato della testa nel ciclo (x, z rispetto al centro del gruppo fermo; dy asse verticale; f rotazione; tl inclinazione; on spruzzo)
  const YF = -.18, YB = -.3, Z0 = .8, FX = EX - (NP - .5) * BANDA, FZ = (NP - 1) % 2 ? -Z0 : Z0, A0 = SEG[0].fn(0), AF = SEG[SEG.length - 1].fine, FF = -6 * PI;
  function testa(c) {
    if (c < TM) { const u = ease(clamp(c / 1.4, 0, 1)); return { x: lerp(FX, A0.x, u), z: lerp(FZ, A0.z, u), dy: lerp(YF, 0, u), f: 0, tl: 0, on: false }; }
    if (c < E0) { const u = ease((c - TM) / (E0 - TM)); return { x: A0.x, z: A0.z, dy: lerp(0, YB, u), f: 0, tl: TH * u, on: false }; }
    if (c < E1) { const s = (c - E0) / (E1 - E0) * LPER; let g = SEG[0]; for (const q of SEG) if (s >= q.s0) g = q;
      return { ...g.fn(clamp((s - g.s0) / g.l, 0, 1)), dy: YB, tl: TH, s }; }
    if (c < F0) { const u = ease((c - E1) / (F0 - E1)); return { x: lerp(AF[0], EX - BANDA / 2, u), z: lerp(AF[1], -Z0, u), dy: lerp(YB, YF, u), f: lerp(AF[2], FF, u), tl: TH * (1 - u), on: false }; }
    const i = Math.min(NP - 1, Math.floor((c - F0) / .5)), w = c - F0 - .5 * i, z0 = i % 2 ? Z0 : -Z0, z = lerp(z0, -z0, liscio(clamp(w / .4, 0, 1)));
    const x = EX - (i + .5) * BANDA - (w > .4 && i < NP - 1 ? BANDA * ease((w - .4) / .1) : 0);
    return { x, z, dy: YF, f: FF, tl: 0, on: w < .4 && Math.abs(z) < EZ + .03 && Math.abs(z) > IZ - .02, i, zg: z };
  }
  // ante sul nastro principale: due InstancedMesh (laccato e grezzo, 2 chiamate, senza ombra: stanno dentro la cabina o nel tunnel).
  // Le ante in mano alle persone (4 al carico, 4 allo scarico) sono mesh normali, così il controllo collisioni le vede
  const NI = 48, m4 = new THREE.Matrix4(), GU = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), gI = anim(W);
  const iLac = new THREE.InstancedMesh(GU, M.laccato, NI), iGrz = new THREE.InstancedMesh(GU, M.biancoCaldo, NI);
  for (const im of [iLac, iGrz]) { im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.count = 0; gI.add(im); }
  const metti = (im, x0, x1, z0, z1, y0 = Y, h = T) => { if (im.count >= NI || x1 - x0 < .002 || z1 - z0 < .002) return;
    m4.makeScale(x1 - x0, h, z1 - z0); m4.setPosition((x0 + x1) / 2, y0, (z0 + z1) / 2); im.setMatrixAt(im.count++, m4); };
  const gruppo4 = (im, gx) => { for (const [a, b, c2, d2] of RET) metti(im, gx + a, gx + b, zc + c2, zc + d2); };
  // gruppo in lavorazione (fermo in gx): bordi laccati fin dove è passato lo spruzzo (strisce di 3 mm sui fianchi, solo sui pezzi),
  // faccia a strisce di passata, pezzo per pezzo
  function inLavoro(gx, c, h) {
    if (c >= F1) return gruppo4(iLac, gx);
    const s = c < E1 ? h.s : LPER, e = .003;
    for (const g of SEG) { if (g.corsa === undefined) continue; const q = clamp(s - g.s0, 0, g.l); if (q < .002) continue;
      const [x0, z0, dx, dz, , f, iv] = CORSE[g.corsa], a = dx ? x0 : z0, b = a + (dx || dz) * q, lo = Math.min(a, b), hi = Math.max(a, b);
      const o = dx ? Math.round(Math.cos(f)) : Math.round(Math.sin(f));   // verso di fuori del bordo spruzzato
      for (const [p0, p1] of iv) { const u0 = Math.max(lo, p0), u1 = Math.min(hi, p1); if (u1 <= u0) continue;
        if (dx) metti(iLac, gx + u0, gx + u1, zc + (o > 0 ? z0 : z0 - e), zc + (o > 0 ? z0 + e : z0), Y - .001, T + .002);
        else metti(iLac, gx + (o > 0 ? x0 : x0 - e), gx + (o > 0 ? x0 + e : x0), zc + u0, zc + u1, Y - .001, T + .002); } }
    if (c < F0) return gruppo4(iGrz, gx);
    const i = h.i, b0 = EX - (i + 1) * BANDA, b1 = EX - i * BANDA, pari = i % 2 === 0;
    for (const [x0, x1, z0, z1] of RET) { metti(iLac, gx + Math.max(x0, b1), gx + x1, zc + z0, zc + z1);            // passate finite
      const xa = gx + Math.max(x0, b0), xb = gx + Math.min(x1, b1), zs = clamp(h.zg, z0, z1);                          // passata in corso
      if (pari) { metti(iLac, xa, xb, zc + z0, zc + zs); metti(iGrz, xa, xb, zc + zs, zc + z1); } else { metti(iLac, xa, xb, zc + zs, zc + z1); metti(iGrz, xa, xb, zc + z0, zc + zs); }
      metti(iGrz, gx + x0, gx + Math.min(x1, b0), zc + z0, zc + z1); }                                                 // ancora da fare
  }
  const antaMesh = mat => { const g = anim(W); box(g, -hL, 0, -hW, AL, T, AW, mat, { cast: false }); return g; };
  const gC = [0, 1, 2, 3].map(() => antaMesh(M.biancoCaldo));   // ante del carico (dalla pila al nastro di carico e nel tunnel)
  const gS = PEZZI.map(() => antaMesh(M.laccato));              // ante dello scarico (dalla testata ovest al carrello), una per posto del gruppo
  // nebbia di vernice: goccioline lungo il ventaglio (InstancedMesh, una chiamata), solo mentre la pistola spruzza sopra il pezzo
  const NG = 36, gN = anim(W), gocce = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xe9e5dc, transparent: true, opacity: .3, depthWrite: false }), NG);
  gocce.frustumCulled = false; gocce.castShadow = false; gN.add(gocce); const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
  lampade[2].material.emissive.setHex(0x2fbf45); lampade[2].material.emissiveIntensity = 1.2;   // semaforo verde: linea sempre in marcia
  // F 7452: maglietta nera, grembiule blu, guanti verdi con polsino giallo, calzoncini di jeans, calze bianche, scarpe nere con suola bianca, barba
  const op = persona(W, M, 68.8, 19.1, { ry: 0, grembiule: M.grembiule, guanti: M.guanti, pant: M.jeans, calzoncini: true, calze: .9, scarpe: [0x141416, .85], barba: 1, capelli: 'sfumati', colCapelli: 0x1d1612, occhiali: false }), op2 = persona(W, M, 61.2, 21.9, { ry: Math.PI, grembiule: M.grembiule, maglia: M.grigioScuro });
  op2.position.set(60.45, 0, 21.2);   // davanti al quadro del mixer (prima 61,2; 21,9: in piedi dentro un fusto di vernice). Creato alle coordinate vecchie: stesso aspetto
  // carico (tempi ILLUSTRATIVI): un viaggio ogni TT = 3,25 s. L'operatore sta fra la pila (a sud) e il nastro di carico (a nord): prende l'anta
  // guardando la pila, si gira verso est con l'anta davanti a sé (a 50 cm), la posa al centro del nastro e torna girandosi verso ovest.
  // Il nastro di carico scorre a V e porta l'anta nel tunnel (nascosta quando è tutta dentro la testata est, x < XH)
  const TT = P / 4, V = .35, XP = 69.9, XH = 68.44 - hL, C0 = [68.8, 18.85], C1 = [69.9, 18.5];
  const statoC = u => { if (u < .9) return { x: C0[0], z: C0[1], ry: 0 };
    if (u < 1.9) { const e = ease(u - .9); return { x: lerp(C0[0], C1[0], e), z: lerp(C0[1], C1[1], e), ry: PI * e }; }
    if (u < 2.3) return { x: C1[0], z: C1[1], ry: PI };
    const e = ease(clamp((u - 2.3) / (TT - 2.45), 0, 1)); return { x: lerp(C1[0], C0[0], e), z: lerp(C1[1], C0[1], e), ry: PI + PI * e }; };
  const tenuta = s => [s.x + Math.sin(s.ry) * .5, 1.0, s.z + Math.cos(s.ry) * .5];
  const antaC = u => { if (u < .5) return [...PA, 0]; const s = statoC(u), q = tenuta(s);                  // sulla pila: identica alla cima
    if (u < .9) { const e = ease((u - .5) / .4); return [lerp(PA[0], q[0], e), lerp(PA[1], q[1], e), lerp(PA[2], q[2], e), 0]; }
    if (u < 1.9) return [...q, s.ry];
    if (u < 2.3) { const e = ease((u - 1.9) / .4); return [lerp(q[0], XP, e), lerp(q[1], Y, e), lerp(q[2], zc, e), PI]; }
    return [XP - V * (u - 2.3), Y, zc, PI]; };
  // scarico (ILLUSTRATIVO: nelle foto non ci sono; maglietta nera e guanti come in F 7452): due operatori, uno a sud (z 18,65) e uno a nord
  // (z 16,45) della rulliera, prendono ciascuno l'anta dalla propria fila (bordo a portata di mano), la sollevano al livello e la spingono fra
  // i bracci: prima la coppia ovest (livello basso), poi la coppia est (livello alto). Restano a 10 cm dal carrello e dalla testata
  const scarico = (q, c, N, f) => { const [dx, dz] = PEZZI[q], ovest = dx < 0, x0 = XE + dx, z0 = zc + dz, zf = zc + Math.sign(dz) * ZC;
    const yL = ESSIC.livelli[LIV[((N % 2) + 2) % 2][ovest ? 0 : 1]] + .025, [tA, tB, tC] = ovest ? [2.8, 3.4, 4.6] : [6.1, 6.7, 8.5];
    if (c < TM) return [xk(-2 - f) + dx, Y, z0]; if (c < tA) return [x0, Y, z0];
    if (c < tB) return [x0, lerp(Y, yL, ease((c - tA) / (tB - tA))), z0];
    const u = ease(clamp((c - tB) / (tC - tB), 0, 1)); return [lerp(x0, XC, u), yL, lerp(z0, zf, u)]; };
  const op3 = persona(W, M, 48.6, 18.65, { ry: PI, guanti: M.guanti }), op4 = persona(W, M, 48.6, 16.45, { ry: 0, guanti: M.guanti });
  const kS = (z, r) => cammino([[0, 48.6, z, r], [3.4, 48.6, z, r], [4.6, 47.85, z, r, 1], [5.6, 49.3, z, r, 1], [6.7, 49.3, z, r], [8.5, 47.85, z, r, 1], [10.5, 48.6, z, r, 1], [P, 48.6, z, r]]);
  const kS3 = kS(18.65, PI), kS4 = kS(16.45, 0);
  for (const [x, z, m] of [[60.9, 21.2, M.rosso], [61.3, 21.35, M.bianco], [61.1, 21.75, M.rosso]]) cyl(W, x, 0, z, .17, .42, m);
  // etichette della macchina sopra il cielo o davanti ai pannelli bassi: l'apertura della sezione resta libera per vedere il lavoro
  L(XR, 3.9, zc, 'Cefla Finishing Spraybotic · robot cartesiano, 4 ante per ciclo (F 7450, 7451)'); L(XL, .3, zc + 2.7, 'Barriera di lettura: legge le sagome delle ante');
  L(59.8, 2.7, 21, 'Mixer delle vernici (V f_038)');
  L(66.8, 2.4, 20.5, 'Pulpito della linea (F 7452)'); L(CX, 2.2, zc, 'Carrello di essiccazione (V f_019)'); L(64, 3.5, zc, 'Tunnel della linea di verniciatura (V f_037) · funzione da confermare');
  return t => { const N = Math.floor(t / P), c = t - N * P, f = c < TM ? liscio(c / TM) : 1, h = testa(c);
    // nastro principale: gruppi da d = 4 (entra dal tunnel) a d = 9 (dentro la testata ovest); d = N − n
    iLac.count = iGrz.count = 0;
    for (let d = 4; d <= 9; d++) { const gx = xk(8 - d - f); if (gx > 61) continue;   // ancora dentro il tunnel: non si vede
      if (d === 7 && c >= E0) inLavoro(gx, c, h); else gruppo4(d >= 8 ? iLac : iGrz, gx); }
    iLac.instanceMatrix.needsUpdate = iGrz.instanceMatrix.needsUpdate = true;
    const rl = Math.abs(XL - xk(2 - f)); lettura.visible = c < TM && rl > IX && rl < EX;   // riga di luce solo sopra i pezzi del gruppo d = 6
    // robot: ponte (x), carrello (z), asse verticale, rotazione, inclinazione; ventaglio lungo fino alla superficie
    ponte.position.x = CEFLA.XR + h.x; carrello.position.z = CEFLA.zc + h.z; colonna.position.y = h.dy; rotore.rotation.y = h.f; pistola.rotation.x = h.tl;
    const ct = Math.cos(h.tl), st = Math.sin(h.tl), yP = CEFLA.TESTA + h.dy - .25, len = (yP - .27 * ct - (Y + T * .75)) / ct;
    ventaglio.visible = h.on; ventaglio.scale.y = len; gocce.visible = h.on;
    if (h.on) { const sf = Math.sin(h.f), cf = Math.cos(h.f), dx = -st * sf, dy = -ct, dz = -st * cf, tx = XR + h.x + .27 * dx, ty = yP + .27 * dy, tz = zc + h.z + .27 * dz;
      for (let i = 0; i < NG; i++) { const ph = (t * 2.6 + i * .618) % 1, w = ((i * .37) % 1) * 2 - 1, v = ((i * .73) % 1) * 2 - 1, r = len * ph;
        _p.set(tx + dx * r + cf * .17 * ph * w + sf * .04 * ph * v, ty + dy * r, tz + dz * r - sf * .17 * ph * w + cf * .04 * ph * v);
        m4.compose(_p, _q, _s.setScalar(.5 + ph)); gocce.setMatrixAt(i, m4); } gocce.instanceMatrix.needsUpdate = true; }
    // carico: 4 mesh a rotazione (l'anta m usa la mesh m mod 4; vive 7,5 s, i viaggi sono ogni 3,25 s)
    const m0 = Math.floor(t / TT), u0 = t - m0 * TT;
    for (let j = 0; j < 4; j++) { const m = m0 - (((m0 - j) % 4) + 4) % 4, u = t - m * TT, p = antaC(u), g = gC[j];
      g.position.set(p[0], p[1], p[2]); g.rotation.y = p[3]; g.visible = u < 2.3 || p[0] > XH; }
    const sC = statoC(u0), pC = antaC(u0);
    muovi(op, { ...sC, passo: 1, s: 0 }, t, { lavoro: clamp((u0 - .15) / .3, 0, 1) * clamp((2.5 - u0) / .2, 0, 1), presa: [pC[0], pC[1] + .02, pC[2]], largo: .5 });
    // scarico: gruppo N − 10 dalla testata ovest alla rulliera e poi, due per volta, sul carrello
    PEZZI.forEach((_, q) => gS[q].position.set(...scarico(q, c, N, f)));
    const lav = clamp((c - 2.1) / .3, 0, 1) * clamp((4.9 - c) / .3, 0, 1) + clamp((c - 5.7) / .3, 0, 1) * clamp((8.8 - c) / .3, 0, 1), est = c >= 5.1;
    const pS = scarico(est ? 2 : 0, c, N, f), pN = scarico(est ? 3 : 1, c, N, f);   // anta della fila sud e della fila nord della coppia in corso
    muovi(op3, kS3(c), t, { lavoro: lav, presa: [pS[0], pS[1] + .02, pS[2] + hW], largo: .5 });
    muovi(op4, kS4(c), t, { lavoro: lav, presa: [pN[0], pN[1] + .02, pN[2] - hW], largo: .5 });
    op2.posa(t, { lavoro: 1, mov: .4 }); };
}

/* 10 · La lucidatura: lucidatrice automatica (Marco 02/10: «la macchina a destra della EMC»; la pianta chiama «lucidatrice» il rettangolo
   della linea VP Impianti, F 7448, nord → sud). Le ante laccate lucide la attraversano. Dopo, come OPZIONE fuori numerazione, la verniciatura
   manuale nella cabina M18 (main.js: segnaposto «opz.»). ST [63,2; 30,6; 7 × 8,8] */
function lucidatura(W, L) {
  const XV = 66.7, ZV = 34.9; posa(W, MC.lineaVP(), XV, ZV);
  const yv = VP.y; pila(W, XV - .3, yv - .04, ZV - 4.0, .6, 1.4, 3, ANTA.T, M.laccato); pila(W, XV - .3, yv - .04, ZV + 2.6, .6, 1.4, 3, ANTA.T, M.laccato);
  const pv = anim(W); box(pv, -.3, 0, -.7, .6, ANTA.T, 1.4, M.laccato);
  const opV = persona(W, M, XV - 1.55, ZV - 3.3, { ry: Math.PI / 2, maglia: M.grigioScuro });
  opV.position.set(XV - 1.1, 0, ZV - 3.65);   // tra il serbatoio a pressione e il telaio della linea (prima dentro il serbatoio); stesso aspetto
  L(XV, 2.6, ZV, 'Linea VP Impianti · lucidatrice automatica (F 7448; Marco 02/10)');
  return t => { const c2 = (t + 3) % 14, z = kf(c2, [[0, ZV - 3.3], [1, ZV - 3.3], [11, ZV + 3.3], [14, ZV + 3.3]]);
    pv.position.set(XV, yv - .04 + 2 * ANTA.T, z); pv.visible = c2 < 11; opV.posa(t, { lavoro: c2 < 1.4 ? 1 : 0, presa: [XV, yv, z], largo: .7 }); };
}

/* 11 · Il montaggio: strettoio per scocche Erregi sulla linea a nastro (F 7453), flusso est → ovest verso l'imballaggio (JSON). ST [19,8; 19,6; 17,1 × 3,8]
   La scocca parte dalla testa del nastro (dove ce n'è sempre una pronta), si ferma nel portale, i pressori gialli la stringono, riparte. */
function montaggio(W, L) {
  const X = 28.35, Z = 21.6, XP = 32.4, er = posa(W, MC.erregi(XP - X), X, Z), { pressT, pressN, pressS, Y } = er.userData.parti;
  const XA = 36.25, XB = 20.25; for (const x of [XA, XB]) { const s = MC.scocca(W); s.position.set(x, Y, Z); }
  const sc = anim(W); MC.scocca(sc);
  // scaffali della ferramenta e armadietti scuri a sud del nastro (F 7453)
  { const x0 = 27.5, z0 = 22.95; for (const x of [0, 1.3, 2.6]) box(W, x0 + x, 0, z0, .05, 2.2, .45, M.acciaio); for (const y of [.5, 1.1, 1.7]) { box(W, x0, y, z0, 2.65, .03, .45, M.acciaio); for (let i = 0; i < 4; i++) box(W, x0 + .1 + i * .63, y + .03, z0 + .05, .5, .3, .35, MM.cartone); } }
  MC.tbox(W, 30.3, 0, 23.0, .9, 2.0, .45, MM.mobiliScuri, { r: .01 }); MC.tbox(W, 26.3, 0, 23.0, .9, 2.0, .45, MM.mobiliScuri, { r: .01 });
  // F 7453: maglietta e pantaloni neri, occhiali, capelli scuri
  const opS = persona(W, M, 32.0, 23.0, { ry: Math.PI, pant: M.nero, occhiali: true, capelli: 'medi', colCapelli: 0x16110e, barba: 0 }), opN = persona(W, M, 33.1, 20.15, { ry: 0, maglia: M.grigioScuro });
  // controllo collisioni: ai due lati del nastro all'ingresso del portale (x 34,25), le mani sul bordo del nastro. Prima le mani entravano
  // nelle colonne del portale e quelle dell'operatore a nord passavano la griglia di protezione (x 30,8–34, z 20,4). Stesso aspetto.
  opS.position.set(XP + 1.85, 0, 22.6); opN.position.set(XP + 1.85, 0, 20.5);
  L(XP, 3.6, Z, 'Erregi · strettoio per scocche (F 7453)'); L(25, 1.2, Z, 'Nastro della linea di montaggio (F 7453)');
  return t => { const c = t % 16, x = kf(c, [[0, XA], [1.5, XA], [4, XP], [7.5, XP], [14, XB], [16, XB]]); sc.position.set(x, Y, Z); sc.visible = c < 14;
    const cl = kf(c, [[0, 0], [4.1, 0], [4.7, 1], [6.9, 1], [7.4, 0], [16, 0]]);
    pressT.position.y = lerp(1.95, 1.575, cl); pressN.position.z = lerp(-.55, -.3, cl); pressS.position.z = lerp(.55, .29, cl);
    const w = c > 4 && c < 7.5 ? 1 : .3; opS.posa(t, { lavoro: w, mov: .5 }); opN.posa(t, { lavoro: w, mov: .4 }); };
}

/* 12 · Imballaggio e spedizione (Marco 02/10): nel magazzino l'avvolgitore Robopac (F 7456, 7457) fascia nel film il bancale con i mobili,
   il muletto lo carica sul camion fermo al portone sezionale est, in fondo al magazzino (V f_014, F 7456), con la scritta «Destinazione:
   tutto il mondo». Robopac, muletto e camion sono in arredi.js (il muletto percorre tutto il corridoio del magazzino, quindi si anima sempre);
   qui le persone e le etichette. ST [60,6; 8,6; 21,4 × 4,8] */
function spedizione(W, L) {
  // operatore a sud-est della piattaforma del Robopac, fuori dai passaggi del muletto (z ≤ 12,2 lungo l'asse, x ≥ 66,5 al ritorno dal camion)
  // (ILLUSTRATIVO). L'autista viaggia con il camion (arredi.js)
  const op = persona(W, M, 65.9, 12.45, { ry: -Math.PI / 2 });
  L(64.5, 2.7, 11.4, 'Robopac · avvolge il bancale nel film (F 7456, 7457)');   // «Destinazione: tutto il mondo» sta sul camion (arredi.js)
  L(70.9, 5.0, 13.4, 'Portone di uscita del magazzino (V f_014; Marco 02/10)');
  return t => { op.posa(t, { lavoro: 1, mov: .5, guarda: [64.5, 1, 11.4] }); };
}
// banchi dell'imballaggio fra montaggio e magazzino (PE; nessuna foto, ILLUSTRATIVO): fermi, il bancale si fascia al Robopac (tappa 12)
function banchiImballaggio(W) {
  const BZ = 20.8, mobile = (p, fasciato) => { const g = gruppo(p); MC.scocca(g, MM.mobiliScuri); box(g, -.3, .02, .28, .6, .68, .02, M.laccatoOpaco);
    if (fasciato) { box(g, -.32, 0, -.3, .64, .74, .62, M.film, { cast: false }); for (const [a, b] of [[-.33, -.31], [.25, -.31], [-.33, .25], [.25, .25]]) box(g, a, 0, b, .08, .74, .08, M.cartone); } return g; };
  MC.tbox(W, 10.0, .8, BZ - .6, 2.6, .05, 1.2, M.bianco, { r: .01 }); for (const [a, b] of [[.05, .05], [2.5, .05], [.05, 1.1], [2.5, 1.1]]) box(W, 10.0 + a, 0, BZ - .6 + b, .06, .8, .06, M.acciaio);
  const tA = bancale(W, 14.0, BZ - .4), tB = bancale(W, 7.9, BZ - .4);
  mobile(W, false).position.set(14.6, tA, BZ); mobile(W, true).position.set(8.5, tB, BZ);
  cyl(W, 15.6, 0, 19.6, .06, 1.1, M.acciaio); cilindroCartone(W, 15.3, 19.6);
}
function cilindroCartone(W, x, z) { const r = cyl(W, x - .55, 1.0, z, .22, 1.1, MM.cartone, { rz: -Math.PI / 2 }); return r; }

// ---------- macchine e arredi fuori dalle tappe (statici, fusi) ----------
function fuori(G, opz) {
  // M16 carrelli di essiccazione (9 qui + 1 nella tappa 9 = 10, JSON)
  for (const x of [42.8, 44.2, 45.6]) for (const z of [15.4, 17.55, 19.7]) posa(G, MC.carrelloEssiccazione({ pieni: 8 + ((x * 3 + z) | 0) % 5 }), x, z);
  // M23 levigatrice a nastro lungo verde; M24, M25 rastrelliere; M26 macchine tradizionali
  posa(G, MC.levigatriceNastro(), 58.5, 31.8); posa(G, MC.rastrelliera(9.2, 1.3), 55.2, 26.25); posa(G, MC.rastrelliera(9.7, 1.5), 19.45, 25.9); posa(G, MC.tradizionali(), 57, 36.8);
  banchiImballaggio(G);
  // M27 Robopac (piattaforma e colonna; bancale, film e carrello del rotolo si animano in arredi.js), M28 ricarica muletti (V f_017: caricabatterie a parete e banco blu)
  posa(G, MC.robopac(), 64.5, 11.6);
  { const x = 56.8, z = 12.4; box(G, x, 0, z, 1.4, .85, .7, M.blu); box(G, x - .05, .85, z - .05, 1.5, .04, .8, M.legno); for (const a of [1.6, 2.3]) MC.tbox(G, x + a, .6, z + .45, .5, .7, .3, M.grigio, { r: .02 }); }
  // M29 scaffalature porta-pallet lungo la parete sud del magazzino, solo a ovest del varco (x 25,8–36,3): dal varco verso est le foto del
  // corridoio (F 7456, V f_014) mostrano il muro con le finestre alte, banchi e bancali, non scaffali (analisi Fable P2 n. 15)
  posa(G, MC.scaffalePallet(36.3 - 25.8, 1.1, 4.5, 25), 25.8, 11.8);
  // M30 magazzino ovest: fila lungo il muro nord e una fila nord–sud a x 38–39,1 (pianta: tratteggio a x ≈ 38–41). Le file a x 42,1 e 49,9
  // sono state tolte: nelle stesse foto, guardando verso la porta verde del gradino (x 50), in quel tratto non ci sono scaffali
  posa(G, MC.scaffalePallet(9.0, 1.1, 4.5, 3), 28.8, 4.6);
  { const s = posa(G, MC.scaffalePallet(5.6, 1.1, 4.5, 39), 39.1, 4.3); s.rotation.y = -Math.PI / 2; }
  // M31 mobili cucina scuri in deposito
  posa(G, MC.mobiliScuri(), 17.5, 5.5);
  // M17 deposito S.C.H.: armadio metallico (forma ILLUSTRATIVA, solo rettangolo in PE)
  { const a = gruppo(G, 37.4, 0, 14.4); MC.tbox(a, -1.4, 0, -.6, 2.8, 2.2, 1.2, M.grigio, { r: .02 }); for (const x of [-.7, 0, .7]) box(a, x - .005, .1, .6, .01, 2.0, .005, M.grigioScuro); box(a, -.2, 1.6, .605, .4, .35, .005, M.giallo); }
  if (opz.stanze !== false) {
    // M18 cabina di verniciatura manuale (F 7454): pareti chiare incrostate, apertura a sud, portone sezionale a nord, filtri a est, cavalletti
    const cab = posa(G, MC.stanza(9.3, 6.4, 4.5, MM.cabina, 'NSEO', [['S', 2.6, 6.4, 3.4]]), 31.25, 16.3);
    box(cab, -1.6, 0, -3.05, 3.2, 3.5, .05, M.grigioScuro); for (let y = .45; y < 3.5; y += .45) box(cab, -1.6, y, -3.0, 3.2, .02, .01, M.antracite);
    box(cab, 4.45, 1.6, -2.6, .06, 2.2, 4.6, MM.filtri);
    for (const [x, y, z, w, h, d] of [[-4.52, .5, -1, .02, 1.6, .9], [-4.52, 1.9, 1.2, .02, 1.2, .9], [-2.8, .3, -3.07, .9, 1.6, .02], [2.2, .4, -3.07, 1.4, 2.0, .02]]) box(cab, x, y, z, w, h, d, MM.sporco);
    for (const [x, z] of [[.8, -.6], [2.3, .2]]) { for (let k = 0; k < 3; k++) { const a = k * 2.1; box(cab, x + Math.cos(a) * .3 - .02, 0, z + Math.sin(a) * .3 - .02, .04, .05, .04, M.grigioScuro); } cyl(cab, x, 0, z, .04, .85, M.grigioScuro); box(cab, x - .4, .85, z - .3, .8, .04, .6, M.grigioScuro); }
    // M32, M33 stanze sotto il soppalco (PE, V f_069): pareti antracite, porta illuminata e finestra a sud
    const s33 = posa(G, MC.stanza(8.8, 6.1, 3.2, MM.stanza, 'SEO', [['S', 3.0, 3.9, 2.1], ['S', 5.2, 6.8, 2.1]]), 11.7, 16.05);
    box(s33, -1.4, 0, 2.97, .9, 2.1, .02, MM.lucePorta); box(s33, .8, 0, 2.93, 1.6, 1.0, .12, MM.stanza); box(s33, .8, 1.0, 2.99, 1.6, 1.1, .02, M.vetro);
    const s32 = posa(G, MC.stanza(6.2, 6.3, 3.2, MM.stanza, 'SEO', [['S', 1.2, 2.1, 2.1]]), 20.7, 16.25); box(s32, -1.9, 0, 3.07, .9, 2.1, .02, M.grigio);
  }
  // arredi visti nei fotogrammi e mancanti (analisi Fable P3 n. 24). Posizioni stimate dal punto di ripresa: ILLUSTRATIVE.
  // muro est accanto al pulpito Cefla (V f_035, f_036): scaffale metallico con rotoli di carta abrasiva in piedi e scatoloni in alto,
  // armadietto bianco, armadio rosso a cassetti, scatoloni a terra
  { const x = 70.25; for (const z of [19.1, 20.0, 20.9]) box(G, x, 0, z, .5, 2.1, .04, MM.scaffGrigio); for (const y of [.12, 1.3, 2.05]) box(G, x, y, 19.1, .5, .03, 1.84, MM.scaffGrigio);
    for (let i = 0; i < 9; i++) cyl(G, x + .25, .15, 19.25 + i * .19, .08, 1.1, [MM.rossoCarrello, M.biancoCaldo, M.nero][i % 3]);
    for (const [z, h] of [[19.2, .75], [19.8, .6], [20.4, .7]]) box(G, x + .05, 1.33, z, .4, h, .5, MM.cartone);
    MC.tbox(G, x, 0, 20.95, .5, 1.95, .5, M.bianco, { r: .01 }); MC.tbox(G, x, 0, 21.5, .55, 1.75, .6, MM.rossoCarrello, { r: .02 }); for (const y of [.6, .9]) box(G, x - .01, y, 21.65, .01, .02, .2, M.acciaio);
    box(G, x - .2, 0, 22.2, .7, .45, .55, MM.cartone); box(G, x - .1, 0, 22.8, .6, .35, .5, MM.cartone); }
  // davanti al soppalco (V f_066): stoccatore elettrico verde e nero, scaffale bianco a giorno con cassette verdi e scatole
  { MC.tbox(G, 13.35, 0, 19.6, .7, 1.25, .6, M.nero, { r: .03 }); MC.tbox(G, 13.4, .7, 19.62, .6, .5, .56, MM.verdeBiesse, { r: .03 }); box(G, 13.55, 0, 19.55, .06, 2.4, .06, M.nero); box(G, 13.9, 0, 19.55, .06, 2.4, .06, M.nero);
    const x0 = 16.7, z0 = 19.55; for (let i = 0; i <= 4; i++) box(G, x0 + i * .6, 0, z0, .03, 2.3, .42, M.bianco); for (const y of [0, .45, .9, 1.35, 1.8, 2.27]) box(G, x0, y, z0, 2.43, .03, .42, M.bianco);
    for (let i = 0; i < 4; i++) for (const y of [.48, .93, 1.38]) box(G, x0 + .08 + i * .6, y, z0 + .05, .44, .18, .3, (i + y * 3) % 2 > 1 ? MM.cartone : M.verdeScuro); }
  // lungo il corridoio z 33,3 a ovest (F 7441): pila di ante bianche su bancale, carrello rosso con ante in piedi, due carrelli bassi in
  // acciaio con sponde in MDF
  { const top = bancale(G, 15.1, 31.2, 1.6, 1.0); pila(G, 15.15, top, 31.25, 1.5, .9, 9, ANTA.T * 1.6, [MM.melaminico, M.biancoCaldo]); carrelloAnte(G, 17.3, 32.4, 7);
    for (const x of [19.2, 21.3]) { box(G, x, .2, 34.3, 1.8, .04, .8, M.acciaio); for (const [a, b] of [[.05, .05], [1.7, .05], [.05, .7], [1.7, .7]]) { box(G, x + a, .2, 34.3 + b, .05, .65, .05, M.acciaio); cyl(G, x + a + .025, 0, 34.3 + b + .025, .07, .14, M.nero); }
      box(G, x, .3, 34.28, 1.8, .5, .02, MM.mdfPieno); box(G, x, .3, 35.08, 1.8, .5, .02, MM.mdfPieno); } }
  // M34 uffici: reception, ufficio tecnico, sala del consiglio e striscia uffici ora in uffici.js (rifatti il 30/09; la sala del CDA è al primo piano)
}

// carrello rosso a telaio con pannelli in piedi (F 7447, V f_020): usato anche da arredi.js
export function carrello(p, M, x, z) {
  box(p, x, .25, z, 2.4, .06, 1.1, M.rosso); for (const [a, b] of [[0, 0], [2.3, 0], [0, 1], [2.3, 1]]) cyl(p, x + a + .05, 0, z + b + .05, .08, .2, M.nero);
  box(p, x, .3, z, .06, 1.8, 1.1, M.rosso); box(p, x + 2.34, .3, z, .06, 1.8, 1.1, M.rosso); box(p, x, 2.1, z, 2.4, .06, .08, M.rosso);
  for (let i = 0; i < 3; i++) box(p, x + .1, .31, z + .25 + i * .2, 2.2, 1.6, .025, M.mdf);
}
// texture della tavola di progetto e del monitor: spostate in uffici.js (materiali)
