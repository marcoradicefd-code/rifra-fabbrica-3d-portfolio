# Dibattito UX 3D · revisione dell'ingegnere UX 3D (Sonnet) · 29/09/2026

Ambito: `3d/index.html` + `3d/js/*.js`, pagina live 127.0.0.1:8767 (desktop 1920×1080, telefono 390×844, chiosco 1920×1080 e 1080×1920). Nessun sorgente toccato. Immagini in `build/qc/rev-ux/`: `esterno.png`, `tavola.png`, `r01/r05/r08/r12.png`, `m-tavola.png`, `m-r05.png`, `k-attract2.png`, `kp-attract.png`, `fly2.png`, `t02.png`. Misure: 60 fps a livello «alta» su Mac (Metal); 1 draw call/1 triangolo riportato da `renderer.info` dopo il post-processing (il dato utile è quello di scena, non questo). Non ho un mini-PC: la stima sotto è un rischio, non una misura.

Giudizio d'insieme: il modello è buono e il tetto che si alza è un vero momento «wow». Ma l'esperienza oggi si tradisce con tre cose: (a) **i codici fonte interni sono finiti nelle etichette pubbliche**, (b) **l'inquadratura del chiosco verticale è rotta**, (c) **la camera dei reparti è troppo vicina e non racconta il flusso**. Il resto è rifinitura.

---

## 1. Diagnosi (con riferimenti)

### 1.1 Etichette (CSS2D) · la più grave
- r05, r08, r12, r01: le etichette mostrano «(F 7444)», «(V f_035)», «(sito)», «marca da verificare», «nessuna foto, disegno illustrativo». Sono note di provenienza per il team, non testo per un visitatore in fiera. Un cliente che legge «marca da verificare» sul chiosco vede una bozza. Vanno separate: campo `pubblico` e campo `nota`, con la nota visibile solo in `?debug=1`. (`reparti.js` riga 3 lo dichiara: «Fonti nelle etichette».)
- Stile: `.lab3d` è Helvetica 13 px, riquadro con bordo nero e filo dritto (`index.html` righe 137-138). Fuori dal design system (serif + pillole grigie) e con l'aspetto di un debug overlay. In r08 le tre etichette si leggono, ma sembrano post-it tecnici.
- Su chiosco (k-attract2, kp-attract) le etichette sono **sovrapposte** (tre etichette impilate del reparto 2 e 1) e coprono le persone. Non esiste anticollisione: la posizione è quella 3D proiettata. In verticale (kp-attract) si accumulano sopra la scheda.
- 13 px su un 43-55" a 2 m di distanza sono illeggibili. `zoom:var(--k)` scala scheda/indice ma non `.lab3d` (non è nell'elenco a riga 106).

### 1.2 Regia della camera
- `posaReparto`: distanza = raggio(reparto)·0,3 + 0,6 → r05 e r08 mostrano una macchina, r01 un tavolo vuoto e un muro (r01, fly2). Manca il contesto «dove sono nella fabbrica»: nessun segnale di posizione (minimappa, evidenziazione della zona, linea del percorso).
- Direzione fissa `DIR` (-.64,.6,.48) per tutti i 12 reparti: nessuna variazione di angolo, tutte le inquadrature uguali (vantaggio: coerenza; svantaggio: r08 guarda un muro bianco enorme in alto, il reparto 9 è nascosto dietro). Nessun profilo per reparto (`cam?` mancante).
- Il volo `muoviCamera` usa smorzamento critico su target/direzione e su log(distanza) con «esce-sposta-rientra» (`viaggio*1.15`): buona idea, ma solo se la meta è a > d/1.15; per reparti adiacenti la camera scivola in piano a 3 m dal pavimento e si vedono muri e macchine passare a filo (fly2). Manca l'easing di uscita con sguardo verso la meta (look-ahead) e nessuna pausa d'arrivo: l'occhio non capisce quando la camera è arrivata.
- Ritmo: `CUES` = max(11 s, parole/3+4). Un reparto = 11-16 s. Va bene per la lettura, ma il giro è ~2,5 minuti; nessun «capitolo» (progetto → taglio → foratura → laccatura → montaggio → spedizione).
- `setViewOffset` per la scheda: corretto e ben fatto, ma su schermi ampi il reparto va al centro dell'area libera (a destra della scheda) e il pin/etichetta principale può finire sotto l'indice (r12: il montaggio a sinistra/basso resta sotto la scheda).
- Limiti orbita: `maxPolar 1.3`, `min/maxDistance 6-330`, `clampTarget`. Si può entrare nel muro e finire sotto i tetti dei capannoni; `maxPolar` 1.3 rad permette quasi la vista orizzontale nel prato vuoto (m-tavola: cielo grigio in metà schermo).

