"""Local preview server that disables caching, so edits always show up. Usage: python tools/serve.py [port]"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
ThreadingHTTPServer(('', port), NoCache).serve_forever()
