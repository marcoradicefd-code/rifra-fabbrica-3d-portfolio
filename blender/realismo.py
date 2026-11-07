# Modulo «realismo»: materiali, luce, colore e impostazioni di render il più possibile fedeli alle foto. Proprietario: agente del realismo.
# Versione precedente (solo luce ed esposizione, 01/10 mattina): archivio/blender-realismo-2026-10-01-prima-del-realismo.py.
# Chiamato da costruisci.py dopo importa.importa + luce_e_camera: applica(QUI).
# Riferimenti: ricerca/BLENDER-TECNICHE.md (§ 3.2 impostazioni EEVEE, § 2.2 luce e materiali), HANDOFF § 3 (muri chiari e puliti).
# Nessun try/except che nasconde errori: se un nome delle API 5.x cambia, la costruzione si ferma con l'errore nel log.
import bpy, bmesh, math, os, time
from mathutils import Vector
import realismo_materiali, importa

# ---------- pianta (3d/js/edificio.js; Blender: y = −z della pagina) ----------
H_PROD, H_MAG, H_UFF = 7.2, 6.2, 7.6
X1, Z_PROD0, Z_PROD1 = 70.9, 12.4, 40.6
N_VOLTE = 24; BW = X1 / N_VOLTE
SOLE_DIR = Vector((-.55, -.62, .9)).normalized()          # main.js SOLE_DIR (-.55, .9, .62) → Blender (x, −z, y)
ESPOSIZIONE = -1.5                                          # AgX; tarata sulla tavola e sull'esterno sud (render in render/realismo/)
BIANCO_K = 7000                                             # illuminante dichiarato per il bilanciamento del bianco (6500 = neutro)

def _oggetto(nome, dati, coll):
    ob = bpy.data.objects.get(nome)
    if ob: bpy.data.objects.remove(ob, do_unlink=True)
    ob = bpy.data.objects.new(nome, dati); coll.objects.link(ob); return ob

def _coll(nome, padre=None):
    c = bpy.data.collections.get(nome) or bpy.data.collections.new(nome)
    p = padre or bpy.context.scene.collection
    if c.name not in p.children: p.children.link(c)
    return c

# ---------- cielo e sole ----------
def cielo_e_sole():
    sc = bpy.context.scene; w = sc.world; N = w.node_tree.nodes; L = w.node_tree.links
    sky = next(n for n in N if n.type == 'TEX_SKY'); bg = next(n for n in N if n.type == 'BACKGROUND')
    el = math.asin(SOLE_DIR.z); az = math.atan2(-SOLE_DIR.x, SOLE_DIR.y)        # Sky: direzione orizzontale (−sin r, cos r)
    sky.sky_type = 'MULTIPLE_SCATTERING'; sky.sun_elevation = el; sky.sun_rotation = az
    sky.sun_disc = False                                                       # il disco lo fa la lampada SOLE (ombre in EEVEE)
    sky.altitude = 250; sky.air_density = 1.0; sky.aerosol_density = 1.6; sky.ozone_density = 1.0   # foschia lombarda leggera
    bg.inputs['Strength'].default_value = .32
    sun = bpy.data.objects['Sole']
    sun.rotation_euler = SOLE_DIR.to_track_quat('Z', 'Y').to_euler()
    sun.data.energy = 4.2; sun.data.angle = math.radians(.8); sun.data.use_temperature = True; sun.data.temperature = 5300
    sun.data.use_shadow_jitter = False; sun.data.shadow_maximum_resolution = .001; sun.data.shadow_filter_radius = 1.5

# ---------- dettagli dell'involucro: condotte a soffitto e plafoniere LED (solo con il tetto chiuso) ----------
def _cilindro(nome, a, b, r, mat, coll, seg=24):
    me = bpy.data.meshes.new(nome); bm = bmesh.new(); L = (b - a).length
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=L)
    for f in bm.faces: f.smooth = True
    bm.to_mesh(me); bm.free(); me.materials.append(mat)
    ob = _oggetto(nome, me, coll); ob.location = (a + b) / 2; ob.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    return ob

def _scatola(nome, c, s, mat, coll):
    me = bpy.data.meshes.new(nome); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=s, verts=bm.verts)
    bm.to_mesh(me); bm.free(); me.materials.append(mat); ob = _oggetto(nome, me, coll); ob.location = c; return ob

