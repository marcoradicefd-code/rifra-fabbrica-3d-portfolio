// Esporta l'ANIMAZIONE della pagina 3D per Blender (blender/animazione.py la applica): pezzi in movimento e persone.
// Proprietario: agente dell'animazione (file in esclusiva). Niente librerie esterne oltre a Playwright; il server di prova deve essere attivo.
//
// uso:  cd build/tools && node blender/esporta-animazione.js [cartella-uscita=../../blender/anim] [secondi=50] [fps=30]
//       cd build/tools && node blender/esporta-animazione.js --foto <cartella-png> <viste.json>      (foto di controllo della pagina)
//
// Tempo. Tutte le animazioni della pagina sono funzioni deterministiche del tempo T di main.js (le persone hanno uno stato fra i
// fotogrammi, deterministico con la stessa sequenza di tempi). Il tempo si ottiene così, senza toccare la pagina:
//  - modalità ?video=1: T avanza solo con window.__video.step(dt) (dt fisso = 1/fps, come record.js);
//  - __rf.guarda() mette la camera in modalità libera (il giro non parte, la camera della pagina non conta) e lontana (d ≈ 100 m:
//    nessuna tappa «a fuoco», il primo piano degli uffici resta giù, le condotte alte restano visibili);
//  - il tetto si toglie con il movimento in pausa (pulsante «motion»): T resta 0 mentre il tetto sale, poi si riattiva;
//  - main.js anima solo le tappe dentro l'inquadratura: THREE.Frustum.prototype.intersectsSphere → sempre vero, così OGNI tappa
//    si aggiorna a ogni fotogramma (stesso modulo three della pagina, importato con import('three') e l'importmap);
//  - il disegno si salta (composer.render vuoto): si legge solo lo stato della scena.
//
// Uscita (blender/anim/): indice.json (oggetti, canali, persone), canali.bin (chiavi float32 [fotogramma, valore] già sfoltite:
// si toglie ogni chiave che l'interpolazione lineare ricostruisce entro la tolleranza), persone.bin (geometria delle persone),
// extra.json (geometria dei pezzi che mancano nell'esportazione statica perché a quell'istante erano nascosti e non hanno un gemello),
// verifica.json (posizioni di ossa e pezzi a 8 fotogrammi, per blender/anim/prova_verifica.py).
// Gli id sono quelli di blender/scena/scena.json: gli uuid di three cambiano a ogni caricamento, quindi le mesh si abbinano per
// firma (geometria + materiali, in ordine di visita della scena; per le InstancedMesh firma della mesh + indice dell'istanza).
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const fs = require('fs'), path = require('path');
const ARGS = process.argv.slice(2), FOTO = ARGS[0] === '--foto';
const ROOT = path.resolve(__dirname, '../../..');
const URL = 'http://127.0.0.1:8767/3d/index.html?video=1';

// scheletro di persone.js (OSSA non è esportato): [nome, genitore, riposo]. Si controlla con la cinematica diretta nella pagina.
const OSSA = [
  ['anca', -1, [0, .97, 0]], ['schiena', 0, [0, 1.09, -.005]], ['petto', 1, [0, 1.25, -.012]], ['collo', 2, [0, 1.465, -.022]], ['testa', 3, [0, 1.575, -.01]],
  ['claL', 2, [.03, 1.43, -.012]], ['omeroL', 5, [.185, 1.425, -.025]], ['avambL', 6, [.2, 1.12, -.035]], ['manoL', 7, [.205, .865, -.01]], ['ditaL', 8, [.207, .772, -.002]],
  ['claR', 2, [-.03, 1.43, -.012]], ['omeroR', 10, [-.185, 1.425, -.025]], ['avambR', 11, [-.2, 1.12, -.035]], ['manoR', 12, [-.205, .865, -.01]], ['ditaR', 13, [-.207, .772, -.002]],
  ['femoreL', 0, [.092, .915, 0]], ['tibiaL', 15, [.095, .49, .012]], ['piedeL', 16, [.095, .075, -.015]], ['puntaL', 17, [.095, .022, .128]],
  ['femoreR', 0, [-.092, .915, 0]], ['tibiaR', 19, [-.095, .49, .012]], ['piedeR', 20, [-.095, .075, -.015]], ['puntaR', 21, [-.095, .022, .128]],
];

