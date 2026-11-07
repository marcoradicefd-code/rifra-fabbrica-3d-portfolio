// Controllo automatico delle collisioni della scena 3D («correttore» richiesto dal cliente: persone che entrano nelle macchine e si fondono).
// Strumento di sviluppo: NON modifica i sorgenti e non aggiunge niente alla pagina vera. Nel browser di prova riscrive al volo
// prim.js (annota le mesh prima della fusione) e main.js (aggancio a reparti e arredi, tempo fissabile) — vedi collisioni-pagina.js.
//
// Cosa controlla, campionando il tempo dell'animazione (predefinito 0…240 s ogni 0,1 s: i cicli durano 9–40 s e si sfasano; circa 10 s di calcolo):
//  · corpo, braccio e mano di ogni persona dentro macchine, arredi, pile, muri (soglie 3 / 5 / 8 cm: le mani possono toccare)
//  · pezzi in movimento (ante, carri, portali) che attraversano una persona
//  · persone dentro muletti e carrelli, persone sovrapposte (busti a meno di 2 × 19 cm)
//  · telaio dei mezzi (muletti, carrello spinto) contro macchine, scaffali e muri
//  · piedi sotto il pavimento (> 3 cm) o sollevati (> 6 cm) per chi sta in piedi
// Uscite: ricerca/COLLISIONI.md (tabella), build/qc/collisioni/collisioni.json, una foto per caso in build/qc/collisioni/.
// I verdetti dopo la verifica a occhio (falso positivo, contatto voluto…) stanno in controlli/collisioni-esiti.json (chiave del caso).
//
// Uso: cd build/tools && node controlli/collisioni.js [--fino 240] [--passo 0.1] [--da 0] [--foto 0] [--solo 2,3] [--url …]
//      (server: python3 -m http.server 8767 --bind 127.0.0.1 dalla cartella del progetto)
const fs = require('fs'), path = require('path');
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname + '/..'] }));
const ROOT = path.resolve(__dirname, '../../..'), OUT = path.join(ROOT, 'build/qc/collisioni'), MD = path.join(ROOT, 'ricerca/COLLISIONI.md');
const ESITI = path.join(__dirname, 'collisioni-esiti.json');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const opz = { da: +arg('da', 0), fino: +arg('fino', 240), passo: +arg('passo', .1), solo: arg('solo') ? arg('solo').split(',').map(Number) : null };
const FOTO = arg('foto', '1') !== '0', URL = arg('url', 'http://127.0.0.1:8767/3d/index.html');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const lay = JSON.parse(fs.readFileSync(path.join(ROOT, 'ricerca/LAYOUT-MACCHINE.json'), 'utf8')).macchine.filter(m => m.rett_pianta)
    .map(m => { const [x, z, w, d] = m.rett_pianta; return { id: m.id, nome: m.nome, x0: x, z0: z, x1: x + w, z1: z + d }; });
  const esiti = fs.existsSync(ESITI) ? JSON.parse(fs.readFileSync(ESITI, 'utf8')) : {};
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript({ content: `window.__collLayout = ${JSON.stringify(lay)};` });
  await ctx.addInitScript({ path: path.join(__dirname, 'collisioni-pagina.js') });
  const avvisi = [];
  // prim.js: fondiStatici / fondiAnimati avvolte da una funzione che annota le mesh prima della fusione
  await ctx.route(/\/3d\/js\/prim\.js(\?.*)?$/, async r => { const res = await r.fetch(); let s = await res.text();
    for (const [f, w] of [['fondiStatici', 'export function fondiStatici(root, opt) { if (window.__coll) window.__coll.primaDiFondere(root); return __fondiStatici0(root, opt); }'],
      ['fondiAnimati', 'export function fondiAnimati(scene, camp) { if (window.__coll && camp && camp.ferme) window.__coll.primaDiFondereAnimati(camp.ferme); return __fondiAnimati0(scene, camp); }']]) {
      if (!s.includes(`export function ${f}(`)) { avvisi.push(`prim.js: ${f} non trovata, le forme di quelle mesh saranno quelle fuse (meno precise)`); continue; }
      s = s.replace(`export function ${f}(`, `function __${f}0(`) + '\n' + w + '\n'; }
    await r.fulfill({ response: res, body: s, headers: { ...res.headers(), 'cache-control': 'no-store' } }); });
  // main.js: aggancio subito dopo la costruzione di reparti e arredi
  await ctx.route(/\/3d\/js\/main\.js(\?.*)?$/, async r => { const res = await r.fetch(); let s = await res.text(); const re = /const ARR = costruisciArredi\([^)]*\);/;
    if (!re.test(s)) avvisi.push('main.js: riga «const ARR = costruisciArredi(…)» non trovata: aggancio impossibile');
    s = s.replace(re, m => m + ' window.__coll && window.__coll.aggancia({ scene, REP, ARR, ED, M });');
    await r.fulfill({ response: res, body: s, headers: { ...res.headers(), 'cache-control': 'no-store' } }); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('errore della pagina:', e.message); });
  await p.goto(URL); await p.waitForFunction(() => window.__rf && window.__coll && window.__coll.scene, null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  const prep = await p.evaluate(d => { if (d) window.__coll.debug = []; return window.__coll.prepara(); }, !!arg('debug')); console.log('preparazione:', JSON.stringify({ ...prep, fonti: undefined, grossi: prep.grossi && prep.grossi.length }));
  if (!prep.hook.fondiStatici) avvisi.push('nessuna fondiStatici annotata: forme meno precise');
  if (prep.grossi && prep.grossi.length) avvisi.push(`${prep.grossi.length} geometrie già fuse fuori da fondiStatici (riquadro > 4 m, forma non ricostruibile) escluse: ${[...new Set(prep.grossi)].slice(0, 4).join(', ')}`);
  const t0 = Date.now(); const casi = await p.evaluate(o => window.__coll.analizza(o), opz);
  if (arg('debug')) console.log(JSON.stringify(await p.evaluate(() => window.__coll.debug), null, 0));
  console.log(`analisi ${opz.da}…${opz.fino} s ogni ${opz.passo} s: ${casi.length} casi in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // foto: tetto tolto, etichette nascoste, cerchio rosso sul punto di massima compenetrazione
  // le foto del giro precedente non si cancellano: vanno in precedenti/ (regola del progetto: niente file eliminati)
  if (FOTO) { const vecchie = fs.readdirSync(OUT).filter(f => /^c\d{3}-.*\.png$/.test(f)); if (vecchie.length) { fs.mkdirSync(path.join(OUT, 'precedenti'), { recursive: true });
    for (const f of vecchie) fs.renameSync(path.join(OUT, f), path.join(OUT, 'precedenti', f)); } }
  if (FOTO && casi.length) {
    await p.evaluate(() => window.__rf.tetto(1)); await p.waitForTimeout(2500);
    // interfaccia nascosta (resta nell'impaginazione: l'inquadratura non cambia), didascalia del caso in alto
    await p.addStyleTag({ content: '#labels{display:none!important} .card,.index,.mast,.bar,#motion,#style,#roof,#vig,#caption{visibility:hidden!important}'
      + ' #collMk{position:fixed;z-index:99;width:46px;height:46px;margin:-23px 0 0 -23px;border:3px solid #e0192b;border-radius:50%;pointer-events:none;box-shadow:0 0 0 2px #fff}'
      + ' #collTx{position:fixed;z-index:99;left:16px;top:12px;right:16px;font:600 17px/1.35 Helvetica,Arial,sans-serif;color:#111;background:rgba(255,255,255,.88);padding:8px 12px;border-radius:6px}' });
    for (const [i, c] of casi.entries()) {
      c.foto = `c${String(i + 1).padStart(3, '0')}-${c.persona.replace(/[^\w-]+/g, '_').slice(0, 30)}.png`;
      const cam = await p.evaluate(c => window.__coll.inquadra(c, /mezzo/.test(c.tipo) ? 7 : 3.8), c);
      await p.evaluate(([t, cam]) => { window.__coll.vai(t); window.__rf.guarda(cam.target, cam.pos); }, [c.tMax, cam]); await p.waitForTimeout(650);
      const tx = `#${i + 1} · tappa ${c.reparto || '—'} · ${c.persona} ↔ ${c.ostacolo} · ${c.tipo}${c.parti && c.parti.length ? ' (' + c.parti.join(', ') + ')' : ''} · ${(c.max * 100).toFixed(1)} cm a ${c.tMax} s`;
      await p.evaluate(([pt, tx]) => { const [x, y] = window.__coll.proietta(pt); const el = id => { let d = document.getElementById(id); if (!d) { d = document.createElement('div'); d.id = id; document.body.appendChild(d); } return d; };
        const d = el('collMk'); d.style.left = x + 'px'; d.style.top = y + 'px'; el('collTx').textContent = tx; }, [c.punto, tx]);
      await p.screenshot({ path: path.join(OUT, c.foto) });
    }
  }
  await b.close();
  // relazione
  const cm = v => (v * 100).toFixed(1).replace('.', ',');
  const iv = c => c.intervalli.slice(0, 4).map(([a, z]) => a === z ? `${a.toFixed(1)}` : `${a.toFixed(1)}–${z.toFixed(1)}`).join(', ').replace(/\./g, ',') + (c.intervalli.length > 4 ? ` (+${c.intervalli.length - 4})` : '') + ' s';
  casi.forEach(c => { const e = esiti[c.chiave]; c.esito = e ? e.esito : 'da verificare'; c.nota = e ? e.nota || '' : ''; });
  const aperti = casi.filter(c => !/falso positivo|voluto/.test(c.esito));
  const righe = casi.map((c, i) => `| ${i + 1} | ${c.reparto > 0 ? c.reparto : '—'} | ${c.persona} (${c.pdesc}) ↔ ${c.ostacolo}${c.approx ? ' ≈' : ''} | ${c.tipo}${c.parti && c.parti.length ? ' (' + c.parti.join(', ') + ')' : ''} | ${iv(c)} | ${cm(c.max)} | ${c.esito}${c.nota ? ': ' + c.nota : ''} | ${c.foto ? `[foto](../build/qc/collisioni/${c.foto})` : '—'} |`);
  const oggi = new Date().toISOString().slice(0, 10);
  const md = `# Collisioni nella scena 3D (controllo automatico)

Generato da \`build/tools/controlli/collisioni.js\` il ${oggi}. Campioni: ${opz.da}…${opz.fino} s ogni ${opz.passo} s${opz.solo ? `, solo tappe ${opz.solo.join(', ')}` : ''}.
Rilancio: \`cd build/tools && node controlli/collisioni.js\` (server su 127.0.0.1:8767; \`--foto 0\` per saltare le foto, \`--solo 4,6\` per alcune tappe).

**Metodo.** Nel browser di prova (i sorgenti non cambiano) ogni mesh viene annotata prima che \`fondiStatici\`/\`fondiAnimati\` la fondano,
quindi le forme restano quelle vere, pezzo per pezzo: scatole orientate, cilindri, ellissoidi, tubi (≈ = forma approssimata dal riquadro orientato).
Il tempo dell'animazione viene fissato (\`window.__coll.T\`) e le funzioni \`update(t)\` di tappe e arredi vengono chiamate in ordine, con 1,5 s
di rodaggio (le persone ricavano passo e velocità dalle chiamate precedenti). Persone (persone.js): circa 1700 vertici del corpo con lo stesso
skinning dello shader (ossa da \`userData.stato.out\`, corporatura, parti opzionali spente), divisi in corpo, braccio e avambraccio/mano;
in più 13 capsule dello scheletro con raggi inscritti, per i pezzi sottili (barre, ante) che tagliano il corpo. Ripieghi: parti con
\`userData.parte\`, mesh o SkinnedMesh sotto la persona, capsula r 0,25 m × 1,75 m. La profondità è quella nell'unione dei pezzi
dell'assieme (una pila di lastre, un bancale), misurata camminando nelle 6 direzioni fino a uscire (il pavimento conta pieno solo scendendo).
Soglie: corpo 3 cm, braccio 5 cm, mano 8 cm (le mani possono toccare, non attraversare); chi è seduto (bacino sotto 0,7 m) appoggia bacino e
cosce sulla sedia: lì 6 cm e niente capsule. Persone sovrapposte se i busti distano meno di 2 × 19 cm; mezzi: griglia 4 × 4 × 4 punti del
telaio (senza forche e carico) dentro macchine e muri; piedi sotto il pavimento oltre 3 cm o sollevati oltre 6 cm dal piano d'appoggio.
Non controllati: pezzo contro pezzo (un'anta contro un carro) e le geometrie già fuse prima dell'annotazione (vedi avvisi).
I verdetti dopo la verifica delle foto stanno in \`build/tools/controlli/collisioni-esiti.json\` (chiave del caso).

Ostacoli: ${prep.ostacoli} forme (${prep.statici} annotate prima della fusione statica, ${prep.ferme} dei gruppi animati), ${prep.assiemi} assiemi; persone: ${prep.persone}; mezzi: ${prep.veicoli}.
${avvisi.length ? '\n**Avvisi:** ' + avvisi.join('; ') + '\n' : ''}
**Casi: ${casi.length}; aperti (non falsi positivi né voluti): ${aperti.length}.**

| # | Tappa | Coppia | Tipo | Tempi | Max (cm) | Esito | Foto |
|---|---|---|---|---|---|---|---|
${righe.join('\n') || '| — | — | nessuna collisione | — | — | — | — | — |'}
`;
  // la parte scritta a mano dopo il segno «<!-- storico -->» (casi trovati, correzioni) resta a ogni rilancio
  const prima = fs.existsSync(MD) ? fs.readFileSync(MD, 'utf8') : '', k = prima.indexOf('<!-- storico -->');
  fs.writeFileSync(MD, md + (k >= 0 ? '\n' + prima.slice(k) : '')); fs.writeFileSync(path.join(OUT, 'collisioni.json'), JSON.stringify({ data: oggi, opz, prep, avvisi, casi }, null, 1));
  console.log(avvisi.length ? 'AVVISI: ' + avvisi.join(' | ') : 'aggancio completo');
  console.log(errs.length ? 'errori della pagina: ' + errs.slice(0, 8).join(' | ') : 'nessun errore della pagina');
  for (const [i, c] of casi.entries()) console.log(`${String(i + 1).padStart(3)} R${c.reparto} ${c.tipo}${c.parti && c.parti.length ? ' [' + c.parti.join(',') + ']' : ''} · ${c.persona} ↔ ${c.ostacolo} · max ${cm(c.max)} cm a ${c.tMax} s · ${c.intervalli.length} int · ${c.esito}` + (arg('dettagli') ? `\n      punto ${c.punto.map(v => v.toFixed(2)).join(', ')} · ${JSON.stringify(c.det)}` : ''));
  console.log(`aperti: ${aperti.length}`);
})().catch(e => { console.error(e); process.exit(1); });
