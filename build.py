"""Build index.html: src/page.html with the fonts and the MQTT library inlined, so the page is one self-contained file."""
import base64
import pathlib

root = pathlib.Path(__file__).parent
src = (root / 'src' / 'page.html').read_text(encoding='utf-8')


def b64(path):
    return base64.b64encode((root / path).read_bytes()).decode()


faces = (
    '@font-face{font-family:"Rubik";font-style:normal;font-weight:300 900;font-display:swap;'
    'src:url(data:font/woff2;base64,%s) format("woff2")}\n'
    '@font-face{font-family:"Rubik";font-style:italic;font-weight:300 900;font-display:swap;'
    'src:url(data:font/woff2;base64,%s) format("woff2")}'
) % (b64('fonts/Rubik-latin.woff2'), b64('fonts/Rubik-Italic-latin.woff2'))
lib = (root / 'vendor' / 'mqtt.min.js').read_text(encoding='utf-8').replace('</script', '<\\/script')

assert '/*@FONT_FACES@*/' in src and '/*@MQTT_LIB@*/' in src
out = src.replace('/*@FONT_FACES@*/', faces).replace('/*@MQTT_LIB@*/', lib)
(root / 'index.html').write_text(out, encoding='utf-8', newline='\n')
print('index.html', len(out.encode()), 'bytes')
