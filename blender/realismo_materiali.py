# Materiali procedurali della fabbrica RiFRA per Blender 5.2 (EEVEE e Cycles). Proprietario: agente del realismo (01/10).
# Tutto disegnato coi nodi (rumori, voronoi, mattoni, onde): niente foto come texture. Restano le sole texture «disegnate dal codice»
# della pagina per loghi, targa del civico, tavole e foto appese (scritte da mantenere).
# Ogni materiale importato da importa.py si chiama «rf.<nome>» e porta rf_nome / rf_colore / rf_rug / rf_met: il nome è quello del
# materiale della pagina (3d/js/materiali.js, macchine.js, uffici.js), il colore viene dalle foto (LAYOUT-MACCHINE.json, MAPPA-FOTO.md).
# Regole (HANDOFF § 3, ricerca/BLENDER-TECNICHE.md § 2.2–2.3): muri esterni chiari e PULITI (niente sporco, colature, usura),
# albedo ≤ 0,8, variazioni di tinta entro ±2–4 %, rugosità variata, buccia d'arancia leggera sulle vernici, coat sulle vernici lucide.
import bpy, math

# ---------- famiglie ----------
FAMIGLIA = {
    # architettura
    'facciata': 'muro_est', 'bordoFacciata': 'muro_est', 'testaFacciata': 'muro_est', 'biancoCaldo': 'intonaco', 'tettoChiaro': 'intonaco',
    'internoAntracite': 'muro_int', 'internoBianco': 'muro_int', 'stanza': 'muro_int', 'cabina': 'muro_int', 'bianca': 'muro_int', 'scura': 'muro_int',
    'pavimento': 'pavimento', 'pavMagazzino': 'pavimento', 'pavUffici': 'piastrelle', 'pavPrimo': 'piastrelle', 'gradino': 'piastrelle',
    'tetto': 'lamiera_tetto', 'controsoffitto': 'controsoffitto', 'tettoPiano': 'quadrotti', 'tettoScuro': 'membrana', 'lineaRossa': 'segnaletica',
    'righeGialle': 'segnaletica', 'righeBianche': 'segnaletica', 'righeArancio': 'segnaletica',
    # esterno
    'prato': 'prato', 'asfalto': 'asfalto', 'autobloccanti': 'autobloccanti', 'chioma': 'foglie', 'fogliame': 'foglie', 'siepe': 'foglie',
    'pianta': 'foglie', 'tronco': 'corteccia', 'dettagliAuto': 'auto_dettagli', 'carrozzeria': 'auto',
    # vetri e trasparenti
    'vetro': 'vetro', 'vetroUffici': 'vetro_facciata', 'vetroInterno': 'vetro', 'vetroChiaro': 'vetro', 'vetroScuro': 'vetro_scuro',
    'lucernario': 'policarbonato', 'film': 'film', 'nebbia': 'particelle', 'polvere': 'particelle', 'alone': 'particelle', 'percorso': 'percorso',
    # metalli
    'acciaio': 'metallo', 'cromato': 'metallo', 'alluminio': 'metallo', 'ghisa': 'metallo', 'ottone': 'metallo', 'forno': 'metallo',
    'zincato': 'zincato', 'zincatoScuro': 'zincato', 'silo': 'zincato',
    # gomme, nastri, tessuti
    'gomma': 'gomma', 'tappeto': 'gomma', 'nastroScuro': 'gomma', 'ventosa': 'gomma', 'pianoNero': 'gomma', 'vaso': 'gomma',
    'nastroCefla': 'tessuto', 'nastroPistole': 'tessuto', 'filtri': 'tessuto',
    # legno e pannelli
    'legno': 'legno', 'doghe': 'legno', 'pianoLegno': 'legno', 'bracciRastr': 'legno', 'orologio': 'legno',
    'mdf': 'mdf', 'mdfPieno': 'mdf', 'truciolare': 'truciolare', 'cartone': 'cartone',
    'laccato': 'laccato', 'laccatoPieno': 'laccato', 'laccatoOpaco': 'vernice', 'melaminico': 'laminato', 'scrivBianca': 'laminato', 'scrivScura': 'laminato',
    # luci, schermi, scritte
    'luce': 'emissivo', 'lucePorta': 'emissivo', 'luceRossa': 'emissivo', 'lampadaRossa': 'emissivo', 'lampadaGialla': 'emissivo',
    'lampadaVerde': 'emissivo', 'schermo': 'schermo', 'led': 'schermo', 'tv': 'schermo',
    'loghi': 'texture', 'targa': 'texture', 'tavole': 'texture', 'foto': 'texture', 'texture': 'texture',
}
EMISSIONE = {'luce': 8, 'lucePorta': 5, 'luceRossa': 12, 'lampadaRossa': 6, 'lampadaGialla': 6, 'lampadaVerde': 6}

