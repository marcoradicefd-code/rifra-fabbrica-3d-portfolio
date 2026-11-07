// Texture procedurali «cotte» sulla GPU all'avvio (02/10, richiesta di Marco: texture più realistiche).
// Tutto disegnato dal codice (regola A1): rumore di valore periodico a più ottave (fBm) con seme fisso, celle di Voronoi, giunti.
// Un contesto WebGL2 nascosto disegna ogni texture in un riquadro, la rilegge (readPixels) e la passa a three come DataTexture
// con mipmap e anisotropia; poi il contesto viene chiuso (rilascia). Idee e misure dalla versione Blender (blender/realismo_materiali.py,
// ricerca/BLENDER-TECNICHE.md): cemento lisciato con chiazze lucide e giunti ogni 6 m, pannelli di facciata da 2,5 m chiari e PULITI
// (Marco, 30/09: niente sporco né usura), lamiera grecata del tetto con giunto beige, asfalto con inerti, autobloccanti 24 × 12, prato.
// Contro lo scintillio da lontano: contrasti moderati, dettagli più fini solo nelle mappe (che le mipmap mediano), niente righe regolari
// fitte nel colore; le altezze sono in metri, quindi le normali hanno pendenze vere.
import * as THREE from 'three';

const VS = `#version 300 es
void main() { vec2 p = vec2( gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0 ); gl_Position = vec4( p, 0.0, 1.0 ); }`;

const FS = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uRes, uSize; uniform int uOut, uMat; out vec4 o;
float PXM;   // metri per pixel
// hash intero (pcg3d): identico su ogni GPU, quindi texture deterministiche
uint hu( uvec3 v ) { v = v * 1664525u + 1013904223u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; v ^= v >> 16u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; return v.x ^ v.y ^ v.z; }
float h2( vec2 p, int s ) { return float( hu( uvec3( uvec2( ivec2( p ) + 4096 ), uint( s ) ) ) & 0xffffffu ) / 16777216.0; }
// rumore di valore periodico: p in celle, per = celle in una tessera
float vn( vec2 p, vec2 per, int s ) {
  vec2 i = floor( p ), f = p - i, u = f * f * f * ( f * ( f * 6.0 - 15.0 ) + 10.0 );
  vec2 a = mod( i, per ), b = mod( i + 1.0, per );
  return mix( mix( h2( a, s ), h2( vec2( b.x, a.y ), s ), u.x ), mix( h2( vec2( a.x, b.y ), s ), h2( b, s ), u.x ), u.y ); }
// fBm periodico: tratti più grandi di «feat» metri, ottave che dimezzano
float fbm( vec2 uv, float feat, int oct, float gain, int s ) {
  vec2 c = max( vec2( 1.0 ), floor( uSize / feat + .5 ) ); float a = 1.0, t = 0.0, n = 0.0;
  for ( int k = 0; k < 6; k ++ ) { if ( k >= oct ) break; t += a * vn( uv * c, c, s + k * 17 ); n += a; a *= gain; c *= 2.0; }
  return t / n; }
// Voronoi periodico: x = distanza dal centro più vicino (in celle), y = valore casuale della cella
vec2 cel( vec2 uv, float feat, int s ) {
  vec2 c = max( vec2( 1.0 ), floor( uSize / feat + .5 ) ), p = uv * c, i = floor( p ), f = p - i; float d1 = 9.0, id = 0.0;
  for ( int y = -1; y <= 1; y ++ ) for ( int x = -1; x <= 1; x ++ ) { vec2 g = vec2( x, y ), q = mod( i + g, c );
    vec2 r = g + vec2( h2( q, s ), h2( q, s + 7 ) ) - f; float d = dot( r, r ); if ( d < d1 ) { d1 = d; id = h2( q, s + 13 ); } }
  return vec2( sqrt( d1 ), id ); }
