// Lingua della pagina (Marco 02/10): italiano o inglese. La lingua di partenza la decide il file (build3d.mjs scrive window.RF_LINGUA:
// come-nasce-una-cucina-rifra-3d.html parte in italiano, ...-3d-en.html in inglese) oppure ?lang=it|en; il pulsante in alto a destra la cambia.
// Nel codice i testi restano in italiano: t() cerca la traduzione nel dizionario EN (chiave = testo italiano come si vede in pubblico).
// Le schede dei passaggi hanno le loro versioni inglesi in testi.js. La scelta non si salva: ogni file riparte nella sua lingua.
const Q = (location.search.match(/[?&]lang=(it|en)\b/) || [])[1];
export const LINGUA = { cur: Q || (typeof window !== 'undefined' && window.RF_LINGUA) || 'it' };
export const t = s => LINGUA.cur === 'en' ? (EN[s] ?? s) : s;
const ASCOLTA = [];
export const allaLingua = f => { ASCOLTA.push(f); };
export function cambiaLingua(l) { LINGUA.cur = l; testiFissi(); ASCOLTA.forEach(f => f()); }

// testi fissi di index.html: [selettore, proprietà]; l'italiano si ricorda sull'elemento alla prima passata
const FISSI = [['.mast h1', 'textContent'], ['.mast p', 'textContent'], ['#motion', 'textContent'], ['#sheet', 'textContent'], ['#more', 'textContent'], ['#voice', 'textContent'],
  ['#tapcta', 'textContent'], ['#loading', 'textContent'], ['.kband b', 'textContent'], ['#nowebgl span', 'textContent'], ['#nowebgl a', 'textContent'],
  ['#scene', 'aria-label'], ['#prev', 'aria-label'], ['#next', 'aria-label'], ['nav.index', 'aria-label'], ['#kband', 'aria-label'], ['.qr svg', 'aria-label']];
export function testiFissi() {
  document.documentElement.lang = LINGUA.cur;
  document.title = t('Come nasce una cucina RiFRA');   // il titolo del file inglese è già in inglese: la chiave è sempre l'italiano
  for (const [sel, pr] of FISSI) { const el = document.querySelector(sel); if (!el) continue; const k = 'it' + pr.replace(/\W/g, '');
    if (el.dataset[k] === undefined) el.dataset[k] = pr === 'textContent' ? el.textContent : el.getAttribute(pr) || '';
    if (pr === 'textContent') el.textContent = t(el.dataset[k]); else el.setAttribute(pr, t(el.dataset[k])); }
  const b = document.getElementById('lang'); if (b) { const en = LINGUA.cur === 'en';
    b.textContent = en ? 'Italiano' : 'English'; b.lang = en ? 'it' : 'en'; b.setAttribute('aria-label', en ? 'Passa all’italiano' : 'Switch to English'); }
}