def famiglia(mat):
    n = mat.get('rf_nome', '')
    if n in FAMIGLIA: return FAMIGLIA[n]
    if mat.get('rf_met', 0) >= .5: return 'metallo'
    return 'vernice'

# ---------- aiuti per i nodi ----------
class Nodi:
    def __init__(self, mat):
        self.mat = mat; self.nt = mat.node_tree; self.N = self.nt.nodes; self.L = self.nt.links; self.x = -1600
    def n(self, tipo, **kw):
        nd = self.N.new(tipo); nd.location = (self.x, len(self.N) * -40 % 1200); self.x += 60
        for k, v in kw.items(): setattr(nd, k, v)
        return nd
    def link(self, a, b): self.L.new(a, b)
    def ins(self, nd, nome, idx=None):
        return next(s for s in nd.inputs if s.identifier == nome or (s.name == nome and s.enabled))
    def coord(self, tipo='Object'):
        return self.n('ShaderNodeTexCoord').outputs[tipo]
    def rumore(self, vec, scala, detail=3.0, rough=.55, dist=0.0):
        r = self.n('ShaderNodeTexNoise'); self.link(vec, r.inputs['Vector']); r.inputs['Scale'].default_value = scala
        r.inputs['Detail'].default_value = detail; r.inputs['Roughness'].default_value = rough; r.inputs['Distortion'].default_value = dist
        return r.outputs['Factor']
    def mappa(self, val, a, b, c=0.0, d=1.0, clamp=True):
        m = self.n('ShaderNodeMapRange'); m.clamp = clamp; self.link(val, m.inputs['Value'])
        m.inputs['From Min'].default_value = a; m.inputs['From Max'].default_value = b; m.inputs['To Min'].default_value = c; m.inputs['To Max'].default_value = d
        return m.outputs['Result']
    def mat_op(self, op, a, b=None, c=None):
        m = self.n('ShaderNodeMath', operation=op)
        for i, v in enumerate((a, b, c)):
            if v is None: continue
            if isinstance(v, (int, float)): m.inputs[i].default_value = v
            else: self.link(v, m.inputs[i])
        return m.outputs[0]
    def mix(self, fac, a, b, modo='MIX'):
        m = self.n('ShaderNodeMix', data_type='RGBA', blend_type=modo)
        fi = m.inputs[0]; A = next(s for s in m.inputs if s.identifier == 'A_Color'); B = next(s for s in m.inputs if s.identifier == 'B_Color')
        for s, v in ((fi, fac), (A, a), (B, b)):
            if isinstance(v, (int, float)): s.default_value = v
            elif isinstance(v, (tuple, list)): s.default_value = (*v[:3], 1) if len(v) >= 3 else v
            else: self.link(v, s)
        return next(o for o in m.outputs if o.identifier == 'Result_Color')
    def hsv(self, col, v=None, h=None, s=None):
        m = self.n('ShaderNodeHueSaturation')
        for nome, val, dfl in (('Hue', h, .5), ('Saturation', s, 1.0), ('Value', v, 1.0)):
            if val is None: m.inputs[nome].default_value = dfl
            elif isinstance(val, (int, float)): m.inputs[nome].default_value = val
            else: self.link(val, m.inputs[nome])
        if isinstance(col, (tuple, list)): m.inputs['Color'].default_value = (*col[:3], 1)
        else: self.link(col, m.inputs['Color'])
        return m.outputs['Color']
    def bump(self, h, forza, dist=.002, normale=None):
        b = self.n('ShaderNodeBump'); b.inputs['Strength'].default_value = forza; b.inputs['Distance'].default_value = dist; self.link(h, b.inputs['Height'])
        if normale is not None: self.link(normale, b.inputs['Normal'])
        return b.outputs['Normal']
    def casuale(self):
        return self.n('ShaderNodeObjectInfo').outputs['Random']

def _nuovo_albero(mat):
    nt = mat.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); out.location = (400, 0)
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.location = (100, 0); nt.links.new(bs.outputs[0], out.inputs['Surface'])
    return bs, out

def _set(bs, **kw):
    nomi = {'col': 'Base Color', 'rug': 'Roughness', 'met': 'Metallic', 'coat': 'Coat Weight', 'coat_rug': 'Coat Roughness', 'spec': 'Specular IOR Level',
            'trasm': 'Transmission Weight', 'ior': 'IOR', 'alpha': 'Alpha', 'sss': 'Subsurface Weight', 'emi_col': 'Emission Color', 'emi': 'Emission Strength',
            'aniso': 'Anisotropic', 'sheen': 'Sheen Weight', 'thin': 'Thin Wall'}
    for k, v in kw.items():
        s = bs.inputs[nomi[k]]
        if isinstance(v, (tuple, list)): s.default_value = (*v[:3], 1) if len(v) == 3 else v
        else: s.default_value = v

