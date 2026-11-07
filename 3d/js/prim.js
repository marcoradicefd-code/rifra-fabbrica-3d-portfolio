// Primitive 3D: unità in metri, x = est, y = alto, z = sud. Geometrie condivise, ombre attive.
import * as THREE from 'three';
import { t, allaLingua } from './lingua.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ATLANTE } from './materiali.js';
import { rumoreAtlante } from './texture.js';
import { radiciPersone } from './persone.js';

const GB = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);          // base a terra: y da 0 a 1
const GC = new THREE.CylinderGeometry(1, 1, 1, 24).translate(0, .5, 0);
const GC8 = new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, .5, 0);
const GS = new THREE.SphereGeometry(1, 20, 14);

function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
// scatola: angolo minimo (x,y,z), dimensioni (w in x, h in y, d in z)
export function box(p, x, y, z, w, h, d, mat, opt = {}) {
  const m = mesh(GB, mat, opt.cast !== false); m.position.set(x + w / 2, y, z + d / 2); m.scale.set(w, h, d);
  if (opt.ry) m.rotation.y = opt.ry; m.userData.statico = opt.statico !== false; p.add(m); return m;
}
// cilindro verticale: centro della base (x,y,z)
export function cyl(p, x, y, z, r, h, mat, opt = {}) {
  const m = mesh(opt.ott ? GC8 : GC, mat, opt.cast !== false); m.position.set(x, y, z); m.scale.set(r, h, r);
  if (opt.rx) { m.rotation.x = opt.rx; } if (opt.rz) m.rotation.z = opt.rz; m.userData.statico = opt.statico !== false; p.add(m); return m;
}
export function sfera(p, x, y, z, r, mat, opt = {}) { const m = mesh(GS, mat); m.position.set(x, y, z); m.scale.setScalar(r); m.userData.statico = opt.statico !== false; p.add(m); return m; }
// tubo lungo una polilinea (condotte, calate flessibili)
export function tubo(p, pts, r, mat, opt = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(...q)), false, 'catmullrom', opt.tension ?? .1);
  const m = mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 10), r, opt.seg || 12, false), mat); m.userData.statico = opt.statico !== false; p.add(m); return m;
}
const DEBUG = /[?&]debug\b/.test(location.search);
// «Casolin · squadratrice (V f_058)» → «Casolin · squadratrice»; le fonti restano nella tabella dei fatti e con ?debug=1
export function pubblico(t) { return t.replace(/\s*\((?:F|V|PE|E|sito|Marco)[^)]*\)/g, '').replace(/\s*·\s*(?:marca non leggibile|marca da verificare|funzione da confermare)/g, '').replace(/:\s*nessuna foto, disegno illustrativo/, '').replace(/\s*·\s*il sito:/, ' · ').trim(); }
export function gruppo(p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; }

// etichetta a schermo (DOM): testo leggibile ≥ 13 px, sempre sopra la scena
export function etichetta(p, x, y, z, testo, cls = 'lab3d') {
  const el = document.createElement('div'); el.className = cls; el.title = testo;
  const scrivi = () => { el.textContent = DEBUG ? testo : t(pubblico(testo)); }; scrivi(); allaLingua(scrivi);   // lingua.js: italiano o inglese
  const o = new CSS2DObject(el); o.position.set(x, y, z); o.userData.etichetta = true; p.add(o); return o;
}

// persone: corpo modellato nel codice con scheletro, una sola InstancedMesh con skinning su GPU (vedi persone.js per tecniche e fonti).
// persona(p, M, x, z, opt) e .posa(t, o) restano compatibili con la versione a capsule.
export { persona, istanziaPersone } from './persone.js';
const lerp = (a, b, t) => a + (b - a) * t;

