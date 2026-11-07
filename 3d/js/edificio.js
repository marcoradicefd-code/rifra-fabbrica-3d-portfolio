// Capannone RiFRA, esterno e pianta in metri. x = est della pianta (verso il silo), z = sud (verso via F.lli Cervi), y = alto.
// Misure dal rilievo del 30/09 (ricerca/LAYOUT-MACCHINE.json e MAPPA-FOTO.md: pianta rettificata + satellite a 0,209 m/px):
// il capannone è 70,9 × 40,6 m (prima 120 × 59, 1,7 volte troppo grande).
// Fonti: PE (piano di evacuazione), E (Street View / Google Earth; «E retro» = earth-retro-*), sat (satellite), V (video), F (foto).
import * as THREE from 'three';
import { box, cyl, tubo, gruppo, etichetta, persona, fondiStatici } from './prim.js';
import { uvMetri } from './materiali.js';
import { pianoTerra, striscia, primoPiano } from './uffici.js';

// ---------- pianta ----------
export const HALL = [[0, 0], [24.9, 0], [24.9, 2.4], [50, 2.4], [50, 5.4], [70.9, 5.4], [70.9, 40.6], [0, 40.6]];   // perimetro (sat + PE)
const H_PROD = 7.2, H_MAG = 6.2, H_UFF = 7.6;   // altezze non misurate: restano quelle del modello (E: silo alto circa il doppio)
// tappe: rettangolo in metri [x0, z0, larghezza est, profondità sud] attorno alle macchine vere (MAPPA-FOTO.md § 4, allargato
// quanto basta per operatori e pile; reparti.js). Macchine: M.. di ricerca/LAYOUT-MACCHINE.json
// Ordine dettato da Marco il 02/10 (HANDOFF § 7.0, ricerca/revisione-2026-10-02/): prima del 02/10 l'ordine era progetto, pannelli,
// sezionatura, squadratura, foratura, fresatura, bordatura, levigatura (M13), verniciatura, lucidatura (EMC + VP), montaggio, imballaggio
export const ST = [
  [.3, .3, 9.7, 5.2],       // 1 ufficio tecnico: open space del piano terra, x 0–10,3 z 0–5,6 (PE «ufficio tecnico / commerciale», F 7464; uffici.js)
  [57, 33.8, 9.6, 9.6],     // 2 portone d'ingresso merci sud-est (righe gialle del corridoio x 61) con il furgone fuori (corsia z 40,6–44,6) e deposito (M10)
  [21.3, 26, 17.8, 6.8],    // 3 due Biesse Rover (M01, M02) e banco
  [30.2, 36.2, 9.8, 4.4],   // 4 Brema EKO 2.1 e foratrice da banco (M04, M05)
  [40.8, 33.6, 14.6, 4.4],  // 5 tre squadratrici (M06 Casolin, M07, M08 Altendorf)
  [54.8, 37.5, 6.2, 3],     // 6 sezionatrice verticale (M09)
  [41, 24.2, 8.8, 6.4],     // 7 Brandt e De Stefani (M22, M21)
  [61, 22.4, 9.2, 8.4],     // 8 levigatura: EMC (M12, Marco 02/10) e levigatrice a 5 calate (M13) accanto
  [48.9, 14.9, 20.4, 7],    // 9 linea Cefla Spraybotic e mixer (M14, M15)
  [63.2, 30.6, 7, 8.8],     // 10 lucidatrice automatica: linea VP Impianti (M11; Marco 02/10 «la macchina a destra della EMC»)
  [19.8, 19.6, 17.1, 3.8],  // 11 Erregi e linea di montaggio (M19)
  [60.6, 8.6, 21.4, 4.8],   // 12 Robopac (M27) e camion al portone sezionale est del magazzino (x 70,9, z 9,5–13)
].map(([x, z, w, d]) => ({ x, z, w, d, cx: x + w / 2, cz: z + d / 2 }));
export const NAMES = ['Il progetto', 'I pannelli', 'La fresatura', 'La foratura', 'La squadratura', 'La sezionatura', 'La bordatura', 'La levigatura', 'La verniciatura', 'La lucidatura', 'Il montaggio', 'Imballaggio e spedizione'];
// lotto per l'inquadratura d'insieme (main.js): capannone, cortili, impianti a est, via F.lli Cervi
export const LOTTO = { cx: 38, cz: 24, r: 46, x0: -6, x1: 100, z0: -3, z1: 62 };
// parcheggio ovest (PE: 8 stalli in linea da ~5 m fra due tratteggi; sat: auto 2 × 4,2 m allineate nord-sud; V 0012 a 12,5 s; F 7465):
// fascia di 6 m tra la recinzione (x −6) e il muro degli uffici; stalli x −5,8…−3,6, corsia x −3,6…0; auto in fila parallele al muro, muso a sud
export const PARCHEGGIO_OVEST = { x0: -5.8, x1: -3.6, z0: 1, passo: 5, n: 8 };

// ---------- costruzione ----------
export function costruisciEdificio(scene, M) {
  const E = { root: gruppo(scene), fronte: [], tetto: gruppo(scene), piano1: [], esterno: gruppo(scene), insegne: [] };
  E.finestreFronte = gruppo(E.root);   // finestre, porte, vetrate e solai dei lati verso la camera: spariscono insieme quando si toglie il tetto
  E.fronte.push(E.finestreFronte);
  const R = E.root, X = E.esterno;
  terreno(X, M); intorno(X, M);
  pavimenti(R, M);
  muri(R, M, E);
  tetti(E.tetto, M);
  uffici(R, M, E, scene);
  impianti(X, M, E.tetto);
  recinzioneEIngresso(X, M, E);
  fondiStatici(E.finestreFronte);   // una chiamata di disegno per materiale invece di una per finestra
  return E;
}

