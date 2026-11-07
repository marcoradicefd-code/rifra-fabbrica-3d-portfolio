# Video e motion graphic con Claude Opus 5.5

Guida pratica, con l'applicazione allo spot RiFRA. Ricerca del 1° ottobre 2026 per Marco.

**Fonti.**
1. Il video sulla Scrivania (`videoplayback.mp4`, 20 min 16 s, 640 × 360, file di YouTube datato 29/09/2026). Lo presenta Lukas Margerie (@lukas_margerie su X). Si basa sull'articolo su X di Movez (@0xMovez), *How to build motion design studio with Opus 5.5 (Full-course)*, un corso in 12 passi.
   - L'ho analizzato in due modi: 122 fotogrammi, uno ogni 10 s, letti come provini; più alcuni fotogrammi ingranditi per leggere i prompt mostrati a schermo.
   - Il parlato l'ho trascritto con Whisper large-v3-turbo (`whisper-cli`, solo CPU) per i minuti **0:00–9:46**. Ho fermato la trascrizione perché rallentava il render di Blender in corso. Dal minuto 9:46 in poi le note vengono dai fotogrammi, che mostrano a schermo i prompt e i testi dell'articolo: è lì che sta il contenuto tecnico. La parte mancante, in buona parte lo sponsor, si può trascrivere dopo il render con al massimo 2 thread.
2. Documentazione ufficiale e articoli online, con i link nel § 14.
3. Misure fatte da me sulla musica dello spot, solo con `numpy`, dal Python incluso in Blender (Blender non è stato avviato).

Le citazioni dal video sono riassunte in italiano: i prompt mostrati a schermo sono di altri autori e qui sono riscritti, non copiati.

---

## 0. In breve: le 10 tecniche che contano di più

1. **Il prompt è il 10 %, il resto è l'impianto.** Claude non «genera» un MP4: scrive codice che disegna ogni fotogramma in funzione del tempo. La qualità dipende da cosa gli si mette intorno: motore di render, riferimenti, griglia musicale, controlli.
2. **Contratto di render deterministico.** Ogni fotogramma è una funzione pura di `t`: `window.seek(t)` disegna il fotogramma, e niente transizioni CSS, timer o `Math.random`. Lo stesso fotogramma reso due volte deve avere la stessa impronta.
3. **Brief strutturato e piano prima del codice.** Il brief dice il film in una riga, i riferimenti, il look con i divieti e un «beat sheet». La prima consegna è la lista delle inquadrature sulla griglia dei battiti, da approvare prima di scrivere il codice.
4. **Divieti espliciti contro l'«AI slop».** Si vietano per nome i difetti tipici: titolo centrato su un gradiente, tutto in dissolvenza, etichette negli angoli, bagliori, particelle generiche, rimbalzi. Con Opus 5.5 un generico «evita l'aspetto da AI» non basta.
5. **Riferimenti: si prende la grammatica, mai il contenuto.** Dal video di riferimento si estrae un fotogramma ogni 0,5 s. Da questi si scrive `style_guide.md`, con palette, tipi, durate delle inquadrature, transizioni, movimenti di camera, grana ed entrate e uscite del testo.
6. **Griglia dei battiti misurata.** Si misura la musica (`beats.json`): i cambi di scena cadono sulle battute, gli stati sui battiti, i suoni sui picchi. Un unico `timeline.json` fa da fonte di verità per immagine, titoli e audio.
7. **Movimento con molle e curve, non lineare.** Molle in forma chiusa con al massimo un piccolo overshoot, curve «expo out» per le entrate e anticipazione per le uscite. Qualcosa di nuovo ogni 2–4 s e un aggancio forte nei primi 2 s.
8. **Ciclo di critica visiva prima del render finale.** Un fotogramma per battito in un provino, più una striscia di fotogrammi sulle azioni veloci e una prova a 360 px di larghezza. Voto da 1 a 10 su 7 assi, si correggono i 3 problemi peggiori e si ripete finché tutto è ≥ 8. «Iterare è il metodo»: un corto virale ha richiesto 163 chiamate al modello e quasi 7 ore.
9. **Audio curato come l'immagine.** Mix a −14 LUFS integrati con true peak ≤ −1 dBTP per web e social; normalizzazione in due passaggi. Effetti sobri legati agli eventi: un fruscio sul cambio di forma, un clic sulle pressioni, un colpo sul logo.
10. **Una timeline, tre formati.** 16:9, 1:1 e 9:16 dagli stessi tempi, con un'impaginazione che si adatta e rispetta le zone sicure dei social. Il verticale va composto per il verticale: un ritaglio cieco non basta.

---

## 1. Come «fa» un video Claude Opus 5.5

Opus 5.5 riceve testo e immagini e restituisce testo: non produce un file video. Dal brief (testo più riferimenti) scrive codice, e il codice produce i fotogrammi. Nel video (1:20–2:10) e nell'articolo di Movez lo schema ha **quattro strade**:

| Strada | Cosa fa Claude | Strumenti | Quando usarla |
|---|---|---|---|
| **A · Disegnato dal codice** | Una pagina `index.html` (Canvas, SVG o p5) con `window.seek(t)`; Playwright la «fotografa» fotogramma per fotogramma in Chrome senza finestra; ffmpeg monta l'MP4 | HTML/Canvas/SVG, Playwright, ffmpeg | Motion graphic, tipografia cinetica, loghi, interfacce. È la via che Opus 5.5 sceglie da solo se non gli si indica un framework: preferisce zero dipendenze |
| **B · Framework** | Composizioni in React (Remotion) o in HTML con attributi di tempo (HyperFrames) | Remotion, HyperFrames, Motion Canvas o Revideo, Manim | Progetti lunghi o in serie, modelli riusabili, anteprima con timeline, render in parallelo |
| **C · Pipeline mista** | Immagini e clip da modelli generativi (Seedance 2.0, Veo 3.1, Kling 3.0), poi Claude compone sopra titoli, grafica e tagli | API dei modelli, ffmpeg, HTML in sovrimpressione | Riprese «fotografiche» impossibili da disegnare. Costi, licenze e coerenza tra le clip vanno controllati |
| **D · Montaggio di riprese** | Claude taglia clip esistenti e aggiunge sottotitoli, B-roll e riquadri | ffmpeg, Whisper, HTML | Video parlati, recap, social da materiale girato |

Lo spot RiFRA è un caso ibrido: le riprese 3D vengono da Blender (con Python e la riga di comando, una strada «A» in 3D) e sopra c'è una sovrimpressione HTML (strada A). È già la struttura giusta.

### Gli strumenti in breve

