# Persone realistiche nella fabbrica RiFRA (Blender 5.2 LTS, EEVEE)

Ricerca del 01/10/2026, solo lettura: non è stato scaricato né installato nulla. Domanda di Marco: «cerca come fare le persone dentro la fabbrica nel modo più realistico possibile».
Contesto: 35 persone procedurali (`3d/js/persone.js`, scheletro di 23 ossa, mesh a «loft», abiti e viso dipinti per vertice), portate in Blender come armature con le pose campionate dalla pagina (`blender/animazione.py`). Spot di 45 s a 1080p30, EEVEE, Mac M4 (GPU Metal a 8 core, 16 GB). Oggi 6,5–6,8 s per fotogramma a 1080p con 48 campioni (`blender/render/realismo/tempi.txt`).
I tempi di render e di lavoro sono **stime**: vanno confermate con un provino (vedi § 6).

---

## 0. Sintesi (12 righe)

1. **Distanza.** Nelle inquadrature dello spot (obiettivo 32 mm, punto mirato a 10–25 m) una persona è alta 120–300 px e il viso misura 16–40 px. A quella distanza il realismo si legge da **movimento, proporzioni, sagoma degli abiti, massa dei capelli e luce**, non dalla pelle o dai pori (§ 1).
2. **Restando nella regola «tutto dal codice»** (raccomandazione A) si può fare molto: corpo più fitto con Subdivision e Corrective Smooth, abiti come gusci separati con orli veri, tessuti con *Sheen*, capelli con i nodi *hair* che **sono già dentro Blender** (CC0, nessun download), pelle con subsurface, occhi lucidi e micro‑movimenti. Le animazioni restano identiche. Servono circa 3–4 giorni.
3. **Il migliore in assoluto** (raccomandazione B) richiede che Marco cambi a metà la regola: **MPFB 2** (MakeHuman per Blender, codice GPLv3 e asset **CC0**), dall'archivio ufficiale delle estensioni di Blender (42,9 MB). Dà corpo anatomico, mani con le dita, 35 corporature diverse da script e uno scheletro *game_engine* che si mappa 1:1 sulle nostre 23 ossa. **Niente foto**: la pelle la facciamo procedurale noi. Servono circa 5–7 giorni.
4. **Animazioni.** Le nostre si trasferiscono **senza Mixamo e senza add‑on**: si calcola con numpy la rotazione in spazio mondo di ogni osso, che si ricava direttamente dai quaternioni già esportati, perché il riposo delle nostre ossa è l'identità. Si allinea il riposo (braccia giù contro A‑pose), poi si corregge con IK su mani e piedi e si scrivono le F‑curve come fa già `animazione.py` (§ 3).
5. **Scartati per questo lavoro.**
   - Human Generator: pelli fotografiche 8K, 128 $.
   - Character Creator: **solo Windows**.
   - Population e Renderpeople: persone scansionate, quindi foto.
   - Mixamo: account Adobe, e le animazioni ce le abbiamo già.
   - Strumenti per le folle: 35 persone coreografate non sono una folla.
6. **Costo di render:** da circa 6,7 s a circa 7,5–10 s per fotogramma, cioè lo spot passa da circa 2,5 h a circa 3–3,8 h. La sfocatura di movimento resta *post‑process* (1 passo); più passi moltiplicano il tempo.

---

## 1. Quanto si vedono le persone nello spot

Camera di `spot.py`: 32 mm su un sensore di 36 mm, campo orizzontale di circa 59°. A una distanza `d` un metro occupa circa `1707/d` px a 1920 di larghezza.

| Distanza | Persona (1,75 m) | Viso (0,23 m) | Mano (0,19 m) | Inquadrature (distanza camera → punto mirato) |
|---|---|---|---|---|
| 5 m | ~600 px | ~78 px | ~65 px | nessuna oggi; servirebbe un primo piano |
| 10 m | ~300 px | ~39 px | ~32 px | Cefla fine (10,6 m) |
| 15 m | ~200 px | ~26 px | ~22 px | foratura (14–15 m), bordo (13 m), montaggio (13–14 m) |
| 20 m | ~150 px | ~20 px | ~16 px | sezionatrice (16–18 m), **ufficio tecnico (19–25 m)** |

