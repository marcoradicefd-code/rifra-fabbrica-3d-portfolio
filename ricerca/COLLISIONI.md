# Collisioni nella scena 3D (controllo automatico)

Generato da `build/tools/controlli/collisioni.js` il 2026-10-02. Campioni: 0…240 s ogni 0.1 s.
Rilancio: `cd build/tools && node controlli/collisioni.js` (server su 127.0.0.1:8767; `--foto 0` per saltare le foto, `--solo 4,6` per alcune tappe).

**Metodo.** Nel browser di prova (i sorgenti non cambiano) ogni mesh viene annotata prima che `fondiStatici`/`fondiAnimati` la fondano,
quindi le forme restano quelle vere, pezzo per pezzo: scatole orientate, cilindri, ellissoidi, tubi (≈ = forma approssimata dal riquadro orientato).
Il tempo dell'animazione viene fissato (`window.__coll.T`) e le funzioni `update(t)` di tappe e arredi vengono chiamate in ordine, con 1,5 s
di rodaggio (le persone ricavano passo e velocità dalle chiamate precedenti). Persone (persone.js): circa 1700 vertici del corpo con lo stesso
skinning dello shader (ossa da `userData.stato.out`, corporatura, parti opzionali spente), divisi in corpo, braccio e avambraccio/mano;
in più 13 capsule dello scheletro con raggi inscritti, per i pezzi sottili (barre, ante) che tagliano il corpo. Ripieghi: parti con
`userData.parte`, mesh o SkinnedMesh sotto la persona, capsula r 0,25 m × 1,75 m. La profondità è quella nell'unione dei pezzi
dell'assieme (una pila di lastre, un bancale), misurata camminando nelle 6 direzioni fino a uscire (il pavimento conta pieno solo scendendo).
Soglie: corpo 3 cm, braccio 5 cm, mano 8 cm (le mani possono toccare, non attraversare); chi è seduto (bacino sotto 0,7 m) appoggia bacino e
cosce sulla sedia: lì 6 cm e niente capsule. Persone sovrapposte se i busti distano meno di 2 × 19 cm; mezzi: griglia 4 × 4 × 4 punti del
telaio (senza forche e carico) dentro macchine e muri; piedi sotto il pavimento oltre 3 cm o sollevati oltre 6 cm dal piano d'appoggio.
Non controllati: pezzo contro pezzo (un'anta contro un carro) e le geometrie già fuse prima dell'annotazione (vedi avvisi).
I verdetti dopo la verifica delle foto stanno in `build/tools/controlli/collisioni-esiti.json` (chiave del caso).

Ostacoli: 3895 forme (3908 annotate prima della fusione statica, 298 dei gruppi animati), 1280 assiemi; persone: 36; mezzi: 5.

**Avvisi:** 7 geometrie già fuse fuori da fondiStatici (riquadro > 4 m, forma non ricostruibile) escluse: PlaneGeometry 5.5×0.7×0.0, BufferGeometry 10.2×1.0×11.1, PlaneGeometry 4.3×1.9×0.0, PlaneGeometry 7.2×2.3×0.0

**Casi: 0; aperti (non falsi positivi né voluti): 0.**

| # | Tappa | Coppia | Tipo | Tempi | Max (cm) | Esito | Foto |
|---|---|---|---|---|---|---|---|
| — | — | nessuna collisione | — | — | — | — | — |

<!-- storico -->
## Storico (scritto a mano; il rilancio lo conserva)

### 02/10/2026 · percorso nuovo (furgone, Robopac, camion)

Primo giro dopo la revisione del percorso: 3 casi, poi 2, poi 1, poi 0.
- Il muletto passava sopra la piattaforma del Robopac, e il conducente nel bancale: ora aggira il Robopac da nord (z 8,9).
- Il montante del muletto entrava di 10–15 cm nel blocco del muro est, dove c'è il portone (il controllo non vede le porte): ora si ferma 5 cm prima del filo interno.
- L'operatore del Robopac toccava prima il muro z 13, poi il muletto: ora sta a x 65,9, z 12,45.

### 30/09/2026 · primo giro e correzioni

Primo giro (0…60 s, foto in `build/qc/collisioni/precedenti/`, numerate dal primo giro c001–c038 e dal giro di controllo delle
tappe 4–9 c001–c010): tutti i casi guardati a occhio. Confermati (dopo la correzione della misura sulle pile sottili e l'aggiunta
delle capsule), con la correzione fatta in `3d/js/reparti.js` e `3d/js/arredi.js` (solo percorsi, posizioni, chiavi di tempo):

| Tappa | Caso confermato (max) | Correzione |
|---|---|---|
| 2 | muletto: bancale di lastre (2,07 m) sulle forche a 0,88 m attraversava il montante e la pila d'arrivo (16 cm) | carico a 1,4 m davanti al muletto, fermate a pila − 1,4 m |
| 3 | operatore a riposo dentro la pila d'arrivo della tappa 2 e nel carico del muletto (8,5 cm; 4 cm col passo laterale) | riposo a X + 1,45 (prima 1,9) |
| 4 | Casolin: piedi nei bancali, fianco nella guida del carro, montante del braccio aereo, anta nella pancia, squadra del carro (quota anca) attraverso l'operatore (5–11 cm) | percorso rifatto: presa dal capo nord della pila, attesa nel varco fra le pile, ritorno a est del montante |
| 4 | seconda squadratrice: pancia nella guida del carro (5,5 cm) | operatore a 0,75 m (prima 0,6) |
| 5 | piede nella ruota del carrello, fianco nell'anta in piedi sul carrello, braccio nella traversa (4–7 cm) | fermate a z 37,15 / 37,3 / 37,05 |
| 6 | anta volava dalla pila alla tavola della Rover attraverso il busto, anche al ritorno (8,8 cm) | anta prima a est sopra il banco, operatore che la segue; al ritorno si scosta a ovest |
| 7 | Brandt: piedi nei bancali e nella pulsantiera gialla, anta nella pancia di chi carica e di chi scarica (5–11 cm); De Stefani: piedi nel bancale (4 cm) | operatori ai capi dell'anta (x 40,95 e 50,4–50,5) nella striscia fra rotaia e pile; De Stefani più a sud-est |
| 8 | fianco e mano nel basamento della levigatrice (11,5 cm) | percorso a Z + 1,4 (prima 1,2) |
| 9 | operatore del mixer in piedi dentro un fusto di vernice (16 cm); anta nella pancia di chi carica la Cefla (8,5 cm) | mixer: davanti al quadro (60,45; 21,2); carico: al capo est dell'anta (x 69,75) |
| 10 | operatore della VP dentro il serbatoio a pressione (20,5 cm); EMC: pancia nel rullo del piano di carico (5,5 cm) | VP: (XV − 1,1; ZV − 3,65); EMC: passo di 15 cm (prima 40) |
| 11 | mani dentro le colonne del portale Erregi e attraverso la griglia di protezione (8,5–17,5 cm); carrello spinto sull'operatore sud | operatori ai lati del nastro all'ingresso del portale (x 34,25; z 20,5 e 22,6) |
| corridoio z 23,4 | carrello spinto e chi lo spinge attraverso armadietti e scaffali del montaggio (19–23 cm) e dentro la levigatrice della tappa 8 (66 cm) | corsia a z 24,02 (2 cm per lato fra armadietti e De Stefani), capolinea a x 59,5 |
| magazzino | muletto contro la testata della fila di scaffali a x 38–39,1 (20 cm) | corsia a z 10,75 (prima 10,3) |

Falsi positivi e casi voluti (non corretti): persone sedute sulla sedia (tappa 1 e uffici) — contatto del bacino col sedile, ora
riconosciuto dal controllo (bacino sotto 0,7 m); una geometria degli uffici già fusa (10,2 × 1 × 11,1 m) che il controllo non sa ricostruire.
Giro finale 0…240 s: **0 casi**. Foto di verifica dopo le correzioni negli stessi istanti: `build/qc/collisioni/dopo/v01–v20.png`.

Da segnalare (fuori da questo lavoro): la tappa 1 e gli uffici sono dell'agente uffici; le loro geometrie fuse in `uffici.js` fuori da
`fondiStatici` (10,2 × 1,0 × 11,1 m) non sono controllabili pezzo per pezzo. Nel carrello spinto chi spinge salta di 3,6 m al capolinea
(cambio di verso a 19,5 s: scatto preesistente). Il muletto del magazzino passa sopra la pedana piatta della Robopac (8 cm).
