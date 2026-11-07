# Modulo «spot»: spot della fabbrica RiFRA, 50 s a 30 fps (fotogrammi 1–1500, le animazioni coprono t = 0–50 s), 12 inquadrature:
# campi larghi alternati a riprese ravvicinate (3–6 m) sulle persone al lavoro, camere con accelerazione e frenata dolci (seno),
# profondità di campo, sfocatura di movimento; titoli sobri in Instrument Serif (font del sito RiFRA) con una riga sottile, chiusura con
# il logo vettoriale (build/brand/logo-bianco.svg). Dissolvenza dal nero all'inizio: la fa ffmpeg al montaggio (monta_spot.sh).
# Coordinate: (x, z three, altezza) → Blender (x, −z, altezza). Posizioni delle persone lette dal .blend (render/dove_persone.py).
import bpy, os, math
from mathutils import Vector

FPS = 30
TITOLI_3D = False   # i titoli si aggiungono nitidi al montaggio (monta_spot.py): in 3D la profondità di campo li sfocava
# [inizio s, fine s, camera da, camera a, bersaglio, focale mm, titolo, sottotitolo]
SHOT = [
    (0.0, 5.0, (-35, 90, 60), (-10, 72, 42), (36, 22, 0), 30, 'RiFRA', 'Gerno di Lesmo · produzione in sede dal 1977'),
    (5.0, 7.0, (-6, 18, 8), (-4.5, 17, 7.2), (4, 6, 1.4), 35, '', ''),
    (7.0, 9.5, (6.6, 5.0, 3.5), (9.4, 5.0, 3.3), (9.1, 1.5, 1.35), 30, 'Progettata su misura', 'Ufficio tecnico'),
    (9.5, 13.0, (64.5, 44.5, 3.4), (62.2, 44.8, 3.0), (59.5, 37.5, 1.2), 40, 'Tagliato a misura', 'Sezionatrice verticale'),
    (13.0, 16.5, (43.5, 41.5, 3.4), (46, 41.8, 3.0), (44.5, 34.5, 1.1), 38, '', ''),
    (16.5, 20.5, (31, 47, 7.5), (37.5, 47.5, 6.5), (35, 38, 1.2), 32, 'Forato e fresato', 'Biesse Brema EKO 2.1 · Rover A'),
    (20.5, 24.5, (37, 36, 3.6), (40.2, 36.6, 3.2), (44.5, 28.5, 1.0), 35, 'Il bordo', 'Bordatrice Brandt'),
    (24.5, 28.0, (57, 32, 3.6), (59.2, 32.5, 3.2), (63, 25.8, 1.1), 40, 'Levigato', 'Levigatrice a nastro largo'),
    (28.0, 31.5, (50.5, 28.5, 7.6), (56.5, 26.8, 6.2), (56, 17.6, 1.0), 32, 'Laccato in casa', 'Robot Cefla Spraybotic · 4 ante per ciclo'),
    (31.5, 34.5, (66.2, 25.0, 2.9), (67.4, 24.9, 2.6), (68.6, 19.0, 1.2), 45, '', ''),
    (34.5, 37.5, (44.8, 23.8, 3.0), (46.6, 24.2, 2.7), (48.4, 17.6, 1.1), 40, '', ''),
    (37.5, 41.5, (30.8, 28.2, 3.4), (32.8, 28.6, 3.0), (34.2, 21.5, 1.1), 38, 'Il montaggio', 'Strettoio Erregi'),
    (41.5, 44.5, (8.0, 28.5, 5.6), (11.5, 29.5, 6.0), (11.5, 21.7, 1.0), 32, 'Pronta per la casa', 'Imballaggio'),
    (44.5, 50.0, (36, 60, 22), (18, 112, 72), (36, 22, 0), 30, 'Come nasce una cucina RiFRA', 'rifra.com'),
]
B = lambda p: Vector((p[0], -p[1], p[2]))

def _materiale_testo(nome, col, forza=1.0, alpha=1.0):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome); m.use_nodes = True; N = m.node_tree.nodes; N.clear()
    em = N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*col, 1); em.inputs['Strength'].default_value = forza
    out = N.new('ShaderNodeOutputMaterial')
    if alpha < 1:
        tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader'); mx.inputs['Fac'].default_value = alpha
        m.node_tree.links.new(tr.outputs[0], mx.inputs[1]); m.node_tree.links.new(em.outputs[0], mx.inputs[2]); m.node_tree.links.new(mx.outputs[0], out.inputs[0])
        m.surface_render_method = 'BLENDED'
    else: m.node_tree.links.new(em.outputs[0], out.inputs[0])
    return m

