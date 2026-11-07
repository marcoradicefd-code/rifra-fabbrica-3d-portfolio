# Verifica numerica dell'animazione (agente dell'animazione): confronta il .blend con il campionamento della pagina (anim/verifica.json).
#   /Applications/Blender.app/Contents/MacOS/Blender -b blender/rifra-fabbrica.blend --python blender/anim/prova_verifica.py
# Per ogni fotogramma di controllo: posizione nel mondo di ogni osso di ogni persona e di ogni pezzo, e visibilità. Non salva nulla.
import bpy, json, os
import numpy as np
QUI = os.path.dirname(os.path.abspath(__file__))
I = json.load(open(os.path.join(QUI, 'indice.json'))); V = json.load(open(os.path.join(QUI, 'verifica.json')))
sc = bpy.context.scene; NB = len(I['ossa']); nomi = [o[0] for o in I['ossa']]
per_id = {o['rf_id']: o for o in bpy.data.objects if 'rf_id' in o}
arm = {P['i']: bpy.data.objects['Scheletro_' + P['nome'][8:]] for P in I['persone']}; mesh = {P['i']: bpy.data.objects[P['nome']] for P in I['persone']}
eo, ep, evis, n_o, n_p = 0, 0, 0, 0, 0
for k, f in enumerate(V['fotogrammi']):
    sc.frame_set(f + 1); dg = bpy.context.evaluated_depsgraph_get(); e1 = e2 = 0
    R = V['persone'][k]
    for i, ao in arm.items():
        if not R['vis'][i]: continue
        ae = ao.evaluated_get(dg); M = ae.matrix_world
        for b, nome in enumerate(nomi):
            p = M @ ae.pose.bones[nome].head; r = R['ossa'][(i * NB + b) * 3:(i * NB + b) * 3 + 3]
            e1 = max(e1, (p - __import__('mathutils').Vector(r)).length); n_o += 1
        if bool(mesh[i].hide_render) != (not R['vis'][i]): evis += 1
    for id_, (x, y, z, vis) in V['pezzi'][k].items():
        ob = per_id.get(id_)
        if ob is None: continue
        if bool(ob.hide_render) != (not vis): evis += 1
        if vis: e2 = max(e2, (ob.matrix_world.translation - __import__('mathutils').Vector((x, y, z))).length); n_p += 1
    eo, ep = max(eo, e1), max(ep, e2)
    print('[verifica] fotogramma %4d  ossa: errore max %.2f mm   pezzi: errore max %.2f mm' % (f + 1, e1 * 1000, e2 * 1000))
print('[verifica] confronti ossa %d, pezzi %d; errore massimo ossa %.2f mm, pezzi %.2f mm; visibilità diverse %d' % (n_o, n_p, eo * 1000, ep * 1000, evis))
s = sorted(V['saltoOssa'], reverse=True)[:5]
print('[verifica] salto massimo di un osso fra due fotogrammi nella pagina (m):', s)