### 1.3 Apertura e «tetto che si alza»
- Buono: esterno con tetto (esterno.png), dopo 2,6 s il tetto sale in 1,6 s (`aggiornaTetto`). Problemi:
  1. I 12 pin numerati sono **già visibili sul tetto chiuso** (esterno.png) e fluttuano a caso sulla lamiera. Nel momento «wow» c'è rumore. Nascondere pin e indice finché il tetto non è aperto.
  2. Il tetto sparisce con opacità e traslazione y=16, con trasparenza+`depthWrite` che passa da vero a falso: si vede il «pop» dei materiali (`transparent` cambia → ricompilazione shader possibile) e i muri che si accorciano insieme alle scale. In un video lo si nota. Meglio: tetto a pannelli che scivolano/ruotano, oppure dissolvenza con `alphaHash`/dithering senza cambiare `transparent`.
  3. Dopo l'apertura la camera resta sulla tavola per altri secondi senza guida: il visitatore non sa cosa fare (in chiosco la CTA arriva a 2,5 s e copre il capannone: k-attract2).
- Muri: da vicino (r01) la parete ovest della palazzina, in sezione, riempie la metà dello schermo e la camera vede la stanza da fuori-sopra: leggibile ma povera; r01 è la prima impressione del giro e ha meno interesse di r05.

### 1.4 Wayfinding
- Pin numerati neri 38 px (`.pin3d`) sono chiari e coerenti con l'indice (numeri serif). Nella tavola (tavola.png) sono ben distribuiti. Ma:
  - la logica `crowded` (`md < 46/60 px`) **spegne tutti i pin insieme** appena due si avvicinano: su telefono (m-tavola) con zoom lontano scompaiono o restano, in modo binario; meglio raggrupparli o rimpicciolirli.
  - Nessun nome sul pin: 12 numeri astratti. L'indice in basso li nomina, ma è lontano dallo sguardo. Pin al passaggio del mouse/selezione dovrebbero mostrare il nome («05 La foratura»).
  - Nessuna **rotta** disegnata (linea del percorso del pannello dal magazzino alla spedizione), pur avendo `route` nel modello. È l'elemento che trasforma 12 tappe in un racconto («dal pannello alla cucina»).
  - Nessuna minimappa o indicatore «sei qui» durante le riprese ravvicinate. Solo l'indice evidenziato.
- L'indice a 12 pillole (1920: due righe, `.index` in basso a destra) copre la parte bassa del 3D; su chiosco verticale (kp-attract) l'indice si sovrappone al titolo «Come nasce una cucina RiFR|A» (titolo tagliato).