function piano(p, x0, z0, x1, z1, y, mat, uvScale) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
  if (uvScale) uvMetri(g, (x1 - x0) / uvScale, (z1 - z0) / uvScale);
  const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; m.userData.statico = true; p.add(m); return m;
}
// poligono orizzontale (x, z) con texture a metri
function poligono(p, pts, y, mat, uvScale) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))).rotateX(-Math.PI / 2);
  uvMetri(g, 1 / uvScale, 1 / uvScale); const m = new THREE.Mesh(g, mat); m.position.y = y; m.receiveShadow = true; m.userData.statico = true; p.add(m); return m;
}
function terreno(p, M) {
  piano(p, -700, -700, 800, 800, -.02, M.prato, 12);   // prato fino all'orizzonte: la nebbia lo fonde con il cielo (niente bordo del mondo)
  // piazzali in autobloccanti (E, F 7465): confine nord obliquo (PE, tratteggio), recinzione ovest a x −6, recinzione sud a z 47 (sat)
  poligono(p, [[-6, -2.6], [40, -2.2], [81.3, 8.4], [100, 13], [100, 52], [-6, 52]], 0, M.autobloccanti, 8);
  // via F.lli Cervi: marciapiede lungo la recinzione (SV), carreggiata fino a z 56,5 (sat), marciapiede e verde dall'altra parte
  box(p, -120, 0, 52, 340, .15, 1.6, M.biancoCaldo); piano(p, -120, 53.6, 220, 61.5, .01, M.asfalto, 8); box(p, -120, 0, 61.5, 340, .15, 1.6, M.biancoCaldo);
  for (let x = -118; x < 218; x += 6) box(p, x, .011, 57.5, 3, .005, .15, M.righeBianche, { cast: false });
  // fascia sud: corsia di passaggio dei mezzi lungo il capannone (z 40,6–44,6) e linea che separa i posti auto (Marco, 30/09)
  for (let x = 8; x < 69; x += 3) box(p, x, .011, 45.1, 1.8, .005, .12, M.righeBianche, { cast: false });                       // limite della corsia (4,5 m)
  for (let x = 11.9; x < 56; x += 2.5) box(p, x, .011, 45.2, .1, .005, 4.8, M.righeBianche, { cast: false });                     // stalli perpendicolari da 2,5 m
  // parcheggio ovest: linea tratteggiata lungo la corsia e testate degli stalli (PE)
  const P = PARCHEGGIO_OVEST, zf = P.z0 + P.n * P.passo;
  for (let z = P.z0; z < zf; z += 2) box(p, P.x1 - .05, .011, z, .1, .005, 1, M.righeBianche, { cast: false });
  for (let k = 0; k <= P.n; k++) box(p, P.x0, .011, P.z0 + k * P.passo - .05, P.x1 - P.x0, .005, .1, M.righeBianche, { cast: false });
}
// intorno (E, sat, MAPPA-FOTO): alberi sul retro e pini oltre la strada.
// Dal 30/09 (Marco) niente edifici vicini: prima c'erano 4 volumi schematici (capannone oltre la recinzione ovest a x −42…−11,6,
// due edifici oltre la via a z 70, uno a est a x 106), tolti per lasciare in scena solo la fabbrica RiFRA
function intorno(p, M) {
  const alberi = [];
  for (let x = -4; x < 72; x += 6.5) alberi.push([x + ((x * 7) % 3), -6.5 - ((x * 13) % 4), 1.05 + ((x * 5) % 4) * .1]);   // retro: fila di alberi (E retro)
  for (let x = -14; x < 110; x += 11) alberi.push([x, 64.8, 1.25]);                                                      // pini oltre la strada (V f_049, E)
  alberi.push([28.2, 50.6, .8], [90.5, 35, 1.1], [91, 40, 1], [95, 31, .9]);   // cortile est: il primo a x 90,5 (prima 86) per il passaggio del camion                                                   // davanti alla recinzione (SV), cortile est (V f_046–047)
  for (const [x, z, s] of alberi) albero(p, M, x, z, s);
}
// albero: tronco e chioma a 4–5 masse irregolari, verdi scuri e spenti con variazioni (E: alberi attorno al lotto); fuso con gli altri
let _seme = 11; const _rnd = () => (_seme = (_seme * 16807) % 2147483647) / 2147483647;
export function albero(p, M, x, z, s = 1) {
  cyl(p, x, 0, z, .2 * s, 3.2 * s, M.tronco, { ott: true });
  const c = new THREE.Color(), n = 4 + Math.floor(_rnd() * 2);
  for (let k = 0; k < n; k++) {
    const r = (k ? 1.5 + _rnd() * .7 : 2.3) * s, a = k * 2.4 + _rnd(), d = k ? 1.3 * s : 0;
    const g = new THREE.IcosahedronGeometry(r, 1), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const f = 1 + (Math.sin(pos.getX(i) * 3.1 + k) * Math.cos(pos.getZ(i) * 2.7) * .12); pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f * .9, pos.getZ(i) * f); }
    g.translate(x + Math.cos(a) * d, (4.6 + (k ? _rnd() * 1.4 - .5 : .4)) * s, z + Math.sin(a) * d);
    const col = new Float32Array(pos.count * 3); c.setHSL(.25 + _rnd() * .06, .2 + _rnd() * .08, .15 + _rnd() * .05);
    for (let i = 0; i < pos.count; i++) { const l = 1 + (pos.getY(i) - 4.6 * s) * .05; col[i * 3] = c.r * l; col[i * 3 + 1] = c.g * l; col[i * 3 + 2] = c.b * l; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, M.chioma); m.castShadow = true; m.receiveShadow = true; m.userData.statico = true; p.add(m);
  }
}
function pavimenti(p, M) {
  // produzione (cemento, giunti ogni 6 m), magazzino a gradini sul lato nord, uffici (pavimento lucido, F 7460–7471)
  // UV in metri anche per magazzino e raccordo (02/10, texture.js: prima il magazzino stirava 1/6 di tessera su tutto il piano)
  const pv = piano(p, 5.3, 13, 70.9, 40.6, .02, M.pavimento); uvMetri(pv.geometry, 65.6, 27.6); piano(p, 5.3, 11.2, 10.3, 13, .02, M.pavimento, 1);
  piano(p, 10.3, 0, 24.9, 13, .02, M.pavMagazzino, 1); piano(p, 24.9, 2.4, 50, 13, .021, M.pavMagazzino, 1); piano(p, 50, 5.4, 70.9, 13, .022, M.pavMagazzino, 1);
  piano(p, 0, 0, 10.3, 11.2, .03, M.pavUffici); piano(p, 0, 11.2, 5.3, 40.6, .03, M.pavUffici);
  // corridoi della pianta (PE, percorsi verdi) segnati a terra da due righe gialle
  const lx = (x0, x1, z, l) => { for (const d of [-l / 2, l / 2]) box(p, x0, .025, z + d - .06, x1 - x0, .004, .12, M.righeGialle, { cast: false }); };
  const lz = (z0, z1, x, l) => { for (const d of [-l / 2, l / 2]) box(p, x + d - .06, .025, z0, .12, .004, z1 - z0, M.righeGialle, { cast: false }); };
  lx(10.3, 70, 10.3, 2.5); lx(6, 69, 23.4, 2); lx(6, 62, 33.3, 2); lz(13, 33.3, 41.3, 2.2); lz(13, 40.6, 6.6, 1.8); lz(23.4, 40.6, 9.3, 1.8); lz(23.4, 40.6, 61, 1.8);
}
// muri esterni: pelle in pannelli di cemento (E, SV) e interno antracite in produzione / bianco in magazzino e uffici (V).
// o.fin: finestre { w, h, y, passo, da, cornice, vetro }; o.porte: [[s, largh, alt, materiale, pensilina]] (s = distanza dall'inizio del tratto)
function muri(p, M, E) {
  const FF = E.finestreFronte;
  const tratto = (x0, z0, x1, z1, h, inner, fronte, o = {}) => {
    const L = Math.hypot(x1 - x0, z1 - z0), t = .3, geo = uvMetri(new THREE.BoxGeometry(L, h, t), L / 5, h / 7);
    // facce: +x, -x, +y, -y, +z, -z. La normale esterna del poligono orario è a sinistra del verso di percorrenza
    const m = new THREE.Mesh(geo, [M.bordoFacciata, M.bordoFacciata, M.testaFacciata, M.bordoFacciata, inner, M.facciata]); m.castShadow = m.receiveShadow = true;
    const ry = -Math.atan2(z1 - z0, x1 - x0); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); m.rotation.y = ry;
    const ux = (x1 - x0) / L, uz = (z1 - z0) / L, nx = uz, nz = -ux, dove = fronte ? FF : p;   // normale esterna
    if (fronte) { // muro che si abbassa quando si toglie il tetto: gruppo con le sue facce fuse (atlante + facciata = 2 chiamate)
      const gw = gruppo(p); gw.position.copy(m.position); gw.rotation.copy(m.rotation); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.userData.statico = true; gw.add(m);
      fondiStatici(gw); gw.userData = { hPieno: h, fronte, n: [nx, nz] }; E.fronte.push(gw);   // n: main.js lo alza se la camera lo guarda di fronte
    } else { m.userData = { statico: true }; p.add(m); }
    const pezzo = (s, y, w, hh, d, off, mat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); b.position.set(x0 + ux * s + nx * off, y + hh / 2, z0 + uz * s + nz * off); b.rotation.y = ry; b.userData.statico = true; dove.add(b); return b; };
    const porte = o.porte || [];
    for (const [s, w, hh, mat, pens] of porte) { pezzo(s, 0, w, hh, .1, .19, mat); pezzo(s, hh, w + .2, .08, .12, .2, M.grigioScuro);
      if (pens) pezzo(s, hh + .35, w + 1.2, .12, 1.4, .85, M.antracite); }
    const f = o.fin; if (!f) return;
    for (let s = f.da ?? f.passo / 2; s < L - f.w / 2 - .3; s += f.passo) {
      if (porte.some(([ps, pw]) => Math.abs(s - ps) < (pw + f.w) / 2 + .5)) continue;
      pezzo(s, f.y, f.w, f.h, .08, .2, f.vetro || M.vetroScuro); pezzo(s, f.y - .08, f.w + .2, f.h + .16, .06, .17, f.cornice || M.verdeScuro);
    }
  };
  const QUADRE = { w: 1.2, h: 1.1, y: H_MAG - 2.1, passo: 3.3, cornice: M.biancoCaldo };   // retro: fila continua di finestrelle quadrate sotto la gronda (E retro)
  const LAMELLE = { w: 1.3, h: 1.0, y: 1.5, passo: 4, da: 3.5 };                          // sud ed est: finestre a lamelle con telaio verde (V 0012a, SV); più basse e fitte (P3 n. 26)
  const P = M.biancoCaldo;
  // nord del blocco uffici: vetrata e scritta RiFRA (vedi uffici). Dal 30/09 si abbassa con il tetto tolto come i muri di facciata:
  // la tappa 1 guarda l'ufficio tecnico da nord (tavole appese sulla parete sud, F 7464)
  tratto(0, 0, 10.3, 0, H_UFF, M.biancoCaldo, 1);
  tratto(10.3, 0, 24.9, 0, H_MAG, M.internoBianco, 0, { fin: { w: 1.7, h: 1.45, y: 2.1, passo: 3.2, da: 2.5, cornice: M.biancoCaldo } });   // annesso: 4 finestre quadrate (E retro)
  tratto(24.9, 0, 24.9, 2.4, H_MAG, M.internoBianco, 0, { porte: [[1.2, 1.2, 2.2, M.grigio]] });            // porta nord al gradino (PE, F 7460)
  tratto(24.9, 2.4, 50, 2.4, H_MAG, M.internoBianco, 0, { fin: QUADRE });
  tratto(50, 2.4, 50, 5.4, H_MAG, M.internoBianco, 0, { porte: [[1.5, 1.2, 2.2, M.verdeScuro]] });          // porta verde al gradino (V f_014)
  tratto(50, 5.4, 70.9, 5.4, H_MAG, M.internoBianco, 0, { fin: QUADRE });
  tratto(70.9, 5.4, 70.9, 13, H_MAG, M.internoBianco, 0, { porte: [[4.1, 3.5, 4.2, P]] });                   // portone sezionale del magazzino est (V f_014, F 7456)
  tratto(70.9, 13, 70.9, 40.6, H_PROD, M.internoAntracite, 0, { fin: LAMELLE, porte: [[5.4, 1.2, 2.2, M.grigio], [15.5, 1, 2.2, M.grigio]] });   // uscita zona Cefla, centrale termica (PE)
  tratto(70.9, 40.6, 0, 40.6, H_PROD, M.internoAntracite, 1, { fin: LAMELLE,                                  // sud (via F.lli Cervi): porte da PE, V 0012, SV
    porte: [[.9, .9, 2.2, M.grigio], [8.8, 2.5, 3.2, P], [24.3, 1.2, 2.2, M.grigio], [42.4, 1.2, 2.2, M.grigio], [62.4, 3, 3.6, P], [69.1, 1, 2.2, M.grigio, 1]] });
  tratto(0, 40.6, 0, 11.2, H_PROD, M.biancoCaldo, 1, { fin: { w: 1.6, h: 1.3, y: 1.0, passo: 3.6, da: 2.2, cornice: M.biancoCaldo } });   // ovest: finestre della striscia uffici, telaio chiaro (V 0012b, v0012_t10, F 7469)
  tratto(0, 11.2, 0, 0, H_UFF, M.biancoCaldo, 1);                                                             // ovest del blocco uffici: vetrata (vedi uffici)
  // pareti interne (rilievo): magazzino / produzione a z 13 con i varchi, uffici / produzione a x 5,3, blocco uffici, locale tecnico
  const parete = (x0, z0, x1, z1, h, matN, matS, dove = p) => { const oriz = z0 === z1, L = oriz ? x1 - x0 : z1 - z0;
    if (oriz) { box(dove, x0, 0, z0 - .12, L, h, .12, matN); box(dove, x0, 0, z0, L, h, .12, matS); box(dove, x0, h, z0 - .12, L, .03, .24, M.grigioScuro); }
    else { box(dove, x0 - .12, 0, z0, .12, h, L, matN); box(dove, x0, 0, z0, .12, h, L, matS); box(dove, x0 - .12, h, z0, .24, .03, L, M.grigioScuro); } };
  for (const [a, b] of [[5.3, 40.4], [42.4, 47.5], [49, 63.5], [64.8, 69.3]]) parete(a, 13, b, 13, 6, M.internoBianco, M.internoAntracite);
  // finestre alte a lamelle nella parete magazzino / produzione (F 7456, V f_014: a destra del corridoio del magazzino): y 4,2, alte 1 m,
  // passo 5,9; attraversano la parete, quindi si vedono dai due lati (P2 n. 15)
  for (const [a, b] of [[5.3, 40.4], [42.4, 47.5], [49, 63.5], [64.8, 69.3]]) for (let x = a + 1.4; x + 1.3 < b - .4; x += 5.9) {
    box(p, x, 4.2, 12.86, 1.3, 1.0, .28, M.vetroInterno, { cast: false }); box(p, x - .1, 4.12, 12.85, 1.5, .08, .3, M.verdeScuro, { cast: false }); box(p, x - .1, 5.2, 12.85, 1.5, .08, .3, M.verdeScuro, { cast: false });
    for (let k = 1; k < 6; k++) box(p, x, 4.2 + k * .166, 12.84, 1.3, .025, .32, M.verdeScuro, { cast: false }); }
  parete(5.3, 11.2, 5.3, 40.6, 3.2, M.biancoCaldo, M.internoAntracite);
  for (let z = 14; z < 40; z += 4) box(p, 5.36, 1.1, z, .08, 1.1, 1.8, M.vetroScuro, { cast: false });   // finestre degli uffici verso la produzione (V 0011, f_067)
  // muro est della palazzina (verso il magazzino): dal 30/09 si abbassa con il tetto tolto come i muri di facciata, così nella vista
  // esplosa della tappa 1 il primo piano sollevato non ha davanti un muro alto 7,6 m (uffici.js primoPiano)
  { const gw = gruppo(p, 10.3, H_UFF / 2, 5.6), yb = -H_UFF / 2; box(gw, -.12, yb, -5.6, .12, H_UFF, 11.2, M.biancoCaldo); box(gw, 0, yb, -5.6, .12, H_UFF, 11.2, M.internoBianco);
    box(gw, -.17, yb, .3, .05, 2.15, .9, M.antracite); box(gw, .12, yb, .3, .03, 2.15, .9, M.grigio);   // porta scura uffici → magazzino a z 5,9–6,8 (PE, V f_003)
    fondiStatici(gw); gw.userData = { hPieno: H_UFF, fronte: 1, n: [1, 0] }; E.fronte.push(gw); }
  // muro sud del blocco uffici: verso la camera, si abbassa con il tetto tolto come i muri di facciata
  // porta verso il corridoio della produzione a x 5,0–5,86 (PE: uscita a sud dell'ingresso; F 7462) e pannelli di legno arancio sulla faccia
  // interna dell'ingresso (F 7462): dentro il gruppo, così si abbassano insieme al muro
  { const gw = gruppo(p, 5.15, H_UFF / 2, 11.2), yb = -H_UFF / 2; box(gw, -5.15, yb, -.12, 5.0, H_UFF, .24, M.biancoCaldo); box(gw, .71, yb, -.12, 4.44, H_UFF, .24, M.biancoCaldo);
    box(gw, -.15, yb + 2.2, -.12, .86, H_UFF - 2.2, .24, M.biancoCaldo); box(gw, -5.0, yb, -.155, 4.85, 2.8, .035, M.legno);
    for (let k = 1; k < 5; k++) box(gw, -5.0 + k * 1.0, yb, -.16, .012, 2.8, .01, M.antracite, { cast: false });
    fondiStatici(gw); gw.userData = { hPieno: H_UFF, fronte: 1, n: [0, 1] }; E.fronte.push(gw); }
  box(p, 68.9, 0, 38.7, 2, 3, 1.9, M.internoAntracite); box(p, 68.85, 3, 38.65, 2.1, .08, 2, M.grigioScuro);   // locale tecnico (PE)
}
// tetto (E, E retro, sat): 24 volte ribassate da ~2,95 m in lastre grigio chiaro con giunti beige, linea rossa a zig-zag, lucernari piatti,
// torrini di aspirazione sulla metà verso il retro e il silo; tetti piani del magazzino (quadrotti crema e chiaro) e degli uffici (scuro)
function tetti(p, M) {
  const volta = (x0, x1, z0, z1, h, n) => {
    const bw = (x1 - x0) / n, geo = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true, -Math.PI / 2, Math.PI);
    uvMetri(geo, 1, (z1 - z0) / 6);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Mesh(geo, M.tetto); v.rotation.x = Math.PI / 2; v.scale.set(bw / 2, z1 - z0, .55);
      v.position.set(x0 + bw * (i + .5), h, (z0 + z1) / 2); v.castShadow = v.receiveShadow = true; v.userData.statico = true; p.add(v);
      if (i % 4 === 1) for (const zz of [z0 + (z1 - z0) * .22, z0 + (z1 - z0) * .68]) box(p, x0 + bw * i + .5, h + .5, zz, bw - 1, .06, 1.6, M.lucernario, { cast: false });
    }
    box(p, x0, h - .15, z0 - .2, x1 - x0, .3, .3, M.grigio); box(p, x0, h - .15, z1 - .1, x1 - x0, .3, .3, M.grigio);
    const pts = []; for (let i = 0; i <= n * 6; i++) { const x = x0 + i * bw / 6, u = ((x - x0) % bw) / bw; pts.push([x, h + Math.sin(u * Math.PI) * .55 + .04, (z0 + z1) / 2 + (u - .5) * .5]); }
    for (const dz of [-.22, -.11, 0, .11, .22]) tubo(p, pts.map(q => [q[0], q[1], q[2] + dz]), .06, M.lineaRossa, { seg: 4, tension: 0 });   // fascia dipinta larga ~0,5 m
  };
  volta(0, 70.9, 12.4, 40.6, H_PROD, 24);
  // tetti piani: annesso e magazzino ovest a quadrotti crema (E retro), magazzino est chiaro; bordo bianco
  box(p, 10.3, H_MAG, 0, 14.6, .25, 12.4, M.tettoChiaro); box(p, 24.9, H_MAG, 2.4, 25.1, .25, 10, M.tettoChiaro); box(p, 50, H_MAG, 5.4, 20.9, .25, 7, M.tettoChiaro);
  // quadrotti crema attaccati agli uffici (E earth-retro-uffici-insegna, sat: x ≈ 11–35), il resto del magazzino chiaro (P2 n. 14)
  piano(p, 10.3, 0, 24.9, 12.4, H_MAG + .27, M.tettoPiano, 8); piano(p, 24.9, 2.4, 35, 12.4, H_MAG + .27, M.tettoPiano, 8);
  for (const [x0, z0, x1, z1] of [[10.3, 0, 24.9, 0], [24.9, 2.4, 50, 2.4], [50, 5.4, 70.9, 5.4], [24.9, 0, 24.9, 2.4], [50, 2.4, 50, 5.4], [70.9, 5.4, 70.9, 12.4]])
    box(p, Math.min(x0, x1) - .15, H_MAG + .25, Math.min(z0, z1) - .15, Math.abs(x1 - x0) + .3, .35, Math.abs(z1 - z0) + .3, M.biancoCaldo);
  // torrini (E retro): cappe rettangolari 1,2 × 0,8 su canna, svasate verso l'alto, con coperchio rosso (P3 n. 20); gruppo verso il silo e al centro
  const cappa = new THREE.CylinderGeometry(.5, .2, .7, 4, 1).rotateY(Math.PI / 4).scale(1.7, 1, 1.13);
  for (const [x, z] of [[58.5, 15.2], [61, 15.8], [55.5, 16.2], [52.8, 15], [47.5, 15.6], [30.5, 14.8], [33, 15.4], [35.4, 14.7]]) {
    cyl(p, x, H_PROD + .45, z, .16, 1.1, M.zincato); const c = new THREE.Mesh(cappa, M.zincato); c.position.set(x, H_PROD + 1.85, z); c.castShadow = true; c.userData.statico = true; p.add(c);
    box(p, x - .66, H_PROD + 2.2, z - .46, 1.32, .08, .92, M.lineaRossa); }
  box(p, 38.5, H_MAG + .25, 10.2, 1.4, .5, 1.1, M.grigio);   // uscita della scala sul tetto piano (E retro)
}
// palazzina uffici a due piani (x 0–10,3, z 0–11,2): tetto piano scuro con bordo bianco, fronte nord e ovest a vetrata scura sotto una fascia
// bianca con la scritta RiFRA in rilievo (E retro, E earth-uffici-insegna, F 7465); dentro: piano terra, striscia e primo piano in uffici.js
// (rifatti il 30/09: ufficio tecnico al piano terra, sala del consiglio al primo piano, Marco). Il solaio del primo piano sta nel gruppo E.primo.
function uffici(p, M, E, scene) {
  box(E.tetto, 0, H_UFF, 0, 10.3, .3, 11.2, M.tettoScuro);
  for (const [x, z, w, d] of [[-.15, -.15, 10.6, .3], [-.15, 10.9, 10.6, .3], [-.15, -.15, .3, 11.5], [10.15, -.15, .3, 11.5]]) box(E.tetto, x, H_UFF + .3, z, w, .3, d, M.biancoCaldo);
  const FF = E.finestreFronte; box(FF, 0, 3.2, 11.2, 5.3, .15, 29.4, M.biancoCaldo);   // controsoffitto della striscia
  // facciata continua: vetro scuro a riquadri, pannelli chiari in basso (E retro). Nord e ovest nel gruppo FF: con il tetto tolto spariscono
  // e i muri si abbassano (prima il nord restava sempre alto; ora la tappa 1 guarda da nord)
  // vetro chiaro e riflettente con montanti chiari (F 7465; prima vetro quasi nero e montanti neri: P3 n. 17)
  box(FF, .3, 1.1, -.27, 9.7, 5.25, .1, M.vetroUffici, { cast: false }); box(FF, .3, .2, -.25, 9.7, .9, .08, M.grigio, { cast: false });
  for (let x = .3; x <= 10.05; x += 1.62) box(FF, x - .05, .2, -.31, .1, 6.15, .06, M.grigio, { cast: false });
  for (const y of [2.3, 3.55, 4.8]) box(FF, .3, y, -.31, 9.7, .1, .06, M.grigio, { cast: false });
  box(FF, -.27, 1.1, .3, .1, 5.25, 10.6, M.vetroUffici, { cast: false }); box(FF, -.25, .2, .3, .08, .9, 10.6, M.grigio, { cast: false });
  for (let z = .3; z <= 10.95; z += 1.52) box(FF, -.31, .2, z - .05, .06, 6.15, .1, M.grigio, { cast: false });
  for (const y of [2.3, 3.55, 4.8]) box(FF, -.31, y, .3, .06, .1, 10.6, M.grigio, { cast: false });
  // dall'interno: finestre a nastro sulla faccia interna del muro nord al piano terra (F 7461, 7464: y 1,0–2,3, passo dei montanti 1,62; P3 n. 19)
  box(FF, .3, 1.0, .15, 9.7, 1.3, .03, M.vetroInterno, { cast: false }); for (let x = .3; x <= 10.05; x += 1.62) box(FF, x - .04, 1.0, .14, .08, 1.3, .05, M.biancoCaldo, { cast: false });
  // stessa fascia sulla faccia interna del muro ovest, fino all'ingresso (F 7463: finestre verso il parcheggio; F 7461: finestra accanto al bancone)
  box(FF, .15, 1.0, .3, .03, 1.3, 9.1, M.vetroInterno, { cast: false }); for (let z = .3; z <= 9.4; z += 1.52) box(FF, .14, 1.0, z - .04, .05, 1.3, .08, M.biancoCaldo, { cast: false });
  // ingresso degli uffici con pensilina sul lato ovest, all'estremità sud della vetrata (F 7465); porta a z 9,5–10,6 (PE: ingresso a z ≈ 9,9)
  box(FF, -1.5, 2.7, 9.1, 1.5, .12, 1.9, M.antracite); box(FF, -.2, 0, 9.5, .1, 2.5, 1.1, M.vetroScuro, { cast: false });
  // scritta RiFRA in rilievo grigia: principale sul fronte nord, verso il retro («dietro», Marco 30/09; E retro, earth-uffici-insegna, F 7465);
  // più piccola sul fronte ovest sopra l'ingresso (F 7465, facoltativa). Lettere alte 0,75 e 0,55 m (rilievo)
  box(FF, -.02, 6.4, -.23, 10.34, 1.2, .08, M.biancoCaldo); box(FF, -.23, 6.4, -.02, .08, 1.2, 11.24, M.biancoCaldo);   // fascia bianca del parapetto (E retro)
  E.insegne.push({ rilievo: true, x: 6, y: 6.62, z: -.23, w: 3, ry: Math.PI, fronte: true });
  E.insegne.push({ rilievo: true, x: -.23, y: 6.72, z: 9.3, w: 2.2, ry: -Math.PI / 2, fronte: true });
  // la fascia bianca del parapetto nord passa nel gruppo FF con la vetrata (sopra)
  pianoTerra(p, M); striscia(p, M); primoPiano(scene, M, E);
}
// cortile impianti a est (rilievo E01–E12; PE, V, E, sat): pensilina, aria compressa, filtri, container, centrale termica, silo, depositi, cabine
function impianti(p, M, tetto) {
  // E01 pensilina di carico davanti al portone del magazzino: la copertura sta con i tetti (si toglie con loro e lascia vedere il camion
  // della tappa 12, Marco 02/10), i pilastri restano a terra
  box(tetto, 70.9, 4.3, 5.4, 4, .15, 15.6, M.zincato); for (const z of [5.6, 13, 20.8]) box(p, 74.7, 0, z - .1, .15, 4.3, .15, M.acciaio);
  // E02 serbatoio aria compressa e compressori
  cyl(p, 71.8, 0, 20.5, .55, 2.5, M.grigio); box(p, 71.2, 0, 21.3, 1.7, 1.4, 1.4, M.grigioScuro);
  // E03 due filtri polveri con tramoggia
  for (const z of [18.4, 20.4]) { box(p, 74.9, 1.6, z, 2.7, 4.9, 2, M.grigio); box(p, 74.8, 6.5, z - .1, 2.9, .25, 2.2, M.grigioScuro); box(p, 75.6, 0, z + .5, 1.3, 1.6, 1, M.grigioScuro); }
  // E04 due container da 20' con fianchi ondulati
  for (const z of [18.4, 24.3]) { box(p, 78.3, 0, z, 2.9, 2.6, 6, M.verdeScuro); for (let k = .3; k < 6; k += .3) box(p, 81.22, .1, z + k, .04, 2.4, .08, M.verdeScuro); }
  // E05 centrale termica addossata al muro, in blocchi, con camino
  box(p, 71.1, 0, 24.1, 3.8, 4, 6.9, M.facciata); box(p, 71, 4, 24, 4, .15, 7.1, M.grigioScuro); cyl(p, 73.9, 4, 26, .25, 3, M.zincato);
  // E06 silo polveri: cilindro grigio zincato con nervature, telaio verde pallido, scala con gabbia, due pianerottoli, parapetto
  // (E silo, V f_047; prima ottagono crema con gonna verde brillante: P3 n. 17)
  const sx = 74.4, sz = 36, r = 2.2, hs = 14;
  cyl(p, sx, 0, sz, r * 1.02, 2.6, M.silo); cyl(p, sx, 2.6, sz, r, hs - 2.6, M.silo);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; box(p, sx + Math.cos(a) * r - .06, 0, sz + Math.sin(a) * r - .06, .12, hs, .12, M.verdeTelaio); }
  for (let y = 3.2; y < hs; y += 1.2) cyl(p, sx, y, sz, r * 1.012, .06, M.zincatoScuro);
  for (const y of [hs, hs + 1]) cyl(p, sx, y, sz, r * 1.04, .05, M.verdeTelaio, { ott: true });
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; box(p, sx + Math.cos(a) * r * 1.04 - .03, hs, sz + Math.sin(a) * r * 1.04 - .03, .06, 1.05, .06, M.verdeTelaio); }
  const lx = sx - r - .5; for (const dz of [-.3, .3]) box(p, lx, 0, sz + dz, .06, hs, .06, M.verdeTelaio);
  for (let y = .4; y < hs; y += .3) box(p, lx, y, sz - .3, .06, .04, .6, M.verdeTelaio);
  for (let y = 2.5; y < hs; y += .8) { const g = new THREE.Mesh(new THREE.TorusGeometry(.45, .025, 4, 12, Math.PI), M.verdeTelaio); g.position.set(lx - .05, y, sz); g.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.userData.statico = true; p.add(g); }
  for (const y of [6, 10.5]) { box(p, lx - 1.2, y, sz - 1, 1.2, .12, 2, M.verdeTelaio); box(p, lx - 1.2, y + 1, sz - 1, 1.2, .05, 2, M.verdeTelaio); }
  // condotte zincate: aspirazione dal capannone ai filtri, dai filtri al silo
  tubo(p, [[70.9, 6.4, 19.2], [72.8, 6.9, 19.3], [74.9, 6.6, 19.4]], .4, M.zincato);
  tubo(p, [[70.9, 5.8, 21.6], [73, 6.3, 21.5], [74.9, 6.2, 21.4]], .35, M.zincato);
  tubo(p, [[76.2, 7, 22.2], [76.6, 11, 29], [75.2, 14.4, 34.4]], .28, M.zincato);
  // E07 deposito vernici ed E08 cassone rifiuti, ruotati di −30° (PE)
  box(p, 91.5, 0, 21.3, 3, 2.4, 2, M.grigio, { ry: Math.PI / 6 }); box(p, 93.75, 0, 17.55, 5.5, 2, 2.5, M.blu, { ry: Math.PI / 6 });
  // E09 furgone bianco davanti alla porta SE (V f_049). Il cassone scarrabile blu accanto (V f_049) è stato tolto il 02/10 sera (Marco:
  // «togliamo il container blu e la casetta marrone»): lì c'è l'area d'uscita merci del camion
  furgone(p, M, 59.4, 48.2);
  // E10 cabina ENEL, E11 cabina elettrica, E12 contatori gas (PE). La baracca in legno con tetto curvo (V f_045–046, x 72,2–75,2 z 42,6–45)
  // è stata tolta il 02/10 sera (Marco)
  box(p, 77.8, 0, 51.1, 3.5, 3, 3.5, M.biancoCaldo); box(p, 77.7, 3, 51, 3.7, .15, 3.7, M.grigioScuro);
  box(p, 81.3, 0, 49.1, 4.5, 3, 3.8, M.biancoCaldo); box(p, 81.2, 3, 49, 4.7, .15, 4, M.grigioScuro);
  box(p, 73.7, 0, 54, 2, 1.5, .6, M.grigio);
}
// furgone bianco (V f_049): cassone alto e cabina, per la fascia sud
function furgone(p, M, x, z) { box(p, x, .35, z - 1, 3.6, 2.2, 2, M.bianco); box(p, x + 3.6, .35, z - .95, 1.4, 1.35, 1.9, M.bianco); box(p, x + 3.62, 1.1, z - .9, .9, .55, 1.8, M.vetroScuro, { cast: false });
  for (const [a, b] of [[.8, -1], [4.1, -1], [.8, .9], [4.1, .9]]) cyl(p, x + a, .36, z + b + .05, .36, .22, M.nero, { rx: Math.PI / 2 }); }