def _fcurves(ob):
    """F-curve dell'oggetto (Blender 5.x: action a strati, channelbag dello slot)."""
    ad = ob.animation_data
    if not ad or not ad.action: return []
    try:
        from bpy_extras import anim_utils
        cb = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot); return list(cb.fcurves) if cb else []
    except Exception:
        return list(getattr(ad.action, 'fcurves', []))

def _addolcisci(ob, inizi):
    """dentro ogni inquadratura: seno con accelerazione e frenata; ai tagli (ultima chiave dell'inquadratura) a gradino"""
    for fc in _fcurves(ob):
        for k in fc.keyframe_points:
            if int(round(k.co.x)) in inizi: k.interpolation = 'SINE'; k.easing = 'EASE_IN_OUT'
            else: k.interpolation = 'CONSTANT'

def _visibile(ob, f0, f1):
    for f, v in ((1, False), (f0, True), (f1 + 1, False)):
        if f < 1: continue
        ob.hide_render = not v; ob.hide_viewport = not v; ob.keyframe_insert('hide_render', frame=f); ob.keyframe_insert('hide_viewport', frame=f)

def _testo(cam, coll, testo, x, y, dim, font, mat, z=-1.0):
    cu = bpy.data.curves.new('T_' + testo[:20], 'FONT'); cu.body = testo; cu.font = font; cu.size = dim; cu.align_x = 'LEFT'
    ob = bpy.data.objects.new(cu.name, cu); coll.objects.link(ob); ob.data.materials.append(mat)
    ob.parent = cam; ob.location = (x, y, z); ob.visible_shadow = False; return ob

def _rettangolo(cam, coll, nome, x0, y0, x1, y1, mat, z):
    ob = bpy.data.objects.new(nome, bpy.data.meshes.new(nome)); coll.objects.link(ob)
    ob.data.from_pydata([(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], [], [(0, 1, 2, 3)]); ob.data.materials.append(mat)
    ob.parent = cam; ob.location = (0, 0, z); ob.visible_shadow = False; return ob

def _logo(QUI, coll, cam, mat):
    """logo RiFRA vettoriale davanti alla camera; se l'import SVG non c'è, None"""
    svg = os.path.join(QUI, 'font', 'logo-bianco.svg'); prima = set(bpy.data.objects)
    try: bpy.ops.import_curve.svg(filepath=svg)
    except Exception:
        try: bpy.ops.wm.grease_pencil_import_svg(filepath=svg)
        except Exception as e: print('[spot] logo SVG non importato:', e); return None
    nuovi = [o for o in bpy.data.objects if o not in prima and o.type == 'CURVE']
    if not nuovi: return None
    vuoto = bpy.data.objects.new('Logo RiFRA', None); coll.objects.link(vuoto)
    for o in nuovi:
        for c in o.users_collection: c.objects.unlink(o)
        coll.objects.link(o); o.parent = vuoto; o.data.materials.clear(); o.data.materials.append(mat)
    # l'SVG è 1181 × 449 unità: Blender lo importa in metri (≈ 0,0003 m/unità); centrato e scalato a 0,3 di larghezza
    import mathutils
    pts = [o.matrix_world @ Vector(c) for o in nuovi for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), 0)); mx = Vector((max(p.x for p in pts), max(p.y for p in pts), 0))
    for o in nuovi: o.location -= (mn + mx) / 2
    s = .30 / max(1e-6, mx.x - mn.x); vuoto.scale = (s, s, s); vuoto.parent = cam; vuoto.location = (0, .045, -1.0); return vuoto

