#!/bin/bash
# Render completo dello spot: le 14 inquadrature una dopo l'altra (un solo Blender alla volta: col Mac da 16 GB, due insieme lo
# hanno fatto crollare il 01/10). Ripartenza sicura: render_spot.py salta i fotogrammi già presenti. Poi titoli e montaggio.
cd "$(dirname "$0")"
N=$(python3 -c "import ast,re;print(len(ast.literal_eval(re.search(r'SHOT = (\[.*?\n\])', open('spot.py').read(), re.S).group(1))))")
for i in $(seq 0 $((N-1))); do
  /Applications/Blender.app/Contents/MacOS/Blender -b rifra-fabbrica.blend --python render_spot.py -- $i 2>&1 | grep "\[render_spot\] inquadratura"
done
ls render/spot/f_*.png | wc -l
./monta_spot.sh
