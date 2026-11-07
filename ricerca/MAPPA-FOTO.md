# Mappa foto e layout metrico · fabbrica RiFRA (Gerno di Lesmo)

Rilievo del 30/09/2026. File collegati:

- `ricerca/MAPPA-FOTO.png`: pianta rettificata con perimetro corretto, macchine (M01…M34, E01…E12), punti di ripresa numerati con coni di vista, percorso del video IMG_0008.
- `ricerca/LAYOUT-MACCHINE.json`: edificio, pareti, corridoi, soppalco, aperture, insegne, esterni, macchine (centro, dimensioni, colori, aspetto, operatore, flusso, fonti, confidenza), riprese.
- `ricerca/zoom/pianta_rettificata_5cm.jpg`: pianta raddrizzata in scala 0,05 m/px (x = px·0,05 − 14,18; z = py·0,05 − 11,13). Si può usare come texture di riferimento nel modello.
- `ricerca/esterno/satellite-esri-z19.jpg` (nord in alto, 0,209 m/px) e `satellite-ruotato-10cm.jpg` (ruotato come la pianta, 0,10 m/px; x = px·0,1 − 12,4; z = py·0,1 − 10,75).
- `ricerca/fotogrammi/extra/`: fotogrammi 1280 px estratti da IMG_0011, 0012, 0013.

Sistema di riferimento (lo stesso di `3d/js/edificio.js`): **x = est della pianta, z = sud della pianta, metri, origine nello spigolo nord-ovest del blocco uffici**. Direzioni di ripresa: 0° = nord della pianta (−z), 90° = est (+x), 180° = sud, 270° = ovest.

## 1. Metodo

1. **Rettifica della pianta.** La foto IMG_0009 (HEIC 4032×3024, convertita con `sips`) ha solo una distorsione trapezoidale verticale: il muro ovest e il muro est convergono verso l'alto, i muri orizzontali restano orizzontali. Ho misurato i 4 spigoli dell'edificio (NO uffici, SO uffici, SE hall al locale tecnico, NE magazzino est prolungato), calcolato l'omografia (Python puro) e raddrizzato con il filtro `perspective` di ffmpeg. IMG_0008/pianta_full ha anche una rotazione e un'ondulazione più forte della carta, quindi l'ho usata solo per leggere le scritte.
2. **Scala e proporzioni.** La pianta non ha scala grafica. Ho scaricato le tessere satellitari Esri World Imagery z19 (0,2087 m/px alla latitudine 45,64°) attorno alle coordinate GPS delle foto, ruotato l'immagine di 136,2° per allinearla alla pianta e misurato i profili di luminosità:
   - dal muro ovest al bordo est della copertura a volte: **1417 px × 0,05 m = 70,9 m**;
   - dal bordo nord del blocco uffici al muro sud: **815 px × 0,05 m = 40,75 m**;
   - volte: **24 nervature ogni 60 px = 3,0 m**, asse nord–sud, su 70,9 m;
   - blocco uffici a tetto scuro: **10,5 × 11,75 m** (la pianta dà 10,3 × ~11,2).
   In pianta rettificata l'edificio misura 1000 × 550 unità; quindi **x = 0,0709 m/unità** e **z = 0,0742 m/unità** (la correzione verticale 1,046 coincide con quella che rende rotondo il cerchio del silo, 1,067, entro il 2%).
