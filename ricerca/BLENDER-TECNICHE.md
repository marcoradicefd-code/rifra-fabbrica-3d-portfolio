# Blender 5.2 LTS per la fabbrica RiFRA: tecniche, impostazioni, priorità

Ricerca del 01/10/2026. Contesto: scena three.js (box e cilindri, colori per vertice, texture procedurali) portata in Blender 5.2.2 LTS su Mac M4 (GPU Metal a 8 core, 16 GB di memoria unificata). Il risultato deve essere realistico, pulito (muri chiari, niente sporco) e tutto «disegnato dal codice»: niente modelli scaricati, niente foto come texture.
I tempi di render sono **stime** ricavate da benchmark pubblici. Vanno confermati con un provino di 10 fotogrammi sulla macchina vera (vedi priorità 2).

---

## Sintesi (10 righe)

1. **Per il video da 3:40 usiamo EEVEE.** Con Cycles sul M4 a 8 core servirebbero 4–8 giorni di render continuo. Con EEVEE si scende a circa 8–25 ore. Cycles resta per 3–6 immagini «eroe» e, al massimo, per qualche secondo di inquadrature chiave.
2. Lo stacco più grande dall'aspetto «three.js» viene dagli **spigoli smussati**: bevel modifier da 3–20 mm con harden normals, più weighted normal. Va prima fatta la saldatura dei vertici (merge by distance), perché la geometria three.js arriva coi vertici divisi per faccia.
3. Prima della saldatura i **colori per vertice** vanno portati sul dominio *face corner*, altrimenti la saldatura li mescola.
4. **Materiali**: tutti procedurali, con variazione di rugosità e un velo di colore entro il ±2 %. Mai macchie o sporco. Per l'epoxy del pavimento: coat lucido sopra il cemento. La lamiera zincata usa Voronoi per la «fioritura». Il vetro usa *Thin Wall*, nuovo nella 5.2.
5. **Luce**: cielo *Multiple Scattering* (sostituisce Nishita) con un sole morbido, area light sotto i lucernari, LED a 4000–5000 K con `use_temperature`. Serve un *Light Probe Volume* cotto una volta sola, perché la luce è statica.
6. **EEVEE 5.2**: raytracing *Screen-Trace* a metà risoluzione, Fast GI, 64 campioni e overscan attivo. Il nuovo instancing della 5.2 rende fino a 2× più veloce le scene con molte istanze.
7. **Colore**: AgX (o Khronos PBR Neutral se le finiture RiFRA devono restare fedeli al campione), con un piccolo compositing: bloom col Glare, vignettatura leggera, niente grana pesante.
8. **Animazioni**: i nastri si fanno in geometry nodes con *Scene Time* (niente keyframe). Il robot cartesiano è una gerarchia di oggetti con keyframe campionati da three.js. Per le persone si usa lo scheletro di three.js ricostruito come armatura, oppure il metarig di Rigify (incluso in Blender) generato da script.
9. Le **API di Blender 5.x sono cambiate**: niente `action.fcurves` (ora si passa dai channelbag), il motore si chiama `'BLENDER_EEVEE'`, `use_gtao` non esiste più, il compositing sta in `scene.compositing_node_group` e gli input dei modificatori GN si scrivono in `mod.properties.inputs.<id>.value`.
10. **Viewport**: 1.400 oggetti non sono un problema in sé. Conviene unire gli statici per materiale e per reparto, istanziare ciò che si ripete (sedie, auto, alberi, lampade), applicare i bevel nel build e non lasciarli «vivi», e tenere separati gli oggetti animati.

---

## 1. Chi seguire e cosa insegna di concreto

