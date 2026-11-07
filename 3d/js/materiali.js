// Materiali fisici (PBR) e texture procedurali: tutto disegnato dal codice, niente immagini esterne (regola A1).
// Colori presi dalle foto (F, V, E) e dal design system RiFRA (DESIGN-SYSTEM.md).
import * as THREE from 'three';
import { cuociMateriale, rilascia, STAT } from './texture.js';

const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// ---------- texture ----------
// Dal 02/10 disegnate sulla GPU all'avvio da texture.js (fBm, Voronoi, giunti; mipmap e anisotropia). Le vecchie texture su canvas
// 2D a 512 px sono in archivio/3d-prima-texture-2026-10-02/materiali.js. size = metri coperti da una tessera; la ripetizione (repeat)
// tiene conto delle UV che la geometria già dà (edificio.js: pavimento in metri, muri L/5 × h/7, volte arco × 6 m, piazzali uvScale).
//   pavimento   cemento lisciato, 12 × 12 m (2 × 2 lastre da 6 m), colore 2048, normali e rugosità 1024 (UV in metri → repeat 1/12)
//   facciata    pannelli da 2,5 m chiari e puliti, 20 × 7 m (UV in tratti da 5 m → repeat 1/4 in orizzontale)
//   tetto       lamiera grecata delle volte: arco 3,35 m × 6 m
//   asfalto, autobloccanti (8 m), quadrotti (8 m): una tessera per unità di UV (uvScale di edificio.js); prato 24 m (uvScale 12 → repeat 1/2)
//   mdf         2 m su una faccia (UV 0–1)
const TEX = {
  pavimento: { size: [12, 12], c: 2048, n: 1024, r: 1024, aniso: 16, rep: [1 / 12, 1 / 12] },
  facciata: { size: [20, 7], c: [2048, 1024], n: [1024, 512], rep: [1 / 4, 1] },
  tetto: { size: [3.35, 6], c: [512, 1024], n: [512, 1024] },
  asfalto: { size: [8, 8], c: 1024, n: 1024, aniso: 16 },
  autobloccanti: { size: [8, 8], c: 1024, n: 1024, aniso: 16 },
  prato: { size: [24, 24], c: 1024, n: 512, aniso: 16, rep: [.5, .5] },
  quadrotti: { size: [8, 8], c: 512 },
  mdf: { size: [2, 2], c: 512, n: 512 },
};
function texture(nome) { const o = TEX[nome], t = cuociMateriale(nome, o); if (o.rep) Object.values(t).forEach(x => x.repeat.set(...o.rep)); return t; }

