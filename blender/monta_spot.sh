#!/bin/bash
# Monta lo spot: render di Blender (blender/render/spot/f_####.png) + motion graphic trasparente (blender/titoli/motion-png/t_####.png,
# da build/tools/blender/titoli.js con titoli/motion.html) → come-nasce-una-cucina-rifra-spot.mp4 nella cartella del progetto.
# 1080p30, H.264 High 4.1, BT.709. Musica «Loyalty (No Drums)» di BreakzStudios (Pixabay Content License, musica/LICENZA.md):
# 50 s da 2:16,0, così la ripartenza piena cade sul taglio della foratura a 16,5 s (misura del 01/10, da confermare a orecchio).
# Audio normalizzato in due passaggi a −14 LUFS e −1 dBTP (web e social); con FIERA=1 a −16 LUFS (file …-spot-fiera.mp4).
# Il file d'uscita esistente va prima spostato in archivio/ (regola del progetto): lo fa questo script.
set -e
cd "$(dirname "$0")"
I=-14; SUF=""; [ "$FIERA" = "1" ] && I=-16 && SUF="-fiera"
OUT="../come-nasce-una-cucina-rifra-spot$SUF.mp4"; MUS=musica/breakzstudios-loyalty-no-drums-236311.mp3; INIZIO=136.0
FADE="afade=t=in:d=0.6,afade=t=out:st=46.5:d=3.5"
# 1° passaggio: misura
M=$(ffmpeg -hide_banner -ss $INIZIO -t 50 -i $MUS -af "$FADE,loudnorm=I=$I:TP=-1:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
v() { echo "$M" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
LN="loudnorm=I=$I:TP=-1:LRA=11:measured_I=$(v input_i):measured_TP=$(v input_tp):measured_LRA=$(v input_lra):measured_thresh=$(v input_thresh):offset=$(v target_offset):linear=true"
if [ -f "$OUT" ]; then mkdir -p ../archivio && mv "$OUT" "../archivio/come-nasce-una-cucina-rifra-spot$SUF-$(date +%Y-%m-%d-%H%M)-sostituito.mp4"; fi
# 2° passaggio: montaggio
ffmpeg -v error -y -framerate 30 -start_number 1 -i render/spot/f_%04d.png -framerate 30 -start_number 1 -i titoli/motion-png/t_%04d.png \
  -ss $INIZIO -t 50 -i $MUS \
  -filter_complex "[0:v]format=rgb24[a];[a][1:v]overlay=format=auto,format=yuv420p[v];[2:a]$FADE,$LN,aresample=48000[m]" -map "[v]" -map "[m]" \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 16 -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT"
echo "FATTO $OUT"
