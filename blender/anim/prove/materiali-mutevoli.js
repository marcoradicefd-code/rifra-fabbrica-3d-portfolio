// prova: quali materiali cambiano nel tempo (colore, emissione, opacità, visibilità) — per il rapporto dell'animazione
const { chromium } = require('/Volumes/PortableSSD/01_Clienti/Rifra/Produzione-animata/build/tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('http://127.0.0.1:8767/3d/index.html?video=1'); await p.waitForFunction(() => window.__rf && window.__video, null, { timeout: 90000 });
  const r = await p.evaluate(async () => { const THREE = await import('three'); THREE.Frustum.prototype.intersectsSphere = () => true;
    const post = window.__rf.post(); post.composer.render = () => {}; window.__rf.guarda([36, 0, 22], [106, 70, 52]); window.__rf.tetto(1);
    const mats = new Map(); window.__rf.scene.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!mats.has(m)) mats.set(m, o); }); });
    const st = m => [m.color ? m.color.getHex() : 0, m.emissive ? m.emissive.getHex() : 0, +(m.emissiveIntensity ?? 0).toFixed(3), +m.opacity.toFixed(3), m.visible];
    const base = new Map([...mats.keys()].map(m => [m, JSON.stringify(st(m))])), cambia = new Set();
    for (let f = 0; f < 1501; f++) { window.__video.step(f ? 1 / 30 : 0); for (const m of mats.keys()) if (JSON.stringify(st(m)) !== base.get(m)) cambia.add(m); }
    return [...cambia].map(m => ({ nome: m.name, tipo: m.type, din: (() => { for (let q = mats.get(m); q; q = q.parent) if (q.userData.anim) return true; return false; })(), es: st(m) })); });
  console.log(JSON.stringify(r)); await b.close(); })();
