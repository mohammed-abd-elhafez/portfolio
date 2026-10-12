#!/usr/bin/env sh
# Run once from the project root:  sh assets/fonts/get-fonts.sh
# Downloads Latin-subset WOFF2 files and writes assets/css/fonts.css. Self-hosted: no third party serves fonts at runtime.
set -e; cd "$(dirname "$0")"; B=https://cdn.jsdelivr.net/fontsource/fonts
curl -fLo cormorant-garamond-600.woff2 $B/cormorant-garamond@latest/latin-600-normal.woff2
curl -fLo manrope-400.woff2 $B/manrope@latest/latin-400-normal.woff2
curl -fLo manrope-600.woff2 $B/manrope@latest/latin-600-normal.woff2
curl -fLo jetbrains-mono-400.woff2 $B/jetbrains-mono@latest/latin-400-normal.woff2
cat > ../css/fonts.css <<'CSS'
@font-face{font-family:"Cormorant Garamond";src:url(../fonts/cormorant-garamond-600.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:Manrope;src:url(../fonts/manrope-400.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:Manrope;src:url(../fonts/manrope-600.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(../fonts/jetbrains-mono-400.woff2) format("woff2");font-weight:400;font-display:swap}
CSS
echo "Fonts ready."
