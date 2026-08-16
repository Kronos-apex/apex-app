"""Extrae paginas de la TCAC 2018 como JPEG.

El PDF (Downloads/tcac_web.pdf) solo lleva cifrado de PROPIETARIO: se abre con
decrypt('') y cada pagina es una imagen escaneada. `pdftotext` falla porque NO
HAY TEXTO que extraer, no porque este bloqueado.

Uso:  python ext.py 66 67 68 69 70
"""
import sys, os
from pypdf import PdfReader

SRC = os.path.expanduser("~/Downloads/tcac_web.pdf")
OUT = os.path.dirname(os.path.abspath(__file__))

r = PdfReader(SRC)
if r.is_encrypted:
    r.decrypt("")

pages = [int(a) for a in sys.argv[1:]]
if not pages:
    print("total paginas PDF:", len(r.pages))
    sys.exit(0)

for pno in pages:
    pg = r.pages[pno - 1]          # 1-indexado sobre el PDF
    imgs = list(pg.images)
    if not imgs:
        print(f"p{pno}: SIN IMAGENES")
        continue
    for i, im in enumerate(imgs):
        ext = os.path.splitext(im.name)[1] or ".jpg"
        dst = os.path.join(OUT, f"tcac-p{pno}" + (f"-{i}" if len(imgs) > 1 else "") + ext)
        with open(dst, "wb") as fh:
            fh.write(im.data)
        print(f"p{pno}: {dst}  ({len(im.data)//1024} KB)")
