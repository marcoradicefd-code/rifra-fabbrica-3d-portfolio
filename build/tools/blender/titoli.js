// Registra i titoli dello spot (blender/titoli/titoli.html) come PNG trasparenti, uno per fotogramma, in blender/titoli/png/.
// uso: node blender/titoli.js [fps=30] [pagina=motion.html] [cartella=motion-png] [tempi separati da virgola: solo quelli, per le prove]
// (da build/tools) — legge blender/titoli/titoli.json e il logo build/brand/logo-bianco.svg
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..', '..'), D = path.join(R, 'blender', 'titoli'), FPS = +(process.argv[2] || 30);
const PAGINA = process.argv[3] || 'motion.html', OUT = path.join(D, process.argv[4] || 'motion-png'), SOLO = process.argv[5] ? process.argv[5].split(',').map(Number) : null;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const shot = JSON.parse(fs.readFileSync(path.join(D, 'titoli.json'), 'utf8')), logo = fs.readFileSync(path.join(R, 'build/brand/logo-bianco.svg'), 'utf8');
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto('file://' + path.join(D, PAGINA)); await p.evaluate(([s, l]) => prepara(s, l), [shot, logo]);
  const N = Math.round(shot[shot.length - 1].t1 * FPS);
  const fot = SOLO ? SOLO.map(t => Math.round(t * FPS) + 1) : Array.from({ length: N }, (_, i) => i + 1);
  for (const f of fot) { await p.evaluate(t => vai(t), (f - 1) / FPS);
    await p.screenshot({ path: path.join(OUT, `t_${String(f).padStart(4, '0')}.png`), omitBackground: true }); }
  console.log('titoli', N, 'fotogrammi in', OUT); await b.close();
})();