Conseguenze pratiche:
- **I 3 ritratti del direttivo nell'ufficio tecnico** stanno a 19–25 m: il viso misura circa 20 px. Una somiglianza non si vedrebbe. Resta quindi giusto lo stile «illustrativo»: rifare persone reali riconoscibili richiederebbe le loro foto (contro la regola) e il loro consenso.
- Nel render attuale della Cefla (`blender/render/realismo/cefla.png`, operatore a circa 6 m) i difetti visibili sono:
  - testa che sembra calva, perché i capelli sono solo dipinti;
  - collo sottile e lungo;
  - spalle «a gobba» (le gobbe gaussiane del deltoide);
  - braccia e gambe a tubo;
  - maglietta senza orli né pieghe;
  - grembiule ridotto a fascia;
  - pelle di un solo tono.

  Sono tutti difetti di **sagoma e di abito**, non di dettaglio fine.
- Un modello «fotografico» si ripaga solo se Marco vuole **inquadrature più vicine** (3–6 m) o **immagini fisse** in primo piano. Per lo spot così com'è conta di più la qualità del movimento e degli abiti.

---

## 2. Le opzioni a confronto

Legenda «regola»: **R1** = niente modelli scaricati; **R2** = niente foto come texture.

| Opzione | Licenza e costo | Sicurezza / fonte | A 5–15 m | In primo piano | Da script `bpy` in `-b` | Download | Regola |
|---|---|---|---|---|---|---|---|
| **Le nostre persone migliorate** (codice + nodi *hair* e Rigify inclusi in Blender) | nostro codice; gli asset dei nodi in `datafiles/assets` di Blender sono CC0 | nessun rischio: è già installato (verificato: `procedural_hair_node_assets.blend` e `rigify` presenti in `/Applications/Blender.app/.../5.2/`) | buona | discreta (viso e mani restano semplificati) | sì, totale | **nessuno** | rispetta R1 e R2 |
| **MPFB 2.0.17** (MakeHuman per Blender) | codice GPLv3, asset inclusi **CC0** (corpo base, morph, rig); gratis | archivio ufficiale delle estensioni (`extensions.blender.org`), che dichiara i permessi: file sì; rete «opzionale, solo per un MakeHuman locale». Nessuna telemetria nella documentazione. Manutentore Joel Palmius, progetto ventennale | ottima | buona (corpo anatomico; la pelle dipende da noi) | sì: `HumanService.create_human()`, `add_builtin_rig()`, 10 script d'esempio ufficiali | 42,9 MB (+ facoltativo 267 MB di asset di sistema CC0) | **cambia R1**; R2 resta se non si usano le pelli dei pacchetti |
| **Human Base Meshes** (Blender Studio) | **CC0**, 49 MB, v1.4.1 | `blender.org` / `mirror.blender.org` | buona | buona | mesh pulite in quad, ma **senza morph né pesi** (pesi automatici da fare) | 49 MB | cambia R1; un solo corpo maschile e uno femminile, varietà da scolpire a mano |
| **Human Generator Ultimate** | GPL per il codice, contenuti proprietari; 68 $ personale, **128 $ commerciale** | Superhive (ex Blender Market) o `humgen3d.com`; telemetria e attivazione **non verificate**. **Attenzione**: le ricerche restituiscono copie piratate (vfxmed, aeblender, gfx‑hub) da non toccare | eccellente | eccellente (pelli 8K, capelli, vestiti, espressioni) | sì, API Python (`from HumGen3D import Human`, `BatchHumanGenerator`) | diversi GB (non dichiarato) | cambia **R1 e R2** (texture fotografiche) |
| **Character Creator 5 / ActorCore** (Reallusion) | CC5 da 299 $ (Deluxe 479 $), o abbonamento dal 2026; clip ActorCore da 1,5 a 12 $ | fonte affidabile ma **solo Windows**: niente Mac | eccellente | eccellente | no sul Mac | molti GB | cambia R1 e R2. **Escluso** (niente Windows) |
| **Mixamo** (Adobe) | gratis, uso commerciale permesso; vietato rivendere i dati | serve un **account Adobe** e il caricamento del personaggio sui server Adobe; condizioni legate ai termini Creative Cloud | (solo animazioni) | personaggi poco realistici | no: si scarica dal sito, poi FBX | per clip | cambia R1. **Non serve**: le nostre animazioni sono già sincronizzate con macchine e pezzi |
| **Mocap libero** (CMU, Quaternius UAL) | CMU: libero, anche commerciale, con citazione; Quaternius: CC0 | siti ufficiali; l'importatore BVH è già in Blender | solo per i micro‑movimenti di persone ferme | — | sì | da pochi MB in su | cambia R1, solo per l'animazione. Facoltativo |
| **Rigify** (incluso in Blender) | GPL, già installato | nessun rischio | — (è un rig, non un corpo) | — | sì: `armature_human_metarig_add()` + `pose.rigify_generate()` | nessuno | rispetta tutto. Utile solo per animare a mano; per noi non serve |
| **Personaggi di Blender Studio** (Snow, Rain, Einar…) | CC‑BY (citazione obbligatoria), circa 106 MB l'uno | `studio.blender.org` | stilizzati, non realistici | stilizzati | sì | ~100 MB | cambia R1. Stile sbagliato |
| **Generazione in geometry nodes** (persona costruita nei nodi) | nostro | — | discreta (stesso limite del loft) | scarsa | sì | nessuno | rispetta tutto. Nessun vantaggio sul codice che abbiamo; i nodi servono per capelli, pieghe e varietà, non per il corpo |
| **Strumenti per le folle**: People Going Places (gratis, low‑poly), Procedural Crowds, Horde, Population (135 $, 48 persone scansionate, 55 animazioni mocap) | vari | Superhive / Gumroad | da bassa a buona | Population buona | parziale | da centinaia di MB a GB | cambia R1; Population anche R2. Pensati per folle che camminano, non per gesti sincronizzati con le macchine. **Non adatti** |
| **Renderpeople** (persone scansionate, alcune gratuite) | uso commerciale nei render ammesso | sito ufficiale | ottima | ottima | parziale | centinaia di MB | cambia R1 e R2 (scansioni fotografiche) |