// ---------------------------------------------------------------------------------------------------------------------------
// Preparazione comune nella pagina: tempo fermo a 0, tetto tolto, camera libera e lontana, tutte le tappe aggiornate, niente disegno
// ---------------------------------------------------------------------------------------------------------------------------
async function prepara(p) {
  return p.evaluate(async () => {
    const THREE = await import('three'); window.__T = THREE;
    THREE.Frustum.prototype.intersectsSphere = () => true;
    const post = window.__rf.post(); window.__disegna = post.composer.render.bind(post.composer); post.composer.render = () => {};
    window.__rf.guarda([36, 0, 22], [36 + 70, 70, 22 + 30]);
    window.__rf.tetto(1);
    const mot = document.getElementById('motion'); mot.click();              // movimento in pausa: T fermo
    const pausa = mot.getAttribute('aria-pressed');
    for (let i = 0; i < 40; i++) window.__video.step(.1);                      // il tetto sale (1,6 s) con T = 0
    mot.click();                                                                // movimento attivo
    return { pausa, attivo: mot.getAttribute('aria-pressed') };
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Personaggi (blender/personaggi.json, 01/10): tre persone del direttivo RiFRA, ritratti stilizzati dalle foto di Marco.
// Si creano con persona() di persone.js DOPO tutte le altre (in coda a PERSONE): le altre persone, i loro semi e le loro chiavi
// non cambiano. Pose semplici: fasi che si ripetono con un periodo (parla, ascolta, indica i disegni, guarda i disegni; seduto al
// lavoro con sguardi), miscelate con rampe di 0,5 s così mani e sguardo non saltano. Tutto in coordinate three del mondo.
// ---------------------------------------------------------------------------------------------------------------------------
const AGGIUNGI = async ({ PG, TAVOLO }) => {
  const THREE = window.__T, PM = await import('/3d/js/persone.js'), { scene } = window.__rf;
  const root = new THREE.Group(); root.userData.reparto = 0; root.name = 'personaggi-rifra'; scene.add(root);   // reparto 0 = tappa 1
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const L = PG.map(c => {
    const a = c.aspetto, g = PM.persona(root, {}, c.dove.x, c.dove.z, { ...a, ry: c.dove.ry, seme: c.seme });
    const st = g.userData.stato; st.__pg = c; st.denim = 0; return { st, g, c };
  });
  const per = Object.fromEntries(L.map(q => [q.c.nome, q]));
  // punti da guardare: testa di un altro personaggio (altezza degli occhi), il tavolo con le tavole, il monitor
  const testa = nome => { const q = per[nome]; if (!q) return null; const h = q.st.h, sed = q.c.posa.tipo === 'seduto';
    return [q.c.dove.x + Math.sin(q.c.dove.ry) * .08 * h, (sed ? 1.2 : 1.62) * h, q.c.dove.z + Math.cos(q.c.dove.ry) * .08 * h]; };
  const bersaglio = (b, c) => b === 'tavolo' ? (c && c.posa.tavolo) || TAVOLO : Array.isArray(b) ? b : testa(b);
  // da spazio del corpo (x a sinistra della persona, y in alto, z avanti) al mondo
  const mondo = (c, l) => { const r = c.dove.ry, s = Math.sin(r), k = Math.cos(r); return [c.dove.x + k * l[0] + s * l[2], l[1], c.dove.z - s * l[0] + k * l[2]]; };
  // peso di una fase [t0, t1] nel ciclo (rampe di 0,5 s centrate sui bordi: fasi contigue sommano a 1)
  const peso = (t, P, t0, t1) => { let w = 0; for (const k of [-1, 0, 1]) { const u = (t % P) + k * P; w = Math.max(w, ss(t0 - .25, t0 + .25, u) * (1 - ss(t1 - .25, t1 + .25, u))); } return w; };
  const azione = (tipo, c, t, s) => {   // → { lav, presa (mondo), largo }
    const h = per[c.nome].st.h;
    if (tipo === 'parla') return { lav: .5 + .12 * Math.sin(1.7 * t + s), largo: .32 + .1 * Math.sin(2.7 * t + 2 + s),
      presa: mondo(c, [.04 * Math.sin(2.3 * t + s), (1.08 + .05 * Math.sin(3.1 * t + 1 + s)) * h, (.33 + .05 * Math.sin(1.9 * t + s)) * h]) };
    if (tipo === 'indica') return { lav: .72 + .05 * Math.sin(2.2 * t), largo: .22, presa: (c.posa.tavolo || TAVOLO).map((v, i) => v + (i === 0 ? .12 * Math.sin(.9 * t) : i === 2 ? .06 * Math.sin(1.3 * t) : 0)) };
    if (tipo === 'disegni' || (tipo === 'ascolta' && c.aspetto.donna)) return { lav: .6, largo: .03, presa: mondo(c, [0, .97 * h, .2 * h]) };   // mani giunte
    return { lav: 0, largo: .3, presa: mondo(c, [0, h, .3 * h]) };   // ascolta: braccia lungo i fianchi
  };
  window.__posaPersonaggi = t => {
    for (const { g, c, st } of L) {
      const P = c.posa.periodo || 16, s = st.seme * 6;
      if (c.posa.tipo === 'seduto') {
        let w = 0, gb = null;
        for (const [t0, t1, chi] of c.posa.sguardi || []) { const q = peso(t, P, t0, t1); if (q > w) { w = q; gb = bersaglio(chi, c); } }
        const m = c.posa.monitor, gv = gb ? m.map((v, i) => v + (gb[i] - v) * w) : m;
        g.posa(t, { seduto: 1, lavoro: 1 - .85 * w, mov: .6, guarda: gv });
        continue;
      }
      let lav = 0, sl = 0, pr = [0, 0, 0], lg = 0, gw = 0, gv = [0, 0, 0];
      for (const [t0, t1, tipo, chi] of c.posa.fasi) { const w = peso(t, P, t0, t1); if (w <= 0) continue;
        const a = azione(tipo, c, t, s), b = bersaglio(chi, c);
        lav += w * a.lav; if (a.lav > 0) { sl += w * a.lav; for (let i = 0; i < 3; i++) pr[i] += w * a.lav * a.presa[i]; lg += w * a.lav * a.largo; }
        if (b) { gw += w; for (let i = 0; i < 3; i++) gv[i] += w * b[i]; } }
      const o = { lavoro: lav };
      if (sl > 0) { o.presa = pr.map(v => v / sl); o.largo = lg / sl; }
      if (gw > 0) o.guarda = gv.map(v => v / gw);
      g.posa(t, o);
    }
  };
  return L.map(q => ({ nome: q.c.nome, h: q.st.h, indice: PM.PERSONE.indexOf(q.st) }));
};

// ---------------------------------------------------------------------------------------------------------------------------
// Campionamento (nella pagina)
// ---------------------------------------------------------------------------------------------------------------------------
const CAMPIONA = async ({ NF, DT, OSSA, TOL }) => {
  const THREE = window.__T, PM = await import('/3d/js/persone.js'), { scene } = window.__rf;
  const b64 = a => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const fnv = (a, h = 2166136261) => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619) >>> 0; } return h; };
  const Cm = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);   // three → Blender: (x, y, z) → (x, −z, y)
  const mobile = o => { for (let q = o; q; q = q.parent) if (q.userData && q.userData.anim) return true; return !!o.isInstancedMesh; };
  const visibile = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  const reparto = o => { for (let q = o; q; q = q.parent) if (q.userData && q.userData.reparto !== undefined) return q.userData.reparto + 1; return 0; };
  // ---- candidati: stesse regole di esporta-scena.js (senza il filtro di visibilità), solo le mesh mobili
  const cand = [], imIdx = new Map();
  const attrF = (g, k) => g.attributes[k] ? Float32Array.from({ length: g.attributes[k].count * g.attributes[k].itemSize }, (_, i) => g.attributes[k].array[i]) : null;
  scene.traverse(o => {
    if (!o.isMesh || o.userData.persone || !o.geometry || !o.geometry.attributes.position) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some(m => !m || m.isShaderMaterial || m.isPointsMaterial) || !mobile(o)) return;
    const g = o.geometry, n = g.attributes.position.count, idx = g.index ? Uint32Array.from(g.index.array) : null;
    const gruppi = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.length : n, materialIndex: 0 }];
    const ms = gruppi.map(q => { const m = mats[q.materialIndex ?? 0] || mats[0]; return q.start + ',' + q.count + ',' + (m.name || m.type) + ':' + m.type + ':' + (m.color ? [m.color.r, m.color.g, m.color.b].map(v => Math.round(v * 1000)).join('/') : ''); }).join(';');
    const pos = attrF(g, 'position'); const sig = (o.isInstancedMesh ? 'I|' : 'M|') + fnv(pos) + '.' + (idx ? fnv(idx) : 0) + '.' + pos.length + '|' + ms;
    const slots = o.isInstancedMesh ? o.instanceMatrix.count : 1;
    for (let k = 0; k < slots; k++) cand.push({ o, k: o.isInstancedMesh ? k : -1, sig, uuid: o.uuid, cap: slots, rep: reparto(o) });
  });
  // ---- persone
  const P = PM.PERSONE, NP = P.length, NB = OSSA.length, REST = OSSA.map(q => new THREE.Vector3(...q[2])), PAD = OSSA.map(q => q[1]);
  // ---- buffer: pezzi 10 valori (loc 3, quat wxyz 4, scala 3) + visibilità; persone 10 + vis + radice 3 + 23 quaternioni
  const NC = cand.length, PZ = new Float32Array(NC * 10 * NF), PV = new Uint8Array(NC * NF);
  const NPV = 10 + 3 + NB * 4, PP = new Float32Array(NP * NPV * NF), PPV = new Uint8Array(NP * NF);
  const W = new THREE.Matrix4(), Mi = new THREE.Matrix4(), B = new THREE.Matrix4(), S = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), qa = new THREE.Quaternion();
  let erroreFK = 0, erroreTaglio = 0, tMax = 0; const ultimo = new Float32Array(4);
  const metti = (buf, o, prevO) => {   // decomposizione di B in buf[o..o+10] con continuità del quaternione rispetto a prevO (se ≥ 0)
    B.decompose(pos, q, sc); const z = Math.abs(sc.x) < 1e-7 || Math.abs(sc.y) < 1e-7 || Math.abs(sc.z) < 1e-7;
    let w = q.w, x = q.x, y = q.y, zz = q.z;
    if (z || !isFinite(w + x + y + zz)) { if (prevO >= 0) { w = buf[prevO + 3]; x = buf[prevO + 4]; y = buf[prevO + 5]; zz = buf[prevO + 6]; } else { w = 1; x = y = zz = 0; } }
    else if (prevO >= 0 && w * buf[prevO + 3] + x * buf[prevO + 4] + y * buf[prevO + 5] + zz * buf[prevO + 6] < 0) { w = -w; x = -x; y = -y; zz = -zz; }
    buf[o] = pos.x; buf[o + 1] = pos.y; buf[o + 2] = pos.z; buf[o + 3] = w; buf[o + 4] = x; buf[o + 5] = y; buf[o + 6] = zz; buf[o + 7] = sc.x; buf[o + 8] = sc.y; buf[o + 9] = sc.z;
    if (!z) { const R = new THREE.Matrix4().compose(pos, q, sc); let e = 0; for (let i = 0; i < 16; i++) e = Math.max(e, Math.abs(R.elements[i] - B.elements[i])); erroreTaglio = Math.max(erroreTaglio, e); }
    return !z; };
  const t0 = performance.now();
  // riferimenti per la verifica in Blender (blender/anim/prova_verifica.py): posizione nel mondo (assi di Blender) di ogni osso
  // ai fotogrammi FV; e il salto più grande di un osso fra due fotogrammi consecutivi (per dire se la pagina stessa «salta»)
  const FV = [0, 271, 301, 646, 901, 1033, 1321, NF - 1].filter((f, i, a) => f < NF && a.indexOf(f) === i), VER = { fotogrammi: FV, persone: [] };
  const ossaW = new Float32Array(NP * NB * 3), ossaP = new Float32Array(NP * NB * 3), salti = new Float32Array(NP); const vb = new THREE.Vector3();
  for (let f = 0; f < NF; f++) {
    window.__video.step(f ? DT : 0);
    if (window.__posaPersonaggi) window.__posaPersonaggi(f * DT);   // personaggi (personaggi.json): stesso tempo T = f / fps della pagina
    scene.updateMatrixWorld(true);
    tMax = Math.max(tMax, ...P.map(st => st.ultimo ?? 0));
    for (let c = 0; c < NC; c++) { const { o, k } = cand[c];
      if (k >= 0) { o.getMatrixAt(k, Mi); W.multiplyMatrices(o.matrixWorld, Mi); } else W.copy(o.matrixWorld);
      B.multiplyMatrices(Cm, W); const base = (c * NF + f) * 10;
      const ok = metti(PZ, base, f ? base - 10 : -1);
      PV[c * NF + f] = ok && visibile(o) && (k < 0 || k < o.count) ? 1 : 0; }
    for (let i = 0; i < NP; i++) { const st = P[i], g = st.g, base = (i * NF + f) * NPV;
      S.makeScale(st.h, st.h, st.h); W.multiplyMatrices(g.matrixWorld, S); B.multiplyMatrices(Cm, W);
      metti(PP, base, f ? base - NPV : -1); PPV[i * NF + f] = visibile(g) ? 1 : 0;
      const R = st.Rq, Pp = st.Pp;
      PP[base + 10] = Pp[0].x - REST[0].x; PP[base + 11] = Pp[0].y - REST[0].y; PP[base + 12] = Pp[0].z - REST[0].z;
      for (let b = 0; b < NB; b++) {
        if (b) { qa.copy(R[PAD[b]]).invert().multiply(R[b]);
          // controllo: le posizioni delle ossa figlie seguono la cinematica diretta (allora basta la rotazione locale)
          const atteso = REST[b].clone().sub(REST[PAD[b]]).applyQuaternion(R[PAD[b]]).add(Pp[PAD[b]]); erroreFK = Math.max(erroreFK, atteso.distanceTo(Pp[b])); }
        else qa.copy(R[0]);
        const o = base + 13 + b * 4, pr = f ? o - NPV : -1; let w = qa.w, x = qa.x, y = qa.y, z = qa.z; const l = Math.hypot(w, x, y, z) || 1; w /= l; x /= l; y /= l; z /= l;
        if (pr >= 0 && w * PP[pr] + x * PP[pr + 1] + y * PP[pr + 2] + z * PP[pr + 3] < 0) { w = -w; x = -x; y = -y; z = -z; }
        PP[o] = w; PP[o + 1] = x; PP[o + 2] = y; PP[o + 3] = z;
        vb.copy(Pp[b]).applyMatrix4(B); ossaW.set([vb.x, vb.y, vb.z], (i * NB + b) * 3); }
      if (f && PPV[i * NF + f] && PPV[i * NF + f - 1]) for (let b = 0; b < NB; b++) { const k = (i * NB + b) * 3; salti[i] = Math.max(salti[i], Math.hypot(ossaW[k] - ossaP[k], ossaW[k + 1] - ossaP[k + 1], ossaW[k + 2] - ossaP[k + 2])); } }
    ossaP.set(ossaW);
    if (FV.includes(f)) VER.persone.push({ f, vis: Array.from(P, (_, i) => PPV[i * NF + f]), ossa: Array.from(ossaW, v => +v.toFixed(5)) });
  }
  const tempo = (performance.now() - t0) / 1000;
  // ---- sfoltimento: chiavi che la retta fra due chiavi vicine ricostruisce entro tol (finestra di pendenze, O(n))
  const keys = []; let nk = 0;
  const deci = (get, n, tol) => { const v = new Float32Array(n); for (let i = 0; i < n; i++) v[i] = get(i);
    const keep = [0]; let i = 0, lo = -Infinity, hi = Infinity;
    for (let j = 1; j < n; j++) { const s = (v[j] - v[i]) / (j - i);
      if (s < lo || s > hi) { keep.push(j - 1); i = j - 1; lo = -Infinity; hi = Infinity; j = i; continue; }
      lo = Math.max(lo, (v[j] - tol - v[i]) / (j - i)); hi = Math.min(hi, (v[j] + tol - v[i]) / (j - i)); }
    if (keep[keep.length - 1] !== n - 1) keep.push(n - 1);
    let mn = Infinity, mx = -Infinity; for (let k = 0; k < n; k++) { mn = Math.min(mn, v[k]); mx = Math.max(mx, v[k]); }
    return mx - mn <= tol ? { costante: v[0] } : { k: keep.map(k => [k, v[k]]) }; };
  const gradino = (get, n) => { const out = [[0, get(0)]]; for (let i = 1; i < n; i++) if (get(i) !== get(i - 1)) out.push([i, get(i)]); return out.length === 1 ? { costante: out[0][1] } : { k: out }; };
  const canale = (dp, ix, r, interp) => { if ('costante' in r) return [dp, ix, 'c', r.costante]; const off = nk; r.k.forEach(([f, v]) => keys.push(f + 1, v)); nk += r.k.length; return [dp, ix, interp, off, r.k.length]; };
  const TRS = [['location', 3, 0, TOL.loc], ['rotation_quaternion', 4, 3, TOL.rot], ['scale', 3, 7, TOL.scala]];
  const canaliTRS = (buf, stride, base0, tolK = 1) => { const out = []; let fermo = true;
    for (const [dp, nc, o, tol] of TRS) for (let i = 0; i < nc; i++) { const r = deci(f => buf[base0 + f * stride + o + i], NF, tol * tolK); if (!('costante' in r)) fermo = false; out.push(canale(dp, i, r, 'L')); }
    return { out, fermo }; };
  // pezzi
  const pezzi = [], extraGeo = {};
  for (let c = 0; c < NC; c++) { const { o, k, sig, uuid, cap, rep } = cand[c];
    let maiVisto = true; for (let f = 0; f < NF; f++) if (PV[c * NF + f]) { maiVisto = false; break; }
    const { out, fermo } = canaliTRS(PZ, 10, c * NF * 10);
    const vis = gradino(f => PV[c * NF + f] ? 0 : 1, NF);        // valore = nascosto (hide_render / hide_viewport)
    out.push(canale('hide', 0, vis, 'C'));
    pezzi.push({ sig, uuid, cap, k, rep, maiVisto, fermo: fermo && 'costante' in vis, canali: out });
  }
  // ---- geometria dei pezzi (servirà solo per quelli che mancano nell'esportazione statica: Node decide quali)
  window.__geoPezzo = c => { const { o, k } = cand[c], g = o.geometry, mats = Array.isArray(o.material) ? o.material : [o.material];
    const idx = g.index ? Uint32Array.from(g.index.array) : null, n = g.attributes.position.count;
    const gruppi = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.length : n, materialIndex: 0 }];
    const mi = m => ({ nome: m.name || m.type, tipo: m.type, colore: m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1], rug: m.roughness ?? .6, met: m.metalness ?? 0,
      emi: m.emissive ? [m.emissive.r, m.emissive.g, m.emissive.b] : [0, 0, 0], emiI: m.emissiveIntensity ?? 1, opac: m.opacity, trasp: !!m.transparent, vc: !!m.vertexColors,
      atlante: !!(m.userData && m.userData.atlante), doppio: m.side === 2, base: !!m.isMeshBasicMaterial, map: !!m.map });
    const icol = o.isInstancedMesh && o.instanceColor;
    return { pos: b64(attrF(g, 'position')), nor: g.attributes.normal ? b64(attrF(g, 'normal')) : null, uv: g.attributes.uv ? b64(attrF(g, 'uv')) : null,
      col: g.attributes.color ? b64(attrF(g, 'color')) : null, colN: g.attributes.color ? g.attributes.color.itemSize : 0, rm: g.attributes.rm ? b64(attrF(g, 'rm')) : null,
      idx: idx ? b64(idx) : null, gruppi: gruppi.map(q => [q.start, q.count, mi(mats[q.materialIndex ?? 0] || mats[0])]), ombra: o.castShadow,
      tinta: icol ? [o.instanceColor.array[k * 3], o.instanceColor.array[k * 3 + 1], o.instanceColor.array[k * 3 + 2]] : null }; };
  // persone: canali dell'armatura (oggetto + ossa) e visibilità della mesh
  const persone = P.map((st, i) => { const base0 = i * NF * NPV, { out } = canaliTRS(PP, NPV, base0);
    out.push(canale('hide', 0, gradino(f => PPV[i * NF + f] ? 0 : 1, NF), 'C'));
    for (let a = 0; a < 3; a++) out.push(canale(`pose.bones["${OSSA[0][0]}"].location`, a, deci(f => PP[base0 + f * NPV + 10 + a], NF, TOL.loc), 'L'));
    for (let b = 0; b < NB; b++) for (let a = 0; a < 4; a++) out.push(canale(`pose.bones["${OSSA[b][0]}"].rotation_quaternion`, a, deci(f => PP[base0 + f * NPV + 13 + b * 4 + a], NF, TOL.osso), 'L'));
    const hex = c => '#' + c.getHexString(THREE.SRGBColorSpace);   // aspetto per blender/persone.py (capelli, barba, abiti)
    const asp = { stile: st.stile, cap: hex(st.cap), barba: st.barba, donna: st.donna, lunghe: st.lunghe, grembiule: !!st.grembiule, guanti: !!st.guanti, orlo: st.orlo, cg: st.cg, seme: st.seme };
    return { i, rep: reparto(st.g), h: st.h, canali: out, pg: st.__pg ? st.__pg.nome : undefined, asp }; });
  // pezzi alla verifica: posizione e visibilità dal campionamento (prima dello sfoltimento)
  VER.pezzi = FV.map(f => Array.from({ length: NC }, (_, c) => { const o = (c * NF + f) * 10; return [+PZ[o].toFixed(5), +PZ[o + 1].toFixed(5), +PZ[o + 2].toFixed(5), PV[c * NF + f]]; }));
  VER.saltoOssa = Array.from(salti, v => +v.toFixed(4));
  return { tempo, tMax, erroreFK, erroreTaglio, NC, keys: b64(Float32Array.from(keys)), nk, pezzi, persone, VER };
};

