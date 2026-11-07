# RiFRA 3D: sorgenti per chi modifica la pagina

Ricostruzione 3D della fabbrica RiFRA di Gerno di Lesmo, fatta con three.js r186. La pagina finale è un unico file HTML offline.

## Contenuto

| Cartella | Cosa c'è |
|---|---|
| `3d/index.html`, `3d/js/*.js` | sorgenti della pagina: scena, macchine, reparti, persone, uffici, materiali. Elenco dei file in `CLAUDE.md`, «Sorgenti 3D» |
| `build/vendor/three/` | three.js r186 (licenza MIT), con i soli addon usati |
| `build/fonts/`, `build/brand/` | font del design system (Instrument Serif, Newsreader) e logo vettoriale |
| `build/tools/build3d.mjs` | genera le pagine uniche offline `come-nasce-una-cucina-rifra-3d.html` (parte in italiano) e `-3d-en.html` (parte in inglese); testi inglesi in `3d/js/lingua.js` e `testi.js` |
| `build/tools/controlli/` | controlli automatici: foto delle tappe, collisioni, prova senza rete |
| `CLAUDE.md`, `HANDOFF.md` | regole del progetto, decisioni, stato e trappole: **leggere prima di modificare** |
| `ricerca/` | tabella dei fatti con le fonti, disposizione delle macchine |

## Requisiti

Node.js 20 o più recente e Python 3, solo per il server locale.

## Lavorare in locale

```bash
cd build/tools && npm install            # esbuild e playwright (+ npx playwright install chromium la prima volta)
cd ../.. && python3 -m http.server 8767 --bind 127.0.0.1   # dalla cartella principale
# sviluppo: http://127.0.0.1:8767/3d/index.html   (moduli ES, si ricarica con F5)
```

## Generare la pagina finale

```bash
cd build/tools && node build3d.mjs       # → ../../come-nasce-una-cucina-rifra-3d.html e ...-3d-en.html (circa 1,3 MB l'uno)
node controlli/offline3d.js prova.png    # 0 richieste esterne, 0 errori (col server attivo)
node controlli/shot3d.js ../qc/prova 1,2,3,4,5,6,7,8,9,10,11,12 1500   # foto di tutte le tappe; atteso: fps 60, «nessun errore»
node controlli/collisioni.js             # persone e macchine: atteso «Casi: 0»
```

## Regole importanti (dettaglio in `CLAUDE.md` e `HANDOFF.md`)

- **Tutto è disegnato dal codice**: niente modelli GLB né foto come texture. Ogni fatto ha una fonte; ciò che non ce l'ha è segnato ILLUSTRATIVO nei commenti.
- **Prestazioni:** al massimo 250 draw call in qualità «media» a 1080p.
  - Gli oggetti fermi hanno `userData.statico` e vengono fusi.
  - Le parti in movimento stanno in gruppi `userData.anim`.
  - Non cambiare a runtime il colore di un materiale condiviso.
- **Animazioni** deterministiche nel tempo `t`.
- **Dopo modifiche** a reparti, arredi, persone o macchine, rilanciare il controllo collisioni.
- **Non pubblicare** senza l'autorizzazione di RiFRA.
