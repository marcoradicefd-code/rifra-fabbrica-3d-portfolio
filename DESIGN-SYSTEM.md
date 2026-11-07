# Design system RiFRA · estratto da rifra.com (29/09/2026)

Fonte: CSS del tema Squarespace di rifra.com (`ricerca/design-system/site.css`) e schermate delle pagine home, /produzione, /cucine/one (`ricerca/design-system/sito_*.png`, provino in `provino_sito.jpg`). RiFRA non pubblica una guida di marca: questi sono i valori che il sito usa davvero. Da far confermare a RiFRA prima di pubblicare.

## Colori

| Token | Valore | Dove lo usa il sito | Uso nella tavola |
|---|---|---|---|
| `--rf-black` | `#000000` | testi, sezioni scure, pulsante nero | testo principale, pulsante primario |
| `--rf-white` | `#FFFFFF` | fondi chiari, logo sulle foto | fondo delle schede |
| `--rf-accent` | `#A8A6A1` (hsl 42.86 3.87% 64.51%) | accento «grigio caldo», link dei titoli | linee, barra di avanzamento, dettagli |
| `--rf-light` | `#DFE0E1` (hsl 210 3.23% 87.84%) | pulsante chiaro, fondi di blocchi | pulsanti secondari, fondo dell'indice |
| `--rf-dark` | `#38383B` (hsl 240 2.61% 22.55%) | sovrapposizioni scure sulle immagini | intestazioni scure, modalità fiera |

Niente colori saturi nell'interfaccia: il colore lo portano le immagini (luce calda, legno, laccati). Il sito alterna sezioni **bianche** e **nere**.

## Font (Google Fonts, licenza SIL OFL, incorporabili)

| Ruolo | Famiglia | Impostazioni del sito |
|---|---|---|
| Titoli | **Instrument Serif** 400 | spaziatura −0,02 em, interlinea 1,2; nelle testate spesso in MAIUSCOLO |
| Testo, menu, pulsante primario | **Newsreader** 400 (variabile, opsz 6–72, peso 200–800) | spaziatura 0; meta +0,02 em |
| Pulsante terziario | Helvetica Neue | +0,05 em |

Scala (base 16 px): H1 4 rem · H2 2,8 · H3 2,2 · H4 1,6 · testo grande 1,4 · normale 1 · piccolo 0,9 · meta 1,3.
Il secondario del sito usa «kepler-std» (Adobe Fonts, non incorporabile): non lo usiamo.

## Forme

- Pulsante primario: **pillola**, raggio 30 px, padding 1,5 rem × 2,2 rem, senza bordo. Due varianti viste: grigio chiaro `#DFE0E1` con testo nero, nero con testo bianco.
- Pulsante secondario: angoli asimmetrici (0 · 20 · 0 · 20 px) con bordo 2 px.
- Campi dei moduli: raggio 5 px.
- Foto a tutta larghezza, niente ombre marcate, molto spazio vuoto.

## Logo

Parola «RiFRA» con grazie e «MILANO» sotto, spaziato. Sul sito solo in PNG bianco (1181 × 449). Ricostruito in vettoriale in `build/brand/logo.svg` (nero) e `logo-bianco.svg`, con `logo-paths.json` per il canvas.

## Tono

«Made in Milano», «filiera corta», «dal progetto alla consegna». Frasi brevi, registro alto, niente superlativi tecnici.

## Come si applica alla tavola animata (proposta)

- **Interfaccia** (titolo, scheda, pulsanti, indice, sottotitoli, QR): questo design system. Titoli in Instrument Serif, testi ed etichette in Newsreader (optical size piccolo per le etichette ≥ 12,5 px), pulsanti a pillola.
- **Scena**: vista 3D a colori come stile principale, con la palette dei materiali veri della fabbrica (antracite delle pareti, grigio del cemento, bianco delle macchine Biesse con fascia verde, Cefla bianco, Brandt con onda azzurra, laccati delle ante). Lo stile «matita» resta come alternativa.
- Da chiedere a RiFRA, come si è fatto con FonteAlta: «il design system vale anche per l'illustrazione?».

## Token CSS

```css
:root{
  --rf-black:#000; --rf-white:#fff; --rf-accent:#a8a6a1; --rf-light:#dfe0e1; --rf-dark:#38383b;
  --rf-paper:#f5f4f1;               /* fondo della pagina: bianco caldo, per non abbagliare in fiera */
  --rf-text-2:rgba(0,0,0,.68);
  --rf-border:rgba(0,0,0,.12);
  --rf-radius-pill:30px; --rf-radius-card:4px; --rf-radius-field:5px;
  --rf-serif-display:"Instrument Serif",Georgia,serif;
  --rf-serif-text:"Newsreader",Georgia,serif;
  --rf-ls-heading:-.02em; --rf-ls-meta:.02em;
}
```
