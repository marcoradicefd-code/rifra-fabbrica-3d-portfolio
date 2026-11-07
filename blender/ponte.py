# Ponte «in tempo reale» fra Claude e Blender, scritto da noi (nessun componente aggiuntivo scaricato).
# Blender si apre con:  Blender --python blender/ponte.py
# Ogni mezzo secondo guarda blender/comandi/: ogni file .py che trova lo esegue dentro Blender (con bpy), poi lo sposta in
# comandi/fatti/ e scrive l'esito in comandi/log.txt. Così le modifiche si vedono subito nella finestra aperta.
import bpy, os, time, traceback, shutil

QUI = os.path.dirname(os.path.abspath(__file__))
CMD = os.path.join(QUI, 'comandi'); FATTI = os.path.join(CMD, 'fatti'); LOG = os.path.join(CMD, 'log.txt')
os.makedirs(FATTI, exist_ok=True)

def scrivi(msg):
    with open(LOG, 'a', encoding='utf-8') as f: f.write(time.strftime('%H:%M:%S ') + msg + '\n')

def ridisegna():
    for w in bpy.context.window_manager.windows:
        for a in w.screen.areas: a.tag_redraw()

def giro():
    try:
        for nome in sorted(os.listdir(CMD)):
            if not nome.endswith('.py'): continue
            p = os.path.join(CMD, nome)
            try:
                codice = open(p, encoding='utf-8').read()
                exec(compile(codice, p, 'exec'), {'bpy': bpy, '__name__': '__ponte__', 'QUI': QUI})
                scrivi('OK ' + nome)
            except Exception:
                scrivi('ERRORE ' + nome + '\n' + traceback.format_exc())
            shutil.move(p, os.path.join(FATTI, time.strftime('%Y%m%d-%H%M%S-') + nome))
            ridisegna()
    except Exception:
        scrivi('ERRORE ponte\n' + traceback.format_exc())
    return 0.5

bpy.app.timers.register(giro, first_interval=1.0, persistent=True)
scrivi('ponte attivo (Blender ' + bpy.app.version_string + ')')