3. **Verifiche indipendenti** con misure note:
   - auto sul satellite: 2,0 × 4,2 m (corretto);
   - stalli del parcheggio ovest in pianta: 4,9 m di passo (stallo in linea tipico 5 m);
   - 2 container del cortile est: 2,9 × 6,0 m (container da 20': 2,44 × 6,06);
   - silo: diametro 4,2–4,7 m;
   - centri di lavoro Biesse Rover A disegnati 6,0–6,8 × 4,8 m (ingombro tipico di un Rover A con protezioni: 6–8 × 4,5–5,5 m);
   - Brandt 6,1 m (bordatrici KDF: 4–6 m);
   - squadratrici 3,4 × 3,5 m (carro da 3,2 m);
   - Brema EKO 2.1 5,4 × 2,9 m.
   Con la vecchia scala (120 m) tutte queste misure risulterebbero 1,7 volte troppo grandi (un container lungo 10 m, un'auto lunga 7 m). I valori tipici dei costruttori sono indicativi: non li ho verificati sui cataloghi online, perché la scala da satellite è già metrica.
4. **Posizione delle riprese.** Per ogni foto e fotogramma ho riconosciuto le macchine visibili, il lato delle finestre (muri esterni sud, nord ed est; parete interna con finestre alte a lamelle tra magazzino e produzione), il colore delle pareti (magazzino chiaro, produzione antracite) e la sequenza del video (3 s tra un fotogramma e l'altro, circa 3 m di cammino). Ho ricavato posizione e direzione in modo che le macchine note cadessero nel campo visivo (0,5× dell'iPhone, circa 100°).

## 2. Scala: il perimetro attuale è sbagliato

| | modello attuale (`HALL`) | rilievo |
|---|---|---|
| lunghezza O–E | 120 m | **70,9 m** |
| profondità N–S | 59 m (−3 … 56) | **40,6 m** (uffici NO), 35,2 m (lato est) |
| rapporto | 2,0 | 1,75 |

**HALL corretto** (in senso orario sulla pianta, uffici compresi):

```js
export const HALL = [[0, 0], [24.9, 0], [24.9, 2.4], [50, 2.4], [50, 5.4], [70.9, 5.4], [70.9, 40.6], [0, 40.6]];
```

I gradini del lato nord vengono dal satellite: z = 0 fino a x = 24,9; z = 2,4 fino a x = 50; z = 5,4 fino al muro est. La pianta fotografata dà circa 2,4–4 e 7,4 per gli ultimi due, ma lì la carta è ondulata.

**Volumi e altezze** (le altezze non sono misurate; restano quelle del modello):

| volume | posizione | altezza e copertura |
|---|---|---|
| blocco uffici a due piani | x 0–10,3, z 0–11,2 | h 7,6, tetto piano scuro |
| striscia uffici al piano terra | x 0–5,3, z 11,2–40,6 | dentro l'involucro a volte, controsoffitto a ~3,2 m |
| magazzino ovest e locale mobili scuri | x 10,3–50, z 0 / 2,4–13 | tetto piano chiaro a quadrotti, h 6,2 |
| magazzino est | x 50–70,9, z 5,4–13 | tetto piano, h 6,2 |
| produzione | x 0–70,9, z 12,4–40,6 | 24 volte da ~2,95 m, asse N–S, h 7,2 |

**Pareti interne:**

- magazzino/produzione a z = 13,0 (x 5,3–70,9). Varchi a x 40,4–42,4 (corridoio centrale), x ~48 (porta del video f_018), x ~64 (porta vicino al Robopac), x 69,3–70,9 (corridoio lungo il muro est).
- uffici/produzione a x = 5,3 (z 11,2–40,6), con finestre sugli uffici.
- blocco uffici a due piani: x = 10,3 e z = 11,2.
- blocco sotto il soppalco: x 7,3–25,8, z 13–19,4 (area break, archivio, magazzino attrezzature montatori).
- cabina verniciatura: x 26,6–35,9, z 13,1–19,5.
- locale tecnico: x 68,9–70,9, z 38,7–40,6.

**Corridoi** (percorsi verdi della pianta):

- E–O: z 10,3 (magazzino), z 23,4 (tra montaggio/verniciatura e laboratorio/carteggiatura), z 33,3 (tra laboratorio e falegnameria);
- N–S: x 6,6 (lungo gli uffici), x 9,3 (falegnameria ovest), x 41,3 (centrale), da x 60 a 62 (dalla levigatrice alla porta SE).

**Soppalco S1:** x 7,3–25,8, z 13–19,4, piano a +3,3 m. Ringhiera gialla #F2C500 sui lati sud ed est; scala a x 24–25,8, z 18,1–19,4 (disegnata in pianta). Si vede in f_062, f_066, f_068, f_069 e sullo sfondo di 7442 e 7453. Una seconda scala, quella degli uffici, è a x 6,3–9,3, z 10,4–11,4 (7466, 7467).

**Impianti esterni (lato est):**

| impianto | x | z | note |
|---|---|---|---|
| pensilina | 70,9–74,9 | 5,4–21 | davanti al portone sezionale del magazzino (z ~9,5) |
| serbatoio aria compressa | 71,8 | 20,5 | con i compressori |
| 2 filtri polveri | 74,9–77,6 | 18,4–22,4 | |
| 2 container | 78,3–81,2 | 18,4–30,3 | |
| centrale termica | 71,1–74,9 | 24,1–31 | |
| silo | centro 74,4 | centro 36 | Ø 4,4 m, h ~14 m |
| deposito vernici | ~93 | ~22 | ruotato di −30° |
| cassone rifiuti | ~96,5 | ~19 | ruotato di −30° |
| cabina ENEL | 77,8–81,3 | 46,1–49,6 | |
| cabina elettrica | 81,3–85,8 | 44,1–47,9 | |
| contatori gas | ~74,7 | ~49,3 | |

**Via F.lli Cervi e fascia sud:**

- recinzione sud a **z = 47,0** (satellite; la pianta, schematica fuori dall'edificio, la disegna a ~50);
- carreggiata z 47–56,5, con alberi e auto sul lato opposto;
- tra il muro sud e la recinzione, cortile in autobloccanti di 6,4 m con furgoni e auto perpendicolari al muro. La pianta vi disegna stalli a spina (x 11,6–63,5).

**Cancelli:**

- ovest (verso il vialetto) a x ≈ −4,8;
- civico 17, pedonale e carraio, a x ≈ 7,3: pilastro con pensilina a due falde e targa RIFRA;
- carrabile est a x ≈ 67,5, verso la porta SE e il cortile impianti.

**Parcheggio ovest (correzione chiesta):**

- è una **fascia stretta di ~6 m**: recinzione a x ≈ −6, stalli da x −5,8 a −3,6, vialetto/corsia da x −3,6 a 0 (muro uffici);
- **8 posti in linea da ~5 m, da z ≈ 1 a z ≈ 41**;
- auto **parallele al muro, asse nord–sud ("in verticale" sulla pianta)**, una dietro l'altra, muso verso sud o nord. Conferme: pianta (8 stalli fra due tratteggi), satellite (auto 2 × 4,2 m allineate N–S a x −5,2…−3,4), video IMG_0012 a 12,5 s, foto 7465;
- oltre la recinzione, a x ≈ −11,6, c'è il capannone vicino.

Il modello attuale ha stalli perpendicolari profondi 5,5 m a x −14,5, più una corsia: una fascia di ~16 m, circa 2,5 volte troppo larga.

**Orientamento geografico.** Il "nord" della pianta non è il nord reale. Sulla pianta +x punta verso NO geografico (azimut ~316°), +z (via F.lli Cervi) verso NE (~46°). Conta per il sole: nel satellite le ombre del mattino cadono verso il nord della pianta.

## 3. Insegna RIFRA: su quale facciata

- **IMG_7465** (piazzale nord-ovest, verso SE) mostra la scritta **RIFRA su due facce** del blocco uffici a due piani:
  - la faccia **nord** (a sinistra nella foto): verso il piazzale e gli alberi, **dalla parte opposta a via F.lli Cervi**;
  - la faccia **ovest** (a destra): verso il vialetto del parcheggio, vicino all'ingresso con pensilina.
- **earth-uffici-insegna** (vista dal nord della pianta) conferma la scritta sulla faccia nord, più o meno centrata (x ≈ 4–7).
- **Via F.lli Cervi è a sud.** Lì, sul pilastro del civico 17, c'è solo la targa RIFRA.

Nel modello la scritta è sulla facciata ovest, centrata a z = 4,5 e larga 10 m. Quello che l'utente chiama "dietro" è quindi la **facciata nord del blocco uffici**:

```js
E.insegne.push({ x: 6.0, y: 6.9, z: -0.05, w: 3.0, h: 0.75, ry: Math.PI });   // nord, principale
E.insegne.push({ x: -0.05, y: 6.9, z: 9.3, w: 2.2, h: 0.6, ry: -Math.PI / 2 }); // ovest, piccola, sopra l'ingresso (facoltativa)
```

Le lettere sono in rilievo, scure, su una fascia bianca sopra le vetrate. Sono alte ~0,6–0,75 m e lunghe ~3 m, non 10 × 2,1 m come nel modello.

## 4. Tappe del percorso (proposta di nuovi rettangoli `ST`, stessa forma `[x0, z0, w, d]`)

| tappa | nome | `ST` [x0, z0, w, d] |
|---|---|---|
| 1 | Il progetto (ufficio tecnico) | [0.5, 0.5, 9.5, 6] |
| 2 | I pannelli (deposito materiali SE) | [60.5, 33.8, 6, 6.5] |
| 3 | La sezionatura (sezionatrice verticale) | [54.8, 37.5, 6.2, 3] |
| 4 | La squadratura (3 squadratrici) | [40.8, 34, 14.6, 4] |
| 5 | La foratura (Brema + foratrice da banco) | [31, 36.8, 9, 3.8] |
| 6 | La fresatura (2 Rover) | [22, 26, 17.5, 5.6] |
| 7 | La bordatura (Brandt + De Stefani) | [42, 24.2, 7.5, 6.2] |
| 8 | La levigatura | [61, 22.4, 7.6, 4.2] |
| 9 | La verniciatura (Cefla + forno) | [48.9, 14.9, 20.4, 6.3] |
| 10 | La lucidatura (EMC + VP, lato est) | [63.2, 26.8, 7, 12.5] |
| 11 | Il montaggio (Erregi) | [19.8, 20.2, 17.1, 2.8] |
| 12 | L'imballaggio | [7.1, 19.1, 9.2, 3.8] |

## 5. Macchine e arredi (dettagli completi nel JSON)

| id | nome | marca / modello | centro x, z | w × d × h (m) | conf. |
|---|---|---|---|---|---|
| M01 | Centro di lavoro CNC n.1 | Biesse Rover A (targa 'Rover A' sul fianco) | 25.7, 28.7 | 6.8 × 4.8 × 2.8 | alta |
| M02 | Centro di lavoro CNC n.2 | Biesse (Rover, gemello del n.1) | 33.6, 28.9 | 6 × 4.8 × 2.8 | media |
| M03 | 'county level' (voce della pianta, funzione ignota: armadio utensili / magazzino attrezzi CNC?) | - | 38.25, 29.15 | 2.1 × 4.5 × 2 | bassa |
| M04 | Foratrice CNC verticale | Biesse Brema EKO 2.1 'Milano' | 34, 38.75 | 5.4 × 2.9 × 2.3 | alta |
| M05 | Foratrice da banco | - | 38.95, 39.25 | 1.5 × 0.7 × 1.6 | media |
| M06 | Squadratrice n.1 | Casolin (scritta sul carro, V f_058) | 42.7, 35.95 | 3.4 × 3.5 × 1.3 | alta |
| M07 | Squadratrice n.2 | non leggibile (bianca/grigia come Casolin) | 48.7, 35.95 | 3.4 × 3.5 × 1.3 | media |
| M08 | Squadratrice n.3 | Altendorf (basamento verde, scritta sul fianco) | 53.6, 35.95 | 3.4 × 3.5 × 1.3 | media |
| M09 | Sezionatrice verticale a parete | non leggibile | 57.95, 39.65 | 5.7 × 1.3 × 2.9 | alta |
| M10 | Area a deposito materiali (pannelli in piedi e bancali) | - | 63.6, 36.05 | 3.4 × 3.7 × 2.5 | media |
| M11 | Linea VP Impianti (due unita' con nastro blu e serbatoi a pressione) = 'lucidatrice' della pianta | VP Impianti | 66.7, 34.9 | 2 × 8 × 2.4 | media |
| M12 | Lucidatrice / levigatrice a nastro largo | EMC 'Luc line' | 65.8, 28.6 | 4.5 × 2.6 × 2.3 | bassa |
| M13 | Levigatrice (grande, 5 calate di aspirazione) | da verificare (probabile levigatrice robotizzata 2005) | 64.65, 24.45 | 6.7 × 3.7 × 3 | alta |
| M14 | Robot di verniciatura + forno (linea di verniciatura) | Cefla Finishing Spraybotic (robot); forno non visto | 59.1, 18.05 | 20.4 × 6.3 × 3.6 | alta (posizione) / media (verso del flusso) |
| M15 | Mixer vernici (unita' con due cappe flessibili e quadro con semaforo) | - | 59.8, 20.6 | 2 × 1.4 × 2.4 | media |
| M16 | Carrelli di essiccazione (rastrelliere mobili) | - | 45.2, 17.5 | 6 × 6 × 1.9 | alta |
| M17 | Deposito S.C.H. (armadio/locale sostanze) | - | 37.4, 14.4 | 2.8 × 1.2 × 2.2 | bassa |
| M18 | Cabina verniciatura manuale | - | 31.25, 16.3 | 9.3 × 6.4 × 4.5 | media |
| M19 | Strettoio per scocche + linea di montaggio | Erregi | 28.35, 21.6 | 17.1 × 2 × 2.6 | alta |
| M20 | Imballaggio (area banchi) | - | 11.7, 21 | 9.2 × 3.8 × 1 | bassa |
| M21 | Levigabordi | De Stefani | 44.85, 25.15 | 4.5 × 1.3 × 1.4 | alta |
| M22 | Bordatrice | Brandt (KDF) | 45.65, 29.05 | 6.1 × 1.3 × 1.6 | alta |
| M23 | Levigatrice a nastro lungo manuale (verde) | non leggibile | 58.5, 31.8 | 7.5 × 1.8 × 1.8 | bassa |
| M24 | Rastrelliere a sbalzo gialle (carteggiatura) | - | 55.2, 26.25 | 9.2 × 1.3 × 3 | media |
| M25 | Rastrelliere a sbalzo gialle (laboratorio) | - | 19.45, 25.9 | 9.7 × 1.5 × 3 | media |
| M26 | Macchine tradizionali di falegnameria (toupie, pialla, colonne verdi) | varie | 57, 36.8 | 3 × 2.5 × 1.6 | bassa |
| M27 | Avvolgitore per bancali | Robopac | 64.5, 11.6 | 2.4 × 2.4 × 2.9 | media |
| M28 | Area ricarica muletti | - | 58.3, 12.8 | 3 × 0.8 × 1.2 | media |
| M29 | Scaffalature porta-pallet magazzino (lungo la parete sud) | - | 46, 12.6 | 49 × 1.2 × 4.5 | media |
| M30 | Scaffalature magazzino ovest (lungo il muro nord + 3 testate N-S) | - | 33.9, 5.2 | 10.2 × 1.3 × 4.5 | media |
| M31 | Mobili cucina scuri in deposito/esposizione | RiFRA (prodotto) | 17.5, 5.5 | 10 × 6 × 2.2 | media |
| M32 | Magazzino attrezzature montatori (sotto il soppalco) | - | 20.7, 16.25 | 6.2 × 6.3 × 3.2 | media |
| M33 | Area break + archivio (sotto il soppalco) | - | 11.7, 16.05 | 8.8 × 6.1 × 3.2 | media |
| M34 | Uffici: reception, ufficio tecnico con plotter, sala riunioni, corridoio vetrato | - | 5, 20 | 10.3 × 40.6 × 3 | media |
| E01 | Pensilina (tettoia di carico lungo il muro est) | - | 72.9, 13.2 | 4 × 15.6 × 4.5 | media |
| E02 | Serbatoio aria compressa + compressori | - | 72.4, 21.3 | 1.8 × 3 × 2.5 | media |
| E03 | Filtri polveri (2) | - | 76.25, 20.4 | 2.7 × 4 × 6.5 | media |
| E04 | Magazzino container (2) | - | 79.75, 24.35 | 2.9 × 11.9 × 2.6 | media |
| E05 | Centrale termica | - | 73, 27.5 | 3.8 × 6.9 × 4 | media |
| E06 | Silo polveri | - | 74.4, 36 | 4.4 × 4.4 × 14 | alta |
| E07 | Deposito vernici | - | 93, 22.3 | 3 × 2 × 2.4 | bassa |
| E08 | Cassone rifiuti (pianta)  | - | 96.5, 18.8 | 5.5 × 2.5 × 2 | bassa |
| E09 | Cassone scarrabile blu + furgone bianco Iveco (davanti alla porta SE) | - | 66, 44 | 6 × 2.5 × 2.2 | media |
| E10 | Cabina ENEL | - | 79.5, 47.9 | 3.5 × 3.5 × 3 | media |
| E11 | Cabina elettrica | - | 83.5, 46 | 4.5 × 3.8 × 3 | media |
| E12 | Contatori gas | - | 74.7, 49.3 | 2 × 0.6 × 1.5 | media |

Colori, aspetto per la modellazione, posizione dell'operatore e flusso: campi `colori`, `aspetto`, `operatore`, `flusso` del JSON.

## 6. Tabella delle riprese (31 foto, 69 fotogrammi di IMG_0008, altri video, Street View)

Il "n. mappa" è il numero sul marker di MAPPA-FOTO.png: foto = ultime 2 cifre di IMG_74xx (quadrato arancio; 009 e 010 = IMG_0009/0010, senza posizione); fotogrammi = numero di f_0xx (cerchio blu); v11/v12a/v12b/v13 = altri video (viola); E1…E3 = Street View (verde).

| n. mappa | ripresa | tipo | camera x, z (m) | guarda verso | zona (pianta) | cosa si vede | conf. |
|---|---|---|---|---|---|---|---|
| 40 | IMG_7440 | foto | - | - | cartello piano di evacuazione (posizione del cartello non determinabile) | pianta di evacuazione completa (terza foto della pianta) | - |
| 41 | IMG_7441 | foto | 14, 33.5 | E (90°) | FALEGNAMERIA / CNC, corridoio E-O z 33 | corridoio lungo verso est, carrelli rossi con ante, a sinistra i Biesse (cappa verde) e banchi, calate aspirazione, soffitto grigio con LED | media |
| 42 | IMG_7442 | foto | 26, 34.5 | N (0°) | LABORATORIO | M01 Biesse Rover A di fronte, pulpito a sinistra, banco in truciolare, righe gialle; sullo sfondo in alto a sinistra ringhiera gialla del soppalco | alta |
| 43 | IMG_7443 | foto | 30, 35 | N (20°) | LABORATORIO | M01/M02 Biesse, operatore in nero al banco, tavolo in truciolare in primo piano | media |
| 44 | IMG_7444 | foto | 34, 34 | S (180°) | FALEGNAMERIA / CNC | M04 Brema EKO 2.1, finestre del muro sud dietro, foratrice da banco (M05) a sinistra sullo sfondo, sgabello | alta |
| 45 | IMG_7445 | foto | 48, 33 | S (180°) | FALEGNAMERIA / CNC | squadratrice (M07) con riquadro arancio a terra, pannelli appoggiati, finestre sud | media |
| 46 | IMG_7446 | foto | 41.5, 31 | NE (60°) | CARTEGGIATURA / LUCIDATURA | M22 Brandt da ovest, rastrelliere e pile di pannelli (M24) dietro, a sinistra in fondo il magazzino chiaro | media |
| 47 | IMG_7447 | foto | 47.5, 31.5 | S (180°) | FALEGNAMERIA / CNC | squadratrice M07 con carro lungo, Casolin M06 a destra, carrelli rossi, finestre del muro sud, calate zincate | media |
| 48 | IMG_7448 | foto | 57, 35 | E (90°) | CARTEGGIATURA / LUCIDATURA lato est | M11 linea VP Impianti (rulliere blu, due unita', serbatoi a pressione); dietro muro in blocchi (centrale termica, E05), locale con porta verde a destra (locale tecnico), a sinistra armadi rossi e uscita sul muro est; finestre del muro sud a destra | media |
| 49 | IMG_7449 | foto | 62, 33 | N (5°) | CARTEGGIATURA / LUCIDATURA | M13 levigatrice con 5 calate, rulliera di carico, carrello rosso; sullo sfondo a sinistra il Cefla Spraybotic (M14); a destra armadi rossi e scaffali lungo il muro est | alta |
| 50 | IMG_7450 | foto | 60, 25 | N (0°) | VERNICIATURA | M14 Cefla Spraybotic di fronte (tre finestre), barattoli di vernice rossi e bianchi a destra, lucernario | alta |
| 51 | IMG_7451 | foto | 58, 22 | N (0°) | VERNICIATURA | interno del robot attraverso il vetro: testa rotante con pistole avvolte nel nastro | alta |
| 52 | IMG_7452 | foto | 68.5, 23.5 | NO (315°) | VERNICIATURA (estremita' est) | pulpito Cefla con monitor, tastiera e semaforo; operatore con grembiule blu al banco a rulli di carico | media |
| 53 | IMG_7453 | foto | 38, 22 | O (270°) | strettoio e linea di montaggio | M19 Erregi (portale grigio, quadro aperto), due operatori, scaffali ferramenta, armadietti scuri; in fondo a destra ringhiera gialla del soppalco | alta |
| 54 | IMG_7454 | foto | 31, 20 | N (0°) | cabina verniciatura | M18: stanza con pareti incrostate, cavalletti girevoli, portone sezionale sul fondo | media |
| 56 | IMG_7456 | foto | 28, 9 | E (90°) | MAGAZZINO / SPEDIZIONI | corridoio lungo del magazzino verso est: finestre sul muro nord a sinistra, porta verde al gradino, portone sezionale sul fondo, a destra parete con finestre alte a lamelle, banchi e lavasciuga | alta |
| 57 | IMG_7457 | foto | 68, 10 | O (270°) | MAGAZZINO / SPEDIZIONI est | M27 Robopac a sinistra, scaffali con bancali a destra, corridoio verso ovest | media |
| 58 | IMG_7458 | foto | 64.5, 9.5 | S (180°) | MAGAZZINO / SPEDIZIONI est | M27 Robopac da vicino, porta grigia nella parete verso la produzione, finestra a lamelle sopra | media |
| 59 | IMG_7459 | foto | 25, 23.4 | E (90°) | corridoio montaggio (z 23.4) | scaffali gialli con ferramenta a sinistra, carrelli con ante, corridoio lungo verso est, pareti antracite | bassa |
| 60 | IMG_7460 | foto | 15, 8 | N (10°) | locale nord-ovest del magazzino | M31 mobili cucina scuri, scaffalatura sul muro nord con finestre, porta aperta sul verde a destra | media |
| 61 | IMG_7461 | foto | 2.8, 10.9 | N (0°) | UFFICI INGRESSO (piano terra) | reception: bancone scuro, orologio a pendolo davanti alla vetrata dell'ufficio, piante, finestra ovest con auto (rivisto 30/09) | media |
| 62 | IMG_7462 | foto | 3.5, 9.3 | S (160°) | UFFICI INGRESSO (piano terra) | fotocopiatrice, porta bianca a griglie del ripostiglio sotto la scala (Q.E. RIP), parete in legno arancio, porta sud verso il corridoio con carta RIFRA (rivisto 30/09) | media |
| 63 | IMG_7463 | foto | 5.3, 7.5 | O (270°) | UFFICIO (piano terra, pareti scure) | scrivanie scure verso le finestre ovest, parete vetrata sull'ingresso a sinistra, parete scura a destra (rivisto 30/09) | media |
| 64 | IMG_7464 | foto | 9.5, 4.8 | O (285°) | UFFICIO TECNICO / COMMERCIALE (piano terra: auto e recinzione ad altezza d'occhio dalla finestra ovest) | open space con plotter, disegni appesi sulla parete sud, finestre a nastro nord e ovest, lampade a stelo (rivisto 30/09) | media |
| 65 | IMG_7465 | foto | -7, -6 | SE (135°) | esterno, piazzale nord-ovest | blocco uffici a due piani con vetrate; scritta RIFRA sulla facciata NORD (sinistra) e sulla facciata OVEST (destra, vicino all'ingresso con pensilina); a sinistra il magazzino basso con finestre; a destra il vialetto ovest con auto in fila | alta |
| 66 | IMG_7466 | foto | 4.5, 9.5 | E (90°) | UFFICI INGRESSO (piano terra) | rampa 1 della scala verso est con luci nei gradini a sinistra e muretto a destra, orologio a pendolo a sinistra, porta a griglie del ripostiglio (rivisto 30/09) | media |
| 67 | IMG_7467 | foto | 5.3, 10.5 | E (90°) | scala uffici, dal primo piano | rampa 2 in discesa, parapetto a sinistra sulla rampa 1, luci nei gradini a destra (rivisto 30/09) | media |
| 68 | IMG_7468 | foto | 5.2, 9.5 | N (0°) | PRIMO PIANO, corridoio | parete vetrata della sala del consiglio a sinistra (poltrone, sedie), termosifone e foto a destra, estintore in fondo (rivisto 30/09) | media |
| 69 | IMG_7469 | foto | 4.2, 1.8 | S (180°) | PRIMO PIANO, sala del consiglio (CDA; Marco 30/09: «sta al secondo piano») | tavolo riunioni lungo bianco, sedie nere, schermo a parete, finestre a ovest (rivisto 30/09; prima nella striscia a z 23,8) | media |
| 70 | IMG_7470 | foto | 4.6, 1.8 | S (190°) | PRIMO PIANO, porta della sala del consiglio | a sinistra il corridoio con il parapetto della scala in fondo, a destra la sala (rivisto 30/09) | media |
| 71 | IMG_7471 | foto | 5.2, 1.3 | S (180°) | PRIMO PIANO, corridoio | locale quadri a sinistra, sala del consiglio vetrata a destra, luci della scala in fondo (rivisto 30/09) | media |
| 009 | IMG_0009 | foto | - | - | cartello piano di evacuazione | pianta intera (usata per la rettifica) | - |
| 010 | IMG_0010 | foto | - | - | cartello piano di evacuazione | pianta intera (seconda inquadratura) | - |
| v11 | IMG_0011 | video | 7.5, 32 | O (270°) | corridoio ovest, davanti agli uffici | finestra su un ufficio illuminato, cassetta pronto soccorso Hilti rossa | media |
| v12a | IMG_0012a | video | 5, 43.5 | N (0°) | fascia sud, estremita' ovest | facciata sud: finestre a lamelle, portone scorrevole bianco con oblo', porta pedonale con pensilina nera, moto verde | alta |
| v12b | IMG_0012b | video | 0.5, 41.5 | N (0°) | spigolo SO -> vialetto ovest | vialetto in autobloccanti largo ~5 m, auto parcheggiate in fila lungo la recinzione (muso verso sud), cartello '<- uffici' sul muro, finestre della striscia uffici, in fondo il blocco a due piani e alberi | alta |
| v13 | IMG_0013 | video | 20, 22.5 | N (0°) | davanti al blocco sotto il soppalco | scaffali gialli con ferramenta, carrelli, pareti grigie, porta, lavabo | bassa |
| E1 | E streetview-ingresso-17 | web | 20, 50 | N (0°) | via F.lli Cervi | panoramica (deformata) della facciata sud: pilastro civico 17 con pensilina e targa RIFRA, portone sezionale, silo a destra, blocco uffici a sinistra | bassa |
| E2 | E streetview-facciata-cancello | web | 5, 49 | N (0°) | via F.lli Cervi, estremita' ovest | facciata sud vicino allo spigolo SO: porta con pensilina, finestra, portone scorrevole bianco; auto perpendicolari nel cortile a sinistra | media |
| E3 | E silo | web | 80, 42 | NO (300°) | cortile est | silo ottagonale E06 | media |
| 1 | f_001 | video 0008 | 5, 7 | N (0°) | uffici (blocco NO) | scrivania scura con scatole, finestre con tende | bassa |
| 2 | f_002 | video 0008 | 8, 8 | E (90°) | uffici (blocco NO) | scaffale/archivio (mosso) | bassa |
| 3 | f_003 | video 0008 | 10, 8.5 | E (90°) | porta uffici -> magazzino | porta scura | bassa |
| 4 | f_004 | video 0008 | 11.5, 8 | E (70°) | locale nord-ovest del magazzino | moduli cucina scuri, pavimento chiaro | media |
| 5 | f_005 | video 0008 | 13, 8.5 | NE (30°) | locale nord-ovest del magazzino | M31 mobili cucina scuri, scaffali, porta aperta sul verde, cassa 'baldi porte' | media |
| 6 | f_006 | video 0008 | 19, 10 | E (90°) | MAGAZZINO / SPEDIZIONI | corridoio lungo verso est, scaffali con bancali a destra, portone sezionale sul fondo | media |
| 7 | f_007 | video 0008 | 22, 10 | E (90°) | MAGAZZINO / SPEDIZIONI | banchi, carrelli, scaffali, cartoni | media |
| 8 | f_008 | video 0008 | 25, 10 | E (90°) | MAGAZZINO / SPEDIZIONI | bancali, scaffali, colonne, finestre a lamelle | media |
| 9 | f_009 | video 0008 | 28, 10 | E (90°) | MAGAZZINO / SPEDIZIONI | bancali, transpallet, persona | media |
| 10 | f_010 | video 0008 | 31, 10 | E (90°) | MAGAZZINO / SPEDIZIONI | transpallet rosso, carrelli | media |
| 11 | f_011 | video 0008 | 34, 9.5 | NE (60°) | MAGAZZINO / SPEDIZIONI | fusti blu, scaffali sul muro nord con finestre, transpallet | media |
| 12 | f_012 | video 0008 | 37, 10 | E (90°) | MAGAZZINO / SPEDIZIONI | corridoio (mosso) | bassa |
| 13 | f_013 | video 0008 | 39, 10 | E (80°) | MAGAZZINO / SPEDIZIONI | banchi di lavoro, persona (mosso) | bassa |
| 14 | f_014 | video 0008 | 42, 9 | E (90°) | MAGAZZINO / SPEDIZIONI (gradino x 50) | porta verde nel muro al gradino, finestre alte strette a sinistra, portone sezionale sul fondo, quadro elettrico su colonna | media |
| 15 | f_015 | video 0008 | 46, 9.5 | E (90°) | MAGAZZINO / SPEDIZIONI est | portone sezionale sul fondo, finestre | media |
| 16 | f_016 | video 0008 | 50, 10 | E (90°) | MAGAZZINO / SPEDIZIONI est | portone sezionale, scala a pioli, pannelli | media |
| 17 | f_017 | video 0008 | 51, 11.5 | S (180°) | MAGAZZINO est | banco blu (mosso) | bassa |
| 18 | f_018 | video 0008 | 48.5, 13.3 | S (200°) | porta magazzino -> verniciatura | attraverso la porta: carrelli di essiccazione blu, latte di vernice, parete grigia | media |
| 19 | f_019 | video 0008 | 47, 16 | SO (240°) | VERNICIATURA | M16 carrelli di essiccazione pieni di ante, lucernario | media |
| 20 | f_020 | video 0008 | 46, 18.5 | SO (220°) | VERNICIATURA | carrelli di essiccazione, calate zincate, parete antracite | media |
| 21 | f_021 | video 0008 | 45, 20.5 | S (200°) | VERNICIATURA | carrelli verdi con bracci blu (ravvicinati) | media |
| 22 | f_022 | video 0008 | 49, 26.3 | O (270°) | CARTEGGIATURA | M21 De Stefani a destra, carrelli di essiccazione a sinistra, scaffali in fondo | media |
| 23 | f_023 | video 0008 | 47, 27 | S (180°) | CARTEGGIATURA | pavimento (mosso) | bassa |
| 24 | f_024 | video 0008 | 47, 27.5 | S (200°) | CARTEGGIATURA | M22 Brandt ravvicinata | media |
| 25 | f_025 | video 0008 | 49.5, 28.6 | O (270°) | CARTEGGIATURA | M22 Brandt in fuga, pallet di pannelli, macchine bianche in fondo | media |
| 26 | f_026 | video 0008 | 50, 31 | SE (150°) | FALEGNAMERIA | carrelli rossi, righe arancio a terra (mosso) | bassa |
| 27 | f_027 | video 0008 | 52, 32 | S (200°) | FALEGNAMERIA | pannelli in piedi, carrelli, carro di squadratrice | media |
| 28 | f_028 | video 0008 | 52, 28 | E (90°) | CARTEGGIATURA | M24 rastrelliere a sbalzo con pannelli, pile di pannelli, M23 levigatrice verde in fondo | media |
| 29 | f_029 | video 0008 | 54, 29.5 | E (90°) | CARTEGGIATURA | pile di pannelli, macchina verde, macchine bianche (VP/EMC) a destra in fondo | media |
| 30 | f_030 | video 0008 | 56, 30.5 | E (80°) | CARTEGGIATURA | M23 levigatrice a nastro lungo verde, carrelli, piano pannelli | media |
| 31 | f_031 | video 0008 | 60, 28 | N (20°) | CARTEGGIATURA | motore verde, carrelli (mosso) | bassa |
| 32 | f_032 | video 0008 | 65, 26 | NE (60°) | CARTEGGIATURA / VERNICIATURA, muro est | banchi con rotoli di carta abrasiva, armadio rosso, uscita di emergenza sul muro est | media |
| 33 | f_033 | video 0008 | 66, 25 | NO (300°) | VERNICIATURA | M14 Cefla Spraybotic con banco a rulli davanti | media |
| 34 | f_034 | video 0008 | 66, 24 | NO (300°) | VERNICIATURA | Cefla (mosso) | bassa |
| 35 | f_035 | video 0008 | 67, 24 | NE (60°) | VERNICIATURA, muro est | armadi rossi, banchi, orologio, estintore, uscita di emergenza; a sinistra blocco grigio della linea Cefla | media |
| 36 | f_036 | video 0008 | 68.5, 22.5 | N (0°) | VERNICIATURA, estremita' est | pulpito Cefla con schermo blu, armadi rossi, rastrelliera carta abrasiva | media |
| 37 | f_037 | video 0008 | 69.5, 20 | NO (330°) | corridoio lungo il muro est | pannelli grigi con maniglie (forno/robot), corridoio buio verso il magazzino | media |
| 38 | f_038 | video 0008 | 68, 22.8 | O (270°) | corridoio z 22.5 (verniciatura) | M15 mixer con due cappe e semaforo, latte di vernice, pannelli del forno a destra, corridoio lungo verso ovest fino al soppalco | media |
| 39 | f_039 | video 0008 | 62.5, 30 | SO (225°) | CARTEGGIATURA est | fianco grigio con etichetta gialla (EMC), sezionatrice verticale e finestre in fondo (mosso) | bassa |
| 40 | f_040 | video 0008 | 63, 33.5 | SO (240°) | FALEGNAMERIA est | M09 sezionatrice verticale contro il muro sud, pannelli in piedi, carrelli, M23 levigatrice verde a destra | media |
| 41 | f_041 | video 0008 | 62.5, 28.6 | E (90°) | CARTEGGIATURA est | M12 EMC Luc line con piano di carico, muro in blocchi dietro, banco da lavoro | media |
| 42 | f_042 | video 0008 | 60.5, 38 | S (160°) | FALEGNAMERIA SE, porta sud x 62 | muletto elettrico bianco, porta aperta: fuori recinzione e cancello verde; sezionatrice verticale dietro | media |
| 43 | f_043 | video 0008 | 60, 37.5 | SO (230°) | FALEGNAMERIA SE | sedile del muletto, M09 sezionatrice verticale, pannelli in piedi | media |
| 44 | f_044 | video 0008 | 62, 40.6 | S (180°) | porta sud x 62 | uscita (mosso) | bassa |
| 45 | f_045 | video 0008 | 70.5, 42.5 | NE (45°) | esterno SE | muro del locale tecnico con finestra a lamelle e porta rosa (scancio generale), baracca con tetto curvo, cabina in cemento a destra | media |
| 46 | f_046 | video 0008 | 72.5, 42 | NE (60°) | esterno SE | baracca in legno con tetto in lamiera, alberi, cabina | media |
| 47 | f_047 | video 0008 | 73.5, 40.5 | N (20°) | cortile est | E06 silo con scala e porta, strada interna verso nord, alberi | media |
| 48 | f_048 | video 0008 | 72, 39 | N (0°) | cortile est | silo ravvicinato, muro scuro, cartello 'ricevimento ->' | media |
| 49 | f_049 | video 0008 | 68, 43.5 | O (270°) | fascia sud | facciata sud con finestre a lamelle, porta SE aperta, cassone blu e furgone bianco (E09), pini oltre la strada | media |
| 50 | f_050 | video 0008 | 62, 41.5 | N (350°) | porta sud x 62 | ingresso in falegnameria: pannelli in piedi, rastrelliere a sbalzo | media |
| 51 | f_051 | video 0008 | 61.5, 38.5 | NO (330°) | FALEGNAMERIA SE | M10 deposito pannelli, rastrelliere a sbalzo in fondo, muletto bianco | media |
| 52 | f_052 | video 0008 | 58.5, 36.5 | O (270°) | FALEGNAMERIA | pannelli appoggiati, toupie, macchine (mosso) | bassa |
| 53 | f_053 | video 0008 | 57.5, 36 | O (280°) | FALEGNAMERIA | M26 macchina a colonna verde, pannelli in piedi | media |
| 54 | f_054 | video 0008 | 57, 34.5 | O (270°) | FALEGNAMERIA | M08 squadratrice Altendorf verde in primo piano, toupie turchese a sinistra, rastrelliere gialle, Biesse in fondo a sinistra | media |
| 55 | f_055 | video 0008 | 50, 33.5 | NO (320°) | FALEGNAMERIA / CARTEGGIATURA | M22 Brandt, macchina verde, rastrelliera a destra | media |
| 56 | f_056 | video 0008 | 48, 32 | NE (30°) | CARTEGGIATURA | rastrelliera a sbalzo gialla contro parete scura, macchina verde | media |
| 57 | f_057 | video 0008 | 46, 33 | O (250°) | FALEGNAMERIA | carrello (mosso) | bassa |
| 58 | f_058 | video 0008 | 43, 32 | S (180°) | FALEGNAMERIA | M06 Casolin con riquadro arancio, finestre del muro sud | media |
| 59 | f_059 | video 0008 | 41, 33.5 | O (270°) | FALEGNAMERIA | mosso | bassa |
| 60 | f_060 | video 0008 | 39, 34 | O (280°) | FALEGNAMERIA / LABORATORIO | Biesse bianco-verdi (M02/M04), tavolo, carrelli | media |
| 61 | f_061 | video 0008 | 35, 34 | O (250°) | FALEGNAMERIA | pannelli, carrelli, finestre sud | bassa |
| 62 | f_062 | video 0008 | 30, 33.5 | NO (330°) | LABORATORIO | M01/M02 Biesse Rover, banco verde, soppalco con ringhiera gialla in fondo a sinistra | media |
| 63 | f_063 | video 0008 | 28.5, 32.5 | N (0°) | LABORATORIO | Biesse Rover ravvicinato, righe gialle a terra | media |
| 64 | f_064 | video 0008 | 28, 33.5 | O (270°) | LABORATORIO | banco da lavoro con attrezzi | bassa |
| 65 | f_065 | video 0008 | 24, 33 | O (270°) | FALEGNAMERIA | carrelli (mosso) | bassa |
| 66 | f_066 | video 0008 | 14, 25.5 | N (20°) | IMBALLAGGIO / sotto il soppalco | S1 soppalco con ringhiera gialla, porte nel blocco sotto, scaffali bianchi, stoccatore verde, pannelli su bancali | media |
| 67 | f_067 | video 0008 | 8, 27 | O (270°) | corridoio ovest | finestra su un ufficio illuminato (mosso) | bassa |
| 68 | f_068 | video 0008 | 15, 27 | N (0°) | IMBALLAGGIO | soppalco, pilastro scuro, stoccatore verde, scaffali, pile di pannelli | media |
| 69 | f_069 | video 0008 | 11, 21 | N (0°) | sotto il soppalco | ringhiera gialla del soppalco, parete antracite con porta illuminata e finestra (area break) | media |

## 7. Dubbi aperti (da chiedere a Matteo o al cliente)

1. **VP Impianti (M11) ed EMC Luc line (M12).**
   - La pianta ha un solo rettangolo lungo "lucidatrice" (8 × 2 m, nord–sud, x ≈ 66,7). La linea VP Impianti di F 7448 (due unità, rulliere blu, serbatoi a pressione) combacia per forma e posizione (guardando a est si vedono il muro in blocchi, il locale tecnico e le finestre sud).
   - L'EMC Luc line (V f_041) l'ho messa nell'area tratteggiata subito a nord (x 64–68, z 27–30), contro il muro in blocchi.
   - La funzione della VP (spruzzatura automatica o lucidatura) va confermata.
2. **Levigatrice a nastro lungo verde (M23).** Non è in pianta. La posizione (x 55–62, z 31–33) è dedotta da f_028–f_030 e f_040: confidenza bassa.
3. **Robopac (M27).** Sta nel magazzino est contro la parete verso la produzione, accanto a una porta, ma la x è incerta di ±8 m.
4. **Nord del magazzino est.** z = 5,4 dal satellite contro ~7,4 dalla carta fotografata. Anche il muro nord del magazzino centrale è incerto: z = 2,4 (satellite e pianta a x 25–35) contro ~4 (pianta a x 35–48).
5. **Esterni sud.** La pianta disegna gli stalli a spina e la recinzione a z ≈ 46–50. Il satellite mostra la recinzione a z = 47 e i veicoli perpendicolari contro il muro. La pianta fuori dall'edificio è schematica: per il modello ho preferito il satellite.
6. **"county level" (M03).** Voce della pianta non chiara: forse un armadio utensili o un magazzino attrezzi dei CNC. Nessuna foto.
7. **Imballaggio (M20).** Nessuna foto: resta illustrativo.
8. **Uffici al primo piano.** Il titolo della pianta dice "piano terra e primo", ma la tavola mostra solo il piano terra. Le foto 7463, 7464 e 7468 potrebbero essere al primo piano.
   *Aggiornamento 30/09 (rifacimento uffici, `3d/js/uffici.js`):* 7461–7466 e 7463–7464 sono al piano terra (dalle finestre si vedono auto e recinzione ad altezza d'occhio); 7467–7471 al primo piano (7467 guarda giù dalla scala, 7470–7471 finiscono sul parapetto della scala). La sala con il tavolo lungo è la sala del consiglio al primo piano (Marco: «la stanza del CDA sta al secondo piano, non lì»). Scala a due rampe: rampa 1 z 8,8–9,9 verso est, pianerottolo x 9–10,15, rampa 2 z 10,05–11,05 verso ovest.
9. **Verso del flusso nella linea Cefla.** Il carico è a est (pulpito e banco a rulli); il forno verso ovest va confermato.
10. **Cartello della pianta.** Dove è appeso il piano di evacuazione (7440, 0009, 0010) non si ricava. Il pallino viola della legenda ("voi siete qui") compare più volte.
11. **Altezze.** Nessuna misura diretta: restano quelle del modello (produzione 7,2 m, magazzino 6,2 m, uffici 7,6 m). Dalle viste Earth il silo è alto circa il doppio del capannone (~14 m).
12. **Correzione a `TABELLA-FATTI.md`.** L'esterno con la scritta RIFRA è **IMG_7465**, non 7466 (7466 è la scala degli uffici). In più, IMG_7440 è una terza foto della pianta.