// recinzione verde a sbarre su muretto (SV), cancelli, ingresso al civico 17 con pensilina a due falde e targa RiFRA (E, SV, PE).
// Tutte le sbarre di un colore in una sola InstancedMesh.
function recinzioneEIngresso(p, M, E) {
  const sb = { verde: [], blu: [] }, m4 = new THREE.Matrix4();
  // lungo x (strada) o lungo z (confine ovest del parcheggio, SV facciata-cancello)
  const barre = (x0, z0, x1, z1, col = 'verde', muretto = true) => { const lungoX = z0 === z1, L = lungoX ? x1 - x0 : z1 - z0, mat = col === 'blu' ? M.blu : M.verdeScuro, y0 = muretto ? .5 : .05;
    if (lungoX) { if (muretto) box(p, x0, 0, z0 - .15, L, .5, .3, M.grigio); for (const y of [y0 + .25, y0 + 1.2]) box(p, x0, y, z0 - .05, L, .06, .06, mat); }
    else { if (muretto) box(p, x0 - .15, 0, z0, .3, .5, L, M.grigio); for (const y of [y0 + .25, y0 + 1.2]) box(p, x0 - .03, y, z0, .06, .06, L, mat); }
    for (let d = 0; d < L; d += .14) sb[col].push(lungoX ? [x0 + d, y0, z0] : [x0, y0, z0 + d]); };
  // recinzione sud: il satellite la dà a z 47; Marco (30/09) chiede una fascia sud più larga, con la corsia dei mezzi e i posti auto
  // perpendicolari: spostata a z 52 insieme a ingresso, cancelli, cabine e strada
  const Z = 52;
  barre(-6, Z, -5.7, Z); barre(-5.7, Z, -1.5, Z, 'verde', false);          // cancello ovest verso il vialetto del parcheggio (PE, V 0012)
  barre(-1.5, Z, 1.6, Z);
  // cancello carraio blu a sinistra del pilastro (SV ingresso-17), scorrevole: dal 02/10 si apre quando passa il furgone (arredi.js);
  // gruppo animato a sé, visibile anche con il tetto chiuso (userData.fuori)
  const scorrevole = (x0, x1, mat) => { const cb = gruppo(p.parent); cb.userData.anim = true; cb.userData.fuori = true; const o = { statico: false };
    for (const y of [.3, 1.25]) box(cb, x0, y, Z - .05, x1 - x0, .06, .06, mat, o);
    for (let d = 0; d < x1 - x0; d += .14) box(cb, x0 + d - .0175, .05, Z - .0175, .035, 1.35, .035, mat, { statico: false, cast: false }); return cb; };
  E.cancello = scorrevole(1.6, 6.7, M.blu);
  barre(7.9, Z, 10.4, Z, 'verde', false);                                    // cancelletto pedonale sotto la pensilina
  barre(10.4, Z, 65, Z); barre(70, Z, 77.8, Z); barre(85.8, Z, 100, Z);   // cabine ENEL al confine
  // cancello carrabile est (PE) x 65–70, scorrevole: dal 02/10 sera (Marco) ci entra ed esce il camion che prende la merce (arredi.js)
  E.cancelloEst = scorrevole(65, 70, M.verdeScuro);
  barre(-6, -2.6, -6, Z);                                                    // confine ovest verso il capannone vicino
  for (const [col, list] of Object.entries(sb)) { if (!list.length) continue; const g = new THREE.InstancedMesh(new THREE.BoxGeometry(.035, 1.35, .035).translate(0, .675, 0), col === 'blu' ? M.blu : M.verdeScuro, list.length);
    list.forEach(([x, y, z], i) => { m4.makeTranslation(x, y, z); g.setMatrixAt(i, m4); }); g.castShadow = false; g.receiveShadow = true; g.computeBoundingSphere(); p.add(g); }   // sbarre sottili: niente ombra (tremolerebbe)
  box(p, 6.7, 0, 51.4, 1.2, 2.6, 1.2, M.facciata);   // pilastro in cemento con il numero 17 (SV; PE freccia a x 7,3)
  const tet = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.8, 3, 1), M.grigioScuro); tet.rotation.set(0, 0, Math.PI / 2); tet.scale.set(.8, 1, 1.25); tet.position.set(9.2, 3.05, 52.05); tet.castShadow = true; tet.userData.statico = true; p.add(tet);
  box(p, 7.95, 0, 51.95, .1, 2.8, .1, M.nero); box(p, 10.35, 0, 51.95, .1, 2.8, .1, M.nero);
  // targa in pietra chiara con la scritta RiFRA in rilievo sul cancelletto pedonale, a circa 1 m (SV ingresso-17: ~0,9 × 0,4 m)
  E.insegne.push({ targa: true, x: 9.15, y: .8, z: 52.08, w: .95, h: .42, ry: 0 });
  // numero civico 17: piccola targhetta bianca bordata in alto a destra sul fronte del pilastro (SV ingresso-17: ~17 × 15 cm, a ~1,7 m)
  E.insegne.push({ civico: true, x: 7.6, y: 1.72, z: 52.61, w: .18, h: .15, ry: 0 });
}
export { H_PROD, H_MAG, H_UFF };