// materiale «atlante»: MeshStandard con colore, rugosità e metallicità per vertice. Tutti i materiali a tinta unita di M
// (registrati in ATLANTE) diventano un solo materiale: un gruppo statico passa da decine di chiamate di disegno a 2 (con e senza ombra).
// Micro-variazione (02/10, contro l'effetto plastica): rumore 512² su 2 m (texture.js) letto in proiezione triplanare sulle coordinate
// dell'oggetto fuso (metri, ferme rispetto al pezzo anche nei gruppi animati). Dielettrici (vernici RAL, laminati, gomma): tinta ±2–3 %
// a chiazze e rugosità ±0,05; metalli (metalness > 0,5: acciaio, zincato, cromato): righe di spazzolatura nella rugosità e nella tinta.
// Niente normali (la buccia d'arancia da lontano scintillerebbe); tutto mipmappato. Stesse chiamate di disegno, 3 letture in più per pixel.
export function creaAtlante() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), rum = rumoreAtlante();
  m.onBeforeCompile = s => {
    s.uniforms.uRfRum = { value: rum };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 rm;\nvarying vec2 vRM;\nvarying vec3 vRfP, vRfN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvRM = rm; vRfP = transformed; vRfN = objectNormal;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vRM;\nvarying vec3 vRfP, vRfN;\nuniform sampler2D uRfRum;')
      .replace('#include <color_fragment>', `#include <color_fragment>
	vec3 rfW = pow( abs( normalize( vRfN ) ), vec3( 4.0 ) ); rfW /= rfW.x + rfW.y + rfW.z;
	vec4 rfA = texture2D( uRfRum, vRfP.zy * .5 ) * rfW.x + texture2D( uRfRum, vRfP.xz * .5 ) * rfW.y + texture2D( uRfRum, vRfP.xy * .5 ) * rfW.z - .5;
	float rfMet = step( .5, vRM.y );
	diffuseColor.rgb *= 1.0 + mix( rfA.r * .06 + rfA.g * .035 + rfA.a * .025, rfA.b * .06 + rfA.r * .03, rfMet );
	float rfDR = mix( rfA.r * .06 + rfA.g * .05, rfA.b * .14 + rfA.r * .05, rfMet );`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp( vRM.x + rfDR, .04, 1.0 );').replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vRM.y;');
  };
  m.customProgramCacheKey = () => 'rf-atlante'; m.userData.atlante = true; return m;
}
const ATLAS = creaAtlante();
// un materiale va nell'atlante se è una MeshStandard a tinta unita (niente texture, trasparenza, emissione) e l'animazione non lo cambia
// (vedi campiona: i materiali che cambiano colore o emissione, come le lampade del reparto 9, restano separati)
const MAPPE = ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'lightMap', 'bumpMap', 'displacementMap', 'envMap'];
const atlasabile = (m, mutabili) => m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !m.userData.noAtlante && !(mutabili && mutabili.has(m)) && (ATLANTE.has(m) || mutabili)
  && MAPPE.every(k => !m[k]) && !m.transparent && !m.flatShading && !m.vertexColors && m.side === THREE.FrontSide && m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile
  && m.visible && m.opacity === 1 && m.emissive.r + m.emissive.g + m.emissive.b === 0 && m.envMapIntensity === 1 && !m.polygonOffset && m.alphaTest === 0;
