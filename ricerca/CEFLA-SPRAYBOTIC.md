# Cefla Finishing Spraybotic · come lavora la macchina (ricerca del 30/09/2026)

Scopo: rendere fedele la tappa 9 «La verniciatura» (`3d/js/macchine.js` `lineaCefla()`, `3d/js/reparti.js` `s9`).
Regola del progetto: ciò che si vede nelle foto RiFRA vince sulle schede generiche; il resto è marcato ILLUSTRATIVO nel codice.

## 1. Che cos'è

La Spraybotic è il robot di spruzzatura per pannelli piani di Cefla Finishing (Imola), prodotto intorno al 2000 (le schede
dell'usato citano esemplari del 2000, 2001 e 2006: modelli «MD», «RES/M», «MW», «C/DRY»). Oggi il suo posto nel catalogo
Cefla è preso dall'iBotic, robot cartesiano a uno o due bracci. Il sito RiFRA dice che RiFRA vernicia con un impianto
robotizzato dal 1995 (TABELLA-FATTI).

## 2. Che cosa dicono le fonti

| Domanda | Risposta | Fonte |
|---|---|---|
| Tipo di robot | **cartesiano**: braccio porta-pistole a **5 assi** a controllo elettronico. Corse: **3 500 mm** lungo il nastro, **1 300 mm** attraverso, **300 mm** in verticale; **rotazione 360° ±45°**, **inclinazione da +90° a −30°** (per i bordi) | Lenmark, scheda Spraybotic/MD (2000): https://www.lenmark.com/products/spraybotic-md-spraying-robot-automatic-spray-finishing-system |
| Come lavora | modo robot: «il carico di pezzi entra, **il nastro si ferma** e il robot esegue il percorso di spruzzatura programmato»; in alternativa lavora come spruzzatrice a passaggio continuo (reciprocatore) | Lenmark (come sopra); Surplus Record / Machinio (stessa macchina, serie 91203) |
| Lettura del pezzo | sistema elettronico di lettura con **208 fotodiodi** (barriera): sagoma, misura e posizione del pezzo; da lì il software calcola il percorso | Lenmark; per l'erede iBotic: barriera 2D a 512 fotodiodi o 3D «C-Vision», https://www.ceflafinishing.com/en/products/ibotic-spraying-robot |
| Pistole | **due alimentazioni** di vernice («two lacquer feeds»); dispositivo a spazzola retrattile per pulire gli ugelli durante il lavoro | Lenmark |
| Nastro | nastro continuo **CFB** (plastica/fibra di carbonio) largo **1,65 m**, larghezza utile **1,30 m** compresi i bordi; nell'iBotic in alternativa **nastro di carta** su bobine (per vernici non recuperabili) | Lenmark; ricerca web (scheda Spraybotic/MD); Cefla iBotic |
| Dove va l'overspray | **recupero della vernice** dal nastro con **rulli controrotanti**: carrello di pulizia del nastro a **4 rulli** | Lenmark; Cefla white paper «cleaning system»: https://info.ceflafinishing.com/en/white-paper-cleaning-system |
| Cabina | **pressurizzata** (sovrapressione interna), aria di scarico su **filtri a secco**; nell'iBotic filtri di carta a due stadi oppure velo d'acqua | Lenmark; Cefla iBotic |
| Produzione | circa **70 m²/h** in modo robot, **120 m²/h** a passaggio continuo | riassunto di ricerca su Exapro «Robot verniciatura Cefla Spraybotic MW» (pagina oggi 404): https://www.exapro.it/robot-verniciatura-cefla-spraybotic-mw-p41018002/ |
| Dimensioni di una linea | Spraybotic/MD: linea lunga **24,3 m**, alta **5,6 m**; nastro di carico da **5,5 m**; uscita con 6 nastri da 6 m | Lenmark |
| Prima e dopo | esempio di linea usata (2001): stazione di carico → spazzolatrice-depolveratrice → velatrice → **Spraybotic RES/M** → polmone a catena → trasportatore trasversale → **due tunnel di essiccazione** 8 × 3 m → stazione di uscita. Esempio Lenmark: essiccatoio verticale ad aria calda a 3 camere con 36 ripiani, impilatore | Höchsmann: https://www.hoechsmann.com/45530 ; Lenmark |
| Velocità del nastro | **non trovata** per la Spraybotic. Solo per un'altra Cefla (EASY 2000): 2–8 m/min | ricerca web (Machineseeker/Innomac, scheda EASY) |
| Video ufficiali | nessun video della Spraybotic trovato; su YouTube ci sono l'erede iBotic (es. «MPS Machines – Cefla iBotic robot spraying machine», https://www.youtube.com/watch?v=F44X_39LCNk ; «Cefla Automatic spraying line with ibotic drying systems», https://www.youtube.com/watch?v=Mh1eSCjg1Cc). Le pagine YouTube non si leggono senza browser: descrizioni non verificate | ricerca web |

Altre pagine consultate: https://www.ceflafinishing.com/en/magazine/the-new-ibotic-cartesian-spraying-robot (robot cartesiano,
assi X–Y–Z, spruzzo «solo dove serve»), https://woodindustry.ca/ibotic-cartesian-spraying-robot/ (iBotic: legge i pezzi a nastro
fermo o in moto, un braccio sui bordi e uno sulla faccia), https://www.professioneverniciatore.it/cefla-verniciare-le-ante-di-un-mobile/
(ciclo Cefla per le ante: bordi, robot, forno verticale, impilatore).