| Strumento | In una riga | Punti di forza | Attenzione |
|---|---|---|---|
| **HTML + Playwright + ffmpeg** | Pagina che si disegna in `seek(t)`, cattura PNG o pipe, codifica | Nessuna dipendenza; Claude lo padroneggia; trasparenza facile (`omitBackground`) | Determinismo tutto a carico nostro; render seriale e lento |
| **Remotion** | Video come componenti React; `useCurrentFrame()`, `interpolate()`, `spring()` | Skill ufficiali per agenti (`npx skills add remotion-dev/skills`), render parallelo, Studio | Le animazioni devono dipendere solo dal fotogramma, altrimenti sfarfallano (i fotogrammi si rendono in schede parallele). **Licenza**: gratis per individui e piccole aziende, sopra serve la licenza aziendale (da verificare sul sito) |
| **HyperFrames** (HeyGen, Apache 2.0, aprile 2026) | Video come HTML con `data-start`, `data-duration`, `data-track-index`; GSAP in pausa registrato in `window.__timelines` e mandato al tempo giusto | Pensato per agenti: CLI `init`, `preview`, `lint`, `render`; una ventina di skill; «stesso input, stessi fotogrammi» | Giovane: verificare le versioni |
| **Motion Canvas / Revideo** | Animazioni con generatori TypeScript; Revideo (fork) aggiunge il render senza interfaccia e l'API | Ottimi per spiegazioni e diagrammi animati | Revideo nel 2026 segue un prodotto commerciale (Midrender) |
| **Manim** (Community) | Animazioni matematiche in Python | Formule, grafici, geometria | Estetica «didattica», da personalizzare |
| **GSAP / Lottie in Chrome senza finestra** | Timeline GSAP in pausa + `tl.seek(t)`; Lottie con `goToAndStop(frame, true)` | Curve e strumenti maturi; Lottie per animazioni già pronte | Mai lasciarli «suonare» in tempo reale durante la cattura |
| **Blender via Python/CLI** | Scene 3D, camere, render EEVEE/Cycles da riga di comando | Luce e materiali veri, profondità di campo, sfocatura di movimento | Render lento; un solo processo alla volta su 16 GB |
| **Generatori video** (Seedance 2.0, Veo 3.1, Kling 3.0) | Testo/immagine → clip di pochi secondi; Seedance accetta fino a 9 immagini, 3 video e 3 audio di riferimento | Riprese realistiche, primo e ultimo fotogramma vincolati | Non deterministici; marchi e testi spesso deformati; licenze per uso commerciale da leggere |

---

## 2. Il contratto di render (determinismo)

Il blocco «Motion studio rules» dell'articolo di Movez, mostrato nel video a 4:10–4:30, è la base da mettere nel `CLAUDE.md` di ogni progetto video. Riscritto:

- **Ogni film è una funzione pura del tempo.** `window.seek(t)` disegna il fotogramma `t`.
- **In render niente transizioni o animazioni CSS, niente `setTimeout` e niente `requestAnimationFrame`.** Nessuno stato passa da un fotogramma all'altro.
- **Il rumore è solo con seme** (per esempio `mulberry32`), mai `Math.random()`.
- **Render con un comando solo** (`node render.mjs`), in H.264 yuv420p a CRF 16.
- **Controllo del determinismo:** si rende due volte lo stesso tratto e l'impronta (md5) deve coincidere.
- **Niente `will-change`** sugli elementi che la «camera» ingrandisce, perché il testo diventa sfocato.
- **Per i video in loop**, l'ultimo fotogramma è uguale al primo, posizione e velocità del cursore comprese.

```html
<!-- scheletro minimo: tutto dipende da t, nulla dal tempo reale -->
<script>
const FPS = 30, DUR = 50;
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
window.seek = t => {            // disegna il fotogramma al tempo t (secondi)
  const rnd = mulberry32(42);   // stesso seme a ogni chiamata → stessa grana
  /* … posizioni, opacità, testi calcolati da t … */
  return true;
};
</script>
```

```js
// render.mjs: cattura con Playwright (Chromium senza finestra) e PNG trasparenti
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + __dirname + '/index.html'); await p.evaluate(() => document.fonts.ready);
for (let f = 0; f < FPS * DUR; f++) {
  await p.evaluate(t => window.seek(t), f / FPS);
  await p.screenshot({ path: `png/t_${String(f + 1).padStart(4, '0')}.png`, omitBackground: true });
}
```

**Sfocatura di movimento nel codice:** si rendono 4 sottofotogrammi per fotogramma e se ne fa la media. Nel video, alla revisione (19:00), 4 sottofotogrammi lasciavano «copie fantasma» sui movimenti più veloci. La correzione è stata renderli adattivi, fino a 24 dove la velocità è alta. In Blender la sfocatura di movimento è già nel motore.

---

## 3. Il brief: come chiedere il video a Claude

### 3.1 Perché un prompt di una riga a volte funziona

Nel video (4:40–5:10) c'è il caso di Stephan Livera: un prompt di una riga, a effort Max, chiede un video di 15 s che mostri quanto Claude è bravo come motion designer, come una showreel per il curriculum. L'analisi di Movez spiega perché funziona:
- «showreel» porta con sé un genere con regole note: tagli veloci, una tecnica nuova a ogni inquadratura, il meglio all'inizio;
- il soggetto è il modello stesso, quindi non ci sono contenuti da sbagliare;
- 15 s bastano per 6–8 inquadrature e si fanno in un solo passaggio;
- «go all out» moltiplica lo sforzo, sopra l'effort `xhigh` o `max`.

**Lezione:** nominare un genere con regole chiare («spot industriale», «film di lancio», «showreel») vale più di molti aggettivi.

Nel video, il risultato di quel prompt ha movimenti e transizioni ricchi ma è tutto **nero e arancione**: senza un marchio, Opus 5.5 ripiega sui colori di Claude (5:20). Il passo successivo è sempre dare il marchio vero: logo, colori, font, schermate. Per RiFRA la regola «niente arancione» va quindi scritta esplicitamente nel brief.

### 3.2 Il modello di brief «da regista» (17:40–18:00 nel video)

Il brief completo dell'articolo è organizzato in sezioni fisse. La mia versione in italiano, da adattare:

```text
Sei regista, animatore, sound designer e tecnico del render di un film di [N] secondi fatto in codice.
È una produzione in più sessioni: non correre al render finale.

## Il film in una riga
[Cosa deve provare chi guarda alla fine.]

## Riferimenti e materiali
- ./refs/: [video, fotogrammi o immagini]. Prendi la grammatica, mai il contenuto, i loghi o i personaggi.
- ./audio/brano.mp3: usalo così com'è. Misura prima i battiti (beats.json).
- Skill disponibili: [...]. Chiavi nel .env: [...]. Budget: [...]. Spendi con giudizio.

## Look (3–5 righe)
Palette (esadecimali), caratteri, texture o grana, linguaggio di camera. Look vietati: [elenco per nome].

## Beat sheet
0:00–0:02 aggancio: [l'immagine più forte]
0:02–0:10 atto 1 …   (una novità visiva ogni 3–5 s)
FINE: [chiusura sul logo; se è un loop, l'ultimo fotogramma prepara il primo]

## Lavoro a cancelli
1. Scrivi docs/style_guide.md e docs/shotlist.md (per ogni inquadratura: fotogrammi, camera, testo, suono).
   Mostrami la lista e aspetta il mio OK.
2. Un fermo immagine per inquadratura → provino → critica.
3. Animatic a 960×540 con audio provvisorio: sistema il ritmo prima di rifinire.
4. Animazione completa, poi passaggio di rifinitura, passaggio audio, render finale.
5. Se lavorano più sotto-agenti, scrivi prima docs/ANIMATION_GUIDE.md, così tutti scrivono nello stesso stile.

## Ciclo di critica (ogni inquadratura, almeno 3 giri)
3–5 fermi immagine, voto 1–10 su: aggancio, leggibilità a 360 px, movimento, composizione, profondità,
sincronia col suono, rifinitura. Scrivi i voti e i 3 problemi più grossi in docs/review_log.md. Ripeti finché tutti sono ≥ 8.

## Consegne
out/final.mp4 · out/poster.png · out/contact.png · sorgente pulito con README · cosa miglioreresti ancora.
```