float linee( float m, float passo ) { float f = fract( m / passo ); return min( f, 1.0 - f ) * passo; }   // distanza (m) dal giunto più vicino
float giunto( float d, float w ) { return 1.0 - smoothstep( w, w + PXM, d ); }                         // 1 sul giunto, bordo antialias
float solco( float d, float w ) { return 1.0 - smoothstep( 0.0, w + PXM, d ); }                         // profilo morbido per le altezze

// ---- 0 · cemento lisciato del capannone (F 7441–7457, V): grigio con nuvole della frattazzatura, lastre da 6 m con tinta propria,
//          giunti di taglio, lucido a chiazze (rugosità .3–.7). Tessera 12 × 12 m = 2 × 2 lastre.
vec3 pavC( vec2 uv ) { vec2 m = uv * uSize; float nu = fbm( uv, 3.0, 4, .55, 1 ), me = fbm( uv, .4, 3, .5, 2 ), fi = fbm( uv, .03, 2, .5, 3 );
  float v = 1.0 + ( nu - .5 ) * .36 + ( me - .5 ) * .16 + ( fi - .5 ) * .12 + ( h2( floor( m / 6.0 ), 101 ) - .5 ) * .07;
  v *= 1.0 - .36 * giunto( min( linee( m.x, 6.0 ), linee( m.y, 6.0 ) ), .0025 );
  return vec3( .585, .58, .565 ) * v; }
float pavH( vec2 uv ) { vec2 m = uv * uSize; return -.004 * solco( min( linee( m.x, 6.0 ), linee( m.y, 6.0 ) ), .004 ) + .0025 * ( fbm( uv, .8, 3, .5, 4 ) - .5 ) + .0003 * ( fbm( uv, .03, 2, .5, 3 ) - .5 ); }
float pavR( vec2 uv ) { return clamp( .6 + ( fbm( uv, 3.0, 4, .55, 1 ) - .5 ) * .8 + ( fbm( uv, .4, 3, .5, 2 ) - .5 ) * .35, .38, .82 ); }

// ---- 1 · pannelli prefabbricati della facciata (SV, E): chiari e puliti, pannelli verticali da 2,5 m con tinta ±2 % (getti diversi),
//          giunto di 2 cm, pori fini. Tessera 20 × 7 m (8 pannelli).
vec3 facC( vec2 uv ) { vec2 m = uv * uSize;
  float v = 1.0 + ( h2( vec2( floor( m.x / 2.5 ), 0.0 ), 201 ) - .5 ) * .045 + ( fbm( uv, 2.0, 3, .5, 11 ) - .5 ) * .06 + ( fbm( uv, .04, 2, .5, 12 ) - .5 ) * .06;
  v *= 1.0 - .26 * giunto( linee( m.x, 2.5 ), .008 );
  return vec3( .839, .835, .816 ) * v; }
float facH( vec2 uv ) { vec2 m = uv * uSize; return -.008 * solco( linee( m.x, 2.5 ), .01 ) + .002 * ( fbm( uv, 1.0, 3, .5, 13 ) - .5 ) + .0005 * ( fbm( uv, .04, 2, .5, 12 ) - .5 ); }

// ---- 2 · lamiera grecata delle volte (E): grigio chiaro, onde ogni 20 cm lungo la volta (solo nelle normali), lastre da 1 m con tinta
//          propria, giunto trasversale beige ogni 6 m. u = arco della volta (3,35 m), v = lunghezza (6 m).
vec3 tetC( vec2 uv ) { vec2 m = uv * uSize;
  float v = 1.0 + ( h2( vec2( floor( m.y ), 0.0 ), 301 ) - .5 ) * .035 + ( fbm( uv, 1.5, 3, .5, 21 ) - .5 ) * .06 + ( fbm( uv, .05, 2, .5, 22 ) - .5 ) * .04;
  v *= 1.0 - .05 * giunto( linee( m.y, 1.0 ), .006 );
  vec3 c = vec3( .843, .835, .812 ) * v;
  return mix( c, vec3( .745, .667, .549 ), .6 * ( 1.0 - smoothstep( .09, .09 + PXM * 1.5, abs( m.y - 3.0 ) ) ) ); }