Dettagli utili su MPFB (verificati nel repository ufficiale):
- Nel pacchetto ci sono:
  - `data/3dobjs/base.obj`, il corpo base (1,7 MB);
  - `data/targets/` con i morph per braccia, gambe, testa, naso, mento, ventre…;
  - i rig `default`, `game_engine` (53 ossa), `mixamo`, `cmu_mb` (compatibile con il mocap CMU), `openpose` e due varianti Rigify;
  - in `data/textures/` solo piccole maschere jpg da 17–36 KB (viso, labbra, unghie).
- Materiali:
  - **gli occhi** di MPFB (*Eye Model v1*) sono **interamente procedurali**;
  - la pelle *Enhanced Skin* aggiunge rilievi procedurali, ma **parte da una texture diffusa**. Per restare senza foto si usa la nostra pelle procedurale.
- Uso da script: gli esempi ufficiali importano i servizi con un piccolo `dynamic_import` (le estensioni finiscono in moduli dal nome variabile) e regolano peso, altezza, genere e proporzioni con `HumanObjectProperties.set_value(...)` + `TargetService.reapply_macro_details()`.
- Il pacchetto **makehuman_system_assets** (267 MB, CC0) contiene:
  - occhi, sopracciglia, ciglia, denti e capelli;
  - alcuni abiti «casual» e scarpe;
  - pelli in texture, di origine non dichiarata.

  Per noi è facoltativo: abiti e capelli si possono generare dal codice.

---

## 3. Trasferire le NOSTRE animazioni su un corpo più realistico

Le nostre pose sono quaternioni locali di 23 ossa, campionati a 30 fps e già sincronizzati con macchine e pezzi. Ogni persona ha la sua altezza (`h` in `anim/indice.json`). Il riposo delle ossa ha **orientamento identità** nello «spazio persona» di three (y in alto, sguardo verso +z), e le braccia a riposo **pendono lungo i fianchi**.

### 3.1 Mappatura delle ossa (nostre → MPFB `game_engine`)

| Nostro | MPFB | Note |
|---|---|---|
| `anca` | `pelvis` | porta la traslazione della radice |
| `schiena` | `spine_01` | |
| `petto` | `spine_02` + `spine_03` | rotazione divisa circa a metà (slerp 0,5 e 0,5) |
| `collo`, `testa` | `neck_01`, `head` | |
| `claL/R` | `clavicle_l/r` | controllare il lato: il nostro «L» è +X, la sinistra della persona |
| `omeroL/R`, `avambL/R`, `manoL/R` | `upperarm_*`, `lowerarm_*`, `hand_*` | |
| `ditaL/R` (un osso solo) | `index/middle/ring/pinky_01..03_*` | flessione distribuita circa 0,4 / 0,35 / 0,25 sulle tre falangi |
| — | `thumb_01..03_*` | posa fissa di opposizione nella «presa», a zero altrove |
| `femore`, `tibia`, `piede`, `punta` | `thigh_*`, `calf_*`, `foot_*`, `ball_*` | |

