# Metodi three.js per una fabbrica realistica nel browser (29/09/2026)

Ricerca per la versione 3D di «Come nasce una cucina RiFRA». La scena comprende capannone con tetto, esterno, ~15 macchine, persone e nastri animati. Deve girare su desktop, telefono e chiosco da fiera (mini-PC, spesso con GPU integrata) ed essere esportabile in video, un fotogramma alla volta, con gli screenshot di Playwright.
Ogni voce ha una fonte. Le voci segnate **[nostro]** sono valori di partenza che abbiamo ricavato noi dalle fonti citate: vanno tarati sulla scena.
Unità di misura: 1 unità three.js = 1 metro.

---

## 1. Stack consigliato (versioni verificate su npm e jsDelivr il 29/09/2026)

| Pezzo | Versione | Licenza | File da copiare in `vendor/` (tutti con risposta HTTP 200) |
|---|---|---|---|
| three | **0.186.1 (r186)** | MIT | `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js` **e** `…/build/three.core.js` (il primo importa il secondo) |
| three addons | 0.186.1 | MIT | `https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/` → `controls/OrbitControls.js`, `environments/RoomEnvironment.js`, `objects/Sky.js`, `renderers/CSS2DRenderer.js`, `utils/BufferGeometryUtils.js`, `csm/CSM.js`, `postprocessing/*` |
| postprocessing (pmndrs) | **6.39.5** | Zlib | `https://cdn.jsdelivr.net/npm/postprocessing@6.39.5/build/index.js` (dipendenza: three `>=0.168 <0.187`) |
| N8AO (occlusione ambientale) | **2.0.1** | ISC | `https://cdn.jsdelivr.net/npm/n8ao@2.0.1/dist/N8AO.js` (importa `three`, `postprocessing` e `three/examples/jsm/postprocessing/Pass.js`) |
| camera-controls (yomotsu) | **3.1.2** | MIT | `https://cdn.jsdelivr.net/npm/camera-controls@3.1.2/dist/camera-controls.module.js` |

Fonti: registro npm (`registry.npmjs.org/<pkg>/latest`); https://github.com/mrdoob/three.js/releases; https://github.com/pmndrs/postprocessing; https://github.com/N8python/n8ao; https://github.com/yomotsu/camera-controls

**Scelta del renderer: `WebGLRenderer`, non `WebGPURenderer`.**
- Il manuale ufficiale dice che WebGPURenderer è «still in an experimental state». Aggiunge che per le app WebGL 2 pure WebGLRenderer resta la scelta raccomandata ed è ancora mantenuto. https://threejs.org/manual/#en/webgpurenderer
- Con WebGPURenderer non si possono usare EffectComposer, ShaderMaterial e `onBeforeCompile`: tutto il post-processing va riscritto in TSL. https://threejs.org/manual/#en/webgpurenderer
- Sul fallback WebGL2 ci sono bug aperti, per esempio: un InstancedMesh con 508 o più istanze non funziona. https://github.com/mrdoob/three.js/issues/32597
- Via d'uscita futura: `three/webgpu` + `GTAONode`/`SMAANode`/`TRAANode` (esistono in r186, in `examples/jsm/tsl/display/`). Bruno Simon usa WebGPU+TSL nel portfolio 2025. https://www.awwwards.com/brunos-portfolio-case-study.html

**Senza internet.** I moduli ES non partono da `file://`: il manuale chiede un server locale. https://threejs.org/manual/#en/installation
- Soluzione consigliata **[nostro]**: impacchettare tutto (esbuild) in **un solo `<script>` dentro l'HTML finale**, come fa già il build dei font. Così la pagina si apre anche con doppio clic.
- Alternativa: `vendor/` + importmap servita dal `http.server` locale:
  `{"three":"./vendor/three/build/three.module.js","three/addons/":"./vendor/three/examples/jsm/","three/examples/jsm/":"./vendor/three/examples/jsm/","postprocessing":"./vendor/postprocessing/index.js","n8ao":"./vendor/n8ao/N8AO.js","camera-controls":"./vendor/camera-controls/camera-controls.module.js"}`.
  Lo schema dell'importmap è quello del manuale (https://threejs.org/manual/#en/installation). La chiave `three/examples/jsm/` serve a N8AO.