def _limita(c, mx=.8):
    m = max(c[:3]); return [v * mx / m for v in c[:3]] if m > mx else list(c[:3])

# ---------- famiglie: ogni funzione riceve (Nodi, bsdf, colore, rugosità, metallo, materiale) ----------
def f_vernice(K, bs, col, rug, met, mat, coat=None):
    """vernice industriale (RAL) delle macchine: tinta ±2 % per oggetto e a grande scala, rugosità variata, buccia d'arancia, coat."""
    co = K.coord(); rnd = K.casuale()
    v = K.mat_op('ADD', K.mappa(K.rumore(co, .35, 2), .3, .7, .985, 1.015), K.mappa(rnd, 0, 1, -.015, .015))
    c = K.hsv(_limita(col, .82), v=v, h=K.mappa(rnd, 0, 1, .497, .503))
    K.link(c, bs.inputs['Base Color'])
    r = K.mappa(K.rumore(co, 6, 3), .3, .7, max(.05, rug - .05), min(1, rug + .06)); K.link(r, bs.inputs['Roughness'])
    K.link(K.bump(K.rumore(co, 260, 2), .015 if rug < .7 else .03), bs.inputs['Normal'])
    if coat is None: coat = .25 if rug < .6 else 0.0
    _set(bs, met=0.0, coat=coat, coat_rug=.12)

def f_laminato(K, bs, col, rug, met, mat):
    f_vernice(K, bs, col, min(rug, .35), 0, mat, coat=.15)

