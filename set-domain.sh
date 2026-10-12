#!/usr/bin/env sh
# Usage (run once from the project root, before deploying):  sh set-domain.sh yourdomain.com
[ -z "$1" ] && { echo "Usage: sh set-domain.sh yourdomain.com"; exit 1; }
for f in $(find . -name "*.html" -o -name "*.xml" -o -name robots.txt); do
  sed -i.bak -e "s#\[YOUR-DOMAIN\]#$1#g" -e 's#<!--CANON##g' -e 's#CANON-->##g' -e 's|^\#SITEMAP ||' "$f" && rm -f "$f.bak"
done
echo "Domain set: canonical tags, sitemap and robots.txt are now active."
