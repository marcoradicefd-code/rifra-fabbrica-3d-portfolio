// foto rapide: tavola intera e alcuni reparti. uso: node controlli/shot1.js <cartella> [reparti separati da virgola] [stile]
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const [OUT, list, style] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(s => { try { localStorage.setItem('rf-stile', s) } catch (e) {} }, style || 'colori');
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()) });
  await p.goto('http://127.0.0.1:8767/src.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/tavola.png` });
  for (const n of (list || '').split(',').filter(Boolean)) {
    await p.locator('#idx button').nth(+n - 1).click(); await p.waitForTimeout(400);
    await p.mouse.move(1900, 60); await p.waitForTimeout(3800);
    await p.screenshot({ path: `${OUT}/r${n.padStart(2, '0')}.png` });
  }
  console.log(errs.length ? errs.join('\n') : 'nessun errore in console'); await b.close();
})();
