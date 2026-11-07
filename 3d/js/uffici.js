// Uffici RiFRA (M34): palazzina a due piani (x 0–10,3, z 0–11,2) e striscia uffici del piano terra (x 0–5,3, z 11,2–40,6).
// Rifatti il 30/09 dopo la richiesta del cliente: «rifai l'ufficio tecnico, la stanza del CDA sta al secondo piano, non lì».
//
// FONTI (sigle come in edificio.js): PE = piano di evacuazione (ricerca/zoom/pianta_rettificata_5cm.jpg, «PIANTA PIANO TERRA»),
// F = foto ricerca/foto/IMG_74xx, V = fotogrammi ricerca/fotogrammi/v0008, E = Earth / Street View, Marco = indicazioni del cliente.
//
// PIANO TERRA (PE, scalata sulla palazzina del modello: la pianta dà 10,55 × 12,7 m, il modello 10,3 × 11,2):
//   ufficio tecnico / commerciale   x 0–10,3   z 0–5,6    open space bianco con plotter e tavole appese (F 7464)
//   ufficio (pareti scure)          x 0–5,9    z 5,6–8,75 più il corridoio x 5,9–10,3 z 5,6–6,85 verso la porta del magazzino (F 7463, V f_001–f_003)
//   bagni                           x 5,9–10,3 z 6,85–8,75 (PE: due bagni, lavabi a ovest e wc a est)
//   ingresso / reception            x 0–5,9    z 8,75–11,2 bancone scuro, orologio a pendolo, fotocopiatrice, parete in legno (F 7461, 7462, 7466)
//   scala a due rampe               rampa 1 z 8,9–9,9 sale verso est, pianerottolo a x 9–10,15, rampa 2 z 10,05–11,05 sale verso ovest (PE, F 7466, 7467)
//   ripostiglio / quadro (Q.E. RIP) sotto la rampa 2, porta bianca con griglie verso ovest (PE, F 7462, 7466)
//   striscia: ufficio, bagni, spogliatoio, sala riunioni, ufficio, sala pranzo, ufficio (PE, z scalate sul modello)
// PRIMO PIANO (nessuna pianta: ricostruito dalle foto 7467–7471 e da Marco «la stanza del CDA sta al secondo piano»):
//   sala del consiglio (CDA)        x 0–4,5    z 0–8,3    tavolo bianco lungo, 10 sedie nere, schermo, finestre a nastro a ovest (F 7469, 7470, 7468)
//   corridoio                       x 4,5–5,9  z 1–9      parete vetrata della sala a destra guardando la scala, quadri e termosifoni (F 7468, 7470, 7471)
//   locale quadri elettrici         x 5,9–7,3  z 0–2,6    porta sul corridoio (F 7471)
//   pianerottolo della scala        x 4,5–5,9  z 9–11     parapetto basso con corrimano, luci nei gradini (F 7467, 7470)
//   uffici a est e locale a sud-ovest: nessuna foto, ILLUSTRATIVI (solo pareti e una scrivania)
// Perché 7467–7471 sono al primo piano: 7467 è presa dall'alto della scala (si guarda giù); 7470 e 7471 mostrano la fine del corridoio con il
// parapetto e le luci della scala; dalle finestre della sala (7469) non si vedono auto né recinzione, al piano terra sì (7461, 7463, 7464).
// Incertezze: la pianta del primo piano non c'è; il verso delle rampe viene da 7466 (si sale verso est, orologio a sinistra) e 7467
// (rampa con il parapetto a sinistra); la sala potrebbe essere più corta verso nord; i soffitti non sono modellati (casa di bambole).
import * as THREE from 'three';
import { box, cyl, tubo, gruppo, persona, fondiStatici } from './prim.js';
import { ATLANTE } from './materiali.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// quote: pareti del piano terra alte 2,8 (controsoffitto, F 7461–7464), primo piano a +3,85 (solaio del modello a 3,6 + 0,25)
export const HP = 2.8, Y1 = 3.85, HP1 = 2.75, HS = 1.4;
// sollevamento del primo piano nella vista «esplosa» della tappa 1 (vedi primoPiano / main.js aggiornaTetto)
const ESPLOSO = 9.5;
// materiali a tinta unita: registrati nell'atlante (una chiamata di disegno per gruppo fuso). Colori dalle foto citate.
let _mat = null;
function materiali(M) {
  if (_mat) return _mat;
  const S = (c, r = .6, m = 0) => { const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); ATLANTE.add(x); return x; };
  const tex = f => { const c = document.createElement('canvas'); f(c); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  _mat = {
    bianca: S(0xebe8e1, .85),            // pareti bianche (F 7464, 7466)
    scura: S(0x2c2d30, .8),              // pareti e telai scuri dell'ufficio e della reception (F 7461, 7463)
    legno: S(0xb3713a, .55),             // parete a pannelli di legno arancio (F 7462)
    scrivBianca: S(0xeeeeec, .45), scrivScura: S(0x252628, .55),
    alluminio: S(0xc4c6c4, .35, .6),     // telai delle pareti vetrate del primo piano (F 7468, 7471)
    gradino: S(0xa9a296, .35),           // gradini grigio-beige lucidi (F 7466, 7467)
    pavPrimo: S(0xb4aea4, .3),           // piastrelle grigie lucide del primo piano (F 7467–7471)
    orologio: S(0x3e2016, .45), ottone: S(0xb08a3c, .35, .8), quadrante: S(0xe6dcc3, .5),
    fotocopia: S(0x8f9092, .5, .1), tv: S(0x0b0c0e, .18, .3), pianta: S(0x3d6a35, .85), vaso: S(0x2a2b2d, .6),
    termo: S(0xe9e9e6, .45), rosso: S(0xb42a24, .5),
  };
  // luci a filo (gradini, lampade a stelo, lampada lineare): emissive, una chiamata per gruppo, nessuna luce vera (costo)
  _mat.luce = new THREE.MeshStandardMaterial({ color: 0xfff3dc, emissive: 0xffe6bf, emissiveIntensity: 1.3, roughness: .5 });
  // tavole di progetto appese (F 7464: fogli bianchi con piante di cucine a linee sottili)
  _mat.tavole = new THREE.MeshStandardMaterial({ roughness: .9, map: tex(c => { c.width = 256; c.height = 360; const g = c.getContext('2d'); g.fillStyle = '#f6f5f1'; g.fillRect(0, 0, 256, 360);
    g.strokeStyle = '#333'; g.lineWidth = 5; g.strokeRect(14, 14, 228, 332); g.strokeRect(40, 40, 170, 120); g.strokeRect(60, 60, 50, 80); g.strokeRect(120, 60, 70, 34);
    g.beginPath(); g.moveTo(40, 200); g.lineTo(210, 200); g.lineTo(210, 320); g.moveTo(40, 240); g.lineTo(150, 240); g.stroke(); g.strokeRect(160, 290, 70, 44); }) });
  // monitor con la pianta di una cucina (come prima in reparti.js)
  _mat.schermo = new THREE.MeshStandardMaterial({ color: 0x0c1a28, emissive: 0xffffff, emissiveIntensity: .9, roughness: .3, emissiveMap: tex(c => { c.width = 256; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = '#0d1d2c'; g.fillRect(0, 0, 256, 160); g.strokeStyle = '#9fd0ff'; g.lineWidth = 2; g.strokeRect(20, 18, 216, 124); g.strokeRect(70, 60, 110, 36); g.beginPath(); g.moveTo(20, 110); g.lineTo(120, 110); g.stroke(); }) });
  // foto di cucine alle pareti del primo piano (F 7468, 7470: grandi stampe scure con cucine illuminate). Immagine ILLUSTRATIVA disegnata dal codice
  _mat.foto = new THREE.MeshStandardMaterial({ roughness: .5, map: tex(c => { c.width = 256; c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#16171a'; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#3a3c40'; g.fillRect(0, 96, 256, 64); g.fillStyle = '#d9d6cf'; g.fillRect(40, 70, 170, 26); g.fillStyle = '#8c8a85'; g.fillRect(40, 96, 170, 34);
    g.fillStyle = '#f2e3c4'; for (let i = 0; i < 6; i++) g.fillRect(30 + i * 36, 16, 10, 4); g.fillStyle = '#2b2c2f'; g.fillRect(180, 20, 40, 76); }) });
  return _mat;
}

