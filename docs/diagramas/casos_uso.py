import math
W, H = 1400, 1000
partes = []
RX, RY = 115, 30
casos = {
  'login': (560, 95, 'Iniciar sesión'), 'dash': (560, 165, 'Consultar dashboard|y sensores'),
  'tend': (560, 235, 'Consultar tendencia|de un sensor'), 'csv': (560, 305, 'Exportar reporte CSV'),
  'bandeja': (560, 375, 'Leer bandeja|de mensajes'), 'enviar': (560, 445, 'Enviar mensaje|a un rol'),
  'atender': (560, 545, 'Atender alerta'), 'levantar': (560, 615, 'Levantar ticket'),
  'cerrar': (560, 685, 'Cerrar ticket resuelto'), 'tomar': (560, 775, 'Tomar y resolver ticket'),
  'usuarios': (560, 865, 'Gestionar usuarios'), 'umbrales': (560, 935, 'Editar umbrales|de un sensor'),
  'lecturas': (900, 150, 'Generar y validar|lecturas'), 'alertas': (900, 260, 'Generar alertas|por umbral'),
  'inactivo': (900, 370, 'Detectar sensores|inactivos'),
}
sistema_caso = {'lecturas', 'alertas', 'inactivo'}
actores = {'usuario': (130, 270, 'Usuario autenticado'), 'moni': (80, 615, 'Monitorista'),
           'sop': (210, 775, 'Soporte'), 'admin': (130, 905, 'Administrador')}
SIS = (1250, 260)

def borde_elipse(cx, cy, x, y):
    dx, dy = x - cx, y - cy
    t = 1 / math.sqrt((dx / RX) ** 2 + (dy / RY) ** 2)
    return cx + dx * t, cy + dy * t

def linea(a, b, extra=''):
    partes.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#475569" stroke-width="1.5" {extra}/>')

def actor_a_caso(act, caso):
    ax, ay, _ = actores[act]; cx, cy, _ = casos[caso]
    origen = (ax + 30, ay - 10)
    linea(origen, borde_elipse(cx, cy, *origen))

partes.append(f'<rect x="330" y="30" width="720" height="950" rx="16" fill="none" stroke="#1E293B" stroke-width="2"/>')
partes.append('<text x="690" y="58" text-anchor="middle" font-size="17" fill="#0F172A">Plataforma de Monitoreo IoT</text>')

for c in ['login', 'dash', 'tend', 'csv', 'bandeja', 'enviar']: actor_a_caso('usuario', c)
for c in ['cerrar', 'atender', 'levantar']: actor_a_caso('moni', c)
actor_a_caso('sop', 'tomar')
for c in ['usuarios', 'umbrales']: actor_a_caso('admin', c)
for c in sistema_caso:
    cx, cy, _ = casos[c]; destino = (SIS[0] - 90, SIS[1])
    linea(borde_elipse(cx, cy, *destino), destino)

def generalizacion(hijo, padre):
    hx, hy, _ = actores[hijo]; px, py, _ = actores[padre]
    a, b = (hx, hy - 48), (px, py + 62)
    linea(a, b, 'marker-end="url(#triangulo)"')
generalizacion('moni', 'usuario'); generalizacion('sop', 'usuario')
generalizacion('admin', 'moni'); generalizacion('admin', 'sop')

def dependencia(origen, destino, texto):
    ox, oy, _ = casos[origen]; dx, dy = casos[destino][:2]
    a, b = borde_elipse(ox, oy, dx, dy), borde_elipse(dx, dy, ox, oy)
    linea(a, b, 'stroke-dasharray="7 5" marker-end="url(#flecha)"')
    partes.append(f'<text x="{(a[0]+b[0])/2 + 10:.0f}" y="{(a[1]+b[1])/2:.0f}" font-size="12" fill="#475569">{texto}</text>')
dependencia('alertas', 'lecturas', '«include»')
lx, ly, _ = casos['levantar']; axx, ayy, _ = casos['atender']
partes.append(f'<path d="M{lx+RX} {ly} C {lx+RX+70} {ly}, {axx+RX+70} {ayy}, {axx+RX+2} {ayy}" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="7 5" marker-end="url(#flecha)"/>')
partes.append(f'<text x="{lx+RX+60}" y="{(ly+ayy)/2+4}" font-size="12" fill="#475569">«extend»</text>')

for clave, (x, y, t) in casos.items():
    sis = clave in sistema_caso
    partes.append(f'<ellipse cx="{x}" cy="{y}" rx="{RX}" ry="{RY}" fill="{"#F1F5F9" if sis else "#E0F2FE"}" stroke="{"#475569" if sis else "#0369A1"}" stroke-width="1.5"/>')
    lineas = t.split('|')
    for i, l in enumerate(lineas):
        partes.append(f'<text x="{x}" y="{y + 5 + (i - (len(lineas)-1)/2) * 17:.0f}" text-anchor="middle" font-size="14" fill="#0F172A">{l}</text>')

for x, y, t in actores.values():
    partes.append(f'<g stroke="#1E293B" stroke-width="2.5" fill="none"><circle cx="{x}" cy="{y-34}" r="11"/><line x1="{x}" y1="{y-23}" x2="{x}" y2="{y+8}"/>'
                  f'<line x1="{x-18}" y1="{y-10}" x2="{x+18}" y2="{y-10}"/><line x1="{x}" y1="{y+8}" x2="{x-15}" y2="{y+32}"/><line x1="{x}" y1="{y+8}" x2="{x+15}" y2="{y+32}"/></g>')
    partes.append(f'<text x="{x}" y="{y+52}" text-anchor="middle" font-size="14" font-weight="600" fill="#0F172A">{t}</text>')

partes.append(f'<rect x="{SIS[0]-90}" y="{SIS[1]-32}" width="180" height="64" rx="10" fill="#F1F5F9" stroke="#475569" stroke-width="1.5"/>')
partes.append(f'<text x="{SIS[0]}" y="{SIS[1]-6}" text-anchor="middle" font-size="13" fill="#475569">«sistema»</text>')
partes.append(f'<text x="{SIS[0]}" y="{SIS[1]+14}" text-anchor="middle" font-size="14" fill="#0F172A">Simulador y worker</text>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Helvetica, Arial, sans-serif">
<defs><marker id="triangulo" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="14" markerHeight="14" orient="auto-start-reverse"><path d="M1 1 L11 6 L1 11 Z" fill="#fff" stroke="#475569" stroke-width="1.3"/></marker>
<marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#475569" stroke-width="1.5"/></marker></defs>
<rect width="100%" height="100%" fill="#fff"/>{"".join(partes)}</svg>'''
open('casos_uso.svg', 'w').write(svg)