// geometria pronta per la fusione: trasformata, indicizzata, solo posizione / normale / uv
function pulisci(src, m, colore = false) {
  const g = src.clone(); g.applyMatrix4(m); g.morphAttributes = {};
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', colore ? 'color' : 'uv'].includes(k)) g.deleteAttribute(k);
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.index) g.setIndex(Array.from({ length: n }, (_, i) => i));
  return g;
}
// un gruppo di materiale di una mesh a più materiali (i muri): stessi vertici, solo la sua parte di indici
function fetta(g, start, count) { const f = new THREE.BufferGeometry(); for (const k of Object.keys(g.attributes)) f.setAttribute(k, g.attributes[k]); f.setIndex(Array.from(g.index.array.slice(start, start + count))); return f; }
function coloraAtlante(g, mat) { const n = g.attributes.position.count, c = new Float32Array(n * 3), rm = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { c[i * 3] = mat.color.r; c[i * 3 + 1] = mat.color.g; c[i * 3 + 2] = mat.color.b; rm[i * 2] = mat.roughness; rm[i * 2 + 1] = mat.metalness; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('rm', new THREE.BufferAttribute(rm, 2)); }

// fonde le geometrie statiche di un gruppo: i materiali a tinta unita nell'atlante, gli altri (texture, trasparenti, fisici) per materiale
export function fondiStatici(root, opt = {}) {
  const atl = opt.atlante || ATLAS;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), mm = new THREE.Matrix4();
  const perMat = new Map(), togli = [];
  // i trasparenti (vetri, film) non proiettano ombre piene
  const add = (mat, cast, geo) => { cast = cast && !mat.transparent; const a = atlasabile(mat, opt.mutabili), key = (a ? 'atlante' : mat.uuid) + (cast ? 'c' : 'n');
    if (!perMat.has(key)) perMat.set(key, { mat: a ? atl : mat, cast, geos: [] }); if (a) coloraAtlante(geo, mat); perMat.get(key).geos.push(geo); };
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.userData.statico || o.userData.anim || !o.visible || !o.parent || hasAnimParent(o, root)) return;
    mm.multiplyMatrices(inv, o.matrixWorld); const g = pulisci(o.geometry, mm, !Array.isArray(o.material) && o.material.vertexColors);
    if (Array.isArray(o.material)) { for (const gr of g.groups) { const mat = o.material[gr.materialIndex]; if (mat && mat.visible) add(mat, o.castShadow, fetta(g, gr.start, gr.count)); } }
    else add(o.material, o.castShadow, g);
    togli.push(o); });
  for (const o of togli) o.parent.remove(o);
  for (const { mat, cast, geos } of perMat.values()) { const g = mergeGeometries(geos, false); if (!g) continue; const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; m.userData.fuso = true; m.matrixAutoUpdate = false; root.add(m); }
  return perMat.size;
}
function hasAnimParent(o, root) { for (let q = o.parent; q && q !== root; q = q.parent) if (q.userData.anim) return true; return false; }
function dentroAnim(o) { for (let q = o; q; q = q.parent) if (q.userData.anim) return true; return false; }