// ---------------------------------------------------------------------------------------------------------------------------
// Geometria delle persone (nella pagina): livello di dettaglio alto, parti accese per persona, corporatura e colori come nello shader
// ---------------------------------------------------------------------------------------------------------------------------
const GEOPERSONE = async ({ OSSA, TESTA }) => {
  const PM = await import('/3d/js/persone.js'), { scene } = window.__rf, P = PM.PERSONE;
  const b64 = a => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  let geo = null; scene.traverse(o => { if (o.isInstancedMesh && o.userData.persone && o.customDepthMaterial && (!geo || o.geometry.attributes.position.count > geo.attributes.position.count)) geo = o.geometry; });
  const NN = geo.attributes.normal.array;   // normali di riposo (volume degli abiti dei personaggi)
  const Pp = geo.attributes.position.array, SI = geo.attributes.aSI.array, SW = geo.attributes.aSW.array, RO = geo.attributes.aRO.array, IX = geo.index.array, NV = geo.attributes.position.count;
  // --- funzioni dello shader di persone.js, riscritte in JS (stessi numeri)
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, mix = (a, b, t) => a + (b - a) * t, ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fr = x => x - Math.floor(x), gs = (x, s) => Math.exp(-(x / s) * (x / s));
  const h3 = (x, y, z) => { x = fr(x * .3183099 + .1) * 17; y = fr(y * .3183099 + .1) * 17; z = fr(z * .3183099 + .1) * 17; return fr(x * y * z * (x + y + z)); };
  const vn = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let fx = x - ix, fy = y - iy, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    return mix(mix(mix(h3(ix, iy, iz), h3(ix + 1, iy, iz), fx), mix(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), fx), fy),
               mix(mix(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), fx), mix(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), fx), fy), fz); };
  const LC = PM.LINEA_CAPELLI, linea = a => { for (let i = 1; i < LC.length; i++) if (a <= LC[i][0]) return mix(LC[i - 1][1], LC[i][1], (a - LC[i - 1][0]) / (LC[i][0] - LC[i - 1][0])); return LC[LC.length - 1][1]; };
  const sgn = Math.sign;
  function corporatura(p, reg, g, fem, orlo) {
    let [x, y, z] = p;
    if (reg === 1 || reg === 11 || reg === 10) {
      const pancia = g > 0 ? Math.exp(-(((y - 1.06) / .11) ** 2)) : 0;
      x *= 1 + g * .8; z = z * (1 + g * (z > 0 ? .8 + 2.4 * pancia : .55));
      if (fem > .5) { x *= 1 - .1 * ss(1.26, 1.42, y) + .09 * Math.exp(-(((y - .94) / .08) ** 2)) - .08 * Math.exp(-(((y - 1.1) / .07) ** 2));
        if (z > 0) z += .03 * Math.exp(-(((y - 1.3) / .055) ** 2)) * Math.exp(-(((Math.abs(x) - .075) / .05) ** 2)); }
    } else if (reg === 2 || reg === 9 || reg === 3) {
      const sx = sgn(x), ax = sx * (.185 + .02 * clamp((1.425 - y) / .56, 0, 1));
      if (reg !== 3) { const k = 1 + g * .55 - fem * .1; x = ax + (x - ax) * k; z = -.025 + (z + .025) * k; }
      x += sx * (g * .05 - fem * .016);
    } else if (reg === 4) {
      const sx = sgn(x), ax = sx * .094; let k = 1 + g * .6 * ss(.2, .7, y);
      if (y < orlo - .02) k *= mix(.8, .9, ss(.2, .45, y));
      x = ax + (x - ax) * k; z = z * k; x += sx * g * .03 * ss(.3, .9, y);
    } else if (reg === 6) { const k = 1 + g * .45 - fem * .1; x = x * k; z = -.02 + (z + .02) * k; }
    else if (reg === 8 && fem > .5) { x = sgn(x) * .095 + (x - sgn(x) * .095) * .88; z = -.015 + (z + .015) * .92; }
    return [x, y, z];
  }
  function colore(p, reg, ao, S) {
    const [px, py, pz] = p, mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k], mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
    const pelle = S.pelle; let c = pelle, gRug = .55, gPelle = 1;
    const maglia = mul(S.maglia, .92 + .12 * vn(px * 9, py * 5, pz * 9));
    let pant = mul(S.pant, .9 + .14 * vn(px * 12, py * 4, pz * 12));
    if (S.denim > .5) pant = mul(pant, .88 + .2 * vn(px * 70, py * 16, pz * 70) + .3 * ss(.55, .78, py) * ss(.93, .8, py) * (pz >= 0 ? 1 : 0));
    if (reg !== 5 && reg !== 6 && reg !== 2 && reg !== 3 && reg !== 4) gPelle = 0;
    if (reg === 1) {
      const rc = Math.hypot(px, (pz + .02) * 1.15) + .35 * Math.max(0, 1.46 - py) + .012 * ss(0, .06, -pz);
      c = maglia; gRug = .92;
      if (S.lunghe > .5 && pz > 0 && Math.abs(px) < .006 && py < 1.44) c = mul(c, .8);
      c = mul(c, 1 - .16 * ss(.1, .09, rc));   // costina del girocollo (sfumata: i bordi netti li fa il guscio della maglia in persone.py)
      { const w = ss(.088, .076, rc); if (w > 0) { c = mixc(c, pelle, w); gRug = mix(gRug, .55, w); gPelle = w; } }
      if (py < .968) c = mul(c, .78);
      if (py < .956) { c = pant; gRug = .88; if (py > .93) c = mul(c, .6); }
    } else if (reg === 11) { c = mul(maglia, py < .95 ? .8 : 1); gRug = .92; }
    else if (reg === 9) { c = mul(maglia, py < 1.262 ? .78 : .96); gRug = .92; }
    else if (reg === 2 || reg === 3) {
      if (reg === 2 && (py > 1.27 || (S.lunghe > .5 && py > .885))) { c = maglia; gRug = .9; gPelle = 0; if (py < .905) c = mul(c, .8); }
      if (S.guanti && py < .985) { c = S.guanti; gRug = .42; gPelle = 0; if (py > .93) c = S.polsino; }
      if (reg === 3 && !S.guanti) c = mul(c, .97 + .05 * vn(px * 90, py * 90, pz * 90));
    } else if (reg === 4) {
      c = pant; gRug = .88; gPelle = 0;
      if (py < S.orlo) { c = pelle; gRug = .55; gPelle = 1; if (py < .16) { c = [S.calze, S.calze, S.calze]; gRug = .9; gPelle = 0; } }
      else if (py < S.orlo + .02 && S.orlo > .2) c = mul(c, .75);
      if (S.orlo < .2 && py < .12) c = mul(c, .85);
    } else if (reg === 8) {
      c = S.scarpe; gRug = .55; const zr = pz + .015, l = S.suola;
      if (py < .022) { c = [l, l, l]; gRug = .8; }
      else if (py > .06 && zr > 0 && zr < .11 && Math.abs(Math.abs(px) - .099) < .018) c = mixc(c, [l, l, l], .35);
    } else if (reg === 10) { c = mul(S.grembiule || [0, 0, 0], .9 + .14 * vn(px * 20, py * 6, pz * 20)); gRug = .7; }
    else if (reg === 12) { c = [.02, .02, .02]; gRug = .3; }
    else if (reg === 6) { if (S.lunghe > .5 && py > 1.435 && py < 1.478 && !(pz > 0 && Math.abs(px) < .012 + (1.478 - py) * .5)) { c = maglia; gRug = .9; gPelle = 0; } }
    else if (reg === 7) { c = mul(S.cap, .8 + .28 * vn(px * 160, py * 60, pz * 45) + .12 * vn(px * 420, py * 150, pz * 120 + 3)); gRug = .6; }
    // personaggi (personaggi.json): giacca con camicia aperta al collo, oppure camicetta con scollo a V. Solo se S.abito esiste.
    if (S.abito) {
      const A = S.abito, front = pz > 0, ax = Math.abs(px), cam = A.camicia ? mul(A.camicia, .95 + .08 * vn(px * 14, py * 6, pz * 14)) : maglia;
      if (reg === 1) {
        c = maglia; gRug = A.rug; gPelle = 0;
        // i bordi netti (V, colletti) sono geometria (baveri, sparato della camicia, bordo della scollatura, fasce del colletto):
        // qui sotto basta il colore giusto, coperto ai bordi
        if (A.tipo === 'giacca') {
          const vw = A.vX * clamp((py - A.vY) / (1.47 - A.vY), 0, 1);
          if (front && py > A.vY && py < 1.472 && ax < vw + .004) { if (py > 1.38) { c = pelle; gRug = .55; gPelle = 1; } else { c = cam; gRug = .7; } }
          { const w = (pz > -.01 ? 1 : 0) * ss(1.44, 1.462, py) * ss(.078, .056, ax); if (w > 0) { c = mixc(c, pelle, w); gRug = mix(gRug, .55, w); gPelle = Math.max(gPelle, w); } }   // base del collo: bordo sfumato (niente dentini)
          if (py < .956) { c = pant; gRug = .88; if (py > .93) c = mul(c, .6); }
        } else {
          if (front && py > A.vY && ax < .006 + (py - A.vY) * A.vX) { c = pelle; gRug = .55; gPelle = 1; }               // scollo a V
          else if (front && ax < .005) c = mul(c, .86);                                                                   // abbottonatura
        }
      } else if (reg === 2) {
        c = pelle; gRug = .55; gPelle = 1;
        if (py > .905) { c = maglia; gRug = A.rug; gPelle = 0; } else if (py > .885) { c = A.tipo === 'giacca' ? cam : mul(maglia, .86); gRug = .7; gPelle = 0; }
      } else if (reg === 6) { c = pelle; gRug = .55; gPelle = 1; }
    }
    if (reg === 5) {
      const dx = px / .077, dy = (py - 1.635) / .114, dz = (pz - .012) / .097, L = Math.hypot(dx, dy, dz) || 1;
      const el = Math.asin(clamp(dy / L, -1, 1)), az = Math.atan2(dx, dz), aa = Math.abs(az);
      c = mul(c, .97 + .05 * vn(px * 40, py * 40, pz * 40));
      c = mul(c, 1 - .2 * gs(aa - .36, .14) * gs(el - .085, .075));
      c = mul(c, 1 - .12 * gs(el - .12, .02) * gs(aa - .36, .1));
      c = mul(c, 1 - .3 * gs(el - .088, .017) * gs(aa - .36, .07) - .2 * gs(el - .086, .012) * gs(aa - .35, .025));
      c = mixc(c, [c[0] * 1.05, c[1] * .95, c[2] * .94], gs(aa - .62, .2) * gs(el + .1, .14));
      c = mixc(c, [c[0] * .84, c[1] * .62, c[2] * .6], .75 * gs(el + .41, .045) * gs(az, .19));
      c = mul(c, 1 - .18 * gs(aa - 1.67, .05) * gs(el + .02, .07));
      const hl = linea(aa), inH = S.morbido ? ss(hl - .035, hl + .055, el) : ss(hl - .01, hl + .03, el), u = (aa - .38) / .24;
      const sopr = gs(el - .2 - .025 * (1 - u * u), .02) * (aa >= .13 ? 1 : 0) * (aa <= .64 ? 1 : 0);
      c = mixc(c, mul(S.sopr || S.cap, .8), .85 * sopr);
      const st = S.stile;
      if (st < .5) c = mixc(c, S.cap, inH * .55 * (.8 + .4 * vn(px * 400, py * 400, pz * 400)));
      else if (st > 2.5 && st < 3.5) c = mixc(c, S.cap, inH * mix(.62, .95, ss(0, .55, el)) * (.85 + .3 * vn(px * 380, py * 380, pz * 380)));
      else if (st > 3.5 && st < 4.5) { const calv = ss(.3, .5, el + .25 * Math.max(0, Math.cos(az))); c = mixc(c, S.cap, inH * (1 - calv) * .9); if (calv > .5) gRug = .42; }
      else c = mixc(c, S.cap, inH * .92);
      gPelle *= 1 - inH * .8;
      let bz = ss(-.02, -.2, el + .16 * (1 - clamp(aa / 1.35, 0, 1))) * ss(1.5, 1.28, aa) * ss(-1.15, -.95, el);
      bz = Math.max(bz, gs(el + .33, .035) * gs(az, .28)) * (1 - .8 * gs(el + .41, .03) * gs(az, .17));
      c = mixc(c, mul(S.cap, .85), clamp(S.barba * bz * (.55 + .45 * S.barba) * (.75 + .5 * vn(px * 300, py * 300, pz * 300)), 0, .92));
    }
    return { c: mul(c, mix(.4, 1, ao)), rug: gRug, pelle: gPelle };
  }
  // --- testa ad alta risoluzione (stessa forma: puntoTesta di persone.js), al posto della regione 5 del livello alto:
  //     il viso è dipinto per vertice, quindi servono più vertici (nello shader è dipinto per pixel)
  const bT = OSSA.findIndex(o => o[0] === 'testa'), bC = OSSA.findIndex(o => o[0] === 'collo');
  const orig5 = []; for (let i = 0; i < NV; i++) if (Math.round(RO[i * 3]) === 5) orig5.push(i);
  const grigliaTesta = ([nu, nv]) => { const tP = [], tI = [];
    for (let j = 1; j < nv; j++) for (let i = 0; i < nu; i++) { const v = PM.puntoTesta(-Math.PI + i / nu * 2 * Math.PI, -Math.PI / 2 + j / nv * Math.PI); tP.push(v.x, v.y, v.z); }
    for (let j = 0; j < nv - 2; j++) for (let i = 0; i < nu; i++) { const a = j * nu + i, b = j * nu + (i + 1) % nu, c = a + nu, d = b + nu; tI.push(a, b, d, a, d, c); }
    { const k = tP.length / 3, v = PM.puntoTesta(0, -Math.PI / 2 + .001); tP.push(v.x, v.y, v.z); for (let i = 0; i < nu; i++) tI.push(k, (i + 1) % nu, i);
      const k2 = tP.length / 3, w = PM.puntoTesta(0, Math.PI / 2 - .001), o = (nv - 2) * nu; tP.push(w.x, w.y, w.z); for (let i = 0; i < nu; i++) tI.push(k2, o + i, o + (i + 1) % nu); }
    { let s = 0; const HC = [0, 1.635, .012];   // verso delle facce: normali verso l'esterno del centro della testa
      for (let t = 0; t < tI.length; t += 3) { const [a, b, c] = [tI[t], tI[t + 1], tI[t + 2]].map(k => [tP[k * 3], tP[k * 3 + 1], tP[k * 3 + 2]]);
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        s += n[0] * (a[0] - HC[0]) + n[1] * (a[1] - HC[1]) + n[2] * (a[2] - HC[2]); }
      if (s < 0) for (let t = 0; t < tI.length; t += 3) { const x = tI[t + 1]; tI[t + 1] = tI[t + 2]; tI[t + 2] = x; } }
    const nT = tP.length / 3;
    // occlusione della testa nuova: quella del vertice più vicino della testa originale
    const tAO = new Float32Array(nT); for (let k = 0; k < nT; k++) { let best = 1e9, ao = 1; for (const i of orig5) { const d = (Pp[i * 3] - tP[k * 3]) ** 2 + (Pp[i * 3 + 1] - tP[k * 3 + 1]) ** 2 + (Pp[i * 3 + 2] - tP[k * 3 + 2]) ** 2; if (d < best) { best = d; ao = RO[i * 3 + 2]; } } tAO[k] = ao; }
    return { tP, tI, tAO, nT }; };
  const TESTA0 = grigliaTesta(TESTA);
  let TESTAPG = null; const testaFine = () => TESTAPG || (TESTAPG = grigliaTesta([160, 104]));   // personaggi: viso dipinto più fine
  const OPT = { manica: 8, grembiule: 6, occhiali: 7 };
  const col = c => [c.r, c.g, c.b];
  const uscite = [], parti = [];

  // =========================================================================================================================
  // Personaggi (blender/personaggi.json): geometria propria, disegnata qui dal codice, nello spazio persona FINALE (dopo la
  // corporatura e il «volume» degli abiti). Si appoggia ai vertici veri del corpo: vicino più prossimo (pesi), inviluppo a una
  // quota (gonne di giacca e camicetta), rette parallele a z o a y (baveri, collana). Niente foto, niente modelli scaricati.
  // =========================================================================================================================
  const THREE = await import('three');
  const linC = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };   // sRGB → lineare (come persone.js)
  const BI = Object.fromEntries(OSSA.map((o, i) => [o[0], i]));
  const HC = [0, 1.635, .012], HR = [.077, .114, .097];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mixv = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
  const tabella = k => x => { if (x <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (x <= k[i][0]) return mix(k[i - 1][1], k[i][1], (x - k[i - 1][0]) / (k[i][0] - k[i - 1][0])); return k[k.length - 1][1]; };
  const testaP = (az, el) => { const v = PM.puntoTesta(az, el); return [v.x, v.y, v.z]; };
  const radiale = p => nrm([(p[0] - HC[0]) / HR[0] ** 2, (p[1] - HC[1]) / HR[1] ** 2, (p[2] - HC[2]) / HR[2] ** 2]);
  const angoli = p => { const dx = p[0] / HR[0], dy = (p[1] - HC[1]) / HR[1], dz = (p[2] - HC[2]) / HR[2], L = Math.hypot(dx, dy, dz) || 1; return [Math.atan2(dx, dz), Math.asin(clamp(dy / L, -1, 1))]; };
  const vn3 = (p, k, o = 0) => vn(p[0] * k + o, p[1] * k, p[2] * k);

  function extraPersonaggio(st, PG, S, body) {
    const out = { p: [], c: [], r: [], w: [], i: [], k: [] }, O = [];   // O: centro per il verso delle facce, per vertice
    let KC = 8;   // classe dei vertici che si creano (classe(): 8 dettagli d'abito, 7 occhiali, 12 gioielli, 6 capelli)
    const vtx = (p, c, r, w, o) => { out.p.push(p); out.c.push(c); out.r.push(r); out.w.push(w); O.push(o); out.k.push(KC); return out.p.length - 1; };
    const orienta = tris => { let s = 0;
      for (let k = 0; k < tris.length; k += 3) { const A = out.p[tris[k]], n = cross(sub(out.p[tris[k + 1]], A), sub(out.p[tris[k + 2]], A)); s += dot(n, sub(A, O[tris[k]])); }
      if (s < 0) for (let k = 0; k < tris.length; k += 3) { const t = tris[k + 1]; tris[k + 1] = tris[k + 2]; tris[k + 2] = t; }
      for (const k of tris) out.i.push(k); };
    // griglia nu × nv: F(i, j) → null (buco) | { p, c, r, w, o }; chiusa in u se chiusoU
    const griglia = (nu, nv, F, chiusoU) => { const id = new Map(), tris = [];
      const v = (i, j) => { const ii = chiusoU ? ((i % nu) + nu) % nu : i, k = ii * 4096 + j; if (id.has(k)) return id.get(k); const r = F(ii, j); const x = r ? vtx(r.p, r.c, r.r, r.w, r.o) : -1; id.set(k, x); return x; };
      for (let j = 0; j < nv - 1; j++) for (let i = 0; i < (chiusoU ? nu : nu - 1); i++) { const a = v(i, j), b = v(i + 1, j), c = v(i, j + 1), d = v(i + 1, j + 1); if (a < 0 || b < 0 || c < 0 || d < 0) continue; tris.push(a, b, d, a, d, c); }
      orienta(tris); return v; };
    // tubo lungo un percorso: sezione a superellisse (a lungo «ref», b di lato), chiuso o con tappi
    const tubo = (path, chiuso, sez, ref, c, r, w, nth = 8, esp = 2) => { const n = path.length, rows = [];
      for (let k = 0; k < n; k++) { const A = path[chiuso ? (k - 1 + n) % n : Math.max(0, k - 1)], B = path[chiuso ? (k + 1) % n : Math.min(n - 1, k + 1)];
        const t = nrm(sub(B, A)), r0 = typeof ref === 'function' ? ref(k) : ref, e1 = nrm(sub(r0, scl(t, dot(r0, t)))); rows.push({ C: path[k], e1, e2: cross(t, e1) }); }
      const nv = chiuso ? n + 1 : n;
      griglia(nth, nv, (i, j) => { const R = rows[j % n], th = i / nth * 2 * Math.PI, [a, b] = sez(j % n, th), cs = Math.cos(th), sn = Math.sin(th);
        const u = Math.sign(cs) * Math.abs(cs) ** (2 / esp), v = Math.sign(sn) * Math.abs(sn) ** (2 / esp);
        return { p: addv(addv(R.C, scl(R.e1, u * a)), scl(R.e2, v * b)), c: typeof c === 'function' ? c(j, th) : c, r, w, o: R.C }; }, true);
      if (!chiuso) for (const j of [0, n - 1]) { const k0 = vtx(path[j], typeof c === 'function' ? c(j, 0) : c, r, w, path[j]), tris = [];   // tappi
        const R = rows[j], o2 = addv(path[j], scl(nrm(sub(path[j], path[j ? j - 1 : 1])), -1)), ring = [];
        for (let i = 0; i < nth; i++) { const th = i / nth * 2 * Math.PI, [a, b] = sez(j, th), cs = Math.cos(th), sn = Math.sin(th);
          ring.push(vtx(addv(addv(R.C, scl(R.e1, Math.sign(cs) * Math.abs(cs) ** (2 / esp) * a)), scl(R.e2, Math.sign(sn) * Math.abs(sn) ** (2 / esp) * b)), typeof c === 'function' ? c(j, th) : c, r, w, o2)); }
        O[k0] = o2; for (let i = 0; i < nth; i++) tris.push(k0, ring[i], ring[(i + 1) % nth]); orienta(tris); } };
    const sfera = (C, rx, ry, rz, nu, nv, c, r, w, def) => griglia(nu, nv + 1, (i, j) => {
      const th = i / nu * 2 * Math.PI, ph = -Math.PI / 2 + j / nv * Math.PI; let k = 1; if (def) k = def(th, ph);
      const pj = j === 0 || j === nv ? 0 : 1;   // poli: un solo punto (i = 0)
      const p = [C[0] + Math.cos(ph) * Math.sin(th) * rx * k * pj, C[1] + Math.sin(ph) * ry * k, C[2] + Math.cos(ph) * Math.cos(th) * rz * k * pj];
      return { p, c: typeof c === 'function' ? c(th, ph, k) : c, r, w, o: C }; }, true);

    // ---- il corpo: vertici, regioni, triangoli, pesi
    const NVb = body.reg.length, BP = j => [body.pos[j * 3], body.pos[j * 3 + 1], body.pos[j * 3 + 2]], cache = new Map();
    const indici = regs => { const k = 'i' + regs; if (!cache.has(k)) { const a = []; for (let j = 0; j < NVb; j++) if (regs.includes(body.reg[j])) a.push(j); cache.set(k, a); } return cache.get(k); };
    const triangoli = regs => { const k = 't' + regs; if (!cache.has(k)) cache.set(k, body.tri.filter(([a]) => regs.includes(body.reg[a])).map(t => t.map(BP))); return cache.get(k); };
    const pesoVicino = (p, regs) => { let b = -1, d = 1e9; for (const j of indici(regs)) { const q = (body.pos[j * 3] - p[0]) ** 2 + (body.pos[j * 3 + 1] - p[1]) ** 2 + (body.pos[j * 3 + 2] - p[2]) ** 2; if (q < d) { d = q; b = j; } } return body.pesi(b); };
    // inviluppo: max di (p − centro)·d sui vertici delle regioni con |y − quota| < banda
    const supporto = (y, d, regs, cz = 0, banda = .015) => { let m = -1e9; for (const j of indici(regs)) { if (Math.abs(body.pos[j * 3 + 1] - y) > banda) continue; m = Math.max(m, body.pos[j * 3] * d[0] + (body.pos[j * 3 + 2] - cz) * d[1]); }
      return m > -1e8 || banda > .12 ? m : supporto(y, d, regs, cz, banda * 1.6); };   // fascia vuota (anelli radi): si allarga
    // retta per (u, v) lungo l'asse «a» (2 = z, 1 = y): intersezione più avanti / più in alto, con la normale del triangolo girata verso «verso»
    const retta = (u, v, asse, regs, verso) => { const [iu, iv] = asse === 2 ? [0, 1] : [0, 2]; let best = null;
      for (const [A, B, C] of triangoli(regs)) {
        const d = (B[iv] - C[iv]) * (A[iu] - C[iu]) + (C[iu] - B[iu]) * (A[iv] - C[iv]); if (Math.abs(d) < 1e-12) continue;
        const l1 = ((B[iv] - C[iv]) * (u - C[iu]) + (C[iu] - B[iu]) * (v - C[iv])) / d, l2 = ((C[iv] - A[iv]) * (u - C[iu]) + (A[iu] - C[iu]) * (v - C[iv])) / d, l3 = 1 - l1 - l2;
        if (l1 < -1e-7 || l2 < -1e-7 || l3 < -1e-7) continue;
        const q = l1 * A[asse] + l2 * B[asse] + l3 * C[asse]; if (best && q <= best.q) continue;
        let n = nrm(cross(sub(B, A), sub(C, A))); if (dot(n, verso) < 0) n = scl(n, -1); best = { q, n }; }
      return best; };
    const davanti = (x, y, regs = [1]) => retta(x, y, 2, regs, [0, 0, 1]);
    const W1 = b => [[BI[b], 1]], WT = W1('testa');
    const cap = S.cap, maglia = S.maglia, A = PG.abito || {}, T_ = PG.testa || {};
    const kx = 1 + st.cg * .8 * (st.donna ? .95 : 1);   // x del busto: riposo → finale (corporatura)
    const rnColl = (y, a, cz = -.022) => supporto(y, [Math.sin(a), Math.cos(a)], [6], cz, .012);   // raggio del collo dall'asse

    // ---------------- capelli ----------------
    // calotta: per ogni azimut, dall'alto (el 1,5 + polo) fino al bordo bordo(az): il bordo segue una curva liscia (niente dentini);
    // lo spessore va a zero sul bordo, così l'attaccatura sfuma nel colore dipinto sotto
    const calotta = (nu, nv, bordo, spess, colore, rugo, ricci) => {
      const punto = (az, el) => { const b = testaP(az, el), nr = radiale(b); let p = addv(b, scl(nr, spess(az, el) + .0012)), d = 0; if (ricci) { d = ricci(p); p = addv(p, scl(nr, d)); } return { p, d }; };
      const v = griglia(nu, nv, (i, j) => { const az = -Math.PI + i / nu * 2 * Math.PI, el = mix(1.5, bordo(az), j / (nv - 1)), { p, d } = punto(az, el);
        return { p, c: colore(p, az, el, d), r: rugo, w: WT, o: HC }; }, true);
      const { p, d } = punto(0, Math.PI / 2 - .001), k = vtx(p, colore(p, 0, Math.PI / 2, d), rugo, WT, HC), tris = [];
      for (let i = 0; i < nu; i++) tris.push(k, v(i, 0), v(i + 1, 0)); orienta(tris); };
    // capelli e barba: curve vere in blender/persone.py (i gusci qui sotto restano solo se «curve»: false in personaggi.json)
    const CURVE = T_.curve !== false, stileC = CURVE ? null : T_.capelli; KC = 6;
    if (stileC === 'ricci-lunghi') {
      // Luigi (04): grigio-argento, lunghi fino alle spalle, molto ricci e voluminosi; fronte libera (attaccatura alta, volume portato
      // indietro), orecchie coperte. Calotta + «tenda» che scende dietro e ai lati fino alle spalle.
      const chiaro = linC('#d4cdc1'), scuro = linC('#56514b');
      const bordo = az => { const aa = Math.abs(az); return -.3 + (linea(aa) + .12 + .3) * (1 - ss(.72, 1.12, aa)); };
      const T = (az, el) => { const aa = Math.abs(az);
        let t = .026 + .016 * (1 - ss(.1, 1.2, el)) + .022 * gs(aa - 1.75, .8) * ss(.8, -.25, el);
        return t * (aa < 1.15 ? .3 + .7 * ss(0, .35, el - bordo(az)) : 1); };
      const ricci = p => .015 * (vn3(p, 40) - .45) + .008 * (vn3(p, 85, 7) - .5) + .01 * (vn3(p, 14, 3) - .5);
      const colR = (p, d) => scl(mixv(scuro, chiaro, .12 + .88 * ss(-.012, .014, d)), .8 + .32 * vn3(p, 230, 11));
      // guscio sotto (più scuro: il fondo fra i riccioli) + riccioli: sfere deformate sparse sul guscio, che danno il bordo mosso
      const Tg = (az, el) => Math.max(.008, T(az, el) - .013);
      calotta(132, 46, bordo, Tg, (p, az, el, d) => scl(colR(p, d), .72), .55, ricci);
      const A0 = 1.12, pesoT = y => { const wT = ss(1.47, 1.6, y); return [[BI.testa, wT], [BI.collo, (1 - wT) * .55], [BI.petto, (1 - wT) * .45]]; };
      const tenda = (az, u) => { const aa = Math.abs(az), b = testaP(az, -.3), P0 = addv(b, scl(radiale(b), Tg(az, -.3) + .0012)), fi = Math.atan2(P0[0], P0[2] + .015), r0 = Math.hypot(P0[0], P0[2] + .015);
        const dietro = ss(1.9, 2.9, aa), yb = mix(1.515, 1.415, dietro), fl = mix(.045, .032, dietro);
        const r = r0 + fl * ss(0, 1, u) + .012 * Math.sin(Math.PI * u), hdir = [Math.sin(fi), 0, Math.cos(fi)]; return { p: [hdir[0] * r, mix(P0[1], yb, u), -.015 + hdir[2] * r], hdir }; };
      const nu = 96, nv = 30;
      griglia(nu, nv, (i, j) => {
        let az = mix(A0 + .05, 2 * Math.PI - A0 - .05, i / (nu - 1)); if (az > Math.PI) az -= 2 * Math.PI;   // i riccioli sporgono oltre il bordo
        const { p: p0, hdir } = tenda(az, j / (nv - 1)), d = ricci(p0), p = addv(p0, scl(hdir, d));
        return { p, c: scl(colR(p, d), .72), r: .55, w: pesoT(p[1]), o: [0, p[1], -.015] }; }, false);
      // riccioli piccoli e irregolari (posizione, misura, forma e tono variano col rumore: niente file ordinate «da parrucca»)
      let seme = 0; const rnd = (a, b) => vn(seme * 7.31 + a * 1.37, seme * 3.17 + b * 2.11, 9.7);
      // in alto riccioli piccoli e tondi; nella parte che scende boccoli allungati in verticale (lung > 1)
      const riccio = (C, rb, w, lung = 1) => { const s = ++seme * 1.7, tono = vn3(C, 31, s), sq = .8 + .35 * rnd(1, 2);
        sfera(C, rb, rb * sq * lung, rb * (1.2 - .25 * sq), 9, 7, (th, ph) => { const k = .5 + .5 * Math.sin(ph); return scl(mixv(scuro, chiaro, .3 + .5 * tono + .2 * k), .76 + .24 * k); }, .55, w,
          (th, ph) => 1 + .16 * Math.sin(3 * th + 2 * ph + s) * Math.cos(ph) + .08 * Math.sin(5 * th - ph + 2 * s)); };
      for (let e = 0; e < 18; e++) { const el0 = mix(1.44, -.28, e / 17), cnt = Math.max(6, Math.round(2 * Math.PI * .1 * Math.cos(el0) / .019));
        for (let k = 0; k < cnt; k++) { const az = -Math.PI + (k + .5 * (e % 2) + .7 * (rnd(k, e) - .5)) / cnt * 2 * Math.PI, el = el0 + .07 * (rnd(e, k) - .5), aa = Math.abs(az);
          if (aa < 1.15 && el < bordo(az) + .01) continue;   // anche sul bordo del guscio: lo coprono
          const b = testaP(az, el), nr = radiale(b), C = addv(b, scl(nr, Tg(az, el) - .002 + .006 * (rnd(k + 3, e) - .5)));
          riccio(C, (.01 + .007 * rnd(e + 5, k)) * (aa < 1.15 ? .85 : 1), WT, 1 + .5 * ss(.4, -.3, el)); } }
      riccio(addv(testaP(0, 1.56), [0, Tg(0, 1.5) - .003, 0]), .015, WT);
      for (let e = 0; e < 10; e++) { const u0 = mix(.08, 1, e / 9), cnt = Math.round((2 * Math.PI - 2 * A0) * (.15 + .05 * u0) / .017);
        for (let k = 0; k <= cnt; k++) { let az = mix(A0 - .02, 2 * Math.PI - A0 + .02, clamp((k + .5 * (e % 2) + .6 * (rnd(k, e + 20) - .5)) / cnt, 0, 1)); if (az > Math.PI) az -= 2 * Math.PI;
          const u = clamp(u0 + .06 * (rnd(e + 20, k) - .5), 0, 1), { p, hdir } = tenda(az, u), C = addv(p, scl(hdir, .002 + .006 * (rnd(k, e + 40) - .5)));
          riccio(C, .009 + .006 * rnd(e + 30, k), pesoT(C[1]), 1.8 + .6 * rnd(k + 9, e)); } }
    } else if (stileC === 'ciuffo') {
      // Fabio (02): castano scuro, corti e sfumati ai lati (dipinti sotto), sopra più folti con la riga sul lato destro e il ciuffo alzato
      const bordo = az => Math.max(linea(Math.abs(az)) + .02, .3);
      calotta(110, 40, bordo, (az, el) => { const top = ss(.3, 1.0, el), fr = Math.max(0, Math.cos(az));
        return ss(0, .14, el - bordo(az)) * (.003 + .011 * top + .014 * fr * gs(el - .8, .24) * (1 + .6 * gs(az - .3, .5)) - .004 * fr * gs(az + .42, .08) * ss(.5, .85, el)); },
        (p, az, el) => scl(cap, .78 + .4 * vn(p[0] * 150, p[1] * 60, p[2] * 45) + .14 * vn3(p, 420, 3)), .68,
        p => .0016 * (vn3(p, 90) - .5) + .0012 * (vn(p[0] * 320, p[1] * 70, p[2] * 60) - .5));   // ciocche
    } else if (stileC === 'chignon-alto') {
      // Assunta (03): castano scuro tirati indietro, chignon alto sulla nuca con elastico rosa
      const bordo = az => linea(Math.abs(az)) - .005;
      calotta(110, 46, bordo, (az, el) => ss(0, .07, el - bordo(az)) * (.0045 + .0025 * ss(.3, 1.2, el)),
        (p, az, el) => scl(cap, .7 + .45 * vn(p[0] * 260, p[1] * 260, p[2] * 22) + .1 * vn3(p, 500, 5)), .58,
        p => .0007 * (vn(p[0] * 400, p[1] * 400, p[2] * 30) - .5));   // pettinati all'indietro
      const az0 = Math.PI, el0 = 1.02, b0 = testaP(az0, el0), up = radiale(b0), Cb = addv(b0, scl(up, .03));
      // sfera orientata con l'asse lungo «up»: si costruisce attorno a y e si ruota
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...up)), ruota = v => { const w = new THREE.Vector3(...v).applyQuaternion(q); return [w.x, w.y, w.z]; };
      const ib = out.p.length; sfera([0, 0, 0], .037, .031, .037, 28, 18, (th, ph, k) => scl(cap, .62 + .5 * (k - .92) / .16), .45, WT, (th, ph) => 1 + .08 * Math.sin(4 * th + 3 * ph));
      for (let k = ib; k < out.p.length; k++) { out.p[k] = addv(Cb, ruota(out.p[k])); O[k] = Cb; }
      const Ce = addv(b0, scl(up, .007)), e1 = ruota([1, 0, 0]), e2 = ruota([0, 0, 1]), cer = [];
      for (let k = 0; k < 24; k++) { const a = k / 24 * 2 * Math.PI; cer.push(addv(Ce, addv(scl(e1, Math.cos(a) * .024), scl(e2, Math.sin(a) * .024)))); }
      tubo(cer, true, () => [.0068, .0068], up, linC('#d89a8a'), .7, WT, 8);
    }
    // ---------------- barba corta curata e baffi (Fabio): spessore dove lo shader dipinge la barba ----------------
    // il guscio ha sul bordo lo spessore minimo e il colore del viso dipinto sotto (labbra comprese): il bordo non si vede
    if (T_.barba && !CURVE) { const colB = mixv(cap, linC('#5a4232'), .25);
      griglia(110, 64, (i, j) => {
        const az0 = -1.62 + i / 109 * 3.24, el0 = -1.32 + j / 63 * 1.42, b = testaP(az0, el0), [az, el] = angoli(b), aa = Math.abs(az);
        // stessa maschera dello shader, con il bordo sulle guance più basso (barba corta curata, 02) e i baffi
        let bz = ss(-.02, -.2, el + .07 + .16 * (1 - clamp(aa / 1.35, 0, 1))) * ss(1.5, 1.28, aa) * ss(-1.15, -.95, el);
        bz = Math.max(bz, gs(el + .33, .035) * gs(az, .28)) * (1 - .8 * gs(el + .41, .03) * gs(az, .17));
        if (bz < .03) return null;
        const k = ss(.12, .7, bz), p = addv(b, scl(radiale(b), .0008 + k * k * (.0026 + .001 * (vn3(b, 300) - .5)))), wC = .45 * ss(1.56, 1.5, p[1]) * ss(0, -.05, p[2] - .012 + .02);
        const ao = body.aoTesta(b), viso = colore(b, 5, ao, S).c, barba = scl(colB, mix(.4, 1, ao) * (.7 + .55 * vn3(b, 300)));
        return { p, c: mixv(viso, barba, k), r: mix(.55, .75, k), w: [[BI.testa, 1 - wC], [BI.collo, wC]], o: HC }; }, false); }
    // elastico rosa dello chignon (03): resta geometria anche con i capelli a curve
    if (CURVE && T_.capelli === 'chignon-alto') { const b0 = testaP(Math.PI, 1.02), up = radiale(b0), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...up));
      const ruota = v => { const w = new THREE.Vector3(...v).applyQuaternion(q); return [w.x, w.y, w.z]; }, Ce = addv(b0, scl(up, .007)), e1 = ruota([1, 0, 0]), e2 = ruota([0, 0, 1]), cer = [];
      for (let k = 0; k < 24; k++) { const a = k / 24 * 2 * Math.PI; cer.push(addv(Ce, addv(scl(e1, Math.cos(a) * .022), scl(e2, Math.sin(a) * .022)))); }
      KC = 12; tubo(cer, true, () => [.0068, .0068], up, linC('#d89a8a'), .7, WT, 8); }
    // ---------------- occhiali squadrati spessi (Assunta) ----------------
    KC = 7;
    if (T_.occhiali) { const G = T_.occhiali, cg = linC(G.colore), hw = G.mezzaL, hh = G.mezzaA, sp = G.spessore, rr = .006, ang = [];
      const lenti = [];
      for (const sx of [1, -1]) {
        const e = testaP(sx * .37, .08), c = [e[0] * 1.1, e[1] + .002, e[2] + .025], be = sx * .12, cb = Math.cos(be), sb = Math.sin(be), ruo = ([x, y]) => [c[0] + x * cb, c[1] + y, c[2] - x * sb];
        const path = []; for (const [qx, qy, a0] of [[1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI], [1, -1, 3 * Math.PI / 2]])
          for (let k = 0; k <= 4; k++) { const a = a0 + k / 4 * Math.PI / 2; path.push(ruo([qx * (hw - rr) + Math.cos(a) * rr, qy * (hh - rr) + Math.sin(a) * rr])); }
        tubo(path, true, (j, th) => [sp * 1.05, sp * (1 + .25 * Math.max(0, Math.sin(th)))], [sb, 0, cb], cg, .3, WT, 8, 4);
        lenti.push({ c, ruo, sx });
      }
      const [L, R] = lenti, iL = L.ruo([-(hw - .004), hh - .006]), iR = R.ruo([hw - .004, hh - .006]);
      tubo([iL, [0, (iL[1] + iR[1]) / 2 + .003, Math.max(iL[2], iR[2]) + .006], iR], false, () => [sp * .8, sp * .8], [0, 0, 1], cg, .3, WT, 8, 4);
      for (const { ruo, sx } of lenti) {
        const a = ruo([sx * (hw + sp * .4), hh - .006]), e = testaP(sx * 1.08, .1), o = testaP(sx * 1.6, .08), dentro = .008;
        const p1 = [e[0] + sx * dentro, e[1], e[2]], p2 = [o[0] + sx * .006, o[1], o[2]], p3 = [p2[0] - sx * .002, p2[1] - .022, p2[2] - .014];
        tubo([a, [mix(a[0], p1[0], .5) + sx * .004, mix(a[1], p1[1], .5), mix(a[2], p1[2], .5)], p1, p2, p3], false, () => [.0042, .0018], [0, 1, 0], cg, .3, WT, 6, 4);
      }
    }
    // ---------------- collana di perle a più fili (Assunta) ----------------
    KC = 12;
    if (T_.collana) { const nf = T_.collana.fili || 3, R = T_.collana.raggio || .0037, cz = -.022, rs = rnColl(1.47, Math.PI) + .006;
      for (let f = 0; f < nf; f++) {
        const yF = [1.395, 1.373, 1.35, 1.33][f], zF = (davanti(0, yF) || { q: .1 }).q, rF = zF - cz + R * .3, rS = rs + .004 * f, pts = [];
        for (let k = 0; k < 720; k++) { const a = k / 720 * 2 * Math.PI, sa = Math.sin(a), ca = Math.cos(a), rho = mix(rS, rF, ((1 + ca) / 2) ** 2.2);
          const x = sa * rho, z = cz + ca * rho, h = retta(x, z, 1, [1, 6], [sa, .7, ca]); if (!h) continue;
          pts.push(addv([x, h.q, z], scl(h.n, R + .0012))); }
        let acc = 0; for (let k = 1; k <= pts.length; k++) { const A_ = pts[k - 1], B_ = pts[k % pts.length]; acc += Math.hypot(...sub(B_, A_));
          if (acc < 2 * R * 1.08) continue; acc = 0; const Cp = A_, tono = .94 + .06 * vn3(Cp, 900, f);
          sfera(Cp, R, R, R, 10, 6, (th, ph) => scl(linC('#f1ebdf'), tono * (.9 + .1 * Math.sin(ph))), .2, pesoVicino(Cp, [1, 6]), null); } } }
    // ---------------- abiti: giacca (baveri, collo, falde) e camicetta (falde ampie, colletto) ----------------
    KC = 8;
    const orlo = (a, colore, rugo, yTop, yBot, gap, svasa, pesoF) => {   // falde: anello aperto davanti (gap > 0) o chiuso, dall'inviluppo di busto e gambe
      const nv = 10, rings = [];
      const punto = (a, y) => { const u = (yTop - y) / (yTop - yBot), d = [Math.sin(a), Math.cos(a)], r = Math.max(supporto(y, d, [1, 4], 0, .02), supporto(yTop, d, [1, 4], 0, .02)) + .002 + (.007 + svasa * u ** 1.3) * ss(0, .3, u); return [d[0] * r, y, d[1] * r]; };   // mai rientranze sotto la vita
      const peso = p => { const t = ss(.97, .82, p[1]), fr = Math.max(0, p[2] / Math.hypot(p[0], p[2])), wF = t * (pesoF[0] + pesoF[1] * fr), s = ss(-.03, .03, p[0]);
        return [[BI.anca, 1 - wF], [BI.femoreL, wF * s], [BI.femoreR, wF * (1 - s)]]; };
      const vert = (a, y, j) => { const p = punto(a, y); return { p, c: scl(colore, j === nv - 1 ? .8 : 1), r: rugo, w: peso(p), o: [0, y, -.01] }; };
      if (!gap) { griglia(72, nv, (i, j) => vert(-Math.PI + i / 72 * 2 * Math.PI, mix(yTop, yBot, j / (nv - 1)), j), true); return; }
      for (const sx of [1, -1]) griglia(36, nv, (i, j) => { const y = mix(yTop, yBot, j / (nv - 1)), gx = gap(y), rf = supporto(y, [0, 1], [1, 4], 0, .02) + .01, a0 = Math.asin(clamp(gx / rf, 0, .95));
        return vert(sx * mix(a0, Math.PI, i / 35), y, j); }, false); };
    // fascia attorno al collo, aperta davanti (da a0 a 2π − a0), alle quote ys, a dr[j] dal collo
    const fascia = (a0, ys, dr, colore, rugo, Wn) => griglia(40, ys.length, (i, j) => { const a = mix(a0, 2 * Math.PI - a0, i / 39), y = ys[j], rn = rnColl(y, a);
      const p = [Math.sin(a) * (rn + dr[j]), y, -.022 + Math.cos(a) * (rn + dr[j])]; return { p, c: scl(colore, j === ys.length - 1 ? .9 : 1), r: rugo, w: Wn(p), o: [0, y, -.022] }; }, false);
    // punte del colletto: dal bordo basso della fascia (angoli aI → aE) giù sul petto fino a pI (interno) e pE (punta), [x di riposo, y]
    const punte = (colore, rugo, Wn, aI, aE, pI, pE) => { for (const sx of [1, -1]) {
      const sul = (a, y, d) => { const rn = rnColl(y, sx * a); return [Math.sin(sx * a) * (rn + d), y, -.022 + Math.cos(sx * a) * (rn + d)]; };
      const TI = sul(aI, 1.5, .007), TE = sul(aE, 1.495, .01), q = ([x, y]) => { const X = sx * x * kx, h = davanti(X, y); return [X, y, (h ? h.q : TI[2]) + .008]; }, BI_ = q(pI), BE = q(pE);
      griglia(5, 5, (i, j) => { const u = i / 4, v = j / 4, p = mixv(mixv(TI, TE, u), mixv(BI_, BE, u), v), h = davanti(p[0], p[1]);
        if (h && p[2] < h.q + .006) p[2] = h.q + .006; return { p, c: scl(colore, i === 4 || j === 4 ? .86 : 1), r: rugo, w: Wn(p), o: [p[0] * .3, p[1], p[2] - .1] }; }, false); } };
    if (A.tipo === 'giacca') {
      const cam = linC(A.camicia), Wn = p => pesoVicino(p, [1, 6]), vY = A.vY, vX = A.vX;
      // sparato della camicia nella V (due metà; in alto si apre sul collo nudo), sotto i baveri
      for (const sx of [1, -1]) griglia(6, 16, (i, j) => { const y = mix(vY - .012, 1.478, j / 15), xa = A.colloAperto * clamp((y - 1.4) / .07, 0, 1.2), xb = vX * clamp((y - vY) / (1.47 - vY), 0, 1) + .008;
        const xr = mix(xa, Math.max(xa + .004, xb), i / 5), x = sx * xr * kx, h = davanti(x, y); if (!h) return null; const p = [x, y, h.q + .0025];
        return { p, c: scl(cam, (i === 0 && y < 1.4 ? .82 : 1) * (.96 + .06 * vn3(p, 40))), r: .7, w: Wn(p), o: [x * .4, y, h.q - .12] }; }, false);
      // baveri: dal collo al bottone lungo il bordo della V, con lo spessore (bordi che scendono sul busto)
      const WL = tabella([[0, .03], [.1, .046], [.16, .04], [.2, .058], [.45, .052], [.8, .026], [1, .004]]);
      for (const sx of [1, -1]) griglia(18, 6, (i, j) => { const u = mix(-.09, 1, i / 17), y = 1.47 - u * (1.47 - vY),   // u < 0: sale sulla spalla fino al collo della giacca
        xi = vX * (1 - u) - .004, wl = WL(u);
        const xr = j === 0 ? xi : j === 5 ? xi + wl : xi + wl * (j - 1) / 3, lift = j === 0 || j === 5 ? .0006 : .006 + .003 * (1 - (j - 1) / 3), x = sx * xr * kx;
        const h = davanti(x, y); if (!h) return null; const p = [x, y, h.q + lift];
        return { p, c: scl(maglia, j === 0 || j === 5 ? .72 : j === 1 ? 1.06 : .97), r: A.rug, w: Wn(p), o: [x * .4, y, h.q - .12] }; }, false);
      // collo della camicia (fascia attorno al collo, aperta davanti) e collo della giacca dietro: SOPRA il busto (che chiude a y 1,52)
      fascia(.55, [1.488, 1.516, 1.544], [.0035, .004, .0055], cam, .7, Wn);
      fascia(.95, [1.465, 1.492, 1.516], [.017, .014, .011], maglia, A.rug, Wn);
      punte(cam, .7, Wn, .55, 1.0, [.03, 1.445], [.068, 1.4]);   // punte del colletto aperto sopra i baveri
      // falde della giacca, aperte sotto il bottone
      orlo(0, maglia, A.rug, .995, A.orlo, y => (.01 + (vY - y) * .12) * kx, .012, [.18, .5]);
    } else if (A.tipo === 'camicetta') {
      const Wn = p => pesoVicino(p, [1, 6]);
      // bordo della scollatura a V (rifinitura in stoffa sopra il confine dipinto)
      for (const sx of [1, -1]) griglia(4, 18, (i, j) => { const y = mix(A.vY - .006, 1.482, j / 17), xe = .006 + (y - A.vY) * A.vX, xr = xe - .005 + .015 * i / 3, x = sx * xr * kx, h = davanti(x, y);
        if (!h) return null; const p = [x, y, h.q + (i === 0 || i === 3 ? .0008 : .0028)]; return { p, c: scl(maglia, i === 0 ? .82 : 1), r: A.rug, w: Wn(p), o: [x * .4, y, h.q - .12] }; }, false);
      fascia(.6, [1.49, 1.52, 1.548], [.006, .007, .009], maglia, A.rug, Wn);
      punte(maglia, A.rug, Wn, .6, 1.08, [.036, 1.415], [.078, 1.37]);
      orlo(0, maglia, A.rug, 1.04, A.orlo, null, .032, [.12, .35]);
    }
    return { p: out.p, c: out.c, r: out.r, w: out.w, i: out.i, k: out.k };
  }

  // =========================================================================================================================
  // Persone realistiche (01/10, strada «a» di ricerca/PERSONE-REALISTICHE-BLENDER.md): sagoma, classi e maschere per blender/persone.py
  // =========================================================================================================================
  // sagoma: collo più pieno e un po' più corto (la base del collo, i trapezi, sale verso il collo). Solo la forma di riposo: ossa e pose uguali.
  function sagoma(p, reg) {
    let [x, y, z] = p;
    if (reg === 6) { const k = 1.24 - .14 * ss(1.5, 1.6, y); x *= k; z = -.02 + (z + .02) * k; }
    else if (reg === 1 && y > 1.38) y += .016 * ss(1.38, 1.49, y) * gs(Math.abs(x) - .07, .055);
    else if (reg === 2 && y > 1.425) { const k = .45; y = 1.425 + (y - 1.425) * k; x -= Math.sign(x) * .25 * (1 - k) * (p[1] - 1.425); }   // cima dell'omero schiacciata sulla linea della spalla: niente gobba
    else if (reg === 3) { const sx = Math.sign(x), W = [sx * .205, .865, -.01]; x = W[0] + (x - W[0]) * .92; y = W[1] + (y - W[1]) * .92; z = W[2] + (z - W[2]) * .92; }   // mani un po' più piccole
    return [x, y, z];
  }
  // classe del vertice: 0 pelle del corpo, 1 maglia/camicia/giacca/camicetta, 2 pantaloni, 3 scarpe, 4 grembiule, 5 guanti,
  // 6 capelli (gusci), 7 occhiali, 8 dettagli d'abito dei personaggi, 9 calze, 10 occhi, 11 testa, 12 gioielli
  function classe(p, reg, S) {
    const [px, py, pz] = p, ax = Math.abs(px), front = pz > 0;
    switch (reg) {
      case 3: return S.guanti && py < .985 ? 5 : 0;
      case 5: return 11; case 7: return 6; case 8: return 3; case 9: case 11: return 1; case 10: return 4; case 12: return 7;
      case 2: if (S.guanti && py < .985) return 5; return S.abito ? (py > .885 ? 1 : 0) : (py > 1.27 || (S.lunghe > .5 && py > .885)) ? 1 : 0;
      case 4: return py < S.orlo ? (py < .16 ? 9 : 0) : 2;
      case 1: {
        if (py < .956) return 2;
        if (S.abito) { const A = S.abito;
          if (A.tipo === 'giacca') { const vw = A.vX * clamp((py - A.vY) / (1.47 - A.vY), 0, 1); return (front && py > 1.38 && ((py < 1.472 && ax < vw + .004) || (py > 1.45 && ax < .066))) ? 0 : 1; }
          return front && py > A.vY && ax < .006 + (py - A.vY) * A.vX ? 0 : 1; }
        const rc = Math.hypot(px, (pz + .02) * 1.15) + .35 * Math.max(0, 1.46 - py) + .012 * ss(0, .06, -pz); return rc < .082 ? 0 : 1; }
    }
    return 0;
  }
  // maschere della testa: [cuoio capelluto (dove nascono i capelli), barba, arrossamento (naso, guance, orecchie)]
  function maschere(p, reg, S) {
    if (reg !== 5) return [0, 0, 0];
    const dx = p[0] / .077, dy = (p[1] - 1.635) / .114, dz = (p[2] - .012) / .097, L = Math.hypot(dx, dy, dz) || 1, el = Math.asin(clamp(dy / L, -1, 1)), az = Math.atan2(dx, dz), aa = Math.abs(az);
    const hl = linea(aa); let cu = ss(hl - .01, hl + .03, el);
    if (S.stile > 3.5 && S.stile < 4.5) cu *= 1 - ss(.3, .5, el + .25 * Math.max(0, Math.cos(az)));
    let bz = ss(-.02, -.2, el + .07 + .16 * (1 - clamp(aa / 1.35, 0, 1))) * ss(1.5, 1.28, aa) * ss(-1.15, -.95, el);
    bz = Math.max(bz, gs(el + .33, .035) * gs(az, .28)) * (1 - .8 * gs(el + .41, .03) * gs(az, .17));
    const ro = .9 * gs(az, .13) * gs(el + .08, .12) + .7 * gs(aa - .62, .22) * gs(el + .12, .15) + .8 * gs(aa - 1.68, .1) * gs(el + .02, .14);
    return [cu, clamp(bz, 0, 1), clamp(ro, 0, 1)];
  }
  // occhi: due sfere lucide (iride scura davanti, bianco attorno) un po' dentro le orbite dipinte
  function occhi(S) {
    const E = { p: [], c: [], r: [], w: [], i: [], k: [] }, W = [[BI.testa, 1]], iride = [.03, .02, .014], bianco = [.42, .38, .34], R = .0102, nu = 12, nv = 8;
    for (const sx of [1, -1]) {
      const e = testaP(sx * .355, .082), nr = radiale(e), C = addv(e, scl(nr, -.0055)), o = E.p.length;
      for (let j = 0; j <= nv; j++) for (let i = 0; i < nu; i++) { const th = i / nu * 2 * Math.PI, ph = -Math.PI / 2 + j / nv * Math.PI;
        const d = [Math.cos(ph) * Math.sin(th), Math.sin(ph), Math.cos(ph) * Math.cos(th)], f = dot(d, nr);
        E.p.push(addv(C, scl(d, R))); E.c.push(f > .8 ? iride : f > .7 ? mixv(iride, bianco, .5) : bianco); E.r.push(.08); E.w.push(W); E.k.push(10); }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = o + j * nu + i, b = o + j * nu + (i + 1) % nu, c = a + nu, d = b + nu; E.i.push(a, d, b, a, c, d); }
    }
    return E;
  }
  P.forEach((st, pid) => {
    const PG = st.__pg || null;   // personaggio di personaggi.json: capelli propri al posto delle calotte di persone.js
    const { tP, tI, tAO, nT } = PG ? testaFine() : TESTA0;
    let mask = 0; const on = b => { mask |= 1 << (b - 1); }; if (st.grembiule) on(OPT.grembiule); if (st.occhiali) on(OPT.occhiali);   // capelli: curve in persone.py; maniche: guscio in persone.py
    const S = { maglia: col(st.maglia), pant: col(st.pant), pelle: col(st.pelle), cap: col(st.cap), stile: st.stile, barba: st.barba, scarpe: col(st.scarpe[0]), suola: st.scarpe[1],
      grembiule: st.grembiule ? col(st.grembiule) : null, guanti: st.guanti ? col(st.guanti) : null, polsino: col(st.polsino), lunghe: st.lunghe, orlo: st.orlo, calze: st.calze, denim: st.denim };
    if (PG) { S.abito = PG.abito ? { ...PG.abito, camicia: PG.abito.camicia ? linC(PG.abito.camicia) : null } : null; if (PG.testa && PG.testa.sopracciglia) S.sopr = linC(PG.testa.sopracciglia); S.morbido = true; }
    // vertici tenuti (parti accese, testa originale tolta): riposo, regione, occlusione, ossa e pesi (e normale di riposo, per i personaggi)
    const V = [], tiene = new Int32Array(NV).fill(-1);
    for (let i = 0; i < NV; i++) { const reg = Math.round(RO[i * 3]), bit = Math.round(RO[i * 3 + 1]); if (reg === 5) continue; if (bit > 0 && !(mask & (1 << (bit - 1)))) continue;
      const w = new Map(); for (let a = 0; a < 4; a++) if (SW[i * 4 + a] > 0) w.set(Math.round(SI[i * 4 + a]), (w.get(Math.round(SI[i * 4 + a])) || 0) + SW[i * 4 + a]);
      tiene[i] = V.length; V.push({ p: [Pp[i * 3], Pp[i * 3 + 1], Pp[i * 3 + 2]], reg, ao: RO[i * 3 + 2], w, n: [NN[i * 3], NN[i * 3 + 1], NN[i * 3 + 2]] }); }
    let T = []; for (let t = 0; t < IX.length; t += 3) { const a = tiene[IX[t]], b = tiene[IX[t + 1]], c = tiene[IX[t + 2]]; if (a >= 0 && b >= 0 && c >= 0) T.push([a, b, c, 0]); }
    // bordi dipinti più fitti (lo shader li disegna per pixel, qui per vertice): suddivisione conforme a metà lato, 2 livelli sul busto
    // (scollo), 1 su orlo e cintura, maniche, guanti, orli dei pantaloni, calze, colletto e scarpe. Pesi e occlusione interpolati.
    const segna = ([a, b, c]) => { const r = V[a].reg, ys = [V[a].p[1], V[b].p[1], V[c].p[1]], qual = f => ys.some(f);
      if (PG && r === 1 && V[a].p[2] > -.03 && qual(y => y > 1.42)) return 3;   // personaggi: attorno al collo (collo aperto)
      if (PG && r === 1 && V[a].p[2] > 0 && qual(y => y > 1.06)) return 2;      // personaggi: scollo a V, sparato
      if (r === 1) return qual(y => y > 1.36) ? 2 : qual(y => y > .9 && y < 1.0) ? 1 : 0;
      if (r === 2) return qual(y => (y > 1.22 && y < 1.33) || (y > .86 && y < 1.0)) ? 1 : 0;
      if (r === 3) return st.guanti && qual(y => y > .9 && y < 1.0) ? 1 : 0;
      if (r === 4) return qual(y => y < .2 || Math.abs(y - st.orlo) < .05) ? 1 : 0;
      if (r === 6) return st.lunghe && qual(y => y > 1.42 && y < 1.5) ? 1 : 0;
      if (r === 9) return qual(y => y < 1.3) ? 1 : 0;
      if (r === 8 || r === 11) return 1;
      return 0; };
    T.forEach(t => { t[3] = segna(t); });
    for (let liv = 1; liv <= (PG ? 3 : 2); liv++) {
      const taglia = new Set(), K = (a, b) => a < b ? a * 1048576 + b : b * 1048576 + a, mid = new Map();
      for (const t of T) if (t[3] >= liv) { taglia.add(K(t[0], t[1])); taglia.add(K(t[1], t[2])); taglia.add(K(t[2], t[0])); }
      if (!taglia.size) break;
      const m = (a, b) => { const k = K(a, b); if (mid.has(k)) return mid.get(k); const A = V[a], B = V[b], w = new Map();
        for (const [o, x] of A.w) w.set(o, (w.get(o) || 0) + x / 2); for (const [o, x] of B.w) w.set(o, (w.get(o) || 0) + x / 2);
        const nm = [A.n[0] + B.n[0], A.n[1] + B.n[1], A.n[2] + B.n[2]], nl = Math.hypot(...nm) || 1;
        V.push({ p: [(A.p[0] + B.p[0]) / 2, (A.p[1] + B.p[1]) / 2, (A.p[2] + B.p[2]) / 2], reg: A.reg, ao: (A.ao + B.ao) / 2, w, n: nm.map(x => x / nl) }); mid.set(k, V.length - 1); return V.length - 1; };
      const nT2 = [];
      for (const [a, b, c, g] of T) { const s0 = taglia.has(K(a, b)), s1 = taglia.has(K(b, c)), s2 = taglia.has(K(c, a)), n = s0 + s1 + s2;
        if (!n) { nT2.push([a, b, c, g]); continue; }
        if (n === 3) { const x = m(a, b), y = m(b, c), z = m(c, a); nT2.push([a, x, z, g], [x, b, y, g], [z, y, c, g], [x, y, z, g]); continue; }
        if (n === 1) { if (s0) { const x = m(a, b); nT2.push([a, x, c, 0], [x, b, c, 0]); } else if (s1) { const y = m(b, c); nT2.push([a, b, y, 0], [a, y, c, 0]); } else { const z = m(c, a); nT2.push([a, b, z, 0], [z, b, c, 0]); } continue; }
        if (!s2) { const x = m(a, b), y = m(b, c); nT2.push([x, b, y, 0], [a, x, y, 0], [a, y, c, 0]); }
        else if (!s0) { const y = m(b, c), z = m(c, a); nT2.push([y, c, z, 0], [a, b, y, 0], [a, y, z, 0]); }
        else { const x = m(a, b), z = m(c, a); nT2.push([a, x, z, 0], [x, b, c, 0], [x, c, z, 0]); } }
      T = nT2; }
    const n = V.length, N = n + nT, pos = new Float32Array(N * 3), cl = new Float32Array(N * 3), rug = new Float32Array(N), pel = new Float32Array(N), bi = new Uint8Array(N * 4), bw = new Float32Array(N * 4);
    const cls = new Uint8Array(N), mk = new Float32Array(N * 3);   // classe del vertice e maschere della testa, per blender/persone.py
    // colore dalla posizione di riposo (restC); forma da rest, che per i personaggi è «gonfiata» lungo la normale (giacca, camicetta ampia)
    const scrivi = (j, rest, reg, ao, restC = rest) => { const q = corporatura(sagoma(rest, reg), reg, st.cg, st.donna ? 1 : 0, st.orlo); pos.set(q, j * 3); const r = colore(restC, reg, ao, S); cl.set(r.c, j * 3); rug[j] = r.rug; pel[j] = r.pelle;
      cls[j] = classe(restC, reg, S); mk.set(maschere(restC, reg, S), j * 3); };
    const gonfia = v => { const vo = PG && PG.volume; if (!vo) return v.p; const y = v.p[1]; let o = 0;
      if (v.reg === 1 && vo.busto) o = (vo.busto[0] + (vo.busto[1] - vo.busto[0]) * ss(1.35, .95, y)) * ss(.935, .958, y);
      else if (v.reg === 2 && vo.braccio) o = vo.braccio * ss(.893, .907, y);
      return o ? [v.p[0] + v.n[0] * o, v.p[1] + v.n[1] * o, v.p[2] + v.n[2] * o] : v.p; };
    V.forEach((v, j) => { if (PG) scrivi(j, gonfia(v), v.reg, v.ao, v.p); else scrivi(j, v.p, v.reg, v.ao); const w = [...v.w].sort((x, y) => y[1] - x[1]).slice(0, 4), s = w.reduce((q, e) => q + e[1], 0) || 1;
      w.forEach(([o, x], a) => { bi[j * 4 + a] = o; bw[j * 4 + a] = x / s; }); });
    for (let k = 0; k < nT; k++) { const j = n + k, rest = [tP[k * 3], tP[k * 3 + 1], tP[k * 3 + 2]]; scrivi(j, rest, 5, tAO[k]);
      const w = .45 * ss(1.56, 1.5, rest[1]) * ss(0, -.05, rest[2] - .012 + .02); bi[j * 4] = bT; bw[j * 4] = 1 - w; bi[j * 4 + 1] = bC; bw[j * 4 + 1] = w; }
    const ix = []; for (const [a, b, c] of T) ix.push(a, b, c);
    for (const k of tI) ix.push(n + k);
    // geometria in coda (stesso formato: posizione, colore, rugosità, pelle, 4 ossa e pesi, classe): occhi per tutti,
    // e per i personaggi baveri, colletti, occhiali, collana… (extraPersonaggio). I capelli veri sono curve in blender/persone.py.
    const E = occhi(S);
    if (PG) {
      const regV = new Int8Array(N); V.forEach((v, j) => { regV[j] = v.reg; }); regV.fill(5, n);
      const tri = T.map(([a, b, c]) => [a, b, c]); for (let k = 0; k < tI.length; k += 3) tri.push([n + tI[k], n + tI[k + 1], n + tI[k + 2]]);
      const pesi = j => { const o = []; for (let a = 0; a < 4; a++) if (bw[j * 4 + a] > 0) o.push([bi[j * 4 + a], bw[j * 4 + a]]); return o; };
      const aoTesta = p => { let b = 1e9, ao = 1; for (let k = 0; k < nT; k++) { const d = (tP[k * 3] - p[0]) ** 2 + (tP[k * 3 + 1] - p[1]) ** 2 + (tP[k * 3 + 2] - p[2]) ** 2; if (d < b) { b = d; ao = tAO[k]; } } return ao; };
      const E2 = extraPersonaggio(st, PG, S, { pos, reg: regV, tri, pesi, aoTesta }), o = E.p.length;
      for (const key of ['p', 'c', 'r', 'w', 'k']) E[key].push(...E2[key]); for (const k of E2.i) E.i.push(o + k);
    }
    const NE = E.p.length, N2 = N + NE, base = N;
    const grow = (a, k, T_) => { const b = new T_(N2 * k); b.set(a); return b; };
    const pos2 = grow(pos, 3, Float32Array), cl2 = grow(cl, 3, Float32Array), rug2 = grow(rug, 1, Float32Array), pel2 = grow(pel, 1, Float32Array), bi2 = grow(bi, 4, Uint8Array), bw2 = grow(bw, 4, Float32Array), cls2 = grow(cls, 1, Uint8Array), mk2 = grow(mk, 3, Float32Array);
    E.p.forEach((p, k) => { const j = base + k; pos2.set(p, j * 3); cl2.set(E.c[k], j * 3); rug2[j] = E.r[k]; cls2[j] = E.k[k];
      const w = E.w[k].filter(e => e[1] > 1e-4).sort((x, y) => y[1] - x[1]).slice(0, 4), s = w.reduce((q, e) => q + e[1], 0) || 1; w.forEach(([o, x], a) => { bi2[j * 4 + a] = o; bw2[j * 4 + a] = x / s; }); });
    for (const k of E.i) ix.push(base + k);
    const I = Uint32Array.from(ix);
    parti.push({ nv: N2, nt: I.length / 3, extra: NE });
    uscite.push([pos2, I, cl2, rug2, pel2, bi2, bw2, cls2, mk2].map(b64));
  });
  return { parti, uscite, nvOrig: NV };
};