## 3. Che cosa si vede da RiFRA (vince sulle schede)

- **F 7450**: Spraybotic di circa 9 m, testate arrotondate, tre finestre sopra un davanzale, zoccolo nero–bianco–nero, logo
  «cefla finishing spraybotic» sul pannello alto centrale; condotte zincate e calate sopra; latte di vernice a destra.
- **F 7451** (attraverso il vetro): **carrello** d'acciaio appeso in alto con una fila verticale di **5 spie rosse**, sotto un
  **tamburo rotante** in acciaio lucido, un'asta e un **gruppo pistole** con **due ugelli** rivolti in basso, avvolto nel cellophane
  e nel nastro di carta; un tubo di alimentazione laterale. Il **nastro** è largo, di colore beige-bruno incrostato di vernice.
  Dietro, pareti chiare della cabina e un neon. Coincide con la scheda: robot cartesiano con rotazione della testa, due pistole.
- **F 7452**: pulpito Cefla con schermo (sullo schermo lo schema della testa con gli assi x e y), tastiera, pulsantiera e
  semaforo; a sinistra un **banco di carico lungo e chiaro** dove l'operatore (grembiule blu, guanti verdi) sistema i pannelli;
  dietro di lui rastrelliere blu.
- **V f_033**: davanti alla Spraybotic una **rulliera folle su ruote**. **V f_037–f_038**: pannelli grigi con maniglie
  (tunnel, funzione non confermata), mixer con due cappe e semaforo.
- **V f_018–f_022**: carrelli di essiccazione a bracci: a RiFRA l'essiccazione si fa sui carrelli, non si vede un forno.

## 4. Cosa resta da chiedere a Matteo / RiFRA

1. **Verso del flusso** della linea (est → ovest, come nel modello?) e **funzione del tunnel grigio**: nelle linee Cefla un tunnel
   è di solito un forno o un appassimento **dopo** il robot; nel modello sta prima (vincolo del rilievo).
2. Nastro di **carta** o **CFB con recupero**? (F 7451: superficie beige incrostata, compatibile con entrambi.)
3. Quante ante per ciclo, formato tipico, colori; il robot fa anche i bordi o i bordi si fanno a parte?
4. Dove si scaricano i pezzi verniciati: sui carrelli a bracci (V f_019) o sulle rastrelliere blu (F 7452)?

## 5. Scelte fatte nel modello (30/09/2026)

> Dal 30/09 sera il ciclo è a **4 ante per ciclo** (§ 5 bis, in fondo): i principi qui sotto valgono ancora; tempi, misure e numero di pezzi
> di questa sezione sono quelli della prima versione (1 anta 140 × 60 per ciclo), superata.

**Fedele alle fonti**
- Ciclo **a nastro fermo** (modo robot della scheda): il nastro avanza di un passo (1,75 m) e si ferma; durante la sosta la testa lavora
  il pezzo fermo.
- **Barriera di lettura** all'ingresso del robot (il nastro ha una fessura sottile, sopra una barra con la luce, sotto il ricevitore):
  quando l'anta la attraversa una riga di luce ne «legge» la superficie.
