// Esporta l'«involucro» della fabbrica (tetto a volte, lucernari, linea rossa, muri di facciata a tutta altezza, finestre e vetrate dei
// lati verso la camera, primo piano degli uffici) per la versione Blender. Proprietario: agente del realismo (01/10).
// Perché: blender/scena/scena.json è la vista «casa di bambole» della tavola (tetto tolto, muri verso la camera abbassati a 1,3 m),
// che va bene per la tavola ma non per gli esterni e per gli interni ad altezza d'occhio (cielo al posto del soffitto).
// Come: nella stessa sessione della pagina si fotografa lo stato con il tetto tolto (A) e quello con il tetto al suo posto (B);
// si esportano solo le mesh nuove in B o con una matrice diversa (i muri rialzati). Per queste ultime si salva anche il riquadro
// nel mondo dello stato A, così importa.py riconosce in scena.json il muro basso corrispondente e lo mette nella collezione «sezione».
// Non tocca la pagina né i sorgenti 3d/js: legge soltanto. Server attivo su 8767 (vedi CLAUDE.md).
// uso (dalla cartella del progetto): node blender/realismo_involucro.js blender/scena
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/../build/tools'] }));
const fs = require('fs'), path = require('path');
const [OUT = path.join(__dirname, 'scena')] = process.argv.slice(2);
(async () => {
  const TEX = path.join(OUT, 'tex_involucro'); fs.mkdirSync(TEX, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8767/3d/index.html'); await p.waitForFunction(() => window.__rf, null, { timeout: 60000 });
  await p.waitForTimeout(7000);                                  // apertura: dopo 2,6 s il tetto si alza (1,6 s): stato A = tavola
  const istantanea = () => p.evaluate(() => {
    const { scene } = window.__rf; scene.updateMatrixWorld(true); const out = {};
    const visibile = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    scene.traverse(o => { if (!o.isMesh || o.userData.persone || !visibile(o) || !o.geometry || !o.geometry.attributes.position) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      out[o.uuid] = { M: o.matrixWorld.elements.slice(), bb: [bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z] }; });
    return out; });
  const A = await istantanea();
  await p.evaluate(() => document.getElementById('roof').click());   // «Metti il tetto»: interagito, il giro automatico non lo rialza più
  await p.evaluate(() => window.__rf.tetto(0)); await p.waitForTimeout(4000);
  const dati = await p.evaluate(A => {
    const { scene } = window.__rf; scene.updateMatrixWorld(true);
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
    const diverso = (a, b) => a.some((v, i) => Math.abs(v - b[i]) > 1e-4);
    scene.traverse(o => {
      if (!o.isMesh || o.userData.persone || !visibile(o) || !o.geometry || !o.geometry.attributes.position) return;
      const prima = A[o.uuid]; if (prima && !diverso(prima.M, o.matrixWorld.elements)) return;   // già in scena.json così com'è
      const g = o.geometry, mats_ = Array.isArray(o.material) ? o.material : [o.material];
      if (mats_.some(m => !m || m.isShaderMaterial || m.isPointsMaterial)) return;
      const n = g.attributes.position.count, idx = g.index ? Array.from(g.index.array) : null;
      const attr = k => g.attributes[k] ? Float32Array.from({ length: g.attributes[k].count * g.attributes[k].itemSize }, (_, i) => g.attributes[k].array[i]) : null;
      const matrici = o.isInstancedMesh ? Array.from({ length: o.count }, (_, i) => { const m = o.matrixWorld.clone(); const mi = o.matrixWorld.clone(); o.getMatrixAt(i, mi); return m.multiply(mi); }) : [o.matrixWorld];
      const gruppi = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.length : n, materialIndex: 0 }];
      const icol = o.isInstancedMesh && o.instanceColor;
      matrici.forEach((M, k) => mesh.push({ id: o.uuid + (o.isInstancedMesh ? '_' + k : ''), din: mobile(o), nome: (o.name || o.parent?.name || o.type) + (o.isInstancedMesh ? '_' + k : ''), M: M.elements.slice(),
        basso: prima ? prima.bb : null,
        pos: b64(attr('position')), nor: g.attributes.normal ? b64(attr('normal')) : null, uv: g.attributes.uv ? b64(attr('uv')) : null,
        col: g.attributes.color ? b64(attr('color')) : null, colN: g.attributes.color ? g.attributes.color.itemSize : 0, rm: g.attributes.rm ? b64(attr('rm')) : null,
        idx: idx ? b64(Uint32Array.from(idx)) : null, gruppi: gruppi.map(q => [q.start, q.count, mats_[q.materialIndex ?? 0] ? matInfo(mats_[q.materialIndex ?? 0]) : matInfo(mats_[0])]),
        tinta: icol ? [o.instanceColor.array[k * 3], o.instanceColor.array[k * 3 + 1], o.instanceColor.array[k * 3 + 2]] : null, ombra: o.castShadow }));
    });
    return { mesh, mats, tex };
  }, A);
  for (const [id, t] of Object.entries(dati.tex)) { if (t.url) fs.writeFileSync(path.join(TEX, id + '.png'), Buffer.from(t.url.split(',')[1], 'base64')); t.file = t.url ? 'tex_involucro/' + id + '.png' : null; delete t.url; }
  fs.writeFileSync(path.join(OUT, 'involucro.json'), JSON.stringify(dati));
  console.log('involucro: mesh', dati.mesh.length, '(rialzate', dati.mesh.filter(m => m.basso).length + ') materiali', Object.keys(dati.mats).length, 'texture', Object.keys(dati.tex).length, errs.length ? 'ERRORI ' + errs.join(' | ') : 'nessun errore');
  await b.close();
})();
