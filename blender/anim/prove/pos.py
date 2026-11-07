import json,numpy as np,sys
I=json.load(open('anim/indice.json')); K=np.fromfile('anim/canali.bin',dtype=np.float32)
def val(c,f):
    if c[2]=='c': return c[3]
    k=K[c[3]*2:(c[3]+c[4])*2].reshape(-1,2); return np.interp(f+1,k[:,0],k[:,1])
for P in I['persone']:
    L=[c for c in P['canali'] if c[0]=='location']; H=[c for c in P['canali'] if c[0]=='hide'][0]
    out=[]
    for t in (9,10,21.5,30,34.4,44):
        f=int(round(t*30)); p=[val(c,f) for c in L]; p2=[val(c,f+3) for c in L]
        v=np.hypot(p2[0]-p[0],p2[1]-p[1])*10
        out.append('t%g:(%.1f,%.1f)v%.2f%s'%(t,p[0],-p[1],v,'H' if val(H,f)>.5 else ''))
    print(P['nome'],' '.join(out))