// ---------------------------------------------------------------------------------------------------------------------------
// Abbinamento con l'esportazione statica (stessa firma, stesso ordine di visita)
// ---------------------------------------------------------------------------------------------------------------------------
function fnvBuf(buf, h = 2166136261) { for (let i = 0; i < buf.length; i++) { h ^= buf[i]; h = Math.imul(h, 16777619) >>> 0; } return h; }
function firmeStatiche(D) {
  const perSig = new Map(), imVisti = new Map();   // sig → [id (mesh) | uuid (InstancedMesh)]
  for (const me of D.mesh) { if (!me.din) continue; const inst = /_\d+$/.test(me.id), uuid = inst ? me.id.replace(/_\d+$/, '') : me.id;
    if (inst && imVisti.has(uuid)) continue;
    const pos = Buffer.from(me.pos, 'base64'), idx = me.idx ? Buffer.from(me.idx, 'base64') : null;
    const ms = me.gruppi.map(([s, c, mid]) => s + ',' + c + ',' + D.mats[mid].nome + ':' + D.mats[mid].tipo + ':' + D.mats[mid].colore.map(v => Math.round(v * 1000)).join('/')).join(';');
    const sig = (inst ? 'I|' : 'M|') + fnvBuf(pos) + '.' + (idx ? fnvBuf(idx) : 0) + '.' + pos.length / 4 + '|' + ms;
    if (inst) imVisti.set(uuid, sig); if (!perSig.has(sig)) perSig.set(sig, []); perSig.get(sig).push({ uuid, n: 1 }); }
  // istanze per InstancedMesh nell'esportazione statica (quelle allora contate)
  const nIst = new Map(); for (const me of D.mesh) if (me.din && /_\d+$/.test(me.id)) { const u = me.id.replace(/_\d+$/, ''); nIst.set(u, (nIst.get(u) || 0) + 1); }
  for (const l of perSig.values()) for (const e of l) if (nIst.has(e.uuid)) e.n = nIst.get(e.uuid);
  const ids = new Set(D.mesh.filter(m => m.din).map(m => m.id));
  return { perSig, ids };
}

