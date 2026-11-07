// Chiamate di disegno per fotogramma (tutti i passaggi: ombre, AO, uscita) nella tavola e in ogni reparto, livello «media».
// Conta anche la quota dei reparti/macchine (gruppi con userData.reparto e il gruppo «statici» delle macchine fuori tappa) spegnendoli.
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); await ctx.addInitScript(() => { try { localStorage.setItem('rf3d-qualita', 'media'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8767/3d/index.html'); await p.waitForFunction(() => window.__rf, null, { timeout: 60000 }); await p.waitForTimeout(6000);
  const misura = () => p.evaluate(async () => { const r = window.__rf.renderer; const f = () => new Promise(res => requestAnimationFrame(res));
    const conta = async () => { let best = 0; for (let k = 0; k < 6; k++) { await f(); r.info.autoReset = false; r.info.reset(); await f(); best = Math.max(best, r.info.render.calls); r.info.autoReset = true; } return best; };
    const tot = await conta(); const miei = []; window.__rf.scene.traverse(o => { if (o.userData.reparto !== undefined || o.userData.macchineStatiche) miei.push(o); });
    miei.forEach(o => o.visible = false); const senza = await conta(); miei.forEach(o => o.visible = true); return { tot, senza, reparti: tot - senza, livello: window.__rf.livello() }; });
  console.log('tavola', JSON.stringify(await misura()));
  for (let i = 0; i < 12; i++) { await p.evaluate(i => window.__rf.jump(i, false), i); await p.waitForTimeout(3500); console.log('r' + (i + 1), JSON.stringify(await misura())); }
  console.log(errs.length ? errs.join('\n') : 'nessun errore'); await b.close();
})();
