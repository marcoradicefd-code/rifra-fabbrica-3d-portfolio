# Prova dei personaggi (blender/personaggi.json): costruisce la scena IN MEMORIA con gli stessi moduli di costruisci.py
# (importa → animazione → realismo → spot), NON salva il .blend, mette camere TEMPORANEE e rende in blender/render/personaggi/:
#   - primi piani (volto) e figura intera di ogni personaggio;
#   - fotogrammi 200 e 300 della camera dello spot (spot.py attuale) e della camera indicata nel compito (6–11 s);
#   - controlli: visibilità dei personaggi dalla camera dello spot, compenetrazioni con gli arredi (BVH), ogni 10 fotogrammi.
# uso:  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python blender/anim/prova_personaggi.py -- [render|controlli|tutto]
import bpy, sys, os, json, math, importlib, time
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
QUI = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); sys.path.insert(0, QUI)
OUT = os.path.join(QUI, 'render', 'personaggi'); os.makedirs(OUT, exist_ok=True)
modo = (sys.argv[sys.argv.index('--') + 1:] + ['tutto'])[0] if '--' in sys.argv else 'tutto'
t0 = time.time()
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
import importa; D = importa.importa(os.path.join(QUI, 'scena')); importa.luce_e_camera(D)
for nome in ('animazione', 'realismo', 'spot'):
    if os.path.exists(os.path.join(QUI, nome + '.py')): importlib.import_module(nome).applica(QUI)
print('[prova] scena pronta', round(time.time() - t0, 1), 's')
sc = bpy.context.scene; PG = json.load(open(os.path.join(QUI, 'personaggi.json')))['personaggi']
B = lambda x, z, y: Vector((x, -z, y))   # three (x, z) + altezza → Blender
arm = {p['nome']: bpy.data.objects['Scheletro_01_' + p['nome']] for p in PG}
mesh = {p['nome']: bpy.data.objects['Persona_01_' + p['nome']] for p in PG}

def testa(nome):
    """posizione degli occhi e direzione dello sguardo (asse +z dello spazio persona) nel mondo, al fotogramma corrente"""
    a = arm[nome]; pb = a.pose.bones['testa']; M = a.matrix_world @ pb.matrix
    return M @ Vector((0, .07, .03)), (M.to_3x3() @ Vector((0, 0, 1))).normalized()

def camera(nome, pos, mira, lente=50, ortho=None):
    c = bpy.data.objects.new(nome, bpy.data.cameras.new(nome)); sc.collection.objects.link(c)
    c.location = pos; c.rotation_euler = (mira - pos).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lente; c.data.clip_start = .03; c.data.clip_end = 500
    c.data.dof.use_dof = False; return c

def rendi(cam, f, nome, rx=1280, ry=720):
    sc.camera = cam; sc.frame_set(f); sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = rx, ry, 100
    sc.render.use_motion_blur = False; sc.render.filepath = os.path.join(OUT, nome + '.png'); bpy.ops.render.render(write_still=True); print('[prova] reso', nome, 'f', f)

if modo in ('render', 'tutto'):
    # spot: titoli 3D e altro della collezione Spot restano come sono; camera dello spot ai fotogrammi chiesti
    for f in (200, 300): rendi(sc.camera, f, 'spot-attuale-%04d' % f, 1280, 720)
    # camera del compito: da (−9, 21, 13) a (−4, 19, 9.5) verso (6, 5, 1.5), fotogrammi 181–330
    cc = camera('_compito', B(-9, 21, 13), B(6, 5, 1.5), 32)
    for f in (200, 300):
        u = (f - 181) / (330 - 181); p = B(-9, 21, 13).lerp(B(-4, 19, 9.5), u); cc.location = p; cc.rotation_euler = (B(6, 5, 1.5) - p).to_track_quat('-Z', 'Y').to_euler()
        rendi(cc, f, 'spot-compito-%04d' % f, 1280, 720)
    # primi piani e figure: un fotogramma per personaggio in cui il gesto si vede
    # volto: camera a metà fra lo sguardo e il verso del corpo, girata un po' verso la camera dello spot (sud-ovest)
    SCELTI = {'Fabio': [106, 196], 'Luigi': [46, 361], 'Assunta': [196, 286]}
    for p in PG:
        n = p['nome']; ry = p['dove']['ry']; seduto = p['posa']['tipo'] == 'seduto'
        corpo = Vector((math.sin(ry), -math.cos(ry), 0))
        for k, f in enumerate(SCELTI[n]):
            sc.frame_set(f); occhi, avanti = testa(n)
            orizz = (Vector((avanti.x, avanti.y, 0)).normalized() + corpo).normalized()
            fianco = Vector((orizz.y, -orizz.x, 0))   # a sinistra di chi guarda la persona
            pv = occhi + orizz * .6 + fianco * .2 + Vector((0, 0, .03)); cv = camera('_volto', pv, occhi + Vector((0, 0, -.03)), 70)
            rendi(cv, f, '%s-volto-%d' % (n.lower(), k + 1), 800, 1000)
            # figura intera da sud-ovest (dentro l'ufficio): da sopra la scrivania per Fabio seduto
            base = arm[n].matrix_world.translation
            pf = base + (Vector((-.9, -1.4, 1.6)) if seduto else Vector((-1.25, -2.35, 1.75)))
            cf = camera('_figura', pf, base + Vector((0, 0, .85 if seduto else .95)), 35 if seduto else 40)
            rendi(cf, f, '%s-figura-%d' % (n.lower(), k + 1), 800, 1000)
            # di spalle a tre quarti (capelli, chignon) e petto (colletto, baveri, collana)
            if k == 0:
                pe = arm[n].matrix_world @ (arm[n].pose.bones['petto'].matrix @ Vector((0, .12, .05)))
                cp = camera('_petto', pe + orizz * .55 + fianco * .12 + Vector((0, 0, .06)), pe, 60); rendi(cp, f, '%s-petto' % n.lower(), 800, 1000)
                pr = occhi - orizz * .55 + fianco * .45 + Vector((0, 0, .1)); cr = camera('_retro', pr, occhi + Vector((0, 0, -.02)), 60)
                rendi(cr, f, '%s-retro' % n.lower(), 800, 1000)
    # insieme dei tre, vista ravvicinata dell'ufficio tecnico
    ci = camera('_insieme', B(7.2, 4.6, 2.6), B(9.1, 1.6, 1.15), 32)
    for f in (200, 260): rendi(ci, f, 'insieme-%04d' % f, 1280, 720)

