#!/bin/zsh
# 02/10: aspetta la fine del render dello spot (un solo lavoro pesante alla volta), poi archivia il video 3D attuale e registra quello
# con il percorso nuovo (HANDOFF § 7.0). Uscita del log: build/qc/revisione-02-10/record.log
cd "$(dirname "$0")/../.."
while pgrep -f render_tutto.sh >/dev/null || pgrep -f "Blender -b" >/dev/null; do sleep 60; done
echo "spot finito: $(date '+%H:%M')"
mv -n come-nasce-una-cucina-rifra-3d.mp4 "archivio/come-nasce-una-cucina-rifra-3d-2026-10-02-1206-prima-del-nuovo-percorso.mp4"
curl -s -o /dev/null -w "server %{http_code}\n" http://127.0.0.1:8767/
cd build/tools && node record.js "http://127.0.0.1:8767/come-nasce-una-cucina-rifra-3d.html?video=1" ../../come-nasce-una-cucina-rifra-3d.mp4 - 30
echo "video finito: $(date '+%H:%M')"
