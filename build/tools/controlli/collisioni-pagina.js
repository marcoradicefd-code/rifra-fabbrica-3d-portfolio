// Controllo delle collisioni · parte che gira DENTRO la pagina (iniettata da collisioni.js con addInitScript).
// Strumento di sviluppo: non modifica i sorgenti e non aggiunge niente al ciclo per fotogramma della pagina vera.
// collisioni.js riscrive al volo, solo nel browser di prova, due righe di prim.js e di main.js per:
//  1. annotare ogni mesh PRIMA che fondiStatici / fondiAnimati la fondano (le forme restano quelle vere, pezzo per pezzo:
//     scatole, cilindri, sfere, tubi, non il riquadro enorme della geometria fusa);
//  2. ricevere REP, ARR, ED e fissare il tempo dell'animazione (window.__coll.T): la scena resta ferma sull'istante scelto.
// Unità: metri, x = est, y = alto, z = sud.
(() => {
  'use strict';
  const C = window.__coll = { statici: [], ferme: [], hook: { fondiStatici: 0, fondiAnimati: 0, main: 0 }, T: undefined };
  const antenati = o => { const a = []; for (let q = o.parent; q; q = q.parent) a.push(q); return a; };
  const animSopra = o => { for (let q = o.parent; q; q = q.parent) if (q.userData && q.userData.anim) return q; return null; };
  // annotazione di una mesh: geometria, matrice nel mondo e, se sta dentro un gruppo animato, la matrice relativa all'«ancora»
  // (il genitore che resta nella scena e si muove): nel campionamento mondo = ancora.matrixWorld × rel
  function annota(o, ancora) {
    o.updateWorldMatrix(true, false);
    const r = { o, uuid: o.uuid, geo: o.geometry, mat: Array.isArray(o.material) ? o.material[0] : o.material, ancora, antenati: antenati(o), mw: o.matrixWorld.clone(), rel: null };
    if (ancora) { ancora.updateWorldMatrix(true, false); r.rel = ancora.matrixWorld.clone().invert().multiply(o.matrixWorld); }
    return r;
  }
  // chiamata dal wrapper di fondiStatici(root): stesse regole di selezione di prim.js
  C.primaDiFondere = root => {
    C.hook.fondiStatici++; root.updateWorldMatrix(true, true);
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || !o.userData.statico || o.userData.anim || !o.visible || !o.parent) return;
      for (let q = o.parent; q && q !== root; q = q.parent) if (q.userData.anim) return;
      C.statici.push(annota(o, animSopra(o)));
    });
  };
  // chiamata dal wrapper di fondiAnimati: le mesh ferme rispetto al genitore (telai, basamenti dei pezzi mobili)
  C.primaDiFondereAnimati = ferme => { C.hook.fondiAnimati++; for (const o of ferme) if (o.parent) C.ferme.push(annota(o, o.parent)); };
  // chiamata da main.js subito dopo costruisciArredi: aggancio a reparti e arredi; il tempo si può fissare con C.T
  C.aggancia = ({ scene, REP, ARR, ED, M }) => {
    C.hook.main++; Object.assign(C, { scene, REP, ARR, ED, M }); C.U = REP.update.slice(); C.AU = ARR.update;
    // con il tempo fissato (C.T definito) il ciclo di main.js non chiama più gli update: li chiama solo C.vai, in ordine di tempo,
    // perché persone.js misura velocità e fase del passo dalla differenza fra due chiamate successive (dt ≤ 0,35 s)
    REP.update = C.U.map(u => t => { if (C.T === undefined) u(t); }); ARR.update = t => { if (C.T === undefined) C.AU(t); };
  };
  // porta l'animazione all'istante t (con un rodaggio di 1,5 s a passi di 0,05 s se si salta indietro o lontano)
  C.vai = (t, rodaggio = true) => {
    const prima = C.T; C.T = t;
    if (rodaggio && (prima === undefined || t < prima || t - prima > .35)) for (let u = t - 1.5; u < t - 1e-6; u += .05) { C.U.forEach(f => f(u)); C.AU(u); }
    C.U.forEach(f => f(t)); C.AU(t); C.scene.updateMatrixWorld(true);
  };

  // ---------- forme delle geometrie (nello spazio locale della geometria) ----------
  const FORME = new Map();
  function forma(geo) {
    let s = FORME.get(geo.uuid); if (s) return s;
    if (!geo.boundingBox) geo.computeBoundingBox(); const b = geo.boundingBox, P = geo.parameters || {}, t = geo.type || '';
    s = { min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z], tipo: 'box', approx: false };
    if (t === 'CylinderGeometry' || t === 'ConeGeometry') {
      s.tipo = 'cil'; s.cx = (b.min.x + b.max.x) / 2; s.cz = (b.min.z + b.max.z) / 2;
      s.rt = P.radiusTop ?? 0; s.rb = P.radiusBottom ?? P.radius ?? 1; if (P.openEnded) s.approx = true;
    } else if (/Sphere|Icosahedron|Octahedron|Dodecahedron/.test(t)) s.tipo = 'ell';
    else if (t === 'TubeGeometry' && P.path) {
      s.tipo = 'tubo'; s.r = P.radius; s.pts = P.path.getSpacedPoints(Math.max(8, P.tubularSegments || 32)).map(v => [v.x, v.y, v.z]);
    } else if (!/Box/.test(t)) s.approx = true;                          // estrusi, piani, geometrie già fuse: riquadro orientato
    FORME.set(geo.uuid, s); return s;
  }
  // penetrazione (m, nel mondo) del punto locale l dentro la forma s; sc = scala del mondo per asse. 0 = fuori
  function dentro(s, l, sc) {
    const [x, y, z] = l, mn = s.min, mx = s.max;
    if (s.tipo === 'box') {
      const dx = Math.min(x - mn[0], mx[0] - x), dy = Math.min(y - mn[1], mx[1] - y), dz = Math.min(z - mn[2], mx[2] - z);
      if (dx <= 0 || dy <= 0 || dz <= 0) return 0; return Math.min(dx * sc[0], dy * sc[1], dz * sc[2]);
    }
    if (s.tipo === 'cil') {
      if (y <= mn[1] || y >= mx[1]) return 0; const h = mx[1] - mn[1] || 1, r = s.rb + (s.rt - s.rb) * (y - mn[1]) / h, rho = Math.hypot(x - s.cx, z - s.cz);
      if (rho >= r) return 0; return Math.min((r - rho) * Math.min(sc[0], sc[2]), (y - mn[1]) * sc[1], (mx[1] - y) * sc[1]);
    }
    if (s.tipo === 'ell') {
      let q = 0, e = Infinity; for (let i = 0; i < 3; i++) { const c = (mn[i] + mx[i]) / 2, h = (mx[i] - mn[i]) / 2 || 1e-6; q += ((l[i] - c) / h) ** 2; e = Math.min(e, h * sc[i]); }
      return q < 1 ? (1 - Math.sqrt(q)) * e : 0;
    }
    if (s.tipo === 'tubo') {
      if (x < mn[0] || x > mx[0] || y < mn[1] || y > mx[1] || z < mn[2] || z > mx[2]) return 0;
      let d = Infinity; const p = s.pts;
      for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1e-9;
        const u = Math.max(0, Math.min(1, ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / L2));
        d = Math.min(d, Math.hypot(x - a[0] - ab[0] * u, y - a[1] - ab[1] * u, z - a[2] - ab[2] * u)); }
      return d < s.r ? (s.r - d) * (sc[0] + sc[1] + sc[2]) / 3 : 0;
    }
    return 0;
  }
  // distanza (m, nel mondo) del punto locale l dalla forma s, se è fuori (0 se dentro): per le capsule dello scheletro
  function fuori(s, l, sc) {
    const [x, y, z] = l, mn = s.min, mx = s.max;
    if (s.tipo === 'cil') { const h = mx[1] - mn[1] || 1, yc = Math.max(mn[1], Math.min(mx[1], y)), r = s.rb + (s.rt - s.rb) * (yc - mn[1]) / h, rho = Math.hypot(x - s.cx, z - s.cz);
      return Math.hypot(Math.max(0, rho - r) * Math.min(sc[0], sc[2]), (y - yc) * sc[1]); }
    if (s.tipo === 'tubo') { let d = Infinity; const p = s.pts; for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1e-9;
        const u = Math.max(0, Math.min(1, ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / L2)); d = Math.min(d, Math.hypot(x - a[0] - ab[0] * u, y - a[1] - ab[1] * u, z - a[2] - ab[2] * u)); }
      return Math.max(0, d - s.r) * (sc[0] + sc[1] + sc[2]) / 3; }
    let q = 0; for (let i = 0; i < 3; i++) { const c = l[i] < mn[i] ? mn[i] - l[i] : l[i] > mx[i] ? l[i] - mx[i] : 0; q += (c * sc[i]) ** 2; } return Math.sqrt(q);   // scatola (e riquadro degli altri)
  }
  // capsule dello scheletro di persone.js (userData.stato.Pp, 23 ossa, spazio persona): raggi INSCRITTI (più piccoli del corpo vero),
  // per trovare i pezzi sottili (barre, pannelli, bordi) che tagliano il corpo senza entrare molto in un singolo pezzo.
  // [osso A, osso B, raggio, categoria]; un solo osso = sfera con spostamento in alto (testa)
  const CAPS = [[0, 2, .1, 0], [2, 3, .08, 0], [4, -1, .085, 0], [6, 7, .04, 1], [11, 12, .04, 1], [7, 8, .035, 2], [12, 13, .035, 2],
    [15, 16, .065, 0], [19, 20, .065, 0], [16, 17, .05, 0], [20, 21, .05, 0], [17, 18, .035, 0], [21, 22, .035, 0]];
  function capsulePersona(p) {
    const st = p.P.userData.stato; if (!st || !st.Pp || st.Pp.length !== 23) return null;
    const e = p.P.matrixWorld.elements, h = st.h || 1, out = [], o = [0, 0, 0], w = i => { const v = st.Pp[i]; return app(e, v.x * h, v.y * h, v.z * h, [0, 0, 0]); };
    for (const [a, b, r, c] of CAPS) { const A = w(a); if (b < 0) { out.push(A[0], A[1] + .08 * h, A[2], r, c); continue; } const B = w(b);
      for (let k = 0; k <= 4; k++) { const u = k / 4; out.push(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u, r * h, c); } }
    return out;
  }
  // matrici: elementi colonna per colonna (three.js)
  const app = (e, x, y, z, o) => { o[0] = e[0] * x + e[4] * y + e[8] * z + e[12]; o[1] = e[1] * x + e[5] * y + e[9] * z + e[13]; o[2] = e[2] * x + e[6] * y + e[10] * z + e[14]; return o; };
  const scala = e => [Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10])];
  function aabb(s, e) {
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], o = [0, 0, 0];
    for (let i = 0; i < 8; i++) { app(e, i & 1 ? s.max[0] : s.min[0], i & 2 ? s.max[1] : s.min[1], i & 4 ? s.max[2] : s.min[2], o);
      for (let k = 0; k < 3; k++) { if (o[k] < b[k]) b[k] = o[k]; if (o[k] > b[k + 3]) b[k + 3] = o[k]; } }
    return b;
  }
  const incrocia = (a, b, m = 0) => a[0] - m < b[3] && b[0] - m < a[3] && a[1] - m < b[4] && b[1] - m < a[4] && a[2] - m < b[5] && b[2] - m < a[5];
  // punti di campionamento di una geometria (al massimo n, distinti)
  const PUNTI = new Map();
  function puntiGeo(geo, n = 48) {
    const k = geo.uuid + '|' + n; let r = PUNTI.get(k); if (r) return r;
    const pos = geo.attributes.position, seen = new Set(), out = []; const passo = Math.max(1, Math.floor(pos.count / (n * 2)));
    for (let i = 0; i < pos.count && out.length < n * 3; i += passo) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), h = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (seen.has(h)) continue; seen.add(h); out.push(x, y, z); }
    r = new Float32Array(out); PUNTI.set(k, r); return r;
  }
  // griglia 4 × 4 × 4 dentro il riquadro di una geometria (punti del telaio dei mezzi)
  function grigliaGeo(s) { const o = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++)
    o.push(s.min[0] + (s.max[0] - s.min[0]) * (i + .5) / 4, s.min[1] + (s.max[1] - s.min[1]) * (j + .5) / 4, s.min[2] + (s.max[2] - s.min[2]) * (k + .5) / 4); return new Float32Array(o); }

  // ---------- preparazione: ostacoli, veicoli, persone ----------
  C.prepara = (opz = {}) => {
    const { scene, ARR } = C; if (!scene) throw new Error('aggancio a main.js mancante');
    const M4 = scene.matrixWorld.constructor;
    C.T = 0; C.U.forEach(u => u(0)); C.AU(0); scene.updateMatrixWorld(true);
    const inScena = o => { for (let q = o; q; q = q.parent) if (q === scene) return true; return false; };
    // veicoli: muletto e carrello dei corridoi (arredi.js, ombre mobili) e muletti delle tappe (userData.parti.forche)
    const veicoli = new Set(((ARR.ombre && ARR.ombre.mobili) || []).map(m => m[0]));
    scene.traverse(o => { if (o.userData && o.userData.parti && o.userData.parti.forche) veicoli.add(o); });
    const nomeVeicolo = v => v.userData.parti && v.userData.parti.forche ? 'muletto della tappa' : (ARR.ombre.mobili.findIndex(m => m[0] === v) === 1 ? 'carrello spinto' : 'muletto del magazzino');
    // sottogruppi dei veicoli che si muovono rispetto al veicolo (forche, carico): esclusi dal «telaio»
    const mobiliV = new Set(); { const st = new Map(); const snap = () => veicoli.forEach(v => v.traverse(g => { if (g === v || g.isMesh) return; const k = g.position.toArray().concat(g.rotation.toArray().slice(0, 3)).map(x => x.toFixed(4)).join(); if (st.has(g) && st.get(g) !== k) mobiliV.add(g); st.set(g, k); }));
      for (const t of [0, 2, 3.5, 10, 12, 17, 25, 30]) { C.U.forEach(u => u(t)); C.AU(t); snap(); } C.vai(0); }
    const tetto = C.ED && C.ED.tetto;
    // ostacoli: annotati prima della fusione + mesh vive (pezzi che si muovono)
    const ost = [], visti = new Set();
    for (const r of [...C.statici, ...C.ferme]) { if (visti.has(r.uuid) || (r.o.parent && inScena(r.o))) continue; visti.add(r.uuid); ost.push({ ...r, vivo: false }); }
    scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.userData.fuso || o.userData.persone || visti.has(o.uuid) || !o.geometry || !o.geometry.attributes.position) return;
      visti.add(o.uuid); ost.push({ o, uuid: o.uuid, geo: o.geometry, mat: Array.isArray(o.material) ? o.material[0] : o.material, ancora: null, antenati: antenati(o), vivo: true }); });
    const contenitore = p => p === scene || (p.parent === scene && !p.userData.anim && !veicoli.has(p)) || (p.userData && (p.userData.reparto !== undefined || p.userData.macchineStatiche)) || (p.parent && p.parent.userData.reparto !== undefined);
    const tenuti = [];
    for (const b of ost) {
      const m = b.mat || {}; if (m.transparent && (m.opacity ?? 1) < .5) continue;          // nebbia di vernice e simili: non solidi
      b.s = forma(b.geo); b.dinamico = b.vivo || !!b.ancora;
      b.veicolo = [b.o, ...b.antenati].find(a => veicoli.has(a)) || null;
      const rep = b.antenati.find(a => a.userData && a.userData.reparto !== undefined); b.reparto = rep ? rep.userData.reparto : -1;
      const catena = [b.o, ...b.antenati]; let ass = b.o; for (let i = 0; i < catena.length - 1; i++) if (contenitore(catena[i + 1])) { ass = catena[i]; break; }
      b.assieme = b.veicolo || ass;
      b.telaio = b.veicolo ? !b.antenati.some(a => mobiliV.has(a)) : false;
      b.persona = b.antenati.some(a => typeof a.posa === 'function' || (a.userData && a.userData.persona));
      if (b.persona || (tetto && b.antenati.includes(tetto))) continue;                         // mesh delle persone; tetto (si alza e sparisce)
      if (!b.dinamico) { b.e = b.mw.elements; b.inv = b.mw.clone().invert().elements; b.sc = scala(b.e); b.bb = aabb(b.s, b.e);
        const h = b.bb[4] - b.bb[1]; if ((h < .06 && b.bb[4] < .1) || b.s.tipo === 'cil' && b.s.approx) continue;   // segni a terra, volte
        const L = Math.max(b.bb[3] - b.bb[0], b.bb[5] - b.bb[2]), l = Math.min(b.bb[3] - b.bb[0], b.bb[5] - b.bb[2]);
        b.cat = h > 2.8 && l < .4 && L > 1.4 ? 'muro' : 'macchina';
      } else { b.mw4 = new M4(); b.cat = b.veicolo ? 'veicolo' : 'pezzo'; }
      if (b.s.approx && b.s.tipo === 'box') { const L = Math.max(...[0, 1, 2].map(i => b.s.max[i] - b.s.min[i])); if (L > 4) { (C.grossi = C.grossi || []).push(b); continue; } }
      tenuti.push(b);
    }
    C.ost = tenuti; C.veicoli = [...veicoli];
    // griglia 2D (celle da 1 m) degli ostacoli fermi
    const G = new Map(); C.griglia = G;
    tenuti.forEach((b, i) => { if (b.dinamico) return; const bb = b.bb; if (bb[3] - bb[0] > 120 || bb[5] - bb[2] > 120) return;
      for (let x = Math.floor(bb[0]); x <= Math.floor(bb[3]); x++) for (let z = Math.floor(bb[2]); z <= Math.floor(bb[5]); z++) { const k = x * 1000 + z; if (!G.has(k)) G.set(k, []); G.get(k).push(i); } });
    // assiemi: riquadro complessivo a t = 0 e nome (macchina del rilievo che lo contiene, altrimenti descrizione)
    const LAY = window.__collLayout || []; const ass = new Map();
    tenuti.forEach(b => { aggiornaOst(b); let a = ass.get(b.assieme); if (!a) ass.set(b.assieme, a = { bb: b.bb.slice(), n: 0, cat: b.cat, reparto: b.reparto, veicolo: b.veicolo });
      for (let k = 0; k < 3; k++) { a.bb[k] = Math.min(a.bb[k], b.bb[k]); a.bb[k + 3] = Math.max(a.bb[k + 3], b.bb[k + 3]); } a.n++; if (b.cat === 'muro') a.cat = 'muro'; });
    let na = 0;
    for (const [o, a] of ass) { a.id = 'A' + (na++); const cx = (a.bb[0] + a.bb[3]) / 2, cz = (a.bb[2] + a.bb[5]) / 2, dim = [a.bb[3] - a.bb[0], a.bb[4] - a.bb[1], a.bb[5] - a.bb[2]].map(v => v.toFixed(2).replace('.', ',')).join(' × ');
      const lay = LAY.filter(m => cx > m.x0 - .3 && cx < m.x1 + .3 && cz > m.z0 - .3 && cz < m.z1 + .3).sort((p, q) => (p.x1 - p.x0) * (p.z1 - p.z0) - (q.x1 - q.x0) * (q.z1 - q.z0))[0];
      const vicina = LAY.map(m => [m, Math.hypot(cx - (m.x0 + m.x1) / 2, cz - (m.z0 + m.z1) / 2)]).sort((p, q) => p[1] - q[1])[0];
      a.centro = [cx, (a.bb[1] + a.bb[4]) / 2, cz];
      a.nome = a.veicolo ? nomeVeicolo(a.veicolo) : a.cat === 'muro' ? `muro/parete ${dim} m a (${cx.toFixed(1)}; ${cz.toFixed(1)})`
        : (lay && a.n > 3 ? `${lay.id} ${lay.nome}` : `${o.isMesh ? 'oggetto' : 'gruppo'} ${dim} m a (${cx.toFixed(1)}; ${cz.toFixed(1)})` + (vicina && vicina[1] < 6 ? ` presso ${vicina[0].id}` : ''))
          + (a.cat === 'pezzo' ? ' [pezzo mobile]' : '');
      a.oggetto = o; }
    C.assiemi = ass;
    // persone: radici con posa() o userData.persona, o radici dei segnaposto istanziati (prim.js)
    let imP = null; scene.traverse(o => { if (o.isInstancedMesh && o.userData.persone && o.geometry.attributes.aSI && o.geometry.attributes.aSW) imP = o; });
    const corpo = imP ? corpoGPU(imP.geometry) : null; C.corpo = corpo;
    const radici = new Set(); scene.traverse(o => { if (typeof o.posa === 'function' || (o.userData && o.userData.persona)) radici.add(o); const pa = o.userData && o.userData.parte; if (pa && pa.radice) radici.add(pa.radice); });
    const pers = [...radici].map(P => {
      const br = Array.isArray(P.userData.braccia) ? P.userData.braccia : null, disc = (o, g) => { for (let q = o; q; q = q.parent) { if (q === g) return true; if (q === P) return false; } return false; };
      const catDi = o => { if (br) { for (const b of br) { if (b.av && disc(o, b.av)) return 2; if (b.a && disc(o, b.a)) return 1; } return 0; }
        for (let q = o; q && q !== P; q = q.parent) { const n = q.name || ''; if (/avambracc|mano|hand|forearm|lowerarm|polso|wrist/i.test(n)) return 2; if (/bracci|arm|spall|shoulder/i.test(n)) return 1; } return -1; };
      const fonti = [], st = P.userData.stato;
      if (corpo && st && st.out && st.out.length >= corpo.nb * 12) fonti.push({ o: P, gpu: true, st, rip: riposoPersona(corpo, st) });
      else P.traverse(o => { if (o === P) return; const pa = o.userData && o.userData.parte;
        if (pa && pa.geo) fonti.push({ o, pts: puntiGeo(pa.geo, 40), cat: catDi(o) });
        else if (o.isMesh && !o.isInstancedMesh && o.geometry) { const f = { o, pts: puntiGeo(o.geometry, 120), cat: catDi(o), skin: !!o.isSkinnedMesh };
          if (f.skin) { const g = o.geometry, pos = g.attributes.position, n = Math.min(400, pos.count), st = Math.max(1, Math.floor(pos.count / n)); f.idx = []; for (let i = 0; i < pos.count; i += st) f.idx.push(i);
            const si = g.attributes.skinIndex, sw = g.attributes.skinWeight; f.vcat = f.idx.map(i => { if (!si) return -1; let best = 0, w = -1; for (let k = 0; k < 4; k++) { const wk = sw.getComponent(i, k); if (wk > w) { w = wk; best = si.getComponent(i, k); } }
              const bn = (o.skeleton && o.skeleton.bones[best] && o.skeleton.bones[best].name) || ''; return /forearm|hand|mano|avambr|lowerarm|polso|wrist|finger|dito/i.test(bn) ? 2 : /arm|bracc|shoulder|spall|clavicle/i.test(bn) ? 1 : 0; }); }
          fonti.push(f); } });
      const veicolo = antenati(P).find(a => veicoli.has(a)) || null, rep = antenati(P).find(a => a.userData && a.userData.reparto !== undefined);
      return { P, fonti, veicolo, reparto: rep ? rep.userData.reparto : -1, x0: 0, z0: 0 };
    });
    // identificativi stabili: tappa + ordine per posizione iniziale
    const wp = new (scene.position.constructor)();
    pers.forEach(p => { p.P.getWorldPosition(wp); p.x0 = wp.x; p.z0 = wp.z; });
    pers.sort((a, b) => a.reparto - b.reparto || a.x0 - b.x0 || a.z0 - b.z0);
    const cont = {}; pers.forEach(p => { const k = p.reparto >= 0 ? 'R' + String(p.reparto + 1).padStart(2, '0') : 'corsia'; cont[k] = (cont[k] || 0) + 1;
      const uff = p.x0 < 10.3 && p.z0 < 11.2 || p.x0 < 5.3;
      p.id = `${p.reparto < 0 && uff ? 'uffici' : k}-p${cont[k]}`; p.desc = p.veicolo ? `conducente del ${nomeVeicolo(p.veicolo)}` : p.reparto >= 0 ? `operatore della tappa ${p.reparto + 1}` : uff ? 'persona negli uffici' : 'persona dei corridoi'; });
    C.pers = pers; C.wp = wp;
    return { ostacoli: tenuti.length, statici: C.statici.length, ferme: C.ferme.length, assiemi: ass.size, persone: pers.length, veicoli: veicoli.size, hook: C.hook,
      corpoGPU: corpo ? corpo.n : 0, grossi: (C.grossi || []).map(b => `${b.geo.type} ${b.s.max.map((v, i) => (v - b.s.min[i]).toFixed(1)).join('×')}`), fonti: pers.map(p => p.id + ':' + (p.fonti[0] && p.fonti[0].gpu ? 'gpu' : p.fonti.length)) };
  };
  // corpo di persone.js: geometria di riposo (spazio persona, 1,75 m) con 4 ossa per vertice (aSI, aSW) e regione / parte opzionale (aRO).
  // Si prende un vertice ogni k (≈ 900) e si rifà sulla CPU lo stesso skinning dello shader: [R | t] per osso da userData.stato.out,
  // poi matrixWorld del gruppo × scala h. Categoria dalla regione: 3 mano, 2/9 braccio (sotto il gomito = avambraccio), il resto corpo.
  function corpoGPU(geo) {
    const P = geo.attributes.position, SI = geo.attributes.aSI, SW = geo.attributes.aSW, RO = geo.attributes.aRO, n = P.count, k = Math.max(1, Math.floor(n / 900));
    const idx = []; for (let i = 0; i < n; i += k) idx.push(i);
    const c = { n: idx.length, pos: new Float32Array(idx.length * 3), si: new Uint8Array(idx.length * 4), sw: new Float32Array(idx.length * 4), reg: new Uint8Array(idx.length), opt: new Uint8Array(idx.length), cat: new Uint8Array(idx.length), nb: 0 };
    idx.forEach((i, j) => { c.pos.set([P.getX(i), P.getY(i), P.getZ(i)], j * 3); for (let q = 0; q < 4; q++) { c.si[j * 4 + q] = Math.round(SI.getComponent(i, q)); c.sw[j * 4 + q] = SW.getComponent(i, q); c.nb = Math.max(c.nb, c.si[j * 4 + q] + 1); }
      const reg = RO ? Math.round(RO.getX(i)) : 1; c.reg[j] = reg; c.opt[j] = RO ? Math.round(RO.getY(i)) : 0;
      c.cat[j] = reg === 3 ? 2 : (reg === 2 || reg === 9) ? (P.getY(i) < 1.12 ? 2 : 1) : 0; });
    return c;
  }
  // posa di riposo della singola persona: corporatura (come lo shader) e parti opzionali spente (acconciature, grembiule, occhiali)
  function riposoPersona(c, st) {
    const g = st.cg || 0, fem = st.donna ? 1 : 0, orlo = st.orlo ?? .07, out = new Float32Array(c.n * 3), on = new Uint8Array(c.n);
    let mask = 0; if (st.stile >= 1 && st.stile <= 5) mask |= 1 << (st.stile - 1); if (st.grembiule) mask |= 1 << 5; if (st.occhiali) mask |= 1 << 6;
    const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let j = 0; j < c.n; j++) { let x = c.pos[j * 3], y = c.pos[j * 3 + 1], z = c.pos[j * 3 + 2]; const reg = c.reg[j], bit = c.opt[j];
      on[j] = bit > 0 && !((mask >> (bit - 1)) & 1) ? 0 : 1;
      if (reg === 1 || reg === 11 || reg === 10) { const pancia = g > 0 ? Math.exp(-(((y - 1.06) / .11) ** 2)) : 0; x *= 1 + g * .8; z = z * (1 + g * (z > 0 ? .8 + 2.4 * pancia : .55));
        if (fem) { x *= 1 - .1 * ss(1.26, 1.42, y) + .09 * Math.exp(-(((y - .94) / .08) ** 2)) - .08 * Math.exp(-(((y - 1.1) / .07) ** 2)); if (z > 0) z += .03 * Math.exp(-(((y - 1.3) / .055) ** 2)) * Math.exp(-(((Math.abs(x) - .075) / .05) ** 2)); } }
      else if (reg === 2 || reg === 9 || reg === 3) { const sx = Math.sign(x), ax = sx * (.185 + .02 * Math.max(0, Math.min(1, (1.425 - y) / .56)));
        if (reg !== 3) { const k = 1 + g * .55 - fem * .1; x = ax + (x - ax) * k; z = -.025 + (z + .025) * k; } x += sx * (g * .05 - fem * .016); }
      else if (reg === 4) { const sx = Math.sign(x), ax = sx * .094; let k = 1 + g * .6 * ss(.2, .7, y); if (y < orlo - .02) k *= .8 + .1 * ss(.2, .45, y); x = ax + (x - ax) * k; z = z * k; x += sx * g * .03 * ss(.3, .9, y); }
      else if (reg === 6) { const k = 1 + g * .45 - fem * .1; x *= k; z = -.02 + (z + .02) * k; }
      else if (reg === 8 && fem) { x = Math.sign(x) * .095 + (x - Math.sign(x) * .095) * .88; z = -.015 + (z + .015) * .92; }
      out[j * 3] = x; out[j * 3 + 1] = y; out[j * 3 + 2] = z; }
    return { pos: out, on };
  }
  function aggiornaOst(b) {
    if (!b.dinamico) return true;
    if (b.vivo) b.mw4.copy(b.o.matrixWorld); else b.mw4.multiplyMatrices(b.ancora.matrixWorld, b.rel);
    b.e = b.mw4.elements; b.sc = scala(b.e); b.bb = aabb(b.s, b.e); b.inv = b.mw4.clone().invert().elements;
    // visibilità (si ignora quella dei gruppi figli diretti della scena: main.js li spegne col tetto chiuso)
    let v = true; for (let q = b.vivo ? b.o : b.ancora; q && q.parent; q = q.parent) { if (q.parent === C.scene) break; if (!q.visible) { v = false; break; } }
    b.vis = v; return b.vis;
  }
  const visibile = o => { for (let q = o; q && q.parent; q = q.parent) { if (q.parent === C.scene) break; if (!q.visible) return false; } return true; };
  // punti del corpo nel mondo: [x, y, z, categoria] (0 corpo, 1 braccio, 2 avambraccio e mano)
  const _v = { x: 0, y: 0, z: 0 };
  function puntiPersona(p) {
    const out = [], o3 = [0, 0, 0];
    if (!p.fonti.length) {                                                                       // ripiego: capsula r 0,25 m, h 1,75 m
      const e = p.P.matrixWorld.elements; for (let y = .05; y <= 1.75; y += .2) for (let a = 0; a < 12; a++) { app(e, Math.cos(a * Math.PI / 6) * .25, y, Math.sin(a * Math.PI / 6) * .25, o3); out.push(o3[0], o3[1], o3[2], 0); }
      return out; }
    const V3 = C.scene.position.constructor; const tmp = p._tmp || (p._tmp = new V3());
    let inv = null;
    for (const f of p.fonti) {
      if (f.gpu) { const c = C.corpo, B = f.st.out, R = f.rip, h = f.st.h || 1, e = p.P.matrixWorld.elements, q = [0, 0, 0];
        for (let j = 0; j < c.n; j++) { if (!R.on[j]) continue; const x = R.pos[j * 3], y = R.pos[j * 3 + 1], z = R.pos[j * 3 + 2]; q[0] = q[1] = q[2] = 0;
          for (let s = 0; s < 4; s++) { const w = c.sw[j * 4 + s]; if (w <= 0) continue; const k = c.si[j * 4 + s] * 12;
            q[0] += w * (B[k] * x + B[k + 1] * y + B[k + 2] * z + B[k + 3]); q[1] += w * (B[k + 4] * x + B[k + 5] * y + B[k + 6] * z + B[k + 7]); q[2] += w * (B[k + 8] * x + B[k + 9] * y + B[k + 10] * z + B[k + 11]); }
          app(e, q[0] * h, q[1] * h, q[2] * h, o3); out.push(o3[0], o3[1], o3[2], c.cat[j]); }
        continue; }
      if (f.o.visible === false) continue;
      if (f.skin) { for (let j = 0; j < f.idx.length; j++) { f.o.getVertexPosition(f.idx[j], tmp); tmp.applyMatrix4(f.o.matrixWorld); out.push(tmp.x, tmp.y, tmp.z, f.vcat[j] >= 0 ? f.vcat[j] : f.cat); } continue; }
      const e = f.o.matrixWorld.elements, P = f.pts;
      for (let i = 0; i < P.length; i += 3) { app(e, P[i], P[i + 1], P[i + 2], o3); out.push(o3[0], o3[1], o3[2], f.cat); }
    }
    // categoria sconosciuta (nuovo sistema senza nomi): braccia e mani riconosciute per posizione nel riferimento della persona
    if (out.some((v, i) => i % 4 === 3 && v < 0)) { inv = p.P.matrixWorld.clone().invert().elements;
      for (let i = 0; i < out.length; i += 4) if (out[i + 3] < 0) { app(inv, out[i], out[i + 1], out[i + 2], o3); out[i + 3] = o3[1] > .8 && (Math.abs(o3[0]) > .24 || o3[2] > .2) ? 2 : 0; } }
    return out;
  }

  // profondità di un punto nell'unione dei pezzi di un assieme: cammino a passi di 1,5 cm nelle 6 direzioni degli assi del mondo
  // fino a uscire da tutti i pezzi (il pavimento conta come pieno: un piede dentro un bancale non «esce» da sotto). Massimo 60 cm.
  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], _l2 = [0, 0, 0];
  function unione(px, py, pz, mb) {
    py = Math.max(py, .02);   // suole: il pavimento pieno conta solo scendendo (dy < 0)
    const dentroU = (x, y, z) => { if (y < .01) return true; for (const b of mb) { const q = b.bb; if (x < q[0] || x > q[3] || y < q[1] || y > q[4] || z < q[2] || z > q[5]) continue;
      app(b.inv, x, y, z, _l2); if (dentro(b.s, _l2, b.sc) > 0) return true; } return false; };
    let best = .6; for (const [dx, dy, dz] of DIRS) { let d = .01; for (; d < best; d += .015) if (!dentroU(px + dx * d, py + dy * d, pz + dz * d)) break; if (d < best) best = d; }
    return best;
  }
  // ---------- analisi ----------
  // soglie (m): corpo 3 cm, braccio 5 cm, mano 8 cm (le mani possono toccare); persone: busti a meno di 2 × 0,19 m
  C.analizza = (opz = {}) => {
    const t0 = opz.da ?? 0, t1 = opz.fino ?? 60, dt = opz.passo ?? .1, solo = opz.solo ? new Set(opz.solo) : null;
    const SOGLIA = [.03, .05, .08], RB = .19, scene = C.scene, agg = new Map();
    const nota = (key, info, t, d, pt) => { let a = agg.get(key); if (!a) agg.set(key, a = { chiave: key, ...info, parti: [], campioni: [] });
      for (const q of info.parti || []) if (!a.parti.includes(q)) a.parti.push(q); a.campioni.push([+t.toFixed(3), d, pt[0], pt[1], pt[2], info.det]); };
    const r2 = v => Math.round(v * 100) / 100, det = (p, b) => ({ radice: p ? [r2(p.P.matrixWorld.elements[12]), r2(p.P.matrixWorld.elements[14]), r2(Math.atan2(p.P.matrixWorld.elements[8], p.P.matrixWorld.elements[10]))] : null, pezzo: b ? b.bb.map(r2) : null });
    const din = C.ost.filter(b => b.dinamico), G = C.griglia, stamp = new Uint32Array(C.ost.length); let giro = 0;
    const telai = C.ost.filter(b => b.telaio);
    const loc = [0, 0, 0];
    // piano d'appoggio sotto un punto (pavimento a 0,02 m, oppure la cima di un oggetto fermo: solaio degli uffici, pedana…)
    const appoggio = (x, y, z) => { let a = .02; const l = G.get(Math.floor(x) * 1000 + Math.floor(z)); if (l) for (const i of l) { const b = C.ost[i].bb;
      if (x > b[0] && x < b[3] && z > b[2] && z < b[5] && b[4] <= y + .05 && b[4] > a) a = b[4]; } return a; };
    // rodaggio di 1,5 s prima del primo campione (persone.js ricava passo e velocità dalle chiamate precedenti)
    C.T = t0; for (let u = t0 - 1.5; u < t0 - 1e-6; u += dt) { C.U.forEach(f => f(u)); C.AU(u); }
    for (let k = 0; t0 + k * dt <= t1 + 1e-9; k++) {
      const t = t0 + k * dt; C.T = t; C.U.forEach(u => u(t)); C.AU(t); scene.updateMatrixWorld(true);
      din.forEach(aggiornaOst);
      const stati = [];
      for (const p of C.pers) {
        if (solo && !solo.has(p.reparto + 1)) { stati.push(null); continue; }
        if (!visibile(p.P)) { stati.push(null); continue; }
        const pts = puntiPersona(p); const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        for (let i = 0; i < pts.length; i += 4) for (let c = 0; c < 3; c++) { const v = pts[i + c]; if (v < bb[c]) bb[c] = v; if (v > bb[c + 3]) bb[c + 3] = v; }
        // seduto: bacino basso (osso «anca» di persone.js sotto 0,7 m dal piano dei piedi) o alla guida; senza scheletro: testa sotto 1,3 m.
        // (non basta la testa bassa: chi si china su una pila scende sotto 1,45 m)
        const stt = p.P.userData.stato, anca = stt && stt.Pp && stt.Pp[0] ? stt.Pp[0].y * (stt.h || 1) : null;
        const H = bb[4] - bb[1], seduto = !!p.veicolo || (anca !== null ? anca < .7 : bb[4] < 1.3);
        // busto: media dei punti del corpo tra il 55 % e il 90 % dell'altezza
        let sx = 0, sz = 0, n = 0; for (let i = 0; i < pts.length; i += 4) if (pts[i + 3] === 0 && pts[i + 1] > bb[1] + .55 * H && pts[i + 1] < bb[1] + .9 * H) { sx += pts[i]; sz += pts[i + 2]; n++; }
        const st = { p, pts, bb, seduto, busto: n ? [sx / n, sz / n] : [p.P.matrixWorld.elements[12], p.P.matrixWorld.elements[14]] }; stati.push(st);
        // piedi: sotto il pavimento o sollevati (solo chi sta in piedi, non chi guida)
        if (!seduto) { if (bb[1] < -.03) nota(`piedi-sotto|${p.id}`, { tipo: 'piedi sotto il pavimento', persona: p.id, pdesc: p.desc, reparto: p.reparto + 1, ostacolo: 'pavimento' }, t, -bb[1], [st.busto[0], bb[1], st.busto[1]]);
          if (bb[1] > .06 && bb[1] - appoggio(st.busto[0], bb[1], st.busto[1]) > .06) nota(`piedi-su|${p.id}`, { tipo: 'piedi sollevati (galleggia)', persona: p.id, pdesc: p.desc, reparto: p.reparto + 1, ostacolo: 'pavimento' }, t, bb[1], [st.busto[0], bb[1], st.busto[1]]); }
        // candidati: fermi dalla griglia, dinamici per riquadro
        giro++; const cand = [];
        for (let x = Math.floor(bb[0]); x <= Math.floor(bb[3]); x++) for (let z = Math.floor(bb[2]); z <= Math.floor(bb[5]); z++) { const l = G.get(x * 1000 + z); if (l) for (const i of l) if (stamp[i] !== giro) { stamp[i] = giro; cand.push(C.ost[i]); } }
        for (const b of din) if (b.vis && incrocia(b.bb, bb)) cand.push(b);
        // 1) punti del corpo dentro almeno un pezzo, raccolti per assieme; 2) profondità nell'UNIONE dei pezzi dell'assieme
        //    (una pila di lastre da 2,5 cm o un bancale: la profondità in un solo pezzo sottile sarebbe sempre piccola)
        const dentroA = new Map(), membri = new Map(), soglia = seduto ? [.06, .06, .08] : SOGLIA;
        for (const b of cand) {
          if (!incrocia(b.bb, bb) || (p.veicolo && b.veicolo === p.veicolo)) continue;
          let m = membri.get(b.assieme); if (!m) membri.set(b.assieme, m = []); m.push(b);
          for (let i = 0; i < pts.length; i += 4) { const c = pts[i + 3]; if (c === 2 && b.cat === 'pezzo') continue;
            const px = pts[i], py = pts[i + 1], pz = pts[i + 2]; if (px < b.bb[0] || px > b.bb[3] || py < b.bb[1] || py > b.bb[4] || pz < b.bb[2] || pz > b.bb[5]) continue;
            app(b.inv, px, py, pz, loc); const d = dentro(b.s, loc, b.sc); if (d <= .004) continue;
            let r = dentroA.get(b.assieme); if (!r) dentroA.set(b.assieme, r = new Map()); if (!r.has(i) || r.get(i)[0] < d) r.set(i, [d, b]); }
        }
        const perAss = new Map();
        for (const [o, r] of dentroA) { const lista = [...r.keys()], passo = Math.max(1, Math.ceil(lista.length / 40)), res = [null, null, null], mb = membri.get(o);
          // i punti più profondi nel singolo pezzo sono sempre valutati, gli altri a campione
          const ord = lista.sort((a, b) => r.get(b)[0] - r.get(a)[0]), scelti = new Set(ord.slice(0, 12)); for (let k = 0; k < ord.length; k += passo) scelti.add(ord[k]);
          for (const i of scelti) { const c = pts[i + 3], du = unione(pts[i], pts[i + 1], pts[i + 2], mb), d = Math.max(r.get(i)[0], du); if (d <= soglia[c]) continue;
            if (C.debug && du > .5 && C.debug.length < 5) C.debug.push({ p: p.id, pt: [pts[i], pts[i + 1], pts[i + 2]], raw: r.get(i)[0], n: mb.length, bb: mb.slice(0, 6).map(b => b.bb.map(v => +v.toFixed(3))), tipo: mb.slice(0, 6).map(b => b.s.tipo + (b.s.approx ? '~' : '') + ':' + (b.geo.type || '')) });
            if (!res[c] || d > res[c][0]) res[c] = [d, [pts[i], pts[i + 1], pts[i + 2]], r.get(i)[1]]; }
          if (res.some(Boolean)) perAss.set(o, res); }
        // 3) capsule dello scheletro: di quanto un pezzo (anche sottile) entra nel corpo
        const cap = capsulePersona(p);
        // chi è seduto appoggia bacino e cosce sulla sedia: si saltano i punti del bacino (0–2) e delle cosce (31–40)
        if (cap && seduto) for (let i = 0; i < cap.length; i += 5) { const k = i / 5; if (k < 3 || (k >= 31 && k <= 40)) cap[i + 3] = -1; }
        if (cap) for (const b of cand) { if (!incrocia(b.bb, bb) || (p.veicolo && b.veicolo === p.veicolo)) continue;
          for (let i = 0; i < cap.length; i += 5) { const c = cap[i + 4], r = cap[i + 3]; if (r < 0 || (c === 2 && b.cat === 'pezzo')) continue;
            const x = cap[i], y = cap[i + 1], z = cap[i + 2]; if (x < b.bb[0] - r || x > b.bb[3] + r || y < b.bb[1] - r || y > b.bb[4] + r || z < b.bb[2] - r || z > b.bb[5] + r) continue;
            app(b.inv, x, y, z, loc); const din = dentro(b.s, loc, b.sc), d = din > 0 ? r + din : r - fuori(b.s, loc, b.sc); if (d <= soglia[c]) continue;
            let res = perAss.get(b.assieme); if (!res) perAss.set(b.assieme, res = [null, null, null]); if (!res[c] || d > res[c][0]) res[c] = [d, [x, y, z], b]; } }
        // un caso per coppia persona–assieme: parti coinvolte (corpo, braccio, mano) e profondità massima
        for (const [o, r] of perAss) { const a = C.assiemi.get(o), x = r.reduce((m, q) => q && (!m || q[0] > m[0]) ? q : m, null), parti = ['corpo', 'braccio', 'mano'].filter((_, c) => r[c]);
          const tipo = (p.fonti.length ? 'persona' : 'capsula') + ' ↔ ' + ({ macchina: 'macchina/arredo', muro: 'muro', veicolo: 'mezzo', pezzo: 'pezzo in movimento' }[a.cat] || a.cat);
          nota(`${tipo}|${p.id}|${a.nome}`, { tipo, persona: p.id, pdesc: p.desc, reparto: p.reparto + 1, ostacolo: a.nome, ostId: a.id, ostCentro: a.centro, approx: x[2].s.approx, parti, det: det(p, x[2]) }, t, x[0], x[1]); }
      }
      // persona ↔ persona (busti)
      for (let i = 0; i < stati.length; i++) for (let j = i + 1; j < stati.length; j++) { const a = stati[i], b = stati[j]; if (!a || !b) continue;
        if (a.bb[4] < b.bb[1] || b.bb[4] < a.bb[1]) continue; const d = Math.hypot(a.busto[0] - b.busto[0], a.busto[1] - b.busto[1]), ov = 2 * RB - d;
        if (ov > .03) nota(`persona|${a.p.id}|${b.p.id}`, { tipo: 'persona ↔ persona', persona: a.p.id, pdesc: a.p.desc, reparto: a.p.reparto + 1, ostacolo: `${b.p.id} (${b.p.desc})` }, t, ov, [(a.busto[0] + b.busto[0]) / 2, 1.2, (a.busto[1] + b.busto[1]) / 2]); }
      // telaio dei mezzi ↔ macchine, muri, pile (i mezzi dei corridoi e delle tappe)
      if (!solo || solo.has(0)) for (const b of telai) { if (!aggiornaOst(b)) continue; const P = b._gr || (b._gr = grigliaGeo(b.s)), w = [0, 0, 0];
        giro++; const cand = []; const bb = b.bb;
        for (let x = Math.floor(bb[0]); x <= Math.floor(bb[3]); x++) for (let z = Math.floor(bb[2]); z <= Math.floor(bb[5]); z++) { const l = G.get(x * 1000 + z); if (l) for (const i of l) if (stamp[i] !== giro) { stamp[i] = giro; cand.push(C.ost[i]); } }
        const mbV = new Map(); for (const o of cand) { if (o.veicolo) continue; let m = mbV.get(o.assieme); if (!m) mbV.set(o.assieme, m = []); m.push(o); }
        for (const o of cand) { if (!incrocia(o.bb, bb) || o.veicolo) continue; let best = 0, bp = null;
          for (let i = 0; i < P.length; i += 3) { app(b.e, P[i], P[i + 1], P[i + 2], w); if (w[0] < o.bb[0] || w[0] > o.bb[3] || w[1] < o.bb[1] || w[1] > o.bb[4] || w[2] < o.bb[2] || w[2] > o.bb[5]) continue;
            app(o.inv, w[0], w[1], w[2], loc); let d = dentro(o.s, loc, o.sc); if (d <= .004) continue; d = Math.max(d, unione(w[0], w[1], w[2], mbV.get(o.assieme))); if (d > best) { best = d; bp = w.slice(); } }
          if (best > .03) { const va = C.assiemi.get(b.assieme), oa = C.assiemi.get(o.assieme);
            nota(`mezzo|${va.nome}|${oa.nome}`, { tipo: 'mezzo ↔ ' + (oa.cat === 'muro' ? 'muro' : 'macchina/arredo'), persona: va.nome, pdesc: 'mezzo', reparto: va.reparto + 1, ostacolo: oa.nome, ostId: oa.id, ostCentro: oa.centro, approx: o.s.approx, det: { veicolo: b.bb.map(r2), pezzo: o.bb.map(r2) } }, t, best, bp); } } }
    }
    C.T = t0;
    // intervalli di tempo: campioni consecutivi (buco ≤ 1,5 passi) uniti
    const out = [];
    for (const a of agg.values()) { const cs = a.campioni.sort((p, q) => p[0] - q[0]), iv = []; let max = cs[0];
      for (const c of cs) { if (c[1] > max[1]) max = c; const l = iv[iv.length - 1]; if (l && c[0] - l[1] <= dt * 1.5 + 1e-6) l[1] = c[0]; else iv.push([c[0], c[0]]); }
      const pr = C.pers.find(p => p.id === a.persona);
      out.push({ ...a, det: max[5], campioni: undefined, n: cs.length, intervalli: iv, max: max[1], tMax: max[0], punto: max.slice(2, 5), durata: +(cs.length * dt).toFixed(2), seduto: !!(pr && (pr.veicolo)) }); }
    return out.sort((p, q) => (p.reparto || 99) - (q.reparto || 99) || q.max - p.max);
  };

  // ---------- inquadratura per la foto ----------
  // camera a 3,8 m dal punto di contatto, 32° di elevazione, dalla direzione con meno ostacoli fermi sulla linea di vista
  C.inquadra = (caso, dist = 3.8) => {
    const p = caso.punto, tgt = [p[0], Math.max(.5, Math.min(1.5, p[1])), p[2]], G = C.griglia, oc = caso.ostCentro;
    let best = null;
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, el = .56, dx = Math.cos(a) * Math.cos(el), dz = Math.sin(a) * Math.cos(el), dy = Math.sin(el);
      let costo = 0; for (let s = 1; s <= 14; s++) { const u = .35 + s / 14 * (dist - .35), x = tgt[0] + dx * u, y = tgt[1] + dy * u, z = tgt[2] + dz * u, l = G.get(Math.floor(x) * 1000 + Math.floor(z));
        if (l) for (const i of l) { const b = C.ost[i].bb; if (x > b[0] && x < b[3] && y > b[1] && y < b[4] && z > b[2] && z < b[5]) { costo++; break; } } }
      if (oc) { const vx = tgt[0] - oc[0], vz = tgt[2] - oc[2], L = Math.hypot(vx, vz) || 1; costo -= .6 * (dx * vx + dz * vz) / L; }   // meglio dal lato della persona
      costo += .2 * Math.max(0, dz < 0 ? 1 : 0);                                                                     // a parità, da sud (come la camera del giro)
      if (!best || costo < best.c) best = { c: costo, pos: [tgt[0] + dx * dist, tgt[1] + dy * dist, tgt[2] + dz * dist] }; }
    return { target: tgt, pos: best.pos };
  };
  C.proietta = p => { const V3 = C.scene.position.constructor, v = new V3(...p).project(window.__rf.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
})();