if modo in ('controlli', 'tutto'):
    dg = bpy.context.evaluated_depsgraph_get()
    # visibilità dalla camera dello spot (raggi verso occhi e petto; le persone non bloccano)
    for o in bpy.data.collections['RiFRA-persone'].objects: o.hide_viewport = True
    cam = sc.camera
    for f in range(151, 331, 15):
        sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get(); co = cam.matrix_world.translation.copy(); riga = []
        for p in PG:
            a = arm[p['nome']]; v = 0
            for b, dy in (('testa', .05), ('petto', .0)):
                q = a.matrix_world @ (a.pose.bones[b].matrix @ Vector((0, dy, .05)))
                hit, *_ = sc.ray_cast(dg, co, (q - co).normalized(), distance=(q - co).length - .05); v += 0 if hit else 1
            from bpy_extras.object_utils import world_to_camera_view
            s = world_to_camera_view(sc, cam, a.matrix_world.translation + Vector((0, 0, 1)))
            dentro = 0 <= s.x <= 1 and 0 <= s.y <= 1 and s.z > 0
            riga.append('%s %s%s' % (p['nome'], 'vis%d/2' % v, '' if dentro else ' FUORI'))
        print('[visibilità] f %4d  %s' % (f, ' · '.join(riga)))
        if f in (151, 211, 271):   # mappa dell'ufficio tecnico: # = petto e testa visibili, + = solo uno, . = nessuno (x 0,3–9,8; z 0,8–4,3)
            for zi in range(8):
                z = .8 + zi * .5; s = ''
                for xi in range(20):
                    x = .3 + xi * .5; k = 0
                    for hh in (1.0, 1.55):
                        q = B(x, z, hh); hit, *_ = sc.ray_cast(dg, co, (q - co).normalized(), distance=(q - co).length - .05); k += 0 if hit else 1
                    s += '#' if k == 2 else '+' if k else '.'
                print('             z %.1f %s' % (z, s))
    for o in bpy.data.collections['RiFRA-persone'].objects: o.hide_viewport = False
    # compenetrazioni con gli oggetti vicini (non persone), ogni 10 fotogrammi
    tutti = [o for o in sc.objects if o.type == 'MESH' and o.name not in bpy.data.collections['RiFRA-persone'].all_objects and not o.hide_render]
    for p in PG:
        n = p['nome']; c = B(p['dove']['x'], p['dove']['z'], 0); vic = []
        for o in tutti:
            bb = [o.matrix_world @ Vector(v) for v in o.bound_box]; lo = Vector([min(v[i] for v in bb) for i in range(3)]); hi = Vector([max(v[i] for v in bb) for i in range(3)])
            if lo.x < c.x + 1.2 and hi.x > c.x - 1.2 and lo.y < c.y + 1.2 and hi.y > c.y - 1.2 and lo.z < 2.2 and hi.z > 0.01: vic.append(o)
        trovati = {}
        # alberi BVH nel mondo: mesh valutate (armatura applicata) trasformate con la matrice dell'oggetto
        def bvh_mondo(ob):
            oe = ob.evaluated_get(dg); m = oe.to_mesh(); M = ob.matrix_world
            t = BVHTree.FromPolygons([M @ v.co for v in m.vertices], [list(pl.vertices) for pl in m.polygons]); oe.to_mesh_clear(); return t
        statici = {o.name: bvh_mondo(o) for o in vic if not (o.animation_data and o.animation_data.action)}
        for f in range(1, 1502, 10):
            sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get(); tp = bvh_mondo(mesh[n])
            for o in vic:
                to = statici.get(o.name) or bvh_mondo(o)
                k = len(tp.overlap(to))
                if k: trovati.setdefault(o.name, []).append((f, k))
        print('[compenetrazioni] %s: %d oggetti vicini' % (n, len(vic)))
        for nome, l in sorted(trovati.items(), key=lambda e: -sum(k for _, k in e[1])):
            print('   %-40s fotogrammi %3d (es. %s) coppie max %d' % (nome[:40], len(l), l[0][0], max(k for _, k in l)))
print('[prova] fine', round(time.time() - t0, 1), 's')
