import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Link } from 'react-router';
import { consulta, peticion } from '../api/cliente';
import type { Alerta, AlertasPorUbicacion, EstadoSensor, Severidad, Ticket } from '../api/tipos';
import { AvisoError, EncabezadoPagina, Esqueleto, EstadoVacio, Etiqueta, IndicadorVivo } from '../componentes/Comunes';
import { useNoLeidos } from '../componentes/Disposicion';
import { PanelSensores } from '../componentes/PanelSensores';
import { haceCuanto, NOMBRE_METRICA, SEVERIDAD, valorConUnidad } from '../formato';
import { useIntervalo } from '../sesion/ContextoVivo';

export function useEstadoSensores() {
  return useQuery({
    queryKey: ['estado-sensores'],
    queryFn: () => peticion<EstadoSensor[]>('/reportes/estado-sensores'),
    refetchInterval: useIntervalo(),
  });
}

const ORDEN_SEVERIDAD: Severidad[] = ['media', 'alta', 'critica'];

export function Tablero() {
  const intervalo = useIntervalo();
  const sensores = useEstadoSensores();
  const abiertas = useQuery({
    queryKey: ['alertas', 'abiertas'],
    queryFn: () => peticion<Alerta[]>('/alertas' + consulta({ estado: 'abierta', limite: 500 })),
    refetchInterval: intervalo,
  });
  const recientes = useQuery({
    queryKey: ['alertas', 'recientes'],
    queryFn: () => peticion<Alerta[]>('/alertas' + consulta({ limite: 5 })),
    refetchInterval: intervalo,
  });
  const porEdificio = useQuery({
    queryKey: ['reportes', 'alertas-por-ubicacion'],
    queryFn: () => peticion<AlertasPorUbicacion>('/reportes/alertas-por-ubicacion?horas=24'),
    refetchInterval: intervalo,
  });
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: () => peticion<Ticket[]>('/tickets'), refetchInterval: intervalo });
  const noLeidos = useNoLeidos().data?.total ?? 0;

  const lista = sensores.data ?? [];
  const sinReportar = lista.filter((s) => s.estado === 'inactivo').length;
  const enServicio = lista.filter((s) => s.estado !== 'fuera_de_servicio').length;
  const alertasAbiertas = abiertas.data ?? [];
  const criticas = alertasAbiertas.filter((a) => a.severidad === 'critica').length;
  const ticketsAbiertos = (tickets.data ?? []).filter((t) => t.estado === 'abierto' || t.estado === 'en_proceso');
  const vencidos = ticketsAbiertos.filter((t) => t.vencido).length;

  const edificios = Object.entries(
    (porEdificio.data?.por_edificio ?? []).reduce<Record<string, Record<Severidad, number>>>((acum, fila) => {
      acum[fila.edificio] ??= { media: 0, alta: 0, critica: 0 };
      acum[fila.edificio][fila.severidad] += fila.total;
      return acum;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));
  const maximo = Math.max(1, ...edificios.map(([, s]) => s.media + s.alta + s.critica));

  return (
    <>
      <EncabezadoPagina
        titulo="Dashboard"
        subtitulo={`Estado general de ${lista.length || '…'} sensores`}
        acciones={<IndicadorVivo actualizadoEn={sensores.dataUpdatedAt} />}
      />
      <main className="principal">
        <AvisoError error={sensores.error} />
        <section aria-label="Indicadores" className="indicadores">
          <div className="tarjeta indicador">
            <span className="etiqueta-campo">Sensores reportando</span>
            <span className="indicador-valor">{enServicio - sinReportar}<span className="secundario" style={{ fontSize: 18 }}> / {enServicio}</span></span>
            {sinReportar > 0 ? <Etiqueta tono="tag-gris">{sinReportar} sin reportar</Etiqueta> : <Etiqueta tono="tag-ok">Todos reportan</Etiqueta>}
          </div>
          <div className="tarjeta indicador">
            <span className="etiqueta-campo">Alertas abiertas</span>
            <span className="indicador-valor">{alertasAbiertas.length}</span>
            {criticas > 0 ? <Etiqueta tono="tag-critico">{criticas} crítica{criticas > 1 ? 's' : ''}</Etiqueta> : <Etiqueta tono="tag-ok">Sin críticas</Etiqueta>}
          </div>
          <div className="tarjeta indicador">
            <span className="etiqueta-campo">Tickets abiertos</span>
            <span className="indicador-valor">{ticketsAbiertos.length}</span>
            {vencidos > 0 ? <Etiqueta tono="tag-aviso">{vencidos} con SLA vencido</Etiqueta> : <Etiqueta tono="tag-ok">Dentro del SLA</Etiqueta>}
          </div>
          <div className="tarjeta indicador">
            <span className="etiqueta-campo">Mensajes sin leer</span>
            <span className="indicador-valor">{noLeidos}</span>
            <Link to="/mensajes" style={{ fontSize: 13, fontWeight: 600 }}>Ir a la bandeja</Link>
          </div>
        </section>

        <div className="fila">
          <div className="ancho">
            {sensores.isPending ? <div className="tarjeta tarjeta-relleno"><Esqueleto filas={4} alto={80} /></div> : <PanelSensores sensores={lista} />}
          </div>
          <div className="angosto" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section className="tarjeta tarjeta-relleno" aria-labelledby="titulo-edificio">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <h2 id="titulo-edificio">Alertas por edificio</h2>
                  <p className="secundario" style={{ fontSize: 13 }}>Últimas 24 horas</p>
                </div>
                <a className="boton-secundario chico" href="/api/v1/reportes/alertas-por-ubicacion?horas=24&formato=csv" download>
                  <Download size={14} aria-hidden />CSV
                </a>
              </div>
              {edificios.length === 0 && !porEdificio.isPending && <EstadoVacio titulo="Sin alertas en 24 h" />}
              {edificios.map(([edificio, s]) => {
                const total = s.media + s.alta + s.critica;
                return (
                  <div key={edificio} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ fontWeight: 600 }}>Edificio {edificio}</span><span className="mono">{total}</span>
                    </div>
                    <div className="barra" role="img" aria-label={`Edificio ${edificio}: ${s.media} media, ${s.alta} alta, ${s.critica} crítica`}>
                      {ORDEN_SEVERIDAD.map((sev) => (
                        <span key={sev} style={{ width: `${(s[sev] / maximo) * 100}%`, background: SEVERIDAD[sev].color }} />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }} className="secundario">
                {ORDEN_SEVERIDAD.map((sev) => (
                  <span key={sev} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span className="punto" style={{ background: SEVERIDAD[sev].color }} />{SEVERIDAD[sev].texto}
                  </span>
                ))}
              </div>
            </section>

            <section className="tarjeta tarjeta-relleno" aria-labelledby="titulo-recientes" style={{ gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 id="titulo-recientes">Alertas recientes</h2>
                <Link to="/alertas" style={{ fontSize: 14, fontWeight: 600 }}>Ver todas</Link>
              </div>
              {recientes.data?.length === 0 && <EstadoVacio titulo="Sin alertas todavía" />}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {(recientes.data ?? []).map((a) => (
                  <li key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--superficie-tenue)' }}>
                    <Etiqueta tono={SEVERIDAD[a.severidad].tono}>{SEVERIDAD[a.severidad].texto}</Etiqueta>
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: 14 }}>
                        <Link to={`/sensores/${a.sensor.id}`} className="mono">{a.sensor.id}</Link> · {NOMBRE_METRICA[a.metrica] ?? a.metrica} {valorConUnidad(a.metrica, a.valor)}
                      </span>
                      <span className="secundario" style={{ fontSize: 12 }}>{haceCuanto(a.creada_en)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