// ---------- materiali ----------
// materiali a tinta unita condivisi: fondiStatici (prim.js) li unisce in un solo materiale «atlante» a colori per vertice.
// Regola: non cambiare a runtime colore, emissione o opacità di un materiale di M usato da pezzi statici: clonarlo prima (come le lampade del reparto 9).
export const ATLANTE = new WeakSet();
const S = (color, rough = .6, metal = 0, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }); if (!Object.keys(extra).length) ATLANTE.add(m); return m; };
export function creaMateriali() {
  const [pav, fac, tet, asf, aut, pr, md, qd] = ['pavimento', 'facciata', 'tetto', 'asfalto', 'autobloccanti', 'prato', 'mdf', 'quadrotti'].map(texture);
  rilascia(); window.__rfTex = { ms: Math.round(STAT.ms), mb: Math.round(STAT.byte / 1048576), det: STAT.det.join(' ') };
  const M = {
    // rugosità e normali vere dalla mappa (roughness 1 = moltiplicatore): cemento lucido a chiazze come nelle foto (F 7444)
    pavimento: S(0xffffff, 1, 0, { map: pav.map, normalMap: pav.normalMap, roughnessMap: pav.roughnessMap }),
    pavMagazzino: S(0xe6e5e0, 1.15, 0, { map: pav.map, normalMap: pav.normalMap, roughnessMap: pav.roughnessMap }),
    pavUffici: S(0xd9d2c6, .35, 0),
    facciata: S(0xffffff, .9, 0, { map: fac.map, normalMap: fac.normalMap }),
    bordoFacciata: S(0xd2d1cc, .88), testaFacciata: S(0xc4c3be, .85),   // fianchi e testa dei muri esterni, chiari come la facciata (SV)
    internoAntracite: S(0x4a4d52, .9),            // pareti della produzione: blocchi grigio-blu (V f_041, f_066; analisi Fable P3 n. 17)
    internoBianco: S(0xe9e8e4, .85),              // pareti del magazzino (V)
    tetto: S(0xffffff, .55, .15, { map: tet.map, normalMap: tet.normalMap, side: THREE.DoubleSide }),
    tettoPiano: S(0xffffff, .9, 0, { map: qd.map }), tettoChiaro: S(0xd3d3ce, .85), tettoScuro: S(0x55585c, .9),
    lineaRossa: S(0xb3262c, .6),                  // linea rossa sul tetto (E)
    lucernario: S(0xdfe8ee, .15, 0, { transparent: true, opacity: .75 }),
    asfalto: S(0xffffff, .95, 0, { map: asf.map, normalMap: asf.normalMap }), autobloccanti: S(0xffffff, .88, 0, { map: aut.map, normalMap: aut.normalMap }),
    prato: S(0xffffff, 1, 0, { map: pr.map, normalMap: pr.normalMap }),
    righeGialle: S(0xe3b12c, .7), righeBianche: S(0xf2f2ee, .7), righeArancio: S(0xe0662a, .7), rossoPercorso: S(0xc0392b, .6, 0, { emissive: 0x3a0a08 }),
    bianco: S(0xeceeef, .42, .05), biancoCaldo: S(0xe7e3da, .5), grigio: S(0x9ea2a6, .5, .2), grigioScuro: S(0x55585d, .55, .2), antracite: S(0x2e3034, .5, .15), nero: S(0x141518, .45, .1),
    acciaio: S(0xc9ccd0, .32, .9), zincato: S(0xb9bcc0, .38, .85), cromato: S(0xe8eaec, .12, 1),
    // P3 n. 17: silo grigio zincato (E silo, V f_047); condotte a soffitto più scure e opache (non «finte» da lontano); vetrata degli uffici
    // chiara e riflettente (F 7465) e vetro visto dall'interno; volumi dei vicini meno caldi (P3 n. 25)
    silo: S(0xc9cbc8, .42, .55), zincatoScuro: S(0x8e9296, .5, .6), vetroUffici: S(0x9fb2c0, .12, .55), vetroInterno: S(0xb7c6d2, .2, .1), vicini: S(0xcfd0cc, .85), tettoVicini: S(0x8f9295, .85),
    verdeBiesse: S(0x6cb33f, .45, .05), bluBrandt: S(0x3d7cc9, .45), rossoCefla: S(0xd3232f, .45), verdeTelaio: S(0x9fb39a, .6, .2),
    giallo: S(0xf0bf2a, .5, .05), arancio: S(0xe2771e, .55, .1), rosso: S(0xb8322a, .5, .05), blu: S(0x2d63a8, .5, .05), verdeScuro: S(0x2b4530, .7),
    mdf: S(0xffffff, .78, 0, { map: md.map, normalMap: md.normalMap }), legno: S(0xb58a57, .75), cartone: S(0xb8905e, .85),
    laccato: new THREE.MeshPhysicalMaterial({ color: 0x17181c, roughness: .18, metalness: 0, clearcoat: 1, clearcoatRoughness: .06 }),   // anta laccata lucida
    laccatoOpaco: S(0x2b2c30, .7),
    vetro: new THREE.MeshPhysicalMaterial({ color: 0x9fb4c2, roughness: .05, metalness: 0, transparent: true, opacity: .32, envMapIntensity: 1.4, depthWrite: false }),
    vetroScuro: new THREE.MeshPhysicalMaterial({ color: 0x1d2530, roughness: .08, metalness: .2, transparent: true, opacity: .8 }),
    schermo: S(0x1b3c5a, .3, 0, { emissive: 0x2a6db0, emissiveIntensity: .8 }),
    pelle: S(0xd7a98b, .6), capelli: S(0x2a2420, .8), maglietta: S(0x1a1b1e, .85), jeans: S(0x2d3a52, .85), pantaloni: S(0x25262a, .85),
    grembiule: S(0x2f5f9e, .8), guanti: S(0xd9d23a, .6),
    fogliame: S(0x5d7a45, .9, 0, { flatShading: true }), tronco: S(0x5e5146, .9),
    chioma: S(0xffffff, .95, 0, { flatShading: true, vertexColors: true }),   // alberi esterni: verdi scuri e spenti a colori per vertice (E)
    siepe: S(0x505f42, .95), carrozzeria: S(0xffffff, .3, .5), dettagliAuto: S(0xffffff, .5, .1, { vertexColors: true }),
    film: new THREE.MeshPhysicalMaterial({ color: 0xcfe3f0, roughness: .2, transparent: true, opacity: .45, depthWrite: false }),
  };
  M.prato.userData.rfVar = .28;   // patchTerra: il prato (centinaia di metri) varia di più, così la tessera da 24 m non si ripete a vista
  return M;
}
// imposta la ripetizione della texture in metri (un solo materiale condiviso: le UV le scala la geometria)
export function uvMetri(geo, sx, sy) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); uv.needsUpdate = true; return geo; }