def _mat_led():
    m = bpy.data.materials.get('rf.ledStriscia') or bpy.data.materials.new('rf.ledStriscia')
    m['rf_nome'] = 'ledStriscia'; bs, _ = realismo_materiali._nuovo_albero(m)
    realismo_materiali._set(bs, col=(.8, .8, .8), rug=.4, emi_col=(1, .97, .92), emi=18); return m

def _area(nome, c, sx, sy, energia, temp, coll, ombra=False, rot=(0, 0, 0), forma='RECTANGLE', spread=180):
    d = bpy.data.lights.new(nome, 'AREA'); d.shape = forma; d.size = sx; d.size_y = sy; d.energy = energia
    d.use_temperature = True; d.temperature = temp; d.use_shadow = ombra; d.spread = math.radians(spread)
    ob = _oggetto(nome, d, coll); ob.location = c; ob.rotation_euler = rot; return ob

def _mesh_da_poligoni(nome, poligoni, mat, coll):
    me = bpy.data.meshes.new(nome); bm = bmesh.new()
    for pts in poligoni:
        vv = [bm.verts.new(p) for p in pts]; bm.faces.new(vv)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4); bm.normal_update(); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    return _oggetto(nome, me, coll)

def _materiale(nome):
    m = bpy.data.materials.get('rf.' + nome)
    if m is None:
        m = bpy.data.materials.new('rf.' + nome); m['rf_nome'] = nome; m['rf_colore'] = [.6, .6, .58]; m['rf_rug'] = .8; m['rf_met'] = 0.0
        realismo_materiali.rifai(m)
    return m

def chiusure(ci):
    """chiude i buchi dell'involucro della pagina, che non si vedevano dall'alto ma fanno entrare il cielo negli interni:
    timpani delle 24 volte ai due capi (z 12,4 e 40,6), fascia di muro fra il tetto del magazzino (6,2 m) e la gronda della
    produzione (7,2 m) a z 12,4, controsoffitto del piano terra degli uffici a 2,8 m (F 7461–7464; il solaio del primo piano
    nella pagina compare solo nella tappa 1)."""
    fac = bpy.data.materials.get('rf.bordoFacciata'); poli = []
    for i in range(N_VOLTE):
        xa = BW * i
        for y in (-Z_PROD0, -Z_PROD1):
            arco = [(xa + BW / 2 - BW / 2 * math.cos(t), y, H_PROD + .55 * math.sin(t)) for t in (math.pi * k / 16 for k in range(17))]
            poli.append([(xa, y, H_PROD - .2)] + arco + [(xa + BW, y, H_PROD - .2)])
    _mesh_da_poligoni('RF_timpani_volte', poli, fac, ci)
    _scatola('RF_fascia_nord_produzione', (X1 / 2, -Z_PROD0 - .15, (H_MAG - .2 + H_PROD) / 2), (X1, .3, H_PROD - H_MAG + .2), fac, ci)
    _scatola('RF_controsoffitto_uffici', (10.3 / 2, -11.2 / 2, 2.82), (10.2, 11.1, .04), _materiale('controsoffitto'), ci)

