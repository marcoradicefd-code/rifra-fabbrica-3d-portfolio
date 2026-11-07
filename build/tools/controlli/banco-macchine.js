// Primi piani delle macchine dai punti di ripresa delle foto (MAPPA-FOTO.md § 6) e confronto affiancato con la foto.
// Uso: node controlli/banco-macchine.js [nomi separati da virgola] [t]   → build/qc/macchine/confronti/<nome>.png e <nome>-cfr.jpg
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const { execFileSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const R = path.join(__dirname, '..', '..', '..'), OUT = path.join(R, 'build/qc/macchine/confronti'); fs.mkdirSync(OUT, { recursive: true });
const d2r = Math.PI / 180, dir = (x, z, az, dist = 6) => [x + Math.sin(az * d2r) * dist, z - Math.cos(az * d2r) * dist];
// nome: [foto, x, z, azimut (0 = nord, 90 = est), campo orizzontale, quota occhio, quota bersaglio, formato]
// nome: [foto, bersaglio x, z, azimut dello sguardo (0 = nord, 90 = est), distanza, campo orizzontale, quota occhio, quota bersaglio, formato]
// la camera sta a «distanza» dal bersaglio, dalla parte opposta allo sguardo (inquadrature scelte per somigliare alle foto)
const V = {
  rover: ['foto/IMG_7442.jpg', 25.2, 28.6, 0, 7.5, 95], rover2: ['foto/IMG_7443.jpg', 31, 28.8, 15, 7, 95], rovervid: ['fotogrammi/v0008/f_063.jpg', 26.5, 28.7, 350, 4.5, 75, 1.5, 1.4, 'w'],
  brema: ['foto/IMG_7444.jpg', 34, 38.8, 180, 5.5, 95], squadra: ['foto/IMG_7445.jpg', 48.7, 36.2, 180, 4.5, 100], casolin: ['fotogrammi/v0008/f_058.jpg', 42.7, 36.0, 190, 3.8, 75, 1.5, 1.0, 'w'],
  altendorf: ['fotogrammi/v0008/f_054.jpg', 53.3, 35.8, 270, 4, 80, 1.5, 1.0, 'w'], brandt: ['foto/IMG_7446.jpg', 45.4, 29.1, 60, 5, 95], brandt2: ['fotogrammi/v0008/f_025.jpg', 46, 29.0, 270, 5, 75, 1.4, 1.2, 'w'],
  destefani: ['fotogrammi/v0008/f_022.jpg', 44.8, 25.3, 300, 4.5, 75, 1.5, 1.0, 'w'], vp: ['foto/IMG_7448.jpg', 66.7, 34.9, 90, 8, 95], emc: ['fotogrammi/v0008/f_041.jpg', 65.5, 28.6, 90, 3.5, 75, 1.5, 1.3, 'w'],
  levig: ['foto/IMG_7449.jpg', 64.6, 24.4, 5, 7.5, 95, 1.5, 1.8], cefla: ['foto/IMG_7450.jpg', 55.2, 17.8, 0, 8.5, 95, 1.5, 1.8], interno: ['foto/IMG_7451.jpg', 54.8, 17.6, 0, 3.2, 55, 1.6, 1.4],
  pulpito: ['foto/IMG_7452.jpg', 66.2, 19.5, 315, 4, 90], mixer: ['fotogrammi/v0008/f_038.jpg', 60.5, 21.0, 270, 7, 75, 1.5, 1.6, 'w'], essic: ['fotogrammi/v0008/f_019.jpg', 45, 18, 240, 3.5, 75, 1.5, 1.2, 'w'],
  erregi: ['foto/IMG_7453.jpg', 32.4, 21.6, 270, 6, 70, 1.6, 1.8, 'v'], cabina: ['foto/IMG_7454.jpg', 31.2, 16.2, 0, 5.5, 75, 1.6, 1.6, 'v'], robopac: ['foto/IMG_7458.jpg', 64.5, 11.8, 180, 3.2, 75, 1.6, 1.2, 'v'],
  mobili: ['foto/IMG_7460.jpg', 17, 4.5, 10, 5, 95], sez: ['fotogrammi/v0008/f_040.jpg', 58.5, 38.5, 240, 6, 80, 1.5, 1.4, 'w'], nastro: ['fotogrammi/v0008/f_030.jpg', 58.5, 31.8, 80, 3.5, 80, 1.5, 1.0, 'w'],
  deposito: ['fotogrammi/v0008/f_051.jpg', 63, 37, 330, 4, 80, 1.5, 1.2, 'w'],
};
const [lista, tt] = process.argv.slice(2); const nomi = lista ? lista.split(',') : Object.keys(V), T = +(tt || 6);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); const errs = [];
  for (const fmt of ['h', 'v', 'w']) { const sel = nomi.filter(n => (V[n][8] || 'h') === fmt); if (!sel.length) continue;
    const [w, h] = fmt === 'v' ? [750, 1000] : fmt === 'w' ? [1000, 562] : [1000, 750];
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(`http://127.0.0.1:8767/build/tools/controlli/banco-macchine.html?w=${w}&h=${h}&nopersone=1`); await p.waitForFunction(() => window.pronto, null, { timeout: 90000 });
    for (const n of sel) { const [foto, tx, tz, az, dist, fov, ye = 1.5, yt = 1.2] = V[n], [x, z] = dir(tx, tz, az, -dist);
      const calls = await p.evaluate(a => window.vista(...a), [x, ye, z, tx, yt, tz, fov, T]); const png = path.join(OUT, n + '.png'); await p.screenshot({ path: png });
      const cfr = path.join(OUT, n + '-cfr.jpg');
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(R, 'ricerca', foto), '-i', png, '-filter_complex', `[0]scale=-2:${h}[a];[1]scale=-2:${h}[b];[a][b]hstack`, '-q:v', '4', cfr]);
      console.log(n, 'chiamate', calls); } }
  console.log(errs.length ? errs.slice(0, 10).join('\n') : 'nessun errore'); await b.close();
})();
