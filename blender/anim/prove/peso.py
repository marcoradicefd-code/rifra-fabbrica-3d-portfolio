import bpy, os, tempfile
nk = 0; nf = 0
for a in bpy.data.actions:
    for l in a.layers:
        for s in l.strips:
            for cb in s.channelbags:
                for fc in cb.fcurves: nk += len(fc.keyframe_points); nf += 1
print('PESO fcurve', nf, 'chiavi', nk)
d = '/Volumes/PortableSSD/01_Clienti/Rifra/Produzione-animata/blender/anim/_peso'; os.makedirs(d, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=d + '/a.blend', copy=True, compress=False)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.ops.wm.save_as_mainfile(filepath=d + '/b.blend', copy=True, compress=False)
for o in list(bpy.data.collections['RiFRA-persone'].objects): bpy.data.objects.remove(o)
for m in list(bpy.data.meshes):
    if m.users == 0: bpy.data.meshes.remove(m)
bpy.ops.wm.save_as_mainfile(filepath=d + '/c.blend', copy=True, compress=False)
for f in 'abc': print('PESO', f, os.path.getsize(d + '/' + f + '.blend') / 1e6)