def involucro_interni():
    """Luci e impianti del capannone CHIUSO (collezione RF_Involucro): lucernari (E: 12 lucernari piatti, edificio.js tetti()),
    strisce LED a soffitto (F 7441, 7442, 7444, 7453: file continue di plafoniere lineari; posizione e passo ILLUSTRATIVI),
    condotte zincate dell'aspirazione (arredi.js, V), plafoniere degli uffici (F 7461–7471, posizioni illustrative).
    In EEVEE le superfici emissive non illuminano: ogni sorgente ha la sua luce vera (area)."""
    ci = bpy.data.collections.get('RF_Involucro')
    if ci is None: return 0
    cl = _coll('RF_Involucro_luci', ci); n = 0
    zinc = bpy.data.materials.get('rf.zincatoScuro'); led = _mat_led()
    chiusure(ci)
    # condotte (arredi.js: tubo r 0,18 a H_PROD − 0,45 da x 6 a 70,6, z 19,8 / 28,5 / 36,5)
    for k, z in enumerate((19.8, 28.5, 36.5)):
        _cilindro('RF_condotta_%d' % k, Vector((6, -z, H_PROD - .45)), Vector((70.6, -z, H_PROD - .45)), .18, zinc, ci)
    # lucernari: area light sotto ciascuno, luce del cielo diffusa (6500 K), senza ombra
    for i in range(1, N_VOLTE, 4):
        for zc in (Z_PROD0 + (Z_PROD1 - Z_PROD0) * .22 + .8, Z_PROD0 + (Z_PROD1 - Z_PROD0) * .68 + .8):
            _area('RF_lucernario_%d_%d' % (i, zc), (BW * (i + .5), -zc, H_PROD + .35), BW - 1, 1.6, 350, 6500, cl); n += 1
    # file di LED lineari est–ovest (F 7441 guarda a est lungo il corridoio z 33: le file fuggono verso il fondo; F 7450 guarda a nord:
    # le file sono trasversali), appese a 6,4 m, passo ~4 m (ILLUSTRATIVO): geometria emissiva + area light lunga, ombre a file alterne
    x0, x1 = 6.0, X1 - .8; L = x1 - x0
    for k, z in enumerate(range(15, 40, 4)):
        _scatola('RF_led_%02d' % z, ((x0 + x1) / 2, -z, 6.42), (L, .07, .05), led, ci)
        _area('RF_luce_led_%02d' % z, ((x0 + x1) / 2, -z, 6.38), L, .25, 1500, 5000, cl, ombra=(k % 2 == 0)); n += 1
    # magazzino (tetto piano a 6,2 m): file di LED lungo x
    for yy in (-3.6, -7.6, -11.0):
        _scatola('RF_led_mag_%d' % int(-yy * 10), (40.5, yy, H_MAG - .55), (56, .07, .05), led, ci)
        _area('RF_luce_led_mag_%d' % int(-yy * 10), (40.5, yy, H_MAG - .6), 56, .25, 1100, 5000, cl, ombra=False); n += 1
    # uffici: piano terra (controsoffitto 2,8 m) e striscia ovest (3,2 m), luce calda 3500 K
    for x in (2.6, 7.7):
        for y in (-2.0, -5.6, -9.2):
            _area('RF_luce_uff_%d_%d' % (x * 10, -y * 10), (x, y, 2.75), 1.2, 1.2, 110, 4000, cl); n += 1
    for y in range(14, 40, 5):
        _area('RF_luce_striscia_%d' % y, (2.65, -y, 3.15), 1.2, 1.2, 110, 4000, cl); n += 1
    return n

def sezione_luci():
    """Luci per la vista in sezione (tetto tolto, tavola della pagina): nessuna luce interna, basta il cielo. Collezione vuota."""
    return 0

# ---------- sonde di luce ----------
def sonde():
    sc = bpy.context.scene
    ci = bpy.data.collections.get('RF_Involucro') or sc.collection
    cs = sc.collection
    # volume per la fabbrica chiusa: una sonda ogni ~3 m in pianta, 5 in altezza (BLENDER-TECNICHE § 2.2)
    pv = bpy.data.lightprobes.new('RF_GI_fabbrica', 'VOLUME'); pv.resolution_x, pv.resolution_y, pv.resolution_z = 24, 14, 5
    pv.bake_samples = 512; pv.capture_world = True; pv.capture_indirect = True; pv.capture_emission = False
    ob = _oggetto('RF_GI_fabbrica', pv, ci); ob.location = (X1 / 2, -20.3, 4.0); ob.scale = (X1 / 2 + .3, 20.6, 4.1)
    ps = bpy.data.lightprobes.new('RF_riflessi_capannone', 'SPHERE'); ps.influence_distance = 40
    ob2 = _oggetto('RF_riflessi_capannone', ps, ci); ob2.location = (38, -27, 3.0)
    pu = bpy.data.lightprobes.new('RF_riflessi_uffici', 'SPHERE'); pu.influence_distance = 8
    ob3 = _oggetto('RF_riflessi_uffici', pu, ci); ob3.location = (5, -5.6, 1.6)
    return [ob, ob2, ob3]

def cuoci_sonde(oggetti):
    """cottura del Light Probe Volume (luce statica: si cuoce una volta e resta nel file). Si fa con l'involucro acceso."""
    t = time.time(); prima = bpy.context.scene.get('rf_involucro', False)
    importa.involucro(True)
    for ob in oggetti:
        if ob.data.type != 'VOLUME': continue
        bpy.context.view_layer.objects.active = ob
        for o in bpy.context.view_layer.objects: o.select_set(o == ob)
        esito = bpy.ops.object.lightprobe_cache_bake(subset='ACTIVE'); print('[realismo] cottura', ob.name, esito)
    importa.involucro(prima)
    return round(time.time() - t, 1)