### 3.3 Il brief a tag per le animazioni d'interfaccia (12:40–13:20)

Per i film «di prodotto» Movez usa tag XML:
- `<inputs>`: prodotto, risorse vere prese dal sito con Playwright, musica, formato;
- `<direction>`: per esempio un contenitore unico che non taglia mai, ma cambia dimensioni, raggio e colore mentre il contenuto si scambia dietro una breve sfocatura, con un cursore che guida ogni cambio;
- `<structure>`: 120 BPM, 8 battute, «qualcosa succede su ogni battito»;
- `<build>`: le regole tecniche;
- `<gotchas>`: gli errori da evitare;
- `<start>`: «prima di scrivere codice mostrami la lista degli stati sulla griglia dei battiti».

I tag separano bene le richieste e Claude li rispetta (lo conferma la guida ufficiale di Anthropic sui prompt).

### 3.4 Regole utili da mettere in ogni brief

- **Contesto e motivo, non solo ordini.** Le linee guida ufficiali di Anthropic consigliano di spiegare il perché: Claude generalizza meglio. Esempio: «il testo deve restare 1,5 s perché lo spot si vede anche in fiera, da lontano».
- **Divieti per nome.** Secondo la guida ufficiale su Opus 5.5, senza indicazioni il modello ricade in alcuni stili predefiniti, e «evita l'aspetto generico» sposta solo il difetto. Funziona invece elencare i pattern vietati, guardare il primo risultato e allungare l'elenco. Tra gli stili predefiniti la guida cita i fondi crema, le parole in corsivo dentro i titoli, le etichette numerate «01/02/03», le etichette in monospace e i pulsanti a pillola.
- **Risorse vere, mai ridisegnate.** «Non ridisegnare l'interfaccia, ritaglia e anima quella vera» (6:40 e 7:10 nel video). Per noi vuol dire usare il logo vettoriale, i font del sito e le macchine vere del rilievo.
- **Effort.** Nel video si usa Opus 5.5 su effort *High* nell'app desktop. Secondo la guida, `medium` è il predefinito e `xhigh` o `max` vanno riservati ai casi in cui si misura un miglioramento: per un film di 50 s, `high` o `xhigh` nella fase di regia e critica.
- **Lavoro lungo senza sorveglianza.** Conviene tenere una lista di passi in un file (`docs/shotlist.md`, `review_log.md`) che il modello aggiorna. Un turno che finisce con un riassunto va letto come un rapporto, non come «finito».
- **Più sessioni.** I documenti `style_guide.md`, `shotlist.md` e `timeline.json` fanno da memoria tra le sessioni e tra i sotto-agenti.

---

## 4. Riferimenti visivi: la grammatica di un altro film

Il metodo mostrato a 11:20–11:50 si svolge così:
1. si sceglie un film di riferimento: su *whatships.com* ce ne sono molti;
2. si estrae un fotogramma ogni 0,5 s:
   ```bash
   ffmpeg -i refs/riferimento.mp4 -vf fps=2 refs/frames/f_%03d.png
   ```
3. Claude scrive `docs/style_guide.md`: palette in esadecimale, caratteri con peso e spaziatura, durata delle inquadrature, tipi di transizione, movimenti di camera, texture e grana, come entra ed esce il testo;
4. Claude scrive `docs/shotlist.md` per il nostro film in quello stile, con i materiali veri e **senza copiare** contenuti, loghi o personaggi del riferimento;
5. ci si ferma per l'OK prima di scrivere codice.

Nel video Claude studia anche i fotogrammi più fitti attorno alle transizioni, per fissare con precisione i tempi (11:40).

---

## 5. Tecniche di motion graphic (con codice breve)

### 5.1 Principi

- **Gerarchia.** Una sola cosa principale per volta. Un carattere da titolo e uno da testo, un solo accento (nel brief di Movez: «un font display, uno d'interfaccia, un colore d'accento»).
- **Ritmo.** Qualcosa di nuovo ogni 2–4 s (regola di Movez). Una novità visiva forte ogni 3–5 s (beat sheet). L'aggancio nei primi 2 s.
- **Easing.** Le entrate decelerano («expo out» o «cubic out»: arrivano veloci e si posano), le uscite accelerano («in»). I movimenti di camera usano «in-out». Il lineare va solo per scorrimenti continui. Material Design 3, come riferimento, usa per gli elementi enfatizzati una curva in uscita molto decelerata.
- **Molle.** Più naturali delle curve fisse. Il brief di Movez chiede molle «con al massimo un piccolo overshoot» e vieta il «bouncy easing».
- **Anticipazione e follow-through.** Due dei 12 principi Disney: un piccolo contromovimento prima di uno scatto, e le parti secondarie (la riga, il sottotitolo) che arrivano con 60–120 ms di ritardo.
- **Testo dentro forme che cambiano.** Il testo entra *dopo* che la forma ha iniziato a cambiare ed esce *prima* del cambio successivo (12:40). Gli indicatori hanno bordo d'attacco e di coda su molle diverse, così «si allungano».
- **Leggibilità.** Ogni testo va provato a 360 px di larghezza, come su un telefono. Regola pratica: tenerlo fermo almeno 1 s più 0,3 s per parola.

### 5.2 Curve e molla in forma chiusa

```js
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog  = (t, t0, dur) => clamp((t - t0) / dur);          // 0→1 nell'intervallo
const outExpo   = u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u);  // entrate
const inOutCubic = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;   // camera, spostamenti
// molla smorzata 0→1 in forma chiusa: con zeta = 0,75 l'overshoot è circa il 3 % (≈ e^(−πζ/√(1−ζ²)))
function molla(t, f = 2.2, zeta = .75) {
  if (t <= 0) return 0; const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + zeta * w / wd * Math.sin(wd * t));
}
// più bersagli in sequenza = somma di una molla per ogni cambio (regola di Movez)
const valore = (t, cambi) => cambi.reduce((v, c) => v + (c.a - c.da) * molla(t - c.t), cambi[0].da);
```

### 5.3 Titolo cinetico con maschera, riga per riga

```css
.riga-testo { overflow: hidden; display: block; }            /* la maschera */
.riga-testo > span { display: inline-block; will-change: auto; }
```
```js
// ogni riga sale da sotto la maschera; ritardo di 80 ms tra le righe; esce verso l'alto prima del taglio
righe.forEach((r, i) => {
  const e = outExpo(prog(t, t0 + i * .08, .7)), u = inOutCubic(prog(t, t1 - .45 + i * .04, .4));
  r.style.transform = `translateY(${(1 - e) * 105 - u * 105}%)`;
});
```

### 5.4 Contatore

