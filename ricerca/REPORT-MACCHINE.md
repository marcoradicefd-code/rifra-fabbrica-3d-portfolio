# Macchine RiFRA in 3D · rapporto (30/09/2026)

Scritto dall'agente delle macchine; salvato dal coordinatore.

## 1. File

- **`3d/js/macchine.js`** (nuovo): libreria delle macchine. Ogni costruttore restituisce un `THREE.Group` con origine al centro dell'ingombro del JSON e le parti animate in `g.userData.parti`. Contiene anche:
  - `materialiMacchine(M)`: tinte unite nell'atlante, più `loghi`, `vetroChiaro` e `lucePorta`;
  - `tbox`: `RoundedBoxGeometry` condivisa per misura;
  - `logo`: un solo atlante di scritte 1024²;
  - `pila`, `bancale`, `carrelloAnte`, `scocca`, `stanza`, `muletto`.
- **`3d/js/reparti.js`** (riscritto): 12 tappe. Ogni tappa ha un sottogruppo `W` in coordinate del mondo. Il gruppo `statici` raccoglie le macchine fuori tappa, già fuso. Restano esportati `kf` e `carrello`. Opzione `{ stanze: false }`.
- **`edificio.js`**: toccato solo `ST`; `NAMES` e l'ordine delle 12 tappe non cambiano.
- **Strumenti** in `build/tools/controlli/`: `banco-macchine.html/.js` (primi piani affiancati alle foto), `banco-sequenza.js` (cicli), `chiamate3d.js` (chiamate di disegno).
- **Risultati** in `build/qc/macchine/`: primi piani affiancati alle foto in `confronti/*-cfr.jpg`, fogli `foglio1…8.jpg`, tappe `r01…r12.png`.

## 2. Tappe `ST` [x0, z0, larghezza, profondità]

| tappa | rettangolo | macchine |
|---|---|---|
| 1 | .5, .5, 9.5, 6 | M34 ufficio tecnico |
| 2 | 59.8, 33.8, 6.8, 6.5 | M10 e muletto |
| 3 | 54.8, 37.5, 6.2, 3 | M09 |
| 4 | 40.8, 33.6, 14.6, 4.4 | M06, M07, M08 |
| 5 | 30.2, 36.2, 9.8, 4.4 | M04, M05 |
| 6 | 21.3, 26, 17.8, 6.8 | M01, M02, M03 e banco |
| 7 | 41, 24.2, 8.8, 6.4 | M22, M21 |
| 8 | 61, 22.4, 7.6, 4.6 | M13 |
| 9 | 48.9, 14.9, 20.4, 7 | M14, M15, un carrello M16 |
| 10 | 63.2, 26.8, 7, 12.5 | M12, M11 |
| 11 | 19.8, 19.6, 17.1, 3.8 | M19 |
| 12 | 7.1, 19.1, 9.2, 3.8 | M20 |

Base: MAPPA-FOTO § 4, rettangoli allargati per contenere operatori e pile.

## 3. Fedeltà per macchina

Legenda: ✔ = come la foto; ~ = somigliante, con semplificazioni; ILL = illustrativo.

