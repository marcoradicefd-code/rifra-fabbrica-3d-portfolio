# Modulo «persone» (proprietario: agente delle persone, file in esclusiva). Lo chiama costruisci.py dopo realismo e prima di spot:
# applica(QUI). Strada (a) di ricerca/PERSONE-REALISTICHE-BLENDER.md: persone più realistiche RESTANDO nella regola «tutto dal codice»
# (niente MPFB/MakeHuman, niente modelli scaricati, niente foto come texture). Stesse armature e stesse chiavi di animazione.py: le
# persone restano sincronizzate con i pezzi. Su ogni persona di «RiFRA-persone»:
#  1. materiale «Persona RiFRA v2»: pelle con subsurface e arrossamento (naso, guance, orecchie), tessuti con Sheen e pieghe leggere
#     (rumore sulla posizione di riposo: non «nuota» quando la persona si muove), occhi lucidi (sfere in esporta-animazione.js);
#  2. abiti come gusci veri con gli orli: maglietta/camicia (maniche e girocollo), pantaloni più larghi, con spessore (Solidify);
#  3. capelli e barba come curve (oggetto Curves di Blender, figlio dell'osso «testa»), generati qui dalle maschere della testa:
#     tagli corti vari per gli operai, Fabio corti curati con ciuffo e barba corta, Luigi ricci lunghi fino alle spalle, Assunta chignon;
#  4. deformazione più morbida: Armature con Preserve Volume, Corrective Smooth, Subdivision 1 solo al render;
#  5. micro-movimenti sopra le chiavi: sguardo (rumore additivo sulla rotazione della sola testa: mani e piedi non si spostano) e
#     respiro (shape key del petto con un ciclo sinusoidale, fase diversa per persona).
# Classi dei vertici (attributo «cls», esporta-animazione.js classe()): 0 pelle, 1 maglia/camicia/giacca, 2 pantaloni, 3 scarpe,
# 4 grembiule, 5 guanti, 6 capelli, 7 occhiali, 8 dettagli d'abito, 9 calze, 10 occhi, 11 testa, 12 gioielli.
import bpy, bmesh, json, math, os, time
import numpy as np
from mathutils import Matrix, Vector

HC = np.array([0, 1.635, .012]); HR = np.array([.077, .114, .097])
TESTA_RIPOSO = Vector((0, 1.575, -.01)); LUNG_OSSO = .06          # osso «testa» di persone.js (coda = testa + 0,06 in y)


def _srgb(h):
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)


def _nodi(mat):
    mat.use_nodes = True; N = mat.node_tree.nodes; L = mat.node_tree.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); out.location = (900, 0); bs = N.new('ShaderNodeBsdfPrincipled'); bs.location = (600, 0)
    L.new(bs.outputs[0], out.inputs['Surface']); return N, L, bs


def _attr(N, nome, x, y, tipo='GEOMETRY'):
    a = N.new('ShaderNodeAttribute'); a.attribute_name = nome; a.attribute_type = tipo; a.location = (x, y); return a


def _math(N, L, op, a, b=None, x=0, y=0, v=None):
    m = N.new('ShaderNodeMath'); m.operation = op; m.location = (x, y)
    for k, s in enumerate((a, b)):
        if s is None: continue
        if isinstance(s, (int, float)): m.inputs[k].default_value = s
        else: L.new(s, m.inputs[k])
    if v is not None: m.inputs[2].default_value = v
    return m.outputs[0]


