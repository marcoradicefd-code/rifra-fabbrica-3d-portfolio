const { chromium } = require('/Volumes/PortableSSD/01_Clienti/Rifra/Produzione-animata/build/tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8767/3d/index.html?video=1'); await p.waitForFunction(() => window.__rf && window.__video, null, { timeout: 60000 });
  const r = await p.evaluate(async () => {
    const THREE = await import('three'); const P = await import('/3d/js/persone.js');
    const { scene } = window.__rf; const out = {};
    out.persone = P.PERSONE.length;
    const ims = []; scene.traverse(o => { if (o.isInstancedMesh) ims.push({ n: o.name, cnt: o.count, cap: o.instanceMatrix.count, v: o.geometry.attributes.position.count, pers: !!o.userData.persone, mat: o.material.type, par: o.parent && o.parent.type }); });
    out.ims = ims;
    let anim = 0; scene.traverse(o => { if (o.userData.anim) anim++; }); out.anim = anim;
    out.uuidSame = THREE.MathUtils.generateUUID();
    out.st0 = Object.keys(P.PERSONE[0]);
    return out;
  });
  console.log(JSON.stringify(r, null, 1).slice(0, 6000)); console.log(errs);
  await b.close();
})();