### 1.5 Chiosco / tocco
- **Verticale 1080×1920 (kp-attract)**: la fabbrica è finita in basso a destra, metà schermo è cielo/prato, il titolo è coperto dall'indice, le etichette sono sopra la scheda. `freeArea()` in modalità KIOSK usa `y1 = min(card.top, kb.top)` ma con `zoom:var(--k)` le coordinate di `getBoundingClientRect()` non coincidono con quelle usate da `setViewOffset` (CSS zoom altera i rect: comportamento diverso tra Chromium e WebKit). Se il chiosco è verticale, va provato e forse `--k` non deve usare `zoom`.
- 1920×1080 (k-attract2): CTA «Tocca per il racconto completo» al centro copre il silo e il reparto; ok come richiamo ma troppo grande e ferma. Va spostata in basso-centro, oppure diventare un anello pulsante su un pin.
- Il pulsante «Ferma le animazioni» rimane in chiosco (in basso a destra): un visitatore lo tocca e il tour si blocca senza spiegazione. Nascondere in `.kiosk` o rinominare («Pausa»).
- Reset a 45 s: presente (`setInterval`, controllo ogni 2 s) e funziona con `lastInput` catturato in fase di cattura. Manca un **avviso** («Riparto tra 10 s… tocca per continuare») e il ritorno alla tavola completa con tetto chiuso: `kioskAttract` fa `jump(0)` direttamente. Effetto: il visitatore che ha smesso di toccare per 46 s si trova un salto di scena; il nuovo visitatore non vede mai l'esterno con tetto (il momento migliore).
- Nessuna gestione multitocco: `OrbitControls` disabilitato (`controls.enabled = !KIOSK`), quindi niente pizzico/rotazione, come da decisione. Ma i pin di 56 px sono sufficienti: bene. Gli «indice» invece: 12 pillole da 56 px minimo in tre righe, ok.
- `error → location.reload()` dopo 5 s: rischio di loop di ricarica se un asset non carica (font da Google Fonts: in fiera senza rete? vedi 1.7).

### 1.6 Informazione: scheda vs 3D
- Gerarchia della scheda buona (numero grande, titolo serif, pillola dati, corpo). In r05: scheda + indice + tre pulsanti + mast + 3 bottoni destra = **8 gruppi di UI sopra il 3D**. Il titolo del mast (52 px) si ripete a ogni schermata e copre il tetto del capannone; nelle riprese di reparto (r01/r05) non serve. Ridurlo a un logo/pillola dopo l'avvio.
- I tre bottoni in alto a destra («Ferma le animazioni», «Qualità alta», «Togli il tetto») sono controlli tecnici. «Qualità alta» è uno strumento di sviluppo: non deve stare in una demo pubblica (regolazione automatica già presente, `perf`).
- Testo scheda: buono, ma le etichette 3D ripetono cose già nella scheda («Levigatrice a nastro largo (F 7449)»). Le etichette dovrebbero mostrare **il nome della macchina + un dato che la scheda non dice** (es. «Biesse Brema EKO 2.1 · foratrice verticale»), non frasi.

### 1.7 Accessibilità
- Reduced motion: `RM` gestito (teletrasporto della camera, niente animazione tetto) e `aria-live`, `aria-current="step"`, lista `#labs` per lettori di schermo, tasti ←/→/spazio/b/t/Esc: **molto sopra la media** per un sito 3D. Lacune: focus dei pin CSS2D non nell'ordine visivo (i 12 pin si aggiungono alla fine del DOM `#labels`); niente `aria-label` sul pulsante «Ferma le animazioni» che cambia stato; `T` pausa anche in RM ma `#motion` disabilitato senza spiegazione; contrasto etichetta ok; in `forced-colors` il pin nero sparisce.
- Caratteri: Instrument Serif + Newsreader da Google Fonts (`index.html` righe 3-5). In fiera senza rete o con firewall: fallback Georgia, **layout diverso** e CLS dei titoli. Installare i font in locale.

### 1.8 Mobile (m-tavola, m-r05)
- Nella tavola più della metà dello schermo è cielo/prato vuoto (m-tavola): `posaTavola` è calibrata sul desktop. Il capannone occupa il 25 % dell'area.
- In r05 (m-r05) la scheda e l'indice coprono il basso; l'area libera è buona; il pin/etichetta è leggibile. Indice 4 colonne × 3 righe (tavola) che sottrae 100 px. Tocco: 44 px ok.
- Livello qualità «media» a telefono: AO spento, ombra 2048. Va bene. `PHONE` richiede `pointer:coarse` e lato < 600: fallisce su iPad (nessuna riduzione).