// ---------------------------------------------------------------------------------------------------------------------------
async function apri() {
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForFunction(() => window.__rf && window.__video, null, { timeout: 90000 });
  return { b, p, errs };
}

async function esporta() {
  const OUT = path.resolve(ARGS[0] || path.join(ROOT, 'blender/anim')), SEC = +(ARGS[1] || 50), FPS = +(ARGS[2] || 30), NF = Math.round(SEC * FPS) + 1;
  fs.mkdirSync(OUT, { recursive: true }); const t0 = Date.now();
  const { b, p, errs } = await apri();
  const prep = await prepara(p);
  // personaggi del direttivo (blender/personaggi.json): creati in coda, prima della geometria e del campionamento
  const FPG = path.join(ROOT, 'blender/personaggi.json'), CPG = fs.existsSync(FPG) ? JSON.parse(fs.readFileSync(FPG, 'utf8')) : null;
  const pg = CPG ? await p.evaluate(AGGIUNGI, { PG: CPG.personaggi, TAVOLO: CPG.tavolo }) : [];
  if (pg.length) console.log('personaggi', pg.map(q => `${q.nome} (persona ${q.indice}, h ${q.h.toFixed(3)})`).join(' · '));
  const TOL = { loc: 2e-4, rot: 3e-4, scala: 1e-4, osso: 1e-3 };
  const geo = await p.evaluate(GEOPERSONE, { OSSA, TESTA: [80, 52] });
  const R = await p.evaluate(CAMPIONA, { NF, DT: 1 / FPS, OSSA, TOL });
  // abbinamento
  const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'blender/scena/scena.json'), 'utf8')), { perSig, ids } = firmeStatiche(D);
  // per ogni firma: le mesh della pagina in ordine di visita, abbinate in ordine a quelle statiche. Una InstancedMesh statica si
  // abbina solo a una con almeno tante istanze (una InstancedMesh nascosta all'esportazione manca: si salta, non si sfasa la fila)
  const mie = new Map(), uuidMap = new Map(), pezzi = [], extra = [], copia = new Map(); let abbinati = 0, nuovi = 0, saltati = 0;
  for (const z of R.pezzi) { if (!mie.has(z.sig)) mie.set(z.sig, []); const l = mie.get(z.sig); if (!l.length || l[l.length - 1].uuid !== z.uuid) l.push({ uuid: z.uuid, cap: z.cap }); }
  for (const [sig, l] of mie) { const st = perSig.get(sig) || []; let j = 0;
    for (const s of st) { while (j < l.length && l[j].cap < s.n) j++; if (j >= l.length) break; uuidMap.set(l[j].uuid, s.uuid); j++; } }
  for (const [c, z] of R.pezzi.entries()) {
    const base = uuidMap.get(z.uuid) ?? null;
    let id = base ? (z.k >= 0 ? base + '_' + z.k : base) : null; if (id && !ids.has(id)) id = null;
    const voce = { id, k: z.k, rep: z.rep, fermo: z.fermo, maiVisto: z.maiVisto, canali: z.canali, c0: c };
    if (id) { abbinati++; voce.id = id; if (!copia.has(z.sig)) copia.set(z.sig, id); }
    else if (z.maiVisto) { saltati++; continue; }
    else { nuovi++; voce.id = 'anim_' + z.uuid + (z.k >= 0 ? '_' + z.k : ''); voce.nuovo = true; voce.sig = z.sig; voce.c = c; }
    pezzi.push(voce);
  }
  // pezzi nuovi: copia di un oggetto statico con la stessa geometria (stessi materiali), altrimenti geometria propria
  for (const v of pezzi.filter(v => v.nuovo)) { const da = copia.get(v.sig); if (da) v.copiaDi = da; else { v.geo = extra.length; extra.push(await p.evaluate(c => window.__geoPezzo(c), v.c)); } delete v.c; delete v.sig; }
  // ordine dei canali e dati binari
  const keys = Buffer.from(R.keys, 'base64');
  fs.writeFileSync(path.join(OUT, 'canali.bin'), keys);
  // persone: un solo file binario con gli spostamenti
  const blocchi = [], parti = []; let off = 0; const nomi = ['pos', 'idx', 'col', 'rug', 'pelle', 'ossa', 'pesi', 'cls', 'maschere'];
  geo.uscite.forEach((u, i) => { const d = {}; u.forEach((s, k) => { const buf = Buffer.from(s, 'base64'); d[nomi[k]] = [off, buf.length]; blocchi.push(buf); off += buf.length; }); parti.push(d); });
  fs.writeFileSync(path.join(OUT, 'persone.bin'), Buffer.concat(blocchi));
  const persone = R.persone.map((q, i) => ({ ...q, nome: `Persona_${String(q.rep).padStart(2, '0')}_${q.pg || String(i).padStart(2, '0')}`, geo: parti[i], nv: geo.parti[i].nv }));
  fs.writeFileSync(path.join(OUT, 'extra.json'), JSON.stringify(extra));
  const indice = { creato: new Date().toISOString(), fps: FPS, fotogrammi: NF, primo: 1, secondi: SEC, ossa: OSSA, tolleranze: TOL, chiavi: R.nk,
    controlli: { tempoUltimo: R.tMax, erroreFK: R.erroreFK, erroreTaglio: R.erroreTaglio, preparazione: prep },
    pezzi, persone };
  fs.writeFileSync(path.join(OUT, 'indice.json'), JSON.stringify(indice, (k, v) => k === 'c0' ? undefined : v));
  // verifica: pezzi per id (solo quelli abbinati o creati), persone per indice
  const idDi = new Map(); pezzi.forEach(v => { if (v.c0 !== undefined) idDi.set(v.c0, v.id); });
  fs.writeFileSync(path.join(OUT, 'verifica.json'), JSON.stringify({ fotogrammi: R.VER.fotogrammi, persone: R.VER.persone, saltoOssa: R.VER.saltoOssa,
    pezzi: R.VER.pezzi.map(l => Object.fromEntries([...idDi].map(([c, id]) => [id, l[c]]))) }));
  const animati = pezzi.filter(v => !v.fermo).length;
  console.log(`candidati ${R.NC} · abbinati ${abbinati} · nuovi ${nuovi} (copie ${pezzi.filter(v => v.copiaDi).length}, geometrie ${extra.length}) · mai visibili ${saltati}`);
  console.log(`pezzi che si muovono o cambiano visibilità ${animati} · persone ${persone.length} (vertici ${geo.parti.map(q => q.nv).reduce((a, b) => a + b, 0)})`);
  console.log(`chiavi ${R.nk} · ultimo tempo ${R.tMax.toFixed(4)} s · errore FK ${R.erroreFK.toExponential(2)} · errore TRS ${R.erroreTaglio.toExponential(2)} · campionamento ${R.tempo.toFixed(1)} s · totale ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  for (const f of ['indice.json', 'canali.bin', 'persone.bin', 'extra.json', 'verifica.json']) console.log(f, (fs.statSync(path.join(OUT, f)).size / 1e6).toFixed(2), 'MB');
  console.log(prep, errs.length ? 'ERRORI ' + errs.join(' | ') : 'nessun errore');
  await b.close();
}

// Foto di controllo: viste.json = [{ nome, t, bersaglio: [x,y,z], camera: [x,y,z], fov }] in coordinate three. Una vista per tempo
// (le persone hanno uno stato: non si ridisegna due volte lo stesso istante). Stesse condizioni del campionamento.
async function foto() {
  const OUT = path.resolve(ARGS[1]), VISTE = JSON.parse(fs.readFileSync(path.resolve(ARGS[2]), 'utf8')), FPS = 30;
  fs.mkdirSync(OUT, { recursive: true });
  const { b, p, errs } = await apri(); await prepara(p);
  await p.addStyleTag({ content: 'body * { visibility: hidden !important } #scene { visibility: visible !important }' });
  const ord = VISTE.map(v => ({ ...v, f: Math.round(v.t * FPS) })).sort((a, b) => a.f - b.f);
  let f = -1;
  for (const v of ord) {
    if (v.f <= f) throw new Error('una vista per fotogramma: ' + v.nome);
    await p.evaluate(([da, a, DT]) => { for (let k = da; k < a; k++) window.__video.step(k ? DT : 0); }, [f + 1, v.f, 1 / FPS]);
    await p.evaluate(([v, DT]) => { const { camera } = window.__rf; window.__rf.guarda(v.bersaglio, v.camera); camera.fov = v.fov || 38; camera.clearViewOffset(); camera.updateProjectionMatrix();
      const post = window.__rf.post(); post.composer.render = window.__disegna; window.__video.step(v.f ? DT : 0); post.composer.render = () => {}; }, [v, 1 / FPS]);
    await p.screenshot({ path: path.join(OUT, v.nome + '-pagina.png') }); f = v.f; console.log('foto', v.nome, 't', (v.f / FPS).toFixed(3));
  }
  console.log(errs.length ? 'ERRORI ' + errs.join(' | ') : 'nessun errore'); await b.close();
}

(FOTO ? foto() : esporta()).catch(e => { console.error(e); process.exit(1); });