const EN = {
  // pagina
  'Come nasce una cucina RiFRA': 'How a RiFRA kitchen is made',
  'Produzione su misura RiFRA · Lesmo (MB)': 'RiFRA made-to-measure production · Lesmo (MB)',
  'Ferma le animazioni': 'Stop animations', 'Tavola intera': 'Whole factory', 'Voce narrante': 'Narration',
  'Tocca per il racconto completo': 'Tap for the full story', 'Costruisco la fabbrica…': 'Building the factory…',
  'Come nasce ogni cucina RiFRA': 'How every RiFRA kitchen is made',
  'Questo dispositivo non mostra il 3D.': 'This device cannot show the 3D view.', 'Apri la versione illustrata': 'Open the illustrated version',
  'Ricostruzione 3D animata della fabbrica RiFRA di Gerno di Lesmo: dodici passaggi, dal progetto e dal pannello grezzo alla cucina imballata.':
    'Animated 3D reconstruction of the RiFRA factory in Gerno di Lesmo: twelve steps, from the design and the raw panel to the packed kitchen.',
  'Passaggio precedente': 'Previous step', 'Passaggio successivo': 'Next step', 'Passaggi': 'Steps', 'Scopri di più': 'Find out more',
  'Codice QR per rifra.com/produzione': 'QR code for rifra.com/produzione',
  // pulsanti che cambiano (main.js)
  'Pausa': 'Pause', 'Rivedi il giro': 'Watch the tour again', 'Avvia il giro': 'Start the tour', 'Torna al giro': 'Back to the tour', 'Riprendi il giro': 'Resume the tour',
  'Metti il tetto': 'Put the roof back', 'Togli il tetto': 'Remove the roof', 'Leggi tutto': 'Read more', 'Riduci': 'Show less',
  'Dettaglio alta': 'High detail', 'Dettaglio media': 'Medium detail', 'Dettaglio bassa': 'Low detail',
  'Passaggio': 'Step', 'di 12': 'of 12', 'Opzione': 'Option', 'opz.': 'opt.',
  'Opzione: verniciatura manuale': 'Option: manual painting', 'Opzione dopo la lucidatura: verniciatura manuale': 'Option after polishing: manual painting',
  // nomi dei passaggi (edificio.js NAMES)
  'Il progetto': 'The design', 'I pannelli': 'The panels', 'La fresatura': 'Milling', 'La foratura': 'Drilling', 'La squadratura': 'Squaring',
  'La sezionatura': 'Panel sawing', 'La bordatura': 'Edgebanding', 'La levigatura': 'Sanding', 'La verniciatura': 'Painting', 'La lucidatura': 'Polishing',
  'Il montaggio': 'Assembly', 'Imballaggio e spedizione': 'Packing and shipping',
  // etichette nella scena (reparti.js, main.js)
  'Sala riunioni · uffici direzionali': 'Meeting room · executive offices',
  'Ufficio tecnico: ogni cucina è disegnata su misura': 'Technical office: every kitchen is designed to measure',
  'Plotter per le tavole di produzione': 'Plotter for the production drawings', 'Tavole di progetto appese': 'Design drawings on the wall',
  'Filiera corta: solo produttori della Brianza': 'Short supply chain: only producers from Brianza', 'Ingresso merci e deposito pannelli': 'Goods-in and panel depot',
  'Ogni lastra viene controllata prima dell’uso': 'Every sheet is checked before use',
  'Biesse Rover A · centro di lavoro CNC': 'Biesse Rover A · CNC machining centre', 'Secondo centro di lavoro Biesse': 'Second Biesse machining centre',
  'Banco con le ante da lavorare': 'Bench with the doors to be machined',
  'Biesse Brema EKO 2.1 · foratrice verticale': 'Biesse Brema EKO 2.1 · vertical drilling machine', 'Foratrice da banco': 'Bench drilling machine',
  'Casolin · squadratrice a carro': 'Casolin · sliding table saw', 'Altendorf · squadratrice': 'Altendorf · sliding table saw',
  'Riquadro arancione a terra intorno alla macchina': 'Orange frame on the floor around the machine',
  'Sezionatrice verticale: taglia le lastre in piedi': 'Vertical panel saw: cuts the sheets standing upright',
  'Brandt · bordatrice': 'Brandt · edgebander', 'De Stefani · levigabordi': 'De Stefani · edge sander',
  'EMC · levigatrice: qui il pannello viene levigato': 'EMC · sander: the panel is sanded here',
  'Levigatrice a nastro largo, cinque aspirazioni': 'Wide-belt sander, five extraction hoods',
  'Il sito: dal 2005 una levigatrice robotizzata': 'RiFRA’s website: a robotic sander since 2005',
  'Cefla Finishing Spraybotic · robot cartesiano, 4 ante per ciclo': 'Cefla Finishing Spraybotic · Cartesian robot, 4 doors per cycle',
  'Barriera di lettura: legge le sagome delle ante': 'Reading barrier: scans the outlines of the doors',
  'Mixer delle vernici': 'Paint mixer', 'Pulpito della linea': 'Line control desk', 'Carrello di essiccazione': 'Drying rack',
  'Tunnel della linea di verniciatura': 'Painting line tunnel', 'Linea VP Impianti · lucidatrice automatica': 'VP Impianti line · automatic polisher',
  'Erregi · strettoio per scocche': 'Erregi · carcass press', 'Nastro della linea di montaggio': 'Assembly line conveyor',
  'Robopac · avvolge il bancale nel film': 'Robopac · wraps the pallet in film', 'Destinazione: tutto il mondo': 'Destination: the whole world',
  'Portone di uscita del magazzino': 'Warehouse exit door', 'percorso indicativo del pezzo': 'indicative path of the part',
  // scritte sui fianchi di furgone e camion (arredi.js)
  'Filiera corta: RiFRA lavora solo con produttori della Brianza.': 'Short supply chain: RiFRA works only with producers from Brianza.',
  'Il vero made in Italy.': 'True made in Italy.',
};
