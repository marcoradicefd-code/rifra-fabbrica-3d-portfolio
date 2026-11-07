# Ricostruisce in Blender la scena esportata da build/tools/blender/esporta-scena.js (blender/scena/scena.json + tex/) e, se c'è,
# l'involucro (tetto, muri pieni, vetrate) esportato da blender/realismo_involucro.js (scena/involucro.json + tex_involucro/).
# Proprietario: agente del realismo (01/10). Versione precedente: archivio/blender-importa-2026-10-01-prima-del-realismo.py.
# Assi: three.js ha y in alto, Blender z in alto. (x, y, z)three → (x, −z, y)blender: x = est, −z three (nord) = +y Blender.
#
# Per ogni mesh (ricerca/BLENDER-TECNICHE.md § 2.1 e § 6, priorità 1 e 3):
# 1. materiali con un NOME: l'«atlante» della pagina (un materiale con colore/rugosità/metallo per vertice) si divide in slot, uno per
#    materiale d'origine, riconosciuto confrontando la terna (colore, rugosità, metallo) con le tinte S(...) di 3d/js/materiali.js,
#    macchine.js e uffici.js (solo lette). Così realismo.py dà a ogni superficie il suo materiale procedurale (vernice Biesse,
#    cemento, gomma…). I colori per vertice veri (chiome, dettagli delle auto) passano al dominio «face corner» PRIMA della saldatura.
# 2. saldatura dei vertici (three.js li divide per faccia), triangoli → quad, ombreggiatura liscia con spigoli vivi oltre 30°;
# 3. smusso: modificatore Bevel a «peso» (1 = muri e facciate, 15 mm; 0,35 = macchine e arredi, ~5 mm; 0 = vetri, righe a terra,
#    alberi, spigoli non manifold) con harden normals, applicato subito (nessun modificatore «vivo» nel file).
# Oggetti con rf_mobile=True (animazione.py): restano oggetti separati, con la stessa origine/matrice e la stessa forma; cambiano solo
# saldatura, smussi e materiali. rf_id = uuid three.js della pagina esportata.
import bpy, bmesh, json, os, re, base64, math, time
import numpy as np
from mathutils import Matrix, Quaternion, Vector

QUI = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(QUI, '..', '3d', 'js')
C4 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))          # three → Blender
LARGHEZZA_SMUSSO = .015        # m a peso 1 (muri); le macchine hanno peso .35 → ~5 mm
ARCH = {'facciata', 'bordoFacciata', 'testaFacciata', 'internoAntracite', 'internoBianco', 'biancoCaldo', 'tettoChiaro', 'tettoScuro',
        'stanza', 'cabina', 'bianca', 'scura', 'tetto', 'tettoPiano'}
SENZA_SMUSSO = {'righeGialle', 'righeBianche', 'righeArancio', 'rossoPercorso', 'lineaRossa', 'chioma', 'fogliame', 'tronco', 'siepe',
                'vetro', 'vetroScuro', 'vetroUffici', 'vetroInterno', 'vetroChiaro', 'lucernario', 'film', 'nebbia', 'percorso', 'alone',
                'polvere', 'prato', 'asfalto', 'autobloccanti', 'pavimento', 'pavMagazzino', 'pavUffici', 'pavPrimo', 'loghi', 'targa',
                'tavole', 'foto', 'schermo', 'luce', 'lucePorta', 'pianta'}

# ---------- tavolozza: nome → (colore lineare, rugosità, metallo), letta dai sorgenti della pagina ----------
def _lin(h):
    c = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
    return [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c]

def _hex(c):
    return '%02x%02x%02x' % tuple(int(round((v * 12.92 if v <= .0031308 else 1.055 * v ** (1 / 2.4) - .055) * 255)) for v in (min(1, max(0, x)) for x in c[:3]))