// ---------- luce, ombre, grading, terreno (tecniche scelte in ricerca/VIDEO-GIOCHI-TECNICHE.md, § 4) ----------
// Costo per fotogramma: 0 chiamate di disegno in più (tranne il passaggio di grading, a tutto schermo); il resto è calcolato all'avvio.

// n. 6 · filtro delle ombre stabile: 3 × 3 letture bilineari del sampler2DShadow al posto del disco di Vogel a 5 campioni con rumore
// (niente puntinato né sfarfallio nei voli). Se three cambia il blocco la regex non trova nulla e resta il filtro standard.
export function patchOmbre() {
  const c = THREE.ShaderChunk.shadowmap_pars_fragment, re = /float phi = interleavedGradientNoise\( gl_FragCoord\.xy \) \* PI2;\s*shadow = \([\s\S]*?\) \* 0\.2;/;
  if (!re.test(c)) return false;
  THREE.ShaderChunk.shadowmap_pars_fragment = c.replace(re, 'shadow = 0.0;\n\t\t\t\tfor ( int i = -1; i <= 1; i ++ ) for ( int j = -1; j <= 1; j ++ ) shadow += texture( shadowMap, vec3( shadowCoord.xy + vec2( float( i ), float( j ) ) * radius, shadowCoord.z ) );\n\t\t\t\tshadow *= ( 1.0 / 9.0 );');
  return true;
}

// n. 1 · ambiente «fabbrica» per i riflessi e la luce diffusa (al posto di RoomEnvironment, che riflette uno studio fotografico):
// cupola azzurra che sfuma nella foschia dell'orizzonte, terreno beige caldo (rimbalzo dal basso), strisce luminose dei lucernari e delle
// finestre a nastro. Una PMREM a 256 all'avvio, nessun costo per fotogramma.
export function ambienteFabbrica() {
  const s = new THREE.Scene(), R = 40, g = new THREE.SphereGeometry(R, 48, 24), pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const zen = new THREE.Color(0x6f9fd8), oriz = new THREE.Color(0xdfe5ea), terra = new THREE.Color(0xb9b2a4);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / R; if (y >= 0) c.copy(oriz).lerp(zen, Math.pow(y, .55)); else c.copy(oriz).lerp(terra, Math.min(1, -y * 6)); c.toArray(col, i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); s.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const lum = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .99, .96).multiplyScalar(2.6) }), fin = new THREE.MeshBasicMaterial({ color: new THREE.Color(.95, .98, 1).multiplyScalar(1.6) });
  for (let k = -3; k <= 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 24), lum); m.position.set(k * 8, 16, 0); m.rotation.x = Math.PI / 2; s.add(m); }
  for (const [x, z] of [[0, -24], [0, 24], [-30, 0], [30, 0]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 1.8), fin); m.position.set(x, 4.5, z); m.lookAt(0, 4.5, 0); s.add(m); }
  return s;
}

