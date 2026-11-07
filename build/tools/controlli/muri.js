// foto ravvicinate dei muri esterni: node controlli/muri.js <cartella> [query]
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const [OUT, q] = process.argv.slice(2);
const VISTE = { sud: [[42, 4, 40], [58, 11, 72]], sudVicino: [[40, 3, 40.6], [44, 3.5, 49]], est: [[70, 4, 24], [102, 11, 36]], nord: [[22, 5, 1], [34, 13, -34]], ovest: [[0, 4, 22], [-28, 9, 38]] };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('http://127.0.0.1:8767/3d/index.html' + (q || '')); await p.waitForFunction(() => window.__rf, null, { timeout: 60000 }); await p.waitForTimeout(4000);
  for (const [n, [t, pos]] of Object.entries(VISTE)) { await p.evaluate(([t, pos]) => window.__rf.guarda(t, pos), [t, pos]); await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/${n}.png` }); }
  console.log(errs.length ? errs.join('\n') : 'nessun errore'); await b.close();
})();
