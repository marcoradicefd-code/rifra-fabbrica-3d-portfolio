# Modulo «animazione» (proprietario: agente dell'animazione, file in esclusiva). Lo chiama costruisci.py con applica(QUI).
# Applica i dati di blender/anim/ esportati da build/tools/blender/esporta-animazione.js (stesso tempo t della pagina three.js):
#  1. pezzi in movimento: chiavi di posizione / rotazione (quaternione) / scala, interpolazione LINEARE (i dati sono già campionati a
#     30 fps e sfoltiti dove la retta li ricostruisce), visibilità a gradino (hide_render e hide_viewport, interpolazione COSTANTE).
#     Gli oggetti si trovano con la proprietà rf_id di importa.py; quelli che mancavano nell'esportazione statica (nascosti in
#     quell'istante) sono copie di un oggetto con la stessa geometria (stessa mesh, stessi materiali) o hanno una geometria propria.
#  2. persone: un'armatura per persona con le 23 ossa di persone.js (riposo = orientamento identità, così la rotazione di ogni osso è
#     quella locale della pagina), mesh del livello di dettaglio alto con la corporatura e i colori «dipinti» dallo shader per vertice,
#     testa ad alta risoluzione; materiale Principled con colore, rugosità e pelle (subsurface) dagli attributi.
# Assi: three (x, y, z) → Blender (x, −z, y); la conversione è già nelle matrici degli oggetti e delle armature (le ossa e le mesh
# delle persone restano nello «spazio persona» di three: y in alto, sguardo verso +z).
import bpy, os, json, time
import numpy as np
from mathutils import Matrix

INTERP = {'L': 1, 'C': 0}   # LINEAR, CONSTANT (indici dell'enum dei keyframe)


def _canali(ob, canali, K, act_nome):
    """Valori costanti impostati sulla proprietà; gli altri come F-curve (una action per oggetto)."""
    act = None
    for c in canali:
        dp, ix, tipo = c[0], c[1], c[2]
        paths = ('hide_render', 'hide_viewport') if dp == 'hide' else (dp,)
        if tipo == 'c':
            v = c[3]
            for p in paths:
                if p.startswith('hide'): setattr(ob, p, bool(v))
                elif p.startswith('pose.'): ob.path_resolve(p)[ix] = v
                else: getattr(ob, p)[ix] = v
            continue
        off, n = c[3], c[4]; co = K[off * 2:(off + n) * 2]
        if act is None:
            ob.animation_data_create(); act = bpy.data.actions.new(act_nome); ob.animation_data.action = act
        for p in paths:
            fc = act.fcurve_ensure_for_datablock(ob, p, index=ix)
            fc.keyframe_points.add(n); fc.keyframe_points.foreach_set('co', co)
            fc.keyframe_points.foreach_set('interpolation', np.full(n, INTERP[tipo], dtype=np.int32))
            fc.update()
        # valore di partenza (fotogramma 1) anche sulla proprietà
        v = float(co[1])
        for p in paths:
            if p.startswith('hide'): setattr(ob, p, bool(v))
            elif p.startswith('pose.'): ob.path_resolve(p)[ix] = v
            else: getattr(ob, p)[ix] = v


