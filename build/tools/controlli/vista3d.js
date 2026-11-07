// foto da un punto qualsiasi, con l'interfaccia nascosta: node controlli/vista3d.js <png> <bersaglio x,y,z> <camera x,y,z> [attesa-ms] [query] [tempo s]
// (02/10: controllo di percorso, furgone e camion della revisione del percorso)
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const [OUT, T, C, wait, q, tempo] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8767/3d/index.html' + (q || '')); await p.waitForFunction(() => window.__rf, null, { timeout: 60000 });
  await p.addStyleTag({ content: '.card,#card,.mast,.index,.tools,#play,#motion,#style,#roof,.ctl{visibility:hidden!important}' });
  await p.evaluate(([t, c]) => { window.__rf.tetto(1); window.__rf.guarda(t, c); }, [T.split(',').map(Number), C.split(',').map(Number)]);
  if (tempo) { await p.evaluate(() => window.__rf.tempo(0)); await p.evaluate(() => { const b = document.getElementById('motion'); if (b) b.click(); }); }   // animazioni ferme
  await p.waitForTimeout(+(wait || 4000)); if (tempo) await p.evaluate(v => { window.__rf.tempo(v); }, +tempo); await p.waitForTimeout(600); await p.screenshot({ path: OUT });
  console.log(errs.length ? 'ERRORI: ' + errs.join(' | ') : 'nessun errore'); await b.close();
})();