def tavolozza():
    voci = []
    for f, r0 in (('materiali.js', .6), ('macchine.js', .5), ('uffici.js', .6)):
        testo = open(os.path.join(JS, f), encoding='utf-8').read()
        for m in re.finditer(r'(\w+):\s*S\((0x[0-9a-fA-F]{6})(?:,\s*([\d.]+))?(?:,\s*([\d.]+))?', testo):
            voci.append((m.group(1), _lin(int(m.group(2), 16)), float(m.group(3) or r0), float(m.group(4) or 0)))
    # materiali non «S» (fisici, emissivi, trasparenti): valori copiati dalle righe dei sorgenti (materiali.js, macchine.js, uffici.js, reparti.js, main.js)
    for nome, h, r, mt in (('laccato', 0x17181c, .18, 0), ('vetro', 0x9fb4c2, .05, 0), ('vetroScuro', 0x1d2530, .08, .2), ('film', 0xcfe3f0, .2, 0),
                           ('vetroChiaro', 0xc9d3d8, .05, 0), ('lucePorta', 0xfff1d6, .5, 0), ('luceRossa', 0xff5a4a, .5, 0), ('luce', 0xfff3dc, .5, 0),
                           ('schermo', 0x0c1a28, .3, 0), ('lampadaRossa', 0xd3232f, .4, 0), ('lampadaGialla', 0xe8a21a, .4, 0), ('lampadaVerde', 0x3fae49, .4, 0),
                           ('polvere', 0xe2d6c0, 1, 0), ('nebbia', 0xe9e5dc, .6, 0), ('nebbia', 0xe4e7ea, .6, 0), ('alone', 0xff6a50, .6, 0),
                           ('percorso', 0xb3262c, .6, 0), ('lucernario', 0xdfe8ee, .15, 0)):
        voci.append((nome, _lin(h), r, mt))
    return voci

# tinte che nella pagina hanno una texture o i colori per vertice: un materiale a tinta unita non può essere loro (es. asfalto e chioma
# sono entrambe S(0xffffff, .95): la chioma ha i colori per vertice, l'asfalto la texture)
CON_MAPPA = {'pavimento', 'pavMagazzino', 'facciata', 'tetto', 'tettoPiano', 'asfalto', 'autobloccanti', 'prato', 'mdf'}
CON_VC = {'chioma', 'dettagliAuto'}

def riconosci(voci, col, rug, met, tolC=.006, vc=False):
    best, bd = None, 1e9
    for nome, c, r, m in voci:
        if nome in CON_MAPPA or (nome in CON_VC) != vc: continue
        d = max(abs(a - b) for a, b in zip(col, c))
        if d <= tolC and abs(r - rug) < .006 and abs(m - met) < .006 and d < bd: best, bd = nome, d
    return best

