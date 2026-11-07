# Prova dell'animazione (agente dell'animazione): render di controllo da riga di comando, camere TEMPORANEE (il .blend non si salva).
#   /Applications/Blender.app/Contents/MacOS/Blender -b blender/rifra-fabbrica.blend --python blender/anim/prova_render.py -- [nomi…]
# Viste in blender/anim/viste.json (coordinate three: le stesse delle foto della pagina, esporta-animazione.js --foto).
# Fotogramma = round(t · 30) + 1. Uscita: blender/render/anim/<nome>-blender.png
import bpy, json, os, sys, math
from mathutils import Vector
QUI = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(QUI, '..', 'render', 'anim'); os.makedirs(OUT, exist_ok=True)
solo = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
sc = bpy.context.scene; sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1280, 720, 100
try: sc.eevee.taa_render_samples = 32
except Exception: pass
b = lambda p: Vector((p[0], -p[2], p[1]))
for v in json.load(open(os.path.join(QUI, 'viste.json'))):
    if solo and not any(s in v['nome'] for s in solo): continue
    cam = bpy.data.objects.new('_prova', bpy.data.cameras.new('_prova')); sc.collection.objects.link(cam)
    pos, tgt = b(v['camera']), b(v['bersaglio']); cam.location = pos; cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    cam.data.sensor_fit = 'VERTICAL'; cam.data.angle_y = math.radians(v.get('fov', 38)); cam.data.clip_start = .05; cam.data.clip_end = 2000
    sc.camera = cam; sc.frame_set(round(v['t'] * 30) + 1)
    sc.render.filepath = os.path.join(OUT, v['nome'] + '-blender.png'); bpy.ops.render.render(write_still=True)
    print('[prova]', v['nome'], 'fotogramma', sc.frame_current)
    bpy.data.objects.remove(cam, do_unlink=True)
