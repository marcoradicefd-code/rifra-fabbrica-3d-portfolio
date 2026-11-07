# Prova A/B delle persone (persone.py): render da riga di comando con camere TEMPORANEE, il .blend NON si salva.
# Un processo Blender alla volta, una vista per processo; si tengono in memoria solo le persone che la camera vede (come render_spot.py).
#   Blender -b blender/rifra-fabbrica.blend --python blender/anim/prova_persone.py -- <etichetta> <vista> [percentuale]
#   viste: cefla-carico, bordatura, direttivo, spot-0200, spot-0900, spot-1000, spot-1150, spot-1300
# Uscita: blender/render/persone/<vista>-<etichetta>.png e tempi.txt (secondi per fotogramma).
import bpy, sys, os, time
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
QUI = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(QUI, 'render', 'persone'); os.makedirs(OUT, exist_ok=True)
arg = sys.argv[sys.argv.index('--') + 1:]; tag, vista = arg[0], arg[1]; perc = int(arg[2]) if len(arg) > 2 else 100
sc = bpy.context.scene; B = lambda x, z, y: Vector((x, -z, y))
VISTE = {   # nome: (fotogramma, camera, bersaglio, lente) in coordinate three (x, z, altezza); None = camera dello spot
    'cefla-carico': (640, B(68.6, 23.2, 2.0), B(68.8, 18.9, 1.1), 50),     # operatore Cefla al carico, ~4 m
    'bordatura': (620, B(41.0, 35.5, 2.6), B(43.2, 28.6, 1.1), 40),        # persone alla bordatura, ~6 m
    'direttivo': (200, B(7.2, 4.6, 2.6), B(9.1, 1.6, 1.15), 32),           # Fabio, Assunta, Luigi al tavolo
}
if vista in VISTE:
    f, p, m, l = VISTE[vista]; cam = bpy.data.objects.new('_prova', bpy.data.cameras.new('_prova')); sc.collection.objects.link(cam)
    cam.location = p; cam.rotation_euler = (m - p).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = l; cam.data.clip_start = .05; cam.data.clip_end = 800
    cam.data.dof.use_dof = False; sc.camera = cam
else: f = int(vista.split('-')[1])
sc.frame_set(f); cam = sc.camera
def discendenti(o): return [o] + [d for c in o.children for d in discendenti(c)]
tolti = 0
for a in [o for o in sc.objects if o.type == 'ARMATURE']:
    v = world_to_camera_view(sc, cam, a.matrix_world.translation)
    if not (v.z > 0 and -.3 < v.x < 1.3 and -.3 < v.y < 1.6 and v.z < 70):
        for o in discendenti(a): bpy.data.objects.remove(o, do_unlink=True); tolti += 1
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1920, 1080, perc
SENZA = os.environ.get('SENZA', '')   # prove dei tempi: 'sub' = senza suddivisione, 'capelli' = senza curve, 'liscio' = senza Corrective Smooth
for o in sc.objects:
    for m in getattr(o, 'modifiers', []):
        if 'sub' in SENZA and m.type == 'SUBSURF': m.render_levels = 0
        if 'liscio' in SENZA and m.type == 'CORRECTIVE_SMOOTH': m.show_render = False
    if 'capelli' in SENZA and o.type == 'CURVES': o.hide_render = True
if SENZA: tag += '-senza-' + SENZA
sc.render.filepath = os.path.join(OUT, '%s-%s.png' % (vista, tag)); t = time.time(); sc.frame_set(f); bpy.ops.render.render(write_still=True); dt = time.time() - t
with open(os.path.join(OUT, 'tempi.txt'), 'a') as log: log.write('%s %-6s %-14s f %4d  %d%%  %.1f s  (oggetti tolti %d)\n' % (time.strftime('%d/%m %H:%M'), tag, vista, f, perc, dt, tolti))
print('[prova] %s %s f %d %.1f s, oggetti tolti %d' % (vista, tag, f, dt, tolti))