float tetH( vec2 uv ) { return .006 * sin( uv.y * uSize.y * 6.2831853 / .2 ); }

// ---- 3 · asfalto della via (SV): grana fine, inerti chiari radi, rappezzi larghi appena accennati. Tessera 8 m.
vec3 asfC( vec2 uv ) { float gr = fbm( uv, .02, 2, .5, 41 ); vec2 ce = cel( uv, .035, 44 );
  float pietra = step( .82, ce.y ) * ( 1.0 - smoothstep( .22, .4, ce.x ) );
  float v = 1.0 + ( gr - .5 ) * .30 + ( fbm( uv, 4.0, 3, .5, 42 ) - .5 ) * .10 + ( fbm( uv, .8, 3, .5, 43 ) - .5 ) * .08 + pietra * .2;
  return vec3( .337, .345, .353 ) * v; }
float asfH( vec2 uv ) { vec2 ce = cel( uv, .035, 44 ); return .0015 * ( fbm( uv, .02, 2, .5, 41 ) - .5 ) + .0008 * step( .82, ce.y ) * ( 1.0 - smoothstep( .22, .4, ce.x ) ); }

// ---- 4 · autobloccanti dei piazzali (F 7465, SV, E): masselli ~24 × 12 cm a correre (34 × 68 in 8 m), tinta per massello ±7 %,
//          fuga sottile e smusso. Fughe a contrasto moderato (niente moiré da lontano).
vec4 autB( vec2 uv ) { vec2 m = uv * uSize; float bw = uSize.x / 34.0, bh = uSize.y / 68.0, r = floor( m.y / bh ), off = mod( r, 2.0 ) * .5 * bw;
  float c = mod( floor( ( m.x + off ) / bw ), 34.0 ); return vec4( min( linee( m.x + off, bw ), linee( m.y, bh ) ), c, r, 0.0 ); }
vec3 autC( vec2 uv ) { vec4 b = autB( uv ); float id = h2( b.yz, 51 ), t = h2( b.yz, 54 ) - .5;
  float v = 1.0 + ( id - .5 ) * .14 + ( fbm( uv, .03, 2, .5, 52 ) - .5 ) * .14 + ( fbm( uv, 3.0, 3, .5, 53 ) - .5 ) * .08;
  return vec3( .565 * ( 1.0 + t * .03 ), .553, .53 * ( 1.0 - t * .03 ) ) * v * ( 1.0 - .3 * giunto( b.x, .0025 ) ); }
float autH( vec2 uv ) { return -.004 * solco( autB( uv ).x, .006 ) + .0005 * ( fbm( uv, .03, 2, .5, 52 ) - .5 ); }

// ---- 5 · prato (E): due verdi a chiazze, zone più secche, puntinato dei fili; un po' più vivo di prima ma non brillante. Tessera 24 m.
//          Chiazze grandi a basso contrasto: la variazione larga la dà patchTerra in coordinate del mondo (niente griglia di macchie da lontano).
vec3 praC( vec2 uv ) { float g = fbm( uv, 3.0, 4, .55, 31 ), me = fbm( uv, .6, 3, .5, 32 ), fi = fbm( uv, .05, 2, .5, 33 );
  vec3 c = mix( vec3( .38, .455, .27 ), vec3( .42, .49, .30 ), smoothstep( .3, .7, g ) );
  c = mix( c, vec3( .52, .52, .37 ), .3 * smoothstep( .58, .78, me ) );
  return c * ( 1.0 + ( fi - .5 ) * .28 ); }
float praH( vec2 uv ) { return .003 * ( fbm( uv, .05, 2, .5, 33 ) - .5 ) + .004 * ( fbm( uv, .6, 3, .5, 32 ) - .5 ); }

// ---- 6 · MDF grezzo: fibre fini e velature calde. Tessera 2 m.
vec3 mdfC( vec2 uv ) { return vec3( .78, .647, .486 ) * ( 1.0 + ( fbm( uv, .006, 2, .5, 61 ) - .5 ) * .12 + ( fbm( uv, .3, 3, .5, 62 ) - .5 ) * .06 ); }
float mdfH( vec2 uv ) { return .0002 * ( fbm( uv, .006, 2, .5, 61 ) - .5 ); }