// n. 4 · grading prima di OutputPass (immagine lineare HDR): contrasto in log attorno a 0,18, saturazione +3 %, ombre appena fredde e
// luci appena calde, vignetta leggera. I colori già saturi (verde Biesse, rosso RiFRA, arancio delle scaffalature) non cambiano tinta.
// Grana (Koi Pond Garden, composite finale: «grain 0.01» animata col tempo): rumore per pixel molto leggero, moltiplicativo e più forte
// nei mezzitoni, che toglie le bande nelle sfumature scure (muri antracite, cielo). Il seme è il tempo della scena: nel video è deterministico.
export const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uContrasto: { value: 1.05 }, uSat: { value: 1.03 }, uVignetta: { value: .15 }, uGrana: { value: .018 }, uTempo: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uContrasto, uSat, uVignetta, uGrana, uTempo; varying vec2 vUv;
    float h12( vec2 p ) { vec3 q = fract( vec3( p.xyx ) * .1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }
    void main() { vec4 c = texture2D( tDiffuse, vUv ); vec3 x = max( c.rgb, vec3( 1e-5 ) );
      float mx = max( max( x.r, x.g ), x.b ), mn = min( min( x.r, x.g ), x.b ), prot = smoothstep( .35, .7, ( mx - mn ) / mx );
      x = .18 * exp2( log2( x / .18 ) * uContrasto );
      float l = dot( x, vec3( .2126, .7152, .0722 ) ); x = mix( vec3( l ), x, mix( uSat, 1.0, prot ) );
      vec3 tono = mix( vec3( .975, .99, 1.035 ), vec3( 1.025, 1.0, .972 ), smoothstep( 0.0, .6, l / ( l + .18 ) ) ); x *= mix( tono, vec3( 1.0 ), prot );
      vec2 d = vUv - .5; x *= 1.0 - uVignetta * smoothstep( .15, .6, dot( d, d ) * 2.0 );
      float lg = l / ( l + .18 ); x *= 1.0 + ( h12( gl_FragCoord.xy + fract( uTempo * 13.7 ) * 311.0 ) - .5 ) * 2.0 * uGrana * ( .35 + 2.6 * lg * ( 1.0 - lg ) );
      gl_FragColor = vec4( x, c.a ); }`,
};

// n. 3 e n. 7 · terreno: occlusione di contatto calcolata una volta dall'alto (aloni sotto macchine, auto e al piede dei muri, anche dove
// GTAO è spento), variazione di tono a 7 e 23 m che rompe la ripetizione delle texture, tracce leggere di muletto e carrelli nei corridoi.
export const TERRA = { uRumore: { value: null }, uAOTerra: { value: null }, uAOMin: { value: new THREE.Vector2() }, uAOSize: { value: new THREE.Vector2(1, 1) }, uAOK: { value: 0 },
  uSporco: { value: null }, uSpMin: { value: new THREE.Vector2(0, 0) }, uSpSize: { value: new THREE.Vector2(70.9, 40.6) } };
export function patchTerra(mats) {
  const bianca = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); bianca.needsUpdate = true;
  TERRA.uAOTerra.value = bianca; TERRA.uSporco.value = tracceTerra();
  // rumore di valore in una texture 64 × 64 ripetuta (2 letture invece di 8 seni per pixel)
  const rd = new Uint8Array(64 * 64 * 4); for (let i = 0; i < rd.length; i++) rd[i] = rnd() * 255;
  const rt = new THREE.DataTexture(rd, 64, 64); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.magFilter = rt.minFilter = THREE.LinearFilter; rt.needsUpdate = true; TERRA.uRumore.value = rt;
  // uVar (per materiale, userData.rfVar): forza della variazione; 0,1 = come prima del 02/10, più un terzo strato a ~64 m
  for (const m of mats) { m.onBeforeCompile = s => { Object.assign(s.uniforms, TERRA); s.uniforms.uVar = { value: m.userData.rfVar ?? .1 };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWPos; uniform sampler2D uAOTerra, uSporco, uRumore; uniform vec2 uAOMin, uAOSize, uSpMin, uSpSize; uniform float uAOK, uVar;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
	{ float v = .5 * texture2D( uRumore, vWPos.xz / 448.0 ).r + .5 * texture2D( uRumore, vWPos.xz / 1472.0 + .37 ).g, v3 = texture2D( uRumore, vWPos.xz / 4096.0 + .71 ).b;
	  diffuseColor.rgb *= 1.0 + uVar * ( v - .6 + .8 * ( v3 - .5 ) );
	  vec2 su = ( vWPos.xz - uSpMin ) / uSpSize; if ( su.x > 0.0 && su.x < 1.0 && su.y > 0.0 && su.y < 1.0 ) diffuseColor.rgb *= texture2D( uSporco, su ).rgb; }`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
	{ vec2 au = ( vWPos.xz - uAOMin ) / uAOSize; float aoT = 1.0; if ( au.x > 0.0 && au.x < 1.0 && au.y > 0.0 && au.y < 1.0 ) aoT = texture2D( uAOTerra, vec2( au.x, 1.0 - au.y ) ).r;
	  aoT = mix( 1.0, aoT, uAOK ); reflectedLight.indirectDiffuse *= aoT; reflectedLight.indirectSpecular *= aoT; reflectedLight.directDiffuse *= mix( 1.0, aoT, .5 ); }`);
  }; m.customProgramCacheKey = () => 'rf-terra'; }
}
// tracce a terra nel capannone (moltiplicativa, quasi bianca): ruote del muletto lungo il corridoio del magazzino (z 10,3),
// carrelli nei corridoi E–O (z 23,4 e 33,3) e nel corridoio centrale; RiFRA è una fabbrica pulita, quindi appena accennate
function tracceTerra() {
  const W = 1024, H = 586, k = W / 70.9, [c, g] = canvas(W, H); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.filter = 'blur(2px)';
  const riga = (x0, z0, x1, z1, a, lw) => { g.strokeStyle = `rgba(150,146,138,${a})`; g.lineWidth = lw * k; g.beginPath(); g.moveTo(x0 * k, z0 * k); g.lineTo(x1 * k, z1 * k); g.stroke(); };
  for (const d of [-.55, .55]) { riga(12, 10.3 + d, 66, 10.3 + d, .16, .22); riga(9, 23.4 + d * .7, 66, 23.4 + d * .7, .1, .16); riga(9, 33.3 + d * .7, 60, 33.3 + d * .7, .08, .16); riga(41.3 + d * .7, 13, 41.3 + d * .7, 33, .08, .16); }
  g.filter = 'blur(10px)'; for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(160,156,148,${.04 + rnd() * .06})`; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 20 + rnd() * 60, 10 + rnd() * 40, rnd() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// occlusione di contatto dall'alto: una camera ortografica disegna l'altezza della superficie più alta (fino a 2,2 m) su tutto il lotto,
// due passaggi di sfocatura gaussiana (~0,5 m) danno quanto «pieno» c'è attorno a ogni punto del terreno. Una volta, all'avvio.
export function bakeAOTerra(renderer, scene, nascondi, area = { x0: -8, z0: -6, x1: 102, z1: 58 }, res = 2048) {
  const W = area.x1 - area.x0, D = area.z1 - area.z0, w = res, h = Math.round(res * D / W), opt = { format: THREE.RedFormat, type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
  const rtA = new THREE.WebGLRenderTarget(w, h, opt), rtB = new THREE.WebGLRenderTarget(w, h, { ...opt, depthBuffer: false });
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, D / 2, -D / 2, 1, 80); cam.position.set(area.x0 + W / 2, 60, area.z0 + D / 2); cam.up.set(0, 0, -1); cam.lookAt(cam.position.x, 0, cam.position.z); cam.updateMatrixWorld();
  const alt = new THREE.ShaderMaterial({ vertexShader: 'varying float vY; void main() { vec4 p = vec4( position, 1.0 );\n#ifdef USE_INSTANCING\n p = instanceMatrix * p;\n#endif\n vec4 w = modelMatrix * p; vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'varying float vY; void main() { gl_FragColor = vec4( clamp( ( vY - .04 ) / 2.2, 0.0, 1.0 ), 0.0, 0.0, 1.0 ); }', side: THREE.DoubleSide });
  const stato = nascondi.map(o => o.visible), bg = scene.background, fog = scene.fog, prima = renderer.getRenderTarget(), cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
  nascondi.forEach(o => { o.visible = false; }); scene.background = null; scene.fog = null; scene.overrideMaterial = alt; const sm = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x000000, 1); renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(scene, cam);
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; nascondi.forEach((o, i) => { o.visible = stato[i]; }); renderer.shadowMap.autoUpdate = sm;
  const blur = (dir, fin) => new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: dir } }, vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
    fragmentShader: `uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main() { float s = 0.0, ws = 0.0; for ( int i = -12; i <= 12; i ++ ) { float wi = exp( -float( i * i ) / 50.0 ); s += texture2D( t, vUv + d * float( i ) ).r * wi; ws += wi; } s /= ws;
      ${fin ? 'gl_FragColor = vec4( 1.0 - .72 * smoothstep( 0.0, .85, s ), 0.0, 0.0, 1.0 );' : 'gl_FragColor = vec4( s, 0.0, 0.0, 1.0 );'} }`, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), sc = new THREE.Scene(); sc.add(quad); const oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad.material = blur(new THREE.Vector2(1.6 / w, 0), false); quad.material.uniforms.t.value = rtA.texture; renderer.setRenderTarget(rtB); renderer.render(sc, oc);
  quad.material = blur(new THREE.Vector2(0, 1.6 / h), true); quad.material.uniforms.t.value = rtB.texture; renderer.setRenderTarget(rtA); renderer.render(sc, oc);
  renderer.setRenderTarget(prima); renderer.setClearColor(cc, ca); rtB.dispose();
  TERRA.uAOTerra.value = rtA.texture; TERRA.uAOMin.value.set(area.x0, area.z0); TERRA.uAOSize.value.set(W, D); TERRA.uAOK.value = 1;
  return rtA;
}