def materiale_persone():
    """Pelle: subsurface + arrossamento; tessuti: Sheen + pieghe leggere (bump su un rumore della posizione di riposo)."""
    mat = bpy.data.materials.get('Persona RiFRA v2') or bpy.data.materials.new('Persona RiFRA v2')
    N, L, bs = _nodi(mat)
    col = _attr(N, 'col', -900, 300); rug = _attr(N, 'rug', -900, 100); pel = _attr(N, 'pelle', -900, -50)
    cls = _attr(N, 'cls', -900, -200); msk = _attr(N, 'maschere', -900, -350); rip = _attr(N, 'riposo', -900, -500)
    # stoffa = classe 1, 2, 4, 8 (maglia, pantaloni, grembiule, dettagli d'abito)
    c = cls.outputs['Fac']; s = None
    for k in (1, 2, 4, 8):
        e = _math(N, L, 'COMPARE', c, float(k), -650, -200 - 40 * k, .5); s = e if s is None else _math(N, L, 'ADD', s, e, -500, -200)
    stoffa = _math(N, L, 'MINIMUM', s, 1.0, -380, -200)
    # arrossamento: base × (1, .82, .8) dove la maschera «rosso» (z) e la pelle lo dicono
    sep = N.new('ShaderNodeSeparateXYZ'); sep.location = (-700, -350); L.new(msk.outputs['Vector'], sep.inputs[0])
    fr = _math(N, L, 'MULTIPLY', sep.outputs['Z'], pel.outputs['Fac'], -500, -350); fr = _math(N, L, 'MULTIPLY', fr, .55, -380, -350)
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.location = (-200, 300)
    L.new(fr, mx.inputs['Factor']); L.new(col.outputs['Color'], mx.inputs['A']); mx.inputs['B'].default_value = (1, .8, .78, 1)
    L.new(mx.outputs['Result'], bs.inputs['Base Color'])
    # rugosità con un rumore leggero sulla pelle
    nz = N.new('ShaderNodeTexNoise'); nz.location = (-700, -650); nz.inputs['Scale'].default_value = 140; L.new(rip.outputs['Vector'], nz.inputs['Vector'])
    r = _math(N, L, 'MULTIPLY_ADD', nz.outputs['Fac'], .12, -400, 100, -.06); r = _math(N, L, 'ADD', rug.outputs['Fac'], r, -250, 100)
    L.new(r, bs.inputs['Roughness'])
    # pelle: subsurface (EEVEE con lo spessore della geometria)
    L.new(_math(N, L, 'MULTIPLY', pel.outputs['Fac'], .8, -250, -50), bs.inputs['Subsurface Weight'])
    bs.inputs['Subsurface Radius'].default_value = (1.0, .35, .2); bs.inputs['Subsurface Scale'].default_value = .008
    # tessuti: Sheen (cotone opaco con il bordo appena chiaro) e pieghe: rumore allungato (anelli attorno agli arti)
    L.new(_math(N, L, 'MULTIPLY', stoffa, .55, -250, -200), bs.inputs['Sheen Weight']); bs.inputs['Sheen Roughness'].default_value = .45
    mp = N.new('ShaderNodeMapping'); mp.location = (-700, -800); mp.inputs['Scale'].default_value = (9, 34, 9); L.new(rip.outputs['Vector'], mp.inputs['Vector'])
    pz = N.new('ShaderNodeTexNoise'); pz.location = (-500, -800); pz.inputs['Scale'].default_value = 1.0; pz.inputs['Detail'].default_value = 3; L.new(mp.outputs[0], pz.inputs['Vector'])
    bp = N.new('ShaderNodeBump'); bp.location = (300, -500); bp.inputs['Distance'].default_value = .004
    L.new(_math(N, L, 'MULTIPLY', stoffa, .35, 100, -450), bp.inputs['Strength']); L.new(pz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs[0], bs.inputs['Normal'])
    bs.inputs['Metallic'].default_value = 0
    return mat


