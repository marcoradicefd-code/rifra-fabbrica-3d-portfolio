// la pagina 3D finale funziona senza rete? (blocca ogni richiesta esterna) node controlli/offline3d.js <file.png> [pagina, predefinita come-nasce-una-cucina-rifra-3d.html]
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
(async () => { const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] }); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const ext = []; await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('http://127.0.0.1')) return r.continue(); ext.push(u); return r.abort(); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8767/' + (process.argv[3] || 'come-nasce-una-cucina-rifra-3d.html')); await p.waitForFunction(() => window.__rf, null, { timeout: 60000 }); await p.waitForTimeout(6000);
  await p.screenshot({ path: process.argv[2] }); console.log('richieste esterne:', ext.length ? ext : 'nessuna'); console.log(errs.length ? errs.join('\n') : 'nessun errore'); await b.close() })();
