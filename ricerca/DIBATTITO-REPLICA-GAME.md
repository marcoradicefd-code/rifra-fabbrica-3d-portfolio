# Replica del revisore game / produzione industriale al report UX (29/09/2026)

Rispondo a `DIBATTITO-UX.md` punto per punto, dal lato giochi, produzione e prestazioni.
Le mie misure sono in `DIBATTITO-GAME-INDUSTRIALE.md` § 2 e gli script in `build/qc/rev-game/`.

Due correzioni ai fatti prima di cominciare:
- Il report UX riporta «1 draw call / 1 triangolo». È `renderer.info` dopo l'ultimo passaggio di post.
  - Con `autoReset=false` si misurano **2.181 draw call e 541 k triangoli** per fotogramma (tavola, qualità alta).
  - In qualità media e bassa sono **1.091**. Non è più «da misurare»: è misurato.
- Due punti del mio report sono già chiusi e li ritiro:
  - `record.js` ha già i flag GPU;
  - i font sono già incorporati offline nella build finale (`build3d.mjs`). Il punto UX 12 vale solo per la pagina di sviluppo.

## 1. Punto per punto

| UX | Posizione | Motivo |
|---|---|---|
| 1 Codici fonte fuori dalle etichette | **accordo** | Costo zero. La regola «ogni fatto ha una fonte» resta rispettata se la nota si vede con `?debug=1` e in `TABELLA-FATTI`: la fonte non si cancella, si sposta. |
| 2 Stile delle etichette + anti-sovrapposizione | **accordo con modifica** | Il costo lo decide **come** si misura. `getBoundingClientRect` a ogni fotogramma forza il layout su 26–38 elementi, che su un Celeron pesa. Meglio: misurare una volta le dimensioni di ogni etichetta (cambiano solo al cambio di testo), proiettare con la matrice della camera già calcolata, fare un controllo tra coppie O(n²) su ≤ 6 etichette visibili, cioè circa 0,05 ms. Nel chiosco al massimo 2 etichette per reparto. |
| 3 Chiosco verticale e CTA | **accordo** | Bloccante in fiera. Aggiungo: nel chiosco il DPR va fissato a 1. Oggi «media» ha `dpr 1.5`, che su un 4K vuol dire 5,5 MP, e il chiosco è già a 766 draw call nel reparto. |
| 4 Profili di camera per reparto | **accordo con modifica** | A runtime costa zero: sono dati in `ST[i].cam`. Tre riserve: (a) un visitatore di fabbrica vuole il **3/4 all'altezza dell'operatore allargata**: macchina + persona + pezzo che entra ed esce, non il dettaglio basso; (b) le riprese basse mostrano i retri delle macchine a scatole, quindi le userei solo dove la sagoma regge; (c) le riprese «contesto» larghe aumentano i pixel in vista, ma **oggi non cambiano le draw call**, perché i blocchi fusi coprono tutto il capannone e il culling non taglia nulla. Pausa d'arrivo di 0,6 s e look-ahead: sì. |
| 5 Rotta visibile + «sei qui» | **accordo con modifica** | Una linea tubolare costa 1–2 draw call: bene. Però la tabella dei fatti dice che **l'ordine dei reparti è illustrativo**. La rotta va dichiarata («percorso indicativo»), finché RiFRA non la conferma. La rotta coincide con il mio «pezzo protagonista»: stesso tracciato. Prima la linea, il pezzo che la percorre dopo. |
| 6 Pin nascosti col tetto chiuso, nome, scala | **accordo** | Costo nullo; il calcolo `crowded` è già O(n²) su 12 elementi. |
| 7 Apertura da film + avviso di reset | **accordo** | Il tetto chiuso è anche l'inquadratura più leggera: poche mesh fuse. |
| 8 Tetto senza «pop» | **accordo con modifica** | `aggiornaTetto` riscrive `transparent` e `depthWrite` su 5 materiali a ogni fotogramma. In r186 la trasparenza entra nel define `OPAQUE` del programma, quindi il cambio può ricompilare lo shader o restare incoerente. Soluzione a costo minimo: `transparent=true` fisso sui materiali del tetto, solo `opacity` animata, e prima fondere le volte (oggi 46 mesh trasparenti da ordinare). Scarto `alphaHash`: il rumore di dithering nel video peggiora la compressione H.264. |
| 9 Meno interfaccia sopra il 3D | **accordo** | «Qualità» solo con `?debug`: il livello si regola già da solo. |
| 10 Tavola su mobile e limiti dell'orbita | **accordo** | La tavola più stretta mette in vista meno esterno e aiuta anche il telefono. |
| 11 Meno «giocattolo» | **accordo con modifica, e un disaccordo** | **Disaccordo sulle tute blu e gialle ad alta visibilità.** Le foto e la tabella dicono maglietta nera, niente caschi, grembiule blu e guanti solo alla verniciatura: le tute sarebbero inventate. Sì a pose varie, prato desaturato e poca polvere (instancing: 1 draw call). **No** ai fasci di luce dai lucernari e alla foschia volumetrica: col tetto tolto i lucernari non ci sono, e la foschia è un passaggio a schermo intero che una GPU integrata non regge. Il «mosaico arcobaleno» è un bug di `autobloccanti` (un `rnd()` per canale), non una varianza da ridurre. |
| 12 Font locali | **già fatto** | Resta solo il rischio del ciclo di ricarica, vedi il punto 14. |
| 13 Accessibilità | **accordo** | Sforzo S, nessun costo di rendering. |
| 14 Resilienza del chiosco | **accordo** | Contatore di ricariche (massimo 3 in 60 s). Aggiungo: con il tour in pausa e la camera ferma, **non ridisegnare**. Il chiosco scalda meno e la GPU integrata non va in throttling a metà giornata. |
| 15 Prestazioni sul mini-PC | **accordo, con numeri** | Tempo GPU su M4: 13 ms in qualità alta, 7–9 ms in media. Una GPU integrata è 5–10 volte più lenta, quindi il chiosco senza interventi è a rischio. Le leve sono instancing delle persone (248 mesh = 45 % delle chiamate), fusione, ombra su richiesta e AO solo da vicino. |
| «Prima regia ed etichette, poi poligoni» | **accordo con modifica** | Il visitatore RiFRA in fiera compra cucine, non macchine: la sagoma perfetta di una Brandt conta poco. Tre eccezioni: (a) il bug della Rover (scatoloni di 1 m) si vede nel giro, quindi va corretto subito; (b) Rover e Cefla sono citate nel testo della scheda, quindi devono reggere lo sguardo; (c) il dettaglio statico **fuso non aggiunge draw call** (una per materiale per reparto), quindi non è in conflitto con il punto 15. |

