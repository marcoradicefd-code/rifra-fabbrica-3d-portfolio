# Costruisce blender/rifra-fabbrica.blend da zero, in background, con la riga di comando di Blender:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python blender/costruisci.py
# Moduli (ognuno ha un proprietario, file in esclusiva): importa.py (scena statica dalla pagina three.js), animazione.py (pezzi in
# movimento e persone), realismo.py (materiali, mesh, luci), spot.py (camere e montaggio dello spot). Un modulo assente si salta.
# Alla fine chiede alla finestra di Blender aperta col ponte di ricaricare il file: le modifiche si vedono «in tempo reale».
import bpy, sys, os, importlib, time, traceback
QUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, QUI)
t0 = time.time()
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
import importa; D = importa.importa(os.path.join(QUI, 'scena')); importa.luce_e_camera(D)
print('[costruisci] scena', len(D['mesh']), 'mesh', round(time.time() - t0, 1), 's')
# ordine: prima le animazioni (crea persone e copie dei pezzi), poi il realismo (vale per tutto), infine lo spot
for nome in ('animazione', 'realismo', 'persone', 'ritocchi', 'spot'):   # persone.py: realismo delle persone (capelli, abiti, pelle, micro-movimenti)
    if not os.path.exists(os.path.join(QUI, nome + '.py')): continue
    try:
        mod = importlib.import_module(nome); mod.applica(QUI); print('[costruisci]', nome, 'OK', round(time.time() - t0, 1), 's')
    except Exception:
        print('[costruisci]', nome, 'ERRORE'); traceback.print_exc()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(QUI, 'rifra-fabbrica.blend'), compress=True)
print('[costruisci] salvato', round(time.time() - t0, 1), 's')
# finestra aperta: ricarica il file (comando per il ponte)
cmd = os.path.join(QUI, 'comandi'); os.makedirs(cmd, exist_ok=True)
with open(os.path.join(cmd, time.strftime('%H%M%S') + '-ricarica.py'), 'w') as f:
    f.write("bpy.ops.wm.revert_mainfile()\n")