// ---------- pezzi d'arredo (coordinate del mondo; ry = verso in cui guarda chi usa il pezzo, come persona(): 0 = sud, π = nord) ----------
// scrivania: angolo nord-ovest (x, z), larghezza w (est), profondità d (sud), piano a 0,74 con quattro gambe
function scrivania(p, x, z, w, d, top, gambe) {
  box(p, x, .72, z, w, .03, d, top); for (const [a, b] of [[.03, .03], [w - .07, .03], [.03, d - .07], [w - .07, d - .07]]) box(p, x + a, 0, z + b, .04, .72, .04, gambe, { cast: false });
}
// monitor sul piano (centro cx, cz), schermo verso ry
function monitor(p, U, cx, cz, ry, largo = .55) {
  const g = gruppo(p, cx, .75, cz); g.rotation.y = ry; box(g, -.03, 0, -.08, .06, .02, .16, U.scura, { cast: false }); box(g, -.02, .02, -.02, .04, .16, .04, U.scura, { cast: false });
  box(g, -largo / 2, .14, -.035, largo, .34, .03, U.scura); box(g, -largo / 2 + .02, .16, -.004, largo - .04, .3, .006, U.schermo, { cast: false }); return g;
}
// sedia da ufficio (F 7463, 7469: seduta e schienale neri, base a cinque razze): origine al centro della seduta
function sedia(p, M, cx, cz, ry, mat = M.nero) {
  const g = gruppo(p, cx, 0, cz); g.rotation.y = ry; box(g, -.24, .44, -.24, .48, .07, .48, mat); box(g, -.23, .5, -.3, .46, .52, .05, mat);
  cyl(g, 0, .08, 0, .03, .36, M.acciaio, { cast: false }); box(g, -.3, .05, -.025, .6, .03, .05, M.acciaio, { cast: false }); box(g, -.025, .05, -.3, .05, .03, .6, M.acciaio, { cast: false }); return g;
}
function pianta(p, M, U, x, z, h = 1.1) { cyl(p, x, 0, z, .2, .4, U.vaso); const f = new THREE.Mesh(new THREE.IcosahedronGeometry(.32 * h, 1), M.fogliame); f.position.set(x, .4 + .38 * h, z); f.scale.set(1, 1.3, 1); f.castShadow = true; f.userData.statico = true; p.add(f); }
// parete a due facce (colore diverso per lato), da (x0,z0) a (x1,z1) allineata a un asse; aperture [da, a] lungo la parete (porte a tutta altezza)
function parete(p, x0, z0, x1, z1, h, matA, matB, aperture = [], y0 = 0) {
  const oriz = z0 === z1, L = oriz ? x1 - x0 : z1 - z0, tratti = []; let s = 0;
  for (const [a, b] of [...aperture].sort((u, v) => u[0] - v[0])) { if (a > s) tratti.push([s, a]); s = b; } if (s < L) tratti.push([s, L]);
  for (const [a, b] of tratti) { if (oriz) { box(p, x0 + a, y0, z0 - .06, b - a, h, .06, matA); box(p, x0 + a, y0, z0, b - a, h, .06, matB); }
    else { box(p, x0 - .06, y0, z0 + a, .06, h, b - a, matA); box(p, x0, y0, z0 + a, .06, h, b - a, matB); } }
}
// parete vetrata a telaio (F 7461 scura, F 7468 alluminio): montanti ogni «passo», traversi alle quote «trav», vetro trasparente
function vetrata(p, M, x0, z0, x1, z1, h, telaio, passo = 1.35, trav = [0, .9, 1.8], aperture = []) {
  const oriz = z0 === z1, L = oriz ? x1 - x0 : z1 - z0, dentro = s => !aperture.some(([a, b]) => s > a - .01 && s < b + .01);
  const seg = (a, b, y, hh, mat, sp = .05) => oriz ? box(p, x0 + a, y, z0 - sp / 2, b - a, hh, sp, mat, { cast: mat !== M.vetro }) : box(p, x0 - sp / 2, y, z0 + a, sp, hh, b - a, mat, { cast: mat !== M.vetro });
  let s = 0; const tratti = []; for (const [a, b] of aperture) { if (a > s) tratti.push([s, a]); s = b; } if (s < L) tratti.push([s, L]);
  for (const [a, b] of tratti) { seg(a, b, 0, h, M.vetro, .012); for (const y of [...trav, h - .05]) seg(a, b, y, .05, telaio, .06); }
  for (let q = 0; q <= L + 1e-3; q += passo) if (dentro(q)) seg(Math.max(0, q - .025), Math.min(L, q + .025), 0, h, telaio, .07);
  for (const [a, b] of aperture) for (const q of [a, b]) seg(q - .03, q + .03, 0, h, telaio, .08);
}