// ---- 7 · tetto piano a quadrotti crema (E retro): lastre da 1 m con tinta propria, fuga, velature. Tessera 8 m.
vec3 quaC( vec2 uv ) { vec2 m = uv * uSize;
  float v = 1.0 + ( h2( floor( m ), 71 ) - .5 ) * .08 + ( fbm( uv, 1.5, 3, .5, 72 ) - .5 ) * .10 + ( fbm( uv, .05, 2, .5, 73 ) - .5 ) * .08;
  return vec3( .851, .812, .694 ) * v * ( 1.0 - .18 * giunto( min( linee( m.x, 1.0 ), linee( m.y, 1.0 ) ), .006 ) ); }

// ---- 8 · rumore per l'atlante (prim.js): r chiazze ~0,8 m, g ~12 cm, b righe della spazzolatura (lunghe 30 cm, fini 1 cm), a grana 2 cm.
vec4 rumC( vec2 uv ) { vec2 c = floor( uSize / vec2( .3, .012 ) + .5 );
  float b = .65 * vn( uv * c, c, 83 ) + .35 * vn( uv * c * 2.0, c * 2.0, 84 );
  vec4 r = vec4( fbm( uv, .8, 3, .5, 81 ), fbm( uv, .12, 3, .5, 82 ), b, fbm( uv, .02, 2, .5, 85 ) );
  return clamp( ( r - .5 ) * vec4( 2.4, 2.4, 2.0, 2.4 ) + .5, 0.0, 1.0 ); }

vec4 colore( vec2 uv ) { switch ( uMat ) { case 0: return vec4( pavC( uv ), 1.0 ); case 1: return vec4( facC( uv ), 1.0 ); case 2: return vec4( tetC( uv ), 1.0 );
  case 3: return vec4( asfC( uv ), 1.0 ); case 4: return vec4( autC( uv ), 1.0 ); case 5: return vec4( praC( uv ), 1.0 ); case 6: return vec4( mdfC( uv ), 1.0 );
  case 7: return vec4( quaC( uv ), 1.0 ); case 8: return rumC( uv ); } return vec4( 1.0 ); }
float altezza( vec2 uv ) { switch ( uMat ) { case 0: return pavH( uv ); case 1: return facH( uv ); case 2: return tetH( uv ); case 3: return asfH( uv );
  case 4: return autH( uv ); case 5: return praH( uv ); case 6: return mdfH( uv ); } return 0.0; }
float rugosita( vec2 uv ) { switch ( uMat ) { case 0: return pavR( uv ); } return 1.0; }