- **Cinematica cartesiana**: ponte che scorre in x su due guide (corsa usata ±0,85 m, entro i 3,5 m), carrello trasversale in z
  (±0,45 m, entro 1,3 m), asse verticale (−0,18 m per la faccia, −0,30 m per i bordi, entro 0,3 m), **rotazione della testa**
  (un giro completo attorno all'anta) e **inclinazione** delle pistole di 35° per i bordi.
- Aspetto della testa da **F 7451**: carrello con 5 spie rosse, tamburo lucido, gruppo pistole avvolto con due ugelli.
- Ordine di lavoro: **prima i bordi** (percorso attorno all'anta, pistole inclinate verso il bordo), **poi la faccia** a passate
  trasversali (4 passate da 35 cm: due ugelli affiancati). Lo spruzzo si accende **solo sopra il pezzo**; il ventaglio è piatto e
  orientato come la pistola.
- L'anta cambia colore **dove passa lo spruzzo**: i bordi crescono lungo il percorso, la faccia a strisce che seguono la passata.
- All'uscita l'anta passa su una **rulliera** (V f_033) e un operatore la sfila sul **carrello di essiccazione** (V f_019) dal lato
  dei bracci.
- Carico a est come prima: l'operatore di **F 7452** (grembiule blu, guanti verdi) prende l'anta grezza dalla pila e la posa sul
  banco di carico; il nastro la porta nel tunnel.

**ILLUSTRATIVO (senza fonte, segnato nei commenti)**
- **Tempi accelerati**: ciclo di 7,5 s (2 s di avanzamento, 5,5 s di sosta: 0,4 s discesa, 2,6 s bordi, 0,3 s raddrizzamento,
  2 s faccia). Con 70 m²/h un'anta da 0,84 m² richiederebbe circa 40 s. La testa corre a circa 2,3 m/s sui bordi.
- **Taglio di sezione** sul lato sud della Spraybotic: tolti vetri, architrave delle finestre e pannello alto fra il davanzale (1,40 m)
  e 3,05 m; restano zoccolo, pannelli neri e bianco, davanzale, montanti ai giunti e la fascia alta con il logo (abbassato a 0,36 m).
  Serve a vedere nastro, ante e testa dalla camera della tappa; la macchina vera è chiusa (F 7450).
- Carrello di essiccazione: le ante arrivano ai livelli 5, 6, 7 (sopra la quota del nastro, 0,91 m) con la tecnica «pile identiche»;
  l'anta sporge di 22 cm a ovest dei bracci.
- Posizione della barriera di lettura, passo del nastro, una sola anta per sosta, raggio e angolo del percorso sui bordi.
- Colori: grezzo = bianco caldo (come la pila già presente e i pannelli di F 7452), laccato = nero lucido (materiale del progetto).
- Secondo operatore allo scarico (maglietta nera, guanti come F 7452): nelle foto non c'è.
- Pulizia del nastro a rulli controrotanti e filtri: non disegnati (dentro la macchina, non si vedrebbero).
- Il semaforo del pulpito resta verde (linea in marcia).

**Come è fatto nel codice**
- `macchine.js` `CEFLA` (XR centro della zona di lavoro, XL barriera, PASSO, TAGLIO, TESTA, PUNTA) e `lineaCefla()`: guide del ponte,
  `ponte` → `carrello` → `colonna` → `rotore` → `pistola` (gruppi animati, senza ombre), `ventaglio` (cono piatto trasparente), `lettura`
  (riga di luce), nastro in due tratti con la fessura della barriera, rulliera di uscita da 1,2 m.
- `reparti.js` `s9`: tutto in funzione di `t` (nessuna memoria). Ante sul nastro in due InstancedMesh (grezzo, laccato; senza ombra);
  le due ante in mano alle persone sono mesh normali, controllate dal controllo collisioni. Goccioline in una InstancedMesh.
  Secondo operatore allo scarico (`op3`).
- Misure (30/09, Mac con carico alto di altri processi): `perf.js cefla media` callsMax 226 → dopo le ottimizzazioni 217 (base 207);
  tappa 9: 97 (prima 88). Collisioni: 0 casi.

## 5 bis. Quattro ante per ciclo (30/09 sera, approvato da Marco)

Stima di partenza: `ricerca/CAPACITA-VERNICIATURA.md` (sul piano di 3,5 × 1,3 m stanno 4–8 ante da 60 × 72). Il **4** è una stima prudente,
non un dato di RiFRA: da confermare con Matteo. Nel testo pubblico: «per esempio quattro per ciclo».

**Pezzi e gruppo**
- Ante di base **72 cm lungo il nastro × 60 cm attraverso**, spessore 2 cm (misure locali della tappa 9; `ANTA` globale resta 140 × 60 per
  le altre tappe). Gruppo **2 × 2** con 10 cm fra i pezzi: ingombro 1,54 × 1,30 m (nastro utile 1,30; passo 1,75).
- La zona di lavoro è stata spostata a x 54,05 (`CEFLA.XR` −5,05) e la barriera a 56,68 (`XL` −2,42): così la sosta di uscita (48,8) sta tutta
  fuori dalla testata ovest e la barriera cade fra due soste.

**Ciclo (P = 13 s; tempi ILLUSTRATIVI e accelerati: con 70 m²/h le 4 ante, 1,73 m², richiederebbero circa 90 s)**

| Tempo nel ciclo | Nastro | Robot | Scarico |
|---|---|---|---|
| 0–2 s | avanza di 1,75 m; il gruppo che entra passa sotto la barriera (due righe di luce, solo sopra i pezzi) | sale e torna all'inizio dei bordi | il gruppo esce dalla testata ovest sulla rulliera |
| 2,0–2,4 | fermo | scende di 30 cm, pistole inclinate di 35° | |
| 2,4–9,9 | fermo | **bordi di tutte e 4 le ante**: perimetro esterno del gruppo con 4 quarti di cerchio, poi 4 corse lungo i bordi interni affacciati sugli spazi (3 giri della testa in tutto); spruzzo spento fra i pezzi; circa 2,25 m/s | 2,3–4,6 coppia ovest al livello basso; 5,6–8,5 coppia est al livello alto |
| 9,9–10,2 | fermo | raddrizza, sale a −18 cm | ritorno |
| 10,2–12,7 | fermo | **faccia**: 5 passate trasversali da 31 cm su tutto il gruppo; spruzzo spento fra le due file e fuori dal gruppo | |

- Ogni anta cambia colore dove passa lo spruzzo: strisce di bordo lungo le corse (solo sui pezzi), faccia a strisce di passata, pezzo per pezzo.
- **Carico** (per tutto il ciclo, un viaggio ogni 3,25 s): l'operatore di F 7452 prende un'anta dalla pila (ante 72 × 60, tecnica «pile identiche»),
  si gira con l'anta davanti a sé e la posa al centro del **nastro di carico** (ora lungo 2,5 m, fino a 15 cm dal muro est), che scorre a 0,35 m/s
  e la porta nel tunnel. Il gruppo 2 × 2 si forma dentro il tunnel, dove non si vede (ILLUSTRATIVO): una sola persona non arriva alla fila lontana
  di un nastro largo 1,4 m.
- **Scarico**: due operatori (ILLUSTRATIVI), uno a sud e uno a nord della rulliera, ognuno prende l'anta della propria fila: 2 ante per livello,
  affiancate in z, 2 livelli per ciclo (5–6 nei cicli pari, 7–8 nei dispari), con ante identiche già presenti sui livelli di arrivo.
- Il **carrello di essiccazione** della tappa è passato da x 47,6 a 47,0 (restano 20 cm dai carrelli fermi): il gruppo sulla rulliera occupa 48,0–49,6.
- ILLUSTRATIVO: per i bordi esterni la testa sta fuori dal gruppo e il carrello trasversale si sposta di ±0,98 m, oltre la corsa di 1,3 m della scheda
  (che parla di «larghezza utile 1,30 m compresi i bordi»: il carico reale di 4 ante sarebbe forse più stretto o disposto diversamente).

**Misure (30/09 16:30, carico medio 3,5–4,2)**: shot3d tappa 9 fps 60, nessun errore; collisioni 0 casi (tappa 9 e completo);
`perf.js cefla-4ante media`: 60 fps in tutte le viste, callsMax 219 (budget 250), tappa 9: 101.