# ---------- materiali (base: Principled con i valori della pagina; realismo.py rifà i nodi secondo rf_nome) ----------
class Materiali:
    def __init__(self, cartella, D, voci):
        self.c, self.D, self.voci, self.cache, self.img = cartella, D, voci, {}, {}

    def immagine(self, info):
        if not info: return None
        t = self.D['tex'].get(info['id'])
        if not t or not t.get('file'): return None
        if info['id'] not in self.img:
            im = bpy.data.images.load(os.path.join(self.c, t['file']), check_existing=True)
            im.colorspace_settings.name = 'sRGB' if t['srgb'] else 'Non-Color'; self.img[info['id']] = im
        return self.img[info['id']]

    def nome_texture(self, m):
        # superfici con texture disegnata dal codice: si riconoscono da rugosità/metallo/ripetizione (materiali.js creaMateriali)
        r, mt, rep = round(m['rug'], 2), round(m['met'], 2), m['map']['rep'][0]
        if abs(rep - 1 / 6) < 1e-3: return 'pavMagazzino' if m['colore'][0] < .95 else 'pavimento'
        if m['nmap'] and r == .9: return 'facciata'
        if m['nmap'] and r == .55 and mt == .15: return 'tetto'
        tab = {1.0: 'prato', .95: 'asfalto', .78: 'mdf', .45: 'loghi', .6: 'targa', .5: 'foto'}
        if r in tab: return tab[r]
        if r == .9:   # autobloccanti, tetto piano a quadrotti o tavole di progetto: decide la tinta media della texture
            im = self.immagine(m['map']); px = np.empty(len(im.pixels), dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(-1, 4)
            mr, mg, mb = px[:, :3].mean(0); sd = px[:, :3].std()
            if mr > .85 and sd > .08: return 'tavole'
            return 'tettoPiano' if mr - mb > .08 else 'autobloccanti'
        return 'texture'

    def nome(self, m):
        if m['map']: return self.nome_texture(m)
        return riconosci(self.voci, list(m['colore']), m['rug'], m['met'], vc=bool(m['vc'])) or 'tinta_' + _hex(m['colore'])

    def crea(self, chiave, nome, m, col, rug, met, tinta=None):
        if chiave in self.cache: return self.cache[chiave]
        etichetta = 'rf.' + nome + ('.t' + _hex(tinta) if tinta else '')
        if m and m['map'] and nome in ('loghi', 'targa', 'tavole', 'foto', 'texture'): etichetta += '.' + m['map']['id'][:4]
        mat = bpy.data.materials.get(etichetta)
        if mat is None:
            mat = bpy.data.materials.new(etichetta); nt = mat.node_tree; N = nt.nodes; L = nt.links
            bs = N['Principled BSDF']; c = [a * b for a, b in zip(col, tinta)] if tinta else list(col)
            bs.inputs['Base Color'].default_value = (*c, 1); bs.inputs['Roughness'].default_value = rug; bs.inputs['Metallic'].default_value = met
            mat['rf_nome'] = nome; mat['rf_colore'] = c; mat['rf_rug'] = rug; mat['rf_met'] = met
            mat['rf_vc'] = bool(m and m['vc']); mat['rf_trasp'] = float(m['opac']) if (m and m['trasp'] and m['opac'] < 1) else 1.0
            mat['rf_emi'] = [v * m['emiI'] for v in m['emi']] if m else [0, 0, 0]; mat['rf_base'] = bool(m and m['base'])
            if m and m['vc']:
                ca = N.new('ShaderNodeVertexColor'); ca.layer_name = 'col'
                mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
                mix.inputs['A'].default_value = (*c, 1); L.new(ca.outputs['Color'], mix.inputs['B']); L.new(mix.outputs['Result'], bs.inputs['Base Color'])
            im = self.immagine(m['map']) if m else None
            if im:
                tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (m['map']['rep'][0], m['map']['rep'][1], 1)
                mp.inputs['Location'].default_value = (m['map']['off'][0], m['map']['off'][1], 0); L.new(tc.outputs['UV'], mp.inputs['Vector'])
                ti = N.new('ShaderNodeTexImage'); ti.name = 'rf_mappa'; ti.image = im; L.new(mp.outputs['Vector'], ti.inputs['Vector'])
                mix2 = N.new('ShaderNodeMix'); mix2.data_type = 'RGBA'; mix2.blend_type = 'MULTIPLY'; mix2.inputs['Factor'].default_value = 1
                mix2.inputs['A'].default_value = (*c, 1); L.new(ti.outputs['Color'], mix2.inputs['B']); L.new(mix2.outputs['Result'], bs.inputs['Base Color'])
            if m and sum(m['emi']) > 0:
                bs.inputs['Emission Color'].default_value = (*m['emi'], 1); bs.inputs['Emission Strength'].default_value = m['emiI'] * 3
            if mat['rf_trasp'] < 1:
                bs.inputs['Alpha'].default_value = mat['rf_trasp']; mat.surface_render_method = 'BLENDED'
            if m and m['base']:   # MeshBasicMaterial (nebbie, segni): solo emissione, niente luce
                bs.inputs['Emission Color'].default_value = (*c, 1); bs.inputs['Emission Strength'].default_value = .6
        self.cache[chiave] = mat; return mat

# ---------- mesh ----------
def _peso(nome):
    if nome in SENZA_SMUSSO: return 0.0
    return 1.0 if nome in ARCH else .35

def prepara(mesh, pesi_mat):
    """saldatura, quad, spigoli vivi > 30°, peso di smusso per spigolo (0 se non manifold, troppo corto o fra materiali senza smusso)."""
    bm = bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.join_triangles(bm, faces=bm.faces, cmp_seam=False, cmp_sharp=False, cmp_uvs=True, cmp_vcols=True, cmp_materials=True,
                             angle_face_threshold=math.radians(1.0), angle_shape_threshold=math.radians(180))
    bw = bm.edges.layers.float.get('bevel_weight_edge') or bm.edges.layers.float.new('bevel_weight_edge')
    soglia = math.radians(30); n = 0
    for f in bm.faces: f.smooth = True
    for e in bm.edges:
        lf = e.link_faces
        if len(lf) != 2: e.smooth = False; continue
        if e.calc_face_angle(0.0) > soglia:
            e.smooth = False
            w = min(pesi_mat[lf[0].material_index], pesi_mat[lf[1].material_index])
            if w > 0 and e.calc_length() > .02: e[bw] = w; n += 1
    bm.to_mesh(mesh); bm.free()
    return n

def costruisci_mesh(me, mats, D):
    f32 = lambda s: np.frombuffer(base64.b64decode(s), dtype=np.float32) if s else None
    u32 = lambda s: np.frombuffer(base64.b64decode(s), dtype=np.uint32) if s else None
    pos = f32(me['pos']).reshape(-1, 3); n = len(pos)
    idx = u32(me['idx']); idx = idx if idx is not None else np.arange(n, dtype=np.uint32)
    nt = len(idx) // 3; li = idx[:nt * 3].astype(np.int64)
    mesh = bpy.data.meshes.new(me['nome']); mesh.vertices.add(n); mesh.vertices.foreach_set('co', pos.ravel())
    mesh.loops.add(nt * 3); mesh.polygons.add(nt)
    mesh.loops.foreach_set('vertex_index', li.astype(np.int32))
    mesh.polygons.foreach_set('loop_start', np.arange(0, nt * 3, 3, dtype=np.int32)); mesh.polygons.foreach_set('loop_total', np.full(nt, 3, dtype=np.int32))
    col = None
    if me['col']:
        col = f32(me['col']).reshape(-1, me['colN'])
        if me['colN'] == 3: col = np.hstack([col, np.ones((n, 1), dtype=np.float32)])
    rm = f32(me['rm']).reshape(-1, 2) if me['rm'] else None
    tinta = me.get('tinta')
    # slot di materiale per faccia: gruppi della mesh; l'atlante si divide per terna (colore, rugosità, metallo)
    slot, nomi, mi, usa_vc = {}, [], np.zeros(nt, dtype=np.int32), False
    def slot_di(chiave, crea):
        if chiave not in slot:
            mat = crea(); slot[chiave] = len(nomi); nomi.append(mat['rf_nome']); mesh.materials.append(mat)
        return slot[chiave]
    for st, cnt, mid in me['gruppi']:
        m = D['mats'][mid]; f0, f1 = st // 3, min(nt, (st + cnt) // 3)
        if f1 <= f0: continue
        if m['atlante'] and col is not None and rm is not None:
            v0 = li[f0 * 3:f1 * 3:3]
            k = np.round(np.hstack([col[v0, :3], rm[v0]]) * 4000).astype(np.int64)
            uniche, inv = np.unique(k, axis=0, return_inverse=True); inv = inv.ravel(); parte = mi[f0:f1]
            for j, u in enumerate(uniche):
                c3, r, mt = (u[:3] / 4000).tolist(), u[3] / 4000, u[4] / 4000
                nome = riconosci(mats.voci, c3, r, mt) or 'tinta_' + _hex(c3)
                ch = ('A', nome, tuple(u.tolist()))
                parte[inv == j] = slot_di(ch, lambda: mats.crea(ch, nome, None, c3, r, mt))
        else:
            nome = mats.nome(m); ch = (mid, nome, tuple(round(v, 4) for v in tinta) if tinta else None)
            mi[f0:f1] = slot_di(ch, lambda: mats.crea(ch, nome, m, m['colore'], m['rug'], m['met'], tinta))
            usa_vc = usa_vc or m['vc']
    mesh.polygons.foreach_set('material_index', mi)
    if me['uv']:
        uv = f32(me['uv']).reshape(-1, 2); mesh.uv_layers.new(name='UV').data.foreach_set('uv', uv[li].ravel())
    if usa_vc and col is not None:   # colori per vertice veri: dominio face corner prima della saldatura
        a = mesh.color_attributes.new('col', 'FLOAT_COLOR', 'CORNER'); a.data.foreach_set('color', col[li].ravel())
    mesh.validate(clean_customdata=False)
    prepara(mesh, [_peso(nm) for nm in nomi] or [0.0])
    mesh.update()
    return mesh

def _collezione(nome, padre=None):
    coll = bpy.data.collections.get(nome) or bpy.data.collections.new(nome)
    par = padre or bpy.context.scene.collection
    if coll.name not in par.children: par.children.link(coll)
    return coll

def _importa_file(percorso, cartella, coll, voci):
    D = json.load(open(percorso, encoding='utf-8'))
    mats = Materiali(cartella, D, voci); oggetti = []
    for me in D['mesh']:
        mesh = costruisci_mesh(me, mats, D)
        M = C4 @ Matrix([me['M'][0:4], me['M'][4:8], me['M'][8:12], me['M'][12:16]]).transposed()
        ob = bpy.data.objects.new(me['nome'], mesh); ob.matrix_world = M; coll.objects.link(ob)
        ob['rf_id'] = me.get('id', ''); ob['rf_mobile'] = bool(me.get('din', False))   # per animazione.py
        ob.visible_shadow = bool(me.get('ombra', True))
        oggetti.append((ob, me))
    return D, oggetti

def _riquadro(o):
    bb = [o.matrix_world @ Vector(v) for v in o.bound_box]
    return tuple(min(v[i] for v in bb) for i in range(3)) + tuple(max(v[i] for v in bb) for i in range(3))

def smussa(oggetti):
    """Bevel a peso, poi applicato (mesh nuove con le normali «hardened»); gli oggetti senza spigoli pesati restano come sono."""
    con = []
    for ob in oggetti:
        a = ob.data.attributes.get('bevel_weight_edge')
        if a is None or not len(ob.data.edges): continue
        w = np.empty(len(ob.data.edges), dtype=np.float32); a.data.foreach_get('value', w)
        if not (w > 0).any(): continue
        md = ob.modifiers.new('rf_smusso', 'BEVEL'); md.limit_method = 'WEIGHT'; md.edge_weight = 'bevel_weight_edge'
        md.width = LARGHEZZA_SMUSSO; md.segments = 2; md.use_clamp_overlap = True; md.harden_normals = True
        md.miter_outer = 'MITER_ARC'; md.face_strength_mode = 'FSTR_AFFECTED'
        con.append(ob)
    dg = bpy.context.evaluated_depsgraph_get(); scartati = []
    for ob in con:
        nuova = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        # guardia (01/10): su facce degeneri il bevel può lanciare vertici a distanze enormi (una linea scura attraversava il prato,
        # oggetto statico della tappa 12). Se il risultato esce dall'ingombro originale di oltre 5 cm, si tiene la mesh senza smusso.
        a = np.empty(len(ob.data.vertices) * 3); ob.data.vertices.foreach_get('co', a); a = a.reshape(-1, 3)
        b = np.empty(len(nuova.vertices) * 3); nuova.vertices.foreach_get('co', b); b = b.reshape(-1, 3)
        if not len(b) or not np.isfinite(b).all() or (b.min(0) < a.min(0) - .05).any() or (b.max(0) > a.max(0) + .05).any():
            ob.modifiers.clear(); bpy.data.meshes.remove(nuova); scartati.append(ob.name); continue
        vecchia = ob.data; ob.modifiers.clear(); ob.data = nuova; nuova.name = vecchia.name; bpy.data.meshes.remove(vecchia)
    if scartati: print('[importa] smusso scartato (geometria fuori ingombro):', ', '.join(scartati))
    return len(con) - len(scartati)

def importa(cartella, nome_coll='RiFRA'):
    t0 = time.time(); voci = tavolozza()
    coll = _collezione(nome_coll)
    for o in list(coll.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    D, oggetti = _importa_file(os.path.join(cartella, 'scena.json'), cartella, coll, voci)
    tutti = [o for o, _ in oggetti]
    # involucro (tetto, muri pieni, vetrate, scritte RiFRA): collezione a parte, spenta di default (la tavola della pagina è in sezione).
    # I muri bassi della sezione che l'involucro sostituisce passano nella collezione «RF_Sezione» (accesa di default).
    inv = os.path.join(cartella, 'involucro.json')
    if os.path.exists(inv):
        ci = _collezione('RF_Involucro', coll); cs = _collezione('RF_Sezione', coll)
        _, ogg_i = _importa_file(inv, cartella, ci, voci)
        tutti += [o for o, _ in ogg_i]
        riq = [(o2, _riquadro(o2)) for o2, m2 in oggetti if not m2['din']]
        spostati = 0
        for ob, me in ogg_i:
            ob['rf_involucro'] = True
            if not me.get('basso'): continue
            b = me['basso']; bl = (b[0], -b[5], b[1], b[3], -b[2], b[4])        # three → Blender: x, −z, y
            for o2, r2 in riq:
                if coll in o2.users_collection and all(abs(p - q) < .03 for p, q in zip(r2, bl)):
                    coll.objects.unlink(o2); cs.objects.link(o2); o2['rf_sezione'] = True; spostati += 1
        print('[importa] involucro', len(ogg_i), 'mesh; muri bassi della sezione riconosciuti', spostati)
        involucro(False)
    print('[importa] mesh', len(tutti), 'materiali', len([m for m in bpy.data.materials if m.name.startswith('rf.')]), round(time.time() - t0, 1), 's')
    n = smussa(tutti)
    print('[importa] smussati', n, 'oggetti', round(time.time() - t0, 1), 's')
    return D

def involucro(acceso):
    """True = fabbrica chiusa (tetto, muri pieni, vetrate: esterni e interni ad altezza d'occhio); False = sezione della tavola."""
    ci, cs = bpy.data.collections.get('RF_Involucro'), bpy.data.collections.get('RF_Sezione')
    if ci: ci.hide_render = ci.hide_viewport = not acceso
    if cs: cs.hide_render = cs.hide_viewport = bool(acceso)
    bpy.context.scene['rf_involucro'] = bool(acceso)

def luce_e_camera(D):
    sc = bpy.context.scene
    # sole come la pagina (sud-ovest, alto) e cielo fisico; realismo.py rifinisce intensità, esposizione e luci interne
    sun = bpy.data.objects.get('Sole')
    if not sun:
        sun = bpy.data.objects.new('Sole', bpy.data.lights.new('Sole', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.data.angle = math.radians(1.5); sun.rotation_euler = (math.radians(42), 0, math.radians(-35))
    w = sc.world or bpy.data.worlds.new('Mondo'); sc.world = w; N = w.node_tree.nodes; N.clear()
    sky = N.new('ShaderNodeTexSky'); bg = N.new('ShaderNodeBackground'); out = N.new('ShaderNodeOutputWorld')
    sky.sky_type = 'MULTIPLE_SCATTERING'; sky.sun_elevation = math.radians(48); sky.sun_rotation = math.radians(215)
    bg.inputs['Strength'].default_value = .35; w.node_tree.links.new(sky.outputs[0], bg.inputs[0]); w.node_tree.links.new(bg.outputs[0], out.inputs[0])
    # camera = inquadratura della pagina
    cam = bpy.data.objects.get('Camera RiFRA')
    if not cam:
        cam = bpy.data.objects.new('Camera RiFRA', bpy.data.cameras.new('Camera RiFRA')); sc.collection.objects.link(cam)
    c = D['camera']; p = c['pos']; q = c['quat']
    C3 = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
    R = C3 @ Quaternion((q[3], q[0], q[1], q[2])).to_matrix()
    cam.matrix_world = Matrix.Translation((p[0], -p[2], p[1])) @ R.to_4x4()
    cam.data.sensor_fit = 'VERTICAL'; cam.data.angle_y = math.radians(c['fov']); cam.data.clip_end = 2000
    sc.camera = cam; sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.engine = 'BLENDER_EEVEE'
    sc.view_settings.view_transform = 'AgX'
