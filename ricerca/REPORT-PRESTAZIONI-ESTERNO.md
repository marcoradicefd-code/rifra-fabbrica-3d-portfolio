# Prestazioni, esterno e insegna · versione 3D (30/09/2026)

Scritto dall'agente dell'edificio; salvato dal coordinatore.

**Richiesta di Marco:** «prototipo laggante; la scritta RIFRA va dietro, non a sinistra; parcheggio a sinistra più stretto, auto "in verticale"».
**File toccati:** `3d/js/main.js`, `prim.js`, `materiali.js`, `edificio.js` (tranne ST/NAMES), `arredi.js`, una riga di CLAUDE.md.
**Sorgenti di prima:** `archivio/3d-prima-prestazioni-2026-09-30/`.

## 1. Misure

Mac M, Chromium Metal, 1920×1080. Strumento: `build/qc/3d-perf/perf.js`; risultati in `build/qc/3d-perf/*.txt`.

| | prima (predefinita «alta») | dopo (predefinita «media», sale da sola) |
|---|---|---|
| fps, tappe 1/6/9/12 | 40–48 (p95 33,6 ms) | **60** (p95 17,1–17,6 ms) |
| chiamate di disegno, fabbrica intera | 587–637 | **136, massimo 214** |
| chiamate di disegno, con tetto | ~590 | **50–75** |
| chiamate di disegno, tappe | 245–459 | 48–125 («media»), ≤ 204 («alta») |
| CPU rallentata 4× | 37–52 fps | **50–60 fps** |

Con lo schermo a 60 Hz l'intervallo tra fotogrammi oscilla attorno a 16,7 ms: un p95 di 17,x significa nessun fotogramma perso.
A 4K il costo per pixel è simile a prima (misure rumorose). Per le GPU lente c'è «bassa»: 80 % dei pixel, ombre semplici, niente grading.

## 2. Interventi sulle prestazioni

- **Livelli:** si parte da «media» con adattamento nei due sensi e isteresi. DPR massimo 1,5. GTAO solo in «alta», a metà risoluzione e a camera ferma.
- **Atlante:** i materiali a tinta unita sono fusi in un solo materiale (colore, rugosità e metallicità per vertice).
- **Campionamento dell'animazione:** individua i materiali che cambiano (restano separati) e i pezzi fermi dentro i gruppi animati (vengono fusi).
- **Muri di facciata:** fusi in 2 chiamate l'uno.
- **Ombre:** la mappa si ridisegna solo quando si sposta il riquadro del sole, mentre il tetto si muove, e ogni 4 fotogrammi per ciò che si anima.
- **Altro:**
  - con il tetto chiuso l'interno non si disegna;
  - il terreno si disegna per ultimo;
  - le etichette hanno un disegno proprio (il DOM si scrive solo se qualcosa cambia);
  - niente allocazioni nel ciclo.

## 3. Edificio ed esterno

Fonti: rilievo `LAYOUT-MACCHINE.json`, E, E retro, SV.

- **Pianta:** 70,9 × 40,6 m. Blocco uffici a due piani, magazzino a tetti piani (quadrotti crema), 24 volte con la linea rossa, torrini verso il silo. Porte e finestre dalle fonti. Impianti E01–E12. Via F.lli Cervi a z 47; recinzione, cancelli, contesto.
- **Insegna:** scritta RiFRA in rilievo grigia sul fronte nord («dietro»), sopra la vetrata scura. Una più piccola sul fronte ovest sopra l'ingresso (F 7465); si toglie con una riga.
- **Civico 17:** pilastro con pensilina, targa in pietra con la scritta in rilievo, numero 17 da 18 × 15 cm.
- **Parcheggio ovest:** fascia di 6 m, 8 stalli da 5 m, auto in fila parallele al muro, muso a sud (PE, satellite, V 0012b, F 7465). La consegna chiedeva auto perpendicolari: si è seguito il rilievo.
- **Fascia sud:** auto perpendicolari al muro (satellite).
- **Auto:** sagoma arrotondata con vetri, ruote e fanali, in 3 InstancedMesh.

## 4. Realismo

- **Fatti** (numeri di `VIDEO-GIOCHI-TECNICHE.md`):
  - n. 1 · ambiente «fabbrica» con rimbalzo caldo dal suolo;
  - n. 3 · occlusione di contatto sul terreno, calcolata una volta;
  - n. 4 · grading che protegge i colori del marchio;
  - n. 5 · ombre a disco sotto persone, muletto, carrello e auto;
  - n. 6 · filtro delle ombre 3 × 3 stabile;
  - n. 7 · sporco e variazione di tono;
  - n. 9 · video supercampionato 2× (esportazione circa 2 volte più lunga);
  - cielo sfumato, prato fino all'orizzonte, verdi meno saturi.
- **Non fatti:** n. 2 (con le volte piene l'interno diventerebbe scuro e poco leggibile) e n. 10 (per tempo).
- **Da tarare con Marco:** tono generale un po' più scuro e freddo di prima.

## 5. Integrazione con le macchine

- **`arredi.js`:** pulito secondo REPORT-MACCHINE § 8. Restano fusti, struttura del soppalco con la scala, condotte, auto, muletto (corridoio z 10,3) e carrello (corridoio z 23,4).
- **`main.js`:** applicate le correzioni PROFILI e `zRotta`; le tappe 3, 4, 5 e 11 sono state controllate.
- **CPU con le macchine nuove:** con CPU rallentata 4× il tempo JS sale a 7–12 ms; il livello scende a «media» e si resta a 50–60 fps.

## 6. Foto e controlli

- **Foto:** `build/qc/3d-perf/fin/` (m1.jpg, m2.jpg), `fin-kiosk/`, `v6/retro.png`, `v6/ingresso.png`, `video-6s.png`, `offline.png`.
- **Console:** nessun errore.
- **Pagina offline:** `build3d.mjs` → 1,24 MB; `offline3d`: nessuna richiesta esterna, nessun errore.
- **Strumenti di prova:** `?senza=pcf,terra,grade` spegne una funzione alla volta; `window.__rf.guarda` punta la camera.
- **Confronto con la versione di prima:** copiare `archivio/3d-base-per-misure-2026-09-30` in `3d-base/` e lanciare `PAGINA=3d-base node perf.js …`.