// ---------- piano terra (statico, fuso con l'edificio) ----------
export const PT = { persone: [] }, PRIMO = { P: null, persone: [], etichetta: null };   // persone fuori dalla tappa 1, animate dall'aggiornamento della tappa 1 (reparti.js s1)
export function pianoTerra(G, M) {
  const U = materiali(M);
  // ufficio tecnico / ufficio: parete z 5,6, bianca verso l'open space (tavole appese, F 7464) e scura verso l'ufficio (F 7463); porta a metà (PE)
  parete(G, .15, 5.6, 10.15, 5.6, HP, U.bianca, U.scura, [[4.45, 5.35]]);
  // ufficio (pareti scure, F 7463): lato est verso i bagni; corridoio verso la porta del magazzino (PE, V f_002–f_003)
  parete(G, 5.86, 6.85, 5.86, 8.75, HP, U.scura, U.bianca);
  parete(G, 5.86, 6.85, 10.15, 6.85, HP, U.scura, U.bianca, [[.75, 1.55], [2.45, 3.25]]);   // porte dei due bagni (PE)
  parete(G, 7.95, 6.85, 7.95, 8.75, HP, U.bianca, U.bianca);
  // lavabi a ovest e wc a est (simboli della PE)
  for (const x of [6.0, 8.1]) box(G, x, .8, 7.4, .45, .12, .5, M.bianco); box(G, 9.55, 0, 7.6, .4, .42, .6, M.bianco); box(G, 7.3, 0, 7.8, .4, .42, .6, M.bianco);
  // porta scura verso il magazzino sulla parete est (V f_003) e scaffali bianchi con i campioni lungo la parete dell'ufficio tecnico (V f_002, F 7466)
  // (la porta scura verso il magazzino sta nel gruppo del muro est, edificio.js: si abbassa con il muro)
  { const x0 = 6.2, z0 = 5.66; for (let i = 0; i <= 4; i++) box(G, x0 + i * .85, 0, z0, .03, 2.2, .42, M.bianco);
    for (const y of [0, .45, .9, 1.35, 1.8, 2.18]) box(G, x0, y, z0, 3.43, .03, .42, M.bianco);
    for (let i = 0; i < 4; i++) for (const y of [.03, .48, .93, 1.38]) box(G, x0 + .06 + i * .85, y, z0 + .06, .72, .38, .06 + ((i + y * 7) % 3) * .08, (i + y * 3) % 2 > 1 ? U.scura : M.biancoCaldo, { cast: false }); }
  // ufficio: parete vetrata verso l'ingresso con telaio scuro, orologio davanti; porta a telaio scuro e tratto pieno (F 7461, 7466)
  vetrata(G, M, .15, 8.75, 4.5, 8.75, HP, U.scura, 1.45, [0, 2.2]);
  parete(G, 4.5, 8.75, 5.86, 8.75, HP, U.scura, U.scura, [[.08, .88]]);
  // due scrivanie scure con monitor verso la finestra ovest, sedia intrecciata chiara e sedia nera (F 7463, V f_001)
  for (const [z, pers] of [[5.95, 0], [7.35, 1]]) { scrivania(G, 1.1, z, .8, 1.3, U.scrivScura, U.scrivScura); monitor(G, U, 1.3, z + .65, Math.PI / 2);
    sedia(G, M, 2.35, z + .65, -Math.PI / 2, pers ? M.nero : M.grigio);
    if (pers) PT.persone.push([persona(G, M, 2.35, z + .65, { ry: -Math.PI / 2, maglia: M.grigioScuro }), { seduto: 1, lavoro: 1, mov: .5 }]); }
  box(G, 1.1, .75, 6.1, .5, .12, .35, M.cartone, { cast: false }); box(G, 1.6, .75, 6.3, .4, .08, .3, M.biancoCaldo, { cast: false });
  pianta(G, M, U, .45, 8.3, 1.3); pianta(G, M, U, .45, 7.5, 1.0);
  // ingresso: parete sud in pannelli di legno (F 7462: dentro il muro sud che si abbassa, vedi edificio.js), bancone scuro della reception
  // con scaffali verso il retro, fotocopiatrice grigia, pianta grande vicino alla finestra ovest, orologio a pendolo (F 7461, 7462, 7466)
  box(G, 1.3, 0, 9.75, 2.6, 1.08, .6, M.laccatoOpaco); box(G, 1.25, 1.08, 9.72, 2.7, .04, .66, M.nero);
  box(G, 3.35, 0, 10.35, .55, 1.08, .5, M.laccatoOpaco); box(G, 3.32, 1.08, 10.33, .6, .04, .54, M.nero);
  for (const x of [1.45, 2.25]) box(G, x, .45, 10.33, .7, .22, .02, M.cartone, { cast: false });
  box(G, 4.2, 0, 10.4, .6, 1.0, .55, U.fotocopia); box(G, 4.22, 1.0, 10.42, .56, .14, .5, M.grigioScuro); box(G, 4.3, 1.14, 10.45, .4, .02, .28, U.fotocopia, { cast: false });
  pianta(G, M, U, .45, 9.3, 1.6);
  { const x = 4.02, z = 8.8; box(G, x, 0, z, .45, 1.9, .3, U.orologio); box(G, x - .03, 1.9, z - .02, .51, .12, .34, U.orologio); box(G, x + .1, 2.02, z + .05, .25, .16, .2, U.orologio);
    cyl(G, x + .225, 1.66, z + .305, .15, .02, U.quadrante, { rx: Math.PI / 2, cast: false }); box(G, x + .07, .55, z + .3, .31, .85, .015, M.vetroScuro, { cast: false }); cyl(G, x + .225, .75, z + .29, .07, .01, U.ottone, { rx: Math.PI / 2, cast: false }); }
  const rec = persona(G, M, 2.6, 10.75, { ry: Math.PI }); PT.persone.push([rec, { lavoro: .6, mov: .3 }]);
  // scala a due rampe (PE, F 7466, 7467): rampa 1 piena fino a terra, pianerottolo, rampa 2 sopra il ripostiglio; parete divisoria con
  // coprimuro grigio che al primo piano diventa il parapetto; luci nei gradini sulla parete nord della rampa 1; corrimano in acciaio
  const XA = 5.86, XB = 9.0, XL = 10.15, n = 12, r = Y1 / 2 / n, t = (XB - XA) / n;
  for (let i = 0; i < n; i++) { box(G, XA + i * t, 0, 8.81, t, (i + 1) * r, 1.09, U.gradino); box(G, XA + i * t + t * .3, (i + 1) * r + .22, 8.81, .08, .08, .015, U.luce, { cast: false });
    const j = n - 1 - i, y2 = Y1 / 2 + (j + 1) * r; box(G, XB - (j + 1) * t, y2 - .2, 10.05, t, .2, 1.0, U.gradino);
    // divisoria fra le rampe: in basso il muretto della rampa 1 (F 7466: basso, con coprimuro grigio e sopra lo spazio libero dell'ingresso),
    // sopra il parapetto della rampa 2 (F 7467); dove le due quote si avvicinano diventa un solo muro
    const y1 = (i + 1) * r, a = y1 + .95, b0 = y2 - .2, b1 = y2 + .95, x = XA + i * t;
    for (const [q0, q1] of b0 - a > .3 ? [[0, a], [b0, b1]] : [[0, Math.max(a, b1)]]) { box(G, x, q0, 9.9, t, q1 - q0, .15, U.bianca); box(G, x, q1, 9.88, t, .04, .19, M.grigio); } }
  box(G, XB, 0, 8.81, XL - XB, Y1 / 2, 2.24, U.gradino);
  { const th = Math.atan2(Y1 / 2, XB - XA), sl = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(XB - XA, Y1 / 2), .16, 1.0), U.bianca);   // intradosso della rampa 2
    sl.position.set((XA + XB) / 2, Y1 * .75 - .2 - .1, 10.55); sl.rotation.z = -th; sl.castShadow = sl.receiveShadow = true; sl.userData.statico = true; G.add(sl); }
  parete(G, XA, 8.75, XL, 8.75, HP, U.bianca, U.bianca);   // parete sud dei bagni = parete nord della rampa 1
  tubo(G, [[XA - .2, .9, 8.84], [XB, Y1 / 2 + .9, 8.84], [XL - .08, Y1 / 2 + .9, 8.84], [XL - .08, Y1 / 2 + .9, 9.6]], .025, M.acciaio, { tension: 0, seg: 6 });
  // ripostiglio / quadro elettrico sotto la rampa 2 (PE «Q.E. RIP»): parete ovest bianca con porta a griglie verso l'ingresso (F 7462, 7466);
  // fra la rampa 1 e il ripostiglio resta lo spazio dell'ingresso sotto la parte alta della rampa 2 (F 7466: a destra del muretto)
  box(G, 7.0, 0, 10.05, .1, 2.9, 1.0, U.bianca); box(G, 6.97, 0, 10.2, .03, 2.1, .8, M.biancoCaldo); for (const y of [.15, 1.75]) box(G, 6.95, y, 10.3, .02, .22, .6, M.grigio, { cast: false });
  tubo(G, [[XA - .1, Y1 + .9, 10.98], [XB, Y1 / 2 + .9, 10.98], [XL - .08, Y1 / 2 + .9, 10.98]], .025, M.acciaio, { tension: 0, seg: 6 });   // corrimano della rampa 2 (F 7467)
  for (const [a, b] of [[7.1, 8.05], [8.05, 9.0]]) { const hh = Y1 / 2 + (XB - b) / t * r - .2; box(G, a, 0, 11.0, b - a, hh, .05, U.bianca); }   // fondo del sottoscala
  // pensilina e porta d'ingresso: vedi edificio.js uffici() (lato ovest, z 9,5–10,6)
}

