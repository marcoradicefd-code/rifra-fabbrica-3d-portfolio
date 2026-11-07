# Revisione 3D · punto di vista game dev e digital twin industriale (29/09/2026)

Revisore: sviluppatore 3D di giochi e di gemelli digitali per linee di produzione del mobile. Il codice non è stato toccato.
Materiale letto: `3d/index.html` e `3d/js/*.js` (tutti), `TABELLA-FATTI.md`, `METODI-THREEJS.md`, le foto `IMG_7442–7466`, le immagini di `esterno/`.
Misure e script (tutti in `build/qc/rev-game/`):
- `misure.js`: draw call, triangoli, heap e determinismo;
- `gpu.js`: tempo GPU con `EXT_disjoint_timer_query_webgl2`;
- `dettagli.js`: draw call divise per categoria e primi piani `pp-*.png`;
- `det.js`: prova sul video.

Le schermate dei reparti sono `r01–r12.png`, `tavola.png` e `esterno.png`.
Macchina di prova: Apple M4, Chromium headless, ANGLE Metal, 1920×1080.

---

## 1. Diagnosi in una riga

Il diorama è leggibile e ordinato: pianta, colori di marca e didascalie con la fonte lavorano bene.
I problemi sono tre:
- **le draw call sono 4–9 volte oltre il budget** che il progetto si è dato;
- **ci sono 4 bug visibili** nelle animazioni;
- **le macchine sono scatole**: si riconoscono per il colore, non per la sagoma.

Il flusso del pezzo non è continuo: ogni reparto ripete da solo il suo ciclo di 9–14 s.

## 2. Prestazioni misurate

Le draw call e i triangoli sono per fotogramma e sommano tutti i passaggi: ombre, normali GTAO, scena e post.

| Scenario (1080p) | Draw call tavola | Triangoli tavola | Draw call reparto 7 | GPU tavola / reparto (mediana) | CPU del callback | fps |
|---|---|---|---|---|---|---|
| alta, DPR 1 (GTAO, ombra 4096) | **2.181** | 541 k | 696 | **13,1 / 12,4 ms** | 4,4 ms | 60 |
| media, DPR 1 (niente AO, 2048) | 1.091* | 270 k | 766 | 7,2 / 9,2 ms | 3,7 ms | 60 |
| bassa, DPR 1 (1024) | 1.091 | 271 k | 348 | 7,1 / 8,7 ms | 3,5 ms | 60 |
| alta, DPR 2 (Mac retina) | 2.182 | 541 k | 380 | 13,3 ms (p90 **57,7 ms**) | 27,5 ms | **32,7 → scende a «media»** |

\* Media e bassa danno le stesse draw call nella tavola. Nel chiosco la tavola dura 2,5 s, poi parte il giro.

- **Budget del progetto** (`METODI` § 3): ≤ 250 draw call sul mini-PC, < 100 sul telefono. Oggi siamo a **1.091–2.181**.
- **Scena**: 659 mesh, 170 k triangoli di geometria, 541 mesh che proiettano ombra.
  - 65 materiali, 46 programmi shader, 31 texture, 7,8 MB di geometria.
  - 38 oggetti CSS2D, di cui 12 visibili.
  - Heap JS stabile: +0 KB in 5 s.
  - Pronto in circa 0,4–0,6 s. Il caricamento non è un problema.
- **Chi consuma le draw call**, sul passaggio principale:
  - **248 su circa 545 sono le 19 persone** (13 mesh a testa);
  - 104 sono edificio e arredi non fusi: 46 volte del tetto, finestre e telai creati con `new Mesh` senza `statico`, anelli del silo;
  - circa 44 sono fusi;
  - il resto sono parti animate dei reparti.