**Conflitti con la mia lista:**
- tute (UX 11) contro fonti: vince la fonte;
- «niente geometria prima di misurare» (UX 4.2) contro sagome (mio 9): risolto, la geometria fusa è gratis in draw call;
- ordine della rotta: va dichiarato come illustrativo.

## 2. Lista comune: primo passaggio (uno sviluppatore, una sessione)

«Must» = da fare prima di mostrare la pagina a RiFRA o in fiera. «Nice» = se resta tempo. Sforzo: S ≤ 1 h, M ≈ 2–3 h.

| # | Cosa | Dove | Sforzo | |
|---|---|---|---|---|
| 1 | 4 bug: `q.scale.set(L2,.006,.05)`; film ancorato al bordo (`position.x = 1.4 + len/2`); un solo `rnd` per mattonella; operatori orientati sulla direzione del moto | `reparti.js` `s6` `s12` `s2` `s4`; `materiali.js` `autobloccanti` | S | must |
| 2 | Etichette: `L(x,y,z,testo,{nota})`, solo il testo pubblico (nome macchina + dato), nota con `?debug=1` | `reparti.js` (tutte le `L`), `prim.js` `etichetta` | S | must |
| 3 | Etichette nello stile del design system (Newsreader 15–16 px, 24 px nel chiosco, `.lab3d` sotto `--k`), anti-sovrapposizione con dimensioni in cache, massimo 2 per reparto nel chiosco | `index.html` `.lab3d`; `main.js` `aggiornaSegni` | M | must |
| 4 | Chiosco: niente `zoom` per `--k`, `freeArea()` con i rect reali, CTA in basso al centro, «Ferma» e «Qualità» nascosti, DPR 1 fisso; prova 1080×1920 in `shot3d.js` | `index.html` righe 104–115; `main.js` `freeArea`, `LIV` | M | must |
| 5 | Pin nascosti finché il tetto è chiuso (`tetto > .85`); nome sul pin attivo | `main.js` `aggiornaSegni` | S | must |
| 6 | Attrazione: reset con avviso di 10 s, ritorno a tetto chiuso + tavola, poi `jump(0)` | `main.js` `kioskAttract`, `kioskAfterEnd` | S | must |
| 7 | Persone in instancing: i gruppi restano come ossa, una `InstancedMesh` per tipo di parte, `setMatrixAt` dopo `posa`; ombra solo da busto e gambe | `prim.js` `persona`; `main.js` `frame` | M | must |
| 8 | Fondere ciò che manca: volte `statico`; finestre e telai in `InstancedMesh` per «fronte» e «fondo»; anelli del silo; `fondiStatici` senza `toNonIndexed` | `edificio.js` `volta`, `muri`, `impianti`; `prim.js` `fondiStatici` | S | must |
| 9 | Ombra: aggancio al texel in `ombraSu`; `autoUpdate=false` + `needsUpdate` quando il bersaglio si sposta o ogni 2 fotogrammi; niente ombre sotto i 30 cm | `main.js` `ombraSu`, `frame`; `prim.js` `box` (opzione) | S | must |
| 10 | GTAO spento con camera a più di 60 m; filtro reparti corretto (`≤1`); niente render quando è tutto fermo | `main.js` `frame`, `applicaQualita` | S | must |
| 11 | Tetto: `transparent` fisso, solo `opacity` (dopo il punto 8) | `main.js` `aggiornaTetto`; `materiali.js` | S | must |
| 12 | Video deterministico: `fase` dall'indice della persona, non `Math.random`; `.video .vignette, .video #loading {transition:none}` | `prim.js` `persona`; `index.html` | S | must |
| 13 | Profili di camera per i reparti deboli (1, 8, 9) con 3/4 all'altezza dell'operatore, pausa d'arrivo 0,6 s, look-ahead | `edificio.js` `ST[i].cam`; `main.js` `posaReparto`, `muoviCamera` | M | nice |
| 14 | Rotta indicativa (linea tubolare, 1–2 draw call) con il tratto attivo acceso durante il volo, scritta «percorso indicativo» | `arredi.js` (nuova funzione), `main.js` `setStation` | M | nice |
| 15 | Realismo a costo zero: metalness solo 0/1, pavimento di produzione `#6e6c68`, prato desaturato, fascia rossa di 0,8 m sulle volte; meno interfaccia (mast ridotto nei reparti, «Qualità» con `?debug`) | `materiali.js`; `edificio.js` `tetti`, `terreno`; `index.html` `.mast` | S | nice |

**Rimandati al secondo passaggio:**
- pezzo protagonista che viaggia tra i reparti e cambia finitura;
- sagome di Rover, Cefla, Brandt e levigatrice (tabella § 3 del mio report);
- pose delle persone (carico, spinta, pulpito);
- minimappa;
- blocchi fusi divisi per celle, per il culling;
- test di fps all'avvio per scegliere il livello;
- telemetria locale.

**Verifica a fine sessione:**
- rilanciare `node ../qc/rev-game/misure.js` e `gpu.js`: obiettivo tavola ≤ 400 draw call in «media», reparto ≤ 250;
- rilanciare `det.js`: obiettivo PSNR ∞ tra due export;
- rilanciare `shot3d.js` anche a 1080×1920.
