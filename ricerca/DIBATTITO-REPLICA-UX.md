# Replica UX 3D al revisore game/industriale (Opus) · 29/09/2026

Premessa: correggo due miei punti. (a) Font: nella build finale sono già incorporati, `Google Fonts` è solo nella pagina di sviluppo; il mio punto 12 vale solo per `3d/index.html` (S, nice, e solo se la pagina di sviluppo si usa offline). (b) `record.js` ha già `--use-angle=metal --enable-gpu`: la sua "trappola 9" non si applica; resta utile un controllo di sicurezza (stampare la stringa GL, fermarsi se è SwiftShader). Nessun mio altro punto cade.

Regole tenute: ogni fatto ha una fonte, nessun effetto inventato, tutto disegnato dal codice salvo decisione di Marco. Le mie proposte di "luce dai lucernari" e "polvere" sono ritirate dal primo giro: non hanno fonte nelle foto e sono effetti inventati.

---

## 1. Punto per punto (numerazione della sua §6)

1. **Quattro bug (Rover, film, autobloccanti, operatori di lato): ACCORDO.** Sono errori visibili e fedeltà: gli autobloccanti "coriandolo" li avevo notato (esterno, r05) senza trovare la causa (`rnd()` per canale). Costo minimo, sono i più convincenti in fiera. Lo `scatolone` della Rover cambia perfino la lettura del reparto 6.
2. **Persone in InstancedMesh: ACCORDO CON MODIFICA.** Il costo (248 draw call) è reale, ma per l'utente le persone sono la scala e il "vivo": non ridurre il numero né appiattire le pose. Condizioni UX: (i) `instanceColor` per le tre tute che proponevo (nero, grigio, grembiule blu con guanti gialli alla verniciatura, come da tabella fatti); (ii) le etichette CSS2D non devono ancorarsi alle persone ma a punti fissi della stazione (oggi sono ancorate a oggetti di reparto, quindi nessun conflitto, ma la mia anti-sovrapposizione lavora su rettangoli di schermo di ancore fisse); (iii) mantenere l'ombra su busto e gambe, altrimenti "galleggiano".
3. **Fondere ciò che manca: ACCORDO.** Con un avvertimento: il gruppo `tetto` si muove e cambia trasparenza per materiale (`aggiornaTetto`); va fuso per materiale ma tenuto in un gruppo a sé, altrimenti il mio "tetto senza pop" (punto 8 del mio elenco) diventa impossibile.
4. **Ombra su richiesta e agganciata al texel: ACCORDO CON MODIFICA.** L'aggancio al texel (tremolio nei voli) è un guadagno di qualità percepita, lo voglio. Ma `autoUpdate=false` congela le ombre delle persone e delle macchine animate: un'ombra ferma sotto un operatore che si muove è più "finta" di un frame perso. Proposta: `needsUpdate` ogni 2 fotogrammi nei reparti con animazione visibile (sempre, nel giro), e a zero solo con animazioni ferme e camera ferma (`#motion` o pausa). Il risparmio vero sta nel non ridisegnare le 541 mesh statiche: farle fuse (punto 3) lo ottiene senza congelare.
5. **GTAO solo se d < 60: ACCORDO CON MODIFICA.** Sì, in tavola è invisibile. Ma un'accensione secca a 60 m fa "lampeggiare" il contatto a terra durante il volo verso il reparto, proprio nel momento di attenzione. Dissolvenza di `gtao.blendIntensity` tra 90 e 55 m e spegnimento solo a 0.
6. **Culling vero: ACCORDO CON MODIFICA.** `Math.abs(i-fs)<12` è un bug, ma "saltare gli update dei reparti fuori vista" deve includere il reparto corrente, il precedente e il successivo: il volo di camera (mia proposta 4) e il "pezzo protagonista" (sua 10) passano per i vicini. Fusione per celle: bene, ma la cella non deve tagliare un reparto a metà (se ne vedrebbe il pop ai bordi durante il volo): celle = reparti.
7. **Profilo chiosco con test fps all'avvio: ACCORDO.** Aggiungo due vincoli UX: isteresi e nessun cambio di risoluzione visibile durante il giro (cambiare livello solo su tavola/pausa); e in chiosco fissare `dpr 1` + SMAA se il test dà < 45 fps. La risalita di livello è utile ma non a metà di un reparto.
8. **Video deterministico: ACCORDO.** Il seme per persona (indice) è anche più elegante per la coerenza tra export. Transizioni CSS in `.video`: sì. Non mi riguarda oltre.
9. **Sagome delle macchine: ACCORDO CON MODIFICA (fedeltà sì, ingombro no).** Più sagoma aiuta il pubblico del settore, ma ogni cambio deve restare leggibile a un metro di schermo e con la sola fonte foto: cappa vetrata della Rover, fiancate 1 m della Brema, collettore della levigatrice, Cefla 9 m. Le ricostruzioni troppo dettagliate (ventose, bumper) sono invisibili alla distanza di ripresa e costano poligoni: sì a ciò che cambia la silhouette, no al dettaglio sotto i 15 cm. Attenzione: la Brandt da 8 m a 5 m e la Cefla a 9 m cambiano il centro e il raggio del reparto → rivedere `posaReparto` (`distanzaPer(Math.hypot(w,d)*.3+.6)`) o l'inquadratura salta. **Conflitto con la mia camera per reparto**: ordine di lavoro = prima le dimensioni, poi le pose di camera.
10. **Pezzo protagonista + "tempo accelerato": ACCORDO CON MODIFICA.** Idea forte, coincide con la mia "rotta" (punto 5): un solo oggetto che passa da un reparto all'altro spiega la filiera meglio delle etichette. Ma "ordine dei reparti illustrativo" è già dichiarato in OUTRO: il pezzo è un'illustrazione, non un fatto. Le trasformazioni MDF → bordato → laccato nero devono seguire i testi di TXT (laccato: colori opachi/lucidi/legno, non solo nero). Minimo: una linea di rotta + un pezzo semplice, non un carrello che guida in volo con la camera. Dichiarare "tempo accelerato" nella scheda, sì.
11. **Materiali e luce: ACCORDO CON MODIFICA.** Pavimento più scuro (#6e6c68) migliora il contrasto delle macchine bianche (r05), ma le pareti antracite e i pavimenti scuri creano fango con i muri neri di fondo (r08: muro nero dietro la macchina): scurire il cemento solo nelle zone di produzione, non nel magazzino, e tenere le etichette bianche. Metalness 0/1: sì. `Sky` all'esterno: sì (è il momento d'apertura). Strisce LED: da fotografia? se non c'è fonte, no.
12. **Esterno (linea rossa, coriandoli, prato): ACCORDO.** Aggiungo: prato desaturato con la terra (Earth) e alberi in instancing (stessa fonte: foto Street View). Nice, dopo i bug.
13. **Pose delle persone: ACCORDO, NICE.** Mi aspetto che sia il passo che toglie l'effetto "manichino". Pose = 4, come da FlexSim. Dopo l'instancing (2) perché la posa passa per gli ossi.

Sui suoi numeri: le mie letture concordano (nessun problema di caricamento). Non condivido solo la stima "60 fps impossibili": va misurata; io la considero un rischio, non un fatto.

---

## 2. Conflitti tra i due elenchi (e decisioni)

- **Camera per reparto ↔ culling/fusione per celle:** celle = reparti; il volo mostra sempre reparto corrente + vicini; nessun `visible=false` durante il volo.
- **Etichette anti-sovrapposizione ↔ instancing persone:** ancore fisse di reparto (non delle persone); etichette in numero massimo 2 in chiosco.
- **Ombra `autoUpdate=false` ↔ ombre di persone animate:** aggiornamento ogni 2 fotogrammi, fermo solo a scena immobile.
- **Dimensioni macchine (sua 9) ↔ inquadratura (mia 4):** prima modelli, poi profili camera, o si rifà due volte.
- **Rotta/pezzo (mia 5 / sua 10) ↔ fonti:** disegno illustrativo dichiarato; niente effetti non fotografati (luce da lucernari, polvere: ritirati).
- **GTAO spento ↔ contatto a terra:** dissolvenza, non interruttore.

---

## 3. Elenco congiunto (un solo sviluppatore, una sessione)

Ordine di esecuzione (dipendenze rispettate). M = "must" per la fiera, N = "nice".

| # | Cosa | File / funzione | Sforzo | Tipo |
|---|---|---|---|---|
| 1 | Etichette pubbliche senza codici fonte (`pubblico` + `nota` solo `?debug=1`); frasi → "nome macchina + dato" | `reparti.js` (`lab`), `main.js` (`setStation` `#labs`), `index.html` | S | M |
| 2 | 4 bug: `s6` scala Rover, `s12` film, `autobloccanti` un solo `rnd`, rotazione operatori `s2`/`s4` | `reparti.js`, `materiali.js` | S | M |
| 3 | Chiosco: niente `zoom` (variabile `--k` con `font-size`/`transform`), area libera con rect reali; CTA in basso; nascondere "Ferma le animazioni" e "Qualità" in `.kiosk`; test 1080×1920 nello script foto | `index.html` righe 104-115, `main.js` `freeArea` | M | M |
| 4 | Stile etichette del design system (serif, 15/24 px) + anti-sovrapposizione + max 2 in chiosco | `index.html` `.lab3d`, `main.js` `aggiornaSegni` | M | M |
| 5 | Fusione dei non fusi (tetto in gruppo a sé, finestre, silo); `fondiStatici` senza `toNonIndexed`; celle = reparti | `edificio.js` `volta`/`muri`, `prim.js` `fondiStatici` | S | M |
| 6 | Persone in `InstancedMesh` con `instanceColor`, ombra su busto/gambe; seme di `fase` per persona | `prim.js` `persona()` | M | M |
| 7 | Ombra agganciata al texel, aggiornata ogni 2 fotogrammi; GTAO con dissolvenza 90→55 m | `main.js` `ombraSu`, `frame` | S | M |
| 8 | Culling: fix `Math.abs(i-fs)<12` → corrente ±1; niente `visible=false` in volo | `main.js` `frame` | S | M |
| 9 | Profilo chiosco: test 3 s, isteresi, cambio livello solo su tavola/pausa, `dpr 1` se < 45 fps; controllo GL in `record.js` | `main.js` livello, `record.js` | S | M |
| 10 | Pin: nascosti col tetto chiuso, nome sul pin attivo, scala per densità (non spegnimento binario) | `main.js` `aggiornaSegni` | S | M |
| 11 | Apertura e reset chiosco: tetto chiuso → tavola → apertura → primo reparto; avviso "Riparto tra 10 s" | `main.js` `kioskAttract`, `kioskAfterEnd` | S | M |
| 12 | Dimensioni e sagome macchine (Rover, Brema, Brandt, levigatrice, Cefla, Erregi) da foto, solo ciò che cambia la silhouette | `reparti.js` | M | N (alta) |
| 13 | Profili camera per reparto (`ST[i].cam`) con pausa d'arrivo + rotta e pezzo illustrativo (dichiarato) | `edificio.js` `ST`, `main.js` `posaReparto`, `arredi.js` | M | N |
| 14 | Tetto senza "pop" (`transparent` fisso, opacità), pavimento produzione più scuro, metalness 0/1, `Sky` esterno | `main.js` `aggiornaTetto`, `materiali.js` | M | N |
| 15 | Prato/esterno (fascia rossa, asfalto, alberi in instancing), pose persone (4), mast ridotto e minimappa | `edificio.js`, `prim.js`, `index.html` | M | N |

Nota di realismo: 1-11 sono tutti S/M e stanno in una sessione se non si scende nei dettagli; 12-15 sono la coda, da fare solo se restano ore. La misura su mini-PC vero decide se 5-9 bastano (budget ≤ 250 draw call): senza quella misura non promuovo 12-15 a "must".

Da decidere con Marco: modelli GLB (cambia la regola "disegnato dal codice"), quanto "tempo accelerato" mostrare, orientamento del chiosco (verticale o orizzontale).