- **Quante volte si disegna la scena**: GTAO la ridisegna per intero, quindi le draw call raddoppiano (2.181 contro 1.091). L'ombra si ridisegna **a ogni fotogramma** (`autoUpdate`), anche se il 90 % della scena è fermo.
- **Il costo è per chiamata, non per pixel.** Su M4 la GPU resta a 7 ms anche in «bassa», con l'ombra a 1024. GTAO a piena risoluzione aggiunge circa 6 ms.
- **Stima per il chiosco** [nostro]:
  - una GPU integrata da mini-PC (Intel N100/UHD, Iris Xe) è 5–10 volte più lenta di un M4;
  - sotto ANGLE/D3D11 le 1.000+ chiamate costano 10–20 ms di CPU su un Celeron;
  - quindi **i 60 fps a 1080p non sono raggiungibili** senza i punti 2–5 della lista. Serve una prova sul mini-PC vero.
- **Telefono**: nell'emulazione Playwright `pointer: coarse` non scatta, quindi la prova non è affidabile. Su un iPhone vero si va in «bassa», cioè DPR 1 su uno schermo 3×: immagine morbida, e restano circa 1.100 draw call.
- **Codice**:
  - `REP.update.forEach((u,i)=>{ if (fs<0 || Math.abs(i-fs)<12) … })` è sempre vero, quindi nessun reparto fuori vista viene saltato;
  - i gruppi fusi di `ED.root` e `ARR.root` coprono tutto il capannone, quindi il frustum culling non taglia nulla;
  - `fondiStatici` fa `toNonIndexed()` e gonfia i vertici;
  - `ombraSu` ricentra il frustum dell'ombra a ogni fotogramma senza agganciarlo al texel, quindi l'ombra tremola nei voli;
  - il livello di qualità scende da solo ma non risale mai;
  - quando si fermano le animazioni, la scena si ridisegna lo stesso a 60 fps.
- **Video non deterministico**:
  - due sessioni `?video=1` sullo stesso fotogramma 150 danno PSNR 46,7 dB, cioè sono diverse;
  - con `Math.random` fissato il canvas diventa **identico** (PSNR ∞);
  - la causa è `persona()` → `fase: Math.random()*6`;
  - resta una differenza nel DOM (75,7 dB), che viene dalle transizioni CSS in tempo reale (`.vignette` 0,8 s, `#loading` 0,6 s);
  - `record.js` lancia Chromium **senza** i flag GPU, quindi il rendering va in software (SwiftShader). È la trappola 9 di METODI.

## 3. Fedeltà per reparto: confronto con le foto (e con i primi piani `pp-*.png`)

