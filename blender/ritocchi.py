# Modulo «ritocchi» (dopo persone, prima di spot): addolcisce gli scatti delle persone che vengono già dalla pagina three.js
# (controllo del 02/10, render/controllo_movimenti.py): mani che in 1/30 s passano dalla presa al riposo (30–58 cm) e giravolte di 180° in
# 0,2 s. Dove la mano salta > 25 cm o il corpo gira > 20° in un fotogramma, nella finestra di ±6 fotogrammi le rotazioni delle braccia
# e del busto (la giravolta può stare sull'osso «anca» o sull'oggetto: per l'oggetto si addolcisce anche la sua rotazione) passano dal valore all'inizio a quello alla fine con una curva morbida (smoothstep + slerp).
# Posizioni, gambe e piedi non si toccano: la persona resta dove deve essere e sincronizzata con i pezzi.
import bpy, math, json, os

BRACCIA = ['anca', 'schiena', 'petto', 'claL', 'omeroL', 'avambL', 'manoL', 'ditaL', 'claR', 'omeroR', 'avambR', 'manoR', 'ditaR', 'collo', 'testa']
MEZZA = 6

def _liscio(u): return u * u * (3 - 2 * u)

def applica(QUI):
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'   # chiavi nuove lineari come quelle di animazione.py
    sc = bpy.context.scene; f0, f1 = sc.frame_start, sc.frame_end
    arm = [o for o in sc.objects if o.type == 'ARMATURE' and o.animation_data and o.animation_data.action]
    # 1. dove sono gli scatti (una passata su tutti i fotogrammi)
    stato = {a.name: None for a in arm}; scatti = {a.name: [] for a in arm}
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        for a in arm:
            q = (a.matrix_world @ a.pose.bones['manoL'].head, a.matrix_world @ a.pose.bones['manoR'].head, a.matrix_world.to_quaternion())
            p = stato[a.name]
            if p is not None:
                dm = max((q[0] - p[0]).length, (q[1] - p[1]).length); dr = math.degrees(q[2].rotation_difference(p[2]).angle)
                if dm > .25 or dr > 20: scatti[a.name].append((f, dr > 20))
            stato[a.name] = q
    # 2. finestre unite per persona
    tot = 0; elenco = []
    for a in arm:
        fin = []
        for f, giro in scatti[a.name]:
            s, e = max(f0, f - MEZZA), min(f1, f + MEZZA - 1)
            if fin and s <= fin[-1][1] + 1: fin[-1] = [fin[-1][0], e, fin[-1][2] or giro]
            else: fin.append([s, e, giro])
        for s, e, giro in fin:
            if e - s < 2: continue
            sc.frame_set(s); qa = {b: a.pose.bones[b].rotation_quaternion.copy() for b in BRACCIA}; oa = a.rotation_quaternion.copy()
            sc.frame_set(e); qb = {b: a.pose.bones[b].rotation_quaternion.copy() for b in BRACCIA}; ob = a.rotation_quaternion.copy()
            for f in range(s, e + 1):
                u = _liscio((f - s) / (e - s))
                for b in BRACCIA:
                    x, y = qa[b], qb[b].copy()
                    if x.dot(y) < 0: y.negate()
                    pb = a.pose.bones[b]; pb.rotation_quaternion = x.slerp(y, u); pb.keyframe_insert('rotation_quaternion', frame=f)
                if giro:
                    y = ob.copy()
                    if oa.dot(y) < 0: y.negate()
                    a.rotation_quaternion = oa.slerp(y, u); a.keyframe_insert('rotation_quaternion', frame=f)
            tot += 1; elenco.append([a.name, s, e])
    print(f'[ritocchi] finestre addolcite: {tot} su {len(arm)} persone')
    json.dump(elenco, open(os.path.join(QUI, 'render', 'ritocchi-finestre.json'), 'w'))   # per rifare solo i fotogrammi toccati
    braccia(arm)
    salti()


# 2b. BRACCIA DENTRO IL BUSTO (Marco, 02/10: «alcune braccia si fondono con il corpo»). Dove gomito, metà avambraccio o polso stanno dentro
# un'ellisse del busto (semiassi 17 × 12 cm, fra anca e collo) si apre l'omero di lato attorno all'asse avanti–dietro del busto, a passi
# di 3° fino a 30°, finché il braccio esce; l'apertura sale e scende in 5 fotogrammi. Le mani possono staccarsi di pochi cm dalla presa.
from mathutils import Matrix
def _W(a, b): return a.matrix_world @ a.pose.bones[b].head
def _assi(a):
    A, C = _W(a, 'anca'), _W(a, 'collo'); up = C - A; h = up.length; up.normalize()
    lat = _W(a, 'claL') - _W(a, 'claR'); lat -= up * lat.dot(up); lat.normalize(); return A, h, up, lat, up.cross(lat)
