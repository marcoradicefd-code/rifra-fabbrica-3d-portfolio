// Esporta la scena three.js della pagina 3D per Blender, senza librerie esterne: per ogni mesh visibile geometria in coordinate
// del mondo (posizioni, normali, uv, colori per vertice e rugosità/metallo dell'atlante), materiale e texture disegnate dal codice.
// uso: node blender/esporta-scena.js <cartella-uscita> [tappa 1–12 | 0 = tavola] [secondi di attesa]
// Le persone (InstancedMesh con skinning su GPU) per ora non si esportano: vanno rifatte con le armature di Blender.
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const fs = require('fs'), path = require('path');
const [OUT, TAPPA = '0', ATTESA = '4'] = process.argv.slice(2);
(async () => {
  fs.mkdirSync(path.join(OUT, 'tex'), { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8767/3d/index.html'); await p.waitForFunction(() => window.__rf, null, { timeout: 60000 });
  if (+TAPPA > 0) await p.evaluate(i => window.__rf.jump(i, false), +TAPPA - 1);
  await p.waitForTimeout(+ATTESA * 1000);
  const dati = await p.evaluate(() => {
    const { scene, camera } = window.__rf, T = window.__rf.THREE || scene.constructor;   // (THREE non è globale: si usano i metodi degli oggetti)
    const b64 = a => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    const tex = {}, mats = {}, mesh = [];
    const texInfo = t => { if (!t || !t.image) return null; if (!tex[t.uuid]) { let url = null; try { const im = t.image; if (im.toDataURL) url = im.toDataURL('image/png');
        else if (im.width && im.getContext === undefined && im.data === undefined) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); url = c.toDataURL('image/png'); } } catch (e) {}
      tex[t.uuid] = { url, srgb: t.colorSpace === 'srgb' }; } return { id: t.uuid, rep: [t.repeat.x, t.repeat.y], off: [t.offset.x, t.offset.y] }; };
    const matInfo = m => { if (!mats[m.uuid]) mats[m.uuid] = { nome: m.name || m.type, tipo: m.type, colore: m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1],
      rug: m.roughness ?? .6, met: m.metalness ?? 0, emi: m.emissive ? [m.emissive.r, m.emissive.g, m.emissive.b] : [0, 0, 0], emiI: m.emissiveIntensity ?? 1,
      opac: m.opacity, trasp: !!m.transparent, vc: !!m.vertexColors, atlante: !!(m.userData && m.userData.atlante), doppio: m.side === 2,
      map: texInfo(m.map), nmap: texInfo(m.normalMap), nscala: m.normalScale ? m.normalScale.x : 1, base: m.isMeshBasicMaterial || false }; return m.uuid; };
    const mobile = o => { for (let q = o; q; q = q.parent) if (q.userData && q.userData.anim) return true; return !!o.isInstancedMesh; };
    const visibile = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (!o.isMesh || o.userData.persone || !visibile(o) || !o.geometry || !o.geometry.attributes.position) return;
      const g = o.geometry, mats_ = Array.isArray(o.material) ? o.material : [o.material];
      if (mats_.some(m => !m || m.isShaderMaterial || m.isPointsMaterial)) return;
      const n = g.attributes.position.count, idx = g.index ? Array.from(g.index.array) : null;
      const attr = k => g.attributes[k] ? Float32Array.from({ length: g.attributes[k].count * g.attributes[k].itemSize }, (_, i) => g.attributes[k].array[i]) : null;
      // le InstancedMesh (ante sul nastro, auto, alberi…) diventano una mesh per istanza; il resto una sola
      const matrici = o.isInstancedMesh ? Array.from({ length: o.count }, (_, i) => { const m = o.matrixWorld.clone(); const mi = o.matrixWorld.clone(); o.getMatrixAt(i, mi); return m.multiply(mi); }) : [o.matrixWorld];
      const gruppi = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.length : n, materialIndex: 0 }];
      const icol = o.isInstancedMesh && o.instanceColor;
      const din = mobile(o);
      matrici.forEach((M, k) => mesh.push({ id: o.uuid + (o.isInstancedMesh ? '_' + k : ''), din, nome: (o.name || o.parent?.name || o.type) + (o.isInstancedMesh ? '_' + k : ''), M: M.elements.slice(),
        pos: b64(attr('position')), nor: g.attributes.normal ? b64(attr('normal')) : null, uv: g.attributes.uv ? b64(attr('uv')) : null,
        col: g.attributes.color ? b64(attr('color')) : null, colN: g.attributes.color ? g.attributes.color.itemSize : 0, rm: g.attributes.rm ? b64(attr('rm')) : null,
        idx: idx ? b64(Uint32Array.from(idx)) : null, gruppi: gruppi.map(q => [q.start, q.count, mats_[q.materialIndex ?? 0] ? matInfo(mats_[q.materialIndex ?? 0]) : matInfo(mats_[0])]),
        tinta: icol ? [o.instanceColor.array[k * 3], o.instanceColor.array[k * 3 + 1], o.instanceColor.array[k * 3 + 2]] : null, ombra: o.castShadow }));
    });
    const c = camera; return { mesh, mats, tex, camera: { pos: c.position.toArray(), quat: c.quaternion.toArray(), fov: c.fov, aspect: c.aspect } };
  });
  for (const [id, t] of Object.entries(dati.tex)) { if (t.url) fs.writeFileSync(path.join(OUT, 'tex', id + '.png'), Buffer.from(t.url.split(',')[1], 'base64')); t.file = t.url ? 'tex/' + id + '.png' : null; delete t.url; }
  fs.writeFileSync(path.join(OUT, 'scena.json'), JSON.stringify(dati));
  console.log('mesh', dati.mesh.length, 'materiali', Object.keys(dati.mats).length, 'texture', Object.keys(dati.tex).length, errs.length ? 'ERRORI ' + errs.join(' | ') : 'nessun errore');
  await b.close();
})();