// campionamento dell'animazione (aggiorna(t) su 200 istanti fino a 167 s): quali mesh dentro i gruppi animati restano ferme rispetto
// al genitore e sempre visibili, e quali materiali cambiano (colore, emissione, opacità). Serve a fondere senza rompere le animazioni.
export function campiona(scene, aggiorna, campioni = 200) {
  const cand = [], mats = new Set();
  scene.traverse(o => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m));
    if (!o.isInstancedMesh && !o.userData.fuso && o.visible && !Array.isArray(o.material) && o.parent && dentroAnim(o)) cand.push(o); });
  const st = o => [o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z, o.visible ? 1 : 0, o.parent ? o.parent.id : -1, o.material.id];
  const sm = m => [m.color ? m.color.getHex() : 0, m.emissive ? m.emissive.getHex() : 0, m.emissiveIntensity ?? 0, m.opacity, m.visible ? 1 : 0, m.transparent ? 1 : 0];
  const mList = [...mats], mBase = mList.map(sm), base = cand.map(st), mobile = new Uint8Array(cand.length), mut = new Set();
  const diversi = (a, b) => { for (let j = 0; j < a.length; j++) if (Math.abs(a[j] - b[j]) > 1e-7) return true; return false; };
  for (let k = 0; k <= campioni; k++) { aggiorna(k * .83471);
    cand.forEach((o, i) => { if (!mobile[i] && diversi(st(o), base[i])) mobile[i] = 1; });
    mList.forEach((m, i) => { if (!mut.has(m) && diversi(sm(m), mBase[i])) mut.add(m); }); }
  aggiorna(0);
  return { ferme: new Set(cand.filter((_, i) => !mobile[i])), mutabili: mut };
}
// fonde per genitore le mesh ferme dei gruppi animati (atlante per le tinte unite); le parti piccole che si muovono non fanno ombra
export function fondiAnimati(scene, { ferme, mutabili }) {
  const gruppi = new Map();
  for (const o of ferme) { if (!o.parent) continue; const a = atlasabile(o.material, mutabili), cast = o.castShadow && !o.material.transparent;
    const k = o.parent.id + '|' + (a ? 'A' : o.material.uuid) + (cast ? 'c' : 'n') + o.renderOrder; if (!gruppi.has(k)) gruppi.set(k, { a, cast, list: [] }); gruppi.get(k).list.push(o); }
  let tolte = 0;
  for (const { a, cast, list } of gruppi.values()) { if (list.length < 2 && !a) continue;
    const geos = list.map(o => { o.updateMatrix(); const g = pulisci(o.geometry, o.matrix, !a && o.material.vertexColors); if (a) coloraAtlante(g, o.material); return g; }); const g = mergeGeometries(geos, false); if (!g) continue;
    const o0 = list[0], m = new THREE.Mesh(g, a ? ATLAS : o0.material); m.castShadow = cast; m.receiveShadow = true; m.renderOrder = o0.renderOrder; m.userData.fuso = true; m.matrixAutoUpdate = false;
    o0.parent.add(m); list.forEach(o => o.parent.remove(o)); tolte += list.length - 1; }
  // ombre: niente per trasparenti e per i pezzi mobili più piccoli di ~30 cm (non si vedono, costano una chiamata ciascuno)
  const bs = new THREE.Sphere(), sc = new THREE.Vector3(); scene.updateMatrixWorld(true);
  scene.traverse(o => { if (!o.isMesh || !o.castShadow || o.isInstancedMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.every(m => m.transparent)) { o.castShadow = false; return; }
    if (!o.userData.fuso && dentroAnim(o)) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.matrixWorld.decompose(bs.center, _q, sc);
      if (o.geometry.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z) < .15) o.castShadow = false; } });
  return tolte;
}
const _q = new THREE.Quaternion();

// n. 5 · ombre a disco (contatto) sotto persone, muletto, carrelli e auto: una sola InstancedMesh trasparente, 1 chiamata di disegno.
// fissi: [x, z, ry, lungo, largo]; mobili: [oggetto, lungo, largo] (segue la posizione dell'oggetto); le persone sedute in alto sono saltate
export function ombreDisco(scene, fissi = [], mobili = []) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#fff'); gr.addColorStop(.45, '#9a9a9a'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: new THREE.CanvasTexture(c), transparent: true, opacity: .38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const radici = radiciPersone(), n = radici.length + mobili.length + fissi.length;
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, n); im.frustumCulled = false; im.castShadow = im.receiveShadow = false; im.renderOrder = 4; im.userData.persone = true; scene.add(im);
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  fissi.forEach(([x, z, ry, a, b], i) => { im.setMatrixAt(radici.length + mobili.length + i, m4.compose(p.set(x, .025, z), q.setFromAxisAngle(up, ry), s.set(a, 1, b))); });
  const vis = o => { for (let r = o; r; r = r.parent) if (!r.visible) return false; return true; };
  return () => {
    radici.forEach((r, i) => { p.setFromMatrixPosition(r.matrixWorld); im.setMatrixAt(i, vis(r) && p.y < .3 ? m4.compose(p.setY(.025), q.identity(), s.set(.8, 1, .8)) : zero); });
    mobili.forEach(([o, a, b], i) => { p.setFromMatrixPosition(o.matrixWorld); im.setMatrixAt(radici.length + i, vis(o) ? m4.compose(p.setY(.025), q.identity(), s.set(a, 1, b)) : zero); });
    im.instanceMatrix.needsUpdate = true; };
}