// ---------- striscia uffici del piano terra (PE: stanze in fila da nord a sud; z scalate sulla striscia del modello) ----------
export function striscia(G, M) {
  const U = materiali(M), X0 = .15, X1 = 5.18, H = 3.0;
  // pareti fra le stanze: ufficio | bagni | spogliatoio | sala riunioni | ufficio | sala pranzo | ufficio (PE)
  for (const z of [14.86, 18.17, 21.83, 29.15, 33.43, 36.48]) parete(G, X0, z, X1, z, H, U.bianca, U.bianca);
  parete(G, 4.0, 33.43, 4.0, 36.48, H, U.bianca, U.bianca);   // stanzino della centralina antincendio e della bacheca (PE)
  // porte verso il corridoio della produzione, sulla parete x 5,3 (posizione lungo la stanza ILLUSTRATIVA)
  for (const z of [11.6, 15.2, 18.5, 22.3, 29.5, 33.8, 36.9]) box(G, 5.42, 0, z, .03, 2.1, .9, M.grigio);
  // bagni: box divisi da tramezzi (PE, griglia 2 × 3)
  for (const x of [2.0, 3.0, 4.0]) box(G, x, 0, 15.3, .05, 2.1, 2.4, U.bianca); box(G, 2.0, 0, 16.5, 2.05, 2.1, .05, U.bianca);
  // spogliatoio: armadietti (ILLUSTRATIVO) · uffici: una scrivania con sedia (ILLUSTRATIVO) · sala pranzo: tavolo e 4 sedie (ILLUSTRATIVO)
  for (let i = 0; i < 7; i++) box(G, .5 + i * .5, 0, 18.3, .48, 1.8, .45, M.grigio);
  for (const z of [12.4, 30.6, 38.0]) { scrivania(G, 1.2, z, 1.6, .75, U.scrivBianca, M.acciaio); monitor(G, U, 2.0, z + .1, 0); sedia(G, M, 2.0, z + 1.2, Math.PI); }
  scrivania(G, 1.2, 34.6, 1.6, .8, U.scrivBianca, M.acciaio); for (const [x, z, ry] of [[1.6, 34.2, 0], [2.4, 34.2, 0], [1.6, 35.8, Math.PI], [2.4, 35.8, Math.PI]]) sedia(G, M, x, z, ry, M.grigio);
  box(G, 5.05, 1.3, 34.0, .08, .5, .4, M.rosso); box(G, 5.05, 1.2, 35.0, .05, .7, 1.0, M.biancoCaldo);
  // SALA RIUNIONI (PE, z 21,8–29,2): lasciata vuota. Prima qui c'era il tavolo lungo delle foto 7469–7470, che invece è la sala del
  // consiglio al primo piano (Marco, 30/09): la pianta nomina la stanza, ma nessuna foto ne mostra l'arredo.
}

