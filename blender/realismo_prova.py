# Provini del realismo da riga di comando (NON nella finestra di Marco): apre il .blend costruito, crea camere temporanee (non salvate),
# renderizza in blender/render/realismo/<nome>.png e affianca la foto vera più simile (<nome>-confronto.jpg). Proprietario: agente del realismo.
# uso: Blender -b blender/rifra-fabbrica.blend --python blender/realismo_prova.py -- [nomi,separati,da,virgole] [percentuale] [campioni]
#   es.  … -- tavola,esterno,interno,cefla,uffici 100 48
# Posizioni delle camere dai punti di ripresa di ricerca/MAPPA-FOTO.md (§ 5, coordinate della pagina → Blender: x, −z).
import bpy, sys, os, math, time, subprocess
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importa

QUI = os.path.dirname(os.path.abspath(__file__)); RADICE = os.path.dirname(QUI)
OUT = os.path.join(QUI, 'render', 'realismo'); os.makedirs(OUT, exist_ok=True)
F = os.path.join(RADICE, 'FOTO', '02-fonti')
# nome: (involucro chiuso?, posizione, punto guardato, focale mm su 36 mm, foto di confronto)
INQ = {
    'tavola':  (False, None, None, None, os.path.join(RADICE, 'FOTO', '00-da-vedere', '01-tavola-intera-fine-video.png')),
    'esterno': (True, (4, -56.5, 1.7), (14, -40.6, 3.6), 24, os.path.join(F, 'esterno', 'streetview-facciata-cancello.webp')),     # E2 (5, 49) verso N
    'interno': (True, (14, -33.5, 1.55), (40, -33.0, 2.6), 22, os.path.join(F, 'foto', 'IMG_7441.jpg')),                          # F 7441 (14, 33,5) verso E
    'cefla':   (True, (60.0, -23.6, 1.55), (59.5, -16.0, 2.1), 14, os.path.join(F, 'foto', 'IMG_7450.jpg')),                      # F 7450 (60, 25) verso N
    'uffici':  (True, (9.4, -3.8, 1.55), (0.5, -1.6, 1.1), 16, os.path.join(F, 'foto', 'IMG_7464.jpg')),                           # F 7464 (9,5, 4,8) verso O
}

def camera(nome, pos, mira, focale):
    cam = bpy.data.objects.new('RF_prova_' + nome, bpy.data.cameras.new('RF_prova_' + nome)); bpy.context.scene.collection.objects.link(cam)
    cam.location = pos; cam.rotation_euler = (Vector(mira) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = focale; cam.data.sensor_width = 36; cam.data.clip_start = .05; cam.data.clip_end = 3000
    return cam

def main():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    nomi = (a[0] if a else 'tavola,esterno,interno,cefla,uffici').split(',')
    pct = int(a[1]) if len(a) > 1 else 100; spp = int(a[2]) if len(a) > 2 else 48
    sc = bpy.context.scene; sc.render.resolution_percentage = pct; sc.eevee.taa_render_samples = spp
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    # tavola: la camera della pagina ricostruita da scena.json (la «Camera RiFRA» del file può essere animata dallo spot)
    import json; D = json.load(open(os.path.join(QUI, 'scena', 'scena.json'), encoding='utf-8'))
    cam_pagina = bpy.data.objects.new('RF_prova_pagina', bpy.data.cameras.new('RF_prova_pagina')); sc.collection.objects.link(cam_pagina)
    c = D['camera']; from mathutils import Matrix, Quaternion
    R = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0))) @ Quaternion((c['quat'][3], *c['quat'][:3])).to_matrix()
    cam_pagina.matrix_world = Matrix.Translation((c['pos'][0], -c['pos'][2], c['pos'][1])) @ R.to_4x4()
    cam_pagina.data.sensor_fit = 'VERTICAL'; cam_pagina.data.angle_y = math.radians(c['fov']); cam_pagina.data.clip_end = 2000; righe = []
    for nome in nomi:
        chiuso, pos, mira, focale, foto = INQ[nome]
        importa.involucro(chiuso)
        sc.camera = cam_pagina if pos is None else camera(nome, pos, mira, focale)
        sc.render.filepath = os.path.join(OUT, nome + '.png')
        t = time.time(); bpy.ops.render.render(write_still=True); dt = time.time() - t
        righe.append('%-8s %4d%%  %3d campioni  %.1f s' % (nome, pct, spp, dt)); print('[prova]', righe[-1])
        if foto and os.path.exists(foto):
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', sc.render.filepath, '-i', foto, '-filter_complex',
                            '[0]scale=-2:720[a];[1]scale=-2:720[b];[a][b]hstack', '-q:v', '3', os.path.join(OUT, nome + '-confronto.jpg')], check=True)
    with open(os.path.join(OUT, 'tempi.txt'), 'a', encoding='utf-8') as f:
        f.write(time.strftime('%d/%m %H:%M ') + bpy.app.version_string + '\n' + '\n'.join(righe) + '\n')

main()
