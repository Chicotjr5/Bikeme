#!/usr/bin/env python3
"""Bici server — static files + JSON file storage API (stdlib only).

Usage: python3 server.py [port]   (default port 8080)

Endpoints:
  GET  /api/data  -> {"rides": [...], "isFake": true|false}
  POST /api/data  -> body: same JSON shape, saved to data/rides.json
  everything else -> static files from this directory
"""
import json
import os
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, 'data')
DATA_FILE = os.path.join(DATA_DIR, 'rides.json')
_lock = threading.Lock()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE, **kwargs)

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?')[0] == '/api/data':
            with _lock:
                if os.path.exists(DATA_FILE):
                    try:
                        with open(DATA_FILE, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                    except Exception:
                        data = {'rides': [], 'isFake': True}
                else:
                    data = {'rides': [], 'isFake': True}
            self._json(200, data)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.split('?')[0] != '/api/data':
            self._json(404, {'error': 'not found'})
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload.get('rides'), list):
                raise ValueError('rides must be a list')
            safe = {
                'rides': payload['rides'],
                'isFake': bool(payload.get('isFake', False)),
            }
            with _lock:
                os.makedirs(DATA_DIR, exist_ok=True)
                tmp = DATA_FILE + '.tmp'
                with open(tmp, 'w', encoding='utf-8') as f:
                    json.dump(safe, f, ensure_ascii=False)
                os.replace(tmp, DATA_FILE)
            self._json(200, {'ok': True})
        except Exception as e:
            self._json(400, {'error': str(e)})

    def log_message(self, fmt, *args):
        if not args or '/api/' not in str(args[0]):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print('Bici running at http://localhost:%d (data: %s)' % (port, DATA_FILE))
    server.serve_forever()


if __name__ == '__main__':
    main()
