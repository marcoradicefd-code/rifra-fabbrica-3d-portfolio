import bpy
print('VER', bpy.app.version_string)
a = bpy.data.actions.new('x')
print([m for m in dir(a) if 'fcurve' in m.lower() or 'slot' in m.lower() or 'layer' in m.lower()])
ob = bpy.data.objects.new('e', None); bpy.context.scene.collection.objects.link(ob)
ob.animation_data_create(); ob.animation_data.action = a
fc = a.fcurve_ensure_for_datablock(ob, 'location', index=1)
print(fc, type(fc))
fc.keyframe_points.add(3); fc.keyframe_points.foreach_set('co', [1,0, 2,1, 3,0]);
import numpy as np
fc.keyframe_points.foreach_set('interpolation', [1,1,1])  # enum int?
fc.update()
bpy.context.scene.frame_set(2); print(ob.location[:])
print(bpy.context.scene.render.engine, [e for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys()] if hasattr(bpy.types.RenderSettings.bl_rna.properties['engine'],'enum_items') else '')
print([i.identifier for i in bpy.types.Keyframe.bl_rna.properties['interpolation'].enum_items][:4])
print(hasattr(bpy.types.Object,'hide_render'))