// ---------- ufficio tecnico (tappa 1, F 7464): arredi nel gruppo della tappa (coordinate del mondo) ----------
// Restituisce le persone sedute e il punto del plotter per l'animazione (reparti.js s1).
export function ufficioTecnico(W, M) {
  const U = materiali(M), persone = [];
  // scrivanie bianche lungo le finestre nord (F 7464, a destra): monitor e computer, chi lavora guarda verso la finestra
  for (const [x, chi] of [[.6, 1], [3.5, 0], [6.4, 1]]) { scrivania(W, x, .3, 1.8, .75, U.scrivBianca, M.acciaio); monitor(W, U, x + .9, .45, 0);
    box(W, x + 1.45, .75, .35, .2, .42, .45, U.scura); box(W, x + .6, .76, .75, .5, .02, .16, M.nero, { cast: false }); sedia(W, M, x + .9, 1.45, Math.PI);
    if (chi) persone.push(persona(W, M, x + .9, 1.45, { ry: Math.PI, maglia: x > 5 ? M.grigioScuro : undefined })); }
  pianta(W, M, U, 8.65, .55, .8);   // pianta vicino alla finestra nord (F 7464, a destra)
  // isola centrale: due file di scrivanie bianche schiena contro schiena con i monitor in mezzo (F 7464, al centro con le persone)
  for (const [x, z, ry] of [[2.4, 2.6, 0], [4.2, 2.6, 0], [2.4, 3.3, Math.PI], [4.2, 3.3, Math.PI]]) { scrivania(W, x, z, 1.7, .7, U.scrivBianca, M.acciaio);
    const cz = ry ? z + .15 : z + .55; monitor(W, U, x + .85, cz, ry ? 0 : Math.PI); sedia(W, M, x + .85, ry ? z + 1.15 : z - .45, ry ? Math.PI : 0); }
  persone.push(persona(W, M, 3.25, 2.15, { ry: 0 }), persona(W, M, 5.05, 4.45, { ry: Math.PI, maglia: M.grigioScuro }));
  box(W, 4.4, .75, 2.75, .45, .25, .35, M.cartone, { cast: false }); box(W, 2.6, .75, 3.6, .5, .12, .4, M.cartone, { cast: false });   // scatole sul tavolo (F 7464)
  // scrivania d'angolo verso la finestra ovest (F 7464, in fondo a sinistra) e armadio alto bianco vicino alla parete sud (F 7464)
  scrivania(W, .3, 2.5, .75, 1.5, U.scrivBianca, M.acciaio); monitor(W, U, .45, 3.25, Math.PI / 2); sedia(W, M, 1.45, 3.25, -Math.PI / 2);
  box(W, .35, 0, 4.95, 1.0, 2.1, .55, M.bianco); box(W, .84, .1, 4.94, .01, 1.9, .01, M.grigio, { cast: false });
  // tavolo grande con le tavole stese vicino all'ingresso dell'open space (F 7464, in basso a destra)
  scrivania(W, 8.4, 1.9, 1.6, 1.2, U.scrivBianca, M.acciaio); for (const [a, b, ry] of [[8.5, 2.0, .1], [9.1, 2.4, -.15]]) box(W, a, .755, b, .85, .005, .6, U.tavole, { ry, cast: false });
  // tavole appese sulla parete sud, lato est (F 7464: fogli verticali in due file), lampade a stelo (F 7464: quattro, luce verso il soffitto)
  for (let i = 0; i < 5; i++) for (const y of [.95, 1.9]) box(W, 5.75 + i * .84, y, 5.51, .74, .9, .01, U.tavole, { cast: false });
  for (const [x, z] of [[2.3, 1.95], [5.3, 1.95], [8.1, 1.7], [6.5, 4.6]]) { box(W, x - .18, 0, z - .18, .36, .03, .36, M.acciaio, { cast: false }); cyl(W, x, 0, z, .025, 1.85, M.acciaio, { cast: false });
    box(W, x - .22, 1.85, z - .14, .44, .05, .28, M.bianco, { cast: false }); box(W, x - .2, 1.9, z - .12, .4, .005, .24, U.luce, { cast: false }); }
  // plotter con rotolo (F 7464, in primo piano): corpo nero su gambe, rotolo bianco; il foglio che esce è animato in reparti.js
  const PX = 7.3, PZ = 4.35;
  box(W, PX, .7, PZ, 1.7, .3, .55, M.nero); for (const a of [.1, 1.5]) box(W, PX + a, 0, PZ + .2, .06, .7, .06, M.antracite); box(W, PX + .1, .15, PZ + .15, 1.5, .04, .3, M.antracite);
  cyl(W, PX + .1, .9, PZ + .1, .05, 1.5, M.biancoCaldo, { rz: -Math.PI / 2 });
  return { persone, plotter: [PX, PZ] };
}