def _dentro(a, s):
    A, h, up, lat, fw = _assi(a); g, m = _W(a, 'avamb' + s), _W(a, 'mano' + s)
    for p in (g, (g + m) / 2, m):
        d = p - A; t = d.dot(up)
        if .05 * h < t < .95 * h:
            r = d - up * t; x, z = r.dot(lat) / .17, r.dot(fw) / .12
            if x * x + z * z < 1: return True
    return False
def _apri(a, s, gradi):
    """ruota l'omero attorno al suo attacco, sull'asse avanti–dietro del busto, verso l'esterno"""
    A, h, up, lat, fw = _assi(a); pb = a.pose.bones['omero' + s]
    ang = math.radians(gradi) * (-1 if s == 'L' else 1)
    asse = (a.matrix_world.inverted().to_3x3() @ fw).normalized(); testa = pb.matrix.to_translation()
    R = Matrix.Translation(testa) @ Matrix.Rotation(ang, 4, asse) @ Matrix.Translation(-testa)
    pb.matrix = R @ pb.matrix
def braccia(arm):
    sc = bpy.context.scene; vl = bpy.context.view_layer; f0, f1 = sc.frame_start, sc.frame_end; serve = {}
    for f in range(f0, f1 + 1):                      # 1. quanto aprire, fotogramma per fotogramma
        sc.frame_set(f)
        for a in arm:
            for s in 'LR':
                if not _dentro(a, s): continue
                g = 0
                while g < 30 and _dentro(a, s):
                    _apri(a, s, 3); vl.update(); g += 3
                serve[(a.name, s, f)] = g
                sc.frame_set(f)                     # rimette la posa delle chiavi
    if not serve: print('[ritocchi] braccia nel busto: nessuna'); return
    piano = {}                                       # 2. rampa di 5 fotogrammi prima e dopo
    for (n, s, f), g in serve.items():
        for k in range(-5, 6):
            v = g * (1 - abs(k) / 6) if k else g
            piano[(n, s, f + k)] = max(piano.get((n, s, f + k), 0), v)
    fot = sorted(f for f in {k[2] for k in piano} if f0 <= f <= f1)
    for f in fot:                                    # 3a. chiavi della posa originale su tutti i fotogrammi toccati (così la
        sc.frame_set(f)                              #     correzione di un fotogramma non si somma a quella del successivo)
        for (n, s, ff), g in piano.items():
            if ff == f and g > 0: sc.objects[n].pose.bones['omero' + s].keyframe_insert('rotation_quaternion', frame=f)
    for f in fot:                                    # 3b. applica l'apertura e rimette la chiave
        sc.frame_set(f)
        for (n, s, ff), g in piano.items():
            if ff != f or g <= 0: continue
            a = sc.objects[n]; _apri(a, s, g); a.pose.bones['omero' + s].keyframe_insert('rotation_quaternion', frame=f)
    print(f'[ritocchi] braccia nel busto corrette: {len(serve)} casi, {len(piano)} chiavi')


# 3. SALTI → chiavi a gradino (sfarfallio visto da Marco il 02/10). Nei dati della pagina alcuni oggetti «saltano» da un fotogramma al
# successivo: gli slot delle InstancedMesh riutilizzati (ante della Cefla, rulliere), le radici delle persone che si teletrasportano.
# Con l'interpolazione lineare la sfocatura di movimento li disegna a metà strada fra i due punti: un fantasma che lampeggia per un
# fotogramma. Dove fra due chiavi a fotogrammi consecutivi c'è un salto (posizione > 0,5 m, rotazione > 0,35 in quaternione, scala > 0,4)
# la chiave di partenza diventa CONSTANT: l'oggetto resta fermo fino al fotogramma dopo e non viene sfocato attraverso il salto.
SOGLIA = {'location': .5, 'rotation_quaternion': .35, 'scale': .4}

def _channelbags():
    from bpy_extras import anim_utils
    for ob in bpy.context.scene.objects:
        ad = ob.animation_data
        if not ad or not ad.action: continue
        try: cb = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot)
        except Exception: cb = None
        if cb: yield ob, cb.fcurves

def salti():
    n = 0; dove = []
    for ob, fcs in _channelbags():
        for fc in fcs:
            tipo = fc.data_path.rsplit('.', 1)[-1]; s = SOGLIA.get(tipo)
            if s is None: continue
            k = fc.keyframe_points
            for i in range(len(k) - 1):
                a, b = k[i], k[i + 1]
                if b.co.x - a.co.x <= 1.01 and abs(b.co.y - a.co.y) > s and a.interpolation != 'CONSTANT':
                    a.interpolation = 'CONSTANT'; n += 1; dove.append([ob.name, int(round(a.co.x))])
    print(f'[ritocchi] salti resi a gradino (niente fantasmi nella sfocatura): {n}')
    json.dump(dove, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'render', 'ritocchi-salti.json'), 'w'))
