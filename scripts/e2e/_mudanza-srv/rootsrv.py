# Sirve un directorio en / (como Pages con dominio propio) y con prefijo /apex-app/ (como hoy).
import http.server, sys, functools, os
root=sys.argv[2]; prefix=sys.argv[3] if len(sys.argv)>3 else ''
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if prefix and path.startswith(prefix): path=path[len(prefix)-1:]
        return super().translate_path(path)
    # Como GitHub Pages (medido: manda Access-Control-Allow-Origin: * en todo), para que el
    # origen viejo pueda leer mudanza.json del nuevo.
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin','*')
        super().end_headers()
    def log_message(self,*a): pass
http.server.ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),functools.partial(H,directory=root)).serve_forever()
