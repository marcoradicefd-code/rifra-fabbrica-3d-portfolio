// foto della versione 3D: node controlli/shot3d.js <cartella> [reparti 1,2,…] [attesa-ms] [query]
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const [OUT, list, wait, q] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()) });
  await p.goto('http://127.0.0.1:8767/3d/index.html' + (q || '')); await p.waitForFunction(() => window.__rf, null, { timeout: 60000 });
  await p.waitForTimeout(+(wait || 2000)); await p.screenshot({ path: `${OUT}/esterno.png` });
  await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/tavola.png` });
  const info = await p.evaluate(() => ({ ...window.__rf.info(), gl: window.__rf.renderer.getContext().getParameter(0x1F01) }));
  for (const n of (list || '').split(',').filter(Boolean)) { await p.evaluate(i => window.__rf.jump(i, false), +n - 1); await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/r${n.padStart(2, '0')}.png` }); }
  const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  console.log(JSON.stringify({ info, fps, livello: await p.evaluate(() => window.__rf.livello()) }));
  console.log(errs.length ? errs.slice(0, 15).join('\n') : 'nessun errore'); await b.close();
})();
