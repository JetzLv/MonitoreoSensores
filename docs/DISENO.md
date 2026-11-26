# Sistema de diseño

Basado en la referencia "Real-Time Monitoring" (designmd.app), adaptado a una consola de operaciones que se proyecta en clase y se usa por varios roles.

## Principios

1. **Mostrar lo que importa ahora.** El estado de cada sensor se lee de un vistazo; el detalle está a un clic.
2. **El color significa algo.** Rojo, ámbar y verde se reservan para estados. Nunca decoran.
3. **El color nunca va solo.** Cada estado lleva ícono y texto.
4. **Lo vivo se declara.** Toda vista con actualización automática muestra la hora de la última actualización, el estado de conexión y un botón para pausar.

## Qué se adopta y qué se adapta de la referencia

| Referencia | Decisión | Motivo |
|---|---|---|
| Fuente del sistema + JetBrains Mono | Se adopta | Sin descargas: carga inmediata y funciona sin internet en la defensa |
| Base de 8 px, radio de 8 px | Se adopta | Ritmo consistente |
| Densidad alta | Se adopta | Es una consola de monitoreo |
| Rojo `#FF0000` como color primario | **Se cambia** | El rojo queda reservado para estados críticos. Si los botones fueran rojos, el usuario no distinguiría una acción de una alarma |
| Naranja y verde puros | **Se ajustan** | `#FFA500` y `#22C55E` sobre fondo blanco no alcanzan contraste 4.5:1 en texto |
| Movimiento expresivo, hover con `scale(1.03)` | **Se reduce** | En un tablero denso, las tarjetas que crecen distraen. Solo se usan transiciones de color y opacidad de 150 a 200 ms |
| Parpadeo de indicadores | **Se limita** | Solo el indicador de conexión en vivo pulsa, y se desactiva con `prefers-reduced-motion` |
| Secciones en zig-zag y hero | **Se omite** | Son patrones de landing page; esto es una aplicación |

## Tokens

Se definen como variables CSS en `web/src/styles/tokens.css`. El tema claro es el predeterminado; el oscuro se activa con la preferencia del sistema.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#F8FAFC` | `#0F172A` | Fondo de la aplicación |
| `--surface` | `#FFFFFF` | `#1E293B` | Tarjetas, tablas, paneles |
| `--text` | `#0F172A` | `#F1F5F9` | Texto principal |
| `--text-muted` | `#475569` | `#94A3B8` | Etiquetas y texto secundario |
| `--border` | `#E2E8F0` | `#334155` | Bordes y divisores |
| `--primary` | `#1E293B` | `#E2E8F0` | Botón principal, navegación activa |
| `--ok` | `#15803D` | `#4ADE80` | Normal, resuelto, conectado |
| `--warn` | `#B45309` | `#FBBF24` | Advertencia, severidad media y alta, en proceso |
| `--crit` | `#B91C1C` | `#F87171` | Crítico, sensor caído, error |
| `--info` | `#0369A1` | `#38BDF8` | Información, mensajes |

## Tipografía

| Rol | Fuente | Tamaño | Peso |
|---|---|---|---|
| Título de página | Sistema | 1.5rem | 700 |
| Título de sección | Sistema | 1.125rem | 600 |
| Texto | Sistema | 0.9375rem / 1.5 | 400 |
| Etiqueta | Sistema | 0.75rem, mayúsculas | 500 |
| Valores y lecturas | JetBrains Mono, sistema monoespaciado de respaldo | 0.875rem | 400, `tabular-nums` |
| Indicador grande (KPI) | JetBrains Mono | 2rem | 500 |

## Componentes

- **Botón principal:** fondo `--primary`, radio 8 px, peso 600. Foco visible con anillo de 2 px.
- **Botón secundario:** borde de 1.5 px en `--border`, fondo transparente.
- **Tarjeta:** fondo `--surface`, borde de 1 px y sombra sutil `0 1px 3px rgb(0 0 0 / 0.06)`.
- **Etiqueta de estado:** ícono, texto y fondo tenue del color del estado.
- **Campos de formulario:** etiqueta arriba, error debajo en `--crit`, sin etiquetas flotantes.
- **Carga:** esqueletos con la forma del contenido, sin círculos girando.
- **Vacío:** ícono, explicación y acción.

## Pantallas

1. Inicio de sesión
2. Dashboard: indicadores, alertas por edificio y cuadrícula de sensores
3. Detalle de sensor: tendencia con líneas de umbral y puntos de alerta
4. Alertas: lista con filtros; acciones "Atender" y "Levantar ticket"
5. Tickets: tablero por estado e historial
6. Bandeja de mensajes: avisos del sistema y del equipo
7. Usuarios: solo administrador

## Accesibilidad

- Contraste mínimo 4.5:1 en texto.
- Navegación completa con teclado y foco visible.
- `prefers-reduced-motion` desactiva animaciones no esenciales.
- Las gráficas tienen una tabla o resumen textual equivalente.
- Funciona desde 375 px de ancho.
