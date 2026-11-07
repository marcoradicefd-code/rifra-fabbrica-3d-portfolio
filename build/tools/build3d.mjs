// Genera la pagina 3D unica e offline: three.js e i moduli in un solo script (esbuild), font incorporati.
// uso: node build3d.mjs   → ../../come-nasce-una-cucina-rifra-3d.html (parte in italiano) e ../../come-nasce-una-cucina-rifra-3d-en.html (parte in inglese)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), V = join(R, 'build/vendor/three');
const out = await build({
  entryPoints: [join(R, '3d/js/main.js')], bundle: true, write: false, format: 'iife', minify: true, target: 'es2020', legalComments: 'eof',
  alias: { three: join(V, 'three.module.min.js') },
  plugins: [{ name: 'addons', setup(b) { b.onResolve({ filter: /^three\/addons\// }, a => ({ path: join(V, 'addons', a.path.slice('three/addons/'.length)) })); } }],
});
const js = out.outputFiles[0].text;
let html = readFileSync(join(R, '3d/index.html'), 'utf8');
// font del design system RiFRA incorporati (stesse regole di build/build.py)
const F = join(R, 'build/fonts'), css = readFileSync(join(F, 'g.css'), 'utf8'), faces = [];
for (const [, sub, body] of css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face\s*{([^}]*)}/g)) {
  if (!['latin', 'latin-ext'].includes(sub) || !/font-style: normal/.test(body)) continue;
  const fam = body.match(/font-family: '([^']+)'/)[1], fn = readdirSync(F).find(f => f.startsWith(fam.replace(/ /g, '') + '_' + sub + '_n'));
  const b64 = readFileSync(join(F, fn)).toString('base64'), w = body.match(/font-weight: ([^;]+);/)[1], ur = body.match(/unicode-range: ([^;]+);/)[1];
  faces.push(`@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${ur}}`);
}
html = html.replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, '').replace(/^<meta charset="utf-8">\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '')
  .replace('<style>', '<style>\n' + faces.join('\n') + '\n')
  .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '').replace(/<script type="module" src="js\/main.js"><\/script>\s*/, '')
  .replace('href="../come-nasce-una-cucina-rifra.html"', 'href="come-nasce-una-cucina-rifra.html"');
const head = html.slice(0, html.indexOf('</style>') + 8), body = html.slice(html.indexOf('</style>') + 8);
// due file (Marco 02/10): uno parte in italiano, l'altro in inglese; tutti e due cambiano lingua con il pulsante (3d/js/lingua.js)
const LINGUE = [['it', 'come-nasce-una-cucina-rifra-3d.html', 'Come nasce una cucina RiFRA'], ['en', 'come-nasce-una-cucina-rifra-3d-en.html', 'How a RiFRA kitchen is made']];
for (const [l, nome, titolo] of LINGUE) {
  const page = `<!doctype html>\n<html lang="${l}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n` + head.replace(/<title>[^<]*<\/title>/, `<title>${titolo}</title>`)
    + '\n</head>\n<body>' + body + `\n<script>window.RF_LINGUA = '${l}';</script>\n<script>\n` + js.replace(/<\/script/g, '<\\/script') + '\n</script>\n</body>\n</html>\n';
  writeFileSync(join(R, nome), page);
  console.log(nome, (page.length / 1e6).toFixed(2), 'MB,', faces.length, 'font-face, script', (js.length / 1e6).toFixed(2), 'MB');
}
