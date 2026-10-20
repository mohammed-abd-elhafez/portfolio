"""Checks that every liveUrl in data/projects.json answers 200 (a dead one would show a 404 page in the telescope screen).
Usage: python tools/check-projects.py"""
import json
import sys
import urllib.request

bad = 0
for p in json.load(open('data/projects.json', encoding='utf-8')):
    url = p.get('liveUrl')
    if not url:
        continue
    try:
        status = urllib.request.urlopen(url, timeout=15).status
    except Exception as e:
        status = e
    ok = status == 200
    bad += not ok
    print(('OK  ' if ok else 'FAIL'), url, '' if ok else status)
sys.exit(1 if bad else 0)
