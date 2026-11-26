import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { consulta, peticion } from '../api/cliente';
import type { Alerta, Severidad } from '../api/tipos';
import { AvisoError, EncabezadoPagina, Esqueleto, EstadoVacio, Etiqueta, IndicadorVivo } from '../componentes/Comunes';
import { hora, NOMBRE_METRICA, SEVERIDAD, valorConUnidad } from '../formato';
import { useSesion } from '../sesion/ContextoSesion';
import { useIntervalo } from '../sesion/ContextoVivo';

type FiltroEstado = 'abierta' | 'atendida' | 'todas';
type FiltroSeveridad = 'todas' | Severidad;
const PATRON_SENSOR = /^(TMP|ENE|AIR)-\d{3}$/;

export function Alertas() {
  const { tieneRol } = useSesion();
  const clienteConsultas = useQueryClient();
  const [estado, cambiarEstado] = useState<FiltroEstado>('abierta');
  const [severidad, cambiarSeveridad] = useState<FiltroSeveridad>('todas');
  const [sensor, cambiarSensor] = useState('');
  const sensorValido = PATRON_SENSOR.test(sensor.toUpperCase()) ? sensor.toUpperCase() : undefined;

  const alertas = useQuery({
    queryKey: ['alertas', 'lista', estado, severidad, sensorValido],
    queryFn: () => peticion<Alerta[]>('/alertas' + consulta({
      estado: estado === 'todas' ? undefined : estado,
      severidad: severidad === 'todas' ? undefined : severidad,
      sensor_id: sensorValido,
      limite: 200,
    })),
    refetchInterval: useIntervalo(),
  });
  const atender = useMutation({
    mutationFn: (id: string) => peticion<Alerta>(`/alertas/${id}`, { metodo: 'PATCH' }),
    onSuccess: () => {
      clienteConsultas.invalidateQueries({ queryKey: ['alertas'] });
      clienteConsultas.invalidateQueries({ queryKey: ['estado-sensores'] });
    },
  });

  const puedeAtender = tieneRol('monitorista', 'administrador');
  const puedeLevantar = tieneRol('monitorista', 'administrador');

  return (
    <>
      <EncabezadoPagina
        titulo="Alertas"
        subtitulo="Generadas por el motor de reglas al rebasar un umbral"
        acciones={<IndicadorVivo actualizadoEn={alertas.dataUpdatedAt} />}
      />
      <main className="principal" style={{ gap: 16 }}>
        <div className="tarjeta" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
          <Filtro titulo="Estado" valor={estado} cambiar={cambiarEstado}
            opciones={[['abierta', 'Abiertas'], ['atendida', 'Atendidas'], ['todas', 'Todas']]} />
          <Filtro titulo="Severidad" valor={severidad} cambiar={cambiarSeveridad}
            opciones={[['todas', 'Todas'], ['media', 'Media'], ['alta', 'Alta'], ['critica', 'Crítica']]} />
          <div className="campo">
            <label htmlFor="filtro-sensor">Sensor</label>
            <input id="filtro-sensor" type="search" placeholder="TMP-007" maxLength={7} value={sensor}
              onChange={(e) => cambiarSensor(e.target.value)} style={{ minHeight: 36, width: 140 }}
              aria-describedby="ayuda-sensor" />
            <span id="ayuda-sensor" className="ayuda">{sensor && !sensorValido ? 'Formato: TMP-001' : ' '}</span>
          </div>
        </div>
        <AvisoError error={alertas.error ?? atender.error} />
        <div className="tarjeta tabla-caja">
          {alertas.isPending ? <div style={{ padding: 20 }}><Esqueleto filas={6} /></div>
            : alertas.data?.length === 0 ? <EstadoVacio titulo="Sin alertas con estos filtros" texto="Prueba con otro estado o severidad." />
            : (
              <table style={{ minWidth: 820 }}>
                <thead>
                  <tr>
                    <th scope="col">Hora</th><th scope="col">Sensor</th><th scope="col">Ubicación</th><th scope="col">Métrica</th>
                    <th scope="col">Valor / umbral</th><th scope="col">Severidad</th><th scope="col">Estado</th>
                    <th scope="col"><span className="solo-lector">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {(alertas.data ?? []).map((a) => (
                    <tr key={a.id}>
                      <td className="mono">{hora(a.ts_lectura)}</td>
                      <td><Link className="mono" to={`/sensores/${a.sensor.id}`} style={{ fontWeight: 500 }}>{a.sensor.id}</Link></td>
                      <td className="secundario">Edificio {a.sensor.ubicacion.edificio}</td>
                      <td>{NOMBRE_METRICA[a.metrica] ?? a.metrica}</td>
                      <td className="mono">{valorConUnidad(a.metrica, a.valor)} <span className="secundario">/ {a.umbral}</span></td>
                      <td><Etiqueta tono={SEVERIDAD[a.severidad].tono}>{SEVERIDAD[a.severidad].texto}</Etiqueta></td>
                      <td style={{ fontSize: 13 }}>{a.estado === 'abierta' ? 'Abierta' : `Atendida por ${a.atendida_por}`}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          {puedeAtender && a.estado === 'abierta' && (
                            <button type="button" className="boton-secundario chico" disabled={atender.isPending && atender.variables === a.id}
                              onClick={() => atender.mutate(a.id)}>
                              <Check size={14} aria-hidden />Atender
                            </button>
                          )}
                          {puedeLevantar && (
                            <Link className="boton-secundario chico"
                              to={`/tickets${consulta({ nuevo: 1, sensor: a.sensor.id, alerta: a.id, titulo: `${a.sensor.id}: ${NOMBRE_METRICA[a.metrica] ?? a.metrica} fuera de umbral` })}`}>
                              Levantar ticket
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </main>
    </>
  );
}

function Filtro<T extends string>({ titulo, valor, cambiar, opciones }: {
  titulo: string; valor: T; cambiar: (v: T) => void; opciones: [T, string][];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="etiqueta-campo">{titulo}</span>
      <div className="pastillas" role="group" aria-label={titulo}>
        {opciones.map(([clave, texto]) => (
          <button key={clave} type="button" className="pastilla" aria-pressed={valor === clave} onClick={() => cambiar(clave)}>{texto}</button>
        ))}
      </div>
    </div>
  );
}
