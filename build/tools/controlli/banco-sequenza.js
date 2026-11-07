// Sequenza di fotogrammi di un reparto sul banco (persone visibili): node controlli/banco-sequenza.js <nome> <tx,tz,az,dist,el,fov> <t1,t2,...>
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const { execFileSync } = require('child_process'); const path = require('path');
const OUT = path.join(__dirname, '..', '..', 'qc/macchine/confronti'); const [nome, cam, tempi] = process.argv.slice(2);
const [tx, tz, az, dist, el, fov] = cam.split(',').map(Number), T = tempi.split(',').map(Number), d2r = Math.PI / 180;
(async () => { const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8767/build/tools/controlli/banco-macchine.html?w=640&h=400'); await p.waitForFunction(() => window.pronto, null, { timeout: 90000 });
  const h = Math.cos(el * d2r) * dist, cx = tx - Math.sin(az * d2r) * h, cz = tz + Math.cos(az * d2r) * h, cy = Math.sin(el * d2r) * dist + 1;
  const files = []; for (const t of T) { await p.evaluate(a => window.vista(...a), [cx, cy, cz, tx, 1, tz, fov, t]); const f = path.join(OUT, `seq-${nome}-${t}.png`); await p.screenshot({ path: f }); files.push(f); }
  const ins = files.flatMap(f => ['-i', f]); const n = files.length, cols = 4, rows = Math.ceil(n / cols); let fc = '', lay = [];
  for (let i = 0; i < n; i++) { fc += `[${i}]null[v${i}];`; lay.push(`${(i % cols) * 640}_${Math.floor(i / cols) * 400}`); }
  fc += files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${n}:layout=${lay.join('|')}:fill=black`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...ins, '-filter_complex', fc, '-q:v', '4', path.join(OUT, `seq-${nome}.jpg`)]);
  console.log(errs.length ? errs.join('\n') : 'ok'); await b.close(); })();
