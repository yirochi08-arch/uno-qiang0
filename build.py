"""Build the site: each page in src/ becomes one self-contained HTML file (fonts, MQTT.js and the shared room code inlined).

  src/hub.html   -> index.html   (the game hub)
  src/page.html  -> uno.html     (UNO 抢0)
  src/poker.html -> poker.html   (斗地主 / 跑得快, picked with ?g=ddz|pdk)
"""
import base64
import pathlib

root = pathlib.Path(__file__).parent


def b64(path):
    return base64.b64encode((root / path).read_bytes()).decode()


FACES = (
    '@font-face{font-family:"Rubik";font-style:normal;font-weight:300 900;font-display:swap;'
    'src:url(data:font/woff2;base64,%s) format("woff2")}\n'
    '@font-face{font-family:"Rubik";font-style:italic;font-weight:300 900;font-display:swap;'
    'src:url(data:font/woff2;base64,%s) format("woff2")}'
) % (b64('fonts/Rubik-latin.woff2'), b64('fonts/Rubik-Italic-latin.woff2'))
MQTT = (root / 'vendor' / 'mqtt.min.js').read_text(encoding='utf-8').replace('</script', '<\\/script')
NETROOM = (root / 'src' / 'netroom.js').read_text(encoding='utf-8')

PAGES = {'hub.html': 'index.html', 'page.html': 'uno.html', 'poker.html': 'poker.html'}

for src_name, out_name in PAGES.items():
    src = (root / 'src' / src_name).read_text(encoding='utf-8')
    assert '/*@FONT_FACES@*/' in src, src_name
    out = src.replace('/*@FONT_FACES@*/', FACES)
    if '/*@MQTT_LIB@*/' in out:
        out = out.replace('/*@MQTT_LIB@*/', MQTT)
    if '/*@NETROOM@*/' in out:
        out = out.replace('/*@NETROOM@*/', NETROOM)
    (root / out_name).write_text(out, encoding='utf-8', newline='\n')
    print(out_name, len(out.encode()), 'bytes')