```js
// numeri a larghezza fissa (font-variant-numeric: tabular-nums, oppure un contenitore di larghezza fissa)
const n = Math.round(4 * outExpo(prog(t, t0, .9)));
el.textContent = n;   // 0 → 4, si posa morbido; se possibile ogni scatto cade su un battito
```

### 5.5 Linea che si disegna (e logo)

```html
<path d="…" pathLength="1" style="fill:none; stroke:#fff; stroke-width:1.5; stroke-dasharray:1; stroke-dashoffset:var(--o)"/>
```
```js
path.style.setProperty('--o', 1 - inOutCubic(prog(t, t0, 1.2)));   // il tratto avanza
```
Per un logo **pieno** come quello di RiFRA:
1. si disegna il contorno: `stroke` sui tracciati con `fill:none`;
2. il riempimento entra con una maschera che scorre o con l'opacità, sul battito;
3. poi la scritta secondaria si allarga nella spaziatura.

### 5.6 Callout che seguono un oggetto 3D

Si proietta un punto 3D sullo schermo per ogni fotogramma e si salva in JSON. L'HTML disegna il punto, una linea sottile e l'etichetta. Il codice per Blender è nel § 10.4.

### 5.7 Da evitare (elenco per il brief)

- Titolo centrato su un gradiente.
- Tutto in dissolvenza.
- Etichette negli angoli e cornici.
- Bagliori sull'interfaccia.
- Esplosioni di particelle.
- Rimbalzi.
- Tempi morti, cioè un battito senza niente che succede.
- Cose che **scivolano** a velocità costante invece di posarsi.
- Testo ingrandito e sfocato.
- Cambi di testo secchi senza transizione.

---

## 6. Sincronizzare con la musica

### 6.1 Le tre corsie (14:40–15:30 nel video)