### 3.2 Metodo consigliato: calcolo diretto, senza vincoli né add‑on

1. **Rotazione mondo della sorgente.** Il riposo è l'identità, quindi la rotazione di un osso in spazio persona è il prodotto dei quaternioni locali lungo la catena: `W(b) = W(padre) · q(b)`. Si calcola in numpy per tutti i fotogrammi insieme, **senza `frame_set`**, quindi in pochi secondi.
2. **Allineamento del riposo.** Il corpo MPFB nasce in A‑pose, il nostro con le braccia giù. Due strade:
   - (a) mettere il rig MPFB nella nostra posa di riposo, applicare il modificatore Armature alla mesh (dopo aver «cotto» le shape key di MPFB), poi *Apply Pose as Rest Pose* e rimettere il modificatore;
   - (b) più pulita: per ogni osso calcolare una correzione fissa `A(b)`, la rotazione minima che porta la direzione di riposo dell'osso MPFB su quella del nostro osso.
3. **Rotazione mondo del bersaglio:** `T(b) = W(b) · A(b) · R_riposo_MPFB(b)`. Da qui la base locale si ottiene con `q_base = R_riposo(b)⁻¹ · T(padre)⁻¹ · T(b)`, nello spazio dell'osso.
4. **Continuità dei quaternioni.** Se `dot(q_t, q_t-1) < 0` si cambia segno a `q_t`. Altrimenti l'interpolazione delle F‑curve, che è per componente, fa giri di 360°.
5. **Scrittura.** Le F‑curve si scrivono in blocco con `keyframe_points.foreach_set`, come già in `animazione.py` (`_canali`).
6. **Radice e scala.** Si genera il corpo MPFB con la **stessa altezza** della persona (`h`) e si controlla l'altezza dell'anca. La traslazione di `pelvis` si scala di `anca_MPFB / anca_nostra`. Se il rapporto è circa 1, i piedi non scivolano.

Alternativa più semplice da scrivere ma più lenta: vincoli *Copy Rotation* in spazio mondo verso un'armatura sorgente già allineata al riposo, poi `bpy.ops.nla.bake(frame_start, frame_end, visual_keying=True, clear_constraints=True, bake_types={'POSE'})` o `bpy_extras.anim_utils.bake_action_objects`. Con 35 persone e 1350 fotogrammi la cottura valuta tutta la scena a ogni fotogramma: conta qualche minuto.

### 3.3 Problemi tipici e rimedi

| Problema | Causa | Rimedio |
|---|---|---|
| Piedi che scivolano | gambe di lunghezza diversa dalla sorgente | stessa altezza d'anca; altrimenti vincolo **IK** su `calf_*` (catena 2) con bersaglio un *empty* che segue la caviglia della sorgente, polo davanti al ginocchio; poi cottura |
| Mani che non toccano pannelli, carrelli, maniglie | braccia o spalle di misura diversa | IK su `lowerarm_*` (catena 2) con bersaglio la posizione del polso sorgente (la nostra pagina la garantisce già sul pezzo); dita dalla posa «presa» |
| Compenetrazioni con le macchine | corpo e abiti più voluminosi del nostro loft | controllo in Blender con `mathutils.bvhtree.BVHTree.overlap()` tra le persone e le macchine, ogni 0,5 s. Oggi il controllo collisioni è solo nella pagina three.js |
| Avambraccio «a caramella», spalla che si affloscia | skinning lineare, niente ossa di torsione nel `game_engine` | Armature con *Preserve Volume* (dual quaternion) + modificatore **Corrective Smooth**; in alternativa il rig `default` di MPFB, che ha più ossa |
| Scatti e giri tra fotogrammi | segno dei quaternioni | § 3.2, punto 4 |
| Lato sinistro e destro invertiti | convenzioni L/R e assi (three → Blender: (x, −z, y)) | fare la prova su una posa asimmetrica nota (es. `presa` con la sola mano destra) |
| Dita rigide | un solo osso `dita` nella sorgente | distribuzione sulle falangi + posa del pollice fissa |