| id | macchina | fonte | giudizio | note |
|---|---|---|---|---|
| M01, M02 | Rover A | F 7442, 7443; V f_063 | ✔ | Basamento bianco, barre nere con ventose, portale con cappa in vetro fumé, montante BIESSE verticale, fascia verde, condotta beige e tubo giallo spiralato, vetri sul retro e a est, rete scura a ovest, tappeto scuro con righe gialle, pulpito a ovest (solo M01). |
| M03 | «county level» | PE | ILL | Funzione ignota. |
| M04 | Brema EKO 2.1 | F 7444 | ✔ | Anta nera con LED a est, verde con monitor incassato, targa BIESSE, banchi alti circa 1 m, sgabello. |
| M05 | foratrice da banco | F 7444 | ~ | Forma generica. |
| M06 | Casolin | V f_058, F 7447 | ✔ | Scritta e freccia azzurra, carro di 3,2 m in z, braccio aereo da ovest con cuffia, riquadro arancio a terra. |
| M07 | squadratrice | F 7445 | ~ | Marca non leggibile. |
| M08 | Altendorf | V f_054 | ✔ | Basamento verde, cassone per gli sfridi. |
| M09 | sezionatrice verticale | V f_040, f_043 | ✔ | Telaio inclinato di 8°, doghe, righe rosse. |
| M10 | deposito | V f_050, f_051, F 7448 | ~ | Lastre in piedi contro il muro sud, pile basse (la vista di F 7448 resta libera). |
| M11 | VP Impianti | F 7448 | ✔ | Funzione da confermare. |
| M12 | EMC Luc line | V f_041 | ✔ | |
| M13 | levigatrice | F 7449 | ✔ | Due ante, 5 calate con collettore, carrello rosso. Piano di uscita ILL. |
| M14 | linea Cefla | F 7450–7452; V f_033–f_038 | ✔ Spraybotic, ~ linea | Spraybotic di 9 m: testate tonde, davanzale, tre finestre, zoccolo nero–bianco–nero, logo, interno con testa rotante nel nastro. Tunnel grigio con maniglie, pulpito Cefla con semaforo. |
| M15 | mixer | V f_038 | ✔ | Spostato di 0,2 m a sud. |
| M16 | carrelli ×10 | V f_018–f_022 | ✔ | |
| M17 | deposito S.C.H. | PE | ILL | |
| M18 | cabina | F 7454 | ~ | Pareti macchiate, portone, filtri, cavalletti, senza soffitto. |
| M19 | Erregi | F 7453 | ✔ | Portale, quadro aperto, targa, pressori animati, rete, nastro scuro, scaffali ferramenta. |
| M20 | imballaggio | – | ILL | |
| M21 | De Stefani | V f_022 | ✔ | |
| M22 | Brandt | F 7446 | ✔ | Onda e logo sul fronte sud, 6,1 m, due calate e un tubo giallo, pulsantiera gialla. |
| M23 | levigatrice verde | V f_028–f_030, f_040 | ~ | Posizione dal survey. |
| M24, M25 | rastrelliere | V f_028, f_055, f_056 | ~ | Verso dei bracci ILL. |
| M26 | macchine tradizionali | V f_052–f_054 | ~ | |
| M27 | Robopac | F 7457, 7458 | ✔ | Statico. |
| M28 | ricarica muletti | V f_017 | ~ | |
| M29, M30 | scaffali porta-pallet | V f_006–f_014 | ~ | Riempimento ILL. |
| M31 | mobili scuri | F 7460 | ~ | Calcio balilla compreso (è nella foto). |
| M32, M33 | stanze sotto il soppalco | PE, V f_069 | ~ | Porta illuminata. |
| M34 | uffici | F 7461–7470 | ~ | Ufficio tecnico, reception con orologio a pendolo, sala riunioni con 10 sedie. |

Spigoli smussati su tutti i carter. Scritte solo dove sono leggibili nelle foto. Siti dei costruttori non consultati: ogni forma viene dalle foto.

## 4. Animazioni

Ogni tappa ha il suo ciclo, nel verso di flusso del JSON. I pannelli compaiono o spariscono solo dove coincidono con una pila identica o sono nascosti dentro una macchina chiusa, quindi niente scatti.

1. Plotter e progettisti al monitor.
2. Il muletto porta un bancale di lastre dall'arrivo al deposito.
3. Due tagli verticali; le linee di taglio si dissolvono.
4. Casolin: pila → carro → lama → pila; il carro della M07 va e viene.
5. Anta in piedi da est a ovest, con fori sulla faccia nord.
6. Gola a riquadro sulla Rover 1 (portale in x, testa in z, mandrino in y); la Rover 2 lavora di continuo.
7. Bordo applicato dal fronte che avanza (Brandt); De Stefani da ovest a est.
8. Levigatrice da ovest a est.
9. Da est a ovest: tunnel → testa che oscilla attraverso il nastro → l'anta diventa laccata → carrello di essiccazione (livello identico); semaforo verde.
10. EMC da ovest a est; VP da nord a sud.
11. Scocca da est a ovest, sosta nel portale, pressori.
12. Film e angolari, poi bancale.

