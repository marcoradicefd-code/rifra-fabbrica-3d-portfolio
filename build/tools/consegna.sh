#!/bin/bash
# Macrocartella di consegna, accanto al progetto: ../RiFRA-consegna-<data>/ (riordinata il 02/10 sera, Marco: «falla il più ordinata possibile»)
#   LEGGIMI.txt                        → cosa c'è (per Marco)
#   RiFRA-fabbrica-3D-<data>.zip       → la cartella 01 già zippata: è il file da inviare al cliente
#   01_Per-il-cliente/                 → le due pagine 3D (IT, EN), il codice in zip (come «Download ZIP» di GitHub), LEGGIMI per il cliente
#   02_Video/                          → spot e giro in 3D (versioni precedenti: il 02/10 Marco ha fermato i nuovi render)
#   03_Repository-git/                 → clone Git del progetto con la storia, per chi sviluppa
#   IMPRONTE.sha256                    → impronte di tutti i file consegnati (fuori dal clone Git)
# Una consegna nella vecchia disposizione (file sciolti e «repository/») viene spostata in archivio/ del progetto, non cancellata.
# Non invia né pubblica nulla. Uso: build/tools/consegna.sh
set -e
R="$(cd "$(dirname "$0")/../.." && pwd)"; DATA=$(date +%Y-%m-%d); D="$(dirname "$R")/RiFRA-consegna-$DATA"
if [ -n "$(git -C "$R" status --porcelain)" ]; then echo "ATTENZIONE: modifiche non salvate nel repository (git status): fai prima un commit"; exit 1; fi
mkdir -p "$D"
# vecchia disposizione → archivio del progetto
A="$R/archivio/consegna-$DATA-disposizione-precedente"
for f in "$D"/*.mp4 "$D"/*.html "$D"/IMPRONTE.sha256 "$D"/LEGGIMI.txt; do [ -f "$f" ] && { mkdir -p "$A"; mv "$f" "$A/"; }; done
[ -d "$D/repository" ] && [ ! -d "$D/03_Repository-git" ] && mv "$D/repository" "$D/03_Repository-git"

C="$D/01_Per-il-cliente"; V="$D/02_Video"; G="$D/03_Repository-git"; mkdir -p "$C" "$V"
cp -p "$R/come-nasce-una-cucina-rifra-3d.html" "$R/come-nasce-una-cucina-rifra-3d-en.html" "$C/"
cp "$R/build/tools/LEGGIMI-cliente.txt" "$C/LEGGIMI.txt"
rm -f "$C/Rifra-FABBRICA-3D-codice.zip"   # copia del repository all'ultimo commit: si rifà sempre
git -C "$R" archive --format=zip --prefix=Rifra-FABBRICA-3D/ -o "$C/Rifra-FABBRICA-3D-codice.zip" HEAD
for f in come-nasce-una-cucina-rifra-spot.mp4 come-nasce-una-cucina-rifra-3d.mp4; do [ -f "$R/$f" ] && cp -p "$R/$f" "$V/"; done
cp "$R/build/tools/LEGGIMI-video.txt" "$V/LEGGIMI.txt"
if [ -d "$G/.git" ]; then git -C "$G" pull -q --ff-only "$R" main; else git clone -q --no-hardlinks "$R" "$G"; fi
git -C "$G" remote remove origin 2>/dev/null || true   # il clone non punta all'SSD di Marco
cp "$R/build/tools/LEGGIMI-consegna.txt" "$D/LEGGIMI.txt"
# il pacchetto da inviare: la cartella 01 zippata (senza file nascosti di macOS)
# dentro lo zip la cartella si chiama «RiFRA-fabbrica-3D» (più chiaro per il cliente): copia temporanea in una cartella di sistema
Z="$D/RiFRA-fabbrica-3D-$DATA.zip"; rm -f "$Z"; T="$(mktemp -d)"; cp -Rp "$C" "$T/RiFRA-fabbrica-3D"
( cd "$T" && zip -q -r -X "$Z" RiFRA-fabbrica-3D -x '*.DS_Store' ); rm -rf "$T"
( cd "$D" && find . -path ./03_Repository-git -prune -o -type f ! -name IMPRONTE.sha256 ! -name .DS_Store -print | sort | xargs shasum -a 256 > IMPRONTE.sha256 )
( cd "$D" && du -sh * ) ; echo "FATTO $D"
