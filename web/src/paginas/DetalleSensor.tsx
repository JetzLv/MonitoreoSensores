import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { consulta, ErrorApi, peticion } from '../api/cliente';
import type { Alerta, EstadoSensor, PuntoTendencia, Sensor, Umbral } from '../api/tipos';
import { AvisoError, AvisoExito, EncabezadoPagina, Esqueleto, EstadoVacio, Etiqueta, IndicadorVivo } from '../componentes/Comunes';
import { ESTADO_OPERATIVO, haceCuanto, hora, NOMBRE_METRICA, NOMBRE_TIPO, SEVERIDAD, UNIDAD_METRICA, valorConUnidad } from '../formato';
import { useSesion } from '../sesion/ContextoSesion';
import { useIntervalo } from '../sesion/ContextoVivo';
import { useEstadoSensores } from './Tablero';

const PERIODOS = [1, 6, 24];

export function DetalleSensor() {
  const { id = '' } = useParams();
  const { tieneRol } = useSesion();
  const intervalo = useIntervalo();
  const sensor = useQuery({ queryKey: ['sensor', id], queryFn: () => peticion<Sensor>(`/sensores/${id}`) });
  const estado = useEstadoSensores().data?.find((s) => s.sensor_id === id);
  const metricas = Object.keys(sensor.data?.umbrales ?? {});
  const [metricaElegida, cambiarMetrica] = useState<string | null>(null);
  const [horas, cambiarHoras] = useState(1);
  const metrica = metricaElegida ?? metricas[0];

  const tendencia = useQuery({
    queryKey: ['tendencia', id, metrica, horas],
    queryFn: () => peticion<PuntoTendencia[]>(`/reportes/tendencia/${id}` + consulta({ metrica, horas, ventana_min: 5 })),
    enabled: !!metrica,
    refetchInterval: intervalo,
  });
  const alertas = useQuery({
    queryKey: ['alertas', 'sensor', id],
    queryFn: () => peticion<Alerta[]>('/alertas' + consulta({ sensor_id: id, limite: 10 })),
    refetchInterval: intervalo,
  });

  if (sensor.error instanceof ErrorApi && sensor.error.estado === 404) {
    return <main className="principal"><EstadoVacio titulo={`El sensor ${id} no existe`} /><Link to="/sensores">Volver a sensores</Link></main>;
  }
  const s = sensor.data;
  const operativo = estado ? ESTADO_OPERATIVO[estado.estado] : null;

  return (
    <>
      <EncabezadoPagina
        antes={<Link to="/sensores" style={{ fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Sensores</Link>}
        titulo={<span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontWeight: 500 }}>{id}</span>
          {operativo && <Etiqueta tono={operativo.tono}>{operativo.texto}</Etiqueta>}
        </span>}
        subtitulo={s && `${NOMBRE_TIPO[s.tipo]} · Edificio ${s.ubicacion.edificio} · Piso ${s.ubicacion.piso} · Zona ${s.ubicacion.zona}`}
        acciones={<>
          <IndicadorVivo actualizadoEn={tendencia.dataUpdatedAt} />
          {!tieneRol('soporte') && (
            <Link className="boton" to={`/tickets?nuevo=1&sensor=${id}`}><Plus size={16} aria-hidden />Levantar ticket</Link>
          )}
        </>}
      />
      <main className="principal">
        <AvisoError error={sensor.error} />
        {!s ? <Esqueleto filas={3} alto={90} /> : (
          <>
            <UltimaLectura sensor={s} estado={estado} />
            <section className="tarjeta tarjeta-relleno" aria-labelledby="titulo-tendencia">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 id="titulo-tendencia">Tendencia de {NOMBRE_METRICA[metrica]?.toLowerCase()}</h2>
                <div className="pastillas">
                  <div className="pastillas" role="group" aria-label="Métrica">
                    {metricas.map((m) => (
                      <button key={m} type="button" className="pastilla" aria-pressed={m === metrica} onClick={() => cambiarMetrica(m)}>
                        {NOMBRE_METRICA[m] ?? m}
                      </button>
                    ))}
                  </div>
                  <div className="pastillas" role="group" aria-label="Periodo">
                    {PERIODOS.map((h) => (
                      <button key={h} type="button" className="pastilla" aria-pressed={h === horas} onClick={() => cambiarHoras(h)}>{h} h</button>
                    ))}
                  </div>
                  <a className="boton-secundario chico" download
                    href={`/api/v1/reportes/tendencia/${id}` + consulta({ metrica, horas, ventana_min: 5, formato: 'csv' })}>
                    <Download size={14} aria-hidden />CSV
                  </a>
                </div>
              </div>
              <GraficaTendencia puntos={tendencia.data} cargando={tendencia.isPending} metrica={metrica} umbral={s.umbrales[metrica]} />
            </section>
            <div className="fila">
              <div className="angosto"><PanelUmbrales sensor={s} editable={tieneRol('administrador')} /></div>
              <section className="tarjeta tarjeta-relleno ancho" aria-labelledby="titulo-alertas-sensor">
                <h2 id="titulo-alertas-sensor">Alertas de este sensor</h2>
                {alertas.data?.length === 0 ? <EstadoVacio titulo="Este sensor no tiene alertas" /> : (
                  <div className="tabla-caja">
                    <table>
                      <thead><tr><th scope="col">Hora</th><th scope="col">Métrica</th><th scope="col">Valor</th><th scope="col">Severidad</th><th scope="col">Estado</th></tr></thead>
                      <tbody>
                        {(alertas.data ?? []).map((a) => (
                          <tr key={a.id}>
                            <td className="mono">{hora(a.ts_lectura)}</td>
                            <td>{NOMBRE_METRICA[a.metrica] ?? a.metrica}</td>
                            <td className="mono">{valorConUnidad(a.metrica, a.valor)}</td>
                            <td><Etiqueta tono={SEVERIDAD[a.severidad].tono}>{SEVERIDAD[a.severidad].texto}</Etiqueta></td>
                            <td>{a.estado === 'abierta' ? 'Abierta' : `Atendida por ${a.atendida_por}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function UltimaLectura({ sensor, estado }: { sensor: Sensor; estado?: EstadoSensor }) {
  return (
    <section aria-label="Última lectura" className="indicadores">
      {Object.entries(sensor.umbrales).map(([metrica, umbral]) => {
        const valor = estado?.valores?.[metrica];
        const fuera = valor !== undefined && (valor > umbral.max || valor < umbral.min);
        return (
          <div key={metrica} className="tarjeta indicador" style={fuera ? { borderColor: 'var(--aviso)' } : undefined}>
            <span className="etiqueta-campo">{NOMBRE_METRICA[metrica] ?? metrica}</span>
            <span className="indicador-valor" style={fuera ? { color: 'var(--aviso-texto)' } : undefined}>{valorConUnidad(metrica, valor)}</span>
            {fuera
              ? <Etiqueta tono="tag-aviso">Fuera del rango {umbral.min} – {umbral.max} {UNIDAD_METRICA[metrica]}</Etiqueta>
              : <span className="secundario" style={{ fontSize: 13 }}>Umbral {umbral.min} – {umbral.max} {UNIDAD_METRICA[metrica]}</span>}
          </div>
        );
      })}
      <div className="tarjeta indicador">
        <span className="etiqueta-campo">Última lectura</span>
        <span className="indicador-valor" style={{ fontSize: 20 }}>{hora(estado?.ultima_lectura ?? null)}</span>
        <span className="secundario" style={{ fontSize: 13 }}>{haceCuanto(estado?.ultima_lectura ?? null)} · cada 2 s</span>
      </div>
    </section>
  );
}

function GraficaTendencia({ puntos, cargando, metrica, umbral }: {
  puntos?: PuntoTendencia[]; cargando: boolean; metrica: string; umbral?: Umbral;
}) {
  if (cargando) return <Esqueleto filas={1} alto={280} />;
  if (!puntos?.length || !umbral) return <EstadoVacio titulo="Sin lecturas en este periodo" />;
  const unidad = UNIDAD_METRICA[metrica] ?? '';
  const fueraDeRango = puntos.filter((p) => p.maximo > umbral.max || p.minimo < umbral.min).length;
  const valores = puntos.flatMap((p) => [p.minimo, p.maximo]);
  const margen = (umbral.max - umbral.min) * 0.15;
  const dominio: [number, number] = [
    Math.floor(Math.min(umbral.min - margen, ...valores)), Math.ceil(Math.max(umbral.max + margen, ...valores)),
  ];
  const resumen = `${NOMBRE_METRICA[metrica]}: entre ${Math.min(...valores).toFixed(1)} y ${Math.max(...valores).toFixed(1)} ${unidad}; `
    + `${fueraDeRango} de ${puntos.length} intervalos fuera del umbral de ${umbral.min} a ${umbral.max} ${unidad}.`;

  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div role="img" aria-label={resumen} style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={puntos} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--borde)" vertical={false} />
            <XAxis dataKey="ts" tickFormatter={(ts: string) => new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              stroke="var(--texto-secundario)" fontSize={12} minTickGap={40} />
            <YAxis domain={dominio} stroke="var(--texto-secundario)" fontSize={12} width={48} />
            <ReferenceArea y1={umbral.min} y2={umbral.max} fill="var(--ok)" fillOpacity={0.06} />
            <ReferenceLine y={umbral.max} stroke="var(--critico)" strokeDasharray="6 4" label={{ value: `máx ${umbral.max}`, position: 'insideTopRight', fill: 'var(--critico-texto)', fontSize: 12 }} />
            <ReferenceLine y={umbral.min} stroke="var(--critico)" strokeDasharray="6 4" label={{ value: `mín ${umbral.min}`, position: 'insideBottomRight', fill: 'var(--critico-texto)', fontSize: 12 }} />
            <Tooltip
              labelFormatter={(ts) => new Date(String(ts)).toLocaleTimeString('es-MX')}
              formatter={(valor, nombre) => [`${Number(valor).toFixed(2)} ${unidad}`, nombre === 'valor' ? 'Promedio' : 'Media móvil 5 min']}
              contentStyle={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8, color: 'var(--texto)' }}
            />
            <Line type="monotone" dataKey="valor" stroke="#0369A1" strokeWidth={1.5} isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; index?: number; payload?: PuntoTendencia }) => {
                const p = props.payload;
                const fuera = p && (p.maximo > umbral.max || p.minimo < umbral.min);
                return fuera
                  ? <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill="var(--superficie)" stroke="var(--critico)" strokeWidth={2.5} />
                  : <g key={props.index} />;
              }} />
            <Line type="monotone" dataKey="media_movil" stroke="var(--texto)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="secundario" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 2, background: '#0369A1' }} />Lectura (promedio por intervalo)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 3, background: 'var(--texto)' }} />Media móvil 5 min</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="punto" style={{ width: 10, height: 10, border: '2.5px solid var(--critico)' }} />Fuera del umbral</span>
        <span>{resumen}</span>
      </figcaption>
    </figure>
  );
}

function PanelUmbrales({ sensor, editable }: { sensor: Sensor; editable: boolean }) {
  const clienteConsultas = useQueryClient();
  const [editando, cambiarEditando] = useState(false);
  const guardar = useMutation({
    mutationFn: (umbrales: Record<string, Umbral>) => peticion<Sensor>(`/sensores/${sensor.id}`, { metodo: 'PATCH', cuerpo: { umbrales } }),
    onSuccess: (actualizado) => {
      clienteConsultas.setQueryData(['sensor', sensor.id], actualizado);
      cambiarEditando(false);
    },
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    guardar.mutate(Object.fromEntries(Object.keys(sensor.umbrales).map((m) => [
      m, { min: Number(datos.get(`${m}-min`)), max: Number(datos.get(`${m}-max`)) },
    ])));
  }

  return (
    <section className="tarjeta tarjeta-relleno" aria-labelledby="titulo-umbrales">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 id="titulo-umbrales">Umbrales</h2>
        {editable && !editando && <button type="button" className="boton-secundario chico" onClick={() => { guardar.reset(); cambiarEditando(true); }}>Editar</button>}
      </div>
      {guardar.isSuccess && !editando && <AvisoExito>Umbrales actualizados. El worker los aplica en menos de 30 s.</AvisoExito>}
      {editando ? (
        <form className="formulario" onSubmit={enviar}>
          {Object.entries(sensor.umbrales).map(([m, u]) => (
            <fieldset key={m} style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <legend className="etiqueta-campo" style={{ marginBottom: 6 }}>{NOMBRE_METRICA[m]} ({UNIDAD_METRICA[m]})</legend>
              <div className="campo" style={{ flex: 1 }}><label htmlFor={`${m}-min`}>Mínimo</label><input id={`${m}-min`} name={`${m}-min`} type="number" step="any" required defaultValue={u.min} /></div>
              <div className="campo" style={{ flex: 1 }}><label htmlFor={`${m}-max`}>Máximo</label><input id={`${m}-max`} name={`${m}-max`} type="number" step="any" required defaultValue={u.max} /></div>
            </fieldset>
          ))}
          <AvisoError error={guardar.error} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="boton" disabled={guardar.isPending}>Guardar</button>
            <button type="button" className="boton-secundario" onClick={() => cambiarEditando(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <table>
          <thead><tr><th scope="col">Métrica</th><th scope="col">Mínimo</th><th scope="col">Máximo</th></tr></thead>
          <tbody>
            {Object.entries(sensor.umbrales).map(([m, u]) => (
              <tr key={m}><td>{NOMBRE_METRICA[m] ?? m}</td><td className="mono">{u.min} {UNIDAD_METRICA[m]}</td><td className="mono">{u.max} {UNIDAD_METRICA[m]}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