- Licenze: MIT, Zlib e ISC chiedono tutte di conservare l'avviso di copyright. Vanno messi i file LICENSE in `vendor/` e una riga nei crediti. https://github.com/mrdoob/three.js/blob/dev/LICENSE

---

## 2. Tecniche di realismo, con i valori

1. **Gestione del colore.**
   - `THREE.ColorManagement.enabled = true` è già il default. `renderer.outputColorSpace = SRGBColorSpace` è il default.
   - Texture di colore (`map`, `emissiveMap`): `colorSpace = SRGBColorSpace`.
   - Texture di dati (`normalMap`, `roughnessMap`): `NoColorSpace`.
   - Con il post-processing di three serve `OutputPass` alla fine.
   - https://threejs.org/manual/#en/color-management · https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
2. **Tone mapping.**
   - Con pmndrs: `renderer.toneMapping = NoToneMapping` e `ToneMappingEffect` come ultimo effetto. `ToneMappingMode` ha `AGX = 7` e `NEUTRAL = 8`. https://github.com/pmndrs/postprocessing
   - Per i colori fedeli ai materiali (ante, laccati, brand) usare **Neutral**: Khronos lo ha pensato per riprodurre esatti i colori base in PBR. https://www.khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products
   - Con sole forte all'esterno usare **AgX**: basso contrasto, buona base per la correzione colore. https://discourse.threejs.org/t/tone-mapping-overview/75204/12
   - ACES scurisce e satura. https://discourse.threejs.org/t/tone-mapping-overview/75204
   - Esposizione: partire da `1.0`, che è il default dell'esempio ufficiale con Neutral. https://github.com/mrdoob/three.js/blob/r186/examples/webgl_tonemapping.html
3. **Ambiente IBL senza asset esterni.**
   - Interno: `pmrem.fromScene(new RoomEnvironment(), 0.04).texture` su `scene.environment`, come nell'esempio ufficiale GTAO. https://github.com/mrdoob/three.js/blob/r186/examples/webgl_postprocessing_gtao.html
   - Esterno: addon `Sky` passato in PMREM (`pmrem.fromScene(sky)`). https://github.com/mrdoob/three.js/blob/r186/examples/webgl_animation_keyframes.html
   - Firma `fromScene(scene, sigma, near, far)`. Usare **un solo** PMREMGenerator: `dispose()` rende inutilizzabili gli altri. https://threejs.org/docs/pages/PMREMGenerator.html
   - `scene.environmentIntensity` tra 0,6 e 1,0 **[nostro]**.
4. **Luce principale.**
   - Un solo `DirectionalLight` (il sole o i lucernari) che proietta ombre, più l'IBL. Al massimo 3 luci dinamiche. https://www.utsubo.com/blog/threejs-best-practices-100-tips
   - Nelle versioni attuali di three l'intensità di una luce direzionale va sulle unità fisiche: Three.js Journey usa 6. https://threejs-journey.com/lessons/realistic-render
   - Intensità del sole tra 3 e 6, poi tarare con l'esposizione **[nostro]**.
