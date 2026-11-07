# Come nasce una cucina RiFRA — fabbrica in 3D

Ricostruzione 3D animata e interattiva della fabbrica di cucine **RiFRA** di Gerno di Lesmo (MB). Si percorrono le tappe della produzione di una cucina tra macchine, reparti e persone al lavoro.

**Tutta la grafica è generata dal codice**: niente modelli 3D scaricati e niente foto usate come texture. Edificio, macchinari, materiali e persone sono costruiti e animati in three.js.

> Progetto ideato e sviluppato da **Marco Radice** per Luxury Academy, con Claude Code.
> Questa è una **copia pubblica per portfolio**: lo storico dei commit, le note interne di lavoro e il materiale del cliente (pagine del sito salvate, foto del personale) sono stati rimossi.

## Le tre parti

1. **Pagina 3D interattiva** (three.js r186) — è il prodotto principale. Si consegna come **un unico file HTML che funziona senza connessione**, in italiano e in inglese:
   - `come-nasce-una-cucina-rifra-3d.html`
   - `come-nasce-una-cucina-rifra-3d-en.html`

   Ha anche una modalità fiera (`?kiosk=1`) e una modalità video (`?video=1`).
2. **Versione Blender e spot video** — la scena viene esportata dalla pagina e resa fotorealistica in Blender con script Python (`bpy`) lanciati da riga di comando. Ne esce uno spot di 50 secondi con motion graphic.
3. **Versione 2D isometrica** (`come-nasce-una-cucina-rifra.html`) — prima versione, tenuta come alternativa per i dispositivi senza WebGL.

## Prova subito

Apri `come-nasce-una-cucina-rifra-3d.html` in un browser: è autosufficiente.

## Punti tecnici

- Texture e materiali **procedurali**.
- Controllo automatico delle **collisioni** tra persone e macchine.
- **Budget di performance**: 60 fps e al massimo 250 draw call a 1080p.
- Build offline che incorpora tutto in un solo file (circa 1,3 MB per lingua) e verifica che non ci siano richieste di rete.
- Pipeline Blender in moduli: importazione, animazione, realismo, persone, ritocchi, regia dello spot, render e montaggio.
- Disposizione delle macchine e fatti di produzione documentati con le fonti in `ricerca/`.

## Struttura

| Percorso | Contenuto |
|---|---|
| `3d/index.html`, `3d/js/` | sorgenti della pagina 3D: scena, edificio, macchine, reparti, persone, materiali |
| `build/tools/` | build del file unico offline, registrazione video, controlli automatici, esportazione verso Blender |
| `blender/` | pipeline Blender e spot |
| `ricerca/` | fatti con le fonti, disposizione delle macchine, rapporti tecnici |
| `DESIGN-SYSTEM.md` | colori, font e componenti del brand |

## Sviluppo in locale

Requisiti: Node.js 20+, Python 3. Per lo spot servono anche Blender 5.2 LTS e ffmpeg.

```bash
cd build/tools && npm install && npx playwright install chromium
cd ../.. && python3 -m http.server 8767 --bind 127.0.0.1
# apri http://127.0.0.1:8767/3d/index.html
```

Per rigenerare i file unici offline: `cd build/tools && node build3d.mjs`.

three.js è distribuito con licenza MIT; i font (Instrument Serif, Newsreader) con licenza OFL. Marchio e nomi RiFRA appartengono ai rispettivi proprietari.