// ---------- primo piano (gruppo proprio, fuso a parte: si alza nella vista esplosa) ----------
export function primoPiano(scene, M, E) {
  const U = materiali(M), root = gruppo(scene), P = gruppo(root, 0, Y1, 0), persone = [];
  root.visible = false;   // compare solo mentre il tetto si alza o nella vista esplosa (main.js); nascosto anche nel calcolo dell'occlusione del terreno
  // solaio con il foro della scala (x 5,86–10,15, z 8,9–11,05) e pavimento in piastrelle grigie lucide (F 7467–7471)
  for (const [x0, z0, x1, z1] of [[0, 0, 10.3, 8.9], [0, 8.9, 5.86, 11.2], [5.86, 11.05, 10.3, 11.2], [10.15, 8.9, 10.3, 11.05]]) { box(P, x0, -.26, z0, x1 - x0, .24, z1 - z0, M.biancoCaldo); box(P, x0, -.02, z0, x1 - x0, .02, z1 - z0, U.pavPrimo, { cast: false }); }
  // muri esterni tagliati in sezione: nord e ovest con parapetto pieno fino al davanzale (0,9), vetro e montanti fino a 2,2 (finestre a nastro,
  // F 7469, 7470; E retro: vetrata continua); est e sud pieni (confinano con magazzino e capannone, niente finestre)
  box(P, 0, 0, 0, 10.3, .9, .15, M.biancoCaldo); box(P, 0, 0, .15, .15, .9, 11.05, M.biancoCaldo);
  box(P, .15, .9, .05, 10.0, 1.3, .015, M.vetro, { cast: false }); box(P, .05, .9, .15, .015, 1.3, 10.8, M.vetro, { cast: false });
  for (let x = .3; x <= 10.1; x += 1.62) box(P, x - .03, .9, .03, .06, 1.3, .08, U.alluminio, { cast: false });
  for (let z = .3; z <= 11; z += 1.52) box(P, .03, .9, z - .03, .08, 1.3, .06, U.alluminio, { cast: false });
  for (const y of [.9, 2.17]) { box(P, .15, y, .02, 10.0, .04, .1, U.alluminio, { cast: false }); box(P, .02, y, .15, .1, .04, 10.9, U.alluminio, { cast: false }); }
  box(P, 10.15, 0, 0, .15, HP1, 11.2, U.bianca); box(P, 0, 0, 11.05, 10.15, HP1, .15, U.bianca);
  // sala del consiglio (CDA): parete vetrata a telaio in alluminio verso il corridoio (tre file di lastre, F 7468, 7471) con porta a vetri aperta
  vetrata(P, M, 4.5, .15, 4.5, 8.3, HP1, U.alluminio, 1.36, [0, .9, 1.8], [[1.25, 2.15]]);
  parete(P, .15, 8.3, 4.56, 8.3, HP1, U.bianca, U.bianca);   // parete dello schermo
  box(P, 1.7, 1.0, 8.2, 1.65, .95, .06, U.tv); box(P, 3.55, .85, 8.22, .85, 1.25, .04, U.tv); box(P, 3.6, .9, 8.21, .75, 1.15, .01, U.foto, { cast: false });   // schermo spento e pannello nero con foto (F 7469)
  box(P, .15, 0, 2.35, .4, HP1, .45, M.biancoCaldo);   // pilastro sul lato ovest (F 7469, a destra)
  // tavolo bianco lungo con gambe in alluminio (F 7469, 7470): 4,6 × 1,4 m; 10 sedie nere a rete: 4 per lato e 2 in testa verso lo schermo
  box(P, 1.65, .7, 2.9, 1.4, .05, 4.6, M.bianco); for (const [a, b] of [[.05, .1], [1.27, .1], [.05, 4.42], [1.27, 4.42]]) box(P, 1.65 + a, 0, 2.9 + b, .08, .7, .08, U.alluminio);
  for (const z of [3.5, 4.5, 5.5, 6.5]) { sedia(P, M, 1.2, z, Math.PI / 2); sedia(P, M, 3.5, z, -Math.PI / 2); }
  for (const x of [2.0, 2.7]) sedia(P, M, x, 7.9, Math.PI);
  for (const x of [2.0, 2.7]) monitor(P, U, x, 7.2, Math.PI, .5);   // due monitor in testa al tavolo (F 7469, 7471)
  box(P, 1.9, .75, 4.2, .6, .02, .42, M.biancoCaldo, { cast: false }); box(P, 2.5, .75, 5.6, .45, .03, .32, M.nero, { cast: false });   // fogli e cartella sul tavolo (F 7469)
  // poltrone di pelle nera nell'angolo verso lo schermo, mobile basso scuro vicino alla porta, libreria a nord (F 7468, 7469)
  for (const z of [6.9, 7.55]) { box(P, 3.7, 0, z, .62, .42, .58, M.nero); box(P, 4.2, .42, z, .12, .35, .58, M.nero); }
  box(P, 3.95, 0, 2.4, .45, .75, 1.5, U.scrivScura); box(P, 1.0, 0, .2, 2.6, 2.0, .38, M.bianco);
  for (let i = 0; i < 4; i++) for (const y of [.45, .95, 1.45]) box(P, 1.05 + i * .64, y, .25, .5, .3, .25, (i + y * 2) % 2 > 1 ? U.scura : M.biancoCaldo, { cast: false });
  pianta(P, M, U, .45, 1.3, .8); pianta(P, M, U, .45, 3.3, .8);   // piante sul davanzale (F 7469)
  // lampada lineare sospesa sopra il tavolo (F 7469, 7470)
  box(P, 2.3, 2.3, 3.3, .06, .05, 3.8, M.nero, { cast: false }); box(P, 2.31, 2.29, 3.35, .04, .01, 3.7, U.luce, { cast: false }); for (const z of [3.8, 6.6]) box(P, 2.325, 2.35, z, .01, .4, .01, M.nero, { cast: false });
  // persone in riunione: una in piedi in testa verso lo schermo, tre sedute (F 7469, 7471)
  persone.push([persona(P, M, 3.2, 7.75, { ry: -2.6, maglia: M.biancoCaldo }), { lavoro: .5, mov: .25 }]);
  for (const [x, z, ry] of [[1.2, 4.5, Math.PI / 2], [3.5, 3.5, -Math.PI / 2], [2.0, 7.9, Math.PI]]) persone.push([persona(P, M, x, z, { ry }), { seduto: 1, lavoro: .3, mov: .2 }]);
  // corridoio (F 7468, 7470, 7471): parete est piena con porte, quadro nero con foto, termosifoni bianchi; fondo nord con foto ed estintore
  parete(P, 5.86, .15, 5.86, 8.9, HP1, U.bianca, U.bianca, [[1.25, 2.15], [4.65, 5.55], [7.7, 8.6]]);
  parete(P, 4.5, 1.0, 5.86, 1.0, HP1, U.bianca, U.bianca); box(P, 4.75, 1.2, 1.03, .9, .6, .02, U.foto, { cast: false }); cyl(P, 5.65, 0, 1.2, .09, .55, U.rosso);
  box(P, 5.8, 1.0, 2.6, .04, 1.2, 1.8, M.nero); box(P, 5.79, 1.05, 2.65, .01, 1.1, 1.7, U.foto, { cast: false });
  for (const z of [2.7, 6.6]) box(P, 5.7, .15, z, .12, .6, 1.0, U.termo);
  parete(P, 4.5, 8.3, 4.5, 9.3, HP1, U.bianca, U.bianca);
  box(P, 4.6, 1.2, 11.02, 1.1, .7, .02, U.foto, { cast: false });   // foto di cucina in fondo al corridoio, oltre il parapetto (F 7470)
  // parapetto della scala: la divisoria della rampa sale fino a +0,95 (piano terra); qui il tratto a x 5,86 verso il pianerottolo e il corrimano
  box(P, 5.86, 0, 8.9, .15, .95, 1.15, U.bianca); box(P, 5.84, .95, 8.88, .19, .04, 1.19, M.grigio);
  // locale quadri elettrici (F 7471: quadro bianco su parete bianca)
  parete(P, 5.86, 2.6, 7.3, 2.6, HS, U.bianca, U.bianca); parete(P, 7.3, .15, 7.3, 2.6, HS, U.bianca, U.bianca); box(P, 6.3, .9, 2.52, .7, 1.0, .08, M.biancoCaldo);
  // uffici a est e locale a sud-ovest: nessuna foto, ILLUSTRATIVI (pareti e una scrivania)
  // tramezzi senza foto tagliati a 1,4 m (sezione): nella vista esplosa non coprono la sala; il tratto z 8,9 fa da parapetto sul vano scala
  parete(P, 5.86, 5.9, 10.15, 5.9, HS, U.bianca, U.bianca); parete(P, 5.86, 8.9, 10.15, 8.9, HS, U.bianca, U.bianca);
  parete(P, .15, 9.3, 4.5, 9.3, HS, U.bianca, U.bianca, [[3.3, 4.2]]);
  for (const [x, z] of [[8.2, .35], [7.4, 4.2], [8.0, 6.6]]) { scrivania(P, x, z, 1.6, .75, U.scrivBianca, M.acciaio); monitor(P, U, x + .8, z + .15, 0); sedia(P, M, x + .8, z + 1.15, Math.PI); }
  box(P, .3, 0, 9.5, 2.4, 2.0, .4, M.bianco);
  // fusione in poche chiamate (atlante + vetro + luce + texture); le persone restano segnaposto (prim.js istanziaPersone)
  fondiStatici(root); root.traverse(m => { if (m.isMesh) m.userData.ombra0 = m.castShadow; });
  // vista esplosa (main.js aggiornaTetto): u = tetto (0 chiuso, 1 tolto), esplodi = la camera guarda la tappa 1. Restituisce true mentre si muove.
  // quattro linee guida verticali agli spigoli della palazzina, dal terreno al solaio sollevato (convenzione dell'assonometria esplosa):
  // una sola mesh, allungata in altezza a ogni fotogramma; niente ombra
  const guide = new THREE.Mesh(mergeGeometries([[.05, .05], [10.25, .05], [.05, 11.15], [10.25, 11.15]].map(([x, z]) => new THREE.BoxGeometry(.035, 1, .035).translate(x, .5, z))), U.alluminio);
  guide.visible = false; scene.add(guide);
  let e = 0, ombra = true;
  E.primo = root;
  E.primoPiano = (u, esplodi, dt) => {
    if (globalThis.__uffEsploso) esplodi = true;   // solo per le foto di controllo (build/qc/uffici/viste.js)
    const e0 = e; e = esplodi && u > .5 ? Math.min(1, e + dt / 1.4) : Math.max(0, e - dt / 1.0);
    const k = e * e * (3 - 2 * e); root.position.y = ESPLOSO * k; root.visible = (u > .001 && u < .5) || e > .005;
    guide.visible = e > .02; guide.scale.y = Math.max(.01, root.position.y + Y1 - .26);
    // sollevato non fa ombra sul piano terra (l'ombra di un piano sospeso confonderebbe la lettura)
    const o = e < .005; if (o !== ombra) { ombra = o; root.traverse(m => { if (m.isMesh && m.userData.fuso) m.castShadow = o && m.userData.ombra0; }); }
    return e !== e0;
  };
  Object.assign(PRIMO, { P, persone, etichetta: [2.4, 3.3, 4.6] });   // etichetta: punto nel gruppo P (sopra la sala) per reparti.js s1
  return root;
}
