# Tecniche dai «TOP 10 GAMES built with OPUS 5.5» per la fabbrica 3D RiFRA (30/09/2026)

Analisi del video `/Volumes/PortableSSD/TOP 10 GAMES built with OPUS 5.5 !.mp4` (8:29). Il video è stato guardato come fotogrammi (1 ogni 3 s + cambi scena) e trascritto con whisper large-v3-turbo. Per ogni gioco ho cercato il codice e il post dell'autore; per tre giochi il codice è pubblico e l'ho letto.
Materiali in `ricerca/video-giochi/`: `frames/` (170 fotogrammi ogni 3 s, 53 ai cambi scena, 18 in alta risoluzione `hd_<secondo>.jpg`), `sheets/` (11 provini 4×4), `trascrizione.txt`.
**Legenda**: [letto] = verificato nel codice sorgente; [README] = scritto dall'autore; [visto] = dedotto dai fotogrammi; [stima] = valore nostro da misurare sul mini-PC.

---

## 1. I dieci giochi

| # | Gioco · autore | Link | Stack | Da dove viene il realismo |
|---|---|---|---|---|
| 10 | **PaperWorld** · AMJX (@CodeB63309) | repo omonimo `github.com/aadil6971/PaperWorld` (attribuzione da verificare: sull'account GitHub c'è un altro nome) | three.js, un solo HTML | Stilizzato. Toon shading, contorni a inchiostro, «wobble» ad acquerello, grana della carta, cornice di carta strappata. Mondo a blocchi caricati in streaming e risoluzione adattiva [README]. Di notte le finestre sono emissive e la città si accende [visto]. |
| 9 | **Willowmere** · Jurly (@jurlycat) | willowmere-nu.vercel.app | 2D in pixel art, tutto disegnato nel codice, audio sintetizzato dal vivo | Palette che cambia con l'ora (giorno, tramonto, notte). Aloni caldi delle lanterne sull'acqua e scintille speculari sulle onde [visto]. «No PNGs» [trascrizione]. |
| 8 | **Koi Pond Garden** · Sourany Phomhome | github.com/souranyp-stack/koi-pond-garden · demo souranyp-stack.github.io/koi-pond-garden/koi-pond.html | three.js **r160 WebGL**, un HTML da 560 KB, texture su canvas | Il più istruttivo per noi [letto: `prompt/one-shot-prompt.txt`]. Target HDR half-float con MSAA, ACES, ombre 4096 aggiornate un fotogramma sì e uno no. Cielo Preetham con nuvole FBM. Una sola `patchMaterial()` in `onBeforeCompile` per vento, galleggiamento e luce subacquea. Acqua con riflessione e rifrazione planari, caustiche e assorbimento Beer–Lambert. Post: SSAO a metà risoluzione, bloom 0,3, grading per meteo, vignetta 0,32, grana 0,01. Qualità che scende da sola sopra i 22 ms. |
| 7 | **The Road That Forgets** · Chetan Ankola (@chetanankola) | x.com/chetanankola/status/2103001194696458512 | three.js | Stessa lingua visiva di PaperWorld (nei fotogrammi si legge «Paper World»). Acquerello, contorni, carta. Il realismo è «di materia», non fotografico. |
| 6 · 3 | **Three.js Spider-Man → Spider-Man: Symbiote** · Shikhar (@xikhar) | github.com/xikhar/spiderbench | three.js **WebGL2**. Modelli e animazioni da script Python di Blender, texture generate da IA | CSM, GI in screen space, AO, SSR, bloom, **TAA**, motion blur [README]. Foschia che dà profondità alla città e facciate con finestre a griglia [visto]. Consiglia una GPU dedicata. |
| 5 | **Far Cry 3 Clone** · Max (@maxt3chno) | x.com/maxt3chno/status/2103423427939897781 (codice non pubblico) | three.js | Acqua bassa turchese con caustiche e colore che cambia con la profondità. Vegetazione fitta in instancing, tramonto con bloom, ombre nette del sole [visto]. |
| 4 | **Gulmohar Local (Mumbai & Bengaluru)** · Shardul Nandedkar (@pracosm) | gulmohar-local.pages.dev | three.js, tutto nel codice («a box this tall, this colour, with windows here») | **Scatole a colori pieni** come le nostre, ma con luce d'ora dorata calda, cielo viola, nuvole stilizzate e ombre lunghe: «sembra un dipinto» [visto + aifront-page.com]. |
| 2 | **Inkwave** · Jayden Davis | github.com/jaydendavisnc/inkwave · inkwave-six.vercel.app | three.js **r186 WebGLRenderer**, vendorizzato con importmap: **lo stesso nostro stack** | [letto: `src/core/renderer.js`, `src/world/environment.js`, `tools/bake-ao.mjs`] Catena: HDR half-float → GTAO → bloom → **grade** → Output → SMAA. AO **precalcolata offline** in una lightmap. Filtro PCF di r186 **riscritto** 3×3 senza rumore. Rimbalzo caldo dal suolo con `HemisphereLight`. Preset low/medium/high/ultra. |
| 1 | **The $1,874 Island («Tidewater»)** · Dan Greenheck | x.com/dangreenheck/status/2102878170089169235 · fork github.com/zzzhengqi/tidewater | three.js **WebGPU + TSL** | [README] Oceano FFT, atmosfera Hillaire, nuvole volumetriche con ombra, prospettiva aerea. CSM con penombre che si induriscono al contatto, **contact shadows in screen space**, **luce di rimbalzo dal suolo**, GTAO. Upscaling temporale, bloom, esposizione automatica, motion blur. LOD con impostori e dissolvenze a retino, risoluzione dinamica. 60 fps a 2560×1267 su M5 Pro. |

