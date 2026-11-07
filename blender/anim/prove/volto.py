import bpy, math, sys
from mathutils import Vector
sc = bpy.context.scene; sc.render.resolution_x, sc.render.resolution_y = 960, 720
sc.eevee.taa_render_samples = 32; sc.render.use_motion_blur = False
out = sys.argv[sys.argv.index('--') + 1]
for nome, f in (('Persona_08_23', 361), ('Persona_04_14', 361), ('Persona_09_25', 361)):
    sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get()
    ao = bpy.data.objects['Scheletro_' + nome[8:]].evaluated_get(dg); M = ao.matrix_world
    head = M @ ao.pose.bones['testa'].head; fwd = (M.to_3x3() @ (ao.pose.bones['testa'].matrix.to_3x3() @ Vector((0, 0, 1)))).normalized()
    for k, (d, up) in enumerate(((1.0, .08), (2.6, .5))):
        cam = bpy.data.objects.new('_c', bpy.data.cameras.new('_c')); sc.collection.objects.link(cam)
        tgt = head + Vector((0, 0, .05 if k == 0 else -.5)); pos = tgt + fwd * d + Vector((0, 0, up)) + fwd.cross(Vector((0, 0, 1))) * d * .35
        cam.location = pos; cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler(); cam.data.angle_y = math.radians(30 if k == 0 else 40); cam.data.sensor_fit = 'VERTICAL'; cam.data.clip_start = .02
        sc.camera = cam; sc.render.filepath = f'{out}/{nome}-{k}.png'; bpy.ops.render.render(write_still=True); bpy.data.objects.remove(cam)
