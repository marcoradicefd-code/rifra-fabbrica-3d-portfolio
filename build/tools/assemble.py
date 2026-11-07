# Monta src.html dalle parti in build/parti/ (solo durante lo sviluppo della prima versione).
import json,re,io,sys,os
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'pylib'))
import segno
R=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
q=segno.make('https://www.rifra.com/produzione?utm_source=tavola-animata&utm_medium=qr&utm_campaign=come-nasce',error='m')
buf=io.BytesIO();q.save(buf,kind='svg',border=4,dark='#000',light='#fff',xmldecl=False,svgns=True)
svg=buf.getvalue().decode();w=re.search(r'width="(\d+)"',svg).group(1)
if 'viewBox' not in svg: svg=svg.replace('<svg ',f'<svg viewBox="0 0 {w} {w}" role="img" aria-label="Codice QR per rifra.com/produzione" ',1)
open(f'{R}/build/qr.svg','w').write(svg)
head=open(f'{R}/build/parti/1-testa.html').read().replace('__QR__',svg.strip())
logo=json.load(open(f'{R}/build/brand/logo-paths.json'))
js=''.join(open(f'{R}/build/parti/{p}').read() for p in ['2-motore.js','3-scene.js','4-fabbrica.js','5-stato.js'])
js=js.replace('__LOGO__',json.dumps({'viewBox':logo['viewBox'],'paths':logo['paths']},separators=(',',':')))
open(f'{R}/src.html','w').write(head+'\n<script>\n'+js+'\n</script>\n')
print('src.html montato')