Strumenti inclusi in Blender:
- vincoli *Copy Rotation*, *Copy Transforms*, *Damped Track* e *IK*;
- `bpy.ops.nla.bake` e `bpy_extras.anim_utils`;
- Rigify, la *Pose Library* e l'importatore BVH.

Fuori da Blender (non servono):
- la mappatura Mixamo di MPFB;
- l'estensione **Retarget** (GPL, Blender 5.0+, preset per Mixamo, Unreal, Rigify);
- Auto‑Rig Pro (a pagamento).

---

## 4. Cosa rende realistiche le persone anche senza cambiare modello

In ordine di resa a 5–15 m. Tutto si fa da codice, con quello che c'è già in Blender.

1. **Sagoma del corpo**:
   - collo più corto e più largo, trapezi;
   - spalle senza gobbe: ridurre la gaussiana del deltoide;
   - avambracci e polpacci con la loro conicità;
   - mani con il pollice separato: anche una «manopola» con il pollice regge a 30 px.

   Dal lato di Blender:
   - **Subdivision** livello 1 al render, 0 nel viewport;
   - **Corrective Smooth** e *Preserve Volume* sull'Armature, per gomiti, ginocchia e spalle morbidi.
2. **Abiti come gusci veri, non dipinti.** Dalle regioni del corpo già note (maniche, orlo, pantaloni) si duplica la parte, la si spinge in fuori di 4–8 mm per la maglietta e di 8–15 mm per i pantaloni, verso un cilindro, così le gambe non sono più tubi aderenti. Poi *Solidify* di 2–3 mm. Gli **orli delle maniche e dei pantaloni**, che catturano la luce, sono il segnale più forte che «è stoffa». I pesi si copiano dal corpo con il modificatore *Data Transfer*.
3. **Tessuti** (Principled BSDF):
   - **maglietta nera**: base non nera (circa 0,02–0,035 lineare), rugosità 0,85, **Sheen** 0,3–0,6 (modello *Microfiber*). Il nero opaco con il bordo appena chiaro è ciò che distingue il cotone dalla plastica;
   - **jeans**: indaco con trama diagonale (*Wave* a bande inclinate, piccolissima) e schiarimento su ginocchia e cosce;
   - **grembiule blu**: più liscio, rugosità 0,5;
   - **guanti verdi con polsino giallo** e scarpe antinfortunistiche nere con suola chiara, come nelle foto F 7452.
   - **Pieghe**:
     - un *Noise* allungato lungo l'arto, come normal map debole e fissa;
     - più **shape key correttive** su gomito, ginocchio e ascella guidate da driver sull'angolo dell'osso (le pieghe compaiono solo quando l'arto si piega).

     Tutto generato da script.
4. **Capelli e barba**: con i nodi *hair* inclusi in Blender (`procedural_hair_node_assets.blend`, CC0, già installato): *Generate Hair Curves* sulla regione dello scalpo, *Clump*, *Frizz*, *Trim*, *Set Hair Curve Profile*.
   - Tagli corti di 2–6 cm, 5–15 mila ciocche per testa al render; in EEVEE forma *Strip*.
   - Sotto, una calotta con il colore dei capelli, così da lontano la testa non sembra calva.
   - Barbe corte con curve di 3–8 mm.
   - Mai cappellini (decisione di Marco).
5. **Pelle**:
   - *Subsurface Weight* 0,6–1, raggio (1, 0,35, 0,2), *Subsurface Scale* circa 0,01 m; EEVEE dalla 4.2 gestisce lo SSS con lo spessore della geometria;
   - rugosità 0,45–0,55 con un rumore leggero;
   - più rosso su naso, orecchie, guance e nocche (le regioni le conosciamo già);
   - tinte diverse per persona.

   Non serve di più: a 30 px lo SSS si vede come «pelle calda», non come dettaglio.
6. **Occhi**: due piccole sfere scure lucide con un punto di luce. Anche a 30–40 px il riflesso negli occhi «accende» il viso. In alternativa, con MPFB, gli occhi procedurali.
7. **Micro‑movimenti**:
   - respiro: `petto` 0,5–1° a circa 0,25 Hz;
   - spostamento del peso: `anca` per chi sta fermo;
   - sguardo: `testa` e `collo` verso il pezzo o il collega, con un rumore lento.

   Si aggiungono con i modificatori F‑curve *Noise* (miscela **Add**) o con una traccia NLA additiva, con fase casuale per persona. **Cautela**: ruotare il petto sposta le mani. Sulle persone che tengono un pezzo, al massimo 0,3°, oppure solo testa e collo.
8. **Varietà**:
   - altezze da 1,62 a 1,90;
   - corporature magra, media e robusta;
   - carnagioni e tagli diversi;
   - magliette nere con piccole varianti (scollo, manica);
   - una maglia rossa nel magazzino (V f_009);
   - occhiali su alcuni.

   Tutto in modo deterministico per persona, come oggi.
9. **Sfocatura di movimento**: già attiva in `spot.py` (otturatore 0,5). EEVEE sfoca anche le mesh deformate dall'armatura. Si tiene **1 passo** (solo post‑process): ogni passo in più rivaluta tutta la scena.
10. **Luce**:
    - un **contorno** leggero solo sulle persone con il *light linking*, già proposto in `BLENDER-TECNICHE.md`;
    - ombre di contatto e AO sotto i piedi: le dà il raytracing EEVEE;
    - profondità di campo f/5,6, già attiva.
11. **Livello di dettaglio**: con 35 persone non serve un LOD vero. Basta *Simplify* (massima suddivisione) per le anteprime, e i capelli a densità ridotta oltre i 20 m.

Riferimenti affidabili (tecniche):
- Manuale di Blender 5.2: Principled BSDF e Sheen, Corrective Smooth, Armature, *Hair* in geometry nodes, *Generate Hair Curves*, *Curves* in EEVEE, *Motion Blur* in EEVEE, modificatori F‑curve, *Shape keys* e *Drivers*, *Cloth* (link in fondo).
- Note di rilascio EEVEE 4.2 (SSS e *Thickness*).
- Blender Studio: rig Snow e Rain come riferimento di deformazioni e controlli.
- MPFB, documentazione ufficiale e video di Joel Palmius.
- Ian Hubert (Lazy Tutorials): il realismo da piccole variazioni, già citato in `BLENDER-TECNICHE.md`.

---

## 5. Costo in tempo

### 5.1 Render (stime, da confermare)

Base misurata: circa 6,5–6,8 s per fotogramma a 1080p e 48 campioni. Lo spot ha 1350 fotogrammi (circa 2,5 h); il video intero da 3:40 ha circa 6600 fotogrammi (circa 12 h).

| Variante | Geometria persone (35) | s/fotogramma stimati | Spot 45 s | Video 3:40 |
|---|---|---|---|---|
| Oggi | loft attuale | 6,5–6,8 | ~2,5 h | ~12 h |
| A: nostre migliorate | ~25–40 mila triangoli a persona dopo la suddivisione, abiti, capelli a strisce | 7,5–8,5 | ~2,8–3,2 h | ~14–16 h |
| B: MPFB + abiti + capelli | ~55 mila facce a persona dopo la suddivisione, più gli abiti; in tutto circa 2–3 milioni di triangoli (ben dentro i 16 GB) | 8–10 | ~3–3,8 h | ~15–18 h |
| + sfocatura con 4 passi | | ×1,5–2 | | |
| + simulazione del grembiule (5–6 verniciatori) | cottura una volta sola | +0 al render, 2–5 min di cottura | | |

La voce che pesa di più è la **valutazione delle deformazioni** (Armature + Corrective Smooth su 35 corpi) a ogni fotogramma: circa 0,3–1 s sulla CPU. Lo SSS e i capelli in EEVEE costano poco a questa distanza.

### 5.2 Lavoro (stime)

| Variante | Giorni | Contenuto |
|---|---|---|
| A: nostre migliorate | 3–4 | sagoma del corpo, gusci degli abiti, tessuti, capelli GN, occhi, micro‑movimenti, prove A/B |
| B: MPFB | 5–7 | installazione e prova (0,5); generatore delle 35 persone con altezze e corporature (1); retarget numpy con allineamento del riposo, IK su mani e piedi e dita (1,5–2); abiti da codice sul corpo MPFB (1–2); controllo compenetrazioni e foto di confronto (1) |
| Human Generator | 4–6 + acquisto | come B, ma abiti e capelli pronti; pelli fotografiche |

---

## 6. Raccomandazione

### (a) La migliore restando nella regola «tutto dal codice»

**Persone attuali migliorate in Blender, con le stesse ossa e le stesse animazioni.** Nessun download e nessun retarget: le mani restano esattamente sui pezzi.

Ordine di lavoro, dal più efficace:
1. Gusci degli abiti con gli orli, e tessuti con *Sheen* (maglietta nera, jeans, grembiule, guanti, scarpe).
2. Capelli e barba con i nodi *hair* inclusi in Blender, più la calotta.
3. Sagoma: collo, spalle, conicità degli arti, pollice; Subdivision 1 + Corrective Smooth + *Preserve Volume*.
4. Pelle con SSS e regioni arrossate; occhi lucidi.
5. Micro‑movimenti (respiro, peso, sguardo), con cautela sulle persone che tengono un pezzo.
6. Contorno di luce con il light linking; varietà di altezze e corporature.

**Provino prima di tutto**: lo stesso fotogramma della Cefla (operatore a circa 6 m) e uno della foratura (circa 15 m), prima e dopo, con il tempo di render. Si va avanti solo se Marco vede la differenza.

### (b) La migliore in assoluto, se Marco consente asset con licenza libera da fonte ufficiale

**MPFB 2 (corpo, morph e rig CC0) + le nostre animazioni trasferite da script + pelle, abiti e capelli procedurali nostri.** La regola cambia solo per il «niente modelli scaricati»; il «niente foto» resta, perché non si usano le pelli dei pacchetti.

Cosa si scaricherebbe, esattamente:

| # | Cosa | Da dove | Dimensione | Licenza | Necessario? |
|---|---|---|---|---|---|
| 1 | Estensione **MPFB 2.0.17** (22/07/2026; Blender 4.2+; 177 mila download) | https://extensions.blender.org/add-ons/mpfb/ (archivio ufficiale delle estensioni di Blender); da riga di comando `blender -c extension install -s -e mpfb` | 42,9 MB | codice **GPLv3**; asset inclusi **CC0** (corpo base, morph, rig, maschere) | **sì** |
| 2 | **makehuman_system_assets** | https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip (mirror ufficiale: `files2.`) | 267 MB | **CC0** | facoltativo: sopracciglia, ciglia, denti, capelli e abiti casual pronti. Le **pelli** in texture **non** si usano |
| 3 | **shirts01** (contiene «crude t‑shirt» maschile) | https://files.makehumancommunity.org/asset_packs/shirts01/shirts01_cc0.zip | 23 MB | **CC0** | facoltativo: solo se non si vuole la maglietta generata dal codice |

Totale: **da 43 MB a circa 333 MB**.

Avvertenze:
- Le estensioni si installano in `~/Library/Application Support/Blender/5.2/extensions/`, cioè sul **disco interno quasi pieno**. I 43 MB sono accettabili. I pacchetti zip vanno tenuti sull'SSD: MPFB li carica da un file zip, e la cartella dei dati utente di MPFB va puntata sull'SSD (da verificare nelle preferenze di MPFB).
- **Non** servono Mixamo, Human Generator, Character Creator né pacchetti di animazione.

Se un giorno servissero **primi piani fotografici** (immagini fisse, 1–3 m), l'unica opzione Mac di livello superiore è **Human Generator** (128 $ commerciale, Superhive o `humgen3d.com`). Cambia **entrambe** le regole, perché ha pelli fotografiche; va comprato solo dal sito ufficiale, mai dalle copie che circolano.

**Decide Marco.** Domande da porgli:
1. Va bene un corpo base scaricato (CC0, MakeHuman) purché senza foto?
2. Vuole inquadrature più vicine alle persone? Se no, la strada A basta.

---

## Fonti

Persone e licenze:
- MPFB nell'archivio delle estensioni: https://extensions.blender.org/add-ons/mpfb/
- Repository MPFB (codice, `data/`, `LICENSE.md`, esempi di script): https://github.com/makehumancommunity/mpfb2, https://github.com/makehumancommunity/mpfb2/blob/master/script_samples/index.md
- Licenza MakeHuman: https://static.makehumancommunity.org/about/license.html
- Documentazione MPFB:
  - perché usarlo: https://static.makehumancommunity.org/mpfb/faq/why_use.html
  - materiali: https://static.makehumancommunity.org/mpfb/docs/materials/overview.html
  - primi passi: https://static.makehumancommunity.org/mpfb/docs/getting_started.html
  - Mixamo: https://static.makehumancommunity.org/mpfb/docs/rigging_posing/mixamo.html
  - sviluppatori: https://static.makehumancommunity.org/mpfb/developer/index.html
- Pacchetti di asset MakeHuman:
  - elenco: https://static.makehumancommunity.org/assets/assetpacks.html
  - asset di sistema: https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html
  - shirts01: https://static.makehumancommunity.org/assets/assetpacks/shirts01.html
  - pants01: https://static.makehumancommunity.org/assets/assetpacks/pants01.html
  - shoes01: https://static.makehumancommunity.org/assets/assetpacks/shoes01.html
  - skins02: https://static.makehumancommunity.org/assets/assetpacks/skins02.html
- MPFB 2 su CG Channel: https://www.cgchannel.com/2025/03/check-out-open-source-blender-character-generation-plugin-mpfb-2/
- Human Base Meshes:
  - pagina dei file di Blender: https://www.blender.org/download/demo-files/
  - mirror: https://mirror.blender.org/demo/asset-bundles/human-base-meshes/
  - articolo: https://www.cgchannel.com/2023/06/download-blender-studios-free-human-base-meshes/
- Human Generator:
  - prezzi: https://humgen3d.com/pricing
  - Superhive: https://superhivemarket.com/products/humgen3d
  - API: https://help.humgen3d.com/API/Overview
- Character Creator 5:
  - requisiti (solo Windows): https://manual.reallusion.com/Character-Creator-5/Content/ENU/5.0/04-Introducing-the-User-Interface/System-Requirements.htm
  - prezzo: https://www.reallusion.com/plan-and-pricing/individual/perpetual/character-creator-5-deluxe-3075
  - licenza dei contenuti: https://www.reallusion.com/license/content.html
  - ActorCore: https://actorcore.reallusion.com/
- Mixamo, FAQ: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
- Mocap CMU, FAQ: https://mocap.cs.cmu.edu/faqs.php
- Quaternius UAL: https://quaternius.com/packs/universalanimationlibrary.html
- Blender Studio, rig Snow (CC‑BY): https://studio.blender.org/characters/snow/v4/
- Folle:
  - People Going Places: https://www.cgchannel.com/2024/09/people-going-places-is-a-lightweight-free-blender-crowds-add-on/
  - Population: https://superhivemarket.com/products/population
  - Procedural Crowds: https://superhivemarket.com/products/procedural-crowds
- Renderpeople: https://renderpeople.com/free-3d-people/
- Estensione Retarget: https://extensions.blender.org/add-ons/retarget/

Tecniche (manuale e API di Blender 5.2):
- Principled BSDF: https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html
- Sheen: https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/sheen.html
- Subsurface: https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/sss.html
- Note EEVEE 4.2 (SSS, *Thickness*): https://developer.blender.org/docs/release_notes/4.2/eevee/
- Motion blur in EEVEE: https://docs.blender.org/manual/en/latest/render/eevee/render_settings/motion_blur.html
- Curves in EEVEE: https://docs.blender.org/manual/en/latest/render/eevee/render_settings/curves.html
- Hair in geometry nodes: https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/hair/index.html
- *Generate Hair Curves*: https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/hair/generation/generate_hair_curves.html
- Corrective Smooth: https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/corrective_smooth.html
- Armature: https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/armature.html
- Copy Rotation: https://docs.blender.org/manual/en/latest/animation/constraints/transform/copy_rotation.html
- IK: https://docs.blender.org/manual/en/latest/animation/constraints/tracking/ik_solver.html
- `bpy.ops.nla`: https://docs.blender.org/api/current/bpy.ops.nla.html
- `bpy_extras.anim_utils`: https://docs.blender.org/api/current/bpy_extras.anim_utils.html
- Modificatori F‑curve: https://docs.blender.org/manual/en/latest/editors/graph_editor/fcurves/modifiers.html
- Shape keys: https://docs.blender.org/manual/en/latest/animation/shape_keys/introduction.html
- Drivers: https://docs.blender.org/manual/en/latest/animation/drivers/introduction.html
- Cloth: https://docs.blender.org/manual/en/latest/physics/cloth/index.html
- Rigify: https://docs.blender.org/manual/en/latest/addons/rigify/index.html

Verificato in locale (senza installare nulla):
- Blender 5.2 contiene `scripts/addons_core/rigify`, `io_anim_bvh` e `datafiles/assets/nodes/procedural_hair_node_assets.blend` (licenza CC0 in `datafiles/assets/LICENSE`);
- nessuna estensione è installata;
- la CLI `blender -c extension install` esiste.
