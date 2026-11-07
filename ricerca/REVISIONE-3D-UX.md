# Revisione 3D e UX del motore · proposte per RiFRA (29/09/2026)

Revisione in sola lettura del motore FonteAlta (`…/12_Video/Produzione-animata/src.html`, 1.393 righe), dei suoi documenti (CLAUDE, HANDOFF, GUIDA, VERBALE), delle schermate in `build/qc/` e del materiale RiFRA (`TABELLA-FATTI.md`, `pianta-schema.png`, provini di foto e fotogrammi).
Punto di vista: game designer UX e ingegnere di esperienze 3D. Nessun file del progetto è stato modificato.

Legenda: **Sforzo** S = mezza giornata, M = 1–3 giorni, L = più di 3 giorni · **Impatto** e **Rischio** alto/medio/basso · **Conflitto**: se tocca una decisione di Marco su FonteAlta (A1…A10, «Decisioni bloccate»).

---

## 1. Diagnosi: cosa limita la lettura 3D oggi

Ogni punto viene dal codice o dalle schermate `colori-80`, `colori-180`, `colori-258` e `v8-258`.

1. **Gli indizi di profondità sono solo tre**: l'occlusione, le tre tinte per faccia (M.t/l/r) e l'ombra a parallelogramma di `box()` (solo con SOLID e z=0). Mancano la prospettiva aerea (il lontano più chiaro), l'occlusione ambientale (il contatto a terra e l'angolo muro-pavimento) e le ombre di `cyl`. Macchine e pavimento sembrano «posati» e non «appoggiati».
2. **La griglia 3×4 regge tutto l'ordine di disegno**: `draw()` disegna `byRow(0)`, poi il muletto, `byRow(1)`, il carrello e `byRow(2)`. I mezzi sono infilati a mano tra le file e il reparto 11 ha un'eccezione al culling scritta a mano (`i!==11`). Con una pianta irregolare questo schema cade.
3. **Il reparto attenuato è «a raggi X»**: gli altri reparti vanno a `globalAlpha=.35`. Ogni faccia viene composta da sola (knock + inchiostro + contorno in `multiply`), quindi si vedono gli spigoli interni e le macchine si sovrappongono in trasparenza (colori-80 in alto a sinistra, colori-180). È l'artefatto più visibile della vista reparto.
4. **Il `multiply` è attivo anche nel 3D a colori**: va bene sulla carta chiara, ma con le pareti antracite RiFRA (#38383B) e i pavimenti scuri le sovrapposizioni semitrasparenti diventano fango. Inoltre ogni faccia costa due riempimenti, un contorno e due cambi di composizione.
5. **Muri e tetto**: solo due muri di fondo alti 7,6. Niente muri davanti, niente tetto e niente struttura (capriate, pilastri). Nella tavola intera il capannone si legge come un vassoio, non come un edificio. Nella vista reparto, vicino al fondo, il muro occupa un terzo dello schermo (colori-80).
6. **Indizi di scala**: la scala la danno solo le persone (~25 px nella tavola). Mancano porte, pilastri, giunti del pavimento e bancali ripetuti. RiFRA è più grande e più allungata (~1,7:1): nella tavola intera le persone scenderebbero a ~12 px.
7. **L'inquadratura del reparto è fissa**: `stationCam` usa il centro (5,4; 5; 2,4) e un riquadro di 265×215 px-mondo uguale per tutti. Vale solo per reparti quadrati di 12×12 con le macchine al centro.
8. **Passaggio tavola ↔ reparto**: una molla su x, y e log z (corretta, niente rimbalzo). Tra reparti lontani però la camera scorre a zoom alto: si perde l'orientamento e manca un segnale «sei qui».
9. **Troppe scritte, e scritte illeggibili nella tavola**: i nomi dei reparti a terra (`ptext` sul pavimento) nella tavola intera sono alti circa 6–8 px («IL TAGLIO» in v8-258). Questo è contro la regola «scritte ≥ 12,5 px». Le etichette a schermo invece funzionano: spazio schermo, niente sovrapposizioni, stop sopra i sottotitoli.
10. **Prestazioni**: tutto si ridisegna a ogni fotogramma (capannone compreso). Le forme si ricostruiscono da closure (`path(pts)`) a ogni chiamata e non esiste un livello statico in cache. Il limite del backing store è di 4,2 MP: in 4K nativo (DPR 1) il canvas viene reso a ~0,7× e ingrandito, quindi i tratti sono morbidi. Le prestazioni su mini-PC non sono mai state misurate (P10).
11. **Tocco e chiosco**: il bersaglio del tocco è il prisma del reparto, grande e quindi buono. Non ci sono bersagli piccoli e distinti per il numero o la tappa. Nel chiosco (niente trascinamento né pizzico, decisione A5) l'unica navigazione è l'indice.

---

## 2. Pianta reale irregolare: come modellarla

### 2.1 Un modello dati al posto di `STATIONS/PITCH/BAY/HX/HY` — **M**, impatto alto, rischio medio, nessun conflitto
Un solo oggetto `PLAN`, in unità mondo (1 u ≈ 1 m, come oggi):
- `hall`: poligono del perimetro, con i gradini del lato nord;
- `zones[]`: `{id, nome, poligono, pavimento, pareti}` per magazzino, verniciatura, laboratorio, falegnameria, uffici;
- `aisles[]`: corridoi come polilinee con larghezza (il corridoio centrale N-S e i tre E-O);
- `stations[]`: `{n, zona, rect:[x,y,w,d], z:0, h, cam?, overflow?}`. Ogni tappa è un rettangolo qualsiasi disegnato in coordinate locali, come oggi con `translate`. Una tappa può essere un'unione di rettangoli: il 12 compare due volte (imballaggio e magazzino);
- `overhead[]`: condotte, soppalco, capriate; `exterior`: parcheggio, strada, alberi, silo, filtri, container;
- `route[]`: punti di passaggio del pezzo lungo i corridoi.

**Scala narrativa:** conviene non rispettare i metri tra un reparto e l'altro. Si comprimono i corridoi e le zone vuote del magazzino, così i reparti restano grandi. La tabella dei fatti dice già «proporzioni indicative».

### 2.2 Orientamento della vista — **S** (è una scelta), impatto alto
In isometria sono «di fondo» i lati con x o y minimi. Ho confrontato due opzioni.
- **A** · nord in alto a destra, ovest in alto a sinistra. Il muro a gradini e gli uffici stanno sul fondo, alti. Parcheggio e cortile impianti restano davanti: il silo (alto circa 15 m) coprirebbe la fascia est.
- **B** · nord in alto a sinistra, est in alto a destra (**consigliata**).
  - Il muro nord a gradini e il cortile impianti stanno sul fondo: silo, filtri e container diventano lo skyline dietro il capannone.
  - Le condotte zincate escono dal muro di fondo verso i filtri: si racconta «aspirazione → silo» senza parole.
  - Uffici (ovest) e parcheggio (sud) finiscono davanti e bassi: uffici in sezione, parcheggio come piano.
- Da provare su un rendering con solo pavimento, muri e silo prima di scegliere. Con A la tappa 1 (ufficio tecnico a NO) sta sul fondo; con B sta davanti a sinistra, al primo piano, in sezione.

### 2.3 Muri in sezione («dollhouse») — **M**, impatto alto, rischio basso, nessun conflitto
- Ogni lato del perimetro si classifica con la sua normale verso l'esterno. I lati che guardano lontano dalla camera sono **muri pieni** (7,5 u), con finestre a nastro e portoni sezionali. I lati verso la camera sono **muretti di 1,2 u** con la testa scura campita, come il taglio di una sezione architettonica.
- La regola vale da sola anche sui gradini del lato nord: i tratti del muro nord sono pieni; i risvolti che guardano la camera sono muretti, quelli che le danno le spalle sono pieni.
- Colori dei muri presi dalla zona: bianchi nel magazzino, antracite in produzione (fonte V).
- Vicino al reparto inquadrato, i muri pieni che coprono più del 25 % dell'inquadratura scendono di altezza con una dissolvenza (limite tipo «cutaway»).

### 2.4 Tetto e lucernari come livello facoltativo — **M**, impatto medio-alto, rischio basso
- **Apertura**: si parte dall'esterno con il tetto chiuso (lamiera grigia, lucernari, insegna RIFRA sulla palazzina). Poi il tetto si alza e sfuma in 1,2 s e appare la casa di bambola. È il momento più «da gioco» del giro, e nel chiosco funziona come richiamo.
- **Dentro**: niente tetto. Le capriate sono linee sottili a z=7,5 solo nella tavola intera; i lucernari diventano **pozze di luce** chiare sul pavimento, un indizio di profondità a costo zero.
- Luci LED a strisce: segmenti chiari sotto le capriate, visibili solo nella tavola intera.

### 2.5 Esterno — **M**, impatto medio, rischio basso
- Isola su carta: asfalto, autobloccanti del cortile, parcheggio a spina (righe), via F.lli Cervi come nastro con il nome scritto a terra. Il bordo sfuma nella carta (vignetta) invece di finire di netto.
- Pochi alberi stilizzati (sfere e coni, 6–10) disegnati una volta in cache. Silo con telaio verde e scala, due filtri, container, pensilina (tutti con fonte V/PE).
- Contesto e non contenuto: saturazione bassa, nessuna etichetta salvo «silo polveri» quando serve al racconto.

### 2.6 Pavimento per reparto — **S**, impatto alto, rischio basso
Riempimento del poligono di ogni zona con una tinta leggermente diversa:
- magazzino chiaro #DFE0E1;
- produzione cemento #A8A6A1 schiarito;
- verniciatura con velo di polvere bianca;
- uffici con pavimento lucido (un riflesso a banda).

In più: giunti del cemento ogni 6 u (linee a 6 % di opacità), per scala e profondità; righe gialle e riquadri arancio a terra dove ci sono nelle foto (7442, 7445). Le zone si distinguono per luminosità, non solo per tinta (daltonismo).

### 2.7 Livelli in alto: condotte, soppalco, capriate — **M**, impatto alto, rischio medio
- Si disegnano in un **passaggio finale separato**: stanno sopra tutto il resto, tranne i pilastri, che vanno ordinati con gli oggetti a terra.
- Soppalco = pilastri (a terra, ordinati) + solaio e ringhiera gialla (in alto).
- **Dissolvenza per zoom**: nella tavola intera sono pieni; nella vista reparto, sopra il riquadro inquadrato, scendono al 20 % oppure restano solo il contorno e la ringhiera. Così il CNC sotto il soppalco si vede.
- Le calate flessibili gialle e bianche sono parte della macchina, non del soffitto: restano sempre piene.

### 2.8 Ogni tappa ha la sua inquadratura — **S/M**, impatto alto, rischio basso
- `cam` automatica: il banco di prova esegue la scena per un ciclo, registra ogni chiamata a `P()` e ne ricava il riquadro vero sullo schermo, altezze comprese. Aggiunge un margine e scrive il valore nel `PLAN`. Si può correggere a mano con `cam:{cx,cy,w,h}`.
- Tappa al primo piano (ufficio tecnico): `z` della tappa > 0, solaio superiore tagliato, prisma di selezione rialzato.

### 2.9 Il percorso del pezzo a terra — **M**, impatto alto, rischio basso
- Polilinea sui corridoi tra i punti d'ingresso delle tappe, scritta a mano nel `PLAN`. Si disegna **nel livello del pavimento** (regola: ciò che è a terra va prima).
- Nel giro il percorso **si rivela man mano**: pieno fino alla tappa corrente, tratteggio leggero dopo. Frecce con il tratteggio che scorre lentamente (fermo se le animazioni sono ridotte).
- ⚠️ La sequenza è ancora «illustrativa» (tabella fatti): il percorso va confermato dal cliente prima di essere disegnato come vero.

---

## 3. Qualità visiva nel 3D a colori

### 3.1 Direzione artistica «plastico architettonico» — **M**, impatto alto; **conflitto possibile** (vedi A8)
- Per un marchio di cucine di lusso propongo il modello da studio di architettura: capannone e macchine in bianchi e grigi caldi (#DFE0E1, #A8A6A1, #38383B, nero), pochissimi accenti.
- **Il colore lo porta il prodotto**: ante laccate, cemento, finiture metallo.
- Le macchine tengono i colori veri solo come fascia di riconoscimento: verde Biesse, onda azzurra Brandt, rosso e bianco Cefla, ringhiera gialla.
- Su FonteAlta Marco ha voluto il gioco in inchiostri propri e il design system solo nell'interfaccia (A8). **La domanda va fatta di nuovo per RiFRA** prima di iniziare (GUIDA § 6).

### 3.2 Luce unica e materiali da un solo colore base — **M**, impatto alto, rischio basso
- Oggi `M` contiene terne scritte a mano con 4 inchiostri. RiFRA richiede molte più tinte (verde Biesse, blu Brandt, arancio, giallo, zincato, carrelli rossi).
- Proposta: `mat(base, {gloss, metal})` calcola alto, sinistra e destra da una sola luce, in alto a sinistra sullo schermo (coerente con l'ombra attuale verso +x+y). Per esempio alto = base +12 % di luminosità, faccia +y = base, faccia +x = base −22 %.
- Colori **opachi precalcolati** e disegno in `source-over`: un riempimento per faccia invece di tre operazioni. Risolve insieme il «fango» del `multiply` e il costo.
- La matita resta com'è: il ramo SOLID diventa un percorso a sé in `shp`.

### 3.3 Occlusione ambientale finta — **S**, impatto alto, rischio basso
- Sfumatura scura di 0,5 u alla base di ogni muro sul pavimento.
- Una «impronta di contatto» sotto ogni macchina, ingrandita del 6 % e scura al 18 %, con bordo morbido.
- Angoli muro-muro scuriti. Tutto nel livello statico, quindi senza costo per fotogramma.

### 3.4 Ombre morbide — **S/M**, impatto medio-alto, rischio basso
- Due strati: il contatto (sopra) più l'ombra proiettata di oggi, a opacità più bassa e con il bordo sfumato. La sfumatura (`ctx.filter='blur()'` oppure gradiente) si calcola **una sola volta** nella cache statica.
- Ombra anche per `cyl`, per il silo e per i pilastri.
- Le ombre delle cose che si muovono restano ellissi semplici, come per le persone oggi.

### 3.5 Vetro e laccato lucido — **S**, impatto alto per il marchio, rischio basso
- **Laccato**: sulle ante lucide, una banda speculare diagonale bianca (18–25 %, gradiente lineare). La sua posizione si sposta un poco con `cam.x`, così nel panning l'anta «riflette»: sembra lusso senza costo. Per il laccato opaco niente banda; per il metallo spatolato una grana leggera.
- **Vetro** (cabina Cefla a tre finestre, facciata degli uffici): interno disegnato prima, poi velo azzurro-grigio al 25 % e due righe di riflesso.
- **Zincato** (condotte): il tipo `galv` in `KIND` con una striscia chiara centrale lungo il tubo. Il meccanismo `glint` esiste già.

### 3.6 Polvere di levigatura e segatura — **S**, impatto medio, rischio basso; attenzione a «niente effetti inventati»
- Particelle deterministiche (come `sparks()`, con seme e tempo). Si disegnano solo dove le fonti mostrano polvere: levigatrice, squadratrice, sezionatrice, velo bianco alla verniciatura.
- Colore crema, massimo 40 per macchina, **aspirate verso la bocca della calata**: il racconto dell'aspirazione.
- Spente con animazioni ridotte e nella qualità bassa.

### 3.7 Nastri e rulli — **S**, impatto medio, rischio basso
Rulli come trattini con fase `(t·v) mod passo`; il pannello sul nastro va **alla stessa velocità** dei trattini, come per `walkOf` (niente pattinamento). Vale per la bordatrice Brandt, il banco a rulli della Cefla e la levigatrice.

### 3.8 Prospettiva aerea — **S**, impatto medio
Un velo color carta dal 0 all'8 % crescente verso il fondo (x+y piccoli), solo nella tavola intera. In isometria è l'unico modo per dire «lontano».

---

## 4. Interazione e sensazione di gioco

| # | Proposta | Sforzo | Impatto | Rischio | Conflitto |
|---|---|---|---|---|---|
| 4.1 | **Volo esce-sposta-rientra** tra tappe lontane (zoom «alla van Wijk»): se la distanza supera 1,5 inquadrature, la camera si allarga, si sposta e poi stringe. Resta la molla critica attuale. | S | alto | basso | no |
| 4.2 | **Niente rotazione dal vivo.** Si sceglie una delle 4 rotazioni in fase di progetto (§ 2.2). Ruotare durante l'uso romperebbe la regola «di schiena» (A7) e gli ordini di disegno scritti a mano in ogni scena. Al massimo: rotazione solo nella tavola intera, con reparti semplificati. | — | — | alto se fatta | **sì, A7** |
| 4.3 | **Passaggio del mouse**: pavimento del reparto schiarito del 6 % + nome in un'etichetta a schermo + puntatore a mano. Il riquadro giallo resta a terra (regola v8). | S | medio | basso | no |
| 4.4 | **Segnaposto numerati a schermo** nella tavola intera: cerchi con il numero, 36 px col mouse, 44 al tocco, 56 nel chiosco. Sostituiscono le scritte a terra illeggibili e sono bersagli precisi. | S | alto | basso | no (rispetta A2) |
| 4.5 | **Minimappa** 2D in un angolo: la pianta piatta, il rettangolo della vista e le tappe. Toccarla porta alla tappa. Solo desktop e telefono in orizzontale; nel chiosco al massimo un «sei qui» statico. | M | medio | medio (spazio) | no |
| 4.6 | **«Segui il pezzo»**: tra una tappa e l'altra l'anta viaggia sul percorso (§ 2.9) e la camera la segue con un leggero anticipo. Il volo della camera coincide con il tragitto e diventa racconto. | M | alto | medio (tempi della voce) | no |
| 4.7 | **Barra del tempo trascinabile** con 12 tacche. Le scene sono funzioni pure di `t`, quindi andare avanti e indietro è gratuito. Durante il trascinamento la voce si ferma, poi riparte dal punto. | S/M | medio | basso | no |
| 4.8 | **Animazioni ridotte**: tagli con dissolvenza di 150 ms al posto dei voli; particelle, tratteggio che scorre e riflessi mobili spenti. | S | alto (WCAG) | basso | no |
| 4.9 | **Chiosco**: nel giro breve una deriva lentissima della camera (±2 %, ciclo di 40 s). Rende lo schermo vivo e protegge dal burn-in. Solo tocco, bersagli ≥ 56 px. Durante il giro breve i segnaposto restano visibili. | S | medio | basso | no (A5 rispettata) |
| 4.10 | **Livelli di dettaglio**: sotto una soglia di zoom le persone perdono dita, occhiali e cuffie, ma restano animate; la minuteria degli scaffali diventa blocchi. | S/M | alto sulle prestazioni | basso | no |

---

## 5. Ingegneria

### 5.1 Ordine di disegno per piante irregolari — **M**, impatto alto, rischio medio
- **Oggetti statici** (tappe, scaffali, pilastri, cataste): ordinamento topologico tra rettangoli a terra, fatto una volta al caricamento. A sta dietro B se `A.xmax ≤ B.xmin` oppure `A.ymax ≤ B.ymin`. Con n ≈ 60 un grafo O(n²) va benissimo.
- Il banco di prova verifica che i rettangoli non si sovrappongano: se si sovrappongono, l'ordine non è definito.
- **Oggetti mobili** (muletto, stoccatore, transpallet, carrelli): si inseriscono a ogni fotogramma nella lista ordinata confrontandoli solo con i vicini.
- **Dentro una tappa** resta l'ordine scritto a mano di oggi (regole della GUIDA § 5).
- **Passaggi fissi**: terra (esterno, pavimento, tinte, percorso, riquadri) → muri pieni → oggetti ordinati → muretti davanti → livello alto (§ 2.7) → etichette.

### 5.2 Culling — **S**
Ogni oggetto e ogni tappa dichiara i propri limiti, compreso quello che esce dal rettangolo (`overflow`). Così sparisce l'eccezione `i!==11`. Anche condotte, alberi e scaffali passano dal test di `visRect()`.

### 5.3 Livelli in cache — **M**, impatto alto, rischio medio
- **Livello statico** (esterno, pavimento, AO, muri pieni, macchine ferme dei reparti non attivi): lo si disegna in un canvas fuori schermo **solo per gli zoom della tavola intera**, a gradini di ×1,25.
  - Durante il movimento della camera si ridimensiona la copia più vicina, un po' morbida (FonteAlta passa già alle tinte piatte in movimento).
  - A zoom da reparto non si mette in cache: il culling lascia poche cose da disegnare. Una cache a 4,5× con DPR 2 supererebbe i 18.000 px.
- **Reparti non attivi**: uno sprite ciascuno, aggiornato **a turno** (2–3 reparti per fotogramma, quindi ~15 fps ciascuno). Il reparto a fuoco resta dal vivo. Si attenuano con l'opacità **dello sprite**, e il difetto dei «raggi X» (§ 1.3) sparisce.
- **Cosa rende sporca la cache**: cambio di stile, ridimensionamento, gradino di zoom, font caricati.

### 5.4 Path2D riusati — **S/M**, impatto medio-alto, rischio basso
`P()` è lineare: la geometria statica si può proiettare una volta in un `Path2D` in pixel-mondo, e la trasformazione del contesto fa lo zoom. Da fare per pavimento, muri, scaffali, condotte e alberi, e per il logo (lo fa già `LOGO_P`).

### 5.5 Densità di pixel e 4K — **S**, impatto medio
- Tetto del backing store adattivo: si parte da 4,2 MP; si sale a 8,3 MP (4K nativo) se il 95° percentile del tempo di fotogramma resta sotto 12 ms per 2 s; si scende a 3 MP se supera 20 ms. Con isteresi, e senza cambiare durante i voli.
- Nel video resta DPR fisso: il 1080p esatto di `record.js`.

### 5.6 Banco di prova — **M**, impatto alto, rischio basso
Si estende `test-headless.js` (canvas finto) e si aggiunge una prova Playwright:
- **pianta**: tappe dentro il perimetro e nella loro zona; rettangoli che non si sovrappongono; percorso tutto dentro i corridoi; ancore delle etichette dentro la tappa;
- **ordine**: coerenza dell'ordinamento su coppie campionate; muletto e carrello mai «dentro» una macchina;
- **inquadrature**: riquadro registrato con `P()` (§ 2.8) contenuto nell'area libera a 1920×1080, 1280×800, telefono verticale e orizzontale;
- **scatti**: ricreare il banco perso (P8) che campiona giunti e oggetti e segnala salti sopra 4 px;
- **prestazioni** (Playwright): tempi di fotogramma nella tavola, nel reparto e in volo, a 1080p e 4K, anche con CPU rallentata 4×. Budget: 95° percentile < 16,7 ms a 1080p sul mini-PC dello stand;
- **visivo**: `check.js` con confronto a pixel contro le schermate approvate.

---

## 6. Decisioni FonteAlta: cosa resta, cosa va chiesto a Marco

**Restano tutte:**
- A1 tutto disegnato dal codice (niente foto e niente texture). Il logo RiFRA è stato vettorializzato (`build/brand/logo.svg` da PNG): va approvato perché è un ricalco;
- A2 etichette ≥ 12,5 px;
- A7 persone di schiena;
- niente scatti;
- ordine delle fasi = ordine della voce;
- voce muta in fiera;
- regole sull'ordine di disegno.

**Da chiedere prima di iniziare:**
- stile del gioco: matita a inchiostri propri o plastico nella palette RiFRA (§ 3.1). Sono le stesse domande che su FonteAlta hanno fatto tornare indietro (v7);
- font nella scena: Instrument Serif / Newsreader vanno bene per insegne e scritte grandi. Per le etichette a 12,5 px una serif sul canvas si legge peggio: propongo di tenere una sans o una mono per le etichette;
- orientamento A o B (§ 2.2);
- sequenza reale del pezzo e «pezzo protagonista» (oggi illustrativi);
- funzione di «county level», VP Impianti ed EMC.

---

## 7. Top 10 per la prima versione RiFRA

In ordine, con sforzo e perché.

1. **Modello dati `PLAN`** (perimetro a gradini, zone, corridoi, tappe come rettangoli, livelli) al posto della griglia 3×4 · M · È la base di tutto il resto.
2. **Ordine di disegno a passaggi + ordinamento topologico delle tappe**, con verifica dei rettangoli nel banco di prova · M · Senza questo la pianta irregolare si rompe.
3. **Muri in sezione**: fondo pieno, davanti muretti con testa campita; bianco nel magazzino, antracite in produzione · M · Rende subito leggibile l'edificio e fedele alle foto.
4. **3D a colori riscritto**: materiali da un colore base con una luce sola, colori opachi, `source-over`, un riempimento per faccia · M · Risolve il fango sui muri scuri e dimezza il costo.
5. **AO finta + ombre morbide in cache** (contatto, piede dei muri, angoli) · S/M · Il salto di qualità più grande per il minimo lavoro.
6. **Inquadrature automatiche per tappa** (riquadro registrato con `P()`) + **volo esce-sposta-rientra** tra tappe lontane · S/M · Pianta grande senza perdere l'orientamento.
7. **Livello alto** (condotte zincate, soppalco con ringhiera gialla, capriate) disegnato per ultimo e sfumato con lo zoom · M · È la firma visiva di RiFRA e non deve coprire il CNC.
8. **Percorso del pezzo a terra che si rivela nel giro** + **segnaposto numerati a schermo** al posto delle scritte a terra · M · Racconto chiaro e bersagli al tocco conformi.
9. **Cache del livello statico e reparti non attivi come sprite aggiornati a turno** (addio opacità «a raggi X») + DPR adattivo · M · 60 fps a 1080p sul mini-PC, 4K quando regge.
10. **Banco di prova esteso** (pianta, inquadrature, scatti, tempi di fotogramma) · M · Evita di ripetere P8 e P10 di FonteAlta.

**Subito dopo:**
- apertura dall'esterno con il tetto che si alza (§ 2.4);
- «segui il pezzo» (4.6);
- laccato lucido con riflesso mobile (3.5);
- polvere aspirata (3.6);
- minimappa (4.5).