Una timeline, tre corsie:
- **Musica**: le **battute** (il primo battito di ogni gruppo di 4) portano i cambi di scena e i momenti grandi (logo, invito all'azione);
- **Effetti**: i **battiti** portano i suoni dell'interfaccia (clic, pop, fruscio, colpo);
- **Immagine**: i **picchi** (onset) misurati collocano i colpi con esattezza.

Il brief del video, in quattro passi:
1. sintetizzare (o usare) il brano;
2. `beats.py` (numpy e librosa) misura BPM, battiti, battute e picchi e scrive `beats.json`;
3. `sfx.mjs` sintetizza i suoni da un `cues.json`;
4. Claude riadatta i tempi dell'animazione a `beats.json`, mixa e unisce audio e video.

Nel video Claude crea da solo un `timeline.json` come «unica fonte di verità» per battiti ed eventi sonori. Il risultato riporta il logo sulla battuta a 12,0 s, il «Download» sulla battuta a 14,0 s, 26 effetti sui picchi misurati e −14,1 LUFS.

### 6.2 Misurare i battiti

```python
import librosa, json      # libreria da installare, se serve: qui non è presente e non l'ho scaricata
y, sr = librosa.load('musica.mp3', sr=None, offset=135.5, duration=50)
tempo, battiti = librosa.beat.beat_track(y=y, sr=sr, units='time')
picchi = librosa.onset.onset_detect(y=y, sr=sr, units='time')
json.dump({'bpm': float(tempo), 'battiti': battiti.tolist(), 'battute': battiti[::4].tolist(),
           'picchi': picchi.tolist()}, open('beats.json', 'w'), indent=1)
```
Senza librosa basta `numpy`. Il metodo che ho usato per RiFRA:
1. spettro a finestre;
2. flusso spettrale (quanto cresce l'energia tra una finestra e la successiva);
3. autocorrelazione per il BPM;
4. ricerca della fase della griglia;
5. livello RMS ogni 25 ms per trovare le ripartenze.

Il BPM automatico può uscire doppio o dimezzato: va **sempre confermato a orecchio**, battendo il tempo.

### 6.3 Agganciare i tagli

```js
const aggancia = (t, griglia) => griglia.reduce((a, b) => Math.abs(b - t) < Math.abs(a - t) ? b : a);
const fotogramma = t => Math.round(t * FPS);   // a 30 fps l'errore massimo è 17 ms, impercettibile
// il taglio va SUL battito o 1 fotogramma prima; il titolo entra 1 battito dopo il taglio, non sul taglio
```

- A 120 BPM un battito dura 0,5 s e 8 battute durano 16 s. A 85 BPM il battito dura 0,706 s e la battuta 2,82 s.
- Le inquadrature di lunghezza «intera» (4, 6 o 8 battiti) danno un ritmo regolare. Se ne rompe una ogni tanto, per sorpresa.
- Se le immagini sono già rese e non si possono ritoccare, si **sposta l'attacco della musica** (`-ss`) finché i punti forti del brano cadono sui tagli. Non costa nessun render.

---

## 7. Audio

| Uso | Volume integrato | Picco vero |
|---|---|---|
| YouTube, web, la maggior parte delle piattaforme | **−14 LUFS** | ≤ −1 dBTP |
| Instagram e TikTok | da −14 a −12 LUFS (le piattaforme riducono ma non alzano) | ≤ −1 dBTP |
| TV (EBU R128) | −23 LUFS | ≤ −1 dBTP |
| Fiera, schermo con casse proprie | −16/−14 LUFS, poi si regola il volume in loco | ≤ −1,5 dBTP |

Normalizzazione in due passaggi con ffmpeg: il primo misura, il secondo applica i valori misurati in modo lineare (`linear=true`), senza «pompare».

```bash
ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null -      # legge measured_I, _TP, _LRA, _thresh, offset
ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1:LRA=11:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:offset=…:linear=true -ar 48000 mix-14.wav
ffmpeg -i out/final.mp4 -af ebur128=peak=true -f null -                                # verifica finale
```

**Sound design sobrio:**
- un fruscio breve e scuro sui cambi di forma o sui movimenti di camera veloci;
- un clic sottile sui tratti che si disegnano;
- un colpo basso sul logo;
- gli effetti 12–18 dB sotto la musica, ed effetti di sintesi o con licenza chiara.

Nel video gli effetti sono sintetizzati in codice (Node o Python), così non ci sono licenze da gestire. La voce fuori campo si può generare con un servizio TTS collegato a Claude: nel video si usa il server MCP di Fish Audio, che è lo sponsor della puntata (7:40–10:20). Per un cliente servono licenza e consenso.

---

## 8. Ciclo di critica visiva

Opus 5.5 legge le immagini, quindi può guardare quello che ha reso. Secondo l'articolo di Movez (18:50 nel video) è l'abitudine che separa i video diventati virali da quelli «così così». Lo schema (18:30): fermi immagine, 1 per battito → provino (ffmpeg `tile`) → voto da 1 a 10 su 7 assi → correzione dei 3 peggiori (`review_log.md`) → si ripete finché ogni voto è ≥ 8 → consegna.

```bash
# provino: un fotogramma per battito (qui 85 BPM → 1 ogni 0,706 s), 6 colonne
ffmpeg -i out/final.mp4 -vf "fps=85/60,scale=480:-1,tile=6x10:padding=4" -frames:v 1 out/contact.png
# striscia: 12 fotogrammi consecutivi attorno a un'azione veloce (scatti, fotogrammi vuoti)
ffmpeg -ss 16.3 -i out/final.mp4 -vf "scale=320:-1,tile=12x1" -frames:v 1 out/strip.png
# prova telefono: come si legge a 360 px di larghezza
ffmpeg -i out/final.mp4 -vf "fps=1,scale=360:-1,tile=5x10" -frames:v 1 out/phone.png
# loop: due giri di fila per vedere la cucitura
ffmpeg -stream_loop 1 -i out/final.mp4 -c copy out/loop_check.mp4
# determinismo: lo stesso tratto reso due volte deve avere la stessa impronta
md5 out/prova_a.mp4 out/prova_b.mp4
```
Nota: l'ffmpeg di questo Mac non ha il filtro `drawtext`. Per numerare i provini si usa l'HTML, oppure si annotano i tempi nel nome del file.

**Il prompt di critica, riscritto:**

```text
Apri out/contact.png, out/strip.png e out/phone.png e guardali davvero. Fai il motion director severo, non l'autore orgoglioso.
Voto 1–10: aggancio nei primi 2 s · leggibilità a misura di telefono · qualità del movimento (nessun fotogramma morto)
· varietà (una novità ogni 2–4 s) · composizione · coerenza col marchio · sincronia col suono.
Elenca i 3 problemi più grossi con il tempo esatto. Cerca in particolare: cambi di testo secchi, cose che scivolano invece di posarsi,
etichette negli angoli e cornici, testo ingrandito sfocato, un battito in cui non succede niente, scatti.
Correggili, rendi di nuovo solo i secondi interessati e mostrami il nuovo provino.
```

**Esempi dal video** (19:00, tabella dei giri di revisione):
- giro 1: fotogrammi vuoti in una transizione e sfarfallio nei movimenti veloci; le schermate intere erano illeggibili sul telefono, corrette con prospettiva, parallasse e tagli ravvicinati;
- giro 2: i sottofotogrammi lasciavano copie fantasma, corretti con la sfocatura adattiva;
- giro 3: un link restava leggibile solo per 0,05 s, e lo è diventato più a lungo.

---

## 9. Formati ed esportazione

- **Una timeline, tre formati** (6:40 e 7:00 nel video): si parte dal 9:16 (1080 × 1920) e si ricavano 1:1 e 16:9 dagli stessi tempi.
  - In HTML basta un'impaginazione che legge le proporzioni (variabili CSS).
  - In 3D il verticale va **ricomposto** (camera, focale, bersaglio), non ritagliato alla cieca.
- **Zone sicure 9:16** (Instagram Reels, 2026):
  - in alto restano liberi 150–250 px (nome dell'account);
  - in basso circa 250–340 px (didascalia, pulsanti);
  - il contenuto chiave va nel centro, circa 1010 × 1440;
  - la copertina si ritaglia anche in 1:1 e 4:5, quindi il soggetto va tenuto al centro.
- **Codifica di consegna:**
  ```bash
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 16 -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 256k -ar 48000 -movflags +faststart
  ```
  - CRF 16–18 per l'archivio, 20–22 per le copie leggere. Nel video la grana a CRF 16 portava 15 s a 285 MB.
  - 60 fps per le interfacce veloci; 30 fps va bene per riprese 3D lente.
- **Intermedi con trasparenza:** PNG in sequenza (come facciamo) oppure ProRes 4444. Il passaggio in yuv420p si fa solo alla fine.
- **Consegne complete:**
  - `final.mp4`;
  - `poster.png`, il fotogramma copertina;
  - `contact.png`;
  - le versioni nei vari formati;
  - le impronte (`CONSEGNE.sha256`);
  - le licenze della musica.

---

## 10. Errori da evitare

1. Chiedere «un video bellissimo» senza genere, riferimenti, durata, formato e divieti.
2. Lasciare a Claude il tempo reale (CSS animation, timer). Il risultato sfarfalla o non si ripete uguale.
3. Ridisegnare a mano loghi, interfacce o macchine invece di usare quelli veri.
4. Saltare il piano: prima la lista delle inquadrature sulla griglia, poi il codice.
5. Rendere tutto in alta qualità a ogni prova. Si usano animatic a 960 × 540 e fermi immagine; il render pieno va solo alla fine.
6. Tagli «a occhio» lontani dai battiti, o il punto forte della musica in ritardo sul taglio.
7. Titoli che entrano esattamente sul taglio: l'occhio è ancora occupato. Meglio 0,3–0,5 s dopo, oppure un battito.
8. Troppo testo, o testo troppo piccolo per il telefono. Testo fermo per meno di 1 s.
9. Tutto in dissolvenza incrociata e tutto con la stessa curva (per esempio solo smoothstep).
10. Musica alta e schiacciata. Picchi sopra −1 dBTP. Volumi diversi tra le versioni.
11. Dimenticare le zone sicure dei social.
12. Sovrascrivere il video consegnato senza archiviarlo (regola del progetto).
13. Due render pesanti insieme sul Mac da 16 GB.

---

## 11. Checklist

### Prima di scrivere codice
- [ ] Film in una riga, durata, formati, uso (sito, fiera, social).
- [ ] Riferimenti e `style_guide.md` (palette, caratteri, durate, transizioni, camera, grana, entrate e uscite del testo).
- [ ] Brano scelto e licenza verificata; `beats.json` misurato e BPM confermato a orecchio.
- [ ] `shotlist.md` sulla griglia: ogni taglio con battito e fotogramma; ogni titolo con entrata e uscita.
- [ ] Divieti scritti per nome nel brief.

### Prima del render finale
- [ ] Provino a 1 fotogramma per battito: niente battiti morti, una novità ogni 2–4 s.
- [ ] Aggancio nei primi 2 s.
- [ ] Prova a 360 px: ogni testo leggibile e fermo almeno 1 s più 0,3 s per parola.
- [ ] Striscia attorno a ogni azione veloce e a ogni taglio: niente fotogrammi vuoti, scatti o copie fantasma.
- [ ] Voti ≥ 8 su tutti i 7 assi in `review_log.md`.
- [ ] Determinismo: lo stesso tratto reso due volte dà la stessa impronta.

### Dopo il render
- [ ] `ffprobe`: profilo, livello, yuv420p, bt709, durata, fps.
- [ ] `ebur128`: −14 LUFS (web e social) o il valore scelto, picco ≤ −1 dBTP.
- [ ] `blackdetect` e `freezedetect` per fotogrammi neri o congelati non voluti.
- [ ] Ultimo fotogramma (logo) pulito; poster estratto.
- [ ] File precedente archiviato; `CONSEGNE.sha256` aggiornato.

---

## 12. Come applicarlo allo spot RiFRA

### 12.1 Lo stato attuale (letto da `spot.py`, `titoli.html` e `monta_spot.sh`)

- **Durata e camere:** 50 s a 30 fps, **14 inquadrature** rese in Blender EEVEE con camere in seno (accelerazione e frenata), profondità di campo e sfocatura di movimento. Tagli a 5,0 · 7,0 · 9,5 · 13,0 · 16,5 · 20,5 · 24,5 · 28,0 · 31,5 · 34,5 · 37,5 · 41,5 · 44,5 s.
- **Titoli:** sovrimpressione HTML trasparente (`window.vai(t)`, cioè già il contratto `seek(t)`), resa da Playwright in PNG e sovrapposta da ffmpeg. Instrument Serif per i titoli, Newsreader per i sottotitoli, velo radiale, una riga sottile.
  - Ogni titolo entra 0,4 s dopo il taglio, sale di 14 px in 0,5 s, resta circa 3 s ed esce in 0,4 s. La curva è sempre la stessa (smoothstep) e il movimento è in pratica una dissolvenza.
  - Chiusura con logo, titolo e sito, in dissolvenza e con una leggera riduzione di scala.
- **Musica:** «Loyalty (No Drums)», 50 s da 2:15,5, con dissolvenza in entrata di 0,6 s, in uscita da 46,5 s e `loudnorm` a −16 LUFS e −1,5 dBTP in un solo passaggio.

**Cosa ho misurato sulla musica** (numpy, senza ascolto):
- la parte iniziale è quieta, intorno a −16/−17 dBFS RMS;
- la **ripartenza piena arriva a 17,00–17,05 s** del montaggio: il livello sale da −17 a −7 dBFS in 50 ms;
- il taglio della foratura, che secondo il commento di `monta_spot.sh` dovrebbe coincidere con la ripartenza, è a **16,5 s**: la musica arriva quindi **circa mezzo secondo dopo il taglio**;
- il tempo del brano non è univoco: circa 170 pulsazioni al minuto, cioè probabilmente **85 BPM** in metà tempo (battito 0,706 s, battuta 2,82 s). Va confermato battendo il tempo all'ascolto.

**Cosa manca rispetto alle buone pratiche:**
- una griglia dei battiti;
- un movimento dei titoli che non sia solo dissolvenza;
- un aggancio forte nei primi 2 s (oggi: dissolvenza dal nero di 0,9 s e volo aereo di 5 s);
- elementi grafici che leghino le immagini ai fatti (macchine, numeri, passaggi);
- un logo che «arrivi»;
- il formato verticale;
- un ciclo di critica con i voti scritti.

### 12.2 Proposte, in ordine di priorità

I vincoli valgono per tutte:
- tutto disegnato dal codice;
- Instrument Serif e Newsreader, nero, bianco e grigi (`#A8A6A1`, `#DFE0E1`, `#38383B`), niente arancione;
- titoli come sovrimpressione HTML trasparente;
- un solo Blender alla volta;
- ogni fatto mostrato con una fonte;
- decide Marco.

**P1 · Rimettere la musica sul taglio: costo zero di render (subito, solo `monta_spot.sh`).**
- Far partire il brano da **2:16,0** invece che da 2:15,5 (`-ss 136.0`), così la ripartenza cade sul taglio a 16,5 s.
- Ascoltare prima il punto, perché la misura è automatica.
- Se Marco preferisce l'attacco attuale, l'alternativa è spostare il taglio, ma vuol dire rendere di nuovo.
- In ogni caso va messa una nota nel commento di `monta_spot.sh`, che oggi dice «ripartenza a 16,5 s».

**P2 · `timeline.json` come unica fonte di verità.**
- Un solo file con:
  - le inquadrature (inizio, fine, titolo, sottotitolo);
  - i battiti misurati (`beats.json`);
  - i momenti forti (ripartenza a 17,0 s nel brano attuale; chiusura sul logo);
  - gli eventi sonori.
- Ne derivano `spot.py` (tabella `SHOT`), `titoli.json`, i tempi della sovrimpressione e i parametri di `monta_spot.sh`.
- Al prossimo render completo, i tagli si agganciano alla griglia: inquadrature di 4, 6 o 8 battiti, con la chiusura sul logo su una battuta.

**P3 · Titoli cinetici (solo HTML, nessun render Blender).** In `titoli.html`, dentro `vai(t)`:
- **Entrata a maschera:** il titolo sale da dietro un bordo invisibile (`overflow:hidden`) con curva expo out in 0,6–0,7 s; il sottotitolo arriva 1 battito dopo.
- **La riga** si disegna da sinistra sul battito d'entrata (già c'è uno `scaleX`: va legato al battito e a una curva decisa) e si ritira per prima in uscita.
- **Uscita** verso l'alto dentro la maschera, finita almeno 0,3 s prima del taglio: niente dissolvenza pura.
- **Curve diverse** per entrata (expo out), uscita (cubic in) e camera.
- Il testo resta come oggi: corto, in Instrument Serif. Va verificato a 360 px.

**P4 · Logo che si disegna nella chiusura (solo HTML).** Con `build/brand/logo-bianco.svg` (10 tracciati), in circa 3 s dentro i 5,5 s finali:
- il contorno di «RiFRA» si traccia (`stroke-dashoffset` con `pathLength="1"`) in 1,2 s;
- il pieno entra con una maschera che scorre, **sulla battuta**;
- «MILANO» si apre nella spaziatura;
- poi arrivano «Come nasce una cucina RiFRA» e «rifra.com».
- Il velo scuro sotto resta. Mezzo secondo di fermo sul logo completo prima della dissolvenza finale.

**P5 · Indicatore dei passaggi (solo HTML).**
- Una barra sottile in basso, o accanto al titolo, con **8 tacche**, una per ogni passaggio con titolo:
  1. progettazione;
  2. taglio;
  3. foratura;
  4. bordo;
  5. levigatura;
  6. laccatura;
  7. montaggio;
  8. imballaggio.
- A ogni titolo si riempie una tacca, in grigio caldo `#A8A6A1` su bianco al 30 %.
- Un numero piccolo, «3 / 8», in Newsreader, **non in monospace**.
- Attenzione: la guida di Anthropic cita le etichette numerate e quelle in monospace tra i difetti predefiniti di Opus 5.5. Qui il numero ha senso (è un processo in sequenza), ma deve essere discreto e fare parte della barra, non un'etichetta nell'angolo.

**P6 · Callout che seguono le macchine (una sola esecuzione di Blender senza render, dopo il render in corso).**
- In 3–4 inquadrature al massimo, un punto sulla macchina, una linea sottile e un'etichetta in Newsreader che resta agganciata mentre la camera si muove. Esempi:
  - «Biesse Rover A»;
  - «Bordatrice Brandt»;
  - «Cefla Spraybotic · 4 ante per ciclo».
- Le coordinate si proiettano da Blender per ogni fotogramma:

```python
# blender/callout.py: da eseguire con Blender -b rifra-fabbrica.blend --python callout.py  (UN solo Blender, a render finito)
import bpy, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
sc = bpy.context.scene; cam = sc.camera
PUNTI = {'cefla': (56.0, -17.6, 1.8), 'brandt': (44.5, -28.5, 1.2)}   # Blender = (x, −z three, altezza), come B() in spot.py; valori da LAYOUT-MACCHINE.json
out = {k: [] for k in PUNTI}
for f in range(sc.frame_start, sc.frame_end + 1):
    sc.frame_set(f)
    for k, p in PUNTI.items():
        v = world_to_camera_view(sc, cam, Vector(p))     # x, y in 0–1 con origine in basso a sinistra; z = distanza davanti alla camera
        out[k].append(None if v.z <= 0 else [round(v.x * 1920, 1), round((1 - v.y) * 1080, 1)])
json.dump(out, open(bpy.path.abspath('//titoli/callout.json'), 'w'))
```

- Nella sovrimpressione: il punto compare con una molla, la linea si disegna verso l'etichetta e l'etichetta entra a maschera. Tutto sparisce se il punto esce dal quadro o viene coperto. Per i punti coperti si può aggiungere un controllo con `scene.ray_cast` dalla camera.
- Massimo un callout per inquadratura, fermo almeno 1,5 s.

**P7 · Un contatore, al massimo due.**
- Solo numeri con fonte:
  - «4 ante per ciclo» (deciso il 01/10), contato 1 → 4 al ritmo dei cicli del robot;
  - «dal 1977», già nel sottotitolo d'apertura: va verificato che abbia una fonte nella `TABELLA-FATTI`.
- Cifre in Newsreader a larghezza fissa. Ogni scatto cade su un battito.

**P8 · Audio.**
- Normalizzazione in **due passaggi**.
- **Due mix:** −14 LUFS e −1 dBTP per web e social; −16 LUFS (come oggi) per la fiera.
- Sound design minimo, sintetizzato in codice:
  - un fruscio scuro su 3–4 tagli di camera veloci;
  - un tocco quasi impercettibile quando si disegna la riga dei titoli;
  - un colpo basso quando il logo si riempie.
- Tutto 12–18 dB sotto la musica. Prima un'anteprima a Marco.

**P9 · Versioni 4:5 e 9:16.**
- **Subito, a basso costo, 4:5 (1080 × 1350):**
  - ritaglio di 864 × 1080 dal 16:9, con una posizione orizzontale animata che segue il soggetto (le stesse coordinate dei callout aiutano);
  - ingrandimento 1,25×;
  - titoli in un'impaginazione 4:5 dalla stessa timeline.
- **Poi, 9:16 (1080 × 1920) fatto bene:**
  - una tabella `SHOT_916` in `spot.py` con camere ricomposte: focali più corte o camera più indietro, bersaglio centrato;
  - render dedicato, che costa quanto il 16:9 (ore);
  - prima i fermi immagine di prova;
  - titoli in alto entro la zona sicura (sotto i 250 px), mai negli ultimi 340 px.

**P10 · Ciclo di critica sullo spot.**
- Dopo il render in corso:
  - provino a 1 fotogramma per battito;
  - striscia di 12 fotogrammi attorno a ogni taglio;
  - prova a 360 px.
- Voti sui 7 assi e i 3 problemi peggiori, in un registro di revisione da creare con l'ok di Marco (per esempio `ricerca/REVISIONE-SPOT.md`).
- Rendere di nuovo solo i secondi interessati: `render_spot.py` salta già i fotogrammi presenti, basta archiviarli prima.

**P11 · Aggancio nei primi 2 s (decisione di Marco: cambia il montaggio).** Due strade:
- **Leggera, solo montaggio e HTML:** dissolvenza dal nero di 0,3 s invece di 0,9; «RiFRA» che si disegna sul primo battito già nell'aerea.
- **Forte, un'inquadratura nuova:** 1,5 s di primo piano (il robot Cefla al lavoro, o mani su un'anta) prima del volo aereo. È il «single most striking image» del beat sheet.

### 12.3 Brief pronto per Claude, per la prossima sessione sullo spot

```text
Sei regista e motion designer dello spot «Come nasce una cucina RiFRA» (50 s, 1920×1080, 30 fps), progetto in
/Volumes/PortableSSD/01_Clienti/Rifra/Produzione-animata. Leggi CLAUDE.md, HANDOFF.md § 5b e ricerca/VIDEO-CON-CLAUDE-OPUS.md.

Il film in una riga: chi guarda deve sentire che una cucina RiFRA nasce tutta in casa, con calma e precisione.
Vincoli: Blender solo un processo alla volta; titoli come sovrimpressione HTML trasparente (blender/titoli/titoli.html,
contratto vai(t) deterministico); design system RiFRA (Instrument Serif per i titoli, Newsreader per i testi; nero, bianco e grigi
#A8A6A1 #DFE0E1 #38383B; niente arancione, niente colori saturi); ogni fatto mostrato ha una fonte in ricerca/TABELLA-FATTI.md.
Vietati: tutto in dissolvenza, titolo centrato su gradiente, etichette negli angoli, cornici, bagliori, particelle, rimbalzi,
etichette in monospace, curve uguali per tutto, battiti morti.

Passi, con un cancello dopo ciascuno:
1. Misura la musica (blender/musica, da 2:16,0 per 50 s): beats.json con BPM, battiti, battute, picchi; confermami il BPM.
2. Scrivi blender/timeline.json (inquadrature, battiti, titoli, callout, eventi sonori) e la shotlist sulla griglia. Aspetta il mio OK.
3. Riscrivi l'animazione dei titoli (entrata a maschera, riga sul battito, uscita prima del taglio), l'indicatore 8 passaggi e il logo
   che si disegna; fermi immagine a 1 fotogramma per battito + prova a 360 px; voti 1–10 su 7 assi, correggi i 3 peggiori, ripeti fino a ≥ 8.
4. Solo dopo il mio OK: titoli PNG, montaggio (archivia prima il video esistente), mix −14 LUFS in due passaggi, provino finale.
```

---

## 13. Il video sulla Scrivania: passaggi chiave con il minuto

| Minuto | Cosa si vede o si dice |
|---|---|
| 0:00–0:40 | Esempi su X fatti con Opus 5.5: lancio di un'app con avatar (Chain), design Figma animati (Adrian), un buco nero molto dettagliato (DrewW) |
| 0:40–1:00 | Chi prova con un prompt solo ottiene «AI slop»: testo centrato, gradiente, tutto generico. **«Il prompt è solo il 10 % del risultato; il resto è l'impianto»** |
| 1:20–2:10 | Come genera i video: brief (testo e riferimenti) → Opus scrive codice → 4 strade (disegnato dal codice, framework, pipeline mista, montaggio di riprese) → MP4 |
| 2:10–2:20 | L'articolo di Movez, *How to build motion design studio with Opus 5.5*, corso in 12 passi, fonte principale del video |
| 2:20–3:00 | Caso Tommy Rossi: tutto in un `index.html`, Playwright fotogramma per fotogramma in Chrome senza finestra, poi ffmpeg; il modello preferisce zero dipendenze; l'audio è analizzato in Python per i tempi dei battiti |
| 3:00–3:40 | Demo: app desktop di Claude, cartella di lavoro, Opus 5.5 a effort High; video meteo di 10 s in 9:16; Claude controlla estraendo fotogrammi a 2,6 s e 8 s. Lo stesso prompt dato a Codex (che usa HyperFrames) dà un risultato «molto meno impressionante»; anteprima in HyperFrames Studio con timeline |
| 3:50–4:00 | Connettori e skill: HyperFrames e Remotion si installano dai connettori dell'app o come plugin di Claude Code. Le «regole dello studio» si incollano come primo messaggio del progetto |
| 4:10–4:30 | **Regole dello studio**: contratto di render (`seek(t)`, niente CSS e timer, rumore con seme, H.264 CRF 16); look (divieti, un font display e uno d'interfaccia, un accento, qualcosa di nuovo ogni 2–4 s); suono (sintetizzato, colpi sulla griglia misurata, −14 LUFS); ciclo prima di mostrare (un fotogramma per battito, voti su 6 assi, 3 peggiori, ≥ 8) |
| 4:40–5:30 | Il prompt di una riga «showreel per il curriculum» a effort Max, e perché funziona: genere, soggetto, durata, «go all out». Risultato ricco ma nero e arancione (i colori di Claude): serve il marchio vero |
| 5:20–6:00 | Claude in azione: `render.mjs`, provini con i voti per giro, brano a 128 BPM (32 battiti in 15 s), versione a 60 fps con molle; 285 MB per la grana a CRF 16 |
| 6:00–6:30 | MagicPath: «un solo tratto di cursore che finisce come logo»; Tony Dinh: «un anno fa ho pagato circa 1000 $ per un video così» |
| 6:40–7:30 | Modello di prompt per un video di prodotto di 20 s: risorse vere con Playwright, mai ridisegnare l'interfaccia; storia in 5 battiti (aggancio in 5 parole di testo cinetico, il prodotto che si compone, tre funzioni con cursore, un numero, logo e invito); musica a 120 BPM sintetizzata; prima 9:16 poi 1:1 e 16:9; provino prima del render. Claude ricattura l'interfaccia a 3× DPR per ingrandimenti nitidi |
| 7:40–10:20 | Sponsor (Fish Audio): voce fuori campo con TTS via server MCP, clone della voce, voce sincronizzata ai tagli con la musica sotto |
| 10:30–10:50 | Bozza a 30 fps senza sfocatura di movimento (animatic) e nuovo provino a un fotogramma per battito |
| 11:00–11:50 | Riferimenti: *whatships.com*; film di lancio come modello; fotogrammi ogni 0,5 s → `style_guide.md` e `shotlist.md` → stop per l'OK |
| 12:00–12:30 | Risultato MagicPath; schema «un elemento solo che cambia dimensione, raggio e colore, senza tagli; l'ultimo stato torna al primo» |
| 12:40–13:50 | Brief a tag XML (`inputs`, `direction`, `structure`, `build`, `gotchas`, `start`); regole: molle in forma chiusa, testo nei contenitori, griglia da librosa, 60 fps con 4 sottofotogrammi; tabella degli stati sui battiti; campione di 16 s, 8 battute a 120 BPM, loop |
| 14:10–14:30 | Animazione sulla vita di Steve Jobs: Remotion, React e SVG, circa 8700 righe, personaggio articolato, 23 transizioni, colonna sonora sintetizzata, tagli a 120 BPM |
| 14:40–15:30 | **Tre corsie** (musica, effetti, immagine); `beats.py` → `beats.json`, `sfx.mjs`, `timeline.json` come unica fonte; risultato: logo e pulsante sulle battute, 26 effetti sui picchi, −14,1 LUFS |
| 15:40–16:20 | Altri esempi: «small print» con HyperFrames; video musicali in stile anime; il prompt di donald con il testo grande o piccolo secondo l'importanza |
| 16:30–17:30 | Gli ingredienti di un brief completo: film in una riga, riferimenti, strumenti e chiavi, «bibbia» dei personaggi, beat sheet, testo a schermo, lavoro a cancelli, ciclo di critica, consegne |
| 17:40–18:20 | Il brief «da regista» in sezioni; film MagicPath di 45 s, 1080p60, −14 LUFS |
| 18:30–19:20 | **Ciclo di critica**: fermi immagine 1 per battito → provino → voti su 7 assi → 3 peggiori → ripetere fino a 8. Comandi per striscia, prova telefono, loop e determinismo. «163 chiamate e quasi 7 ore: iterare è il metodo». Tabella dei giri di revisione |
| 19:30–20:16 | C'è chi vende video così (69 $). Tutto si chiude in una **skill** `motion-reel`: dati da raccogliere, una pipeline in 8 passi, regole ferme (interfaccia vera, niente casualità o timer, divieti) |

---

## 14. Fonti

**Il video e i materiali mostrati:**
- `videoplayback.mp4` sulla Scrivania di Marco (YouTube, datato 29/09/2026). Fotogrammi e trascrizione parziale (0:00–9:46) nella cartella temporanea della sessione, non nel progetto. Il titolo e il canale originali non sono stati trovati online.
- Movez (@0xMovez), *How to build motion design studio with Opus 5.5 (Full-course)*, articolo su X, settembre 2026 (visto nel video).

**Documentazione ufficiale:**
- Anthropic, Prompting Claude Opus 5.5: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
- Anthropic, Prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Remotion con Claude Code: https://www.remotion.dev/docs/ai/claude-code
- Skill di Remotion: https://www.remotion.dev/docs/ai/skills
- Remotion, sfarfallio: https://www.remotion.dev/docs/flickering
- Remotion, `spring()`: https://www.remotion.dev/docs/spring
- HyperFrames (HeyGen, Apache 2.0): https://github.com/heygen-com/hyperframes
- Revideo: https://docs.re.video/
- Motion Canvas: https://motioncanvas.io/docs/
- Confronto Remotion e Motion Canvas: https://www.remotion.dev/docs/compare/motion-canvas
- Manim Community: https://docs.manim.community/
- GSAP `Timeline.seek()`: https://gsap.com/docs/v3/GSAP/Timeline/seek()
- Lottie web: https://airbnb.io/lottie/#/web
- Blender, `bpy_extras.object_utils.world_to_camera_view`: https://docs.blender.org/api/current/bpy_extras.object_utils.html
- ffmpeg, filtri `loudnorm` ed `ebur128`: https://ffmpeg.org/ffmpeg-filters.html#loudnorm
- librosa (beat_track, onset_detect): https://librosa.org/doc/
- Playwright `page.pdf` / `page.screenshot`: https://playwright.dev/docs/api/class-page
- Material Design 3, easing e durate: https://m3.material.io/styles/motion/easing-and-duration

**Articoli (2026):**
- OfficeChai, *Claude Opus 5.5 Is Generating Incredible Animated Motion Graphic Videos*: https://officechai.com/ai/claude-opus-5-5-motion-graphic-videos/
- Noqta, *HeyGen HyperFrames: HTML to MP4 for AI Agents*: https://www.noqta.tn/en/blog/heygen-hyperframes-html-to-mp4-ai-agent-video-2026
- PkgPulse, *Remotion vs Motion Canvas vs Revideo 2026*: https://www.pkgpulse.com/guides/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026
- Fora Soft, *LUFS targets per platform 2026*: https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026
- Hopper HQ, *Instagram Reel Size 2026, safe zones*: https://www.hopperhq.com/blog/instagram-reel-size/
- fal.ai, *Seedance 2.0 vs Kling 3.0*: https://fal.ai/learn/tools/seedance-2-0-vs-kling-3-0
- CometAPI, *Seedance 2.0 vs Veo 3.1*: https://www.cometapi.com/seedance-2-0-vs-veo-3-1/

**Misure sullo spot:** fatte il 01/10/2026 con numpy sul brano `blender/musica/breakzstudios-loyalty-no-drums-236311.mp3`, finestra da 135,5 s a 185,5 s: RMS ogni 25 ms, flusso spettrale e autocorrelazione. Sono da confermare all'ascolto.