def materiale_capelli():
    mat = bpy.data.materials.get('Capelli RiFRA') or bpy.data.materials.new('Capelli RiFRA')
    N, L, bs = _nodi(mat)
    col = _attr(N, 'colore', -700, 200); ci = N.new('ShaderNodeHairInfo'); ci.location = (-700, -100)
    k = _math(N, L, 'MULTIPLY_ADD', ci.outputs['Intercept'], .35, -450, -100, .65)   # radici un po' più scure
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.location = (-200, 150); mx.inputs['Factor'].default_value = 1
    L.new(col.outputs['Color'], mx.inputs['A']); cc = N.new('ShaderNodeCombineColor'); cc.location = (-350, -100)
    for i in range(3): L.new(k, cc.inputs[i])
    L.new(cc.outputs[0], mx.inputs['B']); L.new(mx.outputs['Result'], bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = .42; bs.inputs['Coat Weight'].default_value = .15; bs.inputs['Sheen Weight'].default_value = .3
    return mat


# ------------------------------------------------------------------------------------------------------------------------------
# abiti come gusci
# ------------------------------------------------------------------------------------------------------------------------------
def _attrib(me, nome, dim=1):
    a = me.attributes.get(nome)
    if a is None: return None
    if dim == 1: v = np.zeros(len(a.data), np.float32 if a.data_type == 'FLOAT' else np.int32); a.data.foreach_get('value', v); return v
    v = np.zeros(len(a.data) * dim, np.float32); a.data.foreach_get('vector', v); return v.reshape(-1, dim)


def guscio(ob, ao, classi, spinta, spessore, nome, coll, modif):
    """Copia le facce del corpo con tutti i vertici nelle classi, le spinge in fuori lungo la normale e dà lo spessore (orli veri)."""
    cls = _attrib(ob.data, 'cls')
    if cls is None or not np.isin(cls, classi).any(): return None
    bm = bmesh.new(); bm.from_mesh(ob.data); lay = bm.verts.layers.int.get('cls')
    via = [f for f in bm.faces if not all(v[lay] in classi for v in f.verts)]
    bmesh.ops.delete(bm, geom=via, context='FACES')
    if not bm.faces: bm.free(); return None
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * spinta(v.co)
    # orli lisci: i bordi aperti (girocollo, fine manica, orlo dei pantaloni) seguono i triangoli e fanno i dentini:
    # si rilassano lungo il bordo stesso (ogni vertice verso la media dei due vicini di bordo), qualche passata
    bordo = [e for e in bm.edges if len(e.link_faces) == 1]; vic = {}
    for e in bordo:
        a_, b_ = e.verts; vic.setdefault(a_, []).append(b_); vic.setdefault(b_, []).append(a_)
    for _ in range(10):
        nuovi = {v: (v.co * .5 + (l[0].co + l[1].co) * .25) for v, l in vic.items() if len(l) == 2}
        for v, c in nuovi.items(): v.co = c
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    g = bpy.data.objects.new(nome, me); coll.objects.link(g)
    for vg in ob.vertex_groups: g.vertex_groups.new(name=vg.name)
    g.parent = ao; g.matrix_parent_inverse = Matrix.Identity(4)
    modif(g, spessore)
    return g


# ------------------------------------------------------------------------------------------------------------------------------
# capelli e barba come curve
# ------------------------------------------------------------------------------------------------------------------------------
def _radici(ob, peso, n, rng, classe=11):
    """n punti sulla testa (triangoli con tutti i vertici della classe), con probabilità ∝ area × peso²; posizione, normale, peso."""
    me = ob.data; nv = len(me.vertices); co = np.zeros(nv * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    cls = _attrib(me, 'cls'); tri = np.zeros(len(me.polygons) * 3, np.int32); me.polygons.foreach_get('vertices', tri); tri = tri.reshape(-1, 3)
    ok = (cls[tri] == classe).all(1); tri = tri[ok]
    A, B, C = co[tri[:, 0]], co[tri[:, 1]], co[tri[:, 2]]; nn = np.cross(B - A, C - A); area = np.linalg.norm(nn, axis=1) * .5
    w = peso[tri].mean(1); p = area * np.clip(w, 0, 1) ** 2
    if p.sum() <= 0: return None
    k = rng.choice(len(tri), size=n, p=p / p.sum()); u, v = rng.random(n), rng.random(n); f = u + v > 1; u[f], v[f] = 1 - u[f], 1 - v[f]
    P = A[k] + (B[k] - A[k]) * u[:, None] + (C[k] - A[k]) * v[:, None]
    Nn = nn[k] / np.maximum(np.linalg.norm(nn[k], axis=1, keepdims=True), 1e-9); Nn *= np.sign(((P - HC) * Nn).sum(1))[:, None]
    W = peso[tri[k, 0]] * (1 - u - v) + peso[tri[k, 1]] * u + peso[tri[k, 2]] * v
    return P, Nn, W


def _norm(v): return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def _fuori_testa(P, margine):
    """spinge fuori dall'ellissoide della testa (+ margine) i punti che ci finiscono dentro"""
    q = (P - HC) / (HR + margine); r = np.linalg.norm(q, axis=-1, keepdims=True); d = r < 1
    return np.where(d, HC + q / np.maximum(r, 1e-6) * (HR + margine), P)


def pettinati(R, Nn, L, lift, flusso, rng, npt=5, crespo=.15):
    """ciocche che seguono la testa nella direzione «flusso» (per radice): ogni punto si riporta sul guscio a quota r0 + alzata,
    così la ciocca resta aderente al cranio (niente spazzole dritte) e si alza solo quanto dice «lift»"""
    L = np.broadcast_to(np.asarray(L, float), (len(R),)); lift = np.broadcast_to(np.asarray(lift, float), (len(R),))
    t = flusso - Nn * (flusso * Nn).sum(1, keepdims=True); t = _norm(t + crespo * _norm(rng.normal(size=t.shape)))
    s = np.linspace(0, 1, npt)[None, :, None]
    P = R[:, None] + t[:, None] * L[:, None, None] * s
    q = (P - HC) / HR; r = np.linalg.norm(q, axis=-1, keepdims=True); r0 = np.linalg.norm((R - HC) / HR, axis=-1)[:, None, None]
    rq = r0 + lift[:, None, None] / .09 * np.sqrt(s)
    return HC + q / np.maximum(r, 1e-6) * rq * HR


def _dir(az, el): return np.stack([np.sin(az) * np.cos(el), np.sin(el), np.cos(az) * np.cos(el)], -1)


def ricci_lunghi(R, Nn, rng):
    """Luigi (04): ricci grigio-argento lunghi fino alle spalle. Ogni ciocca sale dalla radice sul guscio verso il lato o il retro
    (mai davanti al viso: fronte libera), poi scende fino alle spalle; boccoli = gruppi di ciocche con la stessa elica, solo nella parte che cade."""
    n = len(R); npt = 28; s = np.linspace(0, 1, npt)[None, :]
    q0 = (R - HC) / HR; r0 = np.linalg.norm(q0, axis=1); az = np.arctan2(q0[:, 0], q0[:, 2]); el = np.arcsin(np.clip(q0[:, 1] / r0, -1, 1))
    sg = np.where(az >= 0, 1.0, -1.0); azw = sg * np.maximum(np.abs(az), 1.55 + .45 * rng.random(n)); elw = np.minimum(el, .1 + .25 * rng.random(n))
    s1 = .32; u = np.clip(s / s1, 0, 1); A = az[:, None] + (azw - az)[:, None] * u; E_ = el[:, None] + (elw - el)[:, None] * u
    rr = r0[:, None] + (1.2 - r0[:, None]) * u ** .7
    P1 = HC + _dir(A, E_) * rr[..., None] * HR                                           # sul guscio, verso il lato o il retro
    W = P1[:, -1]
    fondo = np.where(np.abs(azw) > 2.3, 1.40, 1.47) + rng.normal(0, .012, n)
    out = _norm(np.stack([np.sin(azw), np.zeros(n), np.cos(azw)], 1))
    Eend = W + np.stack([np.zeros(n), -(W[:, 1] - fondo).clip(.05), np.zeros(n)], 1) + out * (.03 + .04 * rng.random(n))[:, None]
    v = np.clip((s - s1) / (1 - s1), 0, 1)[..., None]
    P2 = W[:, None] + (Eend - W)[:, None] * v + out[:, None] * (.02 * np.sin(np.pi * v))
    base = np.where((s <= s1)[..., None], P1, P2)
    K = max(1, n // 24); cen = W[rng.choice(n, K, replace=False)]; g = np.argmin(((W[:, None] - cen[None]) ** 2).sum(-1), 1)
    fase = rng.random(K) * 2 * np.pi; giri = 4 + 2.5 * rng.random(K); rc = .008 + .006 * rng.random(K)
    tg = _norm(np.gradient(base, axis=1)); a1 = _norm(np.cross(tg, np.array([.3, .1, 1.0]))); a2 = np.cross(tg, a1)
    phi = fase[g][:, None] + 2 * np.pi * giri[g][:, None] * s; amp = (rc[g][:, None] * np.clip((s - .22) / .25, 0, 1))[..., None]
    P = base + amp * (np.cos(phi)[..., None] * a1 + np.sin(phi)[..., None] * a2) + rng.normal(0, .001, (n, 1, 3)) * s[..., None]
    P = _fuori_testa(P, .01)
    ax = np.abs(P[..., 0]); spalla = 1.515 - .55 * np.clip(ax - .06, 0, None) + .02
    dent = (P[..., 1] < spalla) & (ax > .05) & (np.abs(P[..., 2] + .02) < .16); P[..., 1] = np.where(dent, spalla, P[..., 1])
    hz = np.hypot(P[..., 0], P[..., 2] + .02); f = np.where(hz < .085, .085 / np.maximum(hz, 1e-6), 1)
    m = P[..., 1] < 1.58; P[..., 0] = np.where(m, P[..., 0] * f, P[..., 0]); P[..., 2] = np.where(m, (P[..., 2] + .02) * f - .02, P[..., 2])
    return P, g


def _curve(nome, P, raggi, colori, mat, coll):
    n, npt, _ = P.shape; cv = bpy.data.hair_curves.new(nome); cv.add_curves([npt] * n)
    cv.position_data.foreach_set('vector', P.astype(np.float32).ravel())
    r = cv.attributes.new('radius', 'FLOAT', 'POINT'); r.data.foreach_set('value', np.tile(raggi.astype(np.float32), n))
    c = cv.attributes.new('colore', 'FLOAT_COLOR', 'CURVE'); c.data.foreach_set('color', np.hstack([colori, np.ones((n, 1))]).astype(np.float32).ravel())
    cv.materials.append(mat); ob = bpy.data.objects.new(nome, cv); coll.objects.link(ob); return ob


def _su_testa(ob, ao):
    """figlio dell'osso «testa»: coordinate locali = spazio persona di riposo (il genitore osso si aggancia alla coda)"""
    ob.parent = ao; ob.parent_type = 'BONE'; ob.parent_bone = 'testa'
    ob.matrix_parent_inverse = Matrix.Translation(-(TESTA_RIPOSO + Vector((0, LUNG_OSSO, 0))))


def capelli(ob, ao, asp, pg, matC, coll, rng):
    msk = _attrib(ob.data, 'maschere', 3)
    if msk is None: return []
    cap = _srgb(asp['cap']); stile = int(round(asp['stile'])); fatti = []
    tinta = lambda n, base, v=.18: np.clip(base[None] * (1 + rng.normal(0, v, (n, 1))), 0, 1)
    raggio = lambda npt, r0, r1: np.linspace(r0, r1, npt)
    T = (pg or {}).get('testa', {}) if pg else {}
    tipo = T.get('capelli') if pg else {0: 'rasati', 1: 'corti', 2: 'medi', 3: 'sfumati', 4: 'stempiato', 5: 'raccolti'}.get(stile, 'corti')
    nome = ob.name.replace('Persona_', '')
    if tipo != 'rasati':
        n = {'ricci-lunghi': 5200, 'chignon-alto': 6500, 'ciuffo': 9000}.get(tipo, 7000)
        rr = _radici(ob, msk[:, 0], n, rng)
        if rr is not None:
            R, Nn, Wt = rr; el = np.arcsin(np.clip((R[:, 1] - HC[1]) / HR[1], -1, 1)); az = np.arctan2(R[:, 0] / HR[0], (R[:, 2] - HC[2]) / HR[2])
            top = np.clip((el - .2) / .9, 0, 1); fr = np.maximum(0, np.cos(az)); n = len(R)
            if tipo == 'ricci-lunghi':
                P, g = ricci_lunghi(R, Nn, rng); argento, scuro = _srgb('#cfc9bf'), _srgb('#6d6862')
                k = rng.random(int(g.max()) + 1)[g][:, None]; colori = np.clip((argento * (.55 + .45 * k) + scuro * (.45 - .45 * k)) * (1 + rng.normal(0, .08, (n, 1))), 0, 1)
                fatti.append(_curve('Capelli_' + nome, P, raggio(P.shape[1], .00055, .0003), colori, matC, coll))
            elif tipo == 'chignon-alto':
                b0 = np.array([0, 1.635 + .114 * math.sin(1.02) * 1.03, .012 - .097 * math.cos(1.02) * 1.03])   # sulla nuca in alto
                fl = _norm(b0 - R); L = np.clip(np.linalg.norm(b0 - R, axis=1), .02, .2)
                P = pettinati(R, Nn, L, np.full(n, .0035), fl, rng, npt=8, crespo=.05)
                fatti.append(_curve('Capelli_' + nome, P, raggio(8, .0005, .0003), tinta(n, cap, .12), matC, coll))
                # chignon: spirali attorno a un asse che esce dalla testa
                up = _norm((b0 - HC) / HR ** 2); C = b0 + up * .028; e1 = _norm(np.cross(up, [1, 0, 0])); e2 = np.cross(up, e1)
                m = 1600; npt = 14; rb = .006 + .03 * np.sqrt(rng.random(m)); a0 = rng.random(m) * 2 * np.pi; sw = (1.2 + rng.random(m)) * np.pi
                a = a0[:, None] + sw[:, None] * np.linspace(0, 1, npt)[None]; h = .026 * np.sqrt(np.clip(1 - (rb / .037) ** 2, 0, 1))[:, None] * (.6 + .4 * rng.random((m, 1)))
                Pb = C + (np.cos(a) * rb[:, None])[..., None] * e1 + (np.sin(a) * rb[:, None])[..., None] * e2 + (h - .012)[..., None] * up
                fatti.append(_curve('Chignon_' + nome, Pb, raggio(npt, .0006, .0004), tinta(m, cap * .9, .12), matC, coll))
            elif tipo == 'raccolti':   # operaie: crocchia bassa sulla nuca (come persone.js)
                b0 = np.array([0, 1.685, -.093]); fl = _norm(b0 - R); L = np.clip(np.linalg.norm(b0 - R, axis=1), .02, .18)
                P = pettinati(R, Nn, L, np.full(n, .004), fl, rng, npt=8, crespo=.06)
                fatti.append(_curve('Capelli_' + nome, P, raggio(8, .0005, .0003), tinta(n, cap, .12), matC, coll))
            else:
                # corti / medi / sfumati / stempiato / ciuffo: pettinati all'indietro e in giù sui lati
                L = {'corti': .016 + .018 * top, 'medi': .03 + .03 * top, 'sfumati': .006 + .026 * top ** 1.5, 'stempiato': .01 + .006 * top,
                     'ciuffo': .01 + .028 * top ** 1.2 + .012 * fr * top}[tipo] * (.8 + .4 * rng.random(n))
                lift = {'corti': .004 + .006 * top, 'medi': .006 + .01 * top, 'sfumati': .002 + .008 * top ** 1.5, 'stempiato': .003, 'ciuffo': .003 + .007 * top + .007 * fr * top}[tipo]
                fl = np.tile(np.array([0, -.35, -1.0]), (n, 1))
                if tipo == 'ciuffo':   # Fabio (02): riga sul lato destro, ciuffo in su e verso la sua sinistra
                    lato = np.where(az > -.42, 1.0, -1.0); fl = np.stack([.6 * lato * top, -.25 * (1 - top), -1.0 + .3 * fr * top], 1)
                P = pettinati(R, Nn, L, lift, fl, rng, npt=7 if tipo in ('medi', 'ciuffo') else 5, crespo=.08)
                fatti.append(_curve('Capelli_' + nome, P, raggio(P.shape[1], .0006, .00025), tinta(n, cap), matC, coll))
    # barba: Fabio corta curata (02); operai con la barba piena (barba ≥ 0,9). La barba di qualche giorno resta dipinta.
    barba = (T.get('barba') if pg else asp.get('barba', 0) >= .9)
    if barba:
        rr = _radici(ob, np.clip((msk[:, 1] - .25) / .5, 0, 1), 7000, rng)
        if rr is not None:
            R, Nn, Wt = rr; n = len(R); fl = np.tile(np.array([0, -1.0, .2]), (n, 1))
            P = pettinati(R, Nn, (.0045 + .0045 * rng.random(n)) * (.5 + .5 * Wt), np.full(n, .0016), fl, rng, npt=3, crespo=.35)
            fatti.append(_curve('Barba_' + nome, P, raggio(3, .0005, .0003), tinta(n, cap * .9, .15), matC, coll))
    for c in fatti: _su_testa(c, ao)
    return fatti


# ------------------------------------------------------------------------------------------------------------------------------
# micro-movimenti
# ------------------------------------------------------------------------------------------------------------------------------
def _fcurve(ob, path, ix):
    ad = ob.animation_data
    if not ad or not ad.action: ob.animation_data_create(); ob.animation_data.action = bpy.data.actions.new('anim_' + ob.name)
    fc = ob.animation_data.action.fcurve_ensure_for_datablock(ob, path, index=ix)
    if not len(fc.keyframe_points): fc.keyframe_points.insert(1, ob.path_resolve(path)[ix])
    return fc


def sguardo(ao, rng):
    """rumore lento sulla rotazione della sola testa (x = annuire, y = girarsi): sopra le chiavi, mani e piedi fermi"""
    for ix, forza in ((1, .022), (2, .03)):
        fc = _fcurve(ao, 'pose.bones["testa"].rotation_quaternion', ix); m = fc.modifiers.new('NOISE')
        m.blend_type = 'REPLACE'; m.scale = 55 + 30 * rng.random(); m.strength = forza; m.phase = rng.random() * 100; m.depth = 1


def respiro(oggetti, rng):
    """shape key del petto (davanti e dietro, fra y 1,05 e 1,45) che si gonfia di 3 mm con un ciclo di circa 4,3 s"""
    periodo = 30 * (3.8 + 1.0 * rng.random()); fase = rng.random() * periodo
    for ob in oggetti:
        me = ob.data; nv = len(me.vertices); co = np.zeros(nv * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        nr = np.zeros(nv * 3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
        y = co[:, 1]; w = np.clip((y - 1.05) / .12, 0, 1) * np.clip((1.45 - y) / .1, 0, 1) * (np.abs(co[:, 0]) < .16)
        if not w.any(): continue
        if not me.shape_keys: ob.shape_key_add(name='Base', from_mix=False)
        k = ob.shape_key_add(name='respiro', from_mix=False); k.data.foreach_set('co', (co + nr * (.003 * w)[:, None]).ravel())
        k.value = 0; k.keyframe_insert('value', frame=1 + fase); k.value = 1; k.keyframe_insert('value', frame=1 + fase + periodo / 2)
        k.value = 0; k.keyframe_insert('value', frame=1 + fase + periodo)
        fc = me.shape_keys.animation_data.action.fcurve_ensure_for_datablock(me.shape_keys, 'key_blocks["respiro"].value', index=0)
        for p in fc.keyframe_points: p.interpolation = 'SINE'; p.easing = 'EASE_IN_OUT'
        fc.modifiers.new('CYCLES')


# ------------------------------------------------------------------------------------------------------------------------------
def _fcurves(ob):
    ad = ob.animation_data
    if not ad or not ad.action: return []
    from bpy_extras import anim_utils
    cb = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot); return list(cb.fcurves) if cb else []


def copia_visibilita(src, dst):
    dst.hide_render = src.hide_render; dst.hide_viewport = src.hide_viewport
    fcs = [f for f in _fcurves(src) if f.data_path in ('hide_render', 'hide_viewport')]
    if not fcs: return
    dst.animation_data_create(); act = bpy.data.actions.new('vis_' + dst.name); dst.animation_data.action = act
    for f in fcs:
        g = act.fcurve_ensure_for_datablock(dst, f.data_path, index=f.array_index); n = len(f.keyframe_points); co = np.zeros(n * 2, np.float32)
        f.keyframe_points.foreach_get('co', co); g.keyframe_points.add(n); g.keyframe_points.foreach_set('co', co)
        g.keyframe_points.foreach_set('interpolation', np.zeros(n, np.int32)); g.update()


def _deform(ob, ao, liscio=True, suddividi=True):
    md = ob.modifiers.get('Scheletro') or ob.modifiers.new('Scheletro', 'ARMATURE'); md.object = ao; md.use_vertex_groups = True; md.use_deform_preserve_volume = False   # DQ gonfia le spalle
    if liscio:
        cs = ob.modifiers.new('Liscio', 'CORRECTIVE_SMOOTH'); cs.rest_source = 'ORCO'; cs.factor = .5; cs.iterations = 4; cs.smooth_type = 'LENGTH_WEIGHTED'
    if suddividi:
        sd = ob.modifiers.new('Suddivisione', 'SUBSURF'); sd.levels = 0; sd.render_levels = 1; sd.quality = 1


def suddivisione_vicina(corpi, dmax=13.0):
    """Subdivision al render solo per chi è vicino alla camera dello spot in quella inquadratura (chiave costante per inquadratura):
    nelle inquadrature larghe la suddivisione di 20 persone costa ~5 s a fotogramma e a 20 m non si vede. Legge spot.SHOT (sola lettura)."""
    try:
        import spot; SH, FPS = spot.SHOT, spot.FPS
    except Exception as e:
        print('[persone] spot.py non letto, suddivisione sempre accesa:', e); return
    sc = bpy.context.scene; B = lambda p: Vector((p[0], -p[1], p[2])); quanti = 0
    tappe = []
    for (t0, t1, c0, c1, *_r) in SH:
        f0, f1 = int(round(t0 * FPS)) + 1, int(round(t1 * FPS)); tappe.append((f0, f1, B(c0), B(c1)))
    vicino = {ob.name: [] for ob in corpi}
    for f0, f1, c0, c1 in tappe:
        for f in (f0, (f0 + f1) // 2, f1):
            sc.frame_set(f); u = (f - f0) / max(1, f1 - f0); c = c0.lerp(c1, u)
            for ob in corpi: vicino[ob.name].append((f0, (ob.parent.matrix_world.translation + Vector((0, 0, 1))) - c))
    for ob in corpi:
        sd = ob.modifiers.get('Suddivisione')
        if sd is None: continue
        per = {}
        for f0, d in vicino[ob.name]: per[f0] = min(per.get(f0, 1e9), d.length)
        for f0, d in sorted(per.items()):
            sd.render_levels = 1 if d < dmax else 0; ob.keyframe_insert('modifiers["Suddivisione"].render_levels', frame=f0); quanti += d < dmax
    sc.frame_set(1)
    print('[persone] suddivisione accesa in', quanti, 'coppie persona/inquadratura su', len(corpi) * len(tappe))


def applica(QUI):
    t0 = time.time(); sc = bpy.context.scene
    coll = bpy.data.collections.get('RiFRA-persone')
    if coll is None: print('[persone] nessuna collezione RiFRA-persone'); return
    matP = materiale_persone(); matC = materiale_capelli()
    PG = {}
    try: PG = {p['nome']: p for p in json.load(open(os.path.join(QUI, 'personaggi.json'), encoding='utf-8'))['personaggi']}
    except Exception: pass
    corpi = [o for o in coll.objects if o.type == 'MESH' and 'rf_persona' in o and o.parent is not None]
    n_g = n_c = 0
    for ob in sorted(corpi, key=lambda o: o.name):
        ao = ob.parent; asp = json.loads(ob.get('rf_aspetto', '{}')); pg = PG.get(ob.get('rf_personaggio'))
        rng = np.random.default_rng(int(ob['rf_persona']) * 7919 + 17)
        ob.data.materials.clear(); ob.data.materials.append(matP)
        # sotto i gusci il corpo rientra di 3 mm (niente stoffa che buca la stoffa)
        cls = _attrib(ob.data, 'cls'); vestiti = []
        if cls is not None:
            classiG = (2,) if pg else (1, 2)
            co = np.zeros(len(cls) * 3, np.float32); ob.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
            nr = np.zeros(len(cls) * 3, np.float32); ob.data.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
            def modif(g, sp):
                _deform(g, ao, liscio=True, suddividi=False)
                so = g.modifiers.new('Spessore', 'SOLIDIFY'); so.thickness = sp; so.offset = -1; so.use_rim = True; so.use_even_offset = True
            for classi, sp_, th, tag in (((1,), lambda c: .0045, .0025, 'Maglia'), ((2,), lambda c: .008 + .004 * (c.y < .9), .003, 'Pantaloni')):
                if classi[0] not in classiG: continue
                g = guscio(ob, ao, classi, sp_, th, '%s_%s' % (tag, ob.name[8:]), coll, modif)
                if g: g.data.materials.clear(); g.data.materials.append(matP); g['rf_persona'] = ob['rf_persona']; vestiti.append(g); n_g += 1
            sotto = np.isin(cls, classiG); co[sotto] -= nr[sotto] * .003; ob.data.vertices.foreach_set('co', co.ravel()); ob.data.update()
        _deform(ob, ao, liscio=not pg, suddividi=not pg)   # personaggi: baveri e colletti sono lembi aperti, la suddivisione li strapperebbe
        cc = capelli(ob, ao, asp, pg, matC, coll, rng); n_c += len(cc)
        for d in vestiti + cc: copia_visibilita(ob, d)   # chi è nascosto (primo piano degli uffici) lo è con abiti e capelli
        respiro([ob] + [g for g in vestiti if g.name.startswith('Maglia')], rng)
        sguardo(ao, rng)
    suddivisione_vicina(corpi)
    # EEVEE: curve come strisce con il loro raggio
    sc.render.hair_type = 'STRIP'; sc.render.hair_subdiv = 0
    print('[persone] corpi', len(corpi), 'gusci', n_g, 'oggetti capelli', n_c, round(time.time() - t0, 1), 's')