### 1.8b Finto/giocattolo vs reale
Cosa fa «giocattolo»: (1) persone-manichino monocolore con posa a T e teste sferiche (r05, r08, r12): sembrano segnaposto, non operai; (2) auto a blocchi (r05 destra) e alberi low-poly su prato verde saturo (esterno.png, verde 100 % «Monopoly»); (3) macchine come blocchi bianchi/grigi senza dettagli, cilindri rossi per la carta abrasiva (r08); (4) pavimento con piastrelle grigie uniformi + un asfalto policromo «arcobaleno» al parcheggio (esterno, r05: pixel colorati a mosaico: probabilmente `autobloccanti` con troppa varianza di tinta); (5) senza luce naturale: niente pozze dai lucernari (proposte 2.4 del documento precedente), nessuna polvere, nessuna sporcizia/usura a terra.
Cosa fa «vero»: ombre morbide con AO (r05), righe gialle e riquadro arancione a terra, scaffali arancioni con scatole, il logo in rilievo, il silo con scala e le condotte. Le foto del sito (ricerca/foto) mostrano un ambiente più freddo e più grezzo: il 3D è troppo pulito e caldo.

---

## 2. Cambiamenti proposti (in ordine di priorità)

1. **Togliere i codici fonte dalle etichette pubbliche.** Perché: rischio d'immagine in fiera («marca da verificare», «F 7444»). Come: in `reparti.js` separare `lab(testo, {nota})`; nel DOM mettere solo `testo` (pubblico) e mostrare `nota` solo con `?debug=1`; sostituire le frasi con «nome macchina + dato». Sforzo S. Impatto altissimo.
2. **Stile etichette da design system + anti-sovrapposizione.** `.lab3d` in Newsreader 15-16 px (24 px su `.kiosk`), fondo bianco 96 %, bordo `--border-medium`, raggio 4, filo sottile a 24 px; un algoritmo in `aggiornaSegni()` che ordina per y schermo e sposta lateralmente/verticalmente le etichette con rettangoli che si toccano (o ne mostra al massimo 2 per reparto in chiosco). Aggiungere `.lab3d` all'elenco `zoom:var(--k)` (riga 106). Sforzo M. Impatto alto.
3. **Riparare il chiosco verticale e la CTA.** Non usare `zoom` (usare `font-size`/`scale` con `--k` in variabili CSS reali e `transform-origin`), misurare le aree libere con i rect reali, e provare 1080×1920 e 2160×3840 come test fisso (aggiungere ai controlli `shot3d.js`). CTA: spostare in basso al centro sopra la scheda, oppure una pillola piccola pulsante; nascondere «Ferma le animazioni» e «Qualità» in `.kiosk`. `index.html` righe 104-115, `main.js` `freeArea()`. Sforzo M. Impatto alto (è il prodotto in fiera).
4. **Regia camera per reparto (profili).** Aggiungere in `ST[i]` (edificio.js) un campo `cam:{dir,dist,alt,tgt}`; `posaReparto` lo usa se presente. Principi (Apple/Matterport): 3 tipi di ripresa — «contesto» (alta, mostra reparto + il precedente/successivo), «macchina» (media, 3/4), «dettaglio» (bassa, una postazione); alternare per evitare ripetizione; r01 mostrare la palazzina dall'esterno-alto con il tetto aperto, non un muro. Aggiungere una pausa d'arrivo di 0,6 s e usare `look-ahead` (il target va verso la meta prima della posizione). Sforzo M. Impatto alto.
5. **Rotta visibile + segnale «sei qui».** Disegnare una linea (TubeGeometry o `Line2`) che collega i reparti in ordine (già hai `route` concettuale) con freccette animate (`T`), visibile in tavola e attenuata nel reparto; il tratto tra il reparto corrente e il prossimo si illumina durante il volo. Sforzo M. Impatto alto (trasforma le tappe in flusso). Aggiungere minimappa 2D SVG (140 px) in un angolo con il punto corrente: la pianta esiste già (`ricerca/pianta-schema.png`). Sforzo M.
6. **Pin: nascosti col tetto chiuso, con nome al passaggio, raggruppati.** In `aggiornaSegni`: `show = mode !== 'tour' && tetto > .85`. Sostituire `crowded` binario con scala per distanza (`--s`) e mostrare il nome sul pin attivo o al hover/focus; ordine di tabulazione uguale a quello dell'indice. Sforzo S. Impatto medio-alto.
7. **Apertura da film (attract) e reset con avviso.** Sequenza: 0-3 s volo dall'alto sul tetto chiuso con l'insegna, 3-5 s tetto che si apre, 5 s primo reparto. Nel chiosco: al reset «Riparto tra 10 s» (pillola con anello) e ritorno a **tetto chiuso + tavola** prima di `kioskAttract` (in `kioskAttract`: `tettoGoal=0; goSheet(); poi jump(0)` dopo 3 s). Sforzo S-M. Impatto alto sul primo colpo d'occhio.
8. **Tetto senza «pop».** In `aggiornaTetto`: non cambiare `transparent` a runtime (impostarlo una volta true e usare `opacity`), oppure dissolvenza dithered (`alphaHash`), oppure sollevare il tetto a sezioni sfalsate (lucernari, poi lamiera) con easing `easeInOutCubic`. Evita anche il salto delle scale dei muri (`w.scale.y`) mentre la camera si muove: animare in modo continuo, non a soglie `u < .5`. Sforzo M. Impatto medio-alto (video).
9. **Ridurre l'interfaccia sopra il 3D.** Dopo il primo avvio il mast si riduce a un logo di 40 px (o sparisce nei reparti); i tre pulsanti destra diventano un menu «⋯»; «Qualità» solo in `?debug`. Ricavare 130 px verticali su mobile. `index.html` righe 36, 51-53; `main.js` `$('style')`. Sforzo S. Impatto medio.
10. **Tavola mobile e limiti orbita.** `posaTavola` in funzione dell'aspect (ritratto → d/1.6, target verso il capannone); `maxPolarAngle` 1.15 fuori dal capannone, `minDistance` maggiore in tavola; `clampTarget` dentro il perimetro con un'area di margine (attualmente x -20..150, z -15..80: il prato). Sforzo S. Impatto medio.
11. **Meno «giocattolo».** (a) Persone: tre tute (blu RiFRA, grigio, giallo alta visibilità) e pose 2-3 (chino, in piedi, cammina) con loop 4 s; (b) prato: verde desaturato + tinta terreno (r ≈ 0,45), texture di rumore a bassa frequenza; (c) autobloccanti: ridurre la varianza (mosaico arcobaleno in esterno.png/r05); (d) luce: fasci dai lucernari con `SpotLight` finti o quad additivi, foschia volumetrica leggerissima; (e) polvere in sospensione nel reparto 8 (particelle 40). Sforzo M-L. Impatto medio-alto sul «reale».
12. **Font locali e prestazioni di avvio.** Copiare Instrument Serif e Newsreader in `3d/fonts/` con `@font-face` e `font-display: swap`; schermata di caricamento con barra e testo («Costruisco la fabbrica…» è già il tono giusto) + logo; `renderer.compileAsync` è ok. Sforzo S. Impatto medio (fiera senza rete).
13. **Accessibilità: rifiniture.** Pin nel DOM prima dell'indice o con `tabindex` coerente; `aria-pressed` con testo coerente per «Ferma le animazioni»; modalità `forced-colors` con bordo pin; `prefers-reduced-motion`: disattivare anche le animazioni continue delle macchine (`REP.update` con `T` fermo: già `motionOn`); annuncio dello stato «Il tetto è stato tolto». Sforzo S. Impatto medio.
14. **Telemetria e resilienza chiosco.** `error → reload` con contatore (max 3 in 60 s, poi pagina di cortesia); log locale di quante tappe sono viste e della durata media; `wakeLock` è già presente: aggiungere `visibilitychange` per riprendere. Sforzo S. Impatto medio.
15. **Prestazioni su mini-PC (da misurare).** Livello «media» del chiosco: `dpr 1.5` su 4K = 5,5 MP, `GTAO` spento, ombra 2048: rischioso su iGPU Intel; fissare il chiosco a `dpr 1` + `SMAA` e verificare i 30 fps con `?perf` (mostra fps e `renderer.info.render.calls`). `perf` scende di livello solo dopo 120 fotogrammi > 30 ms: aggiungere un ritorno a 'alta' non serve, ma un `dt` mediano più rapido (60 frame). Sforzo S. Impatto medio (da misurare).

