# Render dello spot un'inquadratura alla volta, con la CLI di Blender:
#   Blender -b blender/rifra-fabbrica.blend --python blender/render_spot.py -- <n. inquadratura 0–12> [passo]
# Per ogni inquadratura tiene in memoria solo le persone che la camera vede (in qualche fotogramma dell'inquadratura, con margine):
# le altre si tolgono dalla scena PRIMA del render (solo in memoria, il .blend non si salva). Così Blender non ricalcola capelli,
# abiti e smussi di 38 persone a ogni fotogramma (prova del 01/10: da ~60 s a pochi secondi per fotogramma).
# Uscita: blender/render/spot/f_####.png (numerazione globale dello spot); i fotogrammi già presenti si saltano (ripartenza sicura).
import bpy, sys, os, time
from bpy_extras.object_utils import world_to_camera_view
QUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, QUI)
import spot
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
n = int(args[0]); passo = int(args[1]) if len(args) > 1 else 1
sc = bpy.context.scene; cam = sc.camera
# QUALITA=alta (02/10, contro il tremolio delle righe sottili e dei dettagli lontani): più campioni, filtro più morbido,
# riflessi e luce indiretta a piena risoluzione, più raggi d'ombra. Circa 2 volte più lento.
if os.environ.get('QUALITA') == 'alta':
    ee = sc.eevee; ee.taa_render_samples = int(os.environ.get('CAMPIONI', '128')); sc.render.filter_size = 1.8
    ee.ray_tracing_options.resolution_scale = '1'; ee.fast_gi_resolution = '1'; ee.fast_gi_ray_count = 4; ee.shadow_ray_count = 2
    print('[render_spot] qualità alta: campioni', ee.taa_render_samples)
t0, t1 = spot.SHOT[n][0], spot.SHOT[n][1]; f0, f1 = int(round(t0 * spot.FPS)) + 1, int(round(t1 * spot.FPS))
arm = [o for o in sc.objects if o.type == 'ARMATURE']
def discendenti(o):
    out = [o]
    for c in o.children: out += discendenti(c)
    return out
visti = set()
for f in range(f0, f1 + 1, 5):
    sc.frame_set(f)
    for a in arm:
        p = a.matrix_world.translation; v = world_to_camera_view(sc, cam, p)
        d = (p - cam.matrix_world.translation).length
        if v.z > 0 and -0.35 < v.x < 1.35 and -0.35 < v.y < 1.6 and d < 70: visti.add(a.name)
tolti = 0
for a in arm:
    if a.name in visti: continue
    for o in discendenti(a): bpy.data.objects.remove(o, do_unlink=True); tolti += 1
print(f'[render_spot] inquadratura {n}: fotogrammi {f0}–{f1}, persone tenute {len(visti)}/{len(arm)}, oggetti tolti {tolti}')
USCITA = os.environ.get('USCITA', os.path.join(QUI, 'render', 'spot')); os.makedirs(USCITA, exist_ok=True)   # USCITA: cartella diversa per le prove
PRIMO = int(os.environ.get('DA', f0)); ULTIMO = int(os.environ.get('A', f1))   # DA/A: solo un tratto, per le prove
for f in range(max(f0, PRIMO), min(f1, ULTIMO) + 1, passo):
    out = os.path.join(USCITA, 'f_%04d.png' % f)
    if os.path.exists(out): continue
    t = time.time(); sc.frame_set(f); sc.render.filepath = out; bpy.ops.render.render(write_still=True)
    print(f'[render_spot] f {f} {time.time() - t:.1f} s', flush=True)