Persone orientate sul verso del moto, passo dalla strada percorsa. Sequenze controllate fotogramma per fotogramma: `seq-rover`, `seq-cefla`, `seq-cas`, `seq-mul`. Le altre tappe non sono state controllate così.

## 5. Prestazioni («media», tutti i passaggi)

- Tavola: 213 chiamate, di cui 134 dalle macchine (tappe più statico): restano circa 37 chiamate di margine sul budget di 250.
- Tappe: 59–120; la più pesante è quella delle Rover.
- Statico fuso nell'atlante, pezzi mobili fusi per genitore, persone e polveri istanziate, nessuna allocazione per fotogramma.

## 6. Dubbi

1. Le foto mettono la Spraybotic più a ovest di quanto dica il JSON; seguite le foto, ma tenuto il flusso da est a ovest del JSON, quindi il pannello passa dal tunnel grigio prima del robot.
2. La EMC nella posizione del JSON contraddice F 7449.
3. M23 e M03 a bassa confidenza.
4. Funzione della VP da confermare.
5. Colore dei telai dei carrelli M16 (in f_019 sembrano rosso-bruni).
6. Posizione x del Robopac incerta di ±8 m.
7. Altezze stimate dalle foto.
8. Tappe 3, 4, 5 viste dal lato sbagliato: vedi § 7.

## 7. main.js (correzioni proposte, non provate)

- **PROFILI.** Le tappe 3, 4 e 5 mostrano gli operatori di fronte e la 3 il retro della sega: camera dal lato nord. La tappa 11 va rialzata sopra le Rover.
  `const PROFILI = [[40, 42, 1.05, 0, 0], [30, 36, .95, 0, 0], [160, 30, 1.1, 0, -.3], [165, 32, .9, 0, 0], [170, 30, .95, 0, -.3], [25, 34, .85, 0, .6], [30, 33, .95, 0, 0], [40, 30, .9, 0, 0], [30, 30, 1, 0, .4], [50, 36, .95, 0, 0], [10, 48, .9, 0, 0], [42, 34, .95, 0, 0]];`
- **ROTTA.** I punti del percorso stanno al bordo sud di ogni tappa più 0,8 m; per le tappe 2, 3 e 5 finiscono oltre il muro sud. Sostituire con
  `const LATO_NORD = new Set([1, 2, 3, 4]), zRotta = (s, i) => LATO_NORD.has(i) ? s.z - .8 : s.z + s.d + .8;`
  e usare `zRotta(s, i)` nei due punti.
- Nessun import nuovo.

## 8. arredi.js da togliere o spostare

- `scaffale(29, 61, .4); scaffale(63, 119, 4.4)`.
- Bancali e cartoni a x 40, 70, 100 (z 6,4–6,6).
- Mobili `laccatoOpaco` a x 52–57, z 6,4.
- Fusti blu: spostarli verso x 34, z 7.
- Blocco «cabina … VP Impianti» (x 57, z 17).
- Carrelli di essiccazione a x 70+ e forno a x 102,5.
- «Secondo centro di lavoro CNC» (x 55, z 31).
- «Magazzino attrezzature montatori» (x 31, z 13).
- Scrivanie degli uffici e tavolo a z 52.
- Soppalco: spostarlo a x 7,3–25,8, z 13–19,4, piano a +3,3 m, scala a x 24–25,8, z 18,1–19,4.
- Muletto sul corridoio del magazzino (z ≈ 10,3, x 12–68); carrello spinto sul corridoio z 33,3 o z 23,4.

**Per l'edificio:** con `{ stanze: false }` si tolgono la cabina M18 e le stanze M32/M33.