# ---------- render, colore, compositing ----------
def impostazioni_render(campioni=48):
    sc = bpy.context.scene; ee = sc.eevee
    sc.render.engine = 'BLENDER_EEVEE'
    ee.taa_render_samples = campioni; ee.taa_samples = 16
    ee.use_raytracing = True; ee.ray_tracing_method = 'SCREEN'
    ro = ee.ray_tracing_options; ro.resolution_scale = '2'; ro.trace_max_roughness = .5; ro.use_denoise = True; ro.use_backface_hit = True
    ro.screen_trace_quality = .25; ro.screen_trace_thickness = .2
    ee.use_fast_gi = True; ee.fast_gi_method = 'GLOBAL_ILLUMINATION'; ee.fast_gi_resolution = '2'; ee.fast_gi_step_count = 8
    ee.fast_gi_distance = 4.0; ee.fast_gi_ray_count = 2
    ee.use_shadows = True; ee.shadow_pool_size = '1024'; ee.shadow_ray_count = 1; ee.shadow_step_count = 6; ee.shadow_resolution_scale = 1.0
    ee.use_overscan = True; ee.overscan_size = .05
    ee.gi_diffuse_bounces = 3
    ee.clamp_surface_indirect = 10.0
    bpy.context.view_layer.eevee.ambient_occlusion_distance = 1.2   # (in 5.x al posto di use_gtao)
    sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = .5
    sc.render.film_transparent = False
    # colore: AgX con contrasto medio-alto (le foto di Matteo sono contrastate), esposizione tarata
    vs = sc.view_settings; vs.view_transform = 'AgX'; vs.look = 'AgX - Medium High Contrast'; vs.exposure = ESPOSIZIONE; vs.gamma = 1.0
    # bilanciamento del bianco: il cielo Multiple Scattering dà una dominante azzurra (confronto con la pagina in render/anim/v5-…):
    # si dichiara un illuminante più freddo del D65 e AgX lo neutralizza, scaldando un poco
    vs.use_white_balance = True; vs.white_balance_temperature = BIANCO_K; vs.white_balance_tint = 0.0
    sc.display_settings.display_device = 'sRGB'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'

def compositing():
    """bloom leggero sulle sorgenti (LED, cielo nei vetri) e vignettatura morbida. Niente grana pesante."""
    sc = bpy.context.scene
    ng = bpy.data.node_groups.get('RF Compositing')
    if ng: bpy.data.node_groups.remove(ng)
    ng = bpy.data.node_groups.new('RF Compositing', 'CompositorNodeTree'); ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    N, L = ng.nodes, ng.links
    rl = N.new('CompositorNodeRLayers'); rl.location = (-600, 0)
    gl = N.new('CompositorNodeGlare'); gl.location = (-350, 0); gl.inputs['Type'].default_value = 'Bloom'
    gl.inputs['Threshold'].default_value = 1.2; gl.inputs['Strength'].default_value = .18; gl.inputs['Size'].default_value = .6
    L.new(rl.outputs['Image'], gl.inputs['Image'])
    el = N.new('CompositorNodeEllipseMask'); el.location = (-350, -300); el.inputs['Size'].default_value = (1.25, 1.25)
    bl = N.new('CompositorNodeBlur'); bl.location = (-150, -300); bl.inputs['Size'].default_value = (260, 260); L.new(el.outputs['Mask'], bl.inputs['Image'])
    mr = N.new('ShaderNodeMapRange'); mr.location = (50, -300); mr.inputs['To Min'].default_value = .82; L.new(bl.outputs['Image'], mr.inputs['Value'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.location = (250, 0); mx.inputs[0].default_value = 1
    L.new(gl.outputs['Image'], next(s for s in mx.inputs if s.identifier == 'A_Color')); L.new(mr.outputs['Result'], next(s for s in mx.inputs if s.identifier == 'B_Color'))
    go = N.new('NodeGroupOutput'); go.location = (450, 0); L.new(next(o for o in mx.outputs if o.identifier == 'Result_Color'), go.inputs[0])
    sc.compositing_node_group = ng; sc.render.use_compositing = True

# ---------- ingresso ----------
def applica(QUI):
    t0 = time.time()
    conta = realismo_materiali.applica_materiali()
    print('[realismo] materiali', sum(conta.values()), dict(sorted(conta.items(), key=lambda kv: -kv[1])), round(time.time() - t0, 1), 's')
    cielo_e_sole()
    n = involucro_interni()
    print('[realismo] luci e impianti dell\'involucro', n)
    so = sonde()
    impostazioni_render()
    compositing()
    if os.environ.get('RF_CUOCI', '1') == '1':
        print('[realismo] sonde cotte in', cuoci_sonde(so), 's')
    print('[realismo] fatto', round(time.time() - t0, 1), 's')
