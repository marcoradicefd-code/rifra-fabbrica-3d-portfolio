#!/usr/bin/env python3
"""Convert potrace SVG output into clean absolute-coordinate paths.

Usage: python3 vectorize.py raw.svg SCALE OUTDIR
  raw.svg : potrace -s output traced from a bitmap upscaled SCALE times
Writes logo.svg (#000000), logo-bianco.svg (#ffffff), logo-paths.json.
Paths are grouped per glyph (outer contour + its holes), sorted by row then x.
"""
import json, re, sys

raw, scale, outdir = sys.argv[1], float(sys.argv[2]), sys.argv[3]
src = open(raw).read()
m = re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', src)
tx, ty, sx, sy = map(float, m.groups())
ds = re.findall(r'<path d="([^"]+)"', src)

def T(x, y):  # potrace units -> original-pixel units
    return ((tx + sx * x) / scale, (ty + sy * y) / scale)

# ---- parse into contours: list of segments [('M',p) ('L',p) ('C',p1,p2,p3)]
contours = []
tok_re = re.compile(r'[MmLlCcZz]|-?\d+(?:\.\d+)?')
for d in ds:
    toks = tok_re.findall(d)
    i, cmd, cx, cy, cur = 0, None, 0.0, 0.0, None
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t; i += 1
            if cmd in 'Zz':
                if cur: contours.append(cur); cur = None
            continue
        rel = cmd.islower()
        c = cmd.upper()
        if c == 'M':
            x, y = float(toks[i]), float(toks[i+1]); i += 2
            if rel: x, y = cx + x, cy + y
            if cur: contours.append(cur)
            cur = [('M', (x, y))]; cx, cy = x, y
            cmd = 'l' if rel else 'L'
        elif c == 'L':
            x, y = float(toks[i]), float(toks[i+1]); i += 2
            if rel: x, y = cx + x, cy + y
            cur.append(('L', (x, y))); cx, cy = x, y
        elif c == 'C':
            v = [float(k) for k in toks[i:i+6]]; i += 6
            if rel: v = [v[0]+cx, v[1]+cy, v[2]+cx, v[3]+cy, v[4]+cx, v[5]+cy]
            cur.append(('C', (v[0], v[1]), (v[2], v[3]), (v[4], v[5]))); cx, cy = v[4], v[5]
    if cur: contours.append(cur)

# transform to pixel space
contours = [[(s[0],) + tuple(T(*p) for p in s[1:]) for s in c] for c in contours]

def sample(c, n=12):
    pts, last = [], None
    for s in c:
        if s[0] in 'ML': pts.append(s[1]); last = s[1]
        else:
            p0, p1, p2, p3 = last, s[1], s[2], s[3]
            for k in range(1, n + 1):
                t = k / n; u = 1 - t
                pts.append((u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
                            u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]))
            last = p3
    return pts

def area(pts):
    return 0.5 * sum(pts[i][0]*pts[i-1][1] - pts[i-1][0]*pts[i][1] for i in range(len(pts)))

def bbox(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

info = []
for c in contours:
    pts = sample(c)
    info.append({'c': c, 'pts': pts, 'area': area(pts), 'bb': bbox(pts)})
# outer contours share the sign of the largest contour
sign = 1 if max(info, key=lambda k: abs(k['area']))['area'] > 0 else -1
outers = [k for k in info if k['area'] * sign > 0]
holes = [k for k in info if k['area'] * sign <= 0]

def contains(a, b):
    return a[0] <= b[0] and a[1] <= b[1] and a[2] >= b[2] and a[3] >= b[3]

glyphs = [{'parts': [o], 'bb': o['bb']} for o in outers]
for h in holes:
    cands = [g for g in glyphs if contains(g['bb'], h['bb'])]
    g = min(cands, key=lambda g: (g['bb'][2]-g['bb'][0])*(g['bb'][3]-g['bb'][1]))
    g['parts'].append(h)

# rows: split on the largest vertical gap between glyph centres
glyphs.sort(key=lambda g: (g['bb'][1] + g['bb'][3]) / 2)
cy = [(g['bb'][1] + g['bb'][3]) / 2 for g in glyphs]
gaps = [(cy[i+1] - cy[i], i) for i in range(len(cy) - 1)]
gap, gi = max(gaps)
for n, g in enumerate(glyphs): g['row'] = 0 if n <= gi else 1

# merge detached pieces of one glyph (the dot of the i): same row, x-overlap >= 80% of the smaller
merged = True
while merged:
    merged = False
    for a in glyphs:
        for b in glyphs:
            if a is b or a['row'] != b['row']: continue
            ov = min(a['bb'][2], b['bb'][2]) - max(a['bb'][0], b['bb'][0])
            wmin = min(a['bb'][2]-a['bb'][0], b['bb'][2]-b['bb'][0])
            if ov >= 0.8 * wmin and (a['bb'][3] <= b['bb'][1] + 1 or b['bb'][3] <= a['bb'][1] + 1):
                a['parts'] += b['parts']
                a['bb'] = (min(a['bb'][0], b['bb'][0]), min(a['bb'][1], b['bb'][1]),
                           max(a['bb'][2], b['bb'][2]), max(a['bb'][3], b['bb'][3]))
                glyphs.remove(b); merged = True; break
        if merged: break
glyphs.sort(key=lambda g: (g['row'], g['bb'][0]))

# tight bbox of the artwork (curve samples, not control points)
allpts = [p for k in info for p in k['pts']]
X0, Y0, X1, Y1 = bbox(allpts)
W, H = X1 - X0, Y1 - Y0

def f(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def dstr(parts):
    out = []
    for k in parts:
        for s in k['c']:
            ps = ' '.join(f'{f(x - X0)} {f(y - Y0)}' for x, y in s[1:])
            out.append(f'{s[0]}{ps}')
        out.append('Z')
    return ''.join(out).replace(' -', '-')

# In the RiFRA artwork the R touches the i stem and the second R touches the A
# (they are single shapes in the original raster), so there are 10 shapes.
labels = ['Ri', 'i-dot', 'F', 'RA', 'M', 'I', 'L', 'A', 'N', 'O']
paths = [dstr(g['parts']) for g in glyphs]
if len(paths) != len(labels):
    labels = [f'g{i}' for i in range(len(paths))]

def svg(fill):
    body = '\n'.join(f'  <path id="{l}" d="{d}"/>' for i, (l, d) in enumerate(zip(labels, paths)))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(W)} {f(H)}" '
            f'width="{f(W)}" height="{f(H)}" role="img" aria-label="RiFRA Milano">\n'
            f'<g fill="{fill}">\n{body}\n</g>\n</svg>\n')

open(f'{outdir}/logo.svg', 'w').write(svg('#000000'))
open(f'{outdir}/logo-bianco.svg', 'w').write(svg('#ffffff'))
json.dump({'viewBox': [round(W, 2), round(H, 2)], 'labels': labels, 'paths': paths,
           'offsetInOriginal': [round(X0, 2), round(Y0, 2)]},
          open(f'{outdir}/logo-paths.json', 'w'))
print(f'contours={len(contours)} outers={len(outers)} holes={len(holes)} glyphs={len(glyphs)}')
print(f'viewBox 0 0 {W:.2f} {H:.2f}  offset {X0:.2f},{Y0:.2f}  labels={"".join(labels)}')
