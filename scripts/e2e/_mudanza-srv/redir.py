import http.server, sys
target=sys.argv[2]
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        p=self.path
        if p.startswith('/apex-app/'): p=p[len('/apex-app'):]
        elif p=='/apex-app': p='/'
        self.send_response(301); self.send_header('Location', target+p); self.end_headers()
    def log_message(self,*a): pass
http.server.ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),H).serve_forever()