| Chi | Cosa insegna di concreto | Cosa ci serve per RiFRA |
|---|---|---|
| **Andrew Price, Blender Guru** | I «4 pilastri» del fotorealismo (modellazione, materiali, luce, post). Il *Lighting Cheat Sheet* (luce morbida dall'alto, colori naturali, ombre per leggere la forma). La serie *Archviz in EEVEE* (luce che filtra dai muri, soft shadows). Il PDF *140 Tips for Architectural Rendering*. | Le regole di luce per l'interno del capannone e l'impostazione dell'esposizione. È stato lui a portare Filmic, poi AgX, nell'uso comune. |
| **Ian Hubert, Lazy Tutorials** | Il realismo nasce da piccole variazioni casuali («warbles»), non dal dettaglio estremo. Molti trucchi da 1 minuto per far sembrare vero un modello semplice. | La nostra geometria è semplice per scelta. Bastano variazioni di tinta e rugosità per oggetto (random per istanza), luce credibile e motion blur. Lo sporco no. |
| **Josh Gambrell + Ponte Ryuurui, Blender Bros** | Flusso hard-surface: bevel weight, *harden normals*, *Weighted Normal*, n-gon accettabili, metodo MAD-T. | È esattamente il trattamento da dare a macchine, carter, scaffali e infissi. |
| **Arrimus 3D** | Corsi di modellazione (Blender, Plasticity): modificatori mirror, solidify, edge split, pannellature. | Pannellature e dettagli delle macchine, se vorremo arricchirle. |
| **Simon Thommes, Blender Studio** | *Procedural Shading: Fundamentals and Beyond* (muri, pavimenti, legno solo coi nodi) e *Geometry Nodes from Scratch*. | È la fonte migliore per la regola del cliente: tutto procedurale, niente immagini. |
| **CG Boost (Martin Klekner)** | Corso *Blender for Architecture*: modellazione architettonica, Cycles, compositing nel node editor. | Il flusso archviz completo, con il compositing finale. |
| **Arch Viz Artist (Agnieszka Klich)** | Flusso archviz, animazioni architettoniche, trucchi di regia per i video. | Il ritmo delle camere e la regia del video. |
| **Ryan King Art** | Materiali e luce spiegati in modo chiaro, scene complete. | Le ricette dei materiali. |
| **GarageFarm Academy** | Serie archviz che arriva a un loft industriale con scale metalliche e tubazioni di ventilazione. | I dettagli industriali: condotte e carpenteria. |
| **3D Tudor** | *Conveyor Belt Generator* in geometry nodes: nastri ad anello, cadute di oggetti, ingranaggi, senza simulazione. | Conferma che i nastri si fanno in GN senza simulazione. Il prodotto è a pagamento e scaricato, quindi non si usa: si rifà da script. |
| **Digital twin (ricerca)** | Articoli su Blender per modellare macchine e impianti di produzione. Progetti come *cdl-digital-twin* (robot pick-and-place animato da dati). | Conferma che la strada «scena generata da codice + animazione da dati» è quella giusta. |

Blender Studio non fa archviz: per noi conta come fonte su nodi procedurali e GN. Studi specializzati in «factory visualization» in Blender con didattica pubblica e seria non ne ho trovati. In rete si trovano soprattutto asset in vendita e lavori singoli, come la scena industriale in EEVEE su BlenderArtists.

---

## 2. Tecniche applicabili via script alla geometria esistente

### 2.1 Preparare la mesh (passaggio obbligato prima di tutto il resto)

La geometria three.js arriva a triangoli, coi vertici duplicati su ogni faccia, e spesso «fusa» (più box in una mesh). Va preparata così:

```python
import bmesh, bpy
# 1) i colori per vertice passano al dominio face corner (prima della saldatura!)
#    meglio farlo direttamente in importa.py: color_attributes.new('col', 'FLOAT_COLOR', 'CORNER')
# 2) saldatura e quad
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
bmesh.ops.join_triangles(bm, faces=bm.faces, angle_face_threshold=0.01, angle_shape_threshold=3.14,
                         cmp_seam=False, cmp_sharp=False, cmp_uvs=True, cmp_vcols=True, cmp_materials=True)
bm.to_mesh(me); bm.free()
```

Senza la saldatura il bevel non trova spigoli (ogni faccia è un'isola). Senza i quad dà facce storte.

### 2.2 Tabella: tecnica → come farla in bpy → impatto → costo di render

Il costo è per fotogramma: **B** = basso (<5 %), **M** = medio (5–20 %), **A** = alto (>20 %).

| Tecnica | Come farla in bpy | Impatto visivo | Costo |
|---|---|---|---|
| Bevel modifier sugli spigoli | `m=o.modifiers.new('Bevel','BEVEL'); m.limit_method='ANGLE'; m.angle_limit=radians(30); m.width=0.004…0.02` (in metri, in base alla dimensione); `m.segments=2…3; m.harden_normals=True; m.use_clamp_overlap=True`. Poi si applica nel build con `bpy.data.meshes.new_from_object(o.evaluated_get(dg))`. | **Altissimo**: i riflessi sugli spigoli sono il segno n. 1 del realismo | B (più poligoni, trascurabile) |
| Weighted Normal | `w=o.modifiers.new('WN','WEIGHTED_NORMAL'); w.keep_sharp=True; w.use_face_influence=True`, dopo il bevel. Il bevel deve scrivere `face_strength_mode='AFFECTED'`. | Alto: niente ombreggiature sporche sulle facce piatte | B |
| Auto smooth (4.1+) | `bpy.ops.object.shade_auto_smooth(angle=radians(30))` (aggiunge il modificatore *Smooth by Angle*) oppure `shade_smooth_by_angle(angle=…)`. `use_auto_smooth` non esiste più. | Medio: cilindri lisci, box netti | B |
| Bevel nel nodo shader | Nodo `ShaderNodeBevel` (raggio 2–5 mm) collegato alla Normal del Principled. **Funziona solo in Cycles** e costa circa il 20 %. | Medio, solo per le immagini Cycles | A |
| Bevel in Geometry Nodes (nuovo nella 5.2) | Nodo *Mesh Bevel* dentro un modificatore GN, con selezione per attributo. | Come il modificatore, ma procedurale | B |
| Maschera spigoli/curvatura cotta | In GN: *Edge Angle* → *Capture/Store Named Attribute* `'curv'` (dominio point/corner). Nello shader si legge con un nodo Attribute: funziona in EEVEE e in Cycles, a differenza di *Pointiness*, che è solo Cycles. | Medio: spigoli un po' più lucidi o chiari (vernice levigata), **non** usura né sporco | B |
| Variazione per oggetto | Nodo `ShaderNodeObjectInfo` → *Random* → map range verso tinta ±2 % e rugosità ±0,05. | Alto: toglie l'effetto «clonato» a macchine, sedie e auto | B |
| Vernice industriale (macchine RAL) | Principled: `Metallic 0`, `Roughness 0.35–0.45`, `Coat Weight 0.2–0.4`, `Coat Roughness 0.1`. Buccia d'arancia: Noise (scala circa 300) → Bump con forza 0,02. | Alto | B |
| Lamiera zincata | `Metallic 1`, base circa 0,6 di grigio. Voronoi (scala 10–30/m, uscita *Color*) → map range → rugosità 0,22–0,45 e tinta ±3 % (la «fioritura» dello zinco). | Alto su condotte e canali | B |
| Lamiera grecata/ondulata | **Geometria vera** quando si vede di profilo (bordi del tetto, facciate in scorcio): GN *Grid* → *Set Position* con z = A·sin(2πx/p). Da lontano basta una *Wave Texture* (bands) → Bump. | Alto sulle facciate | B (bump) / B–M (geometria) |
| Cemento o resina epossidica del pavimento | Base: 2 Noise (scala 0,3 e 8) per una tinta grigia appena variata. Rugosità 0,15–0,3 variata a grande scala. **Coat** `Weight 1, Roughness 0.03–0.08, IOR 1.5` per l'epoxy. Giunti ogni 5–6 m con `fract(x/5)` → linea scura sottile. Le strisce gialle sono geometria piatta (decal). | **Altissimo**: il pavimento lucido che riflette le macchine «vende» la scena | M (riflessi) |
| Muri chiari puliti | Base RAL 9010 circa (0,8), `Roughness 0.85`. Noise a grande scala (0,2/m) con un'ampiezza del ±1,5 % per non sembrare un colore piatto. **Niente AO o grunge sui muri.** | Medio | B |
| Vetro (finestre, uffici) | Principled `Transmission 1, Roughness 0–0.05` più l'opzione **Thin Wall** (5.2), così basta un piano. In EEVEE: `mat.surface_render_method='DITHERED'` e `mat.use_raytrace_refraction=True`. | Alto sugli uffici | M |
| Asfalto | Base 0,04–0,06, `Roughness 0.85–0.9`. Voronoi fine (scala circa 400) per gli inerti in bump e nella tinta. Strisce dei parcheggi come maschera per coordinate o come geometria piatta. | Medio | B |
| Decal procedurali (strisce, cartelli, logo) | Piani sottili 1 mm sopra la superficie (o *Shrinkwrap*). Testi come oggetti *Text*. Il logo RiFRA si esporta dai tracciati di `logo.js` in SVG e si importa come curva: resta «disegnato dal codice». | Alto per la leggibilità | B |
| Bulloni, griglie, scaffali, cavi in GN | Bulloni: *Instance on Points* (cilindro a 6 lati) negli angoli dei pannelli. Griglie: *Grid* + *Mesh to Curve* + *Curve to Mesh*. Scaffali: *Mesh Line* di montanti e correnti con passo come parametro. Cavi: curva con abbassamento parabolico e *Curve to Mesh* col profilo circolare. | Medio-alto da vicino | B |
| Cielo | World → `ShaderNodeTexSky`, `sky_type='MULTIPLE_SCATTERING'` (in 5.x *Nishita* si chiama `SINGLE_SCATTERING` ed è «legacy»). Il cielo è molto luminoso: si abbassa l'esposizione. | Alto all'esterno e nei lucernari | B |
| Sole | `SUN` con `angle` di 0,5–1,5° (ombre morbide), `use_shadow_jitter=True` in EEVEE (servono campioni) | Alto | B–M |
| Lucernari / shed | Un'*Area light* rettangolare sotto ogni fila di lucernari: `spread` 60–90°, ombre spente o morbide, con `use_temperature=True` e `temperature≈6500`. EEVEE **non** illumina con le superfici emissive, servono luci vere. | **Altissimo**: è la luce caratteristica del capannone | M |
| Lampade LED (high-bay) | Point o area piccole con `use_temperature=True` e `temperature=4000–5000`, `use_custom_distance=True` e `cutoff_distance` per limitarne il raggio. **Ombre solo su poche.** Il disco visibile è un emissivo a parte. | Medio | M (A se tutte proiettano ombre) |
| Light linking (EEVEE 4.3+ e Cycles) | `light.light_linking.receiver_collection = coll` (luce di riempimento solo su persone e macchine). Con gli emissivi in EEVEE non funziona, e non si propaga alle istanze. | Medio: regia della luce | B |
| Light Probe Volume (GI cotta) | `bpy.data.lightprobes.new('GI','VOLUME')` scalato su tutto il capannone (risoluzione circa 24×14×4, una sonda ogni 3 m), più un volume fine sugli uffici. Si cuoce con `bpy.ops.object.lightprobe_cache_bake(subset='ALL')`. La cottura salva i dati nel file. | **Altissimo** in EEVEE: luce rimbalzata credibile | B al render, la cottura richiede qualche minuto |
| Light Probe Sphere | 2–4 sfere (capannone, uffici, esterno) per i riflessi fuori schermo | Medio | B |
| Colore | `sc.view_settings.view_transform='AgX'` con look *Medium High Contrast*. Il nome esatto del look va verificato: le voci si leggono dalle `enum_items` della proprietà `look` nella stessa sessione. Alternativa per colori fedeli: `'Khronos PBR Neutral'`. Spazio di lavoro lasciato su Linear Rec.709. | Alto | — |
| Compositing (5.x) | `sc.compositing_node_group` (non più `scene.node_tree`). Glare (Bloom) leggero, Lens Distortion con dispersione circa 0,003, Ellipse Mask per la vignettatura, curve morbide. | Medio | B (gira su GPU) |
| Nebbia e volumi | Volume Scatter nel World o un cubo con densità 0,001–0,003: «raggi» sotto i lucernari | Medio, opzionale (da far vedere a Marco) | M–A |
| Motion blur | `sc.render.use_motion_blur=True`, otturatore 0,5 | Medio: movimenti di macchine e persone più naturali | M |

### 2.3 Ricette rapide da ricordare

- **Niente colori a 1,0.** Va tenuto l'albedo ≤ 0,8, anche per il «bianco» dei muri, come consiglia il manuale di Cycles: meno rumore, luce più credibile.
- **Usura degli spigoli**: il cliente vieta lo sporco. La maschera di curvatura serve solo a rendere gli spigoli *un po' più lucidi* (vernice levigata). Se Marco dice di no, si toglie.
- **Statico in bmesh, procedurale in GN.** Per la geometria che non si muove (bulloni, grecata, scaffali) conviene generarla direttamente con bmesh o numpy dallo script, che è più esplicito e non dipende dalle API dei GN. I GN si usano dove servono il tempo (nastri) o le istanze.

---

## 3. EEVEE o Cycles sul Mac M4 per 6.600 fotogrammi

### 3.1 Stime realistiche

| Motore | Impostazione | Secondi per fotogramma (1080p, stima) | 6.600 fotogrammi |
|---|---|---|---|
| EEVEE 5.2 | 64 campioni, raytracing a ½, Fast GI, probe cotti | 4–12 s | **8–22 h** |
| EEVEE 5.2 | 32 campioni (provini) | 2–6 s | 4–11 h |
| Cycles 5.2 (Metal + MetalRT) | 128 campioni adattivi + OIDN su GPU | 50–120 s | **4–9 giorni** |
| Cycles a 1280×720 + upscale | come sopra | 25–55 s | 2–4 giorni |

Da dove vengono i numeri:
- **Classroom** (Cycles, Blender 3.3): circa 103–110 s su M4 con GPU a 10 core.
- Da allora sono arrivati MetalRT, attivo in automatico da M3 in poi (il guadagno su M3 è stato molto alto), e un +5–10 % sulla GPU nella 5.1.
- Una GPU a 8 core rende circa il 20 % in meno.
- EEVEE con raytracing: circa 30 s su M3 Pro e circa 66 s su M2 Max in una scena impegnativa con tracciamento a piena risoluzione. Le nostre impostazioni a ½ e i probe cotti scendono molto sotto quei valori.

**Se il Mac è un MacBook Air** (M4 con GPU a 8 core, senza ventola), nei render lunghi rallenta per il calore: ai tempi va aggiunto un 20–40 %. Conviene renderizzare di notte, su un supporto ventilato, e misurare il tempo per fotogramma dopo 30 minuti, non nel primo minuto.

### 3.2 Impostazioni EEVEE consigliate (nomi verificati sulle API 5.2)

```python
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'            # 5.0+: non più BLENDER_EEVEE_NEXT
ee = sc.eevee
ee.taa_render_samples = 64                    # 32 per i provini
ee.use_raytracing = True
ee.ray_tracing_method = 'SCREEN'              # Screen-Trace, con ripiego sui probe
ro = ee.ray_tracing_options
ro.resolution_scale = '2'                     # metà risoluzione: veloce e quasi uguale
ro.trace_max_roughness = 0.5                  # sopra 0,5 va in Fast GI
ro.use_denoise = True                         # spaziale, temporale, bilaterale (default)
ro.use_backface_hit = True                    # 5.2: meno luce che filtra
ee.use_fast_gi = True; ee.fast_gi_method = 'GLOBAL_ILLUMINATION'
ee.fast_gi_resolution = '2'; ee.fast_gi_step_count = 8
ee.shadow_pool_size = '1024'                  # 16 GB condivisi: non oltre
ee.shadow_ray_count = 1; ee.shadow_step_count = 6
ee.use_overscan = True; ee.overscan_size = 0.05   # niente riflessi che spariscono ai bordi nei movimenti di camera
ee.gi_diffuse_bounces = 3                     # per la cottura del Light Probe Volume
sc.render.use_motion_blur = True
```

Note:
- In 5.x `use_gtao` non esiste più: la distanza dell'AO sta nel view layer, alla voce `ambient_occlusion_distance`.
- Le *ombre virtuali* (virtual shadow maps) sono sempre attive e non c'è niente da scegliere. Si regolano luce per luce con `shadow_maximum_resolution` e `shadow_filter_radius`. Per le luci secondarie: `light.use_shadow = False`.
- Il pavimento lucido lo risolve bene lo Screen-Trace. Il *Light Probe Plane* (riflesso planare) è caro e serve solo se il riflesso fuori schermo si nota.
- Nella 5.2 EEVEE ha l'instancing ottimizzato (fino a 2× nelle scene con molte istanze), la ricerca dei raggi rivista e il Fast GI più robusto.

### 3.3 Impostazioni Cycles (immagini eroe)

- Preferenze: dispositivo Metal, MetalRT su *Auto*. Render: `device='GPU'`.
- Campioni 512–1024 adattivi (soglia 0,01), denoise **OpenImageDenoise su GPU** (su Apple Silicon funziona dalla 4.1 con macOS 13+), passaggi albedo e normal.
- *Light tree* attivo, *Filter Glossy* 1,0, caustiche spente, *Clamp Indirect* 10, rimbalzi preset «Limited GI».
- *Persistent Data* attivo (`sc.render.use_persistent_data=True`) per le sequenze: non ricostruisce BVH e shader a ogni fotogramma, ma costa memoria.
- Qui si può usare il nodo Bevel (+20 %).
- Per il video Cycles non conviene: il denoise fotogramma per fotogramma a pochi campioni **sfarfalla**, e su Mac manca il denoiser temporale di OptiX.

### 3.4 Trucchi di produzione

- **Render in sequenza di PNG a 16 bit o EXR**, mai direttamente in MP4. Con `render.use_overwrite=False` e `render.use_placeholder=True` un crash non fa perdere nulla e si può riprendere. Il montaggio si fa poi con ffmpeg.
- **Da riga di comando**, per inquadratura: `Blender -b rifra-fabbrica.blend -s 1 -e 900 -a`. Tenere sveglio il Mac con `caffeinate -i`.
- **La risoluzione metà più upscale** conviene con Cycles, non con EEVEE: lì si risparmia di più abbassando i campioni. Per l'upscale c'è la skill `hero-video-upscale` già usata in altri lavori.
- **Ibrido**: tutto in EEVEE, più 3–6 fotogrammi fissi in Cycles per brochure e social.

---

## 4. Animazioni via script

| Cosa | Metodo consigliato | Perché |
|---|---|---|
| **Pezzi sui nastri** | GN: *Curve* del nastro → *Resample* → *Set Position*, oppure *Sample Curve* con `offset = (Scene Time × velocità + i·passo) mod lunghezza` → *Instance on Points* con la collezione dei pannelli. Nessun keyframe e nessuna simulazione. | Deterministico come in three.js (`reparti.js` lavora sul tempo `t`), leggero e istanziato |
| **Rulli e cinghie** | Driver con *simple expression* (`frame*0.2`): si valuta **senza Python**, quindi gira anche in background senza «Auto Run Scripts» | Zero keyframe, zero costo |
| **Robot cartesiano / Spraybotic** | Gerarchia trave X → carrello Y → asse Z → testa. Keyframe solo nelle pose chiave, campionate dalla funzione di `reparti.js`, con interpolazione Bezier e *ease*. | Fedele e modificabile |
| **Muletto, carrelli, auto** | Vincolo *Follow Path* su una curva, oppure keyframe campionati della matrice | Semplice |
| **Persone, strada A (fedele)** | Esportare da three.js lo scheletro (ossa e rest pose) e, per ogni fotogramma, i quaternioni locali delle ossa (le pose sono procedurali e deterministiche in `t`). In Blender: armatura creata da script (`edit_bones`), parti del corpo come primitive imparentate alle ossa (nessuno skinning da sistemare), keyframe scritti in blocco. | Riproduce esattamente le pose già approvate (`presa`, `guarda`, `volante`) |
| **Persone, strada B (più morbida)** | `bpy.ops.object.armature_human_metarig_add()` → si adattano le ossa da script → `bpy.ops.pose.rigify_generate()` (Rigify è **incluso** in Blender 5.2). Mesh: scheletro di vertici + *Skin modifier* + *Subdivision*, oppure capsule unite. Pesi con `parent_set(type='ARMATURE_AUTO')`. Camminata: cicli seno/coseno su cosce, stinchi, piedi e braccia, più F-modifier *Cycles* e *Follow Path* della radice. | Pieghe morbide e controlli IK per i piedi. Richiede più lavoro di messa a punto. |

**Come scrivere i keyframe in Blender 5.x** (l'API vecchia `action.fcurves` è stata rimossa nella 5.0):

```python
from bpy_extras import anim_utils
act = bpy.data.actions.new('robot'); ob.animation_data_create(); ob.animation_data.action = act
slot = ob.animation_data.action_slot            # 4.4+: azioni a slot
cb = anim_utils.action_ensure_channelbag_for_slot(act, slot)
fc = cb.fcurves.new('location', index=0, group_name='Robot')
fc.keyframe_points.add(n); fc.keyframe_points.foreach_set('co', coppie_frame_valore.ravel())
for k in fc.keyframe_points: k.interpolation = 'LINEAR'   # oppure si imposta in blocco
```

L'assegnazione automatica dello slot va verificata alla prima prova: se `action_slot` è vuoto, si crea con `act.slots.new(...)`.

**Attenzione ai volumi di dati.** 6.600 fotogrammi × 100 oggetti × 10 canali fanno 6,6 milioni di chiavi. Conviene campionare solo dove il movimento cambia (pose chiave) oppure usare i GN col tempo. I fotogrammi densi vanno tenuti solo per le persone, a 15 fps con interpolazione.

**Simulation zone dei GN.** Non serve: le nostre animazioni sono deterministiche. Servirebbe solo per fisica vera, come pezzi che cadono o stoffe.

**API dei modificatori GN cambiata nella 5.2:** ora `mod.properties.inputs.<identificatore>.value = 5.0`, al posto di `mod["Socket_2"] = 5.0`.

---

## 5. Prestazioni del viewport con circa 1.400 oggetti

- **1.400 oggetti sono pochi** per Blender: i problemi arrivano sopra i 10.000. Il collo di bottiglia saranno i bevel non applicati, i GN «vivi» e le luci con ombra.
- **Unire gli statici per materiale e per reparto.** Un oggetto per reparto e per materiale permette ancora di nascondere un reparto, ma riduce le draw call.
- **Collection instances** per tutto ciò che si ripete: sedie, scrivanie, auto, alberi, lampade, pallet, cavalletti. Gli oggetti istanziati non devono avere modificatori propri. EEVEE 5.2 ne trae vantaggio.
- **Bevel e weighted normal applicati nel build** (`costruisci.py`), non lasciati come modificatori «vivi».
- **Oggetti animati separati e non uniti**, in una collezione «Animati».
- `sc.render.use_simplify=True` in viewport durante il lavoro. Collezioni con *exclude* attivabile (Esterno, Uffici, Persone).
- Disattivare in viewport i modificatori GN pesanti (`mod.show_viewport=False`) e tenerli attivi solo al render.
- Per lavorare usare l'anteprima *Material Preview* o *Solid*. Il viewport in *Rendered* EEVEE serve solo a controllare la luce.

---

## 6. Raccomandazioni per priorità (per questo progetto)

1. **Mettere a posto `importa.py`.**
   - Colori in dominio CORNER.
   - Saldatura (`remove_doubles`) e `join_triangles` per ogni mesh statica.
   - Smooth by Angle.
   - Senza questo passaggio il bevel non funziona.
2. **Provino di misura** (10 fotogrammi, 2 inquadrature: navata e uffici) con le impostazioni EEVEE del § 3.2: si misurano i secondi per fotogramma *dopo* 30 minuti di carico. È la base per decidere tutto il resto.
3. **Bevel + Weighted Normal applicati** a macchine, scaffali, infissi, scrivanie e auto, con larghezza secondo la dimensione: 4 mm per i dettagli, 10–20 mm per carter e muri.
4. **Luce del capannone**:
   - cielo Multiple Scattering e sole morbido;
   - area light sotto i lucernari;
   - LED a 4500 K, quasi tutti senza ombra;
   - Light Probe Volume cotto e 2–3 sfere.
5. **Materiali chiave**, in quest'ordine:
   - pavimento in resina con coat;
   - vernice delle macchine;
   - muri chiari puliti;
   - vetro Thin Wall;
   - zincato delle condotte;
   - asfalto ed esterno.
6. **Colore e compositing.** AgX contro Khronos PBR Neutral, confrontati su un'immagine con i campioni RiFRA. Poi un compositing leggero.
7. **Animazioni**:
   - nastri in GN con Scene Time;
   - robot e muletto con keyframe campionati da `reparti.js`;
   - persone con la strada A (scheletro three.js).
8. **Dettagli procedurali** dove la camera si avvicina: bulloni, griglie, grecata vera ai bordi, cavi.
9. **Render finale** in EEVEE, a sequenze per inquadratura, di notte. Le immagini eroe in Cycles.
10. **Opzionali** da mostrare a Marco: un velo di volumetria sotto i lucernari, motion blur più marcato, profondità di campo nelle inquadrature ravvicinate.

### Osservazioni sullo script attuale (solo lettura, non modificato)

In `blender/realismo.py`:
- `use_gtao` non esiste più in 5.x: lo scarta in silenzio il `try/except`.
- Va verificato che il look `'AgX - Medium High Contrast'` venga accettato (anche qui un `except` nasconderebbe l'errore). Conviene stampare a log le eccezioni invece di ignorarle.
- Lo sfondo del World a 0,12 con il sole a 3,2 è un'impostazione da cielo «finto». Col Sky Multiple Scattering il bilanciamento va rifatto usando l'esposizione.

---

## Fonti

**Blender 5.x: note di rilascio e manuale**
- Blender 5.2 LTS, rilascio: https://www.blender.org/press/blender-5-2-lts-release/ e https://www.blender.org/releases/5-2/
- 5.2 EEVEE: https://developer.blender.org/docs/release_notes/5.2/eevee/
- 5.2 Cycles: https://developer.blender.org/docs/release_notes/5.2/cycles/
- 5.2 Geometry Nodes: https://developer.blender.org/docs/release_notes/5.2/geometry_nodes/
- 5.2 Python API: https://developer.blender.org/docs/release_notes/5.2/python_api/
- 5.1 EEVEE: https://developer.blender.org/docs/release_notes/5.1/eevee/
- 5.1 Cycles: https://developer.blender.org/docs/release_notes/5.1/cycles/
- 5.0 EEVEE: https://developer.blender.org/docs/release_notes/5.0/eevee/
- 5.0 Cycles: https://developer.blender.org/docs/release_notes/5.0/cycles/
- 5.0 Python API: https://developer.blender.org/docs/release_notes/5.0/python_api/
- 5.0 Color management: https://developer.blender.org/docs/release_notes/5.0/color_management/
- Heise sulla 5.2: https://www.heise.de/en/news/Blender-5-2-LTS-New-Simulations-and-Eevee-Improvements-11366897.html
- Manuale, EEVEE Raytracing: https://docs.blender.org/manual/en/latest/render/eevee/render_settings/raytracing.html
- Manuale, Light Probe Volume: https://docs.blender.org/manual/en/latest/render/eevee/light_probes/volume.html
- Manuale, nodo Bevel (solo Cycles): https://docs.blender.org/manual/en/latest/render/shader_nodes/input/bevel.html
- Manuale, Reducing Noise (Cycles): https://docs.blender.org/manual/en/latest/render/cycles/optimizations/reducing_noise.html
- Manuale, Sky Texture: https://docs.blender.org/manual/en/latest/render/shader_nodes/textures/sky.html
- Manuale, Light Linking: https://docs.blender.org/manual/en/latest/render/lights/light_linking.html
- Manuale, GPU Rendering: https://docs.blender.org/manual/en/latest/render/cycles/gpu_rendering.html
- Manuale, Bevel Modifier: https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/bevel.html
- Manuale, Rigify (incluso): https://docs.blender.org/manual/en/latest/addons/rigify/index.html

**API Python (Blender, versione corrente)**
- SceneEEVEE: https://docs.blender.org/api/current/bpy.types.SceneEEVEE.html
- RaytraceEEVEE: https://docs.blender.org/api/current/bpy.types.RaytraceEEVEE.html
- Material: https://docs.blender.org/api/current/bpy.types.Material.html
- ShaderNodeTexSky: https://docs.blender.org/api/current/bpy.types.ShaderNodeTexSky.html
- LightProbeVolume: https://docs.blender.org/api/current/bpy.types.LightProbeVolume.html
- Light: https://docs.blender.org/api/current/bpy.types.Light.html
- AreaLight: https://docs.blender.org/api/current/bpy.types.AreaLight.html
- BevelModifier: https://docs.blender.org/api/current/bpy.types.BevelModifier.html
- Operatori object: https://docs.blender.org/api/current/bpy.ops.object.html
- ActionChannelbagFCurves: https://docs.blender.org/api/current/bpy.types.ActionChannelbagFCurves.html
- Slotted actions: https://developer.blender.org/docs/release_notes/4.4/upgrading/slotted_actions/
- Auto smooth diventato modificatore (4.1): https://blenderartists.org/t/blender-4-1-auto-smooth-is-now-a-modifier-only/1488922
- EEVEE light e shadow linking (4.3): https://developer.blender.org/docs/release_notes/4.3/eevee/
- OIDN su GPU, Apple Silicon (4.1): https://developer.blender.org/docs/release_notes/4.1/cycles/
- Persistent Data: https://developer.blender.org/rB50782df42

**Prestazioni Mac**
- Blender Open Data, Apple M4: https://opendata.blender.org/devices/Apple%20M4/
- M4 10-core contro 8-core (Notebookcheck): https://www.notebookcheck.net/M4-8-Core-GPU-vs-M4-10-Core-GPU_12846_12502.247598.0.html
- MetalRT su M3 e successivi: https://projects.blender.org/blender/blender/pulls/114296
- Problemi di prestazioni di EEVEE Next (discussione): https://projects.blender.org/blender/blender/issues/128253
- MacBook Air e calore: https://beforeby.com/macbook-for/blender e https://hostbor.com/m4-macbook-air-review/

**Artisti e didattica**
- Blender Guru, EEVEE archviz: https://www.blenderguru.com/posts/2019/eevee-archviz
- Blender Guru, Gumroad (140 tips): https://blenderguru.gumroad.com
- Ian Hubert, Lazy Tutorials: https://www.blendernation.com/2020/04/10/lazy-tutorials-cg-realism-with-warbles-in-blender/ e https://www.core77.com/posts/100294/3D-Modeling-Lazy-Tutorials-For-Lazy-People-By-Lazy-People
- Josh Gambrell / Blender Bros: https://joshgambrell.gumroad.com/ e https://theblenderbros.gumroad.com/l/OmOJF
- Arrimus 3D: https://www.udemy.com/course/arrimus3d/
- Simon Thommes, Procedural Shading: https://studio.blender.org/training/procedural-shading/
- Simon Thommes, Geometry Nodes from Scratch: https://studio.blender.org/training/geometry-nodes-from-scratch/
- Panoramica dei corsi archviz (CG Boost, Arch Viz Artist, Ryan King Art): https://www.archivinci.com/blogs/architectural-rendering-courses
- GarageFarm Academy, archviz: https://blenderartists.org/t/archviz-interior-tutorials-for-blender-from-garagefarm-net-academy/1302616
- CG Cookie, EEVEE: https://cgcookie.com/posts/eevee-essential-features-walkthrough-part-one
- 3D Tudor, nastro in GN: https://superhivemarket.com/products/blender-conveyor-belt-geometry-node-by-3d-tudor
- Scena industriale in EEVEE: https://blenderartists.org/t/industrial-factory-scene-blender-eevee-animation/1606207
- Digital twin in Blender: https://www.researchgate.net/publication/389151014_Creating_3D_models_of_production_equipment_and_infrastructure_using_Blender e https://github.com/rafaelkonlechner/cdl-digital-twin

**Materiali e colore**
- Zincato procedurale: https://blenderartists.org/t/procedural-galvanised-metal-shader/669711
- Pavimento in resina: https://blenderartists.org/t/polished-resin-concrete-floor-cycles/1333172
- Khronos PBR Neutral e AgX: https://jayargonaut.com/2024/08/11/achieving-realistic-rendering-with-agx-and-khronos-pbr-neutral-in-blender-4-2/ e https://developer.blender.org/docs/release_notes/4.2/rendering/
- Bevel e harden normals: https://blenderartists.org/t/how-to-get-exact-normals-when-using-bevel-modifier-with-harden-normals-wysiwyg/1231471