def applica(QUI):
    sc = bpy.context.scene; sc.render.fps = FPS; sc.frame_start = 1; sc.frame_end = int(round(SHOT[-1][1] * FPS))
    coll = bpy.data.collections.get('Spot') or bpy.data.collections.new('Spot')
    if coll.name not in sc.collection.children: sc.collection.children.link(coll)
    for o in list(coll.objects): bpy.data.objects.remove(o, do_unlink=True)
    cam = bpy.data.objects.new('Camera spot', bpy.data.cameras.new('Camera spot')); coll.objects.link(cam)
    cam.data.sensor_width = 36; cam.data.clip_start = .05; cam.data.clip_end = 2000
    mira = bpy.data.objects.new('Mira spot', None); coll.objects.link(mira)
    tr = cam.constraints.new('TRACK_TO'); tr.target = mira; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
    cam.data.dof.use_dof = True; cam.data.dof.focus_object = mira; cam.data.dof.aperture_fstop = 4.0
    inizi = set()
    for (t0, t1, c0, c1, bers, lente, *_ ) in SHOT:
        f0, f1 = int(round(t0 * FPS)) + 1, int(round(t1 * FPS)); inizi.add(f0)
        for f, c in ((f0, c0), (f1, c1)):
            cam.location = B(c); cam.keyframe_insert('location', frame=f)
            mira.location = B(bers); mira.keyframe_insert('location', frame=f)
            cam.data.lens = lente; cam.data.keyframe_insert('lens', frame=f)
            # campi larghi nitidi, riprese ravvicinate con sfondo sfocato
            cam.data.dof.aperture_fstop = 2.8 if lente >= 38 else 5.6; cam.data.dof.keyframe_insert('aperture_fstop', frame=f)
    for ob in (cam, mira): _addolcisci(ob, inizi)
    ad = cam.data.animation_data   # focale e diaframma: a gradino, cambiano solo ai tagli
    if ad and ad.action:
        try:
            from bpy_extras import anim_utils
            for fc in anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot).fcurves:
                for k in fc.keyframe_points: k.interpolation = 'CONSTANT'
        except Exception as e: print('[spot] interpolazione obiettivo:', e)
    sc.camera = cam
    # titoli: in basso a sinistra, dal 0,4 s al 3,4 s dell'inquadratura; riga sottile sopra il titolo e velo leggero a sfumare
    fdir = os.path.join(QUI, 'font'); fr = bpy.data.fonts.load(os.path.join(fdir, 'InstrumentSerif-Regular.ttf'), check_existing=True)
    fi = bpy.data.fonts.load(os.path.join(fdir, 'InstrumentSerif-Italic.ttf'), check_existing=True)
    bianco = _materiale_testo('Titolo bianco', (1, 1, 1), 1.0); velo = _materiale_testo('Velo titolo', (0, 0, 0), 1.0, .32)
    for i, (t0, t1, c0, c1, bers, lente, titolo, sotto) in enumerate(SHOT):
        if not titolo or not TITOLI_3D: continue
        hw = 18 / lente; hh = hw * 9 / 16; k = lente / 32   # testo a dimensione costante sullo schermo anche se cambia la focale
        f0 = int(round(t0 * FPS)) + 1
        if i == len(SHOT) - 1:   # chiusura: logo, titolo e sito centrati su un velo scuro
            f0 += int(1.5 * FPS); f1 = int(round(t1 * FPS))
            pl = _rettangolo(cam, coll, 'Velo chiusura', -hw, -hh, hw, hh, _materiale_testo('Velo chiusura', (0, 0, 0), 1.0, .55), -1.02)
            lg = _logo(QUI, coll, cam, bianco); oggetti = [pl]
            if lg:
                lg.scale *= k; lg.location = (0, .05 * k, -1.0); oggetti += [lg] + list(lg.children)
            a = _testo(cam, coll, titolo, 0, -.03 * k, .048 * k, fr, bianco); a.data.align_x = 'CENTER'
            b = _testo(cam, coll, sotto, 0, -.07 * k, .026 * k, fi, bianco); b.data.align_x = 'CENTER'; oggetti += [a, b]
            for o in oggetti: _visibile(o, f0, f1)
            continue
        f0 += int(.4 * FPS); f1 = min(int(round(t1 * FPS)), f0 + int(3.0 * FPS))
        x = -hw + .055 * k; y = -hh + .07 * k
        a = _testo(cam, coll, titolo, x, y, .05 * k, fr, bianco)
        b = _testo(cam, coll, sotto, x + .002 * k, y - .035 * k, .022 * k, fi, bianco)
        riga = _rettangolo(cam, coll, 'Riga ' + titolo, x, y + .06 * k, x + .06 * k, y + .0625 * k, bianco, -1.0)
        pl = _rettangolo(cam, coll, 'Velo ' + titolo, -hw, -hh, -hw + .62 * k, -hh + .2 * k, velo, -1.005)
        for o in (a, b, riga, pl): _visibile(o, f0, f1)
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1920, 1080, 100
    sc.render.filepath = os.path.join(QUI, 'render', 'spot', 'f_'); sc.render.image_settings.file_format = 'PNG'
    sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = .5
    sc.render.motion_blur_position = 'START'   # l'otturatore si apre sul fotogramma: ai tagli di camera niente velo con l'inquadratura precedente