| Reparto | Cosa non torna rispetto alla fonte | Correzione |
|---|---|---|
| 1 Ufficio tecnico (F 7464) | Nella foto: open space con finestre a nastro, circa 8 scrivanie, lampade da terra, plotter HP su gambe con rotolo. Nel modello: 2 scrivanie in circa 140 m² vuoti; il plotter è un parallelepipedo nero. | 6–8 scrivanie in `InstancedMesh`, nastro vetrato, plotter con gambe, rotolo e foglio che esce (c'è già). |
| 2 Pannelli (V f_043) | Bracci gialli corretti. Al ritorno `p.rotation.y` resta π mentre l'operatore va verso est, quindi **cammina di lato**. | Orientare l'operatore sulla velocità: `atan2(dx, dz)` in `s2`. |
| 3 Sezionatrice (V f_040) | Coerente: telaio inclinato, trave X, carro Y. Pannello e doghe hanno lo stesso colore MDF, quindi il pezzo non si stacca dal fondo. | Doghe più scure (faggio), pannello più chiaro o bianco melaminico; truciolo sulla linea di taglio. |
| 4 Casolin (V f_058, F 7445) | Riquadro arancio corretto. L'operatore **scivola di lato** (`op.position.x = cx+1.6`, sempre rivolto a nord). Manca la cuffia tonda sulla lama, sostenuta dal braccio. | L'operatore cammina rivolto verso +x e spinge il carro; cuffia = cilindro schiacciato sul braccio `tubo`. |
| 5 Brema EKO 2.1 (F 7444) | Nella foto le fiancate di carico sono alte circa 1 m e il monitor è **dentro** il pannello verde. Nel modello le fiancate sono alte 2,1 m e il monitor sta su un palo. | Fiancate a 1,0–1,1 m con guida verticale; monitor incassato nel verde; targa BIESSE nera verticale. |
| 6 Rover A (F 7442) | **Bug**: in `s6` c'è `q.scale.set(L2,1,1)` che annulla la scala (.006, .05) data da `box()`. Le «gole» diventano **scatoloni marroni alti 1 m** (vedi `r06.png` e `pp-rover.png`). Il portale è giusto: Biesse descrive la Rover A «a portale» (gantry). Mancano la cappa vetrata con la scritta «Rover», i bumper e il pulpito grigio con il monitor su braccio. | `q.scale.set(L2,.006,.05)`. Cappa della testa vetrata (`vetroScuro`) con fascia verde a destra; ventose nere a file sulle barre. |
| 7 Brandt + De Stefani (F 7446, V f_022) | L'onda azzurra nella foto è **una grafica sul carter superiore**; nel modello è un tubo in basso. La Brandt misura 4–5 m (TABELLA), il modello 8 m. | Onda come striscia sul carter a y≈1,5; lunghezza 5 m con banchi di entrata e uscita; logo K. |
| 8 Levigatrice (F 7449) | Nella foto: armadio alto circa 3,2 m a due ante, con **collettore** di 5–6 calate che si uniscono in una condotta orizzontale sul tetto della macchina. Nel modello: cubo di 2,4 m con 5 tubi dritti al soffitto. | Altezza 3,2 m, collettore curvo (`tubo`), pulsantiera, zoccolo grigio scuro; carrello rosso accanto (è nella foto). |
| 9 Cefla Spraybotic (F 7450–7452) | La cabina reale è lunga circa 9 m e alta circa 3,4 m, con testate arrotondate, fascia vetrata e pannelli scuri sotto. Nel modello la testa oscilla **lungo x**, ma lo Spraybotic è un braccio cartesiano che attraversa un nastro continuo (CFB). | Allungare a 9 m, testate cilindriche; la testa oscilla in **z** mentre il nastro porta il pannello in x; logo «cefla spraybotic» sul fronte; latte rosse e bianche. |
| 10 Essiccazione + EMC (V f_019, f_041) | Mancano le punte gialle dei bracci blu (TABELLA). La EMC regge. | Punta gialla su ogni braccio in `InstancedMesh`: una sola chiamata. |
| 11 Erregi (F 7453) | Portale e quadro aperto corretti. Mancano la targa gialla ERREGI e il nastro a tappeto: nella foto è un nastro, non rulli. | Nastro scuro al posto di `rulli`, targa ERREGI; scala in alluminio (è nella foto). |
| 12 Imballaggio + Robopac (F 7456) | **Bug**: `film.scale.x` scala attorno al centro, quindi il film **sporge a sinistra** del tavolo (`r12.png`). Robopac: la colonna reale è blu notte con la scritta ROBOPAC verticale e la rampa; nel modello è blu brillante. | Ancorare il film al bordo: `film.position.x = 1.4 + len/2`; colonna #1f2a44 con rampa. |
| Esterno (E) | La **linea rossa** reale è una fascia di circa 1 m; nel modello è un tubo di 9 cm, invisibile dalla tavola. Gli autobloccanti diventano **coriandoli arcobaleno**: un `rnd()` diverso per ogni canale RGB. Il prato verde uniforme contraddice Earth (zona industriale, alberi fitti a sud e a ovest). Le volte si leggono piatte. | Fascia rossa piatta che segue le volte; una sola variazione di grigio per mattonella; asfalto e ghiaia intorno, alberi in `InstancedMesh`; freccia delle volte a 0,7 m e normal map più forte. |

**Persone** (tutti i reparti). Tabella dei fatti: maglietta nera, niente caschi; grembiule blu e guanti gialli alla verniciatura. Il modello li rispetta.
- La posa «lavoro» è un unico gesto: braccia avanti che tremano.
- Nessuna mano tocca il pezzo e nessuno «cammina carico».

FlexSim distingue per default *Walk*, *Walk Loaded* e *Stand*. Servono almeno 4 pose:
- carico e scarico: busto chino, braccia a 90°;
- spinta: busto avanti, passo corto;
- al pulpito: una mano alzata;
- camminata carica.

## 4. Materiali, luce, ombre

- **Tone mapping**: Neutral a 1,05 va bene per i colori di marca.
  - Ma sole 2,5, emisfera 0,55 e ambiente 0,55 appiattiscono tutto.
  - Pavimento `#a3a19b` con texture chiara, contro un cemento grigio medio-scuro con polvere bianca nelle foto 7442–7449. Macchine bianche su fondo chiaro: poco contrasto.
  - Proposta: albedo del cemento di produzione a circa `#6e6c68`; magazzino più chiaro; alone bianco di polvere solo vicino alla verniciatura.
- **PBR**: molti materiali hanno metalness a metà (`bianco` .05, `grigio` .2, `antracite` .15, `zincato` .85). Fuori dalla regola 0/1 di `METODI` § 2.13 danno un grigio sporco.
  - Proposta: 0 per le vernici; 1 per acciaio e zincato, con roughness 0,35–0,5.
- **Ambiente**: RoomEnvironment va bene dentro. Col tetto chiuso, all'esterno serve `Sky` in PMREM (METODI § 2.3), altrimenti il cielo resta un colore piatto.
- **Ombre**: PCF r186, radius 2,5, bias −0,0004 e normalBias 0,03 sono corretti; niente acne nelle schermate.
  - Mancano l'aggancio al texel e l'aggiornamento su richiesta (punto 4 della lista).
  - Dita, mani, fori, polvere e lampade proiettano ombra per niente.
- **GTAO**: raggio 1,2 m e 16 campioni. Nella tavola, con la camera a circa 200 m, il raggio vale pochi pixel: si pagano 6 ms per un effetto invisibile.
- **Texture procedurali**: canvas 512, sRGB e normal map Sobel, tutto corretto. Mancano le mappe di roughness: pavimento lucido a chiazze e laccato contro opaco.

## 5. Flusso e animazioni

- Ogni reparto è un ciclo chiuso: il pannello compare (`visible`), attraversa la macchina e scompare. Il pezzo che esce dal reparto *n* non è quello che entra in *n+1*.
- Nei simulatori di flusso (FlexSim, Visual Components) il pezzo è **un'entità che passa di mano** tra macchine, nastri e operatori.
- Per un racconto basta un **«pezzo protagonista»**:
  - durante il volo di camera tra due reparti, il carrello rosso o il muletto lo porta lungo i corridoi (i dati ci sono: `ST`, corsie gialle);
  - il suo aspetto cambia: MDF → bordato → levigato → laccato nero lucido → imballato.
- **Velocità**:
  - bordatrice: 6,4 m in 6,8 s ≈ 56 m/min; una bordatrice reale ne fa 12–25;
  - verniciatura: circa 86 m/min, contro un nastro reale di pochi m/min.
  - È un tempo accelerato legittimo, ma va dichiarato («tempo accelerato») oppure rallentato, perché un pubblico di settore in fiera lo nota.
- **Cinematica**: Rover (portale in X, carro in Y, testa che scende) e sezionatrice (trave in X, testa in Y) sono corrette. Spraybotic e Casolin sono sbagliate (vedi la tabella).

## 6. Lista delle modifiche, in ordine di priorità

| # | Cosa | Perché | Come (file/funzione) | Sforzo | Impatto |
|---|---|---|---|---|---|
| 1 | Correggere 4 bug visibili | Scatoloni sulla Rover, film che sporge, coriandoli nel cortile, operatori che camminano di lato | `reparti.js` `s6`: `q.scale.set(L2,.006,.05)`. `s12`: ancorare il film al bordo. `materiali.js` `autobloccanti`: un solo `rnd` per mattonella. `s2`/`s4`: rotazione sulla direzione del moto | S | alto |
| 2 | Persone in instancing | 248 mesh = 45 % delle chiamate, ×3–4 passaggi | `prim.js` `persona()`: i gruppi restano come «ossa» senza mesh; una `InstancedMesh` per tipo di parte (capsula, sfera, scarpa, circa 6), `setMatrixAt(k, parte.matrixWorld)` dopo `posa()`; `castShadow` solo su busto e gambe | M | alto (−700/−900 chiamate) |
| 3 | Fondere ciò che manca | Circa 104 chiamate evitabili | `edificio.js` `volta()`: `userData.statico=true` (il gruppo `tetto` si muove intero, la fusione regge). `muri()`: finestre e telai in 2 `InstancedMesh` per lato «fronte» e «fondo». Anelli del silo come `statico`. `fondiStatici`: niente `toNonIndexed`, `mergeGeometries` su geometrie indicizzate | S | alto |
| 4 | Ombra su richiesta e agganciata al texel | L'ombra ridisegna tutta la scena a ogni fotogramma e tremola | `main.js` `ombraSu()`: arrotondare cx/cz al passo `2r/mapSize`. `sole.shadow.autoUpdate=false`, `needsUpdate` quando il bersaglio si sposta di più di 0,5 m o ogni 2–3 fotogrammi. Niente `castShadow` sotto i 30 cm | S | alto (chiosco) |
| 5 | AO solo quando si vede | +6 ms GPU e ×2 chiamate per un effetto invisibile nella tavola | `main.js` `frame()`: `gtao.enabled = L.ao && d < 60`; oppure N8AO `halfRes` (METODI § 2.9) | S | medio-alto |
| 6 | Culling vero | Nel reparto le chiamate restano 348–766 | Fondere `ARR.root` ed `ED.root` per celle di circa 30×20 m, non in un blocco solo. Correggere `Math.abs(i-fs)<12` in `≤1` e saltare gli `update` dei reparti fuori vista. `matrixAutoUpdate=false` sui fusi | M | medio |
| 7 | Profilo chiosco | Oggi «media» è una stima alla cieca | 3 s di test di fps all'avvio (METODI § 3.6) per scegliere il livello, che può anche risalire. Con le animazioni ferme e la camera ferma, `render` solo su evento | S | alto (fiera) |
| 8 | Video deterministico | Due export danno pixel diversi | `prim.js`: `fase` da un seme per persona (per esempio l'indice), non `Math.random`. CSS: `.video .vignette,.video #loading{transition:none}`. `record.js`: `--use-angle=metal`, stampare la stringa GL e fermarsi se è SwiftShader | S | alto (video) |
| 9 | Sagome delle macchine | Il pubblico di settore riconosce la marca dalla sagoma | Tabella § 3: Rover (cappa vetrata), Brema (altezze), Brandt (onda e 5 m), levigatrice (collettore), Cefla (9 m, testate tonde), Erregi (nastro). Primitive come oggi, 20–60 box in più per macchina, tutte fuse | M | alto |
| 10 | Pezzo protagonista e tempo dichiarato | Continuità del racconto | `arredi.js`: un'entità pezzo con stato `finitura`; percorso sui corridoi gialli durante `muoviCamera`; scritta «tempo accelerato» | M | alto |
| 11 | Materiali e luce | Scena piatta e troppo chiara | `materiali.js`: metalness 0/1, pavimento `#6e6c68`, roughness map del cemento; strisce LED emissive (visibili col tetto); `Sky` in PMREM all'esterno | S–M | medio |
| 12 | Esterno | Linea rossa, contesto | `tetti()`: fascia rossa di 0,8 m in `PlaneGeometry` piegata sulle volte; `terreno()`: asfalto e ghiaia, alberi in instancing | S | medio |
| 13 | Pose delle persone | Gesti credibili | `persona.posa`: `carico`, `spinta`, `pulpito`, `camminaCarico` | M | medio |

Stima dopo i punti 1–7 [nostro]:
- tavola intorno a 250–350 draw call;
- reparto intorno a 150–250;
- GPU in «media» circa dimezzata.

Sono proiezioni: vanno rimisurate con `build/qc/rev-game/misure.js` e `gpu.js`.

## 7. Confronto con i prodotti reali

- **NVIDIA Omniverse + BMW (Debrecen)**:
  - fabbrica validata tutta in digitale prima di costruirla, su OpenUSD;
  - FactoryExplorer usato ogni giorno da 15.000 persone;
  - asset da CAD, rendering RTX.
  - Per noi vale il metodo: una fonte per ogni oggetto. La fedeltà geometrica è di un altro ordine.
  - https://www.nvidia.com/en-us/case-studies/bmw-group-develop/ · https://blogs.nvidia.com/blog/bmw-group-nvidia-omniverse/ · https://www.press.bmwgroup.com/global/article/detail/T0411467EN/bmw-group-at-nvidia-gtc:-virtual-production-under-way-in-future-plant-debrecen?language=en
- **Foxconn e il blueprint «Mega»**:
  - flotte di robot simulate nel gemello digitale, sistemi meccanici ed elettrici validati prima del cantiere;
  - fisica e AI sono fuori dal nostro perimetro.
  - https://www.nvidia.com/en-us/case-studies/foxconn-develops-physical-ai-enabled-smart-factories-with-digital-twins/ · https://resources.nvidia.com/en-us-manufacturing-industry-resources/mega-omniverse-blueprint?lx=1Aypid
- **Siemens Process Simulate Human (Jack)**: manichini antropometrici con analisi di raggiungibilità e fatica. La lezione per noi: le persone sono la misura della credibilità, quindi pose con le mani sul pezzo (punto 13).
  - https://blogs.sw.siemens.com/tecnomatix/product/process-simulate-human/ · https://www.siemens.com/en-us/products/tecnomatix/process-simulate-software/
- **Visual Components**: catalogo di oltre 3.000 componenti pronti per la simulazione, modelli dei costruttori. È la differenza principale con noi, che disegniamo le macchine a primitive.
  - https://www.visualcomponents.com/products/manufacturing-simulation/ · https://www.visualcomponents.com/frequently-asked-questions/
- **FlexSim**:
  - operatori con animazioni *Walk / Walk Loaded / Stand*;
  - nastri in scala, prelievo calcolato sulla velocità del pezzo;
  - modello da seguire per il passaggio di mano (punto 10).
  - https://docs.flexsim.com/en/19.1/Reference/3DObjects/TaskExecuters/Operator/Operator.html · https://enterprise.trimech.com/simulating-conveyor-systems-with-flexsim/
- **Biesse Rover A**: «struttura a portale», tavola a barre. Conferma la cinematica del modello.
  - https://www.biesse.com/my/wood/cnc-work-centres/rover-a
- **Cefla Spraybotic/MD**: braccio a 5 assi sopra un nastro continuo CFB, con recupero della vernice a rulli controrotanti. Conferma la correzione del reparto 9.
  - https://www.lenmark.com/products/spraybotic-md-spraying-robot-automatic-spray-finishing-system · https://www.ceflafinishing.com/en/products/ibotic-spraying-robot
- **HOMAG**: la progettazione di fabbrica si chiude con visite virtuali in brevi filmati. È il formato del nostro `?video=1`.
  - https://www.homag.com/en/company/news/case-studies/detail/production-optimization-with-3d-visualization
- **Vetrine three.js**:
  - «NEXUS Plant 01»: ogni macchina animata e selezionabile, dati MES;
  - demo con InstancedMesh, frustum culling, Draco e KTX2.
  - Tutte e due arrivano a scene simili alla nostra con **instancing** al posto di mesh sciolte.
  - https://github.com/tolgayanasik/3d-factory-in-three.js · https://github.com/gaoyangyang-1/threejs-factory-demo

**Posizione per il dibattito.** Non siamo un digital twin: siamo un diorama narrativo, e questo è giusto. Il divario che conta non è il ray tracing, sono tre cose:
1. le sagome riconoscibili delle macchine;
2. la continuità del pezzo;
3. il budget di draw call per il mini-PC.

I modelli GLB dei costruttori (Visual Components, eCatalog) darebbero un salto di fedeltà. Però contraddicono la regola A1 e la frase «ogni macchina è disegnata dal codice» nell'INTRO: lo decide Marco. Senza GLB, i punti 9 e 13 portano il modello vicino al massimo raggiungibile a primitive.