void main() { vec2 px = 1.0 / uRes, uv = gl_FragCoord.xy * px; PXM = max( uSize.x * px.x, uSize.y * px.y );
  if ( uOut == 1 ) { float dx = ( altezza( uv + vec2( px.x, 0.0 ) ) - altezza( uv - vec2( px.x, 0.0 ) ) ) / ( 2.0 * px.x * uSize.x );
    float dy = ( altezza( uv + vec2( 0.0, px.y ) ) - altezza( uv - vec2( 0.0, px.y ) ) ) / ( 2.0 * px.y * uSize.y );
    o = vec4( normalize( vec3( -dx, -dy, 1.0 ) ) * .5 + .5, 1.0 ); return; }
  // colore e rugosità: 4 campioni per pixel (niente scalini sui giunti)
  vec4 s = vec4( 0.0 ); for ( int j = 0; j < 2; j ++ ) for ( int i = 0; i < 2; i ++ ) { vec2 q = uv + ( vec2( i, j ) - .5 ) * .5 * px; s += uOut == 0 ? colore( q ) : vec4( vec3( rugosita( q ) ), 1.0 ); }
  o = s * .25; }`;

const MAT = { pavimento: 0, facciata: 1, tetto: 2, asfalto: 3, autobloccanti: 4, prato: 5, mdf: 6, quadrotti: 7, rumore: 8 };
let gl = null, U = null;
function contesto() {
  if (gl) return gl;
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const g = c.getContext('webgl2', { antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!g) return null;
  const sh = (t, s) => { const o = g.createShader(t); g.shaderSource(o, s); g.compileShader(o); if (!g.getShaderParameter(o, g.COMPILE_STATUS)) throw new Error('texture.js: ' + g.getShaderInfoLog(o)); return o; };
  const p = g.createProgram(); g.attachShader(p, sh(g.VERTEX_SHADER, VS)); g.attachShader(p, sh(g.FRAGMENT_SHADER, FS)); g.linkProgram(p);
  if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error('texture.js: ' + g.getProgramInfoLog(p));
  g.useProgram(p); g.bindVertexArray(g.createVertexArray()); g.enable(g.SCISSOR_TEST);
  U = Object.fromEntries(['uRes', 'uSize', 'uOut', 'uMat'].map(k => [k, g.getUniformLocation(p, k)]));
  return (gl = g);
}
// chiude il contesto nascosto (dopo aver creato tutte le texture); se servisse di nuovo si riapre da solo
export function rilascia() { if (gl) { const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); gl = null; } }

export const STAT = { ms: 0, byte: 0, det: [] };   // tempo di cottura e memoria GPU stimata (con le mipmap), per window.__rfTex
// disegna un'uscita (0 colore, 1 normali, 2 rugosità) a w × h e la rilegge; a strisce di 256 righe (niente disegni troppo lunghi per la GPU)
function cuoci(mat, out, w, h, size) {
  const g = contesto(), px = new Uint8Array(w * h * 4);
  if (!g) { for (let i = 0; i < px.length; i += 4) px.set(out === 1 ? [128, 128, 255, 255] : [200, 200, 200, 255], i); return px; }   // senza WebGL2: tinta piatta
  const t = g.createTexture(); g.bindTexture(g.TEXTURE_2D, t); g.texStorage2D(g.TEXTURE_2D, 1, g.RGBA8, w, h);
  const fb = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, fb); g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, t, 0);
  g.viewport(0, 0, w, h); g.uniform2f(U.uRes, w, h); g.uniform2f(U.uSize, size[0], size[1]); g.uniform1i(U.uOut, out); g.uniform1i(U.uMat, MAT[mat]);
  for (let y = 0; y < h; y += 256) { g.scissor(0, y, w, 256); g.drawArrays(g.TRIANGLES, 0, 3); }
  g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, px);
  g.deleteFramebuffer(fb); g.deleteTexture(t); return px;
}
function dati(px, w, h, srgb, aniso) {
  const t = new THREE.DataTexture(px, w, h); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.onUpdate = () => { t.image.data = null; };   // caricata sulla GPU: la copia in memoria non serve più
  t.needsUpdate = true; STAT.byte += w * h * 4 * 4 / 3; return t;
}
const dim = d => Array.isArray(d) ? d : [d, d];
// texture di un materiale: { map, normalMap?, roughnessMap? }. o: { size: [m, m], c, n, r: risoluzioni (lato o [w, h]), aniso }
export function cuociMateriale(nome, o) {
  const t0 = performance.now(), aniso = o.aniso || 8, r = {};
  const fai = (out, d, srgb) => { const [w, h] = dim(d), t1 = performance.now(), px = cuoci(nome, out, w, h, o.size); STAT.det.push(nome + out + ':' + Math.round(performance.now() - t1)); return dati(px, w, h, srgb, aniso); };
  r.map = fai(0, o.c, !o.dati);
  if (o.n) r.normalMap = fai(1, o.n, false);
  if (o.r) r.roughnessMap = fai(2, o.r, false);
  STAT.ms += performance.now() - t0; return r;
}
// rumore 512 × 512 su 2 m per la micro-variazione dell'atlante (una sola, condivisa)
let _rum = null;
export function rumoreAtlante() { return _rum || (_rum = cuociMateriale('rumore', { size: [2, 2], c: 512, dati: true }).map); }