---

## 3. Confronto con prodotti reali (URL)

- **Matterport** (dollhouse, guided tour, dati e tag a livelli, «Dollhouse Trim» per una prima impressione pulita): il vostro tetto che si alza equivale al trim; ma Matterport sposta la camera **tra punti fissi (Tour Stops)** con transizioni brevi e costanti e un elenco laterale. Da copiare: transizioni di 1-1,5 s e un solo tipo di ripresa per punto, tag a livelli («Macchine / Persone / Fonti»). https://matterport.com/blog/refreshing-the-way-to-explore-your-digital-twins · https://matterport.com/blog/elevate-your-experience-with-customization
- **Autodesk Tandem / APS Viewer**: filtri a livelli e schede laterali, marcatori a icona con dati; l'interfaccia è un pannello, la vista è protagonista. Da copiare: una sola area di informazione, marcatori piccoli, nome al passaggio. https://github.com/i2na/Digital-Twin (esempio di digital twin con APS Viewer); https://aps.autodesk.com/en/docs/viewer/v7/developers_guide/overview/
- **Sketchfab viewer**: annotazioni numerate che guidano la camera (stesso schema di pin + indice) con limite di annotazioni visibili e frecce «precedente/successivo». Da copiare: annotazioni come punti di vista salvati con camera propria (proposta 4). https://help.sketchfab.com/hc/en-us/articles/202508396-Annotations
- **NVIDIA Omniverse / Siemens / Visual Components**: gemelli digitali di fabbrica con flusso animato lungo la linea e KPI: quello che qui manca è **il flusso del prodotto in movimento come filo conduttore** (proposta 5). https://www.nvidia.com/en-us/omniverse/ · https://www.visualcomponents.com/
- **Apple product pages / Awwwards 3D**: un movimento di camera per volta, pause d'arrivo, testi brevi che entrano dopo la camera; la sequenza è guidata dallo scroll o dal tempo con easing coerente (cubic-out). Da copiare: testo dopo la camera (ritardo 0,4 s sulla scheda `.fx.in`) e un ritmo variabile. https://www.builder.io/blog/webgl-scroll-animation · https://dappasol.com/guides/cinematic-website-examples/
- **Bruno Simon / Lusion / Active Theory**: mondi in miniatura con luce e materiali curati e piccoli dettagli vivi (polvere, particelle, riflessi); la coerenza stilistica (poco realismo, molta cura) vale più del fotorealismo. Da copiare: stilizzazione voluta e uniforme (persone, alberi, auto nello stesso linguaggio) al posto del misto attuale. https://www.awwwards.com/brunos-portfolio-case-study.html

Nota di onestà: le pagine dei prodotti sono citate come riferimento di pattern, non le ho tutte aperte una per una; la ricerca mi ha dato conferma per Matterport (guided tour/dollhouse trim), Bruno Simon (case study Awwwards) e la letteratura Apple-style (Builder.io). Le altre sono indicate come pagine ufficiali di prodotto.

---

## 4. Punti che difenderò nel dibattito

- Le etichette con codici fonte e la vista chiosco verticale sono **bloccanti** per la fiera; il resto è miglioramento. Se l'altro revisore (produzione/gioco) propone più dettaglio geometrico, io rispondo: prima la regia e le etichette, poi i poligoni, perché il visitatore in fiera guarda 30 secondi e legge la scheda.
- Non aumentare il numero di macchine animate prima di misurare il mini-PC (proposta 15).
- La «casa di bambola» (tetto tolto) è il vostro tratto distintivo: proteggerla, non sostituirla con un tetto trasparente permanente.
- Pin e rotta valgono più di un altro reparto modellato meglio: senza rotta il visitatore vede 12 stanze, non una filiera.