def _mesh_extra(g, nome):
    """Geometria propria di un pezzo che non ha un gemello nell'esportazione statica (stesso formato di esporta-scena.js)."""
    import base64
    f32 = lambda s: np.frombuffer(base64.b64decode(s), dtype=np.float32) if s else None
    pos = f32(g['pos']).reshape(-1, 3); n = len(pos)
    idx = np.frombuffer(base64.b64decode(g['idx']), dtype=np.uint32) if g['idx'] else np.arange(n, dtype=np.uint32)
    me = bpy.data.meshes.new(nome); me.vertices.add(n); me.vertices.foreach_set('co', pos.ravel())
    nt = len(idx) // 3; me.loops.add(nt * 3); me.polygons.add(nt)
    me.loops.foreach_set('vertex_index', idx[:nt * 3].astype(np.int32))
    me.polygons.foreach_set('loop_start', np.arange(0, nt * 3, 3, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(nt, 3, dtype=np.int32))
    mi = np.zeros(nt, dtype=np.int32)
    for k, (st, cnt, m) in enumerate(g['gruppi']):
        mat = bpy.data.materials.new('anim_' + m['nome']); mat.use_nodes = True; bs = mat.node_tree.nodes['Principled BSDF']
        col = list(m['colore']) if not g.get('tinta') else [a * b for a, b in zip(m['colore'], g['tinta'])]
        bs.inputs['Base Color'].default_value = (*col, 1); bs.inputs['Roughness'].default_value = m['rug']; bs.inputs['Metallic'].default_value = m['met']
        if m['vc'] or m['atlante']:
            N = mat.node_tree.nodes; L = mat.node_tree.links; ca = N.new('ShaderNodeVertexColor'); ca.layer_name = 'col'
            mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1
            mx.inputs['A'].default_value = (*col, 1); L.new(ca.outputs['Color'], mx.inputs['B']); L.new(mx.outputs['Result'], bs.inputs['Base Color'])
        if m['atlante']:
            N = mat.node_tree.nodes; L = mat.node_tree.links; at = N.new('ShaderNodeAttribute'); at.attribute_name = 'rm'; sp = N.new('ShaderNodeSeparateXYZ')
            L.new(at.outputs['Vector'], sp.inputs[0]); L.new(sp.outputs['X'], bs.inputs['Roughness']); L.new(sp.outputs['Y'], bs.inputs['Metallic'])
        me.materials.append(mat); mi[st // 3:(st + cnt) // 3] = k
    me.polygons.foreach_set('material_index', mi)
    if g['col']:
        c = f32(g['col']).reshape(-1, g['colN'])
        if g['colN'] == 3: c = np.hstack([c, np.ones((n, 1), dtype=np.float32)])
        me.color_attributes.new('col', 'FLOAT_COLOR', 'POINT').data.foreach_set('color', c.ravel())
    if g['rm']:
        rm = f32(g['rm']).reshape(-1, 2); me.attributes.new('rm', 'FLOAT_VECTOR', 'POINT').data.foreach_set('vector', np.hstack([rm, np.zeros((n, 1), dtype=np.float32)]).ravel())
    if g['uv']:
        uv = f32(g['uv']).reshape(-1, 2); me.uv_layers.new(name='UV').data.foreach_set('uv', uv[idx[:nt * 3]].ravel())
    me.validate(clean_customdata=False); me.update()
    return me


def _materiale_persone():
    mat = bpy.data.materials.get('Persona RiFRA')
    if mat: return mat
    mat = bpy.data.materials.new('Persona RiFRA'); mat.use_nodes = True; N = mat.node_tree.nodes; L = mat.node_tree.links
    bs = N['Principled BSDF']
    col = N.new('ShaderNodeAttribute'); col.attribute_name = 'col'; col.location = (-600, 300)
    rug = N.new('ShaderNodeAttribute'); rug.attribute_name = 'rug'; rug.location = (-600, 0)
    pel = N.new('ShaderNodeAttribute'); pel.attribute_name = 'pelle'; pel.location = (-600, -250)
    L.new(col.outputs['Color'], bs.inputs['Base Color']); L.new(rug.outputs['Fac'], bs.inputs['Roughness'])
    # pelle: un po' di diffusione sotto la superficie (EEVEE la regge), solo dove lo shader della pagina segna «pelle»
    k = N.new('ShaderNodeMath'); k.operation = 'MULTIPLY'; k.inputs[1].default_value = .35; k.location = (-350, -250)
    L.new(pel.outputs['Fac'], k.inputs[0]); L.new(k.outputs[0], bs.inputs['Subsurface Weight'])
    bs.inputs['Subsurface Radius'].default_value = (1.0, .35, .2); bs.inputs['Subsurface Scale'].default_value = .006
    bs.inputs['Metallic'].default_value = 0
    return mat


def _armatura(ossa, coll):
    """Dati dell'armatura condivisi da tutte le persone: 23 ossa, testa nel punto di riposo, coda verso +y (orientamento identità)."""
    arm = bpy.data.armatures.get('Scheletro persone')
    if arm: return arm
    arm = bpy.data.armatures.new('Scheletro persone'); tmp = bpy.data.objects.new('_scheletro_tmp', arm); coll.objects.link(tmp)
    vl = bpy.context.view_layer; vl.objects.active = tmp
    bpy.ops.object.mode_set(mode='EDIT')
    eb = []
    for nome, pad, r in ossa:
        b = arm.edit_bones.new(nome); b.head = r; b.tail = (r[0], r[1] + .06, r[2]); b.roll = 0
        if pad >= 0: b.parent = eb[pad]
        b.use_connect = False; eb.append(b)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.data.objects.remove(tmp, do_unlink=True)
    arm.display_type = 'STICK'
    return arm


def applica(QUI):
    t0 = time.time(); A = os.path.join(QUI, 'anim')
    I = json.load(open(os.path.join(A, 'indice.json'), encoding='utf-8'))
    K = np.fromfile(os.path.join(A, 'canali.bin'), dtype=np.float32)
    sc = bpy.context.scene
    sc.render.fps = I['fps']; sc.render.fps_base = 1; sc.frame_start = I['primo']; sc.frame_end = I['fotogrammi']; sc.frame_current = 1
    per_id = {}
    for o in bpy.data.objects:
        if 'rf_id' in o: per_id[o['rf_id']] = o

    # ---- 1. pezzi: prima si creano le copie (dagli oggetti ancora senza animazione), poi si mettono le chiavi
    extra = json.load(open(os.path.join(A, 'extra.json'), encoding='utf-8')) if os.path.exists(os.path.join(A, 'extra.json')) else []
    coll_anim = bpy.data.collections.get('RiFRA-animazione') or bpy.data.collections.new('RiFRA-animazione')
    if coll_anim.name not in sc.collection.children: sc.collection.children.link(coll_anim)
    mancanti, nuovi = 0, 0
    for v in I['pezzi']:
        if v['id'] in per_id: continue
        if v.get('copiaDi') and v['copiaDi'] in per_id:
            src = per_id[v['copiaDi']]; ob = src.copy(); ob.animation_data_clear()
            for c in src.users_collection: c.objects.link(ob)
        elif v.get('geo') is not None:
            ob = bpy.data.objects.new('anim_' + v['id'][-12:], _mesh_extra(extra[v['geo']], 'anim_' + v['id'][-12:])); coll_anim.objects.link(ob)
        else:
            mancanti += 1; continue
        ob['rf_id'] = v['id']; ob['rf_mobile'] = True; per_id[v['id']] = ob; nuovi += 1
    animati = 0
    for v in I['pezzi']:
        ob = per_id.get(v['id'])
        if ob is None: continue
        if ob.parent is not None: ob.parent = None          # le matrici esportate sono del mondo
        ob.rotation_mode = 'QUATERNION'
        _canali(ob, v['canali'], K, 'anim_' + ob.name)
        animati += 0 if v['fermo'] else 1
    print('[animazione] pezzi', len(I['pezzi']), 'animati', animati, 'nuovi', nuovi, 'mancanti', mancanti, round(time.time() - t0, 1), 's')

    # ---- 2. persone
    coll_p = bpy.data.collections.get('RiFRA-persone') or bpy.data.collections.new('RiFRA-persone')
    if coll_p.name not in sc.collection.children: sc.collection.children.link(coll_p)
    for o in list(coll_p.objects): bpy.data.objects.remove(o, do_unlink=True)
    arm = _armatura(I['ossa'], coll_p); mat = _materiale_persone()
    raw = np.fromfile(os.path.join(A, 'persone.bin'), dtype=np.uint8)
    nomi_ossa = [o[0] for o in I['ossa']]; coppie = []
    for P in I['persone']:
        G = P['geo']; sl = lambda k, dt: np.frombuffer(raw[G[k][0]:G[k][0] + G[k][1]].tobytes(), dtype=dt)
        pos = sl('pos', np.float32).reshape(-1, 3); idx = sl('idx', np.uint32); n = len(pos); nt = len(idx) // 3
        me = bpy.data.meshes.new(P['nome']); me.vertices.add(n); me.vertices.foreach_set('co', pos.ravel())
        me.loops.add(nt * 3); me.polygons.add(nt); me.loops.foreach_set('vertex_index', idx.astype(np.int32))
        me.polygons.foreach_set('loop_start', np.arange(0, nt * 3, 3, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(nt, 3, dtype=np.int32))
        col = np.hstack([sl('col', np.float32).reshape(-1, 3), np.ones((n, 1), dtype=np.float32)])
        me.color_attributes.new('col', 'BYTE_COLOR', 'POINT').data.foreach_set('color', col.ravel())   # 8 bit sRGB: basta per tinte unite
        me.attributes.new('rug', 'FLOAT', 'POINT').data.foreach_set('value', sl('rug', np.float32))
        me.attributes.new('pelle', 'FLOAT', 'POINT').data.foreach_set('value', sl('pelle', np.float32))
        # persone realistiche (persone.py): classe del vertice, maschere della testa, posizione di riposo (per i rumori che non «nuotano»)
        if 'cls' in G: me.attributes.new('cls', 'INT', 'POINT').data.foreach_set('value', sl('cls', np.uint8).astype(np.int32))
        if 'maschere' in G: me.attributes.new('maschere', 'FLOAT_VECTOR', 'POINT').data.foreach_set('vector', sl('maschere', np.float32))
        me.attributes.new('riposo', 'FLOAT_VECTOR', 'POINT').data.foreach_set('vector', pos.ravel())
        me.validate(clean_customdata=False); me.update()
        me.polygons.foreach_set('use_smooth', np.ones(nt, dtype=bool)); me.materials.append(mat)
        ob = bpy.data.objects.new(P['nome'], me); coll_p.objects.link(ob)
        ao = bpy.data.objects.new('Scheletro_' + P['nome'][8:], arm); coll_p.objects.link(ao)
        ao.rotation_mode = 'QUATERNION'; ao.show_in_front = False
        ob.parent = ao; ob.matrix_parent_inverse = Matrix.Identity(4)
        # gruppi di vertici: pesi quantizzati a 1/1024 (l'armatura li normalizza), una chiamata per osso e valore
        ossa = sl('ossa', np.uint8).reshape(-1, 4); pesi = sl('pesi', np.float32).reshape(-1, 4)
        vid = np.repeat(np.arange(n), 4); bo = ossa.ravel(); w = pesi.ravel(); m = w > 1e-4; vid, bo, w = vid[m], bo[m], w[m]
        q = np.round(w * 1024).astype(np.int32)
        for b, nome in enumerate(nomi_ossa):
            vg = ob.vertex_groups.new(name=nome); sel = bo == b
            if not sel.any(): continue
            vb, qb = vid[sel], q[sel]
            for u in np.unique(qb):
                if u > 0: vg.add(vb[qb == u].tolist(), float(u) / 1024, 'ADD')
        md = ob.modifiers.new('Scheletro', 'ARMATURE'); md.object = ao; md.use_vertex_groups = True
        ob['rf_persona'] = P['i']; ao['rf_persona'] = P['i']; ob['rf_reparto'] = P['rep']; coppie.append((P, ob, ao))
        if P.get('asp'): ob['rf_aspetto'] = json.dumps(P['asp'])                                   # per persone.py
        if P.get('pg'): ob['rf_personaggio'] = P['pg']; ao['rf_personaggio'] = P['pg']
    bpy.context.view_layer.update()   # la posa (ao.pose) esiste solo dopo una valutazione
    for P, ob, ao in coppie:
        for pb in ao.pose.bones: pb.rotation_mode = 'QUATERNION'
        # canali: «hide» va sulla mesh, il resto sull'armatura
        _canali(ao, [c for c in P['canali'] if c[0] != 'hide'], K, 'anim_' + ao.name)
        _canali(ob, [c for c in P['canali'] if c[0] == 'hide'], K, 'anim_' + ob.name)
    sc.frame_set(1)
    print('[animazione] persone', len(I['persone']), 'fotogrammi', I['primo'], '-', I['fotogrammi'], 'a', I['fps'], 'fps', round(time.time() - t0, 1), 's')
