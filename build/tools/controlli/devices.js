// fiera, telefono verticale e orizzontale. uso: node controlli/devices.js <cartella>
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
(async () => { const OUT = process.argv[2]; const b = await chromium.launch(); const errs = [];
  for (const [n, vp, q, wait] of [['fiera', { width: 1920, height: 1080 }, '?kiosk=1', 6000], ['telefono', { width: 390, height: 844 }, '', 2500], ['telefono-orizz', { width: 844, height: 390 }, '', 2500]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: n !== 'fiera' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(n + ': ' + e.message));
    await p.goto('http://127.0.0.1:8767/src.html' + q); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(wait); await p.screenshot({ path: `${OUT}/${n}.png` }); await ctx.close() }
  console.log(errs.length ? errs.join('\n') : 'nessun errore'); await b.close() })();
