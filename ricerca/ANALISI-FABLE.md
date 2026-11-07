# Analisi di fedeltà e UX · versione 3D «Come nasce una cucina RiFRA» (Fable, 30/09/2026)

Verifica indipendente del 3D (three.js) contro pianta rettificata, satellite, foto/fotogrammi e viste esterne, più prova UX su desktop, telefono, fiera e pagina finale. Nessun sorgente toccato. Strumenti e immagini in `build/qc/fable/`:
`render.js` (viste dai punti di ripresa di MAPPA-FOTO.md e dall'alto in scala, `main.js` servito con una riga in coda che espone controlli e stato), `ux.js`, `ux-phone.js` (risultati in `ux-risultati.json`, `ux-phone-risultati.json`), coppie `cfr-*.jpg` (foto a sinistra, 3D a destra), sovrapposizioni `cfr-top-*.jpg`, schermate `ux-*.png`, fogli `foglio-r1-6.jpg`, `foglio-r7-12.jpg`.
Nota: le viste esterne e le sovrapposizioni sono state rifatte dopo la modifica della fascia sud delle 10:54 (recinzione a z 52, decisione del cliente: **non è un errore di fedeltà**; il satellite la dà a z 47).

## A. Fedeltà

### A1. Dall'alto: 3D contro pianta rettificata e satellite

Immagini: `cfr-top-pianta-overlay.jpg`, `cfr-top-pianta-sotto.jpg` (pianta 0,05 m/px, 3D senza tetto reso alla stessa scala), `cfr-top-sat-overlay.jpg`, `cfr-top-sat-sotto.jpg` (satellite ruotato 0,10 m/px, 3D con tetto).

Coincide (scarto ≤ 0,5 m salvo nota): perimetro 70,9 × 40,6 e gradini nord (z 0 / 2,4 / 5,4; il satellite dà 4,3 per l'ultimo, −1 m); blocco uffici 10,3 × 11,2 con tetto scuro; striscia uffici; blocco sotto il soppalco 7,3–25,8 e cabina 26,6–35,9; parete magazzino/produzione a z 13 con i varchi; corridoi a terra (z 10,3 / 23,4 / 33,3, x 41,3); 24 volte con lucernari su due file e linea rossa; torrini (3 verso il silo, 3 al centro, come Earth); pensilina, filtri, container, centrale, silo (Ø 4,4 a 74,4/36); parcheggio ovest: fascia 6 m, auto parallele al muro (satellite: auto 2 × 4,2 m allineate N–S a x −5,4…−2,9); tutte le 12 macchine delle tappe dentro i rettangoli della pianta (Rover, squadratrici, Brema, sezionatrice, Cefla 49,7–68, Erregi 20–37, levigatrice 62–67, Brandt/De Stefani).

Scostamenti (metri):
| Cosa | 3D | Fonte | Scarto |
|---|---|---|---|
| Tetto piano a quadrotti crema | x 24,9–50, z 2,4–6,5 (`edificio.js` tetti(): `piano(p, 24.9, 2.4, 50, 12.4, …tettoPiano)`, la texture copre solo la fascia nord) | satellite/Earth: area color sabbia x ≈ 11–48, z ≈ 2–11, attaccata al blocco uffici | −14 m in x, +5 m di profondità |
| Scaffali N–S del magazzino | tre file a x 39,1 / 42,1 / 49,9 (`reparti.js` fuori()) | pianta: due tratteggi a x ≈ 38–41 e ≈ 44–46; a x 50 c'è il muro del gradino | il terzo sta contro il muro (−8 m) |
| Finestre alte a lamelle sulla parete magazzino/produzione (lato nord) | assenti | V f_014, F 7456 | oggetto mancante |
| Sala riunioni | tavolo z 25–29 | pianta z ≈ 23,5–27,5 | +1,5 m |
| Percorso rosso del pezzo | Catmull-Rom fra i centri delle tappe (`main.js` ROTTA) | — | attraversa cabina verniciatura, stanze sotto il soppalco e la parete del magazzino |
| Fascia sud | recinzione z 52, corsia 4,5 m + stalli perpendicolari 2,5 m, strada 53,6–61,5 | satellite: recinzione z 47, carreggiata 47–56,5 | +5 m, **decisione del cliente (30/09), accettata** |
| Silo | ottagonale, gonna verde 2,6 m | Earth/V: cilindro grigio zincato, telaio verde pallido | forma e colore (vedi A3) |

### A2. Coppie foto ↔ 3D dallo stesso punto di vista (25 coppie rese, 22 utili)

Camera a 1,6 m nel punto x, z e verso di MAPPA-FOTO.md § 6; tetto tolto come nel prodotto (i muri verso sud/ovest sono abbassati a 1,3 m: dove la foto guarda a sud si vede fuori, effetto della «casa di bambole», non errore del modello). Severità: A = si nota subito, B = si nota confrontando, C = dettaglio.

| Coppia (file) | Coincide | Non coincide | Sev. |
|---|---|---|---|
| IMG_7442 Rover A (`cfr-IMG_7442.jpg`) | basamento bianco, barre nere con ventose, montante BIESSE, fascia verde, tubo giallo spiralato, banco in truciolare | manca la rete scura sul lato ovest davanti al pulpito; sfondo: il soppalco con ringhiera gialla non c'è (`ARR.alto` nascosto sotto 70 m) | B |
| IMG_7443 Rover 1/2 | due centri con cappa grigia; operatore al banco | il secondo Rover reale ha la cappa in vetro fumé, nel 3D grigio opaco | C |
| IMG_7444 Brema (`cfr-IMG_7444.jpg`) | anta nera con LED, fronte verde, monitor, targa BIESSE, banchi con strisce nere, sgabello | i banchi laterali reali sono più grandi; dietro si vedono alberi e recinzione (muro sud abbassato) | B |
| IMG_7445 / 7447 / V f_058 squadratrici (`cfr-IMG_7447.jpg`) | riquadro arancio a terra, carro lungo, cuffia con freccia azzurra, carrelli rossi | corpo troppo esile: scatola 0,95 × 0,84 contro un basamento reale ≈ 1,6 × 1,1 con piano in ghisa largo; manca la squadra in alluminio; le tre macchine sembrano tavolini | A |
| IMG_7446 / V f_024 Brandt (`cfr-IMG_7446.jpg`) | bianca, onda azzurra, logo K BRANDT, due calate zincate, gambe della rotaia | l'onda è disegnata solo sul fronte sud; sfondo pile di pannelli assenti | C |
| IMG_7448 VP Impianti (`cfr-IMG_7448.jpg`) | due cabine con oblò su rulliera blu, EMC a sinistra | mancano i serbatoi a pressione davanti; dietro il muro reale è in blocchi grigi, nel 3D antracite; il silo spunta sopra il muro | B |
| IMG_7449 levigatrice (`cfr-IMG_7449.jpg`) | armadio chiaro a due ante, 5 calate con collettore, rulliera, carrello rosso | pulpito reale sul fianco, non separato; la levigatrice verde M23 sta davanti alla camera del rilievo (posizione a bassa confidenza) | B |
| IMG_7450 / V f_033 Cefla (`cfr-IMG_7450.jpg`, `cfr-f_033.jpg`) | 9 m, tre finestre, zoccolo nero, logo, latte rosse/bianche, cappe flessibili nere | le tre finestre rendono grigio opaco (dentro non si vede la testa rotante); manca il lucernario sopra | B |
| IMG_7452 / V f_036 pulpito Cefla (`cfr-IMG_7452.jpg`, `cfr-f_036.jpg`) | pulpito con monitor, tastiera, semaforo, tunnel a pannelli | mancano armadi rossi e rastrelliera della carta abrasiva lungo il muro est | C |
| IMG_7453 Erregi (`cfr-IMG_7453.jpg`) | portale grigio, quadro aperto, targa ERREGI, nastro scuro, scaffali ferramenta | la scocca in primo piano è bianca e vuota; nella foto i mobili sono scuri e imballati | C |
| IMG_7454 cabina (`cfr-IMG_7454.jpg`) | stanza chiara, portone sezionale, cavalletti | pareti reali bianche sporche con finestre a griglia; il percorso rosso passa sul pavimento della cabina | B |
| IMG_7456 / V f_014 magazzino (`cfr-IMG_7456.jpg`, `cfr-f_014.jpg`) | pareti bianche, corridoio, portone in fondo, porta verde al gradino | scaffali arancio/blu su entrambi i lati e fusti blu dove la foto ha muro con finestre e banchi; mancano le finestre alte a lamelle sulla parete di destra | A |
| IMG_7457 Robopac | colonna blu, piattaforma rossa | il muletto animato passa davanti al punto di ripresa | C |
| IMG_7460 / V f_005 mobili scuri (`cfr-IMG_7460.jpg`) | moduli antracite, scaffali con scatole, parete chiara | mancano finestre sul muro nord e calcio balilla (da REPORT-MACCHINE è previsto, non in vista) | C |
| IMG_7461 / 7464 / 7469 uffici (`cfr-IMG_7461.jpg`, `cfr-IMG_7464.jpg`, `cfr-IMG_7469.jpg`) | scrivanie, monitor, plotter, tavole appese, tavolo riunioni con 10 sedie e schermo | facciata vetrata solo all'esterno: dall'interno il muro nord e ovest è bianco pieno (le foto hanno finestre a nastro); reception senza orologio in vista | B |
| IMG_7465 esterno NO (`cfr-IMG_7465.jpg`) | scritta su due facce, vetrata a griglia, zoccolo grigio, annesso con finestre, auto, pensilina d'ingresso | vetro reale chiaro e riflettente con montanti chiari; nel 3D vetro quasi nero con montanti neri; scritta reale RIFRA in maiuscolo (nel 3D glifi del logo con «i» minuscola); recinzione verde troppo satura | B |
| V f_019 carrelli essiccazione (`cfr-f_019.jpg`) | telaio verde, bracci blu, punte gialle, ante | reali con ~20 livelli fitti, 3D 12 | C |
| V f_022 De Stefani (`cfr-f_022.jpg`) | banco lungo, rulli blu | — | C |
| V f_040 / f_043 sezionatrice (`cfr-f_040.jpg`) | telaio inclinato, doghe con righe rosse, pannelli in piedi, deposito | macchine tradizionali M26 = scatole verdi/turchesi | C |
| V f_041 EMC (`cfr-f_041.jpg`) | corpo chiaro, LUC line, schermo, pulsanti, piano di carico | muro reale in blocchi grigi, 3D nero | C |
| V f_054 Altendorf (`cfr-f_054.jpg`) | basamento verde, cassone verde | come le altre squadratrici: troppo esile; toupie turchese reale = scatola | A |
| V f_066 / f_069 soppalco (`cfr-f_066.jpg`, `cfr-f_069.jpg`) | parete scura con porta illuminata e finestra, pannelli su bancali | **ringhiera gialla e solaio non visibili** (in `ARR.alto`, nascosto quando la camera è sotto 70 m); mancano stoccatore verde e scaffale bianco; parete reale grigio-blu, 3D quasi nera | A |
| V f_047 / silo.webp (`cfr-f_047.jpg`, `cfr-silo.jpg`) | scala con gabbia, pianerottoli, baracca con tetto curvo | silo reale cilindrico grigio zincato con telaio verde pallido; 3D ottagono crema con gonna verde brillante | B |

Coppie non giudicabili per la posizione del rilievo (camera dentro un oggetto): IMG_7459 (armadietto), V f_049 (cassone blu), v0012_t12.5 (spigolo SO).

### A3. Esterno: Street View, Earth, viste dal retro

Immagini: `cfr-earth-retro-intero.jpg`, `cfr-earth-uffici-insegna.jpg`, `cfr-streetview-ingresso-17.jpg`, `cfr-streetview-facciata-cancello.jpg`, `cfr-facciata-portone-aperto.jpg`, `cfr-silo.jpg`, `esterno.png`.
- Insegna sul fronte nord: posizione, fascia bianca e lettere in rilievo coincidono con Earth; quella piccola sul fronte ovest resta (cliente). Da correggere solo il disegno: maiuscole RIFRA con grazie, non i tracciati del logo.
- Annesso: 4 finestre quadrate e tetto piano coincidono; il patch a quadrotti crema va spostato verso gli uffici (A1). Fila continua di finestrelle sotto la gronda a nord: passo 3,3 contro ~2,5 reale (7 finestre invece di ~10), C.
- Volte con linea rossa: 24, lucernari e fascia coincidono; i torrini reali sono cappe rettangolari con coperchio rosso, nel 3D imbuti zincati (C).
- Silo: vedi A2 (B). Civico 17: pilastro, pensilina a due falde, targa RIFRA e targhetta «17» coincidono con Street View (dopo lo spostamento a z 52).
- Facciata sud: pannelli con giunti verticali, finestre a lamelle con telaio verde, portone bianco SE e portone scorrevole ovest con porta a pensilina nera coincidono. Finestre reali più basse (davanzale ~1,5 m, alte ~1,0) contro y 1,9 h 1,5 (C). Manca la finestra con telaio bianco accanto alla porta SO (V 0012a).
- Parcheggio ovest: la lettura del rilievo è corretta. Satellite e video IMG_0012 a 12,5 s mostrano auto in fila parallele al muro (asse N–S = «in verticale» sulla pianta), in una fascia di ~6 m; la pianta disegna 8 stalli in linea. Nessuna auto perpendicolare a ovest.
- Fascia sud e recinzione a z 52: scostamento +5 m dal satellite, accettato (Marco 30/09).
- Recinzione: verde `0x3f6d3a` rende lime al sole; reale verde-nero opaco. Vicini: parallelepipedi crema senza finestre (effetto giocattolo).

## B. UX/UI (desktop 1920×1080, telefono 390×844 e 844×390 con tocco, fiera 1920×1080 e 1080×1920, pagina finale)

Misure (`ux-risultati.json`, `ux-phone-risultati.json`): pagina finale 1,24 MB, pronta in 1,7 s in locale, nessuna richiesta esterna, font incorporati, 0 errori console. 60 fps su tutte le 12 tappe in «alta» (il livello sale da solo da «media»); peggior fotogramma 37 ms alla tappa 3 e 31 ms alla 6, durante il volo. Telefono (emulato su Mac, non indicativo per la GPU): parte in «bassa», sale ad «alta», 58–60 fps. Fiera: 60 fps in entrambi gli orientamenti.

- **Prima impressione** (`ux-apertura-0s.png`): esterno credibile, tetto a volte con linea rossa, alberi, strada; dopo 2,6 s il tetto si alza. Buono. I quattro vicini a scatola crema e la recinzione lime sono le sole note «giocattolo».
- **Tavola intera** (`tavola.png`, `ux-apertura-6s.png`): **nessun segnaposto numerato** né su desktop né su telefono (`pins: []`): in `aggiornaSegni` la regola «se due segni distano meno di 46 px si nascondono tutti» scatta sempre, perché le tappe 3/4/5 sono a 5–6 m l'una dall'altra. La scelta di v1 («segnaposto numerati al posto dei nomi a terra») oggi non esiste; i segni compaiono solo in vista libera avvicinandosi (`ux-libera.png`). L'etichetta «percorso indicativo del pezzo» galleggia al centro del capannone senza riferimento (sul telefono copre metà fabbrica, `ux-fin-tel-vert-tavola.png`).
- **Avvio automatico** dopo 14 s senza interazione: parte mentre si legge la scheda (`ux-autoavvio.png`); accettabile in fiera, discutibile sul sito.
- **Giro e camera per tappa** (`foglio-r1-6.jpg`, `foglio-r7-12.jpg`): inquadrature a 3/4 leggibili per 1, 2, 3, 6, 8, 10, 11, 12. Problemi: 05 ha la condotta gialla del secondo Rover in primo piano (cilindro Ø 0,32 alto 4 m che copre la Brema); 07 ha le due calate zincate della Brandt davanti alla macchina; 09 ha le cappe nere del mixer e la condotta al centro; 04 mostra le squadratrici da nord con strada e auto oltre il muro abbassato; 11 guarda il portale Erregi dall'alto con un cubo bianco (scocca) che copre il nastro. Il percorso rosso, largo 18 cm, attraversa muri e stanze e nelle tappe 11/12 sembra un cavo a terra.
- **Etichette**: massimo 5 alla tappa 9; su telefono verticale escono dallo schermo (x −212 e −88 px, `ux-fin-tel-vert-tappa9.png`) e in orizzontale finiscono sotto i pulsanti in alto a destra («Secondo centro di lavoro…» sotto «Metti il tetto», `ux-fin-tel-oriz-tappa6.png`); in fiera verticale «Plotter…» è tagliata a destra (`ux-kiosk-vert-racconto.png`). `antiSovrapposte` sposta solo in verticale.
- **Scheda e indice vs design system**: token, font (Instrument Serif/Newsreader), pillole, nero/grigio chiaro coerenti. Da rivedere: «Qualità media/alta/bassa» è gergo tecnico esposto ai visitatori; l'indice bianco con bordo interno non è nel DS ma funziona; in fiera il corpo del testo è nascosto senza «Leggi tutto» (voluto).
- **Fiera verticale** (`ux-kiosk-vert-richiamo.png`): **testata e indice si sovrappongono** (entrambi in alto: «…RiFR|01 Il progetto»); `--k` non è mai impostato, quindi lo zoom di fiera è 1 anche su schermi grandi. Richiamo 4,5 s per tappa contro ~2,5 s di volo: la camera è quasi sempre in viaggio (`ux-kiosk-oriz-giro.png`). Orizzontale: corretto, QR grande, CTA leggibile.
- **Telefono** (pagina finale; `3d/index.html` non ha `<meta name=viewport>`, quindi sul telefono la pagina di sviluppo rende a 980 px): verticale ok nel complesso, ma **«Leggi tutto» apre la scheda sotto l'indice** (`--card-h` è aggiornato solo in `resize()`, `ux-fin-tel-vert-leggitutto.png`); testata sovrapposta ai tre pulsanti in alto a destra; pulsanti dell'indice 44 × 36 px (sotto i 44 px al tocco); fabbrica minuscola nella tavola intera. Orizzontale: scheda a sinistra, indice scorrevole, ok.
- **Movimento ridotto**: rispettato (salti istantanei, nessun avvio automatico, «Ferma le animazioni» premuto e disabilitato).
- **Tastiera**: frecce, Esc, «t», focus visibile ok. Trappola: dopo un clic su un pulsante, Spazio riattiva quel pulsante (il gestore ignora Spazio quando il fuoco è su un pulsante), non pausa/riprendi.
- **Vista libera**: trascinamento → «Torna al giro», limiti del lotto, bene. Da lontano compaiono le tre condotte a soffitto Ø 0,6 m lunghe 65 m che tagliano tutta la fabbrica (`ux-libera.png`): le più visibili «finte» della scena.
- **Fluidità percepita**: buona; il volo esce-sposta-rientra è morbido; i pezzi che compaiono/spariscono seguono la regola delle pile.

## C. Interventi in ordine di priorità (S ≤ 1 h, M ≤ mezza giornata, L oltre)

P1
1. Segnaposto sulla tavola intera. `3d/js/main.js` `aggiornaSegni()`: sostituire `crowded` globale con fusione locale (nascondere solo il segno che si sovrappone a un vicino già posto, oppure unire 3–4–5 in un segno «3–5»); soglia 28 px in modalità `sheet`. S.
2. Telefono: indice sopra la scheda aperta. `main.js` `$('more').onclick`: dopo il toggle aggiornare `--card-h` (chiamare `resize()` o un `ResizeObserver` su `#card`). S.
3. Fiera verticale: `3d/index.html` aggiungere `@media (orientation:portrait){.kiosk .index{top:auto;left:16px;right:16px;bottom:calc(var(--card-h,300px) + 24px)}}`; in `main.js` impostare `--k` (es. `Math.min(innerWidth, innerHeight) / 1080`, minimo 1). S.
4. Condotte davanti alla camera nelle tappe 5, 7, 9. `3d/js/macchine.js` `roverA()` (`cyl(portale, .15, 2.95, -.6, .16, H_PROD - 3.2, …)`), `brandt()` e `mixer()` (`tubo(... H_PROD - .3 ...)`): fermare le condotte a 4,5 m e metterle in un gruppo `alto` di reparto nascosto quando `fuoco() === i`; in alternativa `PROFILI[4]` azimut 200° e `PROFILI[8]` 45°. M.
5. Soppalco invisibile nelle tappe. `3d/js/arredi.js`: solaio, ringhiera gialla e scala in `R` invece di `alto` (in `alto` restano solo le condotte a soffitto). S.
6. Squadratrici (tre macchine, tappa 4). `macchine.js` `squadratrice()`: corpo 1,6 × 0,95 × 1,1, piano in ghisa 1,2 × 1,6, squadra in alluminio sul carro, cassone verde solo per Altendorf; toupie turchese reale in `tradizionali()`. M.

P2
7. Percorso del pezzo. `main.js` `ROTTA`: punti di passaggio sui corridoi (z 23,4 / 33,3, x 41,3, z 10,3) e non i centri delle tappe; `depthTest` attivo e sospeso dentro cabina e stanze. M.
8. Etichette dentro l'area libera. `main.js` `antiSovrapposte()`: `x = clamp(x, FREE.x0 + 8, FREE.x1 - w - 8)`; se `y < FREE.y0` spostare sotto l'ancora; in `freeArea()` sottrarre i tre pulsanti in alto a destra. S.
9. Etichetta «percorso indicativo» → chip nella scheda (`#data` della INTRO) o ancorata all'inizio del percorso; nascosta sotto 900 px. S.
10. Condotte a soffitto. `arredi.js`: raggio 0,18, materiale più scuro, nascoste anche sopra 140 m (tavola intera); `main.js` riga `ARR.alto.visible = (d > 70 …)` → soglia relativa alla tappa (`d > 2.5 * goal.d`). S.
11. Muri abbassati a 1,3 m nelle tappe 3–4–5 (strada e auto dietro le macchine). `main.js` `aggiornaTetto()`: `lerp(1, 2.6 / h, u)` per i muri di facciata; o velatura del terreno oltre il muro. S.
12. Richiamo di fiera: `main.js` `CUES_S = i * 7`, `END_S = 84`. S.
13. Telefono: `.mast{max-width:calc(100% - 200px)}` a ≤ 899 px; `.index button{min-height:44px}` con `pointer:coarse`; tavola intera con `LOTTO.r` 36 sotto 600 px. S.
14. Tetto crema: `edificio.js` `tetti()`: patch a quadrotti su x 10,3–35, z 0/2,4–12,4; il resto chiaro. S.
15. Magazzino: `edificio.js` `muri()` finestre alte a lamelle sulla faccia nord della parete z 13 (passo 5,9, y 4,2, h 1,0); `reparti.js` `fuori()`: togliere lo scaffale a x 49,9 e i fusti, tenere M29 solo a x 25–46. S.
16. Cefla: finestre trasparenti. `macchine.js` `lineaCefla()`: `MM.vetroChiaro` con `renderOrder` alto e `depthWrite:false` già c'è, ma il piano interno `ceflaInterno` chiude la vista: aprire la parete interna dietro le finestre. S.

P3
17. Materiali (`materiali.js`): `verdeScuro` → `0x2b4530`; `verdeTelaio` → `0x9fb39a`; silo in `edificio.js` `impianti()` cilindro `0xc9cbc8` con nervature, gonna dello stesso grigio; `internoAntracite` e `MM.stanza` → `0x4a4d52`; vetro degli uffici `0x9fb2c0` con montanti `biancoCaldo`. S.
18. Insegne: `main.js` `scritta()` → testo «RIFRA» in Instrument Serif estruso (canvas → `ExtrudeGeometry` da glifi) o maiuscole disegnate. S.
19. Uffici: `edificio.js` `uffici()`: finestre a nastro sulla faccia interna del muro nord (y 1,0–2,3, passo 1,62) e sul muro ovest della striscia; orologio a pendolo visibile dalla tappa 1. S.
20. Torrini: `tetti()` cappe rettangolari 1,2 × 0,8 con coperchio rosso. S.
21. Interfaccia: rinominare «Qualità …» in «Dettaglio …» o spostarlo in un menu «⋯»; nascosto sotto 900 px. S.
22. Tastiera: in `keydown`, se `e.key === ' '` e il fuoco è su un pulsante diverso da `#play`, `e.preventDefault(); $('play').click()`; oppure `blur()` dopo ogni clic. S.
23. Avvio automatico a 20 s con suggerimento «Avvia il giro» pulsante; aggiungere `<meta name="viewport">` a `3d/index.html` (parità con la pagina finale). S.
24. Arredi mancanti in vista: armadi rossi e rastrelliera carta abrasiva sul muro est (f_035/f_036), stoccatore verde e scaffale bianco (f_066), carrelli e pile lungo il corridoio z 33,3 (7441), finestra bianca accanto alla porta SO (V 0012a). `reparti.js` `fuori()`, `edificio.js`. M.
25. Vicini: `edificio.js` `intorno()` fasce di finestre scure e tetto grigio, colore meno caldo. S.
26. Finestre sud: `LAMELLE` y 1,5 h 1,0 passo 4. S.

Punti di ripresa da correggere nel rilievo (non nel 3D): IMG_7459, V f_049, v0012b cadono dentro oggetti del modello (armadietto, cassone blu, spigolo del muro); E1/E2 (Street View, z 49–50) dopo lo spostamento della recinzione a z 52 cadono dentro la fascia sud: per il civico 17 fare riferimento a `esterno.png` e `ux-finale.png`.