def f_metallo(K, bs, col, rug, met, mat):
    """metallo nudo (acciaio, alluminio, ghisa, ottone): spazzolato con righe fini, rugosità variata."""
    co = K.coord(); mp = K.n('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 1, 40); K.link(co, mp.inputs['Vector'])
    righe = K.rumore(mp.outputs['Vector'], 30, 2)
    K.link(K.hsv(col, v=K.mappa(righe, .3, .7, .96, 1.04)), bs.inputs['Base Color'])
    K.link(K.mappa(righe, .3, .7, max(.08, rug - .08), rug + .08), bs.inputs['Roughness'])
    _set(bs, met=1.0, aniso=.3)

def f_zincato(K, bs, col, rug, met, mat):
    """lamiera zincata: «fioritura» dello zinco con Voronoi (tinta ±4 %, rugosità .25–.5)."""
    co = K.coord(); vo = K.n('ShaderNodeTexVoronoi'); K.link(co, vo.inputs['Vector']); vo.inputs['Scale'].default_value = 14
    g = K.n('ShaderNodeRGBToBW'); K.link(vo.outputs['Color'], g.inputs['Color'])
    K.link(K.hsv(col, v=K.mappa(g.outputs['Val'], 0, 1, .95, 1.05)), bs.inputs['Base Color'])
    K.link(K.mappa(g.outputs['Val'], 0, 1, .25, .48), bs.inputs['Roughness'])
    _set(bs, met=.92)

def f_gomma(K, bs, col, rug, met, mat):
    co = K.coord()
    K.link(K.hsv(col, v=K.mappa(K.rumore(co, 20, 2), .3, .7, .92, 1.06)), bs.inputs['Base Color'])
    K.link(K.mappa(K.rumore(co, 8, 2), .3, .7, .72, .9), bs.inputs['Roughness'])
    K.link(K.bump(K.rumore(co, 150, 2), .05), bs.inputs['Normal']); _set(bs, met=0, spec=.3)

def f_tessuto(K, bs, col, rug, met, mat):
    co = K.coord()
    K.link(K.hsv(col, v=K.mappa(K.rumore(co, 40, 4), .3, .7, .92, 1.06)), bs.inputs['Base Color'])
    K.link(K.bump(K.rumore(co, 300, 3), .12), bs.inputs['Normal']); _set(bs, rug=.92, met=0, spec=.25, sheen=.3)

def f_legno(K, bs, col, rug, met, mat):
    """legno con venatura (onde distorte) e nodi leggeri; per scaffali, piani, doghe, parete a pannelli degli uffici."""
    co = K.coord(); mp = K.n('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 1, .12); K.link(co, mp.inputs['Vector'])
    w = K.n('ShaderNodeTexWave'); w.bands_direction = 'X'; K.link(mp.outputs['Vector'], w.inputs['Vector']); w.inputs['Scale'].default_value = 6
    w.inputs['Distortion'].default_value = 6; w.inputs['Detail'].default_value = 3
    vena = K.mappa(w.outputs['Factor'], 0, 1, .93, 1.04)
    K.link(K.hsv(col, v=K.mat_op('MULTIPLY', vena, K.mappa(K.rumore(co, .8, 2), .3, .7, .95, 1.05))), bs.inputs['Base Color'])
    K.link(K.mappa(w.outputs['Factor'], 0, 1, max(.3, rug - .1), min(.9, rug + .05)), bs.inputs['Roughness'])
    K.link(K.bump(w.outputs['Factor'], .04), bs.inputs['Normal']); _set(bs, met=0, coat=.1 if rug < .6 else 0)

def f_mdf(K, bs, col, rug, met, mat):
    co = K.coord()
    fine = K.rumore(co, 180, 2)
    K.link(K.hsv(col, v=K.mat_op('MULTIPLY', K.mappa(fine, .35, .65, .93, 1.06), K.mappa(K.rumore(co, 2, 2), .3, .7, .97, 1.03))), bs.inputs['Base Color'])
    K.link(K.bump(fine, .05), bs.inputs['Normal']); _set(bs, rug=max(rug, .75), met=0)

def f_truciolare(K, bs, col, rug, met, mat):
    co = K.coord(); vo = K.n('ShaderNodeTexVoronoi'); K.link(co, vo.inputs['Vector']); vo.inputs['Scale'].default_value = 160
    g = K.n('ShaderNodeRGBToBW'); K.link(vo.outputs['Color'], g.inputs['Color'])
    K.link(K.hsv(col, v=K.mappa(g.outputs['Val'], 0, 1, .82, 1.12)), bs.inputs['Base Color'])
    K.link(K.bump(vo.outputs['Distance'], .08), bs.inputs['Normal']); _set(bs, rug=.85, met=0)

def f_cartone(K, bs, col, rug, met, mat):
    co = K.coord()
    K.link(K.hsv(col, v=K.mappa(K.rumore(co, 12, 3), .3, .7, .93, 1.05)), bs.inputs['Base Color'])
    K.link(K.bump(K.rumore(co, 200, 2), .04), bs.inputs['Normal']); _set(bs, rug=.88, met=0, spec=.3)

def f_laccato(K, bs, col, rug, met, mat):
    """anta laccata lucida (pezzo protagonista): base scura, coat a specchio."""
    _set(bs, col=_limita(col), rug=.22, met=0, coat=1.0, coat_rug=.03)
    K.link(K.bump(K.rumore(K.coord(), 400, 1), .004), bs.inputs['Coat Normal'])

def f_muro_est(K, bs, col, rug, met, mat):
    """pannelli prefabbricati in cemento delle facciate (SV, earth-retro, TABELLA-FATTI: «pannelli in cemento grigio con giunti
    verticali»): CHIARI e PULITI (Marco, 30/09). Pannelli da 2,5 m con giunto di 2 cm, tinta per pannello ±2,5 % (getti diversi),
    pori fini. Niente colature, macchie, piede scuro. Coordinate del MONDO (i muri di facciata sono oggetti ruotati e scalati)."""
    base = (.44, .435, .41) if mat.get('rf_nome') == 'facciata' else _limita(col, .5)
    geo = K.n('ShaderNodeNewGeometry'); co = geo.outputs['Position']
    sep = K.n('ShaderNodeSeparateXYZ'); K.link(co, sep.inputs[0]); sn = K.n('ShaderNodeSeparateXYZ'); K.link(geo.outputs['Normal'], sn.inputs[0])
    # coordinata lungo il muro: x se il muro guarda a nord/sud, y se guarda a est/ovest
    ay = K.mat_op('GREATER_THAN', K.mat_op('ABSOLUTE', sn.outputs['Y']), .5)
    s = K.mat_op('ADD', K.mat_op('MULTIPLY', sep.outputs['X'], ay), K.mat_op('MULTIPLY', sep.outputs['Y'], K.mat_op('SUBTRACT', 1, ay)))
    u = K.mat_op('DIVIDE', s, 2.5); f = K.mat_op('FRACT', u); d = K.mat_op('MULTIPLY', K.mat_op('MINIMUM', f, K.mat_op('SUBTRACT', 1, f)), 2.5)
    giunto = K.mappa(d, .0, .012, 1, 0)
    pannello = K.n('ShaderNodeTexWhiteNoise'); pannello.noise_dimensions = '1D'; K.link(K.mat_op('FLOOR', u), pannello.inputs['W'])
    if mat.get('rf_nome') != 'facciata':
        giunto = K.mat_op('MULTIPLY', giunto, 0); tono = 1.0
    else: tono = K.mappa(pannello.outputs['Value'], 0, 1, .975, 1.025)
    v = K.mat_op('MULTIPLY', K.mappa(K.rumore(co, .25, 3), .3, .7, .985, 1.015), K.mappa(K.rumore(co, 9, 3), .3, .7, .985, 1.012))
    v = K.mat_op('MULTIPLY', K.mat_op('MULTIPLY', v, tono), K.mappa(giunto, 0, 1, 1, .62))
    K.link(K.hsv(base, v=v), bs.inputs['Base Color'])
    pori = K.rumore(co, 70, 4, .6)
    h = K.mat_op('SUBTRACT', K.mat_op('MULTIPLY', pori, .3), K.mat_op('MULTIPLY', giunto, 2))
    K.link(K.bump(h, .15, .006), bs.inputs['Normal']); _set(bs, rug=.86, met=0, spec=.4)

def f_intonaco(K, bs, col, rug, met, mat):
    co = K.coord()
    K.link(K.hsv(_limita(col, .62), v=K.mappa(K.rumore(co, .4, 3), .3, .7, .985, 1.015)), bs.inputs['Base Color'])
    K.link(K.bump(K.rumore(co, 60, 3), .06), bs.inputs['Normal']); _set(bs, rug=max(rug, .8), met=0, spec=.4)

def f_muro_int(K, bs, col, rug, met, mat):
    """pareti interne verniciate (produzione antracite, magazzino e uffici bianchi, V f_041, F 7464): tinta piatta con velo di variazione."""
    co = K.coord()
    K.link(K.hsv(_limita(col, .75), v=K.mappa(K.rumore(co, .5, 3), .3, .7, .975, 1.02)), bs.inputs['Base Color'])
    K.link(K.bump(K.rumore(co, 45, 3), .05), bs.inputs['Normal']); _set(bs, rug=max(.75, rug), met=0, spec=.45)

def f_pavimento(K, bs, col, rug, met, mat):
    """cemento lisciato del capannone (F 7441–7457, V): grigio medio con nuvole morbide della frattazzatura, lucido a chiazze (riflette
    le macchine), puntinato fine, giunti di taglio ogni 6 m. Niente macchie d'olio né sporco."""
    base = (.2, .198, .19) if mat.get('rf_nome') == 'pavimento' else (.24, .238, .228)
    co = K.coord(); sep = K.n('ShaderNodeSeparateXYZ'); K.link(co, sep.inputs[0])
    nuvole = K.rumore(co, .12, 4, .6); medie = K.rumore(co, .9, 3, .5); fine = K.rumore(co, 45, 2)
    v = K.mat_op('MULTIPLY', K.mappa(nuvole, .3, .7, .9, 1.08), K.mappa(medie, .3, .7, .96, 1.04))
    v = K.mat_op('MULTIPLY', v, K.mappa(fine, .35, .65, .97, 1.03))
    gx = K.mat_op('FRACT', K.mat_op('DIVIDE', sep.outputs['X'], 6)); gy = K.mat_op('FRACT', K.mat_op('DIVIDE', sep.outputs['Y'], 6))
    dx = K.mat_op('MINIMUM', gx, K.mat_op('SUBTRACT', 1, gx)); dy = K.mat_op('MINIMUM', gy, K.mat_op('SUBTRACT', 1, gy))
    giunto = K.mappa(K.mat_op('MULTIPLY', K.mat_op('MINIMUM', dx, dy), 6), 0, .006, 1, 0)
    v = K.mat_op('MULTIPLY', v, K.mappa(giunto, 0, 1, 1, .6))
    K.link(K.hsv(base, v=v), bs.inputs['Base Color'])
    K.link(K.mappa(K.mat_op('ADD', K.mat_op('MULTIPLY', nuvole, .6), K.mat_op('MULTIPLY', medie, .4)), .3, .7, .14, .4), bs.inputs['Roughness'])
    K.link(K.bump(K.mat_op('SUBTRACT', K.mat_op('MULTIPLY', fine, .15), giunto), .1, .003), bs.inputs['Normal'])  # rugosità .14–.4
    _set(bs, met=0, spec=.5)

def f_piastrelle(K, bs, col, rug, met, mat):
    """gres lucido degli uffici (F 7467–7471): lastre 60 × 60 con fuga sottile e tinta per lastra ±3 %."""
    co = K.coord(); br = K.n('ShaderNodeTexBrick', offset=0.0); K.link(co, br.inputs['Vector'])
    c = [v * .62 for v in _limita(col, .75)]   # più scuro della pagina: nelle foto il gres è grigio-beige medio, lucido
    br.inputs['Color1'].default_value = (*[v * .97 for v in c], 1); br.inputs['Color2'].default_value = (*[v * 1.03 for v in c], 1)
    br.inputs['Mortar'].default_value = (*[v * .7 for v in c], 1); br.inputs['Scale'].default_value = 1
    br.inputs['Brick Width'].default_value = .6; br.inputs['Row Height'].default_value = .6; br.inputs['Mortar Size'].default_value = .003; br.inputs['Bias'].default_value = 0
    K.link(br.outputs['Color'], bs.inputs['Base Color'])
    K.link(K.mappa(br.outputs['Factor'], 0, 1, .1, .5), bs.inputs['Roughness'])
    K.link(K.bump(br.outputs['Factor'], .1, .002), bs.inputs['Normal']); _set(bs, met=0, coat=.3, coat_rug=.05)

def f_controsoffitto(K, bs, col, rug, met, mat):
    """controsoffitto a pannelli 60 × 60 degli uffici (F 7464, 7461): grigio chiaro opaco, fuga sottile."""
    co = K.coord(); br = K.n('ShaderNodeTexBrick', offset=0.0); K.link(co, br.inputs['Vector']); c = (.68, .68, .66)
    br.inputs['Color1'].default_value = (*c, 1); br.inputs['Color2'].default_value = (*[v * 1.02 for v in c], 1)
    br.inputs['Mortar'].default_value = (*[v * .55 for v in c], 1); br.inputs['Scale'].default_value = 1
    br.inputs['Brick Width'].default_value = .6; br.inputs['Row Height'].default_value = .6; br.inputs['Mortar Size'].default_value = .004
    K.link(br.outputs['Color'], bs.inputs['Base Color']); K.link(K.bump(br.outputs['Factor'], .1, .003), bs.inputs['Normal']); _set(bs, rug=.75, met=0)

def f_lamiera_tetto(K, bs, col, rug, met, mat):
    """lastre del tetto a volte (E): grigio chiaro, grecatura fine nel bump, giunti trasversali beige ogni 6 m. Pulito."""
    co = K.coord(); sep = K.n('ShaderNodeSeparateXYZ'); K.link(co, sep.inputs[0])
    onda = K.mat_op('SINE', K.mat_op('MULTIPLY', sep.outputs['Y'], 2 * math.pi / .2))
    gy = K.mat_op('FRACT', K.mat_op('DIVIDE', sep.outputs['Y'], 6)); fascia = K.mappa(K.mat_op('ABSOLUTE', K.mat_op('SUBTRACT', gy, .5)), .0, .03, 1, 0)
    c = K.mix(K.mat_op('MULTIPLY', fascia, .55), (.58, .575, .55), (.55, .49, .39))
    # dall'interno (faccia posteriore) il soffitto è lamiera grigia scura (F 7441, 7450), non il grigio chiaro visto dal satellite
    dentro = K.n('ShaderNodeNewGeometry').outputs['Backfacing']
    c = K.mix(dentro, c, (.16, .165, .17))
    K.link(K.hsv(c, v=K.mappa(K.rumore(co, .3, 3), .3, .7, .98, 1.02)), bs.inputs['Base Color'])
    K.link(K.mappa(dentro, 0, 1, .5, .62), bs.inputs['Roughness'])
    K.link(K.bump(onda, .25, .01), bs.inputs['Normal']); _set(bs, met=.15, spec=.5)

def f_quadrotti(K, bs, col, rug, met, mat):
    co = K.coord(); br = K.n('ShaderNodeTexBrick', offset=0.0); K.link(co, br.inputs['Vector'])
    c = (.69, .62, .45)
    br.inputs['Color1'].default_value = (*[v * .96 for v in c], 1); br.inputs['Color2'].default_value = (*[v * 1.04 for v in c], 1)
    br.inputs['Mortar'].default_value = (*[v * .8 for v in c], 1); br.inputs['Scale'].default_value = 1
    br.inputs['Brick Width'].default_value = 1.0; br.inputs['Row Height'].default_value = 1.0; br.inputs['Mortar Size'].default_value = .012
    K.link(br.outputs['Color'], bs.inputs['Base Color']); K.link(K.bump(br.outputs['Factor'], .15, .004), bs.inputs['Normal']); _set(bs, rug=.88, met=0)

def f_membrana(K, bs, col, rug, met, mat):
    co = K.coord()
    K.link(K.hsv(_limita(col), v=K.mappa(K.rumore(co, 1.5, 3), .3, .7, .94, 1.06)), bs.inputs['Base Color'])
    K.link(K.bump(K.rumore(co, 120, 3), .15), bs.inputs['Normal']); _set(bs, rug=.85, met=0)

def f_segnaletica(K, bs, col, rug, met, mat):
    co = K.coord()
    K.link(K.hsv(_limita(col, .8), v=K.mappa(K.rumore(co, 3, 3), .3, .7, .96, 1.03)), bs.inputs['Base Color'])
    _set(bs, rug=.5, met=0)

def f_prato(K, bs, col, rug, met, mat):
    """prato più vivo delle viste di Google Earth ma non brillante: due verdi a chiazze, puntinato dei fili, rilievo fine."""
    co = K.coord(); mp = K.n('ShaderNodeMapping'); K.link(co, mp.inputs['Vector'])
    grandi = K.rumore(mp.outputs['Vector'], .05, 4, .6); medie = K.rumore(mp.outputs['Vector'], .7, 3, .5); fili = K.rumore(mp.outputs['Vector'], 60, 2, .7)
    c = K.mix(K.mappa(grandi, .35, .65), (.07, .105, .035), (.12, .14, .055))
    c = K.mix(K.mappa(medie, .55, .8, 0, .5), c, (.16, .15, .075))           # zone un po' più secche
    c = K.hsv(c, v=K.mappa(fili, .3, .7, .82, 1.15))
    K.link(c, bs.inputs['Base Color']); K.link(K.bump(fili, .35, .01), bs.inputs['Normal']); _set(bs, rug=.92, met=0, spec=.3, sheen=.2)

def f_asfalto(K, bs, col, rug, met, mat):
    co = K.coord(); vo = K.n('ShaderNodeTexVoronoi'); K.link(co, vo.inputs['Vector']); vo.inputs['Scale'].default_value = 260
    g = K.n('ShaderNodeRGBToBW'); K.link(vo.outputs['Color'], g.inputs['Color'])
    v = K.mat_op('MULTIPLY', K.mappa(g.outputs['Val'], 0, 1, .75, 1.25), K.mappa(K.rumore(co, .2, 3), .3, .7, .92, 1.06))
    K.link(K.hsv((.055, .056, .058), v=v), bs.inputs['Base Color'])
    K.link(K.bump(vo.outputs['Distance'], .25, .003), bs.inputs['Normal']); _set(bs, rug=.9, met=0, spec=.4)

def f_autobloccanti(K, bs, col, rug, met, mat):
    """piazzali in autobloccanti grigi (F 7465, E): masselli 24 × 12 cm a correre, fuga sottile, tinta per massello ±8 %."""
    co = K.coord(); br = K.n('ShaderNodeTexBrick', offset=.5); K.link(co, br.inputs['Vector'])
    c = (.2, .195, .185)
    br.inputs['Color1'].default_value = (*[v * .9 for v in c], 1); br.inputs['Color2'].default_value = (*[v * 1.1 for v in c], 1)
    br.inputs['Mortar'].default_value = (*[v * .55 for v in c], 1); br.inputs['Scale'].default_value = 1; br.inputs['Bias'].default_value = 0
    br.inputs['Brick Width'].default_value = .24; br.inputs['Row Height'].default_value = .12; br.inputs['Mortar Size'].default_value = .004
    fine = K.rumore(co, 80, 2)
    K.link(K.hsv(br.outputs['Color'], v=K.mappa(fine, .3, .7, .92, 1.08)), bs.inputs['Base Color'])
    K.link(K.bump(K.mat_op('SUBTRACT', K.mat_op('MULTIPLY', fine, .2), br.outputs['Factor']), .25, .004), bs.inputs['Normal']); _set(bs, rug=.86, met=0)

def f_foglie(K, bs, col, rug, met, mat):
    """chiome: colore per vertice della pagina reso un po' più vivo, ciuffi di foglie nel rilievo (Voronoi), traslucenza leggera."""
    co = K.coord()
    if mat.get('rf_vc'):
        vc = K.n('ShaderNodeVertexColor'); vc.layer_name = 'col'; c = vc.outputs['Color']
    else: c = tuple(col)
    c = K.hsv(c, v=1.55, s=1.25)
    vo = K.n('ShaderNodeTexVoronoi'); K.link(co, vo.inputs['Vector']); vo.inputs['Scale'].default_value = 7
    K.link(K.hsv(c, v=K.mappa(vo.outputs['Distance'], 0, .8, 1.15, .7), h=K.mappa(K.rumore(co, .6, 2), .3, .7, .485, .515)), bs.inputs['Base Color'])
    K.link(K.bump(K.mat_op('ADD', vo.outputs['Distance'], K.mat_op('MULTIPLY', K.rumore(co, 30, 3), .4)), .7, .05), bs.inputs['Normal'])
    _set(bs, rug=.6, met=0, sss=.12, spec=.35)

def f_corteccia(K, bs, col, rug, met, mat):
    co = K.coord(); mp = K.n('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (6, 6, .6); K.link(co, mp.inputs['Vector'])
    r = K.rumore(mp.outputs['Vector'], 4, 4, .6, 2)
    K.link(K.hsv(col, v=K.mappa(r, .3, .7, .75, 1.1)), bs.inputs['Base Color']); K.link(K.bump(r, .5, .01), bs.inputs['Normal']); _set(bs, rug=.9, met=0)

def f_auto(K, bs, col, rug, met, mat):
    _set(bs, col=_limita(col, .8), rug=.32, met=.45, coat=1, coat_rug=.03)

def f_auto_dettagli(K, bs, col, rug, met, mat):
    vc = K.n('ShaderNodeVertexColor'); vc.layer_name = 'col'; K.link(vc.outputs['Color'], bs.inputs['Base Color']); _set(bs, rug=.35, met=.1, coat=.5)

def _vetro_eevee(mat):
    mat.surface_render_method = 'DITHERED'; mat.use_raytrace_refraction = True; mat.thickness_mode = 'SLAB'

def f_vetro(K, bs, col, rug, met, mat):
    c = [min(1, v * 1.6 + .25) for v in col[:3]]
    _set(bs, col=c, rug=.02, met=0, trasm=1, ior=1.5, thin=True); _vetro_eevee(mat)

def f_vetro_facciata(K, bs, col, rug, met, mat):
    """facciata continua degli uffici (F 7465): vetro a controllo solare grigio-azzurro, riflettente."""
    _set(bs, col=(.42, .5, .56), rug=.03, met=0, trasm=.75, ior=1.6, thin=True, spec=.8); _vetro_eevee(mat)

def f_vetro_scuro(K, bs, col, rug, met, mat):
    _set(bs, col=(.12, .15, .18), rug=.04, met=0, trasm=.55, ior=1.55, thin=True); _vetro_eevee(mat)

def f_policarbonato(K, bs, col, rug, met, mat):
    _set(bs, col=(.9, .92, .93), rug=.35, met=0, trasm=1, ior=1.58, thin=True); _vetro_eevee(mat)

def f_film(K, bs, col, rug, met, mat):
    _set(bs, col=(.85, .9, .93), rug=.2, met=0, trasm=.85, ior=1.4, thin=True, alpha=.6); _vetro_eevee(mat)

def f_particelle(K, bs, col, rug, met, mat):
    a = mat.get('rf_trasp', 1.0)
    _set(bs, col=_limita(col, .85), rug=1, met=0, alpha=a * .6); mat.surface_render_method = 'BLENDED'; mat.use_transparent_shadow = True

def f_percorso(K, bs, col, rug, met, mat):
    _set(bs, col=col, rug=.6, met=0, alpha=mat.get('rf_trasp', 1.0), emi_col=col, emi=.4); mat.surface_render_method = 'BLENDED'

def f_emissivo(K, bs, col, rug, met, mat):
    e = list(mat.get('rf_emi', [0, 0, 0])); e = e if sum(e) > 0 else list(col)
    m = max(e[:3]) or 1; e = [v / m for v in e[:3]]
    _set(bs, col=_limita(col, .8), rug=.4, met=0, emi_col=e, emi=EMISSIONE.get(mat.get('rf_nome'), 5))

def f_schermo(K, bs, col, rug, met, mat):
    _set(bs, col=(.01, .012, .015), rug=.12, met=0, coat=.6, coat_rug=.02, emi_col=_limita([v * 3 for v in col], 1), emi=1.5)

def f_texture(K, bs, col, rug, met, mat):
    """scritte, loghi, targa e tavole disegnati dal codice: l'immagine resta, la superficie diventa vernice/carta."""
    im = next((n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE'), None)
    return im

COSTRUTTORI = {k[2:]: v for k, v in globals().items() if k.startswith('f_')}

def rifai(mat):
    fam = famiglia(mat)
    col = list(mat.get('rf_colore', [.8, .8, .8])); rug = float(mat.get('rf_rug', .5)); met = float(mat.get('rf_met', 0))
    mat['rf_famiglia'] = fam
    if fam == 'texture':   # tiene l'albero dell'importazione (immagine × colore) e ritocca solo la superficie
        bs = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); _set(bs, rug=.45 if mat.get('rf_nome') == 'loghi' else .7, coat=.1)
        return fam
    bs, out = _nuovo_albero(mat); K = Nodi(mat)
    mat.surface_render_method = 'DITHERED'
    COSTRUTTORI[fam](K, bs, col, rug, met, mat)
    return fam

def applica_materiali():
    conta = {}
    for mat in bpy.data.materials:
        if not mat.name.startswith('rf.'): continue
        fam = rifai(mat); conta[fam] = conta.get(fam, 0) + 1
    return conta