---

## 2. Cosa ci insegnano (trasversale)

1. **La luce conta più della geometria.** Gulmohar (#4) è fatto di scatole come la nostra fabbrica, eppure «sembra un dipinto» per la luce: sole caldo e basso, riempimento freddo, ombre lunghe.
   - Inkwave scrive la regola nel codice: luce principale e riempimento in rapporto ≈ **3,5 : 1**. Sole `#fff0dc` a 3,3. Emisfero con cielo `#b4d0ff` e suolo `#dcc3a0 × 2,2`, intensità 0,45. `environmentIntensity` 0,45.
   - Il rimbalzo caldo dal suolo è una «GI finta»: le pareti in ombra conservano la forma invece di diventare nere [letto].
2. **Gli oggetti devono toccare terra.** I tre giochi più realistici (#1, #8, #3) hanno tutti AO e ombre di contatto; Tidewater ha anche le contact shadows.
   - Inkwave precalcola l'AO: 48 raggi per texel, 5 texel/m, raggio 3,5 m, `occ += 1 − (d/3,5)^0,75` [letto].
3. **Grading finale sempre presente** (#1, #2, #8):
   - contrasto in spazio logaritmico;
   - ombre fredde e luci calde (split-tone);
   - vignetta 0,2–0,3;
   - grana leggera.
4. **Stabilità nel tempo** (TAA/MSAA in #1, #3, #8; PCF riscritto in #2). Il PCF di r186 usa rumore per pixel che «frigge» nei movimenti. In un video è il primo difetto che si nota.
5. **Livelli di qualità e caduta automatica** in tutti i giochi grandi. Il nostro `LIV` va già in questa direzione.
6. **Metodo.** Il prompt di Koi Pond impone «round» con screenshot e misure dopo ogni passo, e obiettivi di verifica scritti prima (§0 e §13 del prompt). Tidewater ha usato più subagenti per circa 8 ore. Conviene fare lo stesso: un provino per tecnica con `shot3d.js` + `3d-perf/perf.js`.
7. **Stack.** Inkwave dimostra che r186 `WebGLRenderer` + `EffectComposer` basta per un risultato da «gioco vero». WebGPU/TSL (#1) non serve e resta sconsigliato per il chiosco (`METODI-THREEJS.md` §1).

## 3. Dove siamo (diagnosi da `build/qc/video3d.jpg`, `v3d-30.png`, `3d-perf/*.txt`)

- **Luce piatta e uniforme.** Il sole è a 2,5, l'emisfero a 0,55 e `RoomEnvironment` dà riflessi «da studio fotografico». Col tetto tolto l'interno è illuminato come un piazzale: niente macchie di luce dai lucernari, niente gradiente.
- **Contatto a terra debole.** Persone, bancali e macchine «galleggiano». GTAO è acceso solo su `alta` e sotto i 90 m. Le persone proiettano ombre sottili e senza alone.
- **Materiali troppo puliti.**
  - Il cemento si ripete ogni 6 m in modo visibile.
  - Non c'è sporco né usura.
  - Gli spigoli sono vivi al 100 % (`BoxGeometry`), quindi non catturano luce.
  - Il laccato riflette una stanza, non la fabbrica.
- **Budget.** Nella tavola e all'esterno siamo già a **587–637 draw call** (misura `base-default`), contro il budget di 250 per il mini-PC. Ogni miglioramento deve quindi costare **zero draw call** in tempo reale, oppure pagarsele con un taglio altrove (§5).
- **Video.** Esce a `deviceScaleFactor: 1` con solo SMAA (`record.js`, righe 9–10): scalettature e tremolio sugli spigoli sottili (rastrelliere, scaffali).

---

## 4. Top 10: miglioramenti con il miglior rapporto qualità/costo

Formato: **Cosa** · Guadagno · Costo · Come (file, API r186, valori) · Sforzo · Rischio.

**1. Ambiente IBL «fabbrica» e rimbalzo caldo** (da #2, #1)
- **Cosa:** sostituire `RoomEnvironment` con una piccola scena d'ambiente fatta da noi e passata una sola volta a `pmrem.fromScene`. Contiene:
  - una cupola con gradiente (zenit `#6f9fd8`, orizzonte `#dfe5ea`);
  - un «pavimento» beige `#b9b2a4`;
  - 6–8 **strisce emissive** (lucernari e finestre a nastro).
- **Guadagno:** alto. Laccato, acciaio e vetri riflettono lucernari e finestre, e le facce in ombra prendono luce calda dal basso.
- **Costo:** 0 ms per fotogramma; una PMREM a 256 all'avvio (~50 ms [stima]).
- **Come:** in `main.js`, al posto di `scene.environment = pmrem.fromScene(new RoomEnvironment(), .04)`, usare `fromScene(envScene, 0, .1, 100, { size: 256 })` come Inkwave. Valori:
  - `hemi = HemisphereLight(0xb4d0ff, 0xdcc3a0×2.2, .45)`;
  - `environmentIntensity` 0,45–0,6;
  - sole `0xfff0dc` a 3,0–3,3, poi tarare `toneMappingExposure`.
- **Sforzo:** S. **Rischio:** basso (cambia la taratura dei colori: rifare i provini dei 12 reparti).

**2. Luce dai lucernari: il tetto sparisce ma fa ancora ombra**
- **Cosa:** oggi, quando il tetto si alza, il sole illumina tutto l'interno. Il tetto va tenuto nel **solo passaggio delle ombre**: una copia del tetto fuso con un materiale `colorWrite:false, depthWrite:false`, `castShadow:true`, sempre presente anche con `ED.tetto.visible = false`. In più, `sole.shadow.intensity = .7`: la proprietà esiste in r186 (`LightShadow.intensity`, verificato nel sorgente) e fa sì che l'interno non diventi una grotta.
- **Guadagno:** alto. Macchie di sole dai lucernari e dalle finestre a nastro sul pavimento: la luce «da capannone» delle foto di Matteo.
- **Costo:** qualche draw call nel **solo** passaggio delle ombre, che è già statico (`autoUpdate=false`). 0 ms quando la camera è ferma.
- **Come:** in `aggiornaTetto()` in `main.js`, la copia-ombra non si nasconde mai. Alzare `ombraSu()` per coprire il capannone intero nelle viste vicine, oppure accettare che fuori dal riquadro non ci siano lucernari. Compensare con il punto 1 e con l'esposizione.
- **Sforzo:** S–M. **Rischio:** medio (leggibilità dei reparti in ombra). Da provare su 3 reparti prima di estendere.

**3. AO di contatto sul pavimento, calcolata una volta** (idea da #2; tecnica da `webgl_shadow_contact.html` r186)
- **Cosa:**
  1. All'avvio, una camera ortografica dall'alto (lotto ≈ 160 × 100 m) disegna la scena statica (reparti, arredi, muri; senza tetto né gruppi `userData.anim`) in un `WebGLRenderTarget` 2048 × 1280. Il materiale scrive l'altezza del punto `clamp(y/3 m)`.
  2. Due passaggi di sfocatura gaussiana, raggio ≈ 0,5–0,8 m.
  3. La texture risultante moltiplica la luce **indiretta** (e il 30 % della diretta) dei materiali a terra (`pavimento`, `pavMagazzino`, `pavUffici`, `autobloccanti`, `asfalto`).
- **Guadagno:** alto. Alone morbido sotto macchine, rastrelliere, bancali e al piede dei muri, a ogni distanza, anche su `media`/`bassa` dove GTAO è spento.
- **Costo:** una lettura di texture nel fragment dei pavimenti (~0,1 ms [stima]), ~2,6 MB di VRAM (R8), 0 draw call per fotogramma.
- **Come:**
  - una funzione `bakeAOTerra(renderer, scene)` in un nuovo file `3d/js/luce.js`;
  - in `materiali.js`, un `onBeforeCompile` condiviso (stile `patchMaterial` di Koi Pond) che aggiunge `varying vWorld` e sostituisce `#include <aomap_fragment>` con `float ao = mix(1., texture2D(uAOTerra, (vWorld.xz - uMin)/uSize).r, uK)` applicato a `reflectedLight.indirectDiffuse`.
  - Rifare il calcolo solo se cambia la pianta.
- **Sforzo:** M. **Rischio:** basso: se l'AO rimane sotto un pezzo che si muove, basta escludere quel pezzo con i layer.

**4. Passaggio di grading** (copiato dalla struttura di `GradeShader` di #2)
- **Cosa:** uno `ShaderPass`, già nel vendor, **prima** di `OutputPass` (lavora sull'immagine HDR lineare). Valori:
  - `uContrast` 1,05 (log attorno a 0,18);
  - `uSat` 1,03;
  - split-tone: ombre `(0.975, 0.99, 1.035)`, luci `(1.025, 1.0, 0.972)`;
  - vignetta 0,15;
  - maschera sulla croma: i colori saturi del marchio (verde Biesse, rosso RiFRA) non cambiano tinta.
- **Guadagno:** medio-alto. Aspetto «fotografato»; toglie il grigio clinico.
- **Costo:** 1 passaggio a tutto schermo, ~0,2–0,4 ms a 1080p su GPU integrata [stima]. Si possono fondere vignetta e grana. `LUTPass` + `Data3DTexture` 32³ generata nel codice costa uguale.
- **Come:** in `creaPost()` in `main.js`: Render → GTAO → **Grade** → Output → SMAA. Tenere `NeutralToneMapping`.
- **Sforzo:** S. **Rischio:** basso (controllare i colori dei marchi e il QR finale).

**5. Ombre a disco per persone, muletto e carrelli**
- **Cosa:** una sola `InstancedMesh` di quadrati orizzontali (`PlaneGeometry` ruotata). Materiale `MeshBasicMaterial({color:0, alphaMap: CanvasTexture radiale 64², transparent, depthWrite:false, opacity:.35})` e `polygonOffset` a y = 0,01.
- **Guadagno:** medio-alto. Le persone smettono di galleggiare; aiuta molto nelle viste dall'alto e nel video.
- **Costo:** 1 draw call, trascurabile.
- **Come:** `istanziaPersone()` in `prim.js` aggiorna già le matrici. Aggiungere un disco per persona (scala 0,55 m, che si allarga del 20 % con il passo) e dischi più grandi per muletto e carrello in `arredi.js`.
- **Sforzo:** S. **Rischio:** nullo.

**6. Filtro delle ombre stabile** (da #2, `renderer.js` righe 64–74 [letto])
- **Cosa:** sostituire, in `THREE.ShaderChunk.shadowmap_pars_fragment`, il disco di Vogel a 5 campioni con rumore IGN con una griglia 3 × 3 di letture bilineari. Raggio adattato alla mappa: `shadow.radius = 2.2·(size/4096)+0.8`.
- **Guadagno:** medio. Bordi morbidi senza puntinato né sfarfallio (soprattutto nel video e nei voli).
- **Costo:** +4 letture sui pixel in ombra, ~0,2–0,5 ms [stima].
- **Come:** una funzione `patchOmbre()` eseguita all'avvio di `main.js` **prima** di creare i materiali, con il controllo della regex e il ripiego sul filtro standard come fa Inkwave.
- **Sforzo:** S. **Rischio:** basso (si rompe se three cambia il blocco: da ricontrollare quando si aggiorna r186).

**7. Sporco, usura e variazione su larga scala** (tecnica di `patchMaterial` di #8; texture su canvas come le nostre)
- **Cosa:**
  - **pavimento:** una texture «sporco» 1024² in coordinate mondo sul capannone, dipinta all'avvio con canvas. Contiene tracce di pneumatici lungo `ROTTA` e i corridoi del muletto, zone lucidate dal passaggio (roughness 0,6 invece di 0,82) e aloni sotto le macchine. In più, variazione di albedo 0,92–1,06 a 7 m e 23 m che rompe la ripetizione della tessera di 6 m;
  - **muri:** 60 cm di sporco al piede (`vWorld.y`, −12 %);
  - **pavimenti ad alta usura:** giunti più scuri.
- **Guadagno:** alto nelle viste vicine («fabbrica vissuta», non rendering).
- **Costo:** 1 texture da 4 MB, qualche operazione per fragment, 0 draw call.
- **Come:** nello stesso `onBeforeCompile` condiviso del punto 3 (`materiali.js`), sulle chunk `map_fragment` e `roughnessmap_fragment`.
- **Sforzo:** M. **Rischio:** basso (non esagerare: RiFRA è una fabbrica pulita, vedi le foto F).

**8. Spigoli smussati sulle macchine protagoniste**
- **Cosa:** `RoundedBoxGeometry` (già in `build/vendor/three/addons/geometries/`) con raggio 0,015–0,03 m e `segments` 2. Solo per carter delle macchine, ante, pannelli, casse e mobili degli uffici più grandi di 0,3 m.
- **Guadagno:** medio-alto da vicino. Gli spigoli prendono un filo di luce: «oggetto fabbricato» invece di «scatola CG».
- **Costo:** ≈ 200 triangoli per scatola invece di 12. Limitato a ~300 scatole: +60 k triangoli, 0 draw call perché vengono fuse.
- **Come:** in `prim.js`, `box(..., {tondo:r})` usa una geometria smussata **condivisa**, una per raggio.
- **Sforzo:** S–M. **Rischio:** basso.

**9. Video: supercampionamento e mosso naturale** (da TAA/motion blur di #1 e #3; tempo virtuale già presente)
- **Cosa:**
  - in `record.js`: `deviceScaleFactor: 2` e `page.screenshot({scale:'css'})`, così il 4K viene ridotto a 1080p;
  - **oppure** in `__video.step(dt)`: 4 sotto-fotogrammi da `dt/4` accumulati in un target con media progressiva, come fa `TAARenderPass`. Si ottengono insieme **antialias** e **mosso cinematografico** nei voli;
  - in video anche GTAO 24 campioni, ombre ogni fotogramma a 4096, grading.
- **Guadagno:** alto sul video. Niente scalette né tremolio su rastrelliere e lamiera.
- **Costo:** solo tempo di esportazione (×2–4: da 6–8 a 15–30 minuti). Nessun costo sul chiosco.
- **Sforzo:** S. **Rischio:** memoria a 4K con Metal; controllare `ffprobe` e `blackdetect` come sempre.

**10. Persone più credibili** (da state machine e animazioni di #3; procedurale come #8)
- **Cosa:**
  - molle critiche smorzate (`damp()` c'è già in `main.js`) su busto e testa;
  - leggero sfasamento delle braccia rispetto alle gambe;
  - peso che passa da un piede all'altro quando la persona è ferma;
  - testa che guarda il pezzo (`lookAt` limitato a ±35°);
  - piedi senza scivolare: il passo si calcola dalla velocità reale lungo il percorso;
  - variazione di altezza 1,65–1,85 m e di colore delle magliette (dalle foto).
- **Guadagno:** medio. Oggi, nei primi piani, le persone sembrano manichini con le braccia rigide (`v3d-30.png`).
- **Costo:** solo CPU, <0,1 ms. 0 draw call (restano istanze).
- **Come:** `g.posa(t, o)` in `prim.js` e i chiamanti in `reparti.js`.
- **Sforzo:** M. **Rischio:** basso.

### Riepilogo del costo (chiosco, livello `media`)
- In tempo reale, in totale: **+1 draw call** (dischi) e circa **+0,6–1,3 ms** [stima] (grading, filtro ombre, AO a terra, sporco).
- Il resto è lavoro fatto all'avvio (PMREM, calcolo AO) oppure solo nel video.
- **Ordine consigliato:** 1 → 4 → 5 → 6 (mezza giornata, grande salto visivo) → 3 → 2 → 7 → 8 → 9 → 10.

---

## 5. Altre tecniche valutate

| Tecnica | Esito | Perché / come |
|---|---|---|
| Cielo `Sky.js` + nebbia con lo stesso colore dell'orizzonte (#1, #8) | **sì, piccolo** | Una draw call. `turbidity` 3, `rayleigh` 1,5, elevazione presa da `SOLE_DIR`. Il colore della nebbia va letto dall'orizzonte (oggi `0xdfe5ea` è fisso). Conta solo all'esterno e nella tavola. |
| Riflessi locali per il laccato (sonda cubica) | **sì, se il punto 1 non basta** | Una `CubeCamera` a 128 alla laccatura, aggiornata **una volta**, messa in `envMap` del solo `M.laccato`. |
| SSR (`SSRPass`) per il laccato | no | Da 4 a 10 ms su GPU integrata [stima]; il laccato è una piccola parte dell'immagine. Il punto 1 dà l'80 % del risultato. |
| Light probe / `LightProbeGenerator` | facoltativo | Armoniche sferiche dall'interno del capannone; poco oltre ciò che dà già il punto 1. |
| Lightmap progressiva (`misc/ProgressiveLightMap.js`, presente in r186) | no | Richiede UV1 senza sovrapposizioni, mentre le nostre scatole fuse hanno le facce che si sovrappongono nelle UV. Il punto 3 ottiene quasi lo stesso a costo minimo. |
| AO in Node a raggi come Inkwave | più avanti | Serve una mappa di UV per faccia (`level.layoutLightmap`); lavoro L. Da considerare solo se il punto 3 non basta sui muri. |
| Raggi di luce volumetrici | solo video | Piani additivi a gradiente sotto i lucernari (`AdditiveBlending`, opacità 0,05) + polvere (`Points` ≤ 2000, 1 draw call). Hanno senso solo col punto 2. |
| DOF (`BokehPass`) nei primi piani | solo video | Da 2 a 4 ms su GPU integrata [stima]. `focus` = distanza da `cam.t`, `aperture` 0,0008, `maxblur` 0,005, attivo se d < 40 m. Il fuoco segue la camera in modo morbido. |
| Bloom (`UnrealBloomPass`) | solo `alta`/video | Soglia 2,4 e forza 0,28 come Inkwave; serve per schermi, spie e riflessi. Sul chiosco costa 1,5–3 ms [stima]. |
| CSM, WebGPU/TSL, upscaling temporale (#1) | no | Più draw call o un renderer sperimentale; il sole agganciato al texel (`ombraSu`) basta. |
| Oggetti di dettaglio in instancing (bancali, cartoni, attrezzi, estintori) | **sì, con budget** | Un `InstancedMesh` per tipo = 1 draw call ciascuno; ogni istanza va giustificata dalle foto (regola «ogni fatto ha una fonte»). |
| **Rientrare nel budget di draw call** | **prima di tutto** | Nella tavola 630 draw call contro 250. I reparti fuori fuoco vanno fusi in una `BatchedMesh` per materiale oppure riuniti in un solo gruppo fuso quando d > 90 m. Misurare con `window.__rf.info()`. |

## 6. Fonti

- Video + trascrizione: `ricerca/video-giochi/`.
- Koi Pond Garden: https://github.com/souranyp-stack/koi-pond-garden (README e `prompt/one-shot-prompt.txt`) · demo https://souranyp-stack.github.io/koi-pond-garden/koi-pond.html
- Inkwave: https://github.com/jaydendavisnc/inkwave (`src/core/renderer.js`, `src/world/environment.js`, `tools/bake-ao.mjs`, `src/config.js`) · https://inkwave-six.vercel.app · https://x.com/JaydenDavisNC/status/2103357848961036304
- Tidewater: https://github.com/zzzhengqi/tidewater (README del fork) · https://x.com/dangreenheck/status/2102878170089169235
- Spiderbench: https://github.com/xikhar/spiderbench · https://runtimewire.com/article/claude-opus-55-spiderbench-browser-game · https://x.com/xikhar/status/2102932763750084797
- Gulmohar Local: https://aifront-page.com/claude-walkable-mumbai-bengaluru-one-prompt/ · https://gulmohar-local.pages.dev/
- PaperWorld: https://github.com/aadil6971/PaperWorld · Road That Forgets: https://x.com/chetanankola/status/2103001194696458512
- Far Cry 3 clone: https://x.com/maxt3chno/status/2103423427939897781 · Willowmere: https://willowmere-nu.vercel.app/
- three.js r186, esempi e addon (disponibilità verificata il 30/09):
  - `examples/webgl_shadow_contact.html`, `webgl_shadowmap_progressive.html`, `webgl_postprocessing_taa.html`, `webgl_postprocessing_ssaa.html`, `webgl_postprocessing_3dlut.html`, `webgl_postprocessing_dof.html` su https://github.com/mrdoob/three.js/tree/r186/examples
  - `LightShadow.intensity`, `misc/ProgressiveLightMap.js`, `postprocessing/{LUTPass,BokehPass,UnrealBloomPass,TAARenderPass,SSRPass}.js`, `objects/Sky.js` su https://cdn.jsdelivr.net/npm/three@0.186.1/
