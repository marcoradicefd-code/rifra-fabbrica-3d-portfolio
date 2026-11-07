# Genera il file unico finale: font del design system RiFRA incorporati (niente internet), <head> vero.
# uso: python3 build/build.py src.html come-nasce-una-cucina-rifra.html build/fonts
import base64,re,sys,os
SRC,OUT,FONTS=sys.argv[1],sys.argv[2],sys.argv[3]
s=open(SRC).read()
css=open(os.path.join(FONTS,'g.css')).read()
faces=[]
for sub,body in re.findall(r'/\* ([\w-]+) \*/\s*@font-face\s*{([^}]*)}',css):
    if sub not in('latin','latin-ext'):continue
    fam=re.search(r"font-family: '([^']+)'",body).group(1)
    style=re.search(r'font-style: (\w+)',body).group(1)
    if style!='normal':continue   # il corsivo non si usa
    fn=[f for f in os.listdir(FONTS) if f.startswith(fam.replace(' ','')+'_'+sub+'_n')][0]
    b64=base64.b64encode(open(os.path.join(FONTS,fn),'rb').read()).decode()
    wght=re.search(r'font-weight: ([^;]+);',body).group(1)
    ur=re.search(r'unicode-range: ([^;]+);',body).group(1)
    faces.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{wght};font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2');unicode-range:{ur}}}")
head_end=s.index('</style>')+len('</style>')
head=s[:head_end]; body=s[head_end:]
head=re.sub(r'<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*','',head)
head=re.sub(r'^<meta charset="utf-8">\s*','',head)
head=head.replace('<style>','<style>\n'+'\n'.join(faces)+'\n',1)
body=body.replace('data-src="__AUDIO__"','data-src=""')
page=('<!doctype html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
      +head+'\n</head>\n<body>'+body+'\n</body>\n</html>\n')
open(OUT,'w').write(page)
print(OUT, round(len(page)/1e6,2),'MB', len(faces),'font-face')
