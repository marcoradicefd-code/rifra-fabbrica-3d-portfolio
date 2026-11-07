#!/bin/bash
# Prepara il pacchetto da passare a un'altra persona: CONSEGNA-3D-<data>/ nella cartella del progetto, con
#  1. RiFRA-3D-pagina.zip    → la pagina unica offline (doppio clic) + LEGGIMI.txt per chi la usa
#  2. RiFRA-3D-sorgenti.zip  → sorgenti three.js e strumenti per chi la modifica (senza node_modules, prove, archivio, video)
# Non pubblica né invia nulla: l'invio lo fa Marco (SwissTransfer / WeTransfer / e-mail: la pagina pesa ~1,3 MB).
set -e
R="$(cd "$(dirname "$0")/../.." && pwd)"; D="$R/CONSEGNA-3D-$(date +%Y-%m-%d)"; mkdir -p "$D/pagina" "$D/sorgenti"
cp "$R/come-nasce-una-cucina-rifra-3d.html" "$R/come-nasce-una-cucina-rifra-3d-en.html" "$D/pagina/"
cp "$R/build/tools/LEGGIMI-pagina.txt" "$D/pagina/LEGGIMI.txt"
( cd "$D/pagina" && zip -q -r -X ../RiFRA-3D-pagina.zip . )
# sorgenti: 3d/, three.js r186 (MIT), font, strumenti di build e controllo, documenti
rsync -a --exclude node_modules --exclude '.DS_Store' "$R/3d" "$D/sorgenti/"
mkdir -p "$D/sorgenti/build" && rsync -a "$R/build/vendor" "$R/build/fonts" "$R/build/brand" "$D/sorgenti/build/"
mkdir -p "$D/sorgenti/build/tools" && rsync -a --exclude node_modules --exclude '.DS_Store' "$R/build/tools/build3d.mjs" "$R/build/tools/package.json" "$R/build/tools/package-lock.json" "$R/build/tools/controlli" "$D/sorgenti/build/tools/"
cp "$R/CLAUDE.md" "$R/HANDOFF.md" "$R/DESIGN-SYSTEM.md" "$D/sorgenti/" 2>/dev/null || true
cp "$R/build/tools/LEGGIMI-sorgenti.md" "$D/sorgenti/LEGGIMI.md"
mkdir -p "$D/sorgenti/ricerca" && cp "$R/ricerca/TABELLA-FATTI.md" "$R/ricerca/LAYOUT-MACCHINE.json" "$R/ricerca/MAPPA-FOTO.md" "$D/sorgenti/ricerca/" 2>/dev/null || true
( cd "$D/sorgenti" && zip -q -r -X ../RiFRA-3D-sorgenti.zip . )
shasum -a 256 "$D"/*.zip > "$D/IMPRONTE.sha256"
ls -la "$D"
