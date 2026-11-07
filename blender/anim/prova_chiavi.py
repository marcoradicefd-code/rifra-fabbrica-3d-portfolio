# Controllo: le chiavi (pose, radici, visibilità) di pezzi e persone sono IDENTICHE a quelle di riferimento
# (archivio/blender-anim-2026-10-01-prima-dei-personaggi/). Si lancia col Python di Blender (numpy):
#   /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 blender/anim/prova_chiavi.py
import json, os, numpy as np
QUI = os.path.dirname(os.path.abspath(__file__)); RIF = os.path.join(QUI, '..', '..', 'archivio', 'blender-anim-2026-10-01-prima-dei-personaggi')
I0 = json.load(open(os.path.join(RIF, 'indice.json'))); I1 = json.load(open(os.path.join(QUI, 'indice.json')))
K0 = np.fromfile(os.path.join(RIF, 'canali.bin'), dtype=np.float32); K1 = np.fromfile(os.path.join(QUI, 'canali.bin'), dtype=np.float32)
v = lambda c, K: ('c', c[3]) if c[2] == 'c' else (c[2], K[c[3] * 2:(c[3] + c[4]) * 2].tobytes())
dz = sum(a['id'] != b['id'] or any(x[:2] != y[:2] or v(x, K0) != v(y, K1) for x, y in zip(a['canali'], b['canali'])) for a, b in zip(I0['pezzi'], I1['pezzi']))
dp = [a['nome'] for a, b in zip(I0['persone'], I1['persone']) if a['nome'] != b['nome'] or a['h'] != b['h'] or len(a['canali']) != len(b['canali']) or any(x[:2] != y[:2] or v(x, K0) != v(y, K1) for x, y in zip(a['canali'], b['canali']))]
print('pezzi', len(I1['pezzi']), 'diversi', dz, '· persone di riferimento', len(I0['persone']), 'diverse', len(dp), dp[:5], '· persone ora', len(I1['persone']))
