# Compenetrazioni NUOVE dovute ai gusci degli abiti (persone.py): per ogni guscio, gli oggetti fermi vicini che il guscio tocca e il
# corpo (prima dei gusci) no. Ogni 50 fotogrammi. Non salva nulla.
#   Blender -b blender/rifra-fabbrica.blend --python blender/anim/prova_gusci.py
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sc = bpy.context.scene; P = bpy.data.collections['RiFRA-persone']
def bvh(ob, dg):
    oe = ob.evaluated_get(dg); m = oe.to_mesh(); M = ob.matrix_world
    t = BVHTree.FromPolygons([M @ v.co for v in m.vertices], [list(p.vertices) for p in m.polygons]); oe.to_mesh_clear(); return t
fermi = [o for o in sc.objects if o.type == 'MESH' and o.name not in P.all_objects and not (o.animation_data and o.animation_data.action) and not o.hide_render]
gusci = [o for o in P.objects if o.type == 'MESH' and (o.name.startswith('Maglia_') or o.name.startswith('Pantaloni_'))]
dg = bpy.context.evaluated_depsgraph_get(); cache = {}; nuovi = {}
for f in range(1, 1502, 50):
    sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get()
    for g in gusci:
        if g.hide_render: continue
        corpo = bpy.data.objects['Persona_' + g.name.split('_', 1)[1]]; c = g.parent.matrix_world.translation
        vic = [o for o in fermi if (o.matrix_world @ (sum((Vector(b) for b in o.bound_box), Vector()) / 8) - c).length < 1.5 + max(o.dimensions) * .5]
        if not vic: continue
        tg = bvh(g, dg); tc = bvh(corpo, dg)
        for o in vic:
            if o.name not in cache: cache[o.name] = bvh(o, dg)
            a = len(tg.overlap(cache[o.name])); b = len(tc.overlap(cache[o.name]))
            if a > 0 and b == 0: nuovi.setdefault((g.name, o.name), []).append((f, a))
for (g, o), l in sorted(nuovi.items()): print('[gusci] NUOVO %-28s contro %-30s fotogrammi %s' % (g, o[:30], [x[0] for x in l][:8]))
print('[gusci] gusci', len(gusci), 'coppie nuove', len(nuovi))