5. **Tipo di ombre (r186).**
   - `PCFSoftShadowMap` è **rimosso** in r186: il codice avvisa e ripiega su `PCFShadowMap`. Il nuovo PCF usa 5 campioni su disco di Vogel con rumore IGN e rispetta `shadow.radius`. Fonte: codice r186 (`src/constants.js`, `WebGLShadowMap.js`, `shadowmap_pars_fragment.glsl.js` su https://cdn.jsdelivr.net/npm/three@0.186.1/src/)
   - Usare `shadowMap.type = PCFShadowMap` con `shadow.radius` tra 2 e 4 **[nostro]**. Con valori alti compaiono bande, a meno di alzare la risoluzione della mappa. https://threejs.org/docs/pages/LightShadow.html
   - VSM ha penombre più morbide, ma con VSM ogni ricevitore proietta anche ombra e non funziona con le PointLight. https://github.com/mrdoob/three.js/blob/r186/examples/webgl_shadowmap_vsm.html
6. **Bias delle ombre.**
   - `bias` va regolato a passi dell'ordine di 0,0001. `normalBias` serve contro l'acne sulle superfici radenti delle scene grandi. https://threejs.org/docs/pages/LightShadow.html
   - Valori di partenza: `bias = -0.0005`, `normalBias = 0.02–0.05`. https://threejsresources.com/guides/shadows
7. **Frustum delle ombre.**
   - Il frustum deve coprire il capannone e poco di più: se è troppo grande le ombre diventano sfocate e compare l'acne. https://threejsresources.com/guides/shadows
   - Misure: mappa 2048 su desktop e chiosco, 1024 su telefono. https://www.utsubo.com/blog/threejs-best-practices-100-tips
   - Se la camera va da vicino al panorama, usare CSM (4 cascate da 1024 nell'esempio ufficiale). Costa più draw call. https://github.com/mrdoob/three.js/blob/r186/examples/webgl_shadowmap_csm.html
8. **Ombre statiche calcolate una volta sola.**
   - `light.shadow.autoUpdate = false`, poi `needsUpdate = true` quando serve. https://threejs.org/docs/pages/LightShadow.html · https://discoverthreejs.com/tips-and-tricks/
   - Le persone e i pezzi in movimento vanno sotto un'ombra finta a disco, oppure la mappa si aggiorna ogni N fotogrammi **[nostro]**.
9. **Occlusione ambientale (N8AO).**
   - Il raggio va in unità mondo, uno o due ordini di grandezza sotto la scala della scena. Per un capannone di ~100 m: `aoRadius` tra 1 e 2, `distanceFalloff = 1`, `intensity` tra 2 (morbida) e 5 (forte).
   - Se la camera cambia molto scala: `screenSpaceRadius = true` con `aoRadius` tra 16 e 64 px e `distanceFalloff = 0.2`.
   - `halfRes = true` rende 2–4 volte più veloce. Qualità «Low»/«Medium» per GPU integrate e telefoni, «High»/«Ultra» per desktop.
   - https://github.com/N8python/n8ao
10. **Antialiasing.**
    - L'MSAA hardware non funziona con l'AO. Usare `SMAAEffect` (preset HIGH/ULTRA) e `antialias: false` sul renderer. https://github.com/N8python/n8ao · https://github.com/pmndrs/postprocessing
11. **Ordine dei passi.**
    - `RenderPass` → `N8AOPostPass` → un solo `EffectPass(SMAA, Bloom leggero, ToneMapping)`. EffectPass fonde gli effetti in un solo shader.
    - Buffer `HalfFloatType` contro le bande di colore.
    - https://github.com/pmndrs/postprocessing
    - Se i colori escono slavati o troppo scuri, impostare a mano `n8ao.configuration.gammaCorrection`. https://github.com/N8python/n8ao
12. **Texture procedurali con CanvasTexture (niente file esterni).**
    - Lato potenza di 2 (512 o 1024), `wrapS/T = RepeatWrapping` e `repeat` in metri. https://threejs.org/docs/pages/CanvasTexture.html · https://discoverthreejs.com/tips-and-tricks/
    - `anisotropy = min(8, renderer.capabilities.getMaxAnisotropy())` per i pavimenti visti di scorcio. https://threejs.org/docs/pages/Texture.html
    - Calcestruzzo: rumore frattale, macchie e giunti ogni 5–6 m, con roughness separata (colore sRGB, roughness `NoColorSpace`).
    - Asfalto: puntinato fitto a basso contrasto, roughness tra 0,9 e 1.
    - Lamiera grecata: onda sinusoidale scritta in una normalMap, oppure geometria ondulata vera. È meglio la geometria se si vede da vicino.
    - Tutte e tre sono **[nostro]**, sulle regole di colore del punto 1.
13. **Materiali.**
    - `MeshStandardMaterial` con metalness 0 o 1 (non a metà) e roughness tra 0,3 e 0,9. `MeshPhysicalMaterial` solo per vetri e laccati **[nostro]**.
    - Pochi materiali condivisi. Bruno Simon usa una «palette texture» unica, letta via UV, per unire le geometrie senza perdere il colore. https://www.awwwards.com/brunos-portfolio-case-study.html
14. **Nastri trasportatori.**
    - Nastro: scorrere `map.offset.x += v·dt`, una sola draw call. https://threejs.org/docs/pages/Texture.html
    - Rulli: un `InstancedMesh` con rotazione via `setMatrixAt`. https://threejs.org/docs/pages/InstancedMesh.html
15. **Persone.**
    - Figure low-poly a parti rigide (busto, testa, gambe): un `InstancedMesh` per parte e camminata procedurale scritta nelle matrici **[nostro]**.
    - Alternativa ufficiale: InstancedMesh con morph target. https://github.com/mrdoob/three.js/blob/r186/examples/webgl_instancing_morph.html
16. **Profondità e aria.**
    - `scene.fog` leggero all'esterno per la prospettiva aerea **[nostro]**.
    - Per evitare lo z-fighting: `near` ≥ 0,1 e `far` ≈ 1000. Oppure `reversedDepthBuffer: true`, che ricade sul normale se manca `EXT_clip_control`. https://threejs.org/docs/pages/WebGLRenderer.html (Il ricadere sul normale è nel codice r186 di `WebGLCapabilities.js`.)
17. **Luce precalcolata (baking), opzionale.** I migliori progetti calcolano in anticipo luce e AO sulla parte statica.
    - Igloo Inc: Houdini/Blender, esportatori su misura, compilazione a scaglioni. https://www.awwwards.com/igloo-inc-case-study.html
    - Codrops: il bake per gli oggetti statici. https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/
    - Senza Blender, per noi equivale a: ombre statiche calcolate una volta (punto 8) e AO in tempo reale solo sopra la soglia di qualità.

---

## 3. Prestazioni: regole e budget

**Budget.** I valori senza fonte propria sono **[nostro]**, ricavati da McCurdy/Utsubo/Codrops.

| Voce | Telefono | Mini-PC chiosco (GPU integrata, 1080p) | Desktop |
|---|---|---|---|
| Draw call per fotogramma | **< 100** (McCurdy) | ≤ 250 | ≤ 500 («da centinaia a poche migliaia») |
| Vertici/triangoli | < 100k vertici (McCurdy); fino a ~300k triangoli | ≤ 1 M triangoli | ≤ 2 M |
| DPR | `min(dpr, 1.5)` (Codrops) | 1 (Codrops: 1 su desktop) | `min(dpr, 2)` (Utsubo) |
| Mappa ombre | 512–1024 (Utsubo), statica | 2048, statica | 2048–4096 |
| AO | spenta oppure N8AO «Performance» + halfRes | N8AO «Low/Medium» + halfRes | «High» |
| Luci dinamiche | 1 + IBL | 1 + IBL | ≤ 3 (Utsubo) |
| Texture | lato ≤ 1024, totale ≤ 64 MB | lato ≤ 2048, ≤ 256 MB | ≤ 2048 fuori dai primi piani (Utsubo) |

Fonti:
- Budget McCurdy «<100 draw calls and <100,000 vertices», citato in https://www.utsubo.com/blog/threejs-best-practices-100-tips
- DPR 1 su desktop e 1,5 su mobile: https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/
- Una texture 2048² costa ~21 MiB di VRAM con le mipmap: https://www.utsubo.com/blog/threejs-best-practices-100-tips

**Regole.**
1. **Un solo materiale per tutto ciò che si ripete.**
   - Colonne, capriate, bancali, rulli e persone su `InstancedMesh`: mille oggetti in una draw call.
   - Oggetti diversi con lo stesso materiale su `BatchedMesh`, che ha frustum culling per oggetto e `sortObjects`.
   - https://threejs.org/docs/pages/BatchedMesh.html · https://www.utsubo.com/blog/threejs-best-practices-100-tips
2. **Capannone statico unito.** `BufferGeometryUtils.mergeGeometries` per materiale: tetto, muri e pavimento diventano poche draw call. https://www.utsubo.com/blog/threejs-best-practices-100-tips
3. **LOD sulle 15 macchine.** `THREE.LOD` con 2–3 livelli; da lontano solo il volume con il colore. https://github.com/mrdoob/three.js/blob/r186/examples/webgl_lod.html · https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/
4. **Misurare sempre** `renderer.info.render.calls` e `.triangles`, con stats-gl o Spector.js.
   - Journey chiede 150–200 fps sul computer di sviluppo per stare tranquilli sugli altri. https://threejs-journey.com/lessons/performance-tips
   - Se `renderer.info.memory` sale senza fermarsi, c'è una perdita di memoria. https://threejs.org/docs/pages/WebGLRenderer.html
5. **Compilare gli shader durante il caricamento**: `await renderer.compileAsync(scene, camera)`, così niente scatti al primo volo verso un reparto. https://threejs.org/docs/pages/Renderer.html
6. **Livelli di qualità automatici.**
   - Sul telefono Bruno Simon spegne sfocature e profondità di campo e abbassa la mappa delle ombre. https://www.awwwards.com/brunos-portfolio-case-study.html
   - DPR adattivo: sotto la soglia di fps lo si abbassa del 10%. https://sbcode.net/tsl/adaptive-dpr/
   - Per classificare la GPU c'è `detect-gpu` (livelli 0–3), ma scarica i benchmark da unpkg. Offline servono `benchmarksURL` in locale, oppure un nostro test di fps all'avvio. https://github.com/pmndrs/detect-gpu
7. **Nascondere invece di togliere** (`visible = false`). Evitare di aggiungere o togliere luci a scena attiva. https://discoverthreejs.com/tips-and-tricks/
8. **Pochi oggetti trasparenti** (vetri, polvere). Dove si può, usare `alphaHash` o alpha cutout. Con N8AO gli oggetti trasparenti vengono disegnati due volte. https://www.utsubo.com/blog/threejs-best-practices-100-tips · https://github.com/N8python/n8ao
9. **Renderer per il post-processing**: `{powerPreference:'high-performance', antialias:false, stencil:false, depth:false}`. https://github.com/pmndrs/postprocessing

---

## 4. Camera e UX

**Dai visualizzatori di digital twin:**
1. **«Home» sempre visibile**, per tornare alla vista iniziale; ViewCube per orientarsi. https://aps.autodesk.com/en/docs/viewer/v7/reference/Extensions/ViewCubeUi · https://help.autodesk.com/view/ADSKVIEWER/ENU/?guid=ADSKVIEWER_Help_AutodeskViewerTools_html
2. **Viste salvate / «Auto Views».** Toccando un oggetto (o una voce dell'elenco) si vola a una vista già decisa. Per noi: una vista per reparto. https://aecmag.com/digital-twin/autodesk-tandem-digital-twins-in-the-cloud/ · https://intandem.autodesk.com/features/
3. **Isolare e rendere fantasma** (ghosting) il resto, oppure tagliare con una sezione. È il modo pulito di mettere a fuoco un reparto senza l'effetto «raggi X». https://aecmag.com/digital-twin/autodesk-tandem-digital-twins-in-the-cloud/
4. **Elenco del modello** accanto alla scena, per cercare e cliccare. https://help.autodesk.com/view/ADSKVIEWER/ENU/?guid=ADSKVIEWER_Help_AutodeskViewerTools_html
5. **Orbita di default, prima persona come opzione** (WASD); doppio clic per mettere a fuoco; annotazioni da mostrare o nascondere. https://sketchfab.com/developers/viewer/initialization (parametri `autospin` e `annotation_cycle`: utili per la modalità «attesa» del chiosco; `fps` e `double_click` sono nell'articolo di supporto «Interface and Options» di support.fab.com) · https://support.fab.com/s/article/Annotations?language=en_US
6. **Comandi di riproduzione** (avvia, pausa, indietro, avanti veloce) per la simulazione; su mobile una dita per ruotare, due per lo zoom. https://www.visualcomponents.com/blog/visual-components-experience-mobile-viewer/

**Con camera-controls:**
7. `setLookAt(…, true)` + `smoothTime` tra 0,5 e 0,8 s per i voli; `fitToBox(macchina, true, {padding…})` per inquadrare ogni reparto in modo automatico, senza riquadro fisso. https://github.com/yomotsu/camera-controls
8. **Vincoli**: `minPolarAngle`/`maxPolarAngle` (mai sotto il pavimento), `min/maxDistance`, `setBoundary(box del lotto)`, `colliderMeshes` per non attraversare i muri, `dollyToCursor`. https://github.com/yomotsu/camera-controls

**Nel chiosco:**
9. Resta valida la decisione A5 (niente trascinamento né pizzico): solo tocchi su bersagli grandi e sull'indice.
10. Etichette con `CSS2DRenderer`.
    - Non vengono coperte dalla geometria: vanno nascoste a mano con un raycast o in base alla distanza.
    - Funzionano solo con lo zoom del browser al 100%.
    - Tenerne ≤ 15–20 a schermo **[nostro]**.
    - https://threejs.org/docs/pages/CSS2DRenderer.html
11. **Mostrare lo stato, non i menu.** I siti premiati mettono i testi e i glitch nel WebGL per non ricalcolare il layout DOM a ogni fotogramma. https://www.awwwards.com/igloo-inc-case-study.html
    - Per noi basta il DOM per le schede, aggiornato solo ai cambi di reparto **[nostro]**.

---

## 5. Trappole

1. **`three.module.js` senza `three.core.js`** → errore 404 sull'import. Copiare tutti e due. (Verificato sul file r186 su jsDelivr.)
2. **`PCFSoftShadowMap`** in r186 dà un avviso e viene sostituito da PCF. I vecchi tutorial, Journey compreso, lo usano ancora. https://threejs-journey.com/lessons/realistic-render
3. **Tone mapping applicato due volte**, o gamma sbagliata: con pmndrs il renderer deve avere `NoToneMapping`. Con l'EffectComposer di three serve `OutputPass` in fondo. https://github.com/pmndrs/postprocessing · https://threejs.org/manual/#en/color-management
4. **Aggiornare three senza aggiornare postprocessing**: la 6.39.5 accetta three `< 0.187`. Tenere le versioni bloccate nel vendor.
5. **CanvasTexture senza `colorSpace = SRGBColorSpace`**: colori slavati. Il default è `NoColorSpace`. https://threejs.org/docs/pages/Texture.html
6. **Frustum delle ombre grande quanto il lotto** con una mappa 1024: ombre a blocchi e acne. Stringere, oppure usare CSM. https://threejsresources.com/guides/shadows
7. **`antialias:true` con AO o composer**: memoria sprecata e l'MSAA non tocca gli effetti. https://github.com/N8python/n8ao
8. **Due PMREMGenerator, con `dispose()` su uno**: rompe l'altro. https://threejs.org/docs/pages/PMREMGenerator.html
9. **Video con Playwright.**
   - La modalità headless di default fa il rendering WebGL in software (SwiftShader), fino a ~24 s per pagina. Lanciare Chromium con `--use-gl=egl` su macOS (in alternativa `--use-angle=gl`) e controllare la stringa della GPU. https://michelkraemer.com/enable-gpu-for-slow-playwright-tests-in-headless-mode/ · https://microlink.io/blog/webgl-without-a-gpu
   - **Tempo deterministico**: `page.clock.install()` + `runFor(1000/30)` controlla `requestAnimationFrame` e `performance.now`. https://playwright.dev/docs/clock
   - Ancora meglio: una funzione `window.renderFrame(n)` che imposta `t = n/30`, fa `render()` una volta e poi aspetta lo screenshot. Stessa idea di CCapture (tempo virtuale a passi fissi). https://github.com/spite/ccapture.js
   - `page.screenshot` cattura anche le etichette DOM. `preserveDrawingBuffer:true` serve solo se si legge il canvas con `toDataURL`. https://threejs.org/docs/pages/WebGLRenderer.html
10. **Primo volo a scatti**: shader non precompilati. Usare `compileAsync` in fase di caricamento. `KHR_parallel_shader_compile` non esiste in Firefox. https://threejs.org/docs/pages/Renderer.html
11. **`detect-gpu` offline** chiama unpkg: la pagina resta appesa o cade al livello sbagliato. https://github.com/pmndrs/detect-gpu
12. **WebGPURenderer come «upgrade gratis»**: `ShaderMaterial`, `onBeforeCompile` ed EffectComposer non funzionano, e il fallback WebGL2 ha bug propri. https://threejs.org/manual/#en/webgpurenderer · https://github.com/mrdoob/three.js/issues/32597
